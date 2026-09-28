---
name: atta-adapter-langgraph
description: LangGraph execution + cognitive router internals. Load when working in packages/adapter-langgraph — modifying graph execution, agent dispatch, tool filtering, classifier logic, cost tracking, state reducers, or debugging MAX_REVISIONS / latency issues. Do NOT load for pure Plan compilation (engine-layer) or team config (teams-layer).
---

# `@atta/adapter-langgraph` — Execution + Cognitive Router

## Context

The adapter takes compiled Plans from `@atta/engine` and executes them via LangGraph. LLM calls are dispatched through a multi-vendor call factory (`createMultiVendorLlmCall`) that handles Anthropic, Google (Gemini), and any OpenAI-compat vendor (GPT, Grok, Groq, Mistral, …). All calls go direct to vendor SDKs — no LangChain wrapper (it has a `top_p` bug we specifically avoid). The cognitive router lives here as internal nodes, NOT a separate package.

This is where Plans become real. Engine is pure; adapter is the runtime.

**This package only ever executes rounds-shaped Plans.** `PlanNode` is a discriminated union — an agent-bearing variant this package resolves against `Plan.agents`, and two step-node variants (`agent-spawn`, `mechanical`) that carry no `Plan.agents` entry at all, compiled from a `steps`-shaped Flow by a separate `agent-lifecycle` shape in `@atta/engine`. `adapter.ts`, `node-executor.ts`, and `graph-builder.ts` each carry a one-line compile-safety skip for those two kinds (matching each file's existing `__END__`-sentinel skip) purely so the type union checks — this package does not, and this tranche will not, execute either kind.

**The executor split.** Two packages, one shared contract: this package (`packages/adapter-langgraph`) runs every rounds-shaped Plan node — `solo-agent`, `parallel-peer`, `synthesizer`, `auditor`, `custom-step` — via LLM calls through the vendor SDKs above. `packages/executor-agent-spawn` runs the two step-node kinds of a `steps`-shaped (agent-lifecycle) Plan: `agent-spawn`, by spawning an external agent process (`claude -p`, `codex exec`, …) authenticated by its own already-logged-in subscription session — no vendor SDK, no `*_API_KEY`, anywhere in that package — and `mechanical`, below. Its `graph-builder.ts`/`graph-state.ts` are declared from scratch rather than extending this package's `buildStateGraph`/`VadaGraphState`, which are shaped for rounds (an `apiKey` param, a classifier injected before every tool-enabled node) that an agent-lifecycle Plan has none of. The two packages share exactly one thing — the `Plan` type from `@atta/engine`, read-only — and neither imports from the other.

**The `mechanical` node kind — no model turn at all.** A `mechanical` node performs an external action: it runs a command, records the outcome, and moves on. It has no prompt, no template, no session and no spawned agent, so `packages/executor-agent-spawn` gives it its own `mechanical-executor.ts` rather than a mode of `node-executor.ts` — routing it through the agent path with an empty prompt would still launch an agent CLI and could still cost a model turn, which is precisely what this kind is defined by not having. Four properties hold, and each is the thing that goes wrong if it doesn't:

- **The Plan declares an action *name*, never a command line.** `PlanMechanicalNode.action` is a name like `git-apply`; the caller's `AgentSpawnExecutorConfig.mechanicalActions` maps it to `{ command, args }`, exactly as `agentRole` maps through `roleBinaries`. An action the caller never declared is refused, not guessed at, and nothing is spawned. The command runs as an argv array with no shell and no Plan or graph state interpolated into it — the binding layer's own open question about command injection, answered by refusing both halves of it.
- **A non-zero exit throws by default.** Whether a given non-zero code means failure or something benign ("nothing to apply") is the action's business, declared by the caller as `successExitCodes`. Absent that declaration, a non-zero exit is a failure. Swallowing it produces a run that reports success having done nothing, which is this kind's most likely silent failure.
- **Output is kept verbatim, not parsed.** A mechanical command emits ordinary text, so `stdout`/`stderr` are recorded as strings. The NDJSON parsing an agent-spawn node does would reject them.
- **Captured output is template-visible, and is untrusted.** A node's recorded `stdout`/`stderr` land in `results`, which is the Handlebars context a later agent-spawn step's `promptTemplate` renders — with `noEscape`, verbatim. This was already true of an agent-spawn node's captured events; a mechanical node widens it to the output of an arbitrary external command. Anyone authoring a template that interpolates a prior result is interpolating untrusted text into a prompt: once a mechanical action's output can reflect externally-influenced content — a fetched branch name, an Issue title, a third party's commit message — it is a prompt-injection vector and must not be interpolated raw. No template in the package does this yet; the constraint binds whoever writes the first one.
- **The process is the shared lifecycle's, not a second one.** `mechanical-executor.ts` spawns through `process-lifecycle.ts`, the same state machine the agent-spawn path uses, so this kind gets the cancellation signal, the graceful-then-forced escalation and the first-settlement-wins timeout-versus-cancellation race from one implementation rather than two that can disagree. It owns only what is its own: the action-name resolution, the verbatim output capture, and the `successExitCodes` verdict. A second timeout/kill loop here was the earlier shape and it left a real gap — a halted run's `git`-shaped command kept running, holding this run's working directory and execution permissions, until its own `timeoutMs` elapsed. The one thing that differs is the vocabulary: a mechanical node has no agent and no role, so it passes its own `ProcessSubject` and its messages name it as `Mechanical node '<id>' (action '<action>')`.
- **The result goes through the state annotation's reducer, never into `state` directly.** Adding this kind widened `results` from `AgentSpawnNodeResult` to a `kind`-discriminated union and left the keyed-merge reducer alone — that reducer was already the right one for per-node writes, so no new field and no new reducer choice was introduced. A mechanical node writes `results` and `revisionCounts` and never `sessions`: it has no session for a later step's `resume` to look up.

A confirmation gate for an irreversible action is still *not* part of this kind, but the reason has changed: the suspension primitive it was waiting on now exists (see the control surface below), so what is missing is only the declaration — a Flow has no way to say "stop here and ask" and `PlanMechanicalNode` carries no field for it. A caller that wants a gate gets one today by halting the run at that node's boundary from outside and resuming after the decision; what it does not get is a Plan that asks on its own.

**`packages/executor-agent-spawn`'s own `node-executor.ts` is a composer, not a monolith.** It resolves a node's role/permission/working-directory and then composes two sibling files: `process-lifecycle.ts` (spawns the process and owns the timeout/kill/close-race that settles its exit) and `stream-reader.ts` (frames stdout into NDJSON records as they arrive, and accumulates stderr verbatim). `executeAgentSpawnNode`'s params carry two additional seams — an `onParsedEvents?: (events: unknown[]) => void` hook, deliberately named apart from `AgentSpawnExecutorConfig.onEvent` below (different shape, different lifecycle), stored on the stream-reader handle at attach time and read from that field at call time; and a `signal?: AbortSignal`, forwarded to the process lifecycle, which is where it acts. The composer was designed to absorb both without changing, and it changed for neither: both went live entirely inside the sibling file that owns the concern.

**Cancellation reaches the live child, and termination escalates on a deadline the child cannot influence.** `process-lifecycle.ts`'s `signal` is an ordinary `AbortSignal` — the shape the normative bounded-runner contract states for cancellation (`signal – AbortSignal for cancellation`, that runner's own run-options table) — so a caller already holding an `AbortController` passes it straight in rather than bridging two vocabularies. Five properties hold, and each is a real failure if it does not:

- **One state machine, armed at spawn time.** Every listener and timer the file owns is attached when the process is spawned, not when `waitForExit()` is first awaited, and the first settlement reached wins. That is what makes the timeout-versus-cancellation race decidable instead of dependent on callback scheduling order: a timeout that already rejected is not re-reported as a cancellation when the abort lands a tick later, and a cancellation in flight is not overwritten by the child's own exit code. It also closes a window per-call registration left open — a process that closed between `spawnProcessLifecycle` returning and `waitForExit()` being called had no `close` listener yet, so its exit was missed and the wait ran to the full timeout.
- **A signal already aborted on entry spawns nothing at all.** A caller's own halt boundary may have passed its check a tick earlier; starting a process only to signal it immediately would still run whatever that process does on startup. It throws the same cancellation error, flagged as one that never spawned.
- **Termination escalates: graceful signal, then forced signal on a bounded deadline.** `SIGTERM` first, so a child that handles it can flush its structured stream and exit cleanly; `SIGKILL` once `DEFAULT_GRACEFUL_TERMINATION_MS` has passed and it has not. Stopping at the graceful signal would leave a child that ignores it — an agent CLI with its own handler, a shell wrapper that swallows it — running after the run that owned it reported itself over, and the normative agent-control guidance is explicit that a long-running autonomous process needs stopping conditions "to maintain control"; a stopping condition a process can decline is not one. A cancellation and an elapsed timeout are two entries into that same escalation, which is why a timeout now has a forced fallback it did not have before. On the timeout path the escalation deliberately outlives the rejection: the caller already knows the step is over, and the escalation is what makes that true of the process too.
- **The wait settles whether or not the child ever closes.** Whichever comes first — the child's own `close`, or the forced-signal deadline — ends the wait, so a cancelled step is bounded by construction rather than by the child's cooperation. A child still alive after `SIGKILL` is unreachable from userspace, so it is marked abandoned rather than waited on further.
- **A cancelled run's outcome is typed, and distinct from both a timeout and an execution failure.** `ProcessCancelledError` and `ProcessTimedOutError` both extend `ProcessTerminatedError` and each names its own `reason` (`cancelled` / `timed-out`); an execution failure — a child that could not be spawned, or exited non-zero — stays an ordinary `Error` and is deliberately not a `ProcessTerminatedError` at all. There is no field common to the three meaning "the step did not finish", which is the same reason `RunOutcome` has no field meaning "it worked". `ProcessCancelledError.forced` says whether the forced signal was needed, because that is the one detail a caller may have to act on: a child that exited on the graceful signal had a chance to finish writing, and one that did not may have left something half-written.

**What the forced signal cannot reach, said out loud.** The signals go to the direct child and nothing else, so a child that spawned its own descendants — an agent CLI running a build, a shell running a pipeline — leaves those behind. Reaching them needs a process group or job object, which needs a real pid and `detached`-style spawn options: neither is representable through `SpawnedProcessLike` or `SpawnFn`, this package's injectable process seam, and that seam exists precisely so tests never spawn anything real. Widening it is a separate decision, not something to smuggle in behind a kill call.

**The graph wires it for both node kinds, and a halt therefore has two landing points rather than one.** `graph-builder.ts` forwards `control.signal` into `executeAgentSpawnNode` *and* into `executeMechanicalNode`, so a `RunControl` halt refuses a node that has not started *and* terminates the child of one already running — whichever kind that node is. Leaving that child alive was the earlier behaviour and it was the wrong default: a run the caller believed cancelled kept an agent process working, with the filesystem and execution permissions it was granted, until the node's own `timeoutMs` elapsed — ten minutes by default. Wiring only the agent-spawn half would have left exactly that gap on the kind whose whole purpose is to run a real `git`/`gh`-shaped command against the working directory. The counter-argument, that a child cut off mid-write leaves partial on-disk effects the run's recorded state does not describe, is real but was never an invariant this package actually held: the timeout path has always killed mid-write. So both costs are the caller's to weigh, and `RunHaltedError.terminatedProcess` is what lets it weigh them — `true` means inspect the working tree first; `false` means nothing was running and a resume is blind-safe, which covers the boundary refusal *and* the cancellation that arrived in the window before the spawn (`ProcessCancelledError.spawned` is `false` there, and the halt reports it honestly rather than claiming a kill it never performed).

**And it needs no sixth outcome reason.** A halt that terminated a child is still a halt: `graph-builder.ts`'s `haltOfTerminatedChild` re-reports the `ProcessCancelledError` as a `RunHaltedError` carrying it as `cause`, so `runHaltOf` recognises it by the same `instanceof` and the run reads `paused` exactly as a boundary halt does. Adding a `cancelled` reason to `RunOutcomeRecord` for it would have claimed the run stopped for some cause other than the caller's own `halt()`, which is untrue, and would have made every existing consumer of the five-reason vocabulary handle a case that is not new. The guard is `control.halted`, not the error type alone: a `ProcessCancelledError` from a run nobody halted came from a signal the caller wired into the node itself, and calling that a halt of *this* run would be a guess. One asymmetry is deliberate — a mid-flight halt *does* emit `node:failed`, where a boundary halt emits nothing, because that node genuinely started and genuinely did not complete.

**Structured output reaches an observer while the process is still running.** `stream-reader.ts` frames stdout inside its own `data` listener, and `onParsedEvents` fires once per record, in arrival order, the moment that record's line completes — not once at close with the whole array. Buffering until close and calling the result streaming was the original shape, and it is the defect the live path exists to remove: a run whose agent is thinking for minutes reported nothing at all until it had finished. Four framing properties hold, and each is a real corruption if it doesn't:

- **A partial trailing line is carried over, never parsed and never dropped.** A `data` chunk boundary falls wherever the OS pipe flushes, so the tail of a chunk is routinely half a record. It is held back until a newline terminates it — or until close, since a process may exit with no trailing newline, and that final line is the one record whose report is not live.
- **A chunk boundary inside a multi-byte character is held back too.** One `StringDecoder` spans the whole stream rather than a `toString()` per chunk, which would turn that character into `U+FFFD` in both halves — corrupting a record that was never malformed, the one framing failure a line-level carry-over cannot catch. Whatever the decoder still holds at close is flushed into the last line, so a process killed part-way through a character fails the run instead of reporting a truncated line that happens to parse. Every chunk goes that way, a `string` chunk included (the `stdout` listener's type permits either): a string framed directly, while the decoder still held the first bytes of a character, would splice the stream out of order and surface those bytes at close as a line of their own.
- **Each arriving character is scanned once.** The held-back partial line is kept as the pieces it arrived in and joined only when a newline completes it, so a chunk's own text is the only thing searched per chunk. Re-concatenating and re-splitting the whole accumulation per chunk instead is quadratic in the length of one long line, and the child chooses both that length and whether a newline ever arrives — the cost is paid synchronously inside the `data` listener, where it also holds off the process-lifecycle timeout that is the only guard against a runaway child.
- **One framer serves both entry points.** `attachStreamReader` feeds it chunk by chunk and `parseNdjson` feeds it a whole string; a second string-at-once parser beside it could disagree about a boundary, a blank line, or which line number a malformed record sits on, and only the incremental path is exercised by a real process.

Framing stops at `close`, and the records handed back are always a copy. A `data` event cannot legitimately follow `close`, but a child that outlives a kill signal can keep writing to a pipe nothing waits on any more, and reporting records for a node whose failure was already emitted is worse than dropping them — so the reader reads `close` (owning none of the lifecycle: it never starts, signals or waits on the process) and stops. The residual case is a child killed on the timeout — or on a cancellation request — that never closes at all, for which `close` never arrives: `process-lifecycle.ts` owns the kill, so it is the only place that knows the wait is over, and it says so by marking the child abandoned (`markProcessAbandoned`). The reader checks that mark per chunk, because abandonment happens mid-stream, which is the whole point of it. The mark is a process-local `WeakSet` keyed by the child object, not a second record of run state: the question it answers — is anything still listening to this pipe — is one only the process holding the child can ask and no checkpoint could answer. `finalizeEvents` returns a fresh array rather than the framer's own, because that array becomes `AgentSpawnNodeResult.events` and a consumer rewriting entries in place — what a redaction pass would do — would otherwise corrupt the reader's record of the stream.

A malformed line is recorded, not thrown, where it is found: throwing from inside a `data` listener would surface as an unhandled exception on the stream rather than a rejected `executeAgentSpawnNode`, so `finalizeEvents` raises it after close, naming the line and its position among the stream's non-empty lines. Records before the malformed one have already been reported; records after it are not. `safeEmitParsedEvents` swallowing an observer's own throw matters more now than it did at close-time, for the same reason.

**What reaches an observer of *this* hook is raw child output.** `onParsedEvents` hands over exactly what the spawned agent printed — its prompts, tool results, file contents it echoed, and any secret it printed along the way. The redaction pass described under the emission responsibility below does **not** cover it, and that is deliberate rather than an omission waiting to be closed: this hook exists to hand a caller the records themselves, one level below the lifecycle-event vocabulary, so a caller that wants the real stream has exactly one place to get it and takes on the exposure knowingly. An observer of this hook is an observer of an unredacted agent transcript. The lifecycle-event channel (`onEvent`) is the redacted one; see also the checkpoint-content warning below, which is the same material at rest.

**Execution carries an emission responsibility.** `createAgentLifecycleNodeExecutor`'s returned executor — the one function that already dispatches every node to `node-executor.ts` or `mechanical-executor.ts` — is also this package's single emission path: it calls the optional `AgentSpawnExecutorConfig.onEvent` around whichever branch it runs, in this order — `node:start`, then (agent-spawn only) one `node:streaming` per event the spawned process reported, then `node:complete`, or `node:failed` on any thrown error. These are the graph's own lifecycle events, emitted from `graph-builder.ts` after the node's execution has already returned: the `node:streaming` batch is replayed from the finished `result.events`, so it is not the live path. Live, per-record observation of a running process is the stream reader's `onParsedEvents` hook above — a different seam, one level down, with no `runId` on it. A caller wanting a flow diagram to move while an agent is still thinking watches that hook, not this one. Every event carries `runId` (from `AgentSpawnGraphStateValue.runId`, set once at graph start), so an observer can place an event within its enclosing run, not just against the bare node id. The event type (`AgentLifecycleEvent`, in `types.ts`) is deliberately shape-matched member-for-member to `FlowEvent`'s node-scoped variants in `packages/ui/engine-flow/events.ts` — the one event vocabulary this repo treats as authoritative for a flow diagram — but is not imported from there: this package stays a pure Node executor with no `@atta/ui` dependency, the same discipline `packages/adapter-langgraph` already keeps. A caller that already depends on both packages can pass `onEvent`'s values straight into a `FlowEventSource` with no mapping step, since every field here is a required version of an optional `FlowEvent` field.

**And every event it emits is redacted, at that one call site.** `graph-builder.ts`'s `safeEmit` is the single function every `AgentLifecycleEvent` passes through — the streaming path's per-record events, the failure and cancellation path's error text, and the lifecycle transitions around both — so the redaction pass is applied there and nowhere else. The placement *is* the guarantee: a new emission site added to that file inherits it without knowing it exists. Redaction spread across the emission paths instead is what produced the defect this closes — a spawned agent's raw output reached `onEvent` verbatim, carrying the machine's absolute paths, the agent session and account identifiers, the account's rate-limit metadata and an unbounded slice of the child's stderr, because no single place answered for what "sensitive" meant.

Three properties hold, and each is what goes wrong without it:

- **Structure survives; only process-authored free text is redacted.** `type`, `nodeId` and `runId` pass through untouched, so an observer can still tell which kind of event it received, which Plan step it belongs to and which run it correlates with. Only `node:streaming`'s `content` and `node:failed`'s `error` are rewritten. This is the split the normative tracing guidance draws — `RunConfig.traceIncludeSensitiveData` excludes a span's sensitive inputs and outputs while the span itself stays fully observable — and it is why `runId` is exempt despite being UUID-shaped: it is the correlation handle this package mints, not text a child leaked.
- **Each removal is named, and the excerpt is bounded.** A recognised value becomes `[redacted:path]`, `[redacted:session]`, `[redacted:rate-limit]` or `[redacted:credential]` rather than vanishing, so a reader knows what was taken as well as that something was; and the result is cut to `MAX_REDACTED_EXCERPT_LENGTH` with an explicit truncation marker, because nothing upstream bounds a tool result or a stderr capture — the child chooses both, and the normative tool-output guidance for an executor boundary is to bound the response by default and return only high-signal content.
- **The definition of sensitive is one function, usable off the event channel.** `redactSensitiveText` in `reason-text.ts` takes a string and returns a string, so any other channel with the same exposure reuses it rather than growing a second, drifting answer. `redactLifecycleEvent` is the thin event-kind mapper over it, and its `switch` is exhaustive against the event union — a new variant carrying a new text field does not compile until this pass says what happens to it. `reason-text.ts`'s other export, `sanitizeReasonText`, is **not** this: it makes a *caller-supplied* halt or abort reason safe to embed (control characters collapsed, length bounded) and deliberately leaves the caller's own content intact.

What the pass does not do: it is a floor, not a proof. It recognises the shapes this package has evidence for, and a spawned process can print a credential in a shape nothing matches — the bound is what keeps an unrecognised one from being reproduced in full. And the observer's copy is the only redacted one: the node's own recorded `result.events` keeps the stream verbatim, which is what the checkpoint-content warning below is about.

**The end-to-end proof.** `packages/executor-agent-spawn/src/agent-spawn-proof.fixture.ts` (a minimal `steps`-shaped Flow: one `agent-spawn` step, one `mechanical` step) and `packages/executor-agent-spawn/scripts/run-agent-spawn-proof.ts` (the runner) compose the whole chain for real: `compileFlow` → `buildAgentSpawnStateGraph` → `createAgentLifecycleNodeExecutor` with the real default `spawn`, against a real `claude -p` process authenticated by the invoking machine's own already-logged-in session — no fake `spawnFn`, no `*_API_KEY` anywhere in the process env the spawned agent sees. The runner asserts on event ordering (`node:start`/`node:complete` for the agent-spawn step strictly precede the mechanical step's, proving the compiled `flow` edge drove real sequencing, not just that both nodes eventually ran somehow) and on the final graph state (a real session id recorded, a real NDJSON stream captured, the mechanical step's exit code and verbatim stdout). It is not a `bun test` suite: a CI runner carries no logged-in `claude` session, so wiring a real spawn into the routine `turbo test` gate would either fail on every run or spend real API cost on every run — invoke it explicitly instead (`bun run packages/executor-agent-spawn/scripts/run-agent-spawn-proof.ts`, from a machine with `claude` logged in and on `PATH`). One nuance worth carrying forward: this package's own `DEFAULT_ENV_ALLOWLIST` (`PATH` + `HOME`) is enough for a config-file-backed login, but on a machine whose login is OS-Keychain-backed (macOS), that pair alone reproduces "Not logged in" — the Keychain lookup itself needs the OS user identity. The fix is entirely caller-side (`AgentSpawnExecutorConfig.envAllowlist`, already an override point): the runner passes `['PATH', 'HOME', 'USER']`, not a change to the package's own default. A sibling script, `run-agent-spawn-conditional-proof.ts`, proves the conditional-routing path below the same way — real spawns, no fakes.

**Conditional-edge routing on a step's declared `decision`.** `@atta/engine` compiles a step's `decision` (`examine`/`ifTrue`/`ifFalse`/`maxRevisions`) straight onto its `PlanAgentSpawnNode`/`PlanMechanicalNode` — never into `plan.graph.conditionalEdges`, which stays `[]` for this Plan shape and is a rounds-shape-only field this package never reads for routing purposes. For every node whose `plan.graph.nodes[nodeId].decision` is set, `buildAgentSpawnStateGraph` wires its outgoing edge with LangGraph's `addConditionalEdges` instead of a plain `addEdge` — that node's entry in `plan.graph.edges` (`compileSteps` still emits one regardless of `decision`) is deliberately skipped, so the decision is the node's only routing authority. The condition itself is never evaluated inline: the caller supplies `AgentSpawnExecutorConfig.decisionPredicates`, keyed by **the id of the step that declares the `decision`** (not by `examine` or either target) — the same keyed-by-Plan-carried-name resolution `roleBinaries`/`mechanicalActions` already use. Each predicate receives the examined step's own recorded result (`state.results[decision.examine]`, guaranteed present by the time the path function runs, since LangGraph merges a node's own result into state before routing its outgoing edge) and returns whether the positive (`ifTrue`) outcome applies.

The ceiling guards **whichever** target the predicate resolves to, `ifTrue` and `ifFalse` alike — not just `ifTrue`. `@atta/engine`'s validator only requires `ifTrue` to be strictly prior to the declaring step; `ifFalse` merely has to exist, so a flow can legally point it backward too, and a ceiling that only covered `ifTrue` would leave that path free to loop a real agent-spawn subprocess unboundedly (a real bug this task's own review caught — fixed before merge). A route is only taken while `state.revisionCounts[target] <= decision.maxRevisions`; once it's exceeded, routing goes to a terminal outcome rather than looping again — a synthetic per-branch recorder node that writes the refused ceiling into the run's `outcome` channel and then goes to `END`. **The comparison is `>`, not `>=`, deliberately:** a target reached via `ifTrue` has already executed once *before* the declaring decision's first evaluation (validator-required to be strictly prior), and that pre-existing execution is the original attempt, not a revision — `maxRevisions` counts loop-*backs*. An off-by-one here (`>=`) would make `maxRevisions: 1` permit zero loop-backs, indistinguishable from "never revise". Exhaustion is a graph terminal, but no longer a *silent* one: before the recorder nodes existed, routing went straight to `END`, which made an exhausted run byte-identical to one that ran to its last step — so the only way to tell them apart afterwards was to re-read the ceilings off the final state, a derivation that is unsound (a target's revision count can exceed some *other* decision's ceiling long after that decision last evaluated, reporting exhaustion for runs that ended for unrelated reasons). The path function is the one place the fact is known for certain, and a node is the only thing downstream of a path function that can write state, which is why the record is written there. There are two recorders per decision node, one per branch, because a path function can only return a route name: the branch has to be encoded in the route for the recorder to know which target's ceiling was refused, and with both branches able to point backwards a single shared recorder's guess would sometimes be ambiguous. Each recorder wires straight to `END`, and nothing else in the graph writes `completed`, so there is nothing that could overwrite a recorded ceiling with a success the run did not have — see the write-placement rule below for why an earlier in-graph completion recorder could, and did. Two failure shapes are refused identically, mirroring `executeMechanicalNode`'s undeclared-action refusal: a node that declares a `decision` with no matching `decisionPredicates` entry, and a predicate that throws while evaluating — neither ever defaults silently to `ifTrue` or `ifFalse`; both throw a clear, named error and additionally emit it as a `node:failed` event (this package's existing event shape, reused rather than adding a new variant — the failure is still "this node's run did not complete successfully", just discovered after that node's own action already succeeded). `buildAgentSpawnStateGraph` also checks, at build time, that both `decision.ifTrue` and `decision.ifFalse` name real nodes in the Plan's graph — a hand-constructed `Plan` (or a future source that skips the Flow validator) gets a clear, named error naming the offending id rather than an opaque LangGraph failure the first time that route is taken. Because `ifTrue` (or a backward `ifFalse`) can route back to an earlier node, `buildAgentSpawnStateGraph` never assumes the graph is acyclic; a revised step re-enters the same node id via LangGraph's native cycle support.

**Fan-out and join on a step's `dependsOn` — unconditional topology, kept visibly separate from the conditional-edge routing above.** `@atta/engine`'s `compileSteps` compiles a step's `dependsOn` into one `PlanEdge` per dependency: a step several others each name as their sole dependency produces several edges sharing one `from` (fan-out), and a step naming several dependencies produces several edges sharing one `to` (join). Neither needs any code of its own in `buildAgentSpawnStateGraph` beyond the edge-replay loop that already exists — it calls `addEdge` once per `plan.graph.edges` entry, so fan-out (several `addEdge` calls from the same node) and join (several `addEdge` calls into the same node) both fall straight out of it. The join itself is LangGraph's own native behavior, not something this package re-implements: a node with multiple declared incoming edges runs exactly once, only after every one of them has fired in that traversal — the same Pregel-derived semantics the conditional-routing subsection above relies on for cycles. Fan-out/join is pure topology wiring, never a condition evaluation, so it stays a distinct mechanism from `addConditionalEdges` even though both live in the same edge-replay code path.

**Fail-the-join.** A branch failing must fail the whole join — a missing verdict must never read as a pass. This needs no new state: a branch node's own failure already throws inside `createAgentLifecycleNodeExecutor`'s `catch` block, which rejects the whole `graph.compile().invoke()` call before the join node's turn can ever come up in the traversal. The join's result is simply never recorded in `state.results` — there is no `kind: 'failed'` result variant, no scheduler-side tracking of in-flight siblings, and no cancellation of a sibling branch still mid-flight when another one fails (an orphaned sibling promise settles on its own later, writing into a `state` object nothing is reading anymore — inert, not a bug). `graph-builder.test.ts`'s `'buildAgentSpawnStateGraph — fan-out and join topology'` suite proves both properties for real: concurrent branch execution via interleaved `node:start`/`node:complete` events (not wall-clock timing), the join node's own executor invoked exactly once only after both branches complete, and a branch failure rejecting `invoke()` with the join never starting — even when the other branch had already succeeded first.

**Durable checkpointing is injected, never owned.** `buildAgentSpawnStateGraph` takes an optional fourth argument, `AgentSpawnGraphCompileOptions`, whose only field today is `checkpointer` — a `BaseCheckpointSaver` the *caller* supplies, handed straight to `graph.compile()`. Supplying one turns on LangGraph's own per-superstep checkpoint write, so the whole annotated state (`runId`, `results`, `sessions`, `revisionCounts`, `outcome`) is persisted at each node boundary; omitting it compiles the same topology with no writes and no `thread_id` required at `invoke()` time, which is why every pre-existing caller — the three `scripts/` proofs and the `graph-builder.test.ts` suites — kept working unchanged when the seam was added. Durability is therefore exactly as good as the saver passed in: `MemorySaver` does not outlive the process, a SQLite/Postgres saver does, and `packages/executor-agent-spawn` deliberately does not make that choice on the caller's behalf. Kept separate from `AgentSpawnExecutorConfig` on purpose — that object configures what the *nodes* do (which binary a role resolves to, which command an action resolves to, how a decision is evaluated); this one configures how the *graph* is compiled.

**There is no second persistence store beside LangGraph, by construction.** `run-identity.ts` holds no map, writes no file and keeps no registry of live runs: `startRun` hands the caller's checkpointer to the graph builder, and `readRunCheckpoint` asks that same checkpointer for a tuple. This is the property to defend in any future change here — a parallel record of run state, however convenient, can disagree with the checkpoint, and then something has to decide which one is true.

**A checkpoint holds unredacted node output — say this out loud to anyone choosing a saver.** No new channel was added for durability, but the state that gets persisted was never compact to begin with: `results` carries `AgentSpawnNodeResult.events` (the spawned agent CLI's complete structured stream — its prompts, its tool results, file contents it read and echoed) and `MechanicalNodeResult.stdout`/`stderr` (raw `git`/`gh`-style output, kept verbatim). Turning a checkpointer on moves all of that from process memory to rest: unredacted, with no size bound, and re-serialized in full at every superstep, so a long run's writes grow with everything already accumulated. The executor's `envAllowlist` keeps secrets from reaching a spawned process, but nothing keeps a spawned process from *printing* one — a token inside a remote URL, an error body, a credential an agent read aloud — and with a checkpointer that print is now durable. Redacting the event channel changed none of this, deliberately: it rewrites the observer's copy of an event and never the `results` the graph records, because a caller that asked for the real stream — to diff a file the agent wrote, to replay a tool call — would otherwise get an excerpt and no way back to the original. What it did leave behind is the piece a narrowing pass needs: `redactSensitiveText` is a standalone definition of sensitive text, usable on state as readily as on an event, so narrowing the checkpoint is now a decision about *what to persist* rather than an open question about what "sensitive" means. Until that decision is made and shipped, a store holding these checkpoints should be treated as holding agent-transcript-grade material, and its retention, encryption and access chosen on that basis.

**And `results` is not the only carrier.** The `outcome` channel is checkpointed beside it, and LangGraph separately persists a failed task's serialized error as a pending write on the thread — whose `message` is surfaced verbatim as `RunFailedOutcome.error` and as `readRunOutcome`'s `error`/`detail`. That message is not a summary: a failed mechanical node's error embeds the command's raw `stderr`, capped at two thousand characters and not redacted, and a failed agent-spawn node's embeds its own. So a run that broke leaves a slice of subprocess output in a second place, reachable by a caller that reads only the outcome and never the state — the same retention and access choices govern all of it, and a consumer that logs or renders an outcome's `error` is rendering that output.

**Run identity: one value, two ids, neither independent.** `RunIdentity` pairs the `runId` that correlates every `AgentLifecycleEvent` a run emits with the `thread_id` every checkpoint that run writes is keyed by. The second is not stored data — it is `threadIdForRun(runId)`, a pure, namespaced (`agent-spawn-run:<runId>`) function of the first, and `threadIdForRun` is the only place in the package that produces a thread id. That single-producer discipline is the whole point: split across call sites, one caller generating a `runId` for the initial state, another writing `configurable.thread_id` by hand at `invoke()` time, and a third reconstructing a thread id to read a checkpoint only have to disagree once for a run's durable state to become unreachable while still existing.

Because the derivation is pure, identity survives a process restart with nothing persisted but the `runId` string: `runIdentityForRunId(runId)` rebuilds the complete identity in a fresh process, and the checkpointer resolves the same thread the dead process wrote. `createRunIdentity` mints a v4 UUID by default but accepts a caller-owned id, so a consumer that already has a run identifier it must correlate against (an Issue number, a dispatch id, its own primary key) uses that one rather than maintaining a mapping between two.

**Every rejection at that single producer is a collision, not a style rule.** An empty or whitespace-only run id would derive the *same* thread for every such run, so they would silently read and overwrite each other's checkpoints — the one identity failure that yields plausible wrong state instead of an honest missing-state error. A run id outside `[A-Za-z0-9._-]`, or longer than the length cap, is refused for a related reason: the id is interpolated into a key handed to a saver this package cannot see inside, where a path separator can push a file-backed store outside its directory and a column-backed one can truncate two distinct ids onto one thread. `:` is excluded specifically because it is the namespace separator, so allowing it would make a derived thread id ambiguous to read even though the derivation stays injective.

**The single-producer rule is enforced, not merely documented.** `RunIdentity` is a plain interface, so a caller can hand-assemble one whose `threadId` does not match its `runId` — which would file this run's checkpoints on another run's thread and leave *that* run's state unreadable, since its own `runId` cross-check would then fail. Structural typing cannot prevent this, so `startRun` and `readRunCheckpoint` both re-derive the thread id and refuse a mismatch. That re-derivation is also what closes the bypass the rejections above would otherwise have: an identity built by hand never passed through `threadIdForRun` at all.

`startRun` is the entry point that makes the contract unskippable: it mints or accepts the identity, compiles the Plan against the caller's checkpointer, invokes the graph bound to that identity's thread, and returns the identity alongside the final state. Its `checkpointer` is required where the graph builder's is optional — a run routed through this function is by definition one whose state is meant to outlive the call. It also forwards an optional `recursionLimit`, because it now owns the invocation config that a direct `buildAgentSpawnStateGraph` caller used to construct itself, and a `decision`-bearing Plan that loops legally can exceed LangGraph's default ceiling.

**The identity is surfaced before the run, not only after it.** `StartRunResult` materialises only on success, so a run that fails under a *minted* id would otherwise lose the only handle to checkpoints it had already written — and a failed run is exactly the suspended run someone wants to inspect. So the identity is reported to an optional `onIdentity` callback before the graph is invoked, and attached to any thrown `Error`, recoverable with `runIdentityOf(error)`. The callback is the reliable half (it fires while the run is in flight and covers a throw that is not an `Error`); the attachment is the ergonomic half.

**A thread that already holds a checkpoint is refused, never restarted.** `startRun` always invokes from the Plan's entry node, so a second run under one identity would re-execute completed steps — spawning their subprocesses again — while the keyed-merge reducers preserved the earlier attempt's entries for every node the retry never reached. The checkpoint would then hold two attempts blended into one run's state with nothing marking the seam, and `revisionCounts` would be worse than stale: the executor increments from the checkpointed value, so a `decision`-bearing Plan could exhaust its `maxRevisions` ceiling on the retry's first step. Refusing is not a resume implementation — resuming belongs to the control-operation work — it is declining to corrupt state this seam is responsible for. A caller wanting a new run mints a new identity; one wanting the old run's state calls `readRunCheckpoint`.

**Reading a suspended run back.** `readRunCheckpoint(checkpointer, identity)` returns the run's persisted state — the checkpoint's own id and timestamp plus the three keyed channels — using nothing but the checkpointer and the identity, with no replay of the run. An identity the checkpointer has never seen returns `undefined`, which is an answer and not an error: the caller asked whether state exists. Absent or non-object channels read as the empty record, because a run suspended before any node completed legitimately has empty `results`.

Two shapes of corruption are refused instead of read, and both are the same mistake in different clothing. A checkpoint on this thread recording a *different* `runId` can only come from a colliding key, and returning its channels as this run's would be a silent misinterpretation of durable state. An *entry* that is not a value this package could have written is refused the same way: the channels are deserialized from a store that may be shared with other writers or have been tampered with, so every entry is validated (a result must carry one of the two known `kind`s plus a `nodeId` and `exitCode`, a session id must be a non-empty string, a revision count a non-negative integer) rather than cast on faith — an unvalidated cast would let a fabricated `exitCode: 0` be narrowed and then trusted as a recorded outcome. An unrecognised entry throws naming its channel and key; it is never dropped, since silently omitting one would report a node as never having run, which is the same misreading inverted. `results` itself comes back exactly as the graph recorded it, captured subprocess output and agent event streams included — see the checkpoint-content warning above for what that means for the store holding it.

A structured external halt, a typed resume, and the persisted vocabulary for a run's outcome are **not** in `run-identity.ts` — `readRunCheckpoint` is a read, and nothing in that file interrupts, cancels or restarts anything. They are the control surface below, built on the identity above.

**The control surface: three operations, and a typed reason a leg stopped.** `run-halt.ts` and `run-control.ts` are where a caller starts, halts and resumes a run. `startRun` remains the raw substrate entry point, but not unchanged: it gained an optional `control` so a run started there can be halted at all, and it now records `completed` for a run that reaches a terminal node. It still resolves on success and rejects on everything else, so a halt, a broken node and an exhausted revision ceiling arrive as three different facts down two undifferentiated channels — telling them apart is what the typed operations add. `startControlledRun` and `resumeControlledRun` return a `RunOutcome` discriminated on `reason` instead, and that is the whole point: there is no field common to the variants that means "it worked", so a caller cannot treat an exhausted or failed run as a completed one without naming the reason it is accepting. The shape follows the bounded-runner contract it is modelled on, which both throws an explicit typed non-success when a ceiling is reached and offers handlers that convert exactly those bounded failures into a returned result for a caller that would rather branch than catch.

**A halt stops the run between nodes, and that is what makes it resumable.** `createRunControl()` returns a handle whose `signal` is an ordinary `AbortSignal` — the cancellation input shape a bounded agent runner already takes, so a caller holding an `AbortController` for the surrounding request passes it straight in as an upstream signal (linked one way: aborting it halts the run, halting the run never aborts it). The enforcement point is the node wrapper in `graph-builder.ts`, checked ahead of `node:start` and ahead of either executor: a halted run's next node emits no event, spawns no process and records no result. It throws `RunHaltedError` rather than returning, because throwing is what leaves that node *pending* on the thread, which is exactly the position a resume continues from; returning would let LangGraph route onward as though the node had run. Nothing about the compiled topology changes for a halt — the property it needs is already LangGraph's per-superstep checkpoint. A halt is deliberately **not** process-level cancellation of a live spawned child: that is `process-lifecycle.ts`'s own `signal` seam, described below, and killing a child mid-write would leave the run's recorded state saying the node never completed while its effects on disk said otherwise. The two are complementary, not alternatives: `graph-builder.ts` hands `RunControl.signal` down into the composer, so a halt reaching a *started* node stops it by killing its child, while a halt reaching an unstarted one refuses it outright. Both leave that node pending and both report `paused`; what differs is only what the node left behind on disk. Telling a halt apart from a failure at the other end takes more than one `instanceof`: the halt reaches the caller through `invoke()`'s rejection, so `runHaltOf` walks a wrapper's `cause` chain *and* an `AggregateError`'s `errors` array — LangGraph raises the latter when several tasks fail in one superstep, which is exactly what a halted fan-out produces, every parallel branch's boundary refusing at once. An aggregate counts as a halt only if every error inside it is one; a superstep where one branch was halted and another genuinely broke is a failed run, because the failure is the fact the caller must act on and calling it a pause invites a resume straight back into the broken node.

**Resume continues the thread; it never replays a transcript.** `resumeControlledRun` invokes the same graph with a `null` input, which is how LangGraph continues a thread's pending tasks rather than re-driving it from the entry node. Every completed node keeps its recorded result and is not called again — proven by counting spawns per node across the halt/resume seam, not asserted. This is the property that matters most in this package: these nodes spawn real agent processes and run real `git`-shaped commands, so a resume that rebuilt a prompt history and re-drove the graph would re-perform completed side effects that no prompt reconstruction can undo. Two shapes are refused rather than guessed at, and together they make a resume's precondition the exact mirror of a start's: a thread with no checkpoint has no position to continue from, and a thread with nothing pending already reached a terminal node. The Plan is the caller's obligation — a checkpoint stores state, never the Plan — so `resumeControlledRun` cannot verify it is the original; it does refuse a Plan missing a node this run already recorded a result for, which catches the substituted-Plan mistake without pretending to catch every subtly wrong one.

**Where each record is written, and why the two places differ.** Two facts a node genuinely holds are written from inside one: `resumed`, by the node executor on a resumed leg's first node, and `exhausted`, by the per-branch recorder a refused ceiling routes to. Both are ordinary superstep commits. `completed` is not a fact any node holds — "this run is over" means `END` was reached with nothing left pending, which no node can observe about itself and only the caller of `invoke()` sees. It is therefore written once, after `invoke()` resolves and only when no exhaustion was recorded, by `persistCompletedRecord` — which lives in `run-identity.ts` rather than beside the control operations because **both** start paths need it. A run finished through the raw `startRun` would otherwise persist no outcome at all, and `readRunOutcome` would answer `undefined` — which it defines as "no outcome yet" — leaving an operator unable to tell a finished run from one still executing. `paused` and `failed` are not written at all: LangGraph already persists a failed task's serialized error for the thread, so duplicating it would be the second disagreeing record the identity contract exists to rule out.

**That split is the fix for two real defects, not a preference.** An earlier revision did record `completed` in-graph, with one shared recorder every terminal step routed through, and it was wrong twice over. First, the recorder was added unconditionally but wired only from plain terminal steps, so a Plan whose *only* terminal step declares a decision — legal, since both of a decision's targets may point backwards — left it with no incoming edge and LangGraph refused the graph as unreachable; that Plan shape could no longer be started, halted or resumed at all, where it had compiled and run before. Second, in a fan-out where one branch loops through a decision while a sibling reaches a terminal step, the recorder is re-entered on every pass: its `completed` write landed beside the exhaustion record and, under last-write-wins, sometimes after it — reporting an exhausted run as a successful one, the exact misreading the vocabulary exists to prevent. It also committed `completed` mid-flight, while the looping branch was still executing, so a store read answered `completed` for a run with pending nodes.

**The out-of-graph write is safe only because it lands on a finished thread, and it names its writer node explicitly.** `graph.updateState` is unusable on a thread that still has a pending continuation — which is what a paused or failed run leaves. Measured on the pinned LangGraph: with the writer node inferred, a second such update in a thread's lifetime fails outright (`Ambiguous update, specify "asNode"`), and naming `asNode` there is *worse* than failing, because the update is applied as that node and the pending set is recomputed from its outgoing edges — a run halted before node C, updated as node B, resumes with C already routed past and never executed. On a finished thread none of that bites, but inference still fails once the thread's lineage includes a resumed leg, so the write names `asNode` deliberately: a terminal Plan step, whose only outgoing edge is `END`, so the recomputed pending set is empty. `terminalPlanNodeIds` in `graph-builder.ts` is the single producer of that answer, shared with the wiring loop so the two cannot drift, and `persistCompletedRecord` refuses rather than guessing if the thread still has pending nodes or the Plan has no terminal step at all.

**The `outcome` reducer gives a terminal reason precedence, so nothing depends on task order.** `resumed` and `exhausted` are both in-graph writers, and they can land in the same superstep — a resumed leg whose pending set holds an exhaustion recorder alongside a Plan node. Which one survived under a plain last-write-wins reducer would then depend on LangGraph's undocumented task-application order; node insertion order happens to favour the recorder today, but if that ever reversed the ceiling would be erased and the run would read `resumed`, then `completed` once the leg finished. `mergeOutcome` in `graph-state.ts` refuses to replace a recorded `exhausted`, and also treats a write carrying no `outcome` key as no write at all — every node that is not a recorder returns none, and a bare last-write-wins reducer would read those as a clearing write.

**One leg at a time is the caller's obligation, and nothing here can enforce it.** Both operations are read-then-act: `startControlledRun` checks the thread holds no checkpoint, `resumeControlledRun` reads the checkpoint and the pending set, and each then invokes. Two concurrent resumes of one `runId` therefore both pass their preconditions and both execute the same pending node — running an agent CLI or a `git`-shaped command twice against one working directory, the same class of damage the no-replay property exists to prevent, arriving by a different route. It is not fixable inside this package: an atomic claim needs a lease primitive `BaseCheckpointSaver` does not have, and inventing one would be the second store beside the checkpointer this package refuses to keep. So it belongs with the saver choice and the redaction exposure as a stated caller obligation — **serialise legs of one run yourself**, with one process, one queue, or a lock keyed by `runId`. A caller that cannot is choosing the duplicate execution, not being surprised by it.

**`readRunOutcome(checkpointer, identity)` is the observable half.** It answers "why is this run not executing" from the store and the run id alone — no Plan, no compiled graph, no replay — because that question belongs to whoever holds the store (a dashboard, a later process, an operator deciding whether to resume), not only to whoever called the operation that ended the leg. It composes the two sources in one order that is not arbitrary: a failed task LangGraph persisted is the most recent thing that happened, so it wins (`paused` for this package's own halt, `failed` otherwise); only when no task failed does the in-graph record speak, and then it is the whole answer (`completed`, `exhausted`, or `resumed` for a continuation still under way). Reading the record first would report a run as `resumed` or `completed` when a later leg had in fact broken on its very next node. An `outcome` value this package could not have written is refused by name rather than returned, the same way a checkpointed channel entry is — reporting a recorded run as unrecorded is the same misreading inverted, and the `exhausted` variant's payload is validated field by field because `typeof x === 'object'` is also true of `null` and of an array.

Two further refusals belong to this read specifically. It cross-checks the checkpoint's own `runId` exactly as `readRunCheckpoint` does — the two read the same tuple, and a thread holding another run's state can only come from a colliding key, so without the check an operator deciding whether to resume could be handed a terminal state belonging to someone else's run. And it reads *every* `__error__` write on the thread, not the first: LangGraph records one per failed task, so a superstep mixing a halt with a genuine break would otherwise report `paused` whenever the halt's write came first. A run counts as halted only if every one of those errors is a halt — the same rule `runHaltOf` applies to an in-memory aggregate, and refused for the same reason, since a pause invites a resume straight back into the broken node.

Recognising a halt from the store is necessarily weaker than recognising one in memory, and is written to be as strong as it can be. A store keeps only a failed task's `name` and `message`, so `instanceof` is unavailable; matching the name alone was too weak, because caller code runs inside this graph — a `decisionPredicate`, a `buildArgs`, a `spawnFn` — and any of it can throw an error it named `RunHaltedError`, which would read back as a deliberate pause. `describesRunHalt` therefore requires the message shape as well. That closes the accident; it does not close deliberate forgery by something with write access to the store, and cannot — at that point the store is lying about the run's state generally, which is the trust boundary the checkpoint-content warning above already draws.

**The returned `error` and the stored one must agree.** A superstep with two or more failed tasks rejects `invoke()` with an `AggregateError` whose own message is only `Multiple errors occurred during superstep N. See the "errors" field of this exception for more details.` — it names no node and carries no cause, so taking `RunFailedOutcome.error` from it left the operation's return value and the store disagreeing about the same fact, with the store holding the useful half. `failureMessageOf` in `run-halt.ts` digs out the first non-halt error's own message instead: a superstep mixing a halt with a genuine break is a failed run, and the break is the fact the caller has to act on.

**The run-control conformance matrix.** Every lifecycle behaviour above exists because an external contract makes it normative, not because this repository picked an orchestration convention. `packages/executor-agent-spawn/src/run-conformance.test.ts` holds one assertion per row, quoting its source rather than summarising it, and is deliberately separate from the behavioural suites: a behavioural test fails when the code breaks, a conformance assertion fails when the code drifts from the contract it was modelled on. Neither source describes a LangGraph executor, so no row claims API equivalence — each pins the *property* the source makes normative, in this package's own terms.

Sources: [OpenAI Agents SDK — running agents](https://openai.github.io/openai-agents-js/guides/running-agents/), [OpenAI Agents SDK — sessions](https://openai.github.io/openai-agents-js/guides/sessions/), [Anthropic — building effective agents](https://www.anthropic.com/engineering/building-effective-agents).

| Behaviour here | Source | What the source says | Invariant it binds | Assertion |
|---|---|---|---|---|
| `RunControl.signal` is an `AbortSignal`; an upstream controller drives the halt | running agents | "`signal` – AbortSignal for cancellation" | Cancellation takes the shape a bounded runner's own run option takes, not a bespoke flag | takes cancellation as an AbortSignal |
| `exhausted` is its own outcome reason | running agents | "Throw `MaxTurnsExceededError` once `maxTurns` is reached, unless `maxTurns` is `null`" | A run stopped by a ceiling is never reported as completed, and no field common to the two reasons means "it worked" | raises an explicit typed non-success on a limit |
| The operations return a `RunOutcome` instead of rejecting | running agents | "Use `errorHandlers` to convert supported runtime errors into a final output instead of throwing" | A caller branches on a bounded non-success rather than re-classifying an `unknown` in a `catch`; `startRun` still throws, so the typed surface is a choice and not the only behaviour | can return a bounded non-success as a value |
| Resume passes the saved state, never a rebuilt history | running agents | "The input can either be a string …, or a list of input items, or a `RunState` object in case you are building a human-in-the-loop agent" | A resumed leg's input is the checkpoint; nothing reconstructs a prompt history from `results` and re-drives the graph | takes saved run state as the input to a continued run |
| A thrown non-success still reaches the run's identity and state | running agents | "All extend the base `AgentsError` class, which could provide the `state` property to access the current run state" | `runIdentityOf(error)` recovers the run, and a `failed` outcome carries the state recorded before the break | keeps a non-success reachable to the run it came from |
| Resume runs on the thread the `runId` derives | sessions | "keep passing the same `session`" | The identity is re-derivable from the bare `runId`, so a fresh process continues the same run rather than seeding a new one from history | resumes under the same identity |
| No completed node is executed twice | sessions | "The resumed turn is added to memory without re-preparing the input" | A resumed leg performs only the work still owed — counted in spawns per leg, since a replayed step still produces a correct-looking state | adds the resumed turn without re-preparing the input |
| `decision.maxRevisions` bounds whichever branch routing resolves to | building effective agents | "it's also common to include stopping conditions (such as a maximum number of iterations) to maintain control" | A backward-pointing `ifFalse` is bounded like `ifTrue`; the Plan validator only constrains `ifTrue`, so the other branch would otherwise loop a real subprocess unbounded | bounds the loop with an explicit stopping condition |
| A halt lands on a node boundary and is resumable from it | building effective agents | "Agents can then pause for human feedback at checkpoints or when encountering blockers" | The paused node emits no event and starts no process; the completed node's result is durable; the paused node is what a resume runs first | pauses at a checkpoint rather than mid-action |
| Every reason is readable from the store and the run id alone | building effective agents | "Prioritize **transparency** by explicitly showing the agent's planning steps" | `completed`, `paused`, `failed` and `exhausted` are each observable through `readRunOutcome` without the operation's return value; `resumed` completes the vocabulary so a run someone came back to is distinguishable from one nobody did | makes each reason observable rather than internal |

---

## Architecture

```
Plan (from @atta/engine)
        ↓
  graph-builder.ts           Plan → LangGraph StateGraph
        ↓
  [inject classifier nodes]  per Phase 3a.4
        ↓
  graph.invoke(recursionLimit: 150)
        ↓ per-turn:
    [Classifier node]  →  state.toolDecisions
        ↓
    [Agent node]       →  filters tools, calls LLM, writes transcript
        ↓
  adapter.ts                 accumulates into Conclusion
```

File tree:

```
packages/adapter-langgraph/src/
├── adapter.ts                # Main entry; compiles graph, invokes, builds Conclusion
├── graph-builder.ts          # Plan → StateGraph; injects classifier nodes before tool-enabled agents
├── graph-state.ts            # LangGraph state annotations + reducers
├── node-executor.ts          # Per-agent execution; tool filtering via state.toolDecisions
├── llm.ts                    # Multi-vendor LLM dispatch (Anthropic / Google / OpenAI-compat)
├── tools.ts                  # Per-vendor tool registries (ANTHROPIC / GOOGLE / OPENAI_COMPAT)
├── custom-tool-loop.ts       # Custom-tool execution loops (Anthropic + OpenAI-compat)
├── web-search-handler.ts     # webSearchHandler for OpenAI-compat vendors (Google CSE / Tavily / fallback)
└── cognitive-router/
    └── classifier.ts         # Haiku-based intent classifier node factory
```

---

## Cognitive Router — Four Capabilities

The router is four capabilities implemented as LangGraph nodes + state mutations.

| Capability | Location | Behavior |
|------------|----------|----------|
| Intent Classifier | `cognitive-router/classifier.ts` | Haiku call before each tool-enabled agent. Returns `{ needs, budget, reason }` |
| Tool Filter | `node-executor.ts` | Reads `state.toolDecisions[nodeId]`; filters agent's declared tools to classifier subset |
| Budget Enforcer | `node-executor.ts` + state | Per-turn tool call counter; hard cap (default 5) |
| Cost & Latency Tracker | `llm.ts` → `state.toolUseHistory` | Per-turn metadata (tokens, duration, cost estimate) |

Deferred to V2: pre-fetched grounding, post-call reflection.

**Pre-flight cost estimation vs. the per-turn tracker:** `estimateInputCost(text, modelId)` — exported from the package's `index.ts`, defined in `adapter.ts` — is a separate, standalone pure function for estimating input token count/cost *before* execution (`~4 chars/token` approximation, input-rate only, `costUsd: null` for an unpriced `modelId`). It reads the same module-scoped `PRICING` table the Cost & Latency Tracker above reads, but `PRICING` itself is not exported — only the function. Use this when a caller (e.g. Herald's Bulk Audit) needs a cost estimate before running anything; the table above is the post-hoc per-turn accounting during a real execution.

The per-turn `estimatedCostUsd` computed in `buildSuccessfulConclusion` (and, symmetrically, in `buildFailedConclusion` over whatever transcript exists) was previously only `console.info`'d and discarded — it is now also attached to the returned `Conclusion` at all three return sites, so callers no longer have to re-derive it from token counts.

---

## LangGraph State Shape

```ts
type GraphState = {
  transcript: TranscriptEntry[];          // reducer: concat
  toolDecisions: Record<string, ToolDecision>;  // reducer: merge
  toolUseHistory: ToolUseRecord[];        // reducer: concat
  revisionCount: number;                  // reducer: last-write-wins
  // plus Plan-specific round state
};
```

Reducers matter. Wrong reducer causes data loss across parallel nodes (especially when `auditAgent` is array).

| Field | Reducer | Why |
|-------|---------|-----|
| `transcript` | `concat` | Appended by each node in order |
| `toolDecisions` | `merge` | Keyed by node ID; each node writes its own key |
| `toolUseHistory` | `concat` | Each turn appends its tool-use records |
| `revisionCount` | last-write-wins | Monotonic counter |

---

## Tool Registry

In `tools.ts`. Three per-vendor registries share the same logical key space — an agent declaring `tools: [web_search]` resolves to the correct vendor-native format via whichever registry matches the `sdkShape`.

### `ANTHROPIC_TOOL_REGISTRY`

Anthropic server-side tools. Anthropic executes these on their infrastructure; no client-side handler needed.

```ts
web_search: { type: 'web_search_20260209', name: 'web_search', allowed_callers: ['direct'] }
web_fetch:  { type: 'web_fetch_20260209',  name: 'web_fetch',  allowed_callers: ['direct'] }
```

**Watch out:** Anthropic tool type tags have dates. `web_fetch_20251203` was stale and rejected mid-session; `web_fetch_20260209` is current as of 2026-04. Verify against Anthropic docs when adding tools.

`allowed_callers: ['direct']` is **required** — without it, Haiku rejects tool use with "does not support programmatic tool calling."

### `GOOGLE_TOOL_REGISTRY`

Gemini native tool configurations. Google executes these on their infrastructure; no client-side handler needed.

```ts
web_search: { googleSearch: {} }   // native Gemini grounding
```

### `OPENAI_COMPAT_TOOL_REGISTRY`

OpenAI function tool specifications. Unlike Anthropic/Google server tools, these require **client-side execution**: the model signals intent via `tool_calls` and the adapter runs the matching handler. Callers must register a `CustomToolHandlerMap` (via `adapter.customTools`) with a handler under the same name.

```ts
web_search: {
  type: 'function',
  function: {
    name: 'web_search',
    description: 'Search the web for current information on a topic.',
    parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
  }
}
```

**`webSearchHandler`** — exported from `@atta/adapter-langgraph`. Resolves `GOOGLE_SEARCH_API_KEY`+`GOOGLE_SEARCH_CX` (Google CSE) → `TAVILY_API_KEY` → graceful empty fallback. Register on the adapter via `customTools: { web_search: webSearchHandler }`.

Google (Gemini) and Anthropic vendors resolve their own tool natively — `webSearchHandler` is only needed for OpenAI-compat vendors (GPT, Grok, Groq, etc.).

---

## Classifier Behavior

Injected BEFORE each tool-enabled agent node. Graph-builder rewires incoming edges through it.

**Bias (tuned in Task 4.5):** err toward INCLUDING tools for reasoning roles. Only strip tools for audit roles.

**Classifier mode is driven entirely by the YAML `classifier.mode` field per agent.** The legacy name-substring hard rule (`agent.name.includes('Synthesizer') && !agent.name.includes('Conclusion')`) has been removed. The `always_tools` mode replaces it: when a YAML agent sets `classifier: { mode: always_tools }`, the classifier node is skipped and the agent's full tool list is always on.

**Role-based defaults in YAML:**

| Agent role | `classifier.mode` | Tools | Why |
|------------|-------------------|-------|-----|
| Strategist, Critic, Devil's Advocate | `auto` | Classifier decides | Needs tools; classifier can trim if question doesn't require search |
| round-Synthesizer | `always_tools` | Always on, no classifier call | Integrates round claims; must be able to verify. Replaces old name-substring hard rule. |
| FactChecker | `auto` | Classifier decides | Verification is the role |
| BlindCritic | `skip` | None | Blindness is the audit mechanism |
| ConclusionSynthesizer | `skip` | None | Commits answer; tools invite re-litigating |
| A0/A1 baselines | `skip` | None | Single-shot by definition |
| Brokered reviewers | `skip` | None | Single-shot advisory, no rounds |

---

## Rules

### No LangChain Wrappers for LLM Calls

LangChain wrappers have a `top_p` bug. Always call vendor SDKs directly.

```ts
// ✅ Direct vendor SDK (Anthropic example)
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic();
const response = await client.messages.create({ ... });

// ✅ Direct vendor SDK (Google example)
import { GoogleGenerativeAI } from '@google/generative-ai';

// ✅ Direct vendor SDK (OpenAI-compat example)
import OpenAI from 'openai';

// ❌ Never import LangChain wrappers for LLM calls
import { ChatAnthropic } from '@langchain/anthropic';  // top_p bug
```

### Recursion Limit 150

Classifier nodes double graph step count. Default 25 fails on rounds with revision.

```ts
// ✅
await graph.invoke(initialState, { recursionLimit: 150 });

// ❌
await graph.invoke(initialState);  // uses default 25, will fail
```

### Tool Registry Requires `allowed_callers: ['direct']`

Without this, Haiku rejects tool use. Sonnet tolerates its absence; Haiku does not.

```ts
// ✅
{ logicalName: 'web_search', anthropicType: 'web_search_20260209',
  allowed_callers: ['direct'] }

// ❌ Haiku rejects with "does not support programmatic tool calling"
{ logicalName: 'web_search', anthropicType: 'web_search_20260209' }
```

### State Mutations Go Through Annotations

Never mutate state outside LangGraph annotations. Reducers handle concurrent node writes; bypassing them causes races.

```ts
// ✅ LangGraph handles via reducer
return { transcript: [newEntry] };  // concat reducer appends

// ❌ Race condition with parallel nodes
state.transcript.push(newEntry);
```

### MAX_REVISIONS is Valid

Both `CLEAN` and `MAX_REVISIONS` are valid terminal states. Do NOT loosen audit thresholds to chase CLEAN. Audits flagging is the product working as designed.

```ts
// ✅ Both acceptable
if (terminalState === 'CLEAN' || terminalState === 'MAX_REVISIONS' || terminalState === 'REVISED') {
  return buildSuccessfulConclusion(state);
}

// ❌ Don't treat MAX_REVISIONS as failure
if (terminalState !== 'CLEAN') throw new Error('deliberation failed');
```

### Cognitive Router Stays Internal

Do NOT extract `cognitive-router/` as a separate package in V1. Reviewer convergence (Round 23): over-modular. Future extraction only if external demand emerges (2027+).

---

## Debugging MAX_REVISIONS

Not usually a bug. Check in order:

1. Re-read the transcript. Was the audit legitimately catching a real issue?
2. Check classifier logs. Did round-Synthesizer get tools? (hard-rule should guarantee)
3. Is FactChecker flagging based on web search variance? Run 2-3 times — if intermittent, it's LLM variance, not a code bug
4. Is there a runtime error swallowed somewhere? Check stderr

---

## Debugging High Latency

Usual culprit: `web_search` returning 30k+ tokens of results. Synthesizer r0 taking 10+ minutes is a known failure mode.

Mitigations:
- Tighten classifier's budget for that role
- Pre-fetched grounding (V2 feature — runs search before agent, injects summary)

---

## Anti-patterns

- ❌ LangChain wrappers for LLM calls (use vendor SDKs directly — `@anthropic-ai/sdk`, `@google/generative-ai`, `openai`)
- ❌ Forgetting `allowed_callers: ['direct']` in `ANTHROPIC_TOOL_REGISTRY` entries (Haiku rejection)
- ❌ Registering `webSearchHandler` for Google/Anthropic vendors — they resolve their own tool natively; the handler is only for OpenAI-compat
- ❌ `recursionLimit: 25` (default; insufficient for classifier-augmented graphs)
- ❌ Mutating state outside LangGraph annotations (causes races with parallel nodes)
- ❌ Treating `MAX_REVISIONS` as failure (it's a valid terminal state)
- ❌ Stripping tools from round-Synthesizer (empirical degradation, Task 4.5 — use `always_tools` in YAML)
- ❌ Writing transcript entries outside `node-executor.ts` (breaks trace ordering)
- ❌ Extracting `cognitive-router/` to separate package (Round 23 rejected)

---

## When you need more context

- Classifier tuning history: commits `2e6dcb2` (Task 3), Task 4.5 (classifier tuning)
- Why router is inside adapter: `apps/vada-ai/specs/engine/v2-results/round-23-*.md`
- Plan structure: **engine-layer** skill
- Agent configs and tool assignments: **atta-teams** skill (`packages/agents/vada-deliberation/src/` + `packages/agents/vada-deliberation/yamls/`)
