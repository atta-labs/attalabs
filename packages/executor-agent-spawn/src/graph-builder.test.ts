import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'bun:test'
import type { Plan, PlanMechanicalNode } from '@atta/engine'
import { buildAgentSpawnStateGraph, createAgentLifecycleNodeExecutor } from './graph-builder'
import type { AgentSpawnGraphStateValue } from './graph-state'
import type { SpawnedProcessLike, SpawnFn } from './node-executor'
import type { AgentLifecycleEvent, AgentSpawnExecutorConfig } from './types'

const workingDirectoryRoot = mkdtempSync(join(tmpdir(), 'agent-spawn-graph-root-'))

function fakeSpawn(stdoutLines: string[]): SpawnFn {
  return () => {
    const stdoutListeners: Array<(chunk: string) => void> = []
    const closeListeners: Array<(code: number | null) => void> = []
    const process: SpawnedProcessLike = {
      stdin: { write: () => {}, end: () => {} },
      stdout: { on: (_event, listener) => stdoutListeners.push(listener) },
      stderr: { on: () => {} },
      on: (event, listener) => {
        if (event === 'close') closeListeners.push(listener as (code: number | null) => void)
      },
      kill: () => {}
    }
    queueMicrotask(() => {
      for (const line of stdoutLines) for (const listener of stdoutListeners) listener(`${line}\n`)
      for (const listener of closeListeners) listener(0)
    })
    return process
  }
}

const twoStepPlan: Plan = {
  schemaVersion: '1.0',
  question: 'Ship the feature',
  model: 'n/a',
  agents: {},
  teamName: 'agent-lifecycle-test',
  maxRevisions: 0,
  graph: {
    nodes: {
      implement: {
        id: 'implement',
        role: 'agent-spawn',
        kind: 'agent-spawn',
        promptTemplate: 'Implement: {{question}}',
        agentRole: 'coder',
        permission: 'default',
        workingDirectory: workingDirectoryRoot,
        maxTurns: 10,
        metadata: {}
      },
      review: {
        id: 'review',
        role: 'agent-spawn',
        kind: 'agent-spawn',
        promptTemplate: 'Review it.',
        agentRole: 'reviewer',
        permission: 'default',
        workingDirectory: workingDirectoryRoot,
        maxTurns: 5,
        resume: 'implement',
        metadata: {}
      }
    },
    edges: [{ from: 'implement', to: 'review', kind: 'flow' }],
    conditionalEdges: [],
    entryNode: 'implement'
  }
}

const config: AgentSpawnExecutorConfig = {
  workingDirectoryRoot,
  roleBinaries: {
    coder: { command: 'fake-coder', allowedPermissions: ['default'], buildArgs: () => ['-p'] },
    reviewer: {
      command: 'fake-reviewer',
      allowedPermissions: ['default'],
      buildArgs: ({ resumeSessionId }) => (resumeSessionId ? ['-p', '--resume', resumeSessionId] : ['-p'])
    }
  }
}

describe('buildAgentSpawnStateGraph', () => {
  it('runs a two-step Plan end to end, threading the resumed session id', async () => {
    let capturedResumeArgs: string[] | undefined
    const configWithCapture: AgentSpawnExecutorConfig = {
      workingDirectoryRoot,
      roleBinaries: {
        coder: { command: 'fake-coder', allowedPermissions: ['default'], buildArgs: () => ['-p'] },
        reviewer: {
          command: 'fake-reviewer',
          allowedPermissions: ['default'],
          buildArgs: (params) => {
            capturedResumeArgs = params.resumeSessionId ? ['--resume', params.resumeSessionId] : []
            return ['-p']
          }
        }
      }
    }

    let callCount = 0
    const spawnFn: SpawnFn = (...args) => {
      callCount += 1
      const lines =
        callCount === 1 ? ['{"type":"result","session_id":"session-from-implement"}'] : ['{"type":"result"}']
      return fakeSpawn(lines)(...args)
    }

    const executor = createAgentLifecycleNodeExecutor(configWithCapture, spawnFn)
    const graph = buildAgentSpawnStateGraph(twoStepPlan, executor)

    const finalState = (await graph.invoke({
      runId: 'run-1',
      results: {},
      sessions: {},
      revisionCounts: {}
    })) as AgentSpawnGraphStateValue

    expect(finalState.sessions.implement).toBe('session-from-implement')
    expect(finalState.results.implement?.exitCode).toBe(0)
    expect(finalState.results.review?.exitCode).toBe(0)
    expect(finalState.revisionCounts.implement).toBe(1)
    expect(finalState.revisionCounts.review).toBe(1)
    expect(capturedResumeArgs).toEqual(['--resume', 'session-from-implement'])
  })

  it('runs a mechanical-only Plan end to end, recording exit status and output, with no role ever resolved', async () => {
    const mechanicalOnlyPlan: Plan = {
      ...twoStepPlan,
      graph: {
        nodes: {
          'apply-patch': {
            id: 'apply-patch',
            role: 'mechanical',
            kind: 'mechanical',
            action: 'apply-patch',
            metadata: {}
          }
        },
        edges: [],
        conditionalEdges: [],
        entryNode: 'apply-patch'
      }
    }

    // No roleBinaries at all: if this Plan reached the agent-spawn path it
    // would fail resolving a role rather than run, which is the point — a
    // mechanical node must never launch an agent process.
    const mechanicalOnlyConfig: AgentSpawnExecutorConfig = {
      workingDirectoryRoot,
      roleBinaries: {},
      mechanicalActions: { 'apply-patch': { command: 'git', args: ['apply', 'patch.diff'] } }
    }

    const spawnedCommands: string[] = []
    const spawnFn: SpawnFn = (command, args, options) => {
      spawnedCommands.push(command)
      return fakeSpawn(['patch applied'])(command, args, options)
    }

    const executor = createAgentLifecycleNodeExecutor(mechanicalOnlyConfig, spawnFn)
    const graph = buildAgentSpawnStateGraph(mechanicalOnlyPlan, executor)

    const finalState = (await graph.invoke({
      runId: 'run-mechanical',
      results: {},
      sessions: {},
      revisionCounts: {}
    })) as AgentSpawnGraphStateValue

    const result = finalState.results['apply-patch']
    expect(result?.kind).toBe('mechanical')
    if (result?.kind !== 'mechanical') throw new Error('unreachable')
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toBe('patch applied\n')
    expect(result.action).toBe('apply-patch')
    expect(finalState.sessions).toEqual({})
    expect(spawnedCommands).toEqual(['git'])
  })
})

describe('createAgentLifecycleNodeExecutor', () => {
  const emptyState: AgentSpawnGraphStateValue = {
    runId: 'run-1',
    results: {},
    sessions: {},
    revisionCounts: {}
  }

  const mechanicalNode: PlanMechanicalNode = {
    id: 'apply-patch',
    role: 'mechanical',
    kind: 'mechanical',
    action: 'apply-patch',
    metadata: {}
  }

  it('executes a mechanical node through the mechanical path, spawning its configured command', async () => {
    const spawned: string[] = []
    const spawnFn: SpawnFn = (command) => {
      spawned.push(command)
      return fakeSpawn([])(command, [], { cwd: workingDirectoryRoot, env: {} })
    }
    const executor = createAgentLifecycleNodeExecutor(
      { ...config, mechanicalActions: { 'apply-patch': { command: 'git', args: ['apply'] } } },
      spawnFn
    )

    const update = await executor(emptyState, { node: mechanicalNode, plan: twoStepPlan })

    expect(spawned).toEqual(['git'])
    expect(update.results?.['apply-patch']?.kind).toBe('mechanical')
    expect(update.results?.['apply-patch']?.exitCode).toBe(0)
    expect(update.revisionCounts?.['apply-patch']).toBe(1)
  })

  it('records no session for a mechanical node — it has no model turn to resume', async () => {
    const executor = createAgentLifecycleNodeExecutor(
      { ...config, mechanicalActions: { 'apply-patch': { command: 'git' } } },
      fakeSpawn([])
    )

    const update = await executor(emptyState, { node: mechanicalNode, plan: twoStepPlan })

    expect(update.sessions).toBeUndefined()
  })

  it('never resolves a mechanical node against roleBinaries — an undeclared action is refused', async () => {
    const executor = createAgentLifecycleNodeExecutor(config, fakeSpawn([]))

    await expect(executor(emptyState, { node: mechanicalNode, plan: twoStepPlan })).rejects.toThrow(
      /No command configured for mechanical action 'apply-patch'/
    )
  })

  it('throws when a node declares resume but no session was recorded yet', async () => {
    const executor = createAgentLifecycleNodeExecutor(config)
    const reviewNode = twoStepPlan.graph.nodes.review!

    await expect(executor(emptyState, { node: reviewNode, plan: twoStepPlan })).rejects.toThrow(
      /no session id has been recorded/
    )
  })
})

describe('createAgentLifecycleNodeExecutor — execution events', () => {
  const emptyState: AgentSpawnGraphStateValue = {
    runId: 'run-events',
    results: {},
    sessions: {},
    revisionCounts: {}
  }

  const mechanicalNode: PlanMechanicalNode = {
    id: 'apply-patch',
    role: 'mechanical',
    kind: 'mechanical',
    action: 'apply-patch',
    metadata: {}
  }

  it('emits node:start, one node:streaming per reported event, then node:complete for an agent-spawn node, all correlated by runId', async () => {
    const events: AgentLifecycleEvent[] = []
    const executor = createAgentLifecycleNodeExecutor(
      { ...config, onEvent: (e) => events.push(e) },
      fakeSpawn(['{"type":"assistant","text":"working"}', '{"type":"result","session_id":"s1"}'])
    )
    const implementNode = twoStepPlan.graph.nodes.implement!

    await executor(emptyState, { node: implementNode, plan: twoStepPlan })

    expect(events.map((e) => e.type)).toEqual(['node:start', 'node:streaming', 'node:streaming', 'node:complete'])
    expect(events.every((e) => e.nodeId === 'implement' && e.runId === 'run-events')).toBe(true)
  })

  it('emits node:start then node:complete for a mechanical node, with no node:streaming', async () => {
    const events: AgentLifecycleEvent[] = []
    const executor = createAgentLifecycleNodeExecutor(
      {
        ...config,
        mechanicalActions: { 'apply-patch': { command: 'git', args: ['apply'] } },
        onEvent: (e) => events.push(e)
      },
      fakeSpawn([])
    )

    await executor(emptyState, { node: mechanicalNode, plan: twoStepPlan })

    expect(events.map((e) => e.type)).toEqual(['node:start', 'node:complete'])
  })

  it('emits node:failed with the error message and still rejects, when a mechanical action is undeclared', async () => {
    const events: AgentLifecycleEvent[] = []
    const executor = createAgentLifecycleNodeExecutor({ ...config, onEvent: (e) => events.push(e) }, fakeSpawn([]))

    await expect(executor(emptyState, { node: mechanicalNode, plan: twoStepPlan })).rejects.toThrow(
      /No command configured for mechanical action 'apply-patch'/
    )

    expect(events.map((e) => e.type)).toEqual(['node:start', 'node:failed'])
    const failed = events[1]
    if (failed?.type !== 'node:failed') throw new Error('unreachable')
    expect(failed.error).toMatch(/No command configured for mechanical action 'apply-patch'/)
    expect(failed.runId).toBe('run-events')
  })
})
