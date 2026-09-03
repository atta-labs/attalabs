/**
 * @file run-agent-spawn-parallel-proof.ts
 * @description This task's own end-to-end proof: compiles the steps-shaped
 * fixture in `../src/parallel-proof.fixture.ts` via the real `@atta/engine`
 * `compileFlow`, executes the resulting Plan through this package's real
 * executor (no fake `spawnFn`), and asserts that `branch-a` and `branch-b`
 * — two independent real `claude -p` processes — actually overlap in time,
 * and that the mechanical `finish` step's own executor runs exactly once,
 * only after both have completed. See
 * `.claude/skills/atta-adapter-langgraph/SKILL.md` ("Fan-out and join on a
 * step's `dependsOn`" / "Fail-the-join") for the design this proves.
 *
 * Real subprocess timing is not fully controllable the way
 * `graph-builder.test.ts`'s fake-spawn ticks are, so the concurrency
 * assertion here is deliberately the weaker, robust form: neither branch's
 * `node:complete` may be fully sandwiched before the other's `node:start`.
 * Two real `claude -p` invocations dispatched in the same LangGraph
 * superstep reliably overlap in practice (both spin up before either
 * finishes), but this proof checks the interleaving property itself rather
 * than asserting exact ordering, which real process scheduling does not
 * guarantee.
 *
 * Deliberately not named `*.test.ts`, for the same reason
 * `run-agent-spawn-proof.ts` and `run-agent-spawn-conditional-proof.ts`
 * aren't: it spawns real `claude` processes authenticated by this machine's
 * own already-logged-in session, and CI runners carry no such login. Run it
 * explicitly:
 *
 *   bun run packages/executor-agent-spawn/scripts/run-agent-spawn-parallel-proof.ts
 *
 * No observable side effects: both agent-spawn steps run in an isolated
 * temp directory under `--permission-mode plan --restricted`, with the
 * tools that could write or execute explicitly denied, and both mechanical
 * steps run `echo`, which touches no file. Safe to re-run.
 */

import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { compileFlow } from '@atta/engine'
import { buildAgentSpawnStateGraph, createAgentLifecycleNodeExecutor } from '../src/graph-builder'
import type { AgentSpawnGraphStateValue } from '../src/graph-state'
import { buildChildEnv } from '../src/node-executor'
import type { AgentLifecycleEvent, AgentSpawnExecutorConfig } from '../src/types'
import {
  BRANCH_A_STEP_ID,
  BRANCH_B_STEP_ID,
  DRAFTER_A_ROLE,
  DRAFTER_B_ROLE,
  FINISH_STEP_ID,
  parallelProofFlow,
  START_STEP_ID
} from '../src/parallel-proof.fixture'

// Real, unmocked default spawn (`node:child_process.spawn`) — the whole
// point of this proof is that no fixture fakes the subprocess.

async function main() {
  assertNoApiKeyInParentEnv()

  const workingDirectoryRoot = realpathSync(mkdtempSync(join(tmpdir(), 'agent-spawn-parallel-proof-')))
  try {
    const flow = {
      ...parallelProofFlow,
      steps: parallelProofFlow.steps.map((step) =>
        step.type === 'agent' ? { ...step, workingDirectory: workingDirectoryRoot } : step
      )
    }

    const plan = compileFlow(flow, 'Prove a step-shaped fan-out/join compiles and executes for real.')

    // Same USER addition as the other proof runners, for the same reason:
    // PATH+HOME alone reproduces "Not logged in" on a Keychain-backed login.
    const envAllowlist = ['PATH', 'HOME', 'USER']

    const capturedEvents: AgentLifecycleEvent[] = []

    const config: AgentSpawnExecutorConfig = {
      workingDirectoryRoot,
      envAllowlist,
      onEvent: (event) => capturedEvents.push(event),
      roleBinaries: {
        [DRAFTER_A_ROLE]: {
          command: 'claude',
          allowedPermissions: ['plan'],
          timeoutMs: 120_000,
          buildArgs: ({ permission, maxTurns }) => [
            '-p',
            '--output-format',
            'stream-json',
            '--verbose',
            '--permission-mode',
            permission,
            '--max-turns',
            String(maxTurns),
            '--restricted',
            '--disallowedTools',
            'Write Edit NotebookEdit Bash'
          ]
        },
        [DRAFTER_B_ROLE]: {
          command: 'claude',
          allowedPermissions: ['plan'],
          timeoutMs: 120_000,
          buildArgs: ({ permission, maxTurns }) => [
            '-p',
            '--output-format',
            'stream-json',
            '--verbose',
            '--permission-mode',
            permission,
            '--max-turns',
            String(maxTurns),
            '--restricted',
            '--disallowedTools',
            'Write Edit NotebookEdit Bash'
          ]
        }
      },
      mechanicalActions: {
        'record-start': {
          command: 'echo',
          args: ['record-start:no-side-effects'],
          successExitCodes: [0]
        },
        'record-completion': {
          command: 'echo',
          args: ['record-completion:no-side-effects'],
          successExitCodes: [0]
        }
      }
    }

    assertNoApiKeyInChildEnv(config)

    const executor = createAgentLifecycleNodeExecutor(config)
    const graph = buildAgentSpawnStateGraph(plan, executor, config)

    const runId = randomUUID()
    const finalState = (await graph.invoke(
      { runId, results: {}, sessions: {}, revisionCounts: {} },
      { recursionLimit: 25 }
    )) as AgentSpawnGraphStateValue

    assertCapturedStream(capturedEvents, runId)
    assertFinalState(finalState)

    console.info('--- captured event stream ---')
    console.info(JSON.stringify(capturedEvents, null, 2))
    console.info('--- final graph state ---')
    console.info(JSON.stringify(finalState, null, 2))
    console.info('PROOF PASSED: two real agent-spawn branches ran concurrently and joined correctly.')
  } finally {
    rmSync(workingDirectoryRoot, { recursive: true, force: true })
  }
}

function assertNoApiKeyInParentEnv() {
  const leaked = Object.keys(process.env).filter((key) => /API_KEY/i.test(key))
  assert.deepEqual(leaked, [], `This proof's own process must see no *_API_KEY env var; found: ${leaked.join(', ')}`)
}

/**
 * Asserts on the exact environment `buildChildEnv` would hand each spawned
 * process — the real function this package's own executor calls, not a
 * re-derivation of its logic.
 */
function assertNoApiKeyInChildEnv(config: AgentSpawnExecutorConfig) {
  for (const role of [DRAFTER_A_ROLE, DRAFTER_B_ROLE]) {
    const roleConfig = config.roleBinaries[role]
    assert.ok(roleConfig, `expected a "${role}" role binary to be configured`)
    const childEnv = buildChildEnv(roleConfig, config.envAllowlist)
    const leaked = Object.keys(childEnv).filter((key) => /API_KEY/i.test(key))
    assert.deepEqual(
      leaked,
      [],
      `The "${role}" spawned process's own env must carry no *_API_KEY; found: ${leaked.join(', ')}`
    )
  }
}

function assertCapturedStream(events: AgentLifecycleEvent[], runId: string) {
  assert.ok(events.length > 0, 'expected at least one captured lifecycle event')
  assert.ok(
    events.every((event) => event.runId === runId),
    "every captured event must carry this run's runId"
  )

  const indexOf = (predicate: (e: AgentLifecycleEvent) => boolean) => events.findIndex(predicate)
  const startStart = indexOf((e) => e.type === 'node:start' && e.nodeId === START_STEP_ID)
  const startComplete = indexOf((e) => e.type === 'node:complete' && e.nodeId === START_STEP_ID)
  const branchAStart = indexOf((e) => e.type === 'node:start' && e.nodeId === BRANCH_A_STEP_ID)
  const branchAComplete = indexOf((e) => e.type === 'node:complete' && e.nodeId === BRANCH_A_STEP_ID)
  const branchBStart = indexOf((e) => e.type === 'node:start' && e.nodeId === BRANCH_B_STEP_ID)
  const branchBComplete = indexOf((e) => e.type === 'node:complete' && e.nodeId === BRANCH_B_STEP_ID)
  const finishStarts = events.filter((e) => e.type === 'node:start' && e.nodeId === FINISH_STEP_ID)
  const finishCompletes = events.filter((e) => e.type === 'node:complete' && e.nodeId === FINISH_STEP_ID)

  assert.ok(startStart >= 0 && startComplete >= 0, "'start' must have produced start/complete events")
  assert.ok(branchAStart >= 0 && branchAComplete >= 0, "'branch-a' must have produced start/complete events")
  assert.ok(branchBStart >= 0 && branchBComplete >= 0, "'branch-b' must have produced start/complete events")
  assert.ok(startComplete < branchAStart, "'start' must complete before 'branch-a' starts")
  assert.ok(startComplete < branchBStart, "'start' must complete before 'branch-b' starts")

  // Real concurrent execution, checked as an interleaving property rather
  // than exact ordering: neither branch's node:complete may be fully
  // sandwiched before the other's node:start.
  assert.ok(
    !(branchAComplete < branchBStart) && !(branchBComplete < branchAStart),
    `expected 'branch-a' and 'branch-b' to overlap in time — no node:complete strictly precedes the other's node:start; got indices ${JSON.stringify(
      { branchAStart, branchAComplete, branchBStart, branchBComplete }
    )}`
  )

  // The join: exactly one 'finish' invocation, only after both branches
  // have completed.
  assert.equal(finishStarts.length, 1, "expected 'finish' to start exactly once")
  assert.equal(finishCompletes.length, 1, "expected 'finish' to complete exactly once")
  const finishStartIndex = events.indexOf(finishStarts[0]!)
  assert.ok(branchAComplete < finishStartIndex, "'branch-a' must complete before 'finish' starts")
  assert.ok(branchBComplete < finishStartIndex, "'branch-b' must complete before 'finish' starts")

  const streamed = events.filter((e) => e.type === 'node:streaming')
  assert.ok(streamed.length > 0, 'expected at least one node:streaming event from a real spawned process')
}

function assertFinalState(state: AgentSpawnGraphStateValue) {
  assert.equal(state.revisionCounts[START_STEP_ID], 1, "'start' must have executed exactly once")
  assert.equal(state.revisionCounts[BRANCH_A_STEP_ID], 1, "'branch-a' must have executed exactly once")
  assert.equal(state.revisionCounts[BRANCH_B_STEP_ID], 1, "'branch-b' must have executed exactly once")
  assert.equal(state.revisionCounts[FINISH_STEP_ID], 1, "'finish' must have executed exactly once")

  const branchAResult = state.results[BRANCH_A_STEP_ID]
  assert.ok(branchAResult, 'missing branch-a result')
  assert.equal(branchAResult.kind, 'agent-spawn')
  if (branchAResult.kind !== 'agent-spawn') throw new Error('unreachable')
  assert.equal(branchAResult.exitCode, 0, "branch-a's real claude run must exit 0")
  assert.ok(
    typeof state.sessions[BRANCH_A_STEP_ID] === 'string',
    "a real claude run must record 'branch-a''s session id"
  )

  const branchBResult = state.results[BRANCH_B_STEP_ID]
  assert.ok(branchBResult, 'missing branch-b result')
  assert.equal(branchBResult.kind, 'agent-spawn')
  if (branchBResult.kind !== 'agent-spawn') throw new Error('unreachable')
  assert.equal(branchBResult.exitCode, 0, "branch-b's real claude run must exit 0")
  assert.ok(
    typeof state.sessions[BRANCH_B_STEP_ID] === 'string',
    "a real claude run must record 'branch-b''s session id"
  )

  const finishResult = state.results[FINISH_STEP_ID]
  assert.ok(finishResult, 'missing finish result')
  assert.equal(finishResult.kind, 'mechanical')
  if (finishResult.kind !== 'mechanical') throw new Error('unreachable')
  assert.equal(finishResult.exitCode, 0, 'finish step must exit 0')
  assert.equal(finishResult.stdout, 'record-completion:no-side-effects\n')
  assert.equal(state.sessions[FINISH_STEP_ID], undefined, 'a mechanical step must never record a session')
}

main().catch((err) => {
  console.error('PROOF FAILED')
  console.error(err)
  process.exitCode = 1
})
