/**
 * @file consumer.ts
 * @description The proof consumer. Copied verbatim into a throwaway project
 * outside this workspace, whose only view of `@atta/engine`,
 * `@atta/executor-agent-spawn` and `@atta/agents` is three installed tarballs
 * — no workspace link, no `paths` mapping, no TypeScript source.
 *
 * Every import below is a supported entry point of one of those three
 * packages. There is no import of `@atta/adapter-langgraph`: that package runs
 * the rounds shape, and section 9 below asserts it is not even installed.
 *
 * Nothing here duplicates implementation. The two spawn fakes are the
 * consumer's own test scaffolding against the package's declared injection
 * seam (`SpawnFn`), the same way any caller would substitute a process for a
 * test — they reimplement no executor logic, and the run is driven by the
 * packages' own exported operations throughout.
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compileFlow, loadStepsFlow, validateStepsFlow } from '@atta/engine'
import { MemorySaver } from '@langchain/langgraph'
import {
  type AgentLifecycleEvent,
  type AgentLifecycleNodeExecutor,
  type AgentSpawnExecutorConfig,
  buildAgentSpawnStateGraph,
  createRunControl,
  createRunIdentity,
  initialRunState,
  readRunCheckpoint,
  readRunOutcome,
  resumeControlledRun,
  type RoleBinaryArgsParams,
  runHaltOf,
  type SpawnedProcessLike,
  type SpawnFn,
  startControlledRun,
  startRun,
  threadIdForRun
} from '@atta/executor-agent-spawn'

const here = dirname(fileURLToPath(import.meta.url))
const workingDirectoryRootArg = process.argv[2]
if (!workingDirectoryRootArg) throw new Error('usage: consumer.ts <working-directory-root>')
const workingDirectoryRoot: string = workingDirectoryRootArg

let checks = 0
function check(label: string, passed: boolean): void {
  checks += 1
  if (!passed) throw new Error(`FAILED: ${label}`)
  process.stdout.write(`  ok ${checks} — ${label}\n`)
}

function section(title: string): void {
  process.stdout.write(`\n# ${title}\n`)
}

// ── Scaffolding: two fake children, against the package's own `SpawnFn` seam ──

interface SpawnLog {
  readonly commands: string[]
  readonly spawnFn: SpawnFn
}

/**
 * A child that prints one NDJSON record and exits cleanly. The record carries a
 * session id and an absolute machine path on purpose — section 8 reads both
 * back to see what the package redacted before an observer or a store saw them.
 */
function recordingSpawn(): SpawnLog {
  const commands: string[] = []
  const spawnFn: SpawnFn = (command) => {
    commands.push(command)
    const stdoutListeners: Array<(chunk: string) => void> = []
    const closeListeners: Array<(code: number | null) => void> = []
    const child: SpawnedProcessLike = {
      stdin: { write: () => {}, end: () => {} },
      stdout: { on: (_event, listener) => stdoutListeners.push(listener) },
      stderr: { on: () => {} },
      on: (event, listener) => {
        if (event === 'close') closeListeners.push(listener as (code: number | null) => void)
      },
      kill: () => {}
    }
    queueMicrotask(() => {
      const record = {
        type: 'result',
        session_id: `session-from-${command}`,
        cwd: '/Users/someone/secret-checkout',
        text: `${command} finished`
      }
      for (const listener of stdoutListeners) listener(`${JSON.stringify(record)}\n`)
      for (const listener of closeListeners) listener(0)
    })
    return child
  }
  return { commands, spawnFn }
}

/**
 * A child that never exits on its own — it closes only once it is signalled.
 * The shape a *mid-flight* cancellation has to stop, as opposed to a halt that
 * lands between two nodes.
 */
function killableSpawn(afterSpawn: () => void): { readonly signals: string[]; readonly spawnFn: SpawnFn } {
  const signals: string[] = []
  const spawnFn: SpawnFn = () => {
    const closeListeners: Array<(code: number | null) => void> = []
    const child: SpawnedProcessLike = {
      stdin: { write: () => {}, end: () => {} },
      stdout: { on: () => {} },
      stderr: { on: () => {} },
      on: (event, listener) => {
        if (event === 'close') closeListeners.push(listener as (code: number | null) => void)
      },
      kill: (signal) => {
        signals.push(signal ?? 'SIGTERM')
        for (const listener of closeListeners) listener(143)
      }
    }
    queueMicrotask(afterSpawn)
    return child
  }
  return { signals, spawnFn }
}

/**
 * The caller-owned half of the boundary: which binary a declared role resolves
 * to, which command a declared action resolves to, and which permission values
 * each role accepts. None of it is read from the Plan — the Plan names a role
 * and an action, and this consumer alone decides what they run.
 */
function executorConfig(
  seenArgs: RoleBinaryArgsParams[],
  onEvent?: (event: AgentLifecycleEvent) => void
): AgentSpawnExecutorConfig {
  const role = (command: string) => ({
    command,
    allowedPermissions: ['default'],
    buildArgs: (params: RoleBinaryArgsParams) => {
      seenArgs.push(params)
      return [
        '-p',
        '--max-turns',
        String(params.maxTurns),
        ...(params.resumeSessionId ? ['--resume', params.resumeSessionId] : [])
      ]
    }
  })
  return {
    workingDirectoryRoot,
    onEvent,
    roleBinaries: { coder: role('fake-coder'), reviewer: role('fake-reviewer') },
    mechanicalActions: { 'record-outcome': { command: 'fake-record', args: ['--quiet'] } }
  }
}

// ── 1. Compile a steps-shaped Flow, using nothing but supported exports ──────

section('1. A steps-shaped Flow compiles through the installed engine')

const yamlText = readFileSync(join(here, 'lifecycle.flow.yaml'), 'utf-8').replaceAll(
  '__WORKING_DIRECTORY__',
  workingDirectoryRoot
)
const flow = loadStepsFlow(yamlText)
validateStepsFlow(flow)
const plan = compileFlow(flow, 'Ship the packable-runtime proof')

check('loadStepsFlow returns the steps shape', flow.steps.length === 3 && flow.rounds === undefined)
check('compileFlow emits one node per step, entering at the first', plan.graph.entryNode === 'implement')
check('the agent step compiled as an agent-spawn node', plan.graph.nodes.implement?.kind === 'agent-spawn')
check('the mechanical step compiled as a mechanical node', plan.graph.nodes.record?.kind === 'mechanical')

// ── 2. Drive the graph with the consumer's OWN node executor ─────────────────

section('2. The consumer injects its own AgentLifecycleNodeExecutor')

const executedByInjected: string[] = []
const injectedExecutor: AgentLifecycleNodeExecutor = async (_state, { node }) => {
  executedByInjected.push(node.id)
  return {
    results: {
      [node.id]: {
        nodeId: node.id,
        kind: 'mechanical',
        action: 'consumer-injected',
        command: 'none',
        exitCode: 0,
        stdout: `${node.id} ran in the consumer's own executor`,
        stderr: '',
        durationMs: 0
      }
    }
  }
}

const injectedGraph = buildAgentSpawnStateGraph(plan, injectedExecutor, executorConfig([]))
const injectedState = await injectedGraph.invoke(initialRunState(createRunIdentity('external-injected-executor')))

check('every node ran through the injected executor', executedByInjected.join(',') === 'implement,review,record')
check('the compiled edges drove the order, not the consumer', Object.keys(injectedState.results).length === 3)
check(
  'the injected result is what graph state holds',
  injectedState.results.review?.kind === 'mechanical' && injectedState.results.review.action === 'consumer-injected'
)

// ── 3. A durable run, halted at a node boundary ──────────────────────────────

section('3. Durable start, live observation, halt at a node boundary')

const checkpointer = new MemorySaver()
const identity = createRunIdentity()
const control = createRunControl()
const events: AgentLifecycleEvent[] = []
const seenArgs: RoleBinaryArgsParams[] = []
const spawnLog = recordingSpawn()

const firstLeg = await startControlledRun({
  plan,
  checkpointer,
  identity,
  control,
  spawnFn: spawnLog.spawnFn,
  config: executorConfig(seenArgs, (event) => {
    events.push(event)
    if (event.type === 'node:complete' && event.nodeId === 'implement') control.halt('external proof pause')
  })
})

check('the halted leg reports a typed paused outcome', firstLeg.reason === 'paused')
check(
  'the halt names its own reason back',
  firstLeg.reason === 'paused' && firstLeg.haltReason === 'external proof pause'
)
check(
  'the node the halt refused is what the run still owes',
  firstLeg.reason === 'paused' && firstLeg.pendingNodes?.includes('review') === true
)
check('only the completed node ran', spawnLog.commands.join(',') === 'fake-coder')
check(
  'lifecycle events arrived, in order, correlated by run id',
  events[0]?.type === 'node:start' && events[0]?.runId === identity.runId
)
check(
  'the spawned process reported on a live stream',
  events.some((event) => event.type === 'node:streaming')
)
check('the Plan step’s own turn ceiling reached the binary', seenArgs[0]?.maxTurns === 2)

// ── 4. Inspect the suspended run from the store alone ────────────────────────

section('4. Inspection — the checkpoint the run left behind')

const suspended = await readRunCheckpoint(checkpointer, identity)

check(
  'the checkpoint is on the thread the run id derives',
  suspended?.identity.threadId === threadIdForRun(identity.runId)
)
check('the completed node’s result is durable', suspended?.results.implement?.exitCode === 0)
check('the node that never ran recorded nothing', suspended?.results.review === undefined)
check(
  'the session a later step resumes is recorded verbatim',
  suspended?.sessions.implement === 'session-from-fake-coder'
)

const pausedRecord = await readRunOutcome(checkpointer, identity)
check('the store alone says why the run is not executing', pausedRecord?.reason === 'paused')

// ── 5. Typed resume — same session state, no completed node run twice ────────

section('5. Resume continues the same run rather than replaying it')

const secondLeg = await resumeControlledRun({
  plan,
  checkpointer,
  identity,
  spawnFn: spawnLog.spawnFn,
  config: executorConfig(seenArgs)
})

check('the resumed leg reaches a typed completed outcome', secondLeg.reason === 'completed')
check('the outcome names the checkpoint it continued from', secondLeg.resumedFrom !== undefined)
check('the completed node did not run again', spawnLog.commands.filter((c) => c === 'fake-coder').length === 1)
check(
  'the resumed leg ran only the work still owed',
  spawnLog.commands.join(',') === 'fake-coder,fake-reviewer,fake-record'
)
check(
  'the resumed step received the prior step’s real session id',
  seenArgs.some((params) => params.resumeSessionId === 'session-from-fake-coder')
)
check(
  'the finished run’s own state carries every node’s result',
  secondLeg.reason === 'completed' && Object.keys(secondLeg.checkpoint.results).length === 3
)

const completedRecord = await readRunOutcome(checkpointer, identity)
check('the store answers completed once the run is over', completedRecord?.reason === 'completed')

// ── 6. Cancellation reaches a live child ─────────────────────────────────────

section('6. Cancellation terminates a node already running')

const cancelIdentity = createRunIdentity()
const cancelControl = createRunControl()
const killable = killableSpawn(() => cancelControl.halt('cancelled from outside'))

let cancelError: unknown
try {
  await startRun({
    plan,
    checkpointer: new MemorySaver(),
    identity: cancelIdentity,
    control: cancelControl,
    spawnFn: killable.spawnFn,
    config: executorConfig([])
  })
} catch (error) {
  cancelError = error
}

const halt = runHaltOf(cancelError)
check('a cancelled run throws a recognisable halt, not an opaque error', halt !== undefined)
check('the halt says it stopped a node that had already started', halt?.terminatedProcess === true)
check('the graceful signal was sent to the live child first', killable.signals[0] === 'SIGTERM')

// ── 7. Safety bound — an undeclared capability is refused, never guessed ─────

section('7. Bounds — the executor refuses what the consumer never declared')

const undeclaredSpawn = recordingSpawn()
const undeclared = await startControlledRun({
  plan,
  checkpointer: new MemorySaver(),
  identity: createRunIdentity(),
  spawnFn: undeclaredSpawn.spawnFn,
  config: { ...executorConfig([]), mechanicalActions: {} }
})

check('the run fails rather than guessing at an undeclared action', undeclared.reason === 'failed')
check('nothing was spawned for the undeclared action', !undeclaredSpawn.commands.includes('fake-record'))
check(
  'the failure names the action the Plan declared',
  undeclared.reason === 'failed' && undeclared.error.includes('record-outcome')
)

// ── 8. Redaction — what an observer and a store actually receive ─────────────

section('8. Observer text and persisted results are redacted and bounded')

const streamed = events.filter((event) => event.type === 'node:streaming')
check('a streamed event reached the observer at all', streamed.length > 0)
check(
  'the child’s absolute path never reached the observer verbatim',
  streamed.every(
    (event) => event.type !== 'node:streaming' || !event.content.includes('/Users/someone/secret-checkout')
  )
)
check(
  'the removal is named rather than silent',
  streamed.some((event) => event.type === 'node:streaming' && event.content.includes('[redacted:'))
)

const persisted = suspended?.results.implement
check('the persisted result says which fields it narrowed', (persisted?.narrowing?.redactedFields.length ?? 0) > 0)
check(
  'the persisted session id is not the verbatim one',
  persisted?.kind === 'agent-spawn' && persisted.sessionId !== 'session-from-fake-coder'
)

// ── 9. The rounds-shaped adapter is not part of this contract ────────────────

section('9. The rounds-shaped adapter is absent, not merely unimported')

const consumerModules = join(here, 'node_modules')
check(
  '@atta/engine is installed from a tarball',
  existsSync(join(consumerModules, '@atta', 'engine', 'dist', 'index.js'))
)
check(
  '@atta/executor-agent-spawn is installed from a tarball',
  existsSync(join(consumerModules, '@atta', 'executor-agent-spawn', 'dist', 'index.js'))
)
check(
  '@atta/agents is installed from a tarball',
  existsSync(join(consumerModules, '@atta', 'agents', 'dist', 'index.d.ts'))
)
check('no installed package ships TypeScript source', !existsSync(join(consumerModules, '@atta', 'engine', 'src')))
check(
  '@atta/adapter-langgraph is not installed at all',
  !existsSync(join(consumerModules, '@atta', 'adapter-langgraph'))
)

process.stdout.write(`\nexternal consumer: ${checks} checks passed\n`)
