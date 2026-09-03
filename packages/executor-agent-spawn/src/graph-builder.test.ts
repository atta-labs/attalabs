import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'bun:test'
import type { Plan, PlanAgentSpawnNode, PlanMechanicalNode, PlanStepDecision } from '@atta/engine'
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

/**
 * Like `fakeSpawn`, but its `close` event fires only after `ticks` chained
 * `queueMicrotask` hops rather than one — a deterministic way to make one
 * fake process "slower" than another without a real timer. Node drains its
 * microtask queue FIFO, so a spawn scheduled with more ticks is guaranteed
 * to close after one scheduled with fewer, with no wall-clock race: the
 * ordering is a property of how many hops each takes, not of how fast they
 * happen to run.
 */
function fakeSpawnAfterTicks(stdoutLines: string[], ticks: number): SpawnFn {
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
    let remaining = ticks
    const tick = () => {
      if (remaining <= 0) {
        for (const line of stdoutLines) for (const listener of stdoutListeners) listener(`${line}\n`)
        for (const listener of closeListeners) listener(0)
        return
      }
      remaining -= 1
      queueMicrotask(tick)
    }
    queueMicrotask(tick)
    return process
  }
}

/** Same delay mechanics as `fakeSpawnAfterTicks`, but closes with a non-zero exit code — for proving a branch's own failure. */
function fakeSpawnFailAfterTicks(exitCode: number, ticks: number): SpawnFn {
  return () => {
    const closeListeners: Array<(code: number | null) => void> = []
    const process: SpawnedProcessLike = {
      stdin: { write: () => {}, end: () => {} },
      stdout: { on: () => {} },
      stderr: { on: () => {} },
      on: (event, listener) => {
        if (event === 'close') closeListeners.push(listener as (code: number | null) => void)
      },
      kill: () => {}
    }
    let remaining = ticks
    const tick = () => {
      if (remaining <= 0) {
        for (const listener of closeListeners) listener(exitCode)
        return
      }
      remaining -= 1
      queueMicrotask(tick)
    }
    queueMicrotask(tick)
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
    'attempt-action': { command: 'attempt-cmd' },
    'check-action': { command: 'check-cmd' },
    'finish-action': { command: 'finish-cmd' }
  }

  /**
   * `attempt` executes once, unconditionally, before `check` — a
   * `@atta/engine`-validator-legal topology (`examine`/`ifTrue` strictly
   * prior to the declaring step, never a self-reference) rather than the
   * self-referencing shortcut an earlier version of this suite used. That
   * distinction matters: a self-referencing `ifTrue` masks exactly the
   * off-by-one this suite now covers, because it can't be authored by a
   * real Flow in the first place — `attempt` genuinely has run once by the
   * time `check` first evaluates, which is what makes the ceiling's
   * off-by-one and the `ifFalse` ceiling gap both real, testable bugs
   * rather than artifacts of an unrealistic fixture.
   */
  function buildLoopPlan(decision: PlanStepDecision, extraNodes: Record<string, PlanMechanicalNode> = {}): Plan {
    return {
      ...twoStepPlan,
      graph: {
        nodes: {
          attempt: decisionMechanicalNode('attempt', 'attempt-action'),
          check: decisionMechanicalNode('check', 'check-action', decision),
          finish: decisionMechanicalNode('finish', 'finish-action'),
          ...extraNodes
        },
        edges: [{ from: 'attempt', to: 'check', kind: 'flow' }],
        conditionalEdges: [],
        entryNode: 'attempt'
      }
    }
  }

  it('routes to ifTrue when the predicate is true, examining a genuinely prior node', async () => {
    // maxRevisions is set high and unused as a bound here — the predicate
    // itself flips to false after one call, so this test isolates "does a
    // true result route to ifTrue" from ceiling math, which has its own
    // dedicated tests below.
    let calls = 0
    const decision: PlanStepDecision = { examine: 'attempt', ifTrue: 'attempt', ifFalse: 'finish', maxRevisions: 5 }
    const plan = buildLoopPlan(decision)
    const config: AgentSpawnExecutorConfig = {
      workingDirectoryRoot,
      roleBinaries: {},
      mechanicalActions: decisionActions,
      decisionPredicates: {
        check: () => {
          calls += 1
          return calls === 1
        }
      }
    }
    const executor = createAgentLifecycleNodeExecutor(config, fakeSpawn([]))
    const graph = buildAgentSpawnStateGraph(plan, executor, config)

    const finalState = (await graph.invoke({
      runId: 'run-branch-true',
      results: {},
      sessions: {},
      revisionCounts: {}
    })) as AgentSpawnGraphStateValue

    // 'attempt' ran once up front, then once more via the ifTrue loop-back,
    // before the second evaluation's false result let it continue to 'finish'.
    expect(finalState.revisionCounts.attempt).toBe(2)
    expect(finalState.results.finish).toBeDefined()
  })

  it('routes to ifFalse when the predicate is false', async () => {
    const decision: PlanStepDecision = { examine: 'attempt', ifTrue: 'attempt', ifFalse: 'finish', maxRevisions: 5 }
    const plan = buildLoopPlan(decision)
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

    expect(finalState.results.finish).toBeDefined()
    expect(finalState.revisionCounts.attempt).toBe(1)
  })

  it("maxRevisions: 1 permits exactly one loop-back, not zero — the off-by-one this task's review caught", async () => {
    // ifTrue ('attempt') is validator-required to be strictly prior, so it
    // has already executed once before 'check' ever evaluates for the
    // first time. A `>=` ceiling comparison would count that pre-existing
    // execution as if it were already a revision, making `maxRevisions: 1`
    // permit zero loop-backs — indistinguishable from "never revise".
    const decision: PlanStepDecision = { examine: 'attempt', ifTrue: 'attempt', ifFalse: 'finish', maxRevisions: 1 }
    const plan = buildLoopPlan(decision)
    const config: AgentSpawnExecutorConfig = {
      workingDirectoryRoot,
      roleBinaries: {},
      mechanicalActions: decisionActions,
      // Always "needs revision" — the ceiling, not the predicate, must stop it.
      decisionPredicates: { check: () => true }
    }
    const executor = createAgentLifecycleNodeExecutor(config, fakeSpawn([]))
    const graph = buildAgentSpawnStateGraph(plan, executor, config)

    const finalState = (await graph.invoke({
      runId: 'run-ceiling-one',
      results: {},
      sessions: {},
      revisionCounts: {}
    })) as AgentSpawnGraphStateValue

    // One genuine revision: 'attempt' runs twice (the original attempt,
    // then exactly one loop-back), 'check' evaluates twice, then exhausts.
    expect(finalState.revisionCounts.attempt).toBe(2)
    expect(finalState.revisionCounts.check).toBe(2)
    expect(finalState.results.finish).toBeUndefined()
  })

  it('maxRevisions: 2 permits exactly two loop-backs, then routes to END on the third evaluation', async () => {
    const decision: PlanStepDecision = { examine: 'attempt', ifTrue: 'attempt', ifFalse: 'finish', maxRevisions: 2 }
    const plan = buildLoopPlan(decision)
    const config: AgentSpawnExecutorConfig = {
      workingDirectoryRoot,
      roleBinaries: {},
      mechanicalActions: decisionActions,
      decisionPredicates: { check: () => true }
    }
    const executor = createAgentLifecycleNodeExecutor(config, fakeSpawn([]))
    const graph = buildAgentSpawnStateGraph(plan, executor, config)

    const finalState = (await graph.invoke({
      runId: 'run-ceiling-two',
      results: {},
      sessions: {},
      revisionCounts: {}
    })) as AgentSpawnGraphStateValue

    expect(finalState.revisionCounts.attempt).toBe(3)
    expect(finalState.revisionCounts.check).toBe(3)
    expect(finalState.results.finish).toBeUndefined()
  })

  it('bounds a backward-pointing ifFalse the same way — the engine validator never requires ifFalse to point forward', async () => {
    // The predicate is always false, and ifFalse routes backward to
    // 'attempt' — a topology the validator permits (rule-s7 only requires
    // ifFalse to exist, unlike ifTrue's strictly-prior rule). Before this
    // fix, the ifFalse branch had no ceiling check at all and would loop
    // this agent's real subprocess spawn forever.
    const decision: PlanStepDecision = { examine: 'attempt', ifTrue: 'finish', ifFalse: 'attempt', maxRevisions: 1 }
    const plan = buildLoopPlan(decision)
    const config: AgentSpawnExecutorConfig = {
      workingDirectoryRoot,
      roleBinaries: {},
      mechanicalActions: decisionActions,
      decisionPredicates: { check: () => false }
    }
    const executor = createAgentLifecycleNodeExecutor(config, fakeSpawn([]))
    const graph = buildAgentSpawnStateGraph(plan, executor, config)

    const finalState = (await graph.invoke({
      runId: 'run-ceiling-iffalse',
      results: {},
      sessions: {},
      revisionCounts: {}
    })) as AgentSpawnGraphStateValue

    expect(finalState.revisionCounts.attempt).toBe(2)
    expect(finalState.results.finish).toBeUndefined()
  })

  it('throws a clear, named error at build time when a decision routes to a node that does not exist', () => {
    const decision: PlanStepDecision = { examine: 'attempt', ifTrue: 'attempt', ifFalse: 'ghost', maxRevisions: 1 }
    const plan = buildLoopPlan(decision)
    const config: AgentSpawnExecutorConfig = {
      workingDirectoryRoot,
      roleBinaries: {},
      mechanicalActions: decisionActions,
      decisionPredicates: { check: () => false }
    }
    const executor = createAgentLifecycleNodeExecutor(config, fakeSpawn([]))

    expect(() => buildAgentSpawnStateGraph(plan, executor, config)).toThrow(
      /Node 'check' declares a decision routing to 'ghost', which is not a node in this Plan's graph/
    )
  })

  it('throws a clear, named error when no decisionPredicates entry exists for a decision-bearing node', async () => {
    const decision: PlanStepDecision = { examine: 'attempt', ifTrue: 'attempt', ifFalse: 'finish', maxRevisions: 3 }
    const plan = buildLoopPlan(decision)
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
    const decision: PlanStepDecision = { examine: 'attempt', ifTrue: 'attempt', ifFalse: 'finish', maxRevisions: 3 }
    const plan = buildLoopPlan(decision)
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

    // node:complete fired for 'check' (and, before it, for 'attempt') —
    // both nodes' own actions ran and recorded real results — strictly
    // before the separate node:failed the routing failure reports. The
    // predicate's bug never reached either executed node's own result.
    const checkEvents = events.filter((e) => e.nodeId === 'check')
    expect(checkEvents.map((e) => e.type)).toEqual(['node:start', 'node:complete', 'node:failed'])
    const failed = checkEvents[2]
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

describe('buildAgentSpawnStateGraph — fan-out and join topology (engine-parallel-steps-v1 task 2)', () => {
  /**
   * `start` fans out to two independent agent-spawn branches, joined by a
   * mechanical `join` — the same shape `@atta/engine`'s own
   * `FAN_OUT_JOIN_YAML` compiler fixture proves at the edge-compilation
   * layer (`compile-flow.test.ts`). No `decision` anywhere in this Plan:
   * fan-out/join is unconditional topology, kept deliberately separate from
   * the conditional-routing suite above.
   */
  function fanOutJoinPlan(): Plan {
    const start: PlanMechanicalNode = {
      id: 'start',
      role: 'mechanical',
      kind: 'mechanical',
      action: 'start-action',
      metadata: {}
    }
    const branchA: PlanAgentSpawnNode = {
      id: 'branch-a',
      role: 'agent-spawn',
      kind: 'agent-spawn',
      promptTemplate: 'Branch A.',
      agentRole: 'worker-a',
      permission: 'default',
      workingDirectory: workingDirectoryRoot,
      maxTurns: 5,
      metadata: {}
    }
    const branchB: PlanAgentSpawnNode = {
      id: 'branch-b',
      role: 'agent-spawn',
      kind: 'agent-spawn',
      promptTemplate: 'Branch B.',
      agentRole: 'worker-b',
      permission: 'default',
      workingDirectory: workingDirectoryRoot,
      maxTurns: 5,
      metadata: {}
    }
    const join: PlanMechanicalNode = {
      id: 'join',
      role: 'mechanical',
      kind: 'mechanical',
      action: 'join-action',
      metadata: {}
    }
    return {
      ...twoStepPlan,
      graph: {
        nodes: { start, 'branch-a': branchA, 'branch-b': branchB, join },
        edges: [
          { from: 'start', to: 'branch-a', kind: 'flow' },
          { from: 'start', to: 'branch-b', kind: 'flow' },
          { from: 'branch-a', to: 'join', kind: 'flow' },
          { from: 'branch-b', to: 'join', kind: 'flow' }
        ],
        conditionalEdges: [],
        entryNode: 'start'
      }
    }
  }

  function fanOutJoinConfig(onEvent: (event: AgentLifecycleEvent) => void): AgentSpawnExecutorConfig {
    return {
      workingDirectoryRoot,
      roleBinaries: {
        'worker-a': { command: 'worker-a-cmd', allowedPermissions: ['default'], buildArgs: () => [] },
        'worker-b': { command: 'worker-b-cmd', allowedPermissions: ['default'], buildArgs: () => [] }
      },
      mechanicalActions: {
        'start-action': { command: 'start-cmd' },
        'join-action': { command: 'join-cmd' }
      },
      onEvent
    }
  }

  it('runs both branches concurrently — interleaved, not sequential — and joins exactly once after both complete', async () => {
    const events: AgentLifecycleEvent[] = []
    const plan = fanOutJoinPlan()
    const config = fanOutJoinConfig((e) => events.push(e))

    // branch-a is the "slow" branch (30 microtask hops to close), branch-b
    // the "fast" one (1 hop) — a deterministic, non-wall-clock way to force
    // overlap. If the executor ran branches sequentially, branch-b could
    // never start (let alone complete) until branch-a's close fires 30
    // hops later; observing branch-b complete before branch-a even
    // completes is only possible if LangGraph invoked both node functions
    // before either settled.
    const spawnFn: SpawnFn = (command, args, options) => {
      if (command === 'worker-a-cmd') return fakeSpawnAfterTicks(['{"type":"result"}'], 30)(command, args, options)
      if (command === 'worker-b-cmd') return fakeSpawnAfterTicks(['{"type":"result"}'], 1)(command, args, options)
      return fakeSpawn([])(command, args, options)
    }

    const executor = createAgentLifecycleNodeExecutor(config, spawnFn)
    const graph = buildAgentSpawnStateGraph(plan, executor, config)

    const finalState = (await graph.invoke({
      runId: 'run-fanout',
      results: {},
      sessions: {},
      revisionCounts: {}
    })) as AgentSpawnGraphStateValue

    const indexOfType = (type: AgentLifecycleEvent['type'], nodeId: string) =>
      events.findIndex((e) => e.type === type && e.nodeId === nodeId)
    const branchAStart = indexOfType('node:start', 'branch-a')
    const branchAComplete = indexOfType('node:complete', 'branch-a')
    const branchBComplete = indexOfType('node:complete', 'branch-b')
    const joinStarts = events.filter((e) => e.type === 'node:start' && e.nodeId === 'join')
    const joinCompletes = events.filter((e) => e.type === 'node:complete' && e.nodeId === 'join')

    // (a) genuine concurrency, proved by event interleaving, not timing:
    // branch-a has already started, and branch-b has already completed,
    // while branch-a is still mid-flight.
    expect(branchAStart).toBeGreaterThanOrEqual(0)
    expect(branchAStart).toBeLessThan(branchBComplete)
    expect(branchBComplete).toBeLessThan(branchAComplete)

    // (b) the join node's own executor is invoked exactly once, only after
    // both branches have completed.
    expect(joinStarts).toHaveLength(1)
    expect(joinCompletes).toHaveLength(1)
    const joinStartIndex = events.indexOf(joinStarts[0]!)
    expect(branchAComplete).toBeLessThan(joinStartIndex)
    expect(branchBComplete).toBeLessThan(joinStartIndex)

    // (c) every event carries the nodeId of the node that produced it —
    // attribution survives interleaving. Each node's own event-type
    // sequence is exactly what that node kind emits, with no cross-node
    // bleed.
    const typesFor = (nodeId: string) => events.filter((e) => e.nodeId === nodeId).map((e) => e.type)
    expect(typesFor('branch-a')).toEqual(['node:start', 'node:streaming', 'node:complete'])
    expect(typesFor('branch-b')).toEqual(['node:start', 'node:streaming', 'node:complete'])
    expect(typesFor('join')).toEqual(['node:start', 'node:complete'])
    expect(typesFor('start')).toEqual(['node:start', 'node:complete'])
    expect(events.every((e) => e.runId === 'run-fanout')).toBe(true)

    expect(finalState.results.join?.kind).toBe('mechanical')
    expect(finalState.revisionCounts.join).toBe(1)
    expect(finalState.revisionCounts['branch-a']).toBe(1)
    expect(finalState.revisionCounts['branch-b']).toBe(1)
  })

  it('a branch failure rejects invoke() and the join node never runs, even after its sibling already succeeded', async () => {
    const events: AgentLifecycleEvent[] = []
    const plan = fanOutJoinPlan()
    const config = fanOutJoinConfig((e) => events.push(e))

    // branch-b succeeds quickly; branch-a fails afterward — proving the
    // join is skipped even when one sibling had already completed
    // successfully by the time the other one failed, not merely when both
    // are still pending.
    const spawnFn: SpawnFn = (command, args, options) => {
      if (command === 'worker-a-cmd') return fakeSpawnFailAfterTicks(1, 10)(command, args, options)
      if (command === 'worker-b-cmd') return fakeSpawnAfterTicks(['{"type":"result"}'], 1)(command, args, options)
      return fakeSpawn([])(command, args, options)
    }

    const executor = createAgentLifecycleNodeExecutor(config, spawnFn)
    const graph = buildAgentSpawnStateGraph(plan, executor, config)

    await expect(
      graph.invoke({ runId: 'run-fail-join', results: {}, sessions: {}, revisionCounts: {} })
    ).rejects.toThrow(/Agent-spawn node 'branch-a'.*exited with code 1/)

    const joinStarts = events.filter((e) => e.type === 'node:start' && e.nodeId === 'join')
    expect(joinStarts).toHaveLength(0)

    const branchBComplete = events.find((e) => e.type === 'node:complete' && e.nodeId === 'branch-b')
    expect(branchBComplete).toBeDefined()
    const branchAFailed = events.find((e) => e.type === 'node:failed' && e.nodeId === 'branch-a')
    expect(branchAFailed).toBeDefined()
  })
})
