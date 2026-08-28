import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'bun:test'
import type { PlanAgentSpawnNode } from '@atta/engine'
import { executeAgentSpawnNode, type SpawnedProcessLike, type SpawnFn } from './node-executor'
import type { AgentSpawnExecutorConfig } from './types'

const workingDirectoryRoot = mkdtempSync(join(tmpdir(), 'agent-spawn-root-'))
const outsideRoot = mkdtempSync(join(tmpdir(), 'agent-spawn-outside-'))

const testNode: PlanAgentSpawnNode = {
  id: 'review',
  role: 'agent-spawn',
  kind: 'agent-spawn',
  promptTemplate: 'Review the diff.',
  agentRole: 'reviewer',
  permission: 'default',
  workingDirectory: workingDirectoryRoot,
  maxTurns: 5,
  metadata: {}
}

/** Builds a fake spawned process whose stdout/stderr/close events are scripted. */
function fakeSpawn(options: { stdoutLines?: string[]; stderr?: string; exitCode?: number; onError?: Error }): SpawnFn {
  return () => {
    const stdoutListeners: Array<(chunk: string) => void> = []
    const stderrListeners: Array<(chunk: string) => void> = []
    const closeListeners: Array<(code: number | null) => void> = []
    const errorListeners: Array<(err: Error) => void> = []

    const process: SpawnedProcessLike = {
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
      for (const line of options.stdoutLines ?? []) {
        for (const listener of stdoutListeners) listener(`${line}\n`)
      }
      if (options.stderr) {
        for (const listener of stderrListeners) listener(options.stderr)
      }
      for (const listener of closeListeners) listener(options.exitCode ?? 0)
    })

    return process
  }
}

const baseConfig: AgentSpawnExecutorConfig = {
  workingDirectoryRoot,
  roleBinaries: {
    reviewer: {
      command: 'fake-cli',
      allowedPermissions: ['default'],
      buildArgs: ({ resumeSessionId }) => (resumeSessionId ? ['-p', '--resume', resumeSessionId] : ['-p'])
    }
  }
}

describe('executeAgentSpawnNode', () => {
  it('captures the structured NDJSON stream and extracts the session id', async () => {
    const spawnFn = fakeSpawn({
      stdoutLines: ['{"type":"turn","content":"looking"}', '{"type":"result","session_id":"sess-123"}']
    })

    const result = await executeAgentSpawnNode({
      node: testNode,
      prompt: 'Review the diff.',
      config: baseConfig,
      spawnFn
    })

    expect(result.nodeId).toBe('review')
    expect(result.events).toHaveLength(2)
    expect(result.sessionId).toBe('sess-123')
    expect(result.exitCode).toBe(0)
  })

  it('throws naming the offending line when stdout is not valid NDJSON', async () => {
    const spawnFn = fakeSpawn({ stdoutLines: ['not json'] })

    await expect(executeAgentSpawnNode({ node: testNode, prompt: 'x', config: baseConfig, spawnFn })).rejects.toThrow(
      /non-JSON output/
    )
  })

  it('throws with stderr context on a non-zero exit code', async () => {
    const spawnFn = fakeSpawn({ stdoutLines: ['{"type":"result"}'], stderr: 'boom', exitCode: 1 })

    await expect(executeAgentSpawnNode({ node: testNode, prompt: 'x', config: baseConfig, spawnFn })).rejects.toThrow(
      /exited with code 1/
    )
  })

  it('rejects when the process fails to spawn', async () => {
    const spawnFn = fakeSpawn({ onError: new Error('ENOENT') })

    await expect(executeAgentSpawnNode({ node: testNode, prompt: 'x', config: baseConfig, spawnFn })).rejects.toThrow(
      /Failed to spawn/
    )
  })

  it('refuses a role with no configured binary', async () => {
    await expect(
      executeAgentSpawnNode({
        node: { ...testNode, agentRole: 'unknown-role' },
        prompt: 'x',
        config: baseConfig,
        spawnFn: fakeSpawn({ stdoutLines: [] })
      })
    ).rejects.toThrow(/No binary configured for role 'unknown-role'/)
  })

  it("refuses a permission not in the role's allowlist", async () => {
    await expect(
      executeAgentSpawnNode({
        node: { ...testNode, permission: 'bypassPermissions' },
        prompt: 'x',
        config: baseConfig,
        spawnFn: fakeSpawn({ stdoutLines: [] })
      })
    ).rejects.toThrow(/permission 'bypassPermissions', which role 'reviewer' does not allow/)
  })

  it('refuses an empty workingDirectory', async () => {
    await expect(
      executeAgentSpawnNode({
        node: { ...testNode, workingDirectory: '' },
        prompt: 'x',
        config: baseConfig,
        spawnFn: fakeSpawn({ stdoutLines: [] })
      })
    ).rejects.toThrow(/unbounded cwd/)
  })

  it('refuses a relative workingDirectory', async () => {
    await expect(
      executeAgentSpawnNode({
        node: { ...testNode, workingDirectory: 'relative/path' },
        prompt: 'x',
        config: baseConfig,
        spawnFn: fakeSpawn({ stdoutLines: [] })
      })
    ).rejects.toThrow(/unbounded cwd/)
  })

  it('refuses a workingDirectory that resolves outside the configured root', async () => {
    await expect(
      executeAgentSpawnNode({
        node: { ...testNode, workingDirectory: outsideRoot },
        prompt: 'x',
        config: baseConfig,
        spawnFn: fakeSpawn({ stdoutLines: [] })
      })
    ).rejects.toThrow(/escapes the configured root/)
  })

  it('refuses a workingDirectory that does not exist', async () => {
    await expect(
      executeAgentSpawnNode({
        node: { ...testNode, workingDirectory: join(workingDirectoryRoot, 'does-not-exist') },
        prompt: 'x',
        config: baseConfig,
        spawnFn: fakeSpawn({ stdoutLines: [] })
      })
    ).rejects.toThrow(/could not be resolved/)
  })

  it("only forwards the default env allowlist plus the role's own env, never the full parent environment", async () => {
    let capturedEnv: NodeJS.ProcessEnv | undefined
    const spawnFn: SpawnFn = (command, args, options) => {
      capturedEnv = options.env
      return fakeSpawn({ stdoutLines: ['{"type":"result"}'] })(command, args, options)
    }
    const configWithSecret: AgentSpawnExecutorConfig = {
      ...baseConfig,
      roleBinaries: {
        reviewer: { ...baseConfig.roleBinaries.reviewer!, env: { ROLE_FLAG: 'on' } }
      }
    }
    const previousSecret = process.env.AGENT_SPAWN_TEST_SECRET
    process.env.AGENT_SPAWN_TEST_SECRET = 'super-secret'
    try {
      await executeAgentSpawnNode({ node: testNode, prompt: 'x', config: configWithSecret, spawnFn })
    } finally {
      if (previousSecret === undefined) delete process.env.AGENT_SPAWN_TEST_SECRET
      else process.env.AGENT_SPAWN_TEST_SECRET = previousSecret
    }

    expect(capturedEnv?.AGENT_SPAWN_TEST_SECRET).toBeUndefined()
    expect(capturedEnv?.ROLE_FLAG).toBe('on')
  })

  it('kills and rejects a process that never closes, using the default timeout', async () => {
    const neverClosingSpawn: SpawnFn = () => ({
      stdin: { write: () => {}, end: () => {} },
      stdout: { on: () => {} },
      stderr: { on: () => {} },
      on: () => {},
      kill: () => {}
    })
    const configWithShortTimeout: AgentSpawnExecutorConfig = {
      ...baseConfig,
      roleBinaries: {
        reviewer: { ...baseConfig.roleBinaries.reviewer!, timeoutMs: 20 }
      }
    }

    await expect(
      executeAgentSpawnNode({ node: testNode, prompt: 'x', config: configWithShortTimeout, spawnFn: neverClosingSpawn })
    ).rejects.toThrow(/exceeded its 20ms timeout/)
  })
})
