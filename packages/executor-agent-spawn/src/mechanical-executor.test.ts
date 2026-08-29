import { mkdtempSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'bun:test'
import type { PlanMechanicalNode } from '@atta/engine'
import { executeMechanicalNode } from './mechanical-executor'
import type { SpawnedProcessLike, SpawnFn } from './node-executor'
import type { AgentSpawnExecutorConfig } from './types'

const workingDirectoryRoot = mkdtempSync(join(tmpdir(), 'mechanical-root-'))

const applyPatch: PlanMechanicalNode = {
  id: 'apply-patch',
  role: 'mechanical',
  kind: 'mechanical',
  action: 'git-apply',
  metadata: {}
}

interface SpawnCall {
  command: string
  args: string[]
  cwd: string
  env: NodeJS.ProcessEnv
}

/** Builds a fake spawned process whose stdout/stderr/close events are scripted, recording every call. */
function fakeSpawn(
  options: { stdout?: string; stderr?: string; exitCode?: number; onError?: Error },
  calls: SpawnCall[] = []
): SpawnFn {
  return (command, args, spawnOptions) => {
    calls.push({ command, args, cwd: spawnOptions.cwd, env: spawnOptions.env })

    const stdoutListeners: Array<(chunk: string) => void> = []
    const stderrListeners: Array<(chunk: string) => void> = []
    const closeListeners: Array<(code: number | null) => void> = []
    const errorListeners: Array<(err: Error) => void> = []

    const child: SpawnedProcessLike = {
      stdin: { write: () => {}, end: () => {} },
      stdout: { on: (_event, listener) => stdoutListeners.push(listener) },
      stderr: { on: (_event, listener) => stderrListeners.push(listener) },
      on: (event, listener) => {
        if (event === 'close') closeListeners.push(listener as (code: number | null) => void)
        if (event === 'error') errorListeners.push(listener as (err: Error) => void)
      },
      kill: () => {}
    }

    queueMicrotask(() => {
      if (options.onError) {
        for (const listener of errorListeners) listener(options.onError)
        return
      }
      if (options.stdout) for (const listener of stdoutListeners) listener(options.stdout)
      if (options.stderr) for (const listener of stderrListeners) listener(options.stderr)
      for (const listener of closeListeners) listener(options.exitCode ?? 0)
    })

    return child
  }
}

function configWith(action: AgentSpawnExecutorConfig['mechanicalActions']): AgentSpawnExecutorConfig {
  return { workingDirectoryRoot, roleBinaries: {}, mechanicalActions: action }
}

describe('executeMechanicalNode', () => {
  it('runs the command its action name resolves to and records exit code and output', async () => {
    const calls: SpawnCall[] = []
    const spawnFn = fakeSpawn({ stdout: 'Applied patch cleanly\n' }, calls)
    const config = configWith({ 'git-apply': { command: 'git', args: ['apply', 'patch.diff'] } })

    const result = await executeMechanicalNode({ node: applyPatch, config, spawnFn })

    expect(calls).toHaveLength(1)
    expect(calls[0]?.command).toBe('git')
    expect(calls[0]?.args).toEqual(['apply', 'patch.diff'])
    expect(result.nodeId).toBe('apply-patch')
    expect(result.kind).toBe('mechanical')
    expect(result.action).toBe('git-apply')
    expect(result.command).toBe('git')
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toBe('Applied patch cleanly\n')
  })

  it('captures stdout verbatim rather than parsing it as a structured event stream', async () => {
    const spawnFn = fakeSpawn({ stdout: 'not json at all\nsecond line\n' })
    const config = configWith({ 'git-apply': { command: 'git' } })

    const result = await executeMechanicalNode({ node: applyPatch, config, spawnFn })

    expect(result.stdout).toBe('not json at all\nsecond line\n')
    expect('events' in result).toBe(false)
    expect('sessionId' in result).toBe(false)
  })

  it('refuses an action name the caller never declared, without spawning anything', async () => {
    const calls: SpawnCall[] = []
    const spawnFn = fakeSpawn({}, calls)
    const config = configWith({ 'some-other-action': { command: 'git' } })

    await expect(executeMechanicalNode({ node: applyPatch, config, spawnFn })).rejects.toThrow(
      /No command configured for mechanical action 'git-apply'/
    )
    expect(calls).toHaveLength(0)
  })

  it('refuses when the config declares no mechanical actions at all', async () => {
    const spawnFn = fakeSpawn({})
    const config: AgentSpawnExecutorConfig = { workingDirectoryRoot, roleBinaries: {} }

    await expect(executeMechanicalNode({ node: applyPatch, config, spawnFn })).rejects.toThrow(
      /No command configured for mechanical action/
    )
  })

  it('throws on a non-zero exit by default, naming the code and the stderr', async () => {
    const spawnFn = fakeSpawn({ stderr: 'patch does not apply', exitCode: 1 })
    const config = configWith({ 'git-apply': { command: 'git', args: ['apply'] } })

    await expect(executeMechanicalNode({ node: applyPatch, config, spawnFn })).rejects.toThrow(
      /exited with code 1.*patch does not apply/s
    )
  })

  it('returns a non-zero exit as success only when the action declares that code', async () => {
    const spawnFn = fakeSpawn({ stdout: 'nothing to do', exitCode: 1 })
    const config = configWith({ 'git-apply': { command: 'git', successExitCodes: [0, 1] } })

    const result = await executeMechanicalNode({ node: applyPatch, config, spawnFn })

    expect(result.exitCode).toBe(1)
    expect(result.stdout).toBe('nothing to do')
  })

  it('still refuses an undeclared non-zero code when other codes are declared', async () => {
    const spawnFn = fakeSpawn({ exitCode: 2 })
    const config = configWith({ 'git-apply': { command: 'git', successExitCodes: [0, 1] } })

    await expect(executeMechanicalNode({ node: applyPatch, config, spawnFn })).rejects.toThrow(
      /exited with code 2, which it does not declare as success/
    )
  })

  it('spawns in the configured working-directory root', async () => {
    const calls: SpawnCall[] = []
    const spawnFn = fakeSpawn({}, calls)
    const config = configWith({ 'git-apply': { command: 'git' } })

    await executeMechanicalNode({ node: applyPatch, config, spawnFn })

    expect(calls[0]?.cwd).toBe(realpathSync(workingDirectoryRoot))
  })

  it('passes only the env allowlist plus the action own env, never the full parent environment', async () => {
    const calls: SpawnCall[] = []
    const spawnFn = fakeSpawn({}, calls)
    process.env.MECHANICAL_SECRET_FOR_TEST = 'do-not-leak'
    const config = configWith({ 'git-apply': { command: 'git', env: { GIT_AUTHOR_NAME: 'aeg' } } })

    await executeMechanicalNode({ node: applyPatch, config, spawnFn })

    expect(calls[0]?.env.GIT_AUTHOR_NAME).toBe('aeg')
    expect(calls[0]?.env.MECHANICAL_SECRET_FOR_TEST).toBeUndefined()
    delete process.env.MECHANICAL_SECRET_FOR_TEST
  })

  it('surfaces a spawn failure with the action name and the command that failed', async () => {
    const spawnFn = fakeSpawn({ onError: new Error('ENOENT') })
    const config = configWith({ 'git-apply': { command: 'definitely-not-a-binary' } })

    await expect(executeMechanicalNode({ node: applyPatch, config, spawnFn })).rejects.toThrow(
      /Failed to spawn 'definitely-not-a-binary' for mechanical action 'git-apply'/
    )
  })

  it('kills the process and rejects when it exceeds its timeout', async () => {
    const neverCloses: SpawnFn = () => ({
      stdin: { write: () => {}, end: () => {} },
      stdout: { on: () => {} },
      stderr: { on: () => {} },
      on: () => {},
      kill: () => {}
    })
    const config = configWith({ 'git-apply': { command: 'git', timeoutMs: 5 } })

    await expect(executeMechanicalNode({ node: applyPatch, config, spawnFn: neverCloses })).rejects.toThrow(
      /exceeded its 5ms timeout/
    )
  })
})
