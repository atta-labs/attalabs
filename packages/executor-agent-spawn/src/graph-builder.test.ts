import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'bun:test'
import type { Plan, PlanMechanicalNode, PlanStepDecision } from '@atta/engine'
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
    const graph = buildAgentSpawnStateGraph(twoStepPlan, executor, configWithCapture)

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
    const graph = buildAgentSpawnStateGraph(mechanicalOnlyPlan, executor, mechanicalOnlyConfig)

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

  it("a throwing onEvent never corrupts a node's real result — the node's own success still returns normally", async () => {
    const executor = createAgentLifecycleNodeExecutor(
      {
        ...config,
        mechanicalActions: { 'apply-patch': { command: 'git', args: ['apply'] } },
        onEvent: () => {
          throw new Error('observer bug — must never affect the executor')
        }
      },
      fakeSpawn(['patch applied'])
    )

    const update = await executor(emptyState, { node: mechanicalNode, plan: twoStepPlan })

    expect(update.results?.['apply-patch']?.kind).toBe('mechanical')
    expect(update.results?.['apply-patch']?.exitCode).toBe(0)
    expect(update.revisionCounts?.['apply-patch']).toBe(1)
  })

  it("a throwing onEvent never replaces the real error — a node's own failure still rejects with its own message", async () => {
    const executor = createAgentLifecycleNodeExecutor(
      {
        ...config,
        onEvent: () => {
          throw new Error('observer bug — must never affect the executor')
        }
      },
      fakeSpawn([])
    )

    await expect(executor(emptyState, { node: mechanicalNode, plan: twoStepPlan })).rejects.toThrow(
      /No command configured for mechanical action 'apply-patch'/
    )
  })
})

describe('buildAgentSpawnStateGraph — conditional routing on a decision', () => {
  function decisionMechanicalNode(id: string, action: string, decision?: PlanStepDecision): PlanMechanicalNode {
    return { id, role: 'mechanical', kind: 'mechanical', action, ...(decision ? { decision } : {}), metadata: {} }
  }

  const decisionActions = {
    'check-action': { command: 'check-cmd' },
    'retry-action': { command: 'retry-cmd' },
    'finish-action': { command: 'finish-cmd' }
  }

  /**
   * `examine` names the decision-declaring node's own id — legal at this
   * level because these tests hand-construct a `Plan` directly, bypassing
   * `@atta/engine`'s Flow validator (which forbids a self-referencing
   * `examine`/`ifTrue` at authoring time). By the time `buildDecisionPathFn`
   * runs, LangGraph has already merged `check`'s own result into state, so
   * `state.results['check']` is present regardless of whether `examine`
   * names an earlier node or this one.
   */
  function buildBranchingPlan(decision: PlanStepDecision): Plan {
    return {
      ...twoStepPlan,
      graph: {
        nodes: {
          check: decisionMechanicalNode('check', 'check-action', decision),
          retried: decisionMechanicalNode('retried', 'retry-action'),
          finished: decisionMechanicalNode('finished', 'finish-action')
        },
        edges: [],
        conditionalEdges: [],
        entryNode: 'check'
      }
    }
  }

  it("routes to ifTrue when the predicate is true, examining the node's own just-produced result", async () => {
    const decision: PlanStepDecision = { examine: 'check', ifTrue: 'retried', ifFalse: 'finished', maxRevisions: 3 }
    const plan = buildBranchingPlan(decision)
    const config: AgentSpawnExecutorConfig = {
      workingDirectoryRoot,
      roleBinaries: {},
      mechanicalActions: decisionActions,
      decisionPredicates: { check: () => true }
    }
    const executor = createAgentLifecycleNodeExecutor(config, fakeSpawn([]))
    const graph = buildAgentSpawnStateGraph(plan, executor, config)

    const finalState = (await graph.invoke({
      runId: 'run-branch-true',
      results: {},
      sessions: {},
      revisionCounts: {}
    })) as AgentSpawnGraphStateValue

    expect(finalState.results.retried).toBeDefined()
    expect(finalState.results.finished).toBeUndefined()
  })

  it('routes to ifFalse when the predicate is false', async () => {
    const decision: PlanStepDecision = { examine: 'check', ifTrue: 'retried', ifFalse: 'finished', maxRevisions: 3 }
    const plan = buildBranchingPlan(decision)
    const config: AgentSpawnExecutorConfig = {
      workingDirectoryRoot,
      roleBinaries: {},
      mechanicalActions: decisionActions,
      decisionPredicates: { check: () => false }
    }
    const executor = createAgentLifecycleNodeExecutor(config, fakeSpawn([]))
    const graph = buildAgentSpawnStateGraph(plan, executor, config)

    const finalState = (await graph.invoke({
      runId: 'run-branch-false',
      results: {},
      sessions: {},
      revisionCounts: {}
    })) as AgentSpawnGraphStateValue

    expect(finalState.results.finished).toBeDefined()
    expect(finalState.results.retried).toBeUndefined()
  })

  it("stops looping once ifTrue's target reaches maxRevisions, routing to END instead of ifTrue again", async () => {
    const decision: PlanStepDecision = { examine: 'loop', ifTrue: 'loop', ifFalse: 'never', maxRevisions: 2 }
    const plan: Plan = {
      ...twoStepPlan,
      graph: {
        nodes: {
          loop: decisionMechanicalNode('loop', 'loop-action', decision),
          never: decisionMechanicalNode('never', 'never-action')
        },
        edges: [],
        conditionalEdges: [],
        entryNode: 'loop'
      }
    }
    const config: AgentSpawnExecutorConfig = {
      workingDirectoryRoot,
      roleBinaries: {},
      mechanicalActions: {
        'loop-action': { command: 'loop-cmd' },
        'never-action': { command: 'never-cmd' }
      },
      // Always "needs revision" — the ceiling, not the predicate, is what
      // must stop the loop.
      decisionPredicates: { loop: () => true }
    }
    const executor = createAgentLifecycleNodeExecutor(config, fakeSpawn([]))
    const graph = buildAgentSpawnStateGraph(plan, executor, config)

    const finalState = (await graph.invoke({
      runId: 'run-ceiling',
      results: {},
      sessions: {},
      revisionCounts: {}
    })) as AgentSpawnGraphStateValue

    expect(finalState.revisionCounts.loop).toBe(2)
    expect(finalState.results.never).toBeUndefined()
  })

  it('throws a clear, named error when no decisionPredicates entry exists for a decision-bearing node', async () => {
    const decision: PlanStepDecision = { examine: 'check', ifTrue: 'retried', ifFalse: 'finished', maxRevisions: 3 }
    const plan = buildBranchingPlan(decision)
    const config: AgentSpawnExecutorConfig = {
      workingDirectoryRoot,
      roleBinaries: {},
      mechanicalActions: decisionActions
      // No decisionPredicates at all.
    }
    const executor = createAgentLifecycleNodeExecutor(config, fakeSpawn([]))
    const graph = buildAgentSpawnStateGraph(plan, executor, config)

    await expect(
      graph.invoke({ runId: 'run-unconfigured', results: {}, sessions: {}, revisionCounts: {} })
    ).rejects.toThrow(/No decision predicate configured for node 'check'/)
  })

  it("a throwing decision predicate never corrupts the examined node's own recorded result", async () => {
    const decision: PlanStepDecision = { examine: 'check', ifTrue: 'retried', ifFalse: 'finished', maxRevisions: 3 }
    const plan = buildBranchingPlan(decision)
    const events: AgentLifecycleEvent[] = []
    const config: AgentSpawnExecutorConfig = {
      workingDirectoryRoot,
      roleBinaries: {},
      mechanicalActions: decisionActions,
      onEvent: (e) => events.push(e),
      decisionPredicates: {
        check: () => {
          throw new Error('predicate bug — must never affect the executed node')
        }
      }
    }
    const executor = createAgentLifecycleNodeExecutor(config, fakeSpawn([]))
    const graph = buildAgentSpawnStateGraph(plan, executor, config)

    await expect(
      graph.invoke({ runId: 'run-throwing-predicate', results: {}, sessions: {}, revisionCounts: {} })
    ).rejects.toThrow(/Decision predicate for node 'check' threw/)

    // node:complete fired for 'check' — its own mechanical action ran and
    // recorded a real result — strictly before the separate node:failed the
    // routing failure reports. The predicate's bug never reached the
    // executed node's own result.
    expect(events.map((e) => e.type)).toEqual(['node:start', 'node:complete', 'node:failed'])
    const failed = events[2]
    if (failed?.type !== 'node:failed') throw new Error('unreachable')
    expect(failed.error).toMatch(/predicate bug/)
  })

  it('wires a node with no decision through a plain edge to END, unchanged from before this task', async () => {
    const plan: Plan = {
      ...twoStepPlan,
      graph: {
        nodes: { solo: decisionMechanicalNode('solo', 'finish-action') },
        edges: [],
        conditionalEdges: [],
        entryNode: 'solo'
      }
    }
    const config: AgentSpawnExecutorConfig = {
      workingDirectoryRoot,
      roleBinaries: {},
      mechanicalActions: decisionActions
    }
    const executor = createAgentLifecycleNodeExecutor(config, fakeSpawn([]))
    const graph = buildAgentSpawnStateGraph(plan, executor, config)

    const finalState = (await graph.invoke({
      runId: 'run-plain',
      results: {},
      sessions: {},
      revisionCounts: {}
    })) as AgentSpawnGraphStateValue

    expect(finalState.results.solo?.kind).toBe('mechanical')
  })
})
