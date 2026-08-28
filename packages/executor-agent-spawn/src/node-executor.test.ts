import { describe, expect, it } from 'bun:test'
import type { PlanAgentSpawnNode } from '@atta/engine'
import { executeAgentSpawnNode, type SpawnedProcessLike, type SpawnFn } from './node-executor'
import type { AgentSpawnExecutorConfig } from './types'

const testNode: PlanAgentSpawnNode = {
  id: 'review',
  role: 'agent-spawn',
  kind: 'agent-spawn',
  promptTemplate: 'Review the diff.',
  agentRole: 'reviewer',
  permission: 'default',
  workingDirectory: '/tmp/agent-spawn-test',
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
  roleBinaries: {
    reviewer: {
      command: 'fake-cli',
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

  it('refuses to spawn with an unbounded working directory', async () => {
    await expect(
      executeAgentSpawnNode({
        node: { ...testNode, workingDirectory: '' },
        prompt: 'x',
        config: baseConfig,
        spawnFn: fakeSpawn({ stdoutLines: [] })
      })
    ).rejects.toThrow(/unbounded cwd/)
  })
})
