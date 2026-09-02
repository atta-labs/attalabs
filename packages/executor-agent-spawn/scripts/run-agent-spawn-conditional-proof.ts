/**
 * @file run-agent-spawn-conditional-proof.ts
 * @description This task's own end-to-end proof: compiles the steps-shaped
 * fixture in `../src/conditional-proof.fixture.ts` via the real
 * `@atta/engine` `compileFlow`, executes the resulting Plan through this
 * package's real executor (no fake `spawnFn`), and asserts that the `check`
 * step's declared `decision` routes execution back to `draft` exactly once
 * — via `addConditionalEdges`, a real LangGraph cycle, and a real
 * `resume`-threaded session on each iteration — before proceeding to the
 * mechanical `finish` step. See `.claude/skills/atta-adapter-langgraph/SKILL.md`
 * ("Conditional-edge routing on a step's declared `decision`") for the
 * routing design this proves.
 *
 * The `check` step's decision predicate is a deterministic closure (attempt
 * count), not a judgment on the spawned process's actual output: the
 * examined result (`state.results['draft']`) is still a real, freshly
 * spawned agent's output, and the predicate still receives it — the closure
 * only decides what to *do* with a true/false outcome, exactly the same
 * caller responsibility `decisionPredicates` always carries. Making the
 * "fails once, succeeds next" behavior depend on real LLM output content
 * would make this proof flaky on model variance; the property being proven
 * — that the wiring loops back exactly once and threads sessions correctly
 * — does not depend on what the predicate actually decides on.
 *
 * Deliberately not named `*.test.ts`, for the same reason
 * `run-agent-spawn-proof.ts` isn't: it spawns real `claude` processes
 * authenticated by this machine's own already-logged-in session, and CI
 * runners carry no such login. Run it explicitly:
 *
 *   bun run packages/executor-agent-spawn/scripts/run-agent-spawn-conditional-proof.ts
 *
 * No observable side effects: both agent-spawn steps run in an isolated
 * temp directory under `--permission-mode plan --restricted`, with the
 * tools that could write or execute explicitly denied, and the mechanical
 * step runs `echo`, which touches no file. Safe to re-run.
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
import type { AgentLifecycleEvent, AgentSpawnExecutorConfig, StepNodeResult } from '../src/types'
import {
  CHECK_STEP_ID,
  CHECKER_ROLE,
  conditionalProofFlow,
  DRAFT_STEP_ID,
  DRAFTER_ROLE,
  FINISH_STEP_ID
} from '../src/conditional-proof.fixture'

// Real, unmocked default spawn (`node:child_process.spawn`) — the whole
// point of this proof is that no fixture fakes the subprocess.

async function main() {
  assertNoApiKeyInParentEnv()

  const workingDirectoryRoot = realpathSync(mkdtempSync(join(tmpdir(), 'agent-spawn-conditional-proof-')))
  try {
    const flow = {
      ...conditionalProofFlow,
      steps: conditionalProofFlow.steps.map((step) =>
        step.type === 'agent' ? { ...step, workingDirectory: workingDirectoryRoot } : step
      )
    }

    const plan = compileFlow(flow, 'Prove a step-shaped decision compiles and routes for real.')

    // Same USER addition as run-agent-spawn-proof.ts, for the same reason:
    // PATH+HOME alone reproduces "Not logged in" on a Keychain-backed login.
    const envAllowlist = ['PATH', 'HOME', 'USER']

    const capturedEvents: AgentLifecycleEvent[] = []

    // Deterministic, not content-based — see the file header. Closes over
    // its own counter; the predicate signature itself still receives the
    // real examined result.
    let checkAttempts = 0
    const decisionPredicates = {
      [CHECK_STEP_ID]: (_result: StepNodeResult) => {
        checkAttempts += 1
        // First attempt: request a revision (route back to 'draft').
        // Second attempt: accept and continue (route to 'finish').
        return checkAttempts === 1
      }
    }

    const config: AgentSpawnExecutorConfig = {
      workingDirectoryRoot,
      envAllowlist,
      onEvent: (event) => capturedEvents.push(event),
      decisionPredicates,
      roleBinaries: {
        [DRAFTER_ROLE]: {
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
        [CHECKER_ROLE]: {
          command: 'claude',
          allowedPermissions: ['plan'],
          timeoutMs: 120_000,
          buildArgs: ({ permission, maxTurns, resumeSessionId }) => [
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
            'Write Edit NotebookEdit Bash',
            ...(resumeSessionId ? ['--resume', resumeSessionId] : [])
          ]
        }
      },
      mechanicalActions: {
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

    assert.equal(checkAttempts, 2, "expected the decision predicate to run exactly twice — once per 'check' execution")

    assertCapturedStream(capturedEvents, runId)
    assertFinalState(finalState)

    console.info('--- captured event stream ---')
    console.info(JSON.stringify(capturedEvents, null, 2))
    console.info('--- final graph state ---')
    console.info(JSON.stringify(finalState, null, 2))
    console.info('PROOF PASSED: a real step-shaped decision looped back exactly once, then continued.')
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
  for (const role of [DRAFTER_ROLE, CHECKER_ROLE]) {
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

  const starts = (nodeId: string) => events.filter((e) => e.type === 'node:start' && e.nodeId === nodeId)
  const completes = (nodeId: string) => events.filter((e) => e.type === 'node:complete' && e.nodeId === nodeId)

  assert.equal(
    starts(DRAFT_STEP_ID).length,
    2,
    "expected 'draft' to start exactly twice — once, then once more after the loop-back"
  )
  assert.equal(completes(DRAFT_STEP_ID).length, 2, "expected 'draft' to complete exactly twice")
  assert.equal(starts(CHECK_STEP_ID).length, 2, "expected 'check' to start exactly twice")
  assert.equal(completes(CHECK_STEP_ID).length, 2, "expected 'check' to complete exactly twice")
  assert.equal(starts(FINISH_STEP_ID).length, 1, "expected 'finish' to start exactly once, after the loop resolved")
  assert.equal(completes(FINISH_STEP_ID).length, 1, "expected 'finish' to complete exactly once")

  // Strict event ordering proves the compiled decision actually drove the
  // second 'draft' execution, not just that every node eventually ran.
  const indexOf = (predicate: (e: AgentLifecycleEvent) => boolean) => events.findIndex(predicate)
  const draftStart1 = indexOf((e) => e.type === 'node:start' && e.nodeId === DRAFT_STEP_ID)
  const draftComplete1 = indexOf((e) => e.type === 'node:complete' && e.nodeId === DRAFT_STEP_ID)
  const checkStart1 = indexOf((e) => e.type === 'node:start' && e.nodeId === CHECK_STEP_ID)
  const checkComplete1 = indexOf((e) => e.type === 'node:complete' && e.nodeId === CHECK_STEP_ID)
  const draftStart2 = events.findIndex(
    (e, i) => i > checkComplete1 && e.type === 'node:start' && e.nodeId === DRAFT_STEP_ID
  )
  const draftComplete2 = events.findIndex(
    (e, i) => i > draftStart2 && e.type === 'node:complete' && e.nodeId === DRAFT_STEP_ID
  )
  const checkStart2 = events.findIndex(
    (e, i) => i > draftComplete2 && e.type === 'node:start' && e.nodeId === CHECK_STEP_ID
  )
  const checkComplete2 = events.findIndex(
    (e, i) => i > checkStart2 && e.type === 'node:complete' && e.nodeId === CHECK_STEP_ID
  )
  const finishStart = indexOf((e) => e.type === 'node:start' && e.nodeId === FINISH_STEP_ID)
  const finishComplete = indexOf((e) => e.type === 'node:complete' && e.nodeId === FINISH_STEP_ID)

  const order = {
    draftStart1,
    draftComplete1,
    checkStart1,
    checkComplete1,
    draftStart2,
    draftComplete2,
    checkStart2,
    checkComplete2,
    finishStart,
    finishComplete
  }
  assert.ok(
    draftStart1 < draftComplete1 &&
      draftComplete1 < checkStart1 &&
      checkStart1 < checkComplete1 &&
      checkComplete1 < draftStart2 &&
      draftStart2 < draftComplete2 &&
      draftComplete2 < checkStart2 &&
      checkStart2 < checkComplete2 &&
      checkComplete2 < finishStart &&
      finishStart < finishComplete,
    `expected strict event ordering across the loop-back and the continue; got indices ${JSON.stringify(order)}`
  )
}

function assertFinalState(state: AgentSpawnGraphStateValue) {
  assert.equal(state.revisionCounts[DRAFT_STEP_ID], 2, "'draft' must have executed exactly twice")
  assert.equal(state.revisionCounts[CHECK_STEP_ID], 2, "'check' must have executed exactly twice")
  assert.equal(state.revisionCounts[FINISH_STEP_ID], 1, "'finish' must have executed exactly once")

  const checkResult = state.results[CHECK_STEP_ID]
  assert.ok(checkResult, 'missing check result')
  assert.equal(checkResult.kind, 'agent-spawn')
  if (checkResult.kind !== 'agent-spawn') throw new Error('unreachable')
  assert.equal(checkResult.exitCode, 0, "check step's second (final) execution must exit 0")

  assert.ok(typeof state.sessions[DRAFT_STEP_ID] === 'string', "a real claude run must record 'draft''s session id")

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
