/**
 * @file reason-text.ts
 * @description The text treatments this package applies before a string
 * leaves it — into a message it throws, an error it records, a checkpoint a
 * store persists, or an event an observer receives. Two of them, built from
 * the same two primitives (collapse control characters, bound the length):
 * `sanitizeReasonText`, for a reason string a *caller* handed in, and
 * `redactSensitiveText`, for text this package did not author at all — a
 * spawned agent's own structured output, a child process's stderr, an error
 * message that embeds either. Two thin mappers sit on the second of those, one
 * per channel that has to carry such text: `redactLifecycleEvent` for an event
 * an observer receives, `narrowPersistedResult` for the node result a
 * checkpointer writes.
 *
 * **Why they live in one file.** Several seams take a string from outside
 * this package, and none of them is another's caller: `process-lifecycle.ts`
 * reads the string a caller passed to `abort()`, `run-halt.ts` takes the one
 * a caller passed to `halt()`, and `graph-builder.ts` emits text a spawned
 * process printed. All of them interpolate or forward that string into
 * something that outlives the process, so all of them need a treatment — and
 * a second copy of one beside the first is how two drift, one gaining a bound
 * or a rule the other never got. That drift is not hypothetical here: before
 * `redactSensitiveText` existed, a spawned agent's raw output — its absolute
 * working-directory paths, the session id it reported, its account's
 * rate-limit metadata, its unbounded stderr — reached an observer's `onEvent`
 * hook verbatim, because no single place was responsible for deciding what
 * "sensitive" meant. It is decided here now, once.
 *
 * **What `redactSensitiveText` is, and is not.** It is a definition of
 * sensitive text that any channel can apply — it takes a string and returns a
 * string, so the pass that narrows what a checkpoint persists
 * (`narrowPersistedResult`, below) reuses it without touching the event channel
 * at all. Two channels, one answer to what "sensitive" means: the event
 * channel's own mapper (`redactLifecycleEvent`) and the persisted-state mapper
 * both sit on this one function, and each owns only its own bound and its own
 * field-by-field decision. It is not, and cannot be, a guarantee
 * that no secret survives: the rules below recognise the shapes this package
 * has evidence for, and a spawned process can print a credential in a shape
 * nothing here matches. Treat it as the floor it is — it removes what is
 * known to leak, and it bounds what it cannot recognise so that an unmatched
 * secret is at least not reproduced in full.
 */

import type { AgentLifecycleEvent, ResultNarrowing, StepNodeResult } from './types'

/**
 * The longest caller-supplied reason carried into a message. Generous enough
 * for a real sentence, short enough that no single reason can dominate a log
 * line or a stored error.
 */
export const MAX_REASON_TEXT_LENGTH = 200

/**
 * The longest redacted excerpt any one event carries.
 *
 * The text this bounds is the most unbounded thing that reaches an observer:
 * one record of a spawned agent's structured stream (a whole tool result, a
 * file it read and echoed) or an error message embedding a child's stderr.
 * Nothing upstream bounds either — the child chooses both, and an observer
 * that logs what it receives inherits that choice. So the excerpt is capped
 * here, in the spirit the normative tool-output guidance states for an
 * executor boundary: bound the response by default and return only
 * high-signal content rather than everything available. It is deliberately
 * larger than `MAX_REASON_TEXT_LENGTH` — a failure message names the node,
 * its role and its exit code before the child's own output starts, and a cap
 * too tight would cut the diagnosis before the excerpt it exists to carry.
 */
export const MAX_REDACTED_EXCERPT_LENGTH = 500

/**
 * The longest any one free-text field of a *persisted* node result carries.
 *
 * Larger than `MAX_REDACTED_EXCERPT_LENGTH` on purpose, and the difference is
 * not a loosened rule — it is a different consumer. An event's excerpt is read
 * by an observer, for whom high-signal is the whole requirement. A persisted
 * result is read by the run itself: a later agent-spawn step's
 * `promptTemplate` renders `results` as its Handlebars context, and a caller's
 * `decisionPredicate` is handed the examined step's recorded result. Bounding
 * those at an observer's excerpt length would not merely shorten a log line, it
 * would change what a downstream step is told — a `git diff` a review step
 * reads, cut to a few hundred characters, is a different prompt. So the bound
 * is set where a real command's output stays usable while still being a bound:
 * nothing a child prints can make one field of one checkpoint arbitrarily
 * large, which is the property the stored form has to have.
 *
 * Deliberately not a caller-configurable option. What a checkpoint may hold is
 * the package's own guarantee, and a knob would let it be turned back off.
 */
export const MAX_PERSISTED_TEXT_LENGTH = 4000

/**
 * The most records of an agent's structured stream any one persisted result
 * keeps.
 *
 * A per-record bound alone does not bound the result: a spawned agent working
 * for minutes emits thousands of records, and LangGraph re-serializes
 * everything accumulated so far at every superstep, so an unbounded array makes
 * each later write larger than the last. The count is what turns that growth
 * into a ceiling.
 *
 * The *last* records are the ones kept, not the first. A stream's tail is where
 * the step's answer and its final tool results are; its head is the prompt and
 * the setup, which the Plan already describes. Nothing load-bearing is lost by
 * dropping from the front — the session id a resume needs was extracted by
 * `executeAgentSpawnNode` before this ran and lives in the `sessions` channel,
 * not in this array.
 */
export const MAX_PERSISTED_EVENT_RECORDS = 50

/** Appended when an excerpt was cut, so a reader never mistakes it for the whole. */
const TRUNCATION_MARKER = '…[truncated]'

const PLACEHOLDER_PATH = '[redacted:path]'
const PLACEHOLDER_SESSION = '[redacted:session]'
const PLACEHOLDER_RATE_LIMIT = '[redacted:rate-limit]'
const PLACEHOLDER_CREDENTIAL = '[redacted:credential]'

/**
 * A key's value in the JSON a spawned agent emits, or in the `key=value`
 * prose a CLI prints: a quoted string, a flat object or array, or a bare
 * token. Deliberately non-recursive — a nested object's own braces end the
 * match early, which under-redacts rather than swallowing the rest of the
 * record and the lifecycle context after it.
 */
const KEYED_VALUE = String.raw`(?:"[^"]*"|'[^']*'|\{[^{}]*\}|\[[^\[\]]*\]|[^\s,;}\]]+)`

/** Builds a rule that keeps a sensitive key visible and replaces only its value. */
function keyedRule(keyPattern: string, placeholder: string): { pattern: RegExp; replacement: string } {
  return {
    pattern: new RegExp(String.raw`("?\b(?:${keyPattern})\b"?\s*[:=]\s*)${KEYED_VALUE}`, 'gi'),
    replacement: `$1"${placeholder}"`
  }
}

/**
 * Every rule applied, in order, by `redactSensitiveText`.
 *
 * The four categories are the ones this package has evidence reach an
 * observer: the machine's own filesystem layout, the identifiers that address
 * a spawned agent's session and the account behind it, that account's
 * rate-limit metadata, and credential-shaped tokens. Each keeps its key and
 * replaces only the value, and each names what it removed rather than
 * deleting silently — an observer must still be able to read the shape of
 * what it received, which is exactly the property the normative tracing
 * guidance preserves when it excludes a span's sensitive inputs and outputs
 * while keeping the span itself.
 *
 * Order matters in one place: keyed rules run before the bare-shape rules, so
 * a sensitive key whose value happens to be a path is reported as the key it
 * is rather than as an anonymous path.
 */
const REDACTION_RULES: { pattern: RegExp; replacement: string }[] = [
  // ── Credentials ────────────────────────────────────────────────────────
  keyedRule(
    'authorization|api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|auth[_-]?token|secret|password|passwd|credential|token',
    PLACEHOLDER_CREDENTIAL
  ),
  { pattern: /\bBearer\s+[\w.~+/-]+=*/gi, replacement: `Bearer ${PLACEHOLDER_CREDENTIAL}` },
  { pattern: /\b(?:sk|pk|rk)-[A-Za-z0-9_-]{8,}/g, replacement: PLACEHOLDER_CREDENTIAL },
  { pattern: /\b(?:gh[posur]_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{20,})/g, replacement: PLACEHOLDER_CREDENTIAL },

  // ── Session and account identifiers ────────────────────────────────────
  keyedRule(
    'session[_-]?id|conversation[_-]?id|thread[_-]?id|account[_-]?id|user[_-]?id|organization[_-]?id|org[_-]?id|workspace[_-]?id|uuid',
    PLACEHOLDER_SESSION
  ),

  // ── Rate-limit metadata ────────────────────────────────────────────────
  keyedRule(
    '[a-z0-9]*[_-]?rate[_-]?limits?[a-z0-9_-]*|ratelimits?[a-z0-9_-]*|retry[_-]?after|requests?[_-]?remaining|tokens?[_-]?remaining|resets?[_-]?at|quota[a-z0-9_-]*',
    PLACEHOLDER_RATE_LIMIT
  ),

  // ── Machine-local paths ────────────────────────────────────────────────
  { pattern: /\bfile:\/\/\S+/gi, replacement: PLACEHOLDER_PATH },
  { pattern: /(?<![\w])[A-Za-z]:\\(?:[\w .@+-]+\\?)+/g, replacement: PLACEHOLDER_PATH },
  { pattern: /(?<![\w])~(?:\/[\w.@+-]+)+\/?/g, replacement: PLACEHOLDER_PATH },
  // A POSIX absolute path of at least two segments. The lookbehind is what
  // keeps a URL intact: in `https://host/a/b` every candidate slash is
  // preceded by `:`, `/` or a word character, so nothing matches — a remote
  // URL is not the machine's own filesystem layout and dissolving it would
  // cost an observer the one field that says where a request went. Two
  // segments rather than one so ordinary prose containing a lone `/` is left
  // alone.
  { pattern: /(?<![\w:/~])(?:\/[\w.@+-]+){2,}\/?/g, replacement: PLACEHOLDER_PATH },

  // ── Bare identifiers ───────────────────────────────────────────────────
  // A UUID printed with no key at all — the shape an agent CLI uses for the
  // session it just resumed, and the one identifier that is recognisable
  // without its key.
  {
    pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    replacement: PLACEHOLDER_SESSION
  }
]

/**
 * Control characters — newlines above all — collapsed to single spaces.
 *
 * A string carrying `\n` can forge additional log records or terminate a line
 * early in any consumer that treats one line as one event, and a `\r` can
 * overwrite what was already written to a terminal. Collapsing first also
 * puts a multi-line stderr capture on one line, which is what lets the
 * redaction rules above see a `key: value` pair the child split across lines.
 */
function collapseControlCharacters(raw: string): string {
  let out = ''
  let lastWasSpace = false
  for (const char of raw) {
    const code = char.codePointAt(0) ?? 0
    // C0 (includes newline, carriage return, tab), DEL, and C1.
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) {
      if (out.length > 0 && !lastWasSpace) {
        out += ' '
        lastWasSpace = true
      }
      continue
    }
    out += char
    lastWasSpace = char === ' '
  }
  return out.trim()
}

/**
 * `text` cut to `max` UTF-16 code units, with `marker` appended if it was cut.
 *
 * The bound is in code units, but the cut must fall between code points: a
 * supplementary-plane character (an emoji, a CJK extension ideograph) whose
 * high surrogate sits at the boundary would otherwise be sliced in half,
 * leaving an unpaired surrogate in the stored reason and in the thrown
 * message — which every consumer downstream re-serializes, and
 * `JSON.stringify` and a UTF-8 checkpoint write both render as a replacement
 * character or mangled bytes. Dropping the orphaned half keeps the bound (the
 * result is never longer) and keeps the string well-formed.
 */
function boundText(text: string, max: number, marker: string): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const lastUnit = cut.charCodeAt(cut.length - 1)
  const wholeCodePoints = lastUnit >= 0xd800 && lastUnit <= 0xdbff ? cut.slice(0, -1) : cut
  return `${wholeCodePoints}${marker}`
}

/**
 * A caller-supplied reason, made safe to embed in a message.
 *
 * The reason reaches here from whatever the caller passed to `abort()` or to
 * `halt()`, which on a server is routinely a value it did not author — a
 * cancellation header, a client-supplied field, an upstream service's text, an
 * operator's free-text pause note. It is then interpolated into a thrown
 * `Error`'s message, and that message does not stay in memory: LangGraph
 * persists a failed task's `{ name, message }` on the thread, so it lands in
 * the checkpoint store and in whatever later renders an outcome's `error` or
 * `haltReason` — a log line, an operator console, a dashboard.
 *
 * Two treatments, each closing a distinct abuse of that path: control
 * characters are collapsed, and the whole thing is length-bounded, because
 * nothing upstream bounds it — `abort()` and `halt()` both accept a string of
 * any size, and this one is re-serialized into every checkpoint write the
 * thread makes afterwards.
 *
 * It deliberately does **not** apply the redaction rules. A reason is text the
 * caller wrote about its own run, so a path or an id inside one was put there
 * on purpose and is the reason's whole content; redacting it would leave an
 * operator a pause note that says nothing. Text the caller did not author gets
 * `redactSensitiveText` instead.
 *
 * Sanitizing at each entry point rather than only at the interpolation site is
 * deliberate: those are the two points where a caller's reason enters the
 * package, so the value stored on `ProcessCancelledError.cancellationReason`
 * and on `RunControl.haltReason` is the safe one too, and a consumer that
 * renders either field instead of the message is covered without having to
 * know it needed to be.
 */
export function sanitizeReasonText(raw: string): string {
  return boundText(collapseControlCharacters(raw), MAX_REASON_TEXT_LENGTH, '…')
}

/**
 * Text this package did not author, made safe to hand to an observer or to
 * persist: control characters collapsed, every recognised sensitive shape
 * replaced by a named placeholder, and the result bounded to a single
 * excerpt.
 *
 * Takes a string and returns a string, with no knowledge of where it came
 * from or where it is going. That independence is the point: the event
 * channel is the first caller, but the same definition of "sensitive" governs
 * anything else this package hands out — notably what a checkpoint persists,
 * which is a separate channel with the same exposure and must not grow a
 * second, drifting answer of its own.
 *
 * `maxLength` is how far that independence goes: the *rules* are one
 * definition shared by every channel, while the bound belongs to the channel,
 * because how much text is useful depends on who reads it (see
 * `MAX_PERSISTED_TEXT_LENGTH`). A caller choosing its own bound is choosing how
 * much of an already-redacted string to keep, never which shapes count as
 * sensitive — that question has exactly one answer and it is `REDACTION_RULES`.
 */
export function redactSensitiveText(raw: string, maxLength: number = MAX_REDACTED_EXCERPT_LENGTH): string {
  let text = collapseControlCharacters(raw)
  for (const { pattern, replacement } of REDACTION_RULES) {
    text = text.replace(pattern, replacement)
  }
  return boundText(text, maxLength, TRUNCATION_MARKER)
}

/** One record of a spawned agent's stream, as text — the same reduction the event channel's own emission does. */
function recordAsText(record: unknown): string {
  return typeof record === 'string' ? record : JSON.stringify(record)
}

/**
 * The form of a node's result that goes to rest — bounded and redacted, and
 * saying which of its own fields that happened to.
 *
 * **Why this is applied where a node's result is written back, not in the state
 * annotation's reducer.** A checkpoint is more than its channel values: a
 * `StateSnapshot`'s `metadata` carries `writes`, the node outputs of that
 * super-step, and LangGraph additionally persists each finished node's own
 * writes as task entries against the in-progress checkpoint so a sibling's
 * failure does not force a re-run. All three are the value the node *returned*.
 * A reducer therefore narrows only one of the three: the raw return would still
 * be stored verbatim as that super-step's recorded write and as that task's
 * pending write, and the guarantee would be false while looking true from
 * `getState()`. Narrowing what the node returns is the only placement that
 * reaches every copy.
 *
 * **What it keeps, and why that split and not another.** Every structural field
 * survives untouched — `kind`, `nodeId`, `exitCode`, `durationMs`, and a
 * mechanical node's declared `action`. Those are what make a stored result
 * readable as a result at all, and they are values this package or its caller
 * produced, never text a child printed. Only what a spawned process authored is
 * rewritten. That is the same line the normative tracing guidance draws when it
 * excludes a span's sensitive inputs and outputs (`RunConfig`'s
 * `traceIncludeSensitiveData`) while the span itself stays fully observable —
 * and it is the line the event channel already draws through
 * `redactLifecycleEvent`, applied here to state instead of to an event so the
 * two cannot answer differently.
 *
 * **What it deliberately does not touch.** Not the `sessions` channel and not
 * `revisionCounts`: the first is the id a later step's `resume` hands to the
 * agent CLI, the second the counter a decision's ceiling is compared against, so
 * narrowing either would change what the run *does*, not what it stores. The
 * duplicate of that session id carried on an agent-spawn *result* is redacted,
 * because nothing reads it there and a session identifier is one of the shapes
 * the rules exist to remove.
 *
 * Returns a new object every time. The caller's own value is left alone, which
 * is what lets the node wrapper read the real `sessionId` off it and emit the
 * real stream to an observer after this has run.
 */
export function narrowPersistedResult(result: StepNodeResult): StepNodeResult {
  switch (result.kind) {
    case 'agent-spawn': {
      const asText = result.events.map(recordAsText)
      const dropped = Math.max(0, asText.length - MAX_PERSISTED_EVENT_RECORDS)
      const events = asText.slice(dropped).map((text) => redactSensitiveText(text, MAX_PERSISTED_TEXT_LENGTH))
      const originalLengths: Record<string, number> = {
        events: asText.reduce((total, text) => total + text.length, 0)
      }
      const redactedFields = ['events']
      if (result.sessionId !== undefined) {
        originalLengths.sessionId = result.sessionId.length
        redactedFields.push('sessionId')
      }
      const narrowing: ResultNarrowing = {
        redactedFields,
        originalLengths,
        originalEventCount: asText.length
      }
      return {
        ...result,
        events,
        ...(result.sessionId === undefined ? {} : { sessionId: PLACEHOLDER_SESSION }),
        narrowing
      }
    }
    case 'mechanical': {
      const narrowing: ResultNarrowing = {
        redactedFields: ['command', 'stdout', 'stderr'],
        originalLengths: {
          command: result.command.length,
          stdout: result.stdout.length,
          stderr: result.stderr.length
        },
        originalEventCount: 0
      }
      return {
        ...result,
        command: redactSensitiveText(result.command, MAX_PERSISTED_TEXT_LENGTH),
        stdout: redactSensitiveText(result.stdout, MAX_PERSISTED_TEXT_LENGTH),
        stderr: redactSensitiveText(result.stderr, MAX_PERSISTED_TEXT_LENGTH),
        narrowing
      }
    }
    default: {
      // Exhaustive against the result union, for the reason
      // `redactLifecycleEvent`'s switch is: a third node kind carrying a third
      // captured-output field must not reach a checkpoint through a `default`
      // branch that quietly passed it along verbatim.
      const exhaustive: never = result
      return exhaustive
    }
  }
}

/**
 * One observer-facing lifecycle event, redacted — the single pass every event
 * this package emits goes through, whichever path produced it.
 *
 * **Structure is retained; only free text is redacted.** `type`, `nodeId` and
 * `runId` pass through untouched, because they are what makes an event
 * readable as an event at all: an observer must still be able to tell which
 * kind it received, which Plan step it belongs to, and which run it correlates
 * with. `runId` in particular is UUID-shaped by default and would be eaten by
 * the bare-identifier rule if it were treated as text — it is not text, it is
 * the correlation handle, and this package mints it rather than a spawned
 * process leaking it. This split is the one the normative tracing guidance
 * draws: a span's sensitive inputs and outputs can be excluded while the span
 * itself stays fully observable.
 *
 * **Every kind is enumerated on purpose.** The switch is exhaustive against
 * the event union, so a new variant carrying a new text field does not compile
 * until this function says what happens to it. An emission path that decided
 * for itself whether its own events needed redacting is precisely how raw
 * child output reached observers before this existed; a kind that silently
 * falls through a `default` branch would reintroduce that, one variant at a
 * time.
 */
export function redactLifecycleEvent(event: AgentLifecycleEvent): AgentLifecycleEvent {
  switch (event.type) {
    case 'node:start':
    case 'node:complete':
      // No free-text field at all — nothing to redact, and nothing to copy.
      return event
    case 'node:streaming':
      // One record of the spawned process's own structured stream: the
      // largest and least trustworthy text any event carries.
      return { ...event, content: redactSensitiveText(event.content) }
    case 'node:failed':
      // A thrown message, which routinely embeds a confined working
      // directory, a resolved realpath, or a slice of the child's stderr.
      return { ...event, error: redactSensitiveText(event.error) }
    default: {
      const exhaustive: never = event
      return exhaustive
    }
  }
}
