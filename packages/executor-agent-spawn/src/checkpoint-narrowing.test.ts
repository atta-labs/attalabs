/**
 * @file checkpoint-narrowing.test.ts
 * @description What a checkpoint is allowed to hold, and the proof that
 * narrowing it left a resume able to reach the same outcome.
 *
 * **Why the two live in one suite.** The second is the constraint on the first.
 * Any narrowing passes an "is it smaller" assertion; only a resume can say
 * whether what was taken out was load-bearing. So every field the first half
 * asserts is narrowed is exercised again by the second, against every consumer
 * the `results` channel actually has — a prompt template, a caller's decision
 * predicate, the session lookup a later step's `resume` performs, and the
 * outcome reader.
 *
 * **Why it reads the raw checkpoint tuple and not `readRunCheckpoint`.** A
 * `StateSnapshot`'s channel values are not the only thing a checkpoint record
 * holds: its `metadata` carries `writes`, the node outputs of that super-step,
 * and LangGraph persists each finished node's own writes as task entries too. A
 * narrowing applied in the state annotation's reducer would satisfy a
 * channel-values assertion while both of those still held the verbatim value —
 * which is exactly the false-but-passing guarantee this file exists to rule out.
 * So the assertions scan the whole serialized tuple, not the read-back state.
 */

import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'bun:test'
import type { Plan, PlanAgentSpawnNode, PlanMechanicalNode, PlanStepDecision } from '@atta/engine'
import { MemorySaver } from '@langchain/langgraph'
import { executeMechanicalNode } from './mechanical-executor'
import { executeAgentSpawnNode, type SpawnedProcessLike, type SpawnFn } from './node-executor'
import { MAX_PERSISTED_EVENT_RECORDS, MAX_PERSISTED_TEXT_LENGTH } from './reason-text'
import { resumeControlledRun, startControlledRun } from './run-control'
import { createRunControl } from './run-halt'
import { createRunIdentity, readRunCheckpoint, runInvokeConfig, startRun } from './run-identity'
import type { AgentLifecycleEvent, AgentSpawnExecutorConfig, RunControl, StepNodeResult } from './types'

const workingDirectoryRoot = mkdtempSync(join(tmpdir(), 'agent-spawn-narrowing-root-'))

// ── The sensitive literals every assertion below hunts for ──────────────────
//
// Each is a shape the redaction rules recognise, planted in the one place a
// spawned process actually controls: what it prints. A literal rather than a
// generated value so an assertion that it is absent cannot pass by accident.

/** A machine-local absolute path, the machine's own filesystem layout. */
const SECRET_PATH = '/Users/someone/Work/secret-checkout/src/app.ts'
/** The resumable session id the agent reports — load-bearing, so it must survive in exactly one place. */
const REAL_SESSION_ID = '3f2b1c9a-4d5e-6f70-8192-a3b4c5d6e7f8'
/**
 * A credential an agent read aloud, planted under a sensitive *key* rather than
 * as a bare key-shaped token. Deliberately low-entropy and obviously fake: a
 * realistic-looking literal here is indistinguishable from a real leak to a
 * history-wide secret scanner, and a test fixture must not be the thing that
 * makes one fire. The keyed rule is the one that matters anyway — it is what
 * catches a credential printed under `authorization`/`token`/`api_key`,
 * whatever shape the value itself happens to have.
 */
const SECRET_TOKEN = 'placeholder-not-a-real-secret'

/** The NDJSON an agent-spawn node's fake child prints — one record per line. */
function agentStreamLines(extraRecords = 0): string[] {
  const lines = [
    JSON.stringify({ type: 'system', cwd: SECRET_PATH }),
    JSON.stringify({ type: 'assistant', text: `reading ${SECRET_PATH}` }),
    JSON.stringify({ type: 'tool_result', authorization: SECRET_TOKEN }),
    JSON.stringify({ type: 'result', session_id: REAL_SESSION_ID })
  ]
  // Filler ahead of the four above, so the record bound has something to drop
  // and the four that carry the planted literals stay in the retained tail.
  const filler = Array.from({ length: extraRecords }, (_unused, index) =>
    JSON.stringify({ type: 'assistant', text: `step ${index}` })
  )
  return [...filler, ...lines]
}

function fakeAgentSpawn(stdoutLines: string[]): SpawnFn {
  return () => {
    const stdoutListeners: Array<(chunk: string) => void> = []
    const closeListeners: Array<(code: number | null) => void> = []
    const spawned: SpawnedProcessLike = {
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
    return spawned
  }
}

/** A mechanical command's fake child: prints on stdout and stderr, then exits with `exitCode`. */
function fakeMechanicalSpawn(stdout: string, stderr: string, exitCode = 0): SpawnFn {
  return () => {
    const stdoutListeners: Array<(chunk: string) => void> = []
    const stderrListeners: Array<(chunk: string) => void> = []
    const closeListeners: Array<(code: number | null) => void> = []
    const spawned: SpawnedProcessLike = {
      stdin: { write: () => {}, end: () => {} },
      stdout: { on: (_event, listener) => stdoutListeners.push(listener) },
      stderr: { on: (_event, listener) => stderrListeners.push(listener) },
      on: (event, listener) => {
        if (event === 'close') closeListeners.push(listener as (code: number | null) => void)
      },
      kill: () => {}
    }
    queueMicrotask(() => {
      for (const listener of stdoutListeners) listener(stdout)
      for (const listener of stderrListeners) listener(stderr)
      for (const listener of closeListeners) listener(exitCode)
    })
    return spawned
  }
}

/** A fake child that never starts: emits `error`, the shape a missing binary takes, and never closes. */
function failingToSpawn(message: string): SpawnFn {
  return () => {
    const errorListeners: Array<(err: Error) => void> = []
    const spawned: SpawnedProcessLike = {
      stdin: { write: () => {}, end: () => {} },
      stdout: { on: () => {} },
      stderr: { on: () => {} },
      on: (event, listener) => {
        if (event === 'error') errorListeners.push(listener as (err: Error) => void)
      },
      kill: () => {}
    }
    queueMicrotask(() => {
      for (const listener of errorListeners) listener(new Error(message))
    })
    return spawned
  }
}

/**
 * Dispatches per spawned command, so one graph can hold an agent-spawn step and
 * a mechanical step whose fake children print different things.
 */
function spawnByCommand(byCommand: Record<string, SpawnFn>, log?: string[]): SpawnFn {
  return (command, args, options) => {
    log?.push(command)
    const chosen = byCommand[command]
    if (!chosen) throw new Error(`test spawn has no fake for command '${command}'`)
    return chosen(command, args, options)
  }
}

function agentNode(id: string, overrides: Partial<PlanAgentSpawnNode> = {}): PlanAgentSpawnNode {
  return {
    id,
    role: 'agent-spawn',
    kind: 'agent-spawn',
    promptTemplate: 'Do: {{question}}',
    agentRole: 'coder',
    permission: 'default',
    workingDirectory: workingDirectoryRoot,
    maxTurns: 5,
    metadata: {},
    ...overrides
  }
}

function mechanicalNode(id: string, action: string, decision?: PlanStepDecision): PlanMechanicalNode {
  return { id, role: 'mechanical', kind: 'mechanical', action, ...(decision ? { decision } : {}), metadata: {} }
}

const mechanicalActions = {
  'verify-action': { command: 'verify-cmd' },
  'report-action': { command: 'report-cmd' },
  'fail-action': { command: 'fail-cmd' }
}

function config(
  onEvent?: (event: AgentLifecycleEvent) => void,
  overrides: Partial<AgentSpawnExecutorConfig> = {}
): AgentSpawnExecutorConfig {
  return {
    workingDirectoryRoot,
    roleBinaries: {
      coder: { command: 'coder-cmd', buildArgs: () => [], allowedPermissions: ['default'] }
    },
    mechanicalActions,
    ...(onEvent ? { onEvent } : {}),
    ...overrides
  }
}

/**
 * An agent-spawn step, then a mechanical step whose output a later step could
 * read. Two kinds in one Plan because the narrowing has a branch per kind and
 * one checkpoint has to be clean of both kinds' raw output.
 */
function twoKindPlan(): Plan {
  return {
    schemaVersion: '1.0',
    question: 'Ship it',
    model: 'n/a',
    agents: {},
    teamName: 'agent-lifecycle-narrowing-test',
    maxRevisions: 0,
    graph: {
      nodes: { implement: agentNode('implement'), verify: mechanicalNode('verify', 'verify-action') },
      edges: [{ from: 'implement', to: 'verify', kind: 'flow' }],
      conditionalEdges: [],
      entryNode: 'implement'
    }
  }
}

/**
 * The same value with every `sessions` channel removed, at any depth.
 *
 * `sessions` is the one channel that legitimately holds the verbatim session id
 * — a later step's `resume` passes it to the agent CLI — and it appears in the
 * checkpoint twice over, as a channel value and inside that super-step's
 * recorded `writes`. Stripping it by key is what lets the assertions below make
 * the strong claim instead of a weak one: not "the id appears somewhere it is
 * allowed to", but "the id appears nowhere else in the whole record".
 */
function withoutSessionsChannel(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutSessionsChannel)
  if (typeof value !== 'object' || value === null) return value
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== 'sessions')
      .map(([key, entry]) => [key, withoutSessionsChannel(entry)])
  )
}

/**
 * Every byte of every checkpoint this thread holds — channel values, metadata
 * writes and pending writes, across the whole history rather than the latest
 * tuple alone.
 *
 * The history matters: a super-step's `writes` are recorded on the checkpoint
 * that super-step produced, so a node's own returned value is only visible on
 * that one, and later checkpoints (including the out-of-graph `completed`
 * record) carry different `writes` entirely. Scanning only the newest tuple
 * would let a verbatim value sit in an earlier checkpoint of the same thread —
 * still durable, still readable, still a leak.
 */
async function serializedCheckpointRecord(
  checkpointer: MemorySaver,
  identity: { runId: string; threadId: string }
): Promise<string> {
  const records: unknown[] = []
  for await (const tuple of checkpointer.list(runInvokeConfig(identity))) {
    records.push({
      values: tuple.checkpoint.channel_values,
      metadata: tuple.metadata,
      // A pending write is a `[taskId, channel, value]` triple, so its channel
      // is a positional string rather than an object key — `sessions` has to be
      // dropped by position here, not by `withoutSessionsChannel`. Everything
      // else stays, which is how the `results` task write gets scanned too.
      pendingWrites: (tuple.pendingWrites ?? []).filter(([, channel]) => channel !== 'sessions')
    })
  }
  if (records.length === 0) throw new Error('expected at least one checkpoint tuple')
  return JSON.stringify(withoutSessionsChannel(records))
}

/**
 * The narrowed result the super-step that ran `nodeId` recorded in its own
 * `writes` — the value the node *returned*, which is the copy a reducer-only
 * narrowing would have left verbatim.
 */
function haltAfter(nodeId: string, control: RunControl): (event: AgentLifecycleEvent) => void {
  return (event) => {
    if (event.type === 'node:complete' && event.nodeId === nodeId) control.halt()
  }
}

async function recordedWriteFor(
  checkpointer: MemorySaver,
  identity: { runId: string; threadId: string },
  nodeId: string
): Promise<StepNodeResult> {
  for await (const tuple of checkpointer.list(runInvokeConfig(identity))) {
    const writes = (tuple.metadata as { writes?: Record<string, unknown> } | undefined)?.writes ?? {}
    const own = writes[nodeId] as { results?: Record<string, StepNodeResult> } | undefined
    const result = own?.results?.[nodeId]
    if (result) return result
  }
  throw new Error(`expected a recorded write for node '${nodeId}' somewhere in the thread's checkpoints`)
}

describe('a checkpoint carries a bounded, redacted form of a node result', () => {
  it('redacts an agent node structured stream and says which fields it narrowed', async () => {
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('narrow-agent-stream')

    await startRun({
      plan: twoKindPlan(),
      config: config(),
      checkpointer,
      identity,
      spawnFn: spawnByCommand({
        'coder-cmd': fakeAgentSpawn(agentStreamLines()),
        'verify-cmd': fakeMechanicalSpawn('ok\n', '')
      })
    })

    const state = await readRunCheckpoint(checkpointer, identity)
    const result = state?.results.implement
    expect(result?.kind).toBe('agent-spawn')
    if (result?.kind !== 'agent-spawn') throw new Error('unreachable')

    // Every record is a redacted string now, not the parsed object the reader
    // framed — and each planted literal is gone, replaced by the placeholder
    // naming what was taken rather than vanishing.
    const persisted = result.events.join(' ')
    expect(persisted).not.toContain(SECRET_PATH)
    expect(persisted).not.toContain(SECRET_TOKEN)
    expect(persisted).not.toContain(REAL_SESSION_ID)
    expect(persisted).toContain('[redacted:path]')
    expect(persisted).toContain('[redacted:credential]')
    expect(persisted).toContain('[redacted:session]')

    // Structure survives: the kind, the node id, the exit code and the duration
    // are what make the record readable as a result at all.
    expect(result.nodeId).toBe('implement')
    expect(result.exitCode).toBe(0)
    expect(typeof result.durationMs).toBe('number')

    // The narrowing says so, so a consumer can tell this from a quiet agent.
    expect(result.narrowing?.redactedFields).toEqual(['events', 'sessionId'])
    expect(result.narrowing?.originalEventCount).toBe(4)
    expect(result.narrowing?.originalLengths.events).toBeGreaterThan(0)
  })

  it('redacts a mechanical node raw stdout, stderr and resolved command', async () => {
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('narrow-mechanical-output')

    await startRun({
      plan: twoKindPlan(),
      config: config(undefined, {
        // An action resolved to an absolute path — the caller's own choice, and
        // the machine's filesystem layout all the same.
        mechanicalActions: { ...mechanicalActions, 'verify-action': { command: '/opt/local/bin/verify-cmd' } }
      }),
      checkpointer,
      identity,
      spawnFn: spawnByCommand({
        'coder-cmd': fakeAgentSpawn(agentStreamLines()),
        '/opt/local/bin/verify-cmd': fakeMechanicalSpawn(`wrote ${SECRET_PATH}\n`, `token=${SECRET_TOKEN}\n`)
      })
    })

    const state = await readRunCheckpoint(checkpointer, identity)
    const result = state?.results.verify
    expect(result?.kind).toBe('mechanical')
    if (result?.kind !== 'mechanical') throw new Error('unreachable')

    expect(result.stdout).not.toContain(SECRET_PATH)
    expect(result.stdout).toContain('[redacted:path]')
    expect(result.stderr).not.toContain(SECRET_TOKEN)
    expect(result.stderr).toContain('[redacted:credential]')
    expect(result.command).toBe('[redacted:path]')

    // The declared action name is the caller's own and is kept verbatim — it is
    // what still identifies the action once `command` has been redacted.
    expect(result.action).toBe('verify-action')
    expect(result.exitCode).toBe(0)
    expect(result.narrowing?.redactedFields).toEqual(['command', 'stdout', 'stderr'])
    expect(result.narrowing?.originalEventCount).toBe(0)
    expect(result.narrowing?.originalLengths.stdout).toBe(`wrote ${SECRET_PATH}\n`.length)
  })

  it('bounds an oversized field and an oversized stream rather than storing either whole', async () => {
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('narrow-bounds')
    const oversizedRecords = MAX_PERSISTED_EVENT_RECORDS + 20
    const oversizedStdout = 'x'.repeat(MAX_PERSISTED_TEXT_LENGTH * 3)

    await startRun({
      plan: twoKindPlan(),
      config: config(),
      checkpointer,
      identity,
      spawnFn: spawnByCommand({
        'coder-cmd': fakeAgentSpawn(agentStreamLines(oversizedRecords)),
        'verify-cmd': fakeMechanicalSpawn(oversizedStdout, '')
      })
    })

    const state = await readRunCheckpoint(checkpointer, identity)
    const agent = state?.results.implement
    if (agent?.kind !== 'agent-spawn') throw new Error('unreachable')
    const mechanical = state?.results.verify
    if (mechanical?.kind !== 'mechanical') throw new Error('unreachable')

    // The record count is a ceiling, and the count that was dropped is
    // recoverable — absence is reported, never silent.
    expect(agent.events).toHaveLength(MAX_PERSISTED_EVENT_RECORDS)
    expect(agent.narrowing?.originalEventCount).toBe(oversizedRecords + 4)

    // The tail is what is kept: the records carrying the run's own result are in
    // the persisted slice, the setup filler at the head is what went.
    expect(agent.events.join(' ')).toContain('[redacted:session]')

    // A single field is capped with an explicit marker, so a reader never
    // mistakes the excerpt for the whole.
    expect(mechanical.stdout.length).toBeLessThanOrEqual(MAX_PERSISTED_TEXT_LENGTH + '…[truncated]'.length)
    expect(mechanical.stdout.endsWith('…[truncated]')).toBe(true)
    expect(mechanical.narrowing?.originalLengths.stdout).toBe(oversizedStdout.length)
  })

  it('narrows the super-step recorded writes too, not only the channel values', async () => {
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('narrow-recorded-writes')

    await startRun({
      plan: twoKindPlan(),
      config: config(),
      checkpointer,
      identity,
      spawnFn: spawnByCommand({
        'coder-cmd': fakeAgentSpawn(agentStreamLines()),
        'verify-cmd': fakeMechanicalSpawn(`wrote ${SECRET_PATH}\n`, '')
      })
    })

    // This is the assertion a reducer-only narrowing would fail: the value here
    // is the one the node *returned*, recorded as that super-step's own write.
    const recorded = await recordedWriteFor(checkpointer, identity, 'verify')
    expect(recorded.kind).toBe('mechanical')
    if (recorded.kind !== 'mechanical') throw new Error('unreachable')
    expect(recorded.stdout).not.toContain(SECRET_PATH)
    expect(recorded.narrowing?.redactedFields).toContain('stdout')
  })

  it('leaves no planted path or credential anywhere in the checkpoint record', async () => {
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('narrow-whole-record')

    await startRun({
      plan: twoKindPlan(),
      config: config(),
      checkpointer,
      identity,
      spawnFn: spawnByCommand({
        'coder-cmd': fakeAgentSpawn(agentStreamLines()),
        'verify-cmd': fakeMechanicalSpawn(`wrote ${SECRET_PATH}\n`, `token=${SECRET_TOKEN}\n`)
      })
    })

    const record = await serializedCheckpointRecord(checkpointer, identity)
    expect(record).not.toContain(SECRET_PATH)
    expect(record).not.toContain(SECRET_TOKEN)

    // And the session id appears nowhere outside the one channel a resume reads
    // it from — which is why the scan strips that channel by name rather than
    // exempting the value.
    expect(record).not.toContain(REAL_SESSION_ID)
    const state = await readRunCheckpoint(checkpointer, identity)
    expect(state?.sessions.implement).toBe(REAL_SESSION_ID)
  })

  it('redacts the failed-task error a checkpointer persists beside the state', async () => {
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('narrow-failed-task-error')
    const failingPlan: Plan = {
      ...twoKindPlan(),
      graph: {
        nodes: { boom: mechanicalNode('boom', 'fail-action') },
        edges: [],
        conditionalEdges: [],
        entryNode: 'boom'
      }
    }

    const outcome = await startControlledRun({
      plan: failingPlan,
      config: config(),
      checkpointer,
      identity,
      spawnFn: spawnByCommand({ 'fail-cmd': fakeMechanicalSpawn('', `failed at ${SECRET_PATH}\n`, 1) })
    })

    expect(outcome.reason).toBe('failed')
    if (outcome.reason !== 'failed') throw new Error('unreachable')
    // The message names the node and its exit code — the diagnosis survives —
    // while the child's own stderr is a redacted excerpt rather than a raw one.
    expect(outcome.error).toContain("Mechanical node 'boom'")
    expect(outcome.error).not.toContain(SECRET_PATH)
    expect(outcome.error).toContain('[redacted:path]')
    expect(await serializedCheckpointRecord(checkpointer, identity)).not.toContain(SECRET_PATH)
  })

  it('redacts the resolved command in a failed mechanical node message, not only its stderr', async () => {
    // The combination that matters and that the stderr-only fix missed: an
    // action resolved to an absolute path AND that same node exiting non-zero.
    // On the success path `narrowPersistedResult` redacts
    // `MechanicalNodeResult.command`; a guarantee that held only when the
    // command succeeded would be no guarantee, because the failure path is the
    // one that writes a second, separately-built record to the same store.
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('narrow-failed-command-path')
    const commandPath = '/opt/local/bin/fail-cmd'
    const failingPlan: Plan = {
      ...twoKindPlan(),
      graph: {
        nodes: { boom: mechanicalNode('boom', 'fail-action') },
        edges: [],
        conditionalEdges: [],
        entryNode: 'boom'
      }
    }

    const outcome = await startControlledRun({
      plan: failingPlan,
      config: config(undefined, {
        mechanicalActions: { ...mechanicalActions, 'fail-action': { command: commandPath } }
      }),
      checkpointer,
      identity,
      spawnFn: spawnByCommand({ [commandPath]: fakeMechanicalSpawn('', 'nothing sensitive here\n', 1) })
    })

    expect(outcome.reason).toBe('failed')
    if (outcome.reason !== 'failed') throw new Error('unreachable')
    expect(outcome.error).not.toContain(commandPath)
    // The declared action name is the caller's own and survives, so the message
    // still says which action failed once the command is a placeholder.
    expect(outcome.error).toContain("action 'fail-action'")
    expect(outcome.error).toContain('[redacted:path]')
    expect(await serializedCheckpointRecord(checkpointer, identity)).not.toContain(commandPath)
  })

  it('redacts the resolved command when the child cannot be spawned at all', async () => {
    // A different failure path with the same carrier: nothing ran, so there is
    // no stderr to redact and the command is the whole of what the message
    // carries — plus Node's own `spawn /abs/path ENOENT`, which repeats it.
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('narrow-spawn-failure-path')
    const commandPath = '/opt/local/bin/missing-cmd'
    const failingPlan: Plan = {
      ...twoKindPlan(),
      graph: {
        nodes: { boom: mechanicalNode('boom', 'fail-action') },
        edges: [],
        conditionalEdges: [],
        entryNode: 'boom'
      }
    }

    const outcome = await startControlledRun({
      plan: failingPlan,
      config: config(undefined, {
        mechanicalActions: { ...mechanicalActions, 'fail-action': { command: commandPath } }
      }),
      checkpointer,
      identity,
      spawnFn: spawnByCommand({ [commandPath]: failingToSpawn(`spawn ${commandPath} ENOENT`) })
    })

    expect(outcome.reason).toBe('failed')
    if (outcome.reason !== 'failed') throw new Error('unreachable')
    expect(outcome.error).not.toContain(commandPath)
    expect(outcome.error).toContain('[redacted:path]')
    // The node id survives, so an operator still knows which step could not start.
    expect(outcome.error).toContain("node 'boom'")
    expect(await serializedCheckpointRecord(checkpointer, identity)).not.toContain(commandPath)
  })

  it('redacts the real paths in a working-directory confinement refusal', async () => {
    // The refusal fires before anything is spawned, and it is the message that
    // carries the most layout of any in the package: the declared directory, its
    // resolved realpath, and the configured root. All three are redacted; the
    // node id and the three positions stay, and the caller already holds the
    // declared directory and the root in its own Plan and config.
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('narrow-confinement-refusal')
    const outsideRoot = mkdtempSync(join(tmpdir(), 'agent-spawn-narrowing-outside-'))
    const escapingPlan: Plan = {
      ...twoKindPlan(),
      graph: {
        nodes: { stray: agentNode('stray', { workingDirectory: outsideRoot }) },
        edges: [],
        conditionalEdges: [],
        entryNode: 'stray'
      }
    }

    const outcome = await startControlledRun({
      plan: escapingPlan,
      config: config(),
      checkpointer,
      identity,
      spawnFn: spawnByCommand({ 'coder-cmd': fakeAgentSpawn(agentStreamLines()) })
    })

    expect(outcome.reason).toBe('failed')
    if (outcome.reason !== 'failed') throw new Error('unreachable')
    expect(outcome.error).not.toContain(outsideRoot)
    expect(outcome.error).not.toContain(workingDirectoryRoot)
    expect(outcome.error).toContain("Agent-spawn node 'stray'")
    expect(outcome.error).toContain('escapes the configured root')
    const record = await serializedCheckpointRecord(checkpointer, identity)
    expect(record).not.toContain(outsideRoot)
    expect(record).not.toContain(workingDirectoryRoot)
  })

  it('leaves the executor own capture verbatim, so a caller wanting the real stream still has one', async () => {
    // The narrowing belongs to what goes to rest, not to the capture: a caller
    // that needs the verbatim stream — to diff a file the agent wrote, to replay
    // a tool call — reads it here, and takes on the exposure knowingly.
    const captured = await executeAgentSpawnNode({
      node: agentNode('implement'),
      prompt: 'Do it',
      config: config(),
      spawnFn: fakeAgentSpawn(agentStreamLines())
    })
    expect(captured.narrowing).toBeUndefined()
    expect(captured.sessionId).toBe(REAL_SESSION_ID)
    expect(JSON.stringify(captured.events)).toContain(SECRET_PATH)

    const mechanical = await executeMechanicalNode({
      node: mechanicalNode('verify', 'verify-action'),
      config: config(),
      spawnFn: fakeMechanicalSpawn(`wrote ${SECRET_PATH}\n`, '')
    })
    expect(mechanical.narrowing).toBeUndefined()
    expect(mechanical.stdout).toContain(SECRET_PATH)
  })
})

describe('resuming from a narrowed checkpoint reaches the same outcome', () => {
  /**
   * The Plan the resume half runs, in both the interrupted and uninterrupted
   * cases: an agent step, a second agent step that `resume`s its session, a
   * mechanical step whose output a decision examines, and a final step the
   * decision routes to. Every consumer of the `results` channel is therefore
   * exercised — a prompt template reading a prior result, a caller's predicate
   * reading the examined result, a session lookup, and the outcome reader.
   */
  function fourStepPlan(): Plan {
    return {
      schemaVersion: '1.0',
      question: 'Ship it',
      model: 'n/a',
      agents: {},
      teamName: 'agent-lifecycle-narrowing-resume-test',
      maxRevisions: 0,
      graph: {
        nodes: {
          implement: agentNode('implement'),
          // Reads a prior node's recorded result through the Handlebars context,
          // which is the narrowed form after this change — so the rendered
          // prompt is part of what "the same outcome" has to cover.
          review: agentNode('review', {
            promptTemplate: 'Review exit {{results.implement.exitCode}}',
            agentRole: 'coder',
            resume: 'implement'
          }),
          verify: mechanicalNode('verify', 'verify-action', {
            examine: 'verify',
            ifTrue: 'report',
            ifFalse: 'report',
            maxRevisions: 1
          }),
          report: mechanicalNode('report', 'report-action')
        },
        edges: [
          { from: 'implement', to: 'review', kind: 'flow' },
          { from: 'review', to: 'verify', kind: 'flow' },
          { from: 'verify', to: 'report', kind: 'flow' }
        ],
        conditionalEdges: [],
        entryNode: 'implement'
      }
    }
  }

  /**
   * The predicate a caller supplies, reading the examined step's *narrowed*
   * result. Deliberately reads captured output and not only the exit code: a
   * predicate that only ever looked at `exitCode` would prove nothing about
   * whether narrowing changed what routing sees.
   */
  const decisionPredicates = {
    verify: (result: StepNodeResult) => result.kind === 'mechanical' && result.stdout.includes('verified')
  }

  function resumeConfig(onEvent?: (event: AgentLifecycleEvent) => void): AgentSpawnExecutorConfig {
    return config(onEvent, { decisionPredicates })
  }

  function resumeSpawns(log?: string[]): SpawnFn {
    return spawnByCommand(
      {
        'coder-cmd': fakeAgentSpawn(agentStreamLines()),
        'verify-cmd': fakeMechanicalSpawn(`verified ${SECRET_PATH}\n`, ''),
        'report-cmd': fakeMechanicalSpawn('reported\n', '')
      },
      log
    )
  }

  /** A comparable summary of everything a later node or the outcome reader depends on. */
  function comparable(results: Record<string, StepNodeResult>): unknown {
    return Object.fromEntries(
      Object.entries(results)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([nodeId, result]) => [
          nodeId,
          result.kind === 'agent-spawn'
            ? { kind: result.kind, exitCode: result.exitCode, events: result.events, narrowing: result.narrowing }
            : {
                kind: result.kind,
                action: result.action,
                command: result.command,
                exitCode: result.exitCode,
                stdout: result.stdout,
                stderr: result.stderr,
                narrowing: result.narrowing
              }
        ])
    )
  }

  it('reaches the same outcome, node results, sessions and counts as an uninterrupted run', async () => {
    const straightThrough = new MemorySaver()
    const straightIdentity = createRunIdentity('narrow-resume-straight')
    const straightOutcome = await startControlledRun({
      plan: fourStepPlan(),
      config: resumeConfig(),
      checkpointer: straightThrough,
      identity: straightIdentity,
      spawnFn: resumeSpawns()
    })
    expect(straightOutcome.reason).toBe('completed')

    const interrupted = new MemorySaver()
    const interruptedIdentity = createRunIdentity('narrow-resume-halted')
    const control = createRunControl()
    const paused = await startControlledRun({
      plan: fourStepPlan(),
      config: resumeConfig(haltAfter('review', control)),
      checkpointer: interrupted,
      identity: interruptedIdentity,
      control,
      spawnFn: resumeSpawns()
    })
    expect(paused.reason).toBe('paused')

    // Everything the second leg reads about the first is already narrowed — the
    // checkpoint it continues from holds no verbatim capture at all.
    expect(await serializedCheckpointRecord(interrupted, interruptedIdentity)).not.toContain(SECRET_PATH)

    const resumed = await resumeControlledRun({
      plan: fourStepPlan(),
      config: resumeConfig(),
      checkpointer: interrupted,
      identity: interruptedIdentity,
      spawnFn: resumeSpawns()
    })
    expect(resumed.reason).toBe('completed')

    const straightState = await readRunCheckpoint(straightThrough, straightIdentity)
    const resumedState = await readRunCheckpoint(interrupted, interruptedIdentity)

    // The same node results, field for field, including every narrowed field —
    // the halt/resume seam changed nothing a later node or a reader depends on.
    expect(comparable(resumedState?.results ?? {})).toEqual(comparable(straightState?.results ?? {}))
    expect(resumedState?.sessions).toEqual(straightState?.sessions ?? {})
    expect(resumedState?.revisionCounts).toEqual(straightState?.revisionCounts ?? {})
    expect(Object.keys(resumedState?.results ?? {}).sort()).toEqual(['implement', 'report', 'review', 'verify'])
  })

  it('routes the decision the same way on a narrowed result as on an unnarrowed one', async () => {
    // The predicate above reads `stdout`, which narrowing rewrote. The planted
    // path is gone from what it sees, and the content it actually keys on is
    // still there — so routing reaches `report` rather than the refused ceiling.
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('narrow-resume-routing')
    const control = createRunControl()

    await startControlledRun({
      plan: fourStepPlan(),
      config: resumeConfig(haltAfter('verify', control)),
      checkpointer,
      identity,
      control,
      spawnFn: resumeSpawns()
    })
    const examined = (await readRunCheckpoint(checkpointer, identity))?.results.verify
    if (examined?.kind !== 'mechanical') throw new Error('unreachable')
    expect(examined.stdout).not.toContain(SECRET_PATH)
    expect(decisionPredicates.verify(examined)).toBe(true)

    const resumed = await resumeControlledRun({
      plan: fourStepPlan(),
      config: resumeConfig(),
      checkpointer,
      identity,
      spawnFn: resumeSpawns()
    })
    expect(resumed.reason).toBe('completed')
    expect((await readRunCheckpoint(checkpointer, identity))?.results.report).toBeDefined()
  })

  it('still resumes a session across the seam, because that channel is never narrowed', async () => {
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('narrow-resume-session')
    const control = createRunControl()
    const resumeSessionIds: Array<string | undefined> = []

    await startControlledRun({
      plan: fourStepPlan(),
      config: resumeConfig(haltAfter('implement', control)),
      checkpointer,
      identity,
      control,
      spawnFn: resumeSpawns()
    })

    // The halted leg recorded the session id in `sessions`, verbatim, even though
    // the copy on the node's own result is redacted.
    const paused = await readRunCheckpoint(checkpointer, identity)
    expect(paused?.sessions.implement).toBe(REAL_SESSION_ID)
    const pausedResult = paused?.results.implement
    if (pausedResult?.kind !== 'agent-spawn') throw new Error('unreachable')
    expect(pausedResult.sessionId).toBe('[redacted:session]')

    // The resumed leg's `review` step declares `resume: 'implement'`, so its
    // `buildArgs` receives whatever the lookup found. It must be the real id —
    // a redacted one would be handed to the agent CLI as a session to continue.
    const resumed = await resumeControlledRun({
      plan: fourStepPlan(),
      config: config(undefined, {
        decisionPredicates,
        roleBinaries: {
          coder: {
            command: 'coder-cmd',
            buildArgs: ({ resumeSessionId }) => {
              resumeSessionIds.push(resumeSessionId)
              return []
            },
            allowedPermissions: ['default']
          }
        }
      }),
      checkpointer,
      identity,
      spawnFn: resumeSpawns()
    })

    expect(resumed.reason).toBe('completed')
    expect(resumeSessionIds).toEqual([REAL_SESSION_ID])
  })

  it('re-executes no completed node, with the narrowed checkpoint as the position it continues from', async () => {
    const checkpointer = new MemorySaver()
    const identity = createRunIdentity('narrow-resume-no-replay')
    const control = createRunControl()
    const firstLeg: string[] = []
    const secondLeg: string[] = []

    await startControlledRun({
      plan: fourStepPlan(),
      config: resumeConfig(haltAfter('review', control)),
      checkpointer,
      identity,
      control,
      spawnFn: resumeSpawns(firstLeg)
    })
    await resumeControlledRun({
      plan: fourStepPlan(),
      config: resumeConfig(),
      checkpointer,
      identity,
      spawnFn: resumeSpawns(secondLeg)
    })

    expect(firstLeg).toEqual(['coder-cmd', 'coder-cmd'])
    expect(secondLeg).toEqual(['verify-cmd', 'report-cmd'])
    expect((await readRunCheckpoint(checkpointer, identity))?.revisionCounts).toEqual({
      implement: 1,
      review: 1,
      verify: 1,
      report: 1
    })
  })
})
