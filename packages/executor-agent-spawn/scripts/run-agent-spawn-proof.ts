/**
 * @file run-agent-spawn-proof.ts
 * @description The tranche's end-to-end proof: compiles the steps-shaped
 * fixture in `../src/agent-spawn-proof.fixture.ts` via the real `@atta/engine`
 * `compileFlow`, executes the resulting Plan through this package's real
 * executor (no fake `spawnFn`), and asserts on the captured event stream.
 * Prints that stream so it can be pasted as PR evidence — see
 * `.claude/skills/atta-engine/SKILL.md` and
 * `.claude/skills/atta-adapter-langgraph/SKILL.md` for where the two halves
 * of this composition are each documented.
 *
 * Deliberately not named `*.test.ts`: it spawns a real `claude` process
 * authenticated by this machine's own already-logged-in session, and CI
 * runners carry no such login. Wiring it into `bun test` would make every
 * routine `turbo test` run either fail (no login) or spend real API cost —
 * neither is what a compile/lint/test gate should do. Run it explicitly,
 * from a machine with a logged-in `claude` CLI on `PATH`:
 *
 *   bun run packages/executor-agent-spawn/scripts/run-agent-spawn-proof.ts
 *
 * No observable side effects: the agent-spawn step runs in an isolated temp
 * directory under `--permission-mode plan --restricted`, with the tools
 * that could write or execute explicitly denied, and the mechanical step
 * runs `echo`, which touches no file. Safe to re-run.
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
import { AGENT_SPAWN_STEP_ID, agentSpawnProofFlow, MECHANICAL_STEP_ID } from '../src/agent-spawn-proof.fixture'

// Real, unmocked default spawn (`node:child_process.spawn`) — the whole
// point of this proof is that no fixture fakes the subprocess.

async function main() {
  assertNoApiKeyInParentEnv()

  const workingDirectoryRoot = realpathSync(mkdtempSync(join(tmpdir(), 'agent-spawn-proof-')))
  try {
    const flow = {
      ...agentSpawnProofFlow,
      steps: agentSpawnProofFlow.steps.map((step) =>
        step.id === AGENT_SPAWN_STEP_ID ? { ...step, workingDirectory: workingDirectoryRoot } : step
      )
    }

    const plan = compileFlow(flow, 'Prove a steps-shaped Flow compiles and executes for real.')

    // PATH + HOME is this package's own documented default (see
    // DEFAULT_ENV_ALLOWLIST in node-executor.ts) and is enough for a
    // Linux-style env-file or config-directory login. On a machine whose
    // `claude` login is Keychain-backed (macOS), PATH+HOME alone reproduces
    // "Not logged in · Please run /login" — the child process can locate
    // `claude` and its config dir but the Keychain lookup itself needs the
    // OS user identity. Adding USER is a caller-side config choice (this
    // executor never hardcodes an allowlist the caller can't override), not
    // a change to the package's own default.
    const envAllowlist = ['PATH', 'HOME', 'USER']

    const capturedEvents: AgentLifecycleEvent[] = []

    const config: AgentSpawnExecutorConfig = {
      workingDirectoryRoot,
      envAllowlist,
      onEvent: (event) => capturedEvents.push(event),
      roleBinaries: {
        prover: {
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
    const finalState = (await graph.invoke({
      runId,
      results: {},
      sessions: {},
      revisionCounts: {}
    })) as AgentSpawnGraphStateValue

    assertCapturedStream(capturedEvents, runId)
    assertFinalState(finalState)

    console.info('--- captured event stream ---')
    console.info(JSON.stringify(capturedEvents, null, 2))
    console.info('--- final graph state ---')
    console.info(JSON.stringify(finalState, null, 2))
    console.info('PROOF PASSED: real agent-spawn + mechanical steps executed and composed correctly.')
  } finally {
    rmSync(workingDirectoryRoot, { recursive: true, force: true })
  }
}

function assertNoApiKeyInParentEnv() {
  const leaked = Object.keys(process.env).filter((key) => /API_KEY/i.test(key))
  assert.deepEqual(leaked, [], `This proof's own process must see no *_API_KEY env var; found: ${leaked.join(', ')}`)
}

/**
 * Asserts on the exact environment `buildChildEnv` would hand the spawned
 * process — the real function this package's own executor calls, not a
 * re-derivation of its logic — so this checks what the run actually sees,
 * not what the fixture assumes it sees.
 */
function assertNoApiKeyInChildEnv(config: AgentSpawnExecutorConfig) {
  const roleConfig = config.roleBinaries.prover
  assert.ok(roleConfig, 'expected a "prover" role binary to be configured')
  const childEnv = buildChildEnv(roleConfig, config.envAllowlist)
  const leaked = Object.keys(childEnv).filter((key) => /API_KEY/i.test(key))
  assert.deepEqual(leaked, [], `The spawned process's own env must carry no *_API_KEY; found: ${leaked.join(', ')}`)
}

function assertCapturedStream(events: AgentLifecycleEvent[], runId: string) {
  assert.ok(events.length > 0, 'expected at least one captured lifecycle event')
  assert.ok(
    events.every((event) => event.runId === runId),
    "every captured event must carry this run's runId"
  )

  const spawnStart = events.findIndex((e) => e.type === 'node:start' && e.nodeId === AGENT_SPAWN_STEP_ID)
  const spawnComplete = events.findIndex((e) => e.type === 'node:complete' && e.nodeId === AGENT_SPAWN_STEP_ID)
  const mechanicalStart = events.findIndex((e) => e.type === 'node:start' && e.nodeId === MECHANICAL_STEP_ID)
  const mechanicalComplete = events.findIndex((e) => e.type === 'node:complete' && e.nodeId === MECHANICAL_STEP_ID)

  assert.ok(spawnStart >= 0, 'missing node:start for the agent-spawn step')
  assert.ok(spawnComplete >= 0, 'missing node:complete for the agent-spawn step')
  assert.ok(mechanicalStart >= 0, 'missing node:start for the mechanical step')
  assert.ok(mechanicalComplete >= 0, 'missing node:complete for the mechanical step')

  // The graph's single 'flow' edge (agent-spawn -> mechanical) must show up
  // as strict event ordering, not just as both nodes eventually running.
  assert.ok(
    spawnStart < spawnComplete && spawnComplete < mechanicalStart && mechanicalStart < mechanicalComplete,
    `expected event order start(spawn) < complete(spawn) < start(mechanical) < complete(mechanical); got indices ${JSON.stringify(
      { spawnStart, spawnComplete, mechanicalStart, mechanicalComplete }
    )}`
  )

  const streamed = events.filter((e) => e.type === 'node:streaming')
  assert.ok(streamed.length > 0, 'expected at least one node:streaming event from the real spawned process')
}

function assertFinalState(state: AgentSpawnGraphStateValue) {
  const spawnResult = state.results[AGENT_SPAWN_STEP_ID]
  assert.ok(spawnResult, 'missing agent-spawn result')
  assert.equal(spawnResult.kind, 'agent-spawn')
  if (spawnResult.kind !== 'agent-spawn') throw new Error('unreachable')
  assert.equal(spawnResult.exitCode, 0, 'agent-spawn step must exit 0')
  assert.ok(spawnResult.events.length > 0, 'agent-spawn step must produce a parsed NDJSON event stream')
  assert.ok(typeof spawnResult.sessionId === 'string', 'a real claude run must report a session id')
  assert.ok(state.sessions[AGENT_SPAWN_STEP_ID], 'the run must record the resumable session id')

  const mechanicalResult = state.results[MECHANICAL_STEP_ID]
  assert.ok(mechanicalResult, 'missing mechanical result')
  assert.equal(mechanicalResult.kind, 'mechanical')
  if (mechanicalResult.kind !== 'mechanical') throw new Error('unreachable')
  assert.equal(mechanicalResult.exitCode, 0, 'mechanical step must exit 0')
  assert.equal(mechanicalResult.stdout, 'record-completion:no-side-effects\n')
  assert.equal(state.sessions[MECHANICAL_STEP_ID], undefined, 'a mechanical step must never record a session')
}

main().catch((err) => {
  console.error('PROOF FAILED')
  console.error(err)
  process.exitCode = 1
})
