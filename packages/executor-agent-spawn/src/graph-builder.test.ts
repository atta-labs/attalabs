import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'bun:test'
import type { Plan, PlanMechanicalNode } from '@atta/engine'
import { buildAgentSpawnStateGraph, createAgentLifecycleNodeExecutor } from './graph-builder'
import type { AgentSpawnGraphStateValue } from './graph-state'
import type { SpawnedProcessLike, SpawnFn } from './node-executor'
import type { AgentSpawnExecutorConfig } from './types'

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
})

describe('createAgentLifecycleNodeExecutor', () => {
  const emptyState: AgentSpawnGraphStateValue = {
    runId: 'run-1',
    results: {},
    sessions: {},
    revisionCounts: {}
  }

  it('throws naming task 4 when asked to execute a mechanical node', async () => {
    const mechanicalNode: PlanMechanicalNode = {
      id: 'apply-patch',
      role: 'mechanical',
      kind: 'mechanical',
      action: 'apply-patch',
      metadata: {}
    }
    const executor = createAgentLifecycleNodeExecutor(config)

    await expect(executor(emptyState, { node: mechanicalNode, plan: twoStepPlan })).rejects.toThrow(/task 4/)
  })

  it('throws when a node declares resume but no session was recorded yet', async () => {
    const executor = createAgentLifecycleNodeExecutor(config)
    const reviewNode = twoStepPlan.graph.nodes.review!

    await expect(executor(emptyState, { node: reviewNode, plan: twoStepPlan })).rejects.toThrow(
      /no session id has been recorded/
    )
  })
})
