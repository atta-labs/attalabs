/**
 * @file stream-reader.ts
 * @description Frames an agent-spawn node's stdout into newline-delimited
 * JSON records as the process emits them, reporting each record to the
 * observer the moment its line completes. Also accumulates stderr
 * verbatim. Split out of `node-executor.ts` so this concern — capturing
 * and interpreting the spawned process's structured output — has no
 * knowledge of how the process itself was spawned, timed out, or killed
 * (`process-lifecycle.ts`).
 *
 * One framer implements the framing, and every byte reaches it the same
 * way: `attachStreamReader` feeds it `data` chunk by `data` chunk through a
 * single decoder, and `parseNdjson` feeds it a whole string at once. A
 * second, string-at-once parser beside it could disagree with the
 * incremental one about a chunk boundary, a blank line, or which line
 * number a malformed record sits on, and only the incremental path is
 * exercised by a real process.
 *
 * **This file's captured output is verbatim, and every channel out of it
 * redacts.** The records framed here and the stderr accumulated here are the
 * spawned agent's own output, kept exactly as printed — that is what makes this
 * the capture, the one place a caller can still reach the real stream. Nothing
 * downstream of it hands that text out unchanged: an observer-facing event is
 * redacted at the single point every event passes through (`graph-builder.ts`'s
 * `safeEmit`), and the result a checkpoint persists is redacted and bounded at
 * the single point the node's result is written back (`narrowPersistedResult`).
 * Both sit on one definition of sensitive (`reason-text.ts`). A redaction pass
 * added *here* instead would recreate the condition that produced the original
 * leak — the decision spread across paths, with no one place answering for what
 * "sensitive" means — and would also destroy the capture the two channels are
 * derived from.
 *
 * One consequence is the caller's to weigh: the `onRecord` hook below is **not**
 * a redacted channel. It is a distinct, lower-level seam handing over raw records
 * as they arrive, so an observer of it is an observer of an unredacted agent
 * transcript, by its own design. The one string this file builds that outlives
 * the capture — the malformed-line error, which LangGraph persists as a failed
 * task's message — is redacted where it is built, for that reason.
 */

import { StringDecoder } from 'node:string_decoder'
import { isProcessAbandoned, type SpawnedProcessLike } from './process-lifecycle'
import { redactSensitiveText } from './reason-text'

/** A complete line that was not JSON, with its position among the stream's non-empty lines (1-based). */
interface MalformedLine {
  line: string
  lineNumber: number
}

/**
 * How much of a malformed line the error quotes. Shorter than an excerpt of a
 * whole tool result because the point is to identify the line, not to carry it:
 * a reader needs enough to recognise what the child printed instead of JSON.
 */
const MAX_MALFORMED_LINE_LENGTH = 200

/**
 * Builds the error a non-JSON line raises. Naming the offending line and
 * its position rather than falling back to prose-scraping is deliberate: a
 * candidate agent with no structured output mode is a reporting concern,
 * not something this file silently works around.
 */
function nonJsonError(nodeId: string, malformed: MalformedLine): Error {
  return new Error(
    // The quoted line is the child's own output and this message is persisted
    // as a failed task's on the thread, so it is redacted rather than only
    // sliced — the same treatment the two exit-code failures give their stderr.
    `Agent-spawn node '${nodeId}' produced non-JSON output on line ${malformed.lineNumber} of its structured stream: ${redactSensitiveText(malformed.line, MAX_MALFORMED_LINE_LENGTH)}`
  )
}

/**
 * Calls `onRecord`, if supplied, and swallows anything it throws. An
 * observer's own bug must never corrupt the run it is merely watching —
 * mirrors `graph-builder.ts`'s `safeEmit` for the same reason, kept local
 * here since this package's two node-execution files intentionally share
 * no runtime import between them. It matters more now than it did when
 * emission happened once after the process had already closed: the
 * observer is called from inside a `data` listener, where a thrown error
 * would surface as an unhandled exception on the stream rather than as a
 * rejected `executeAgentSpawnNode`.
 */
function safeEmitParsedEvents(onRecord: ((events: unknown[]) => void) | undefined, events: unknown[]): void {
  if (!onRecord) return
  try {
    onRecord(events)
  } catch {
    // Deliberately swallowed — see the function doc above.
  }
}

/** Accumulates text, splits it into complete lines, and parses each one. */
interface NdjsonFramer {
  /** Feeds more text in. Only lines a newline has already terminated are parsed. */
  push(text: string): void
  /** Parses whatever is held back with no terminating newline, then reports the first malformed line seen. */
  finish(): MalformedLine | undefined
  /** A copy of the records parsed so far, in arrival order. Never the framer's own array. */
  snapshot(): unknown[]
}

/**
 * The framer. Three properties are the whole point of it:
 *
 * - **A partial trailing line is held over, never parsed or dropped.** A
 *   `data` chunk boundary falls wherever the OS pipe happens to flush, so
 *   the tail of a chunk is routinely half a record. It is carried into the
 *   next chunk and only parsed once a newline terminates it — or, at
 *   `finish`, as the stream's last line, since a process is free to exit
 *   without a trailing newline.
 * - **Ordering is the order lines complete.** Records are appended and
 *   reported in that order, one report per record, so an observer sees the
 *   same sequence the process wrote.
 * - **Each arriving character is scanned exactly once.** The held-back
 *   partial line is kept as the pieces it arrived in and joined only when a
 *   newline finally completes it, so only the *new* text is searched per
 *   chunk. Re-concatenating and re-splitting the whole accumulation per
 *   chunk instead is quadratic in the length of a single long line, and the
 *   child controls both that length and whether a newline ever arrives —
 *   the cost is paid synchronously inside the `data` listener, where it
 *   would also hold off the process-lifecycle timeout that is the only
 *   guard against a runaway child.
 *
 * The first malformed line stops parsing but not counting: later lines
 * still advance the line counter, so the reported line number is the
 * offending line's real position in the stream, and no record after a
 * malformed one is reported (the run is going to fail on it anyway).
 */
function createNdjsonFramer(onRecord: () => ((events: unknown[]) => void) | undefined): NdjsonFramer {
  const events: unknown[] = []
  /** The partial trailing line, in the pieces it arrived in — joined only when a newline completes it. */
  let carryPieces: string[] = []
  let nonEmptyLineCount = 0
  let malformed: MalformedLine | undefined

  const consumeLine = (raw: string): void => {
    const line = raw.trim()
    if (line.length === 0) return
    nonEmptyLineCount += 1
    if (malformed) return

    let record: unknown
    try {
      record = JSON.parse(line)
    } catch {
      malformed = { line, lineNumber: nonEmptyLineCount }
      return
    }

    events.push(record)
    safeEmitParsedEvents(onRecord(), [record])
  }

  const takeCarryOver = (): string => {
    const held = carryPieces.length === 1 ? carryPieces[0] : carryPieces.join('')
    carryPieces = []
    return held ?? ''
  }

  return {
    push: (text) => {
      if (text.length === 0) return
      const segments = text.split('\n')

      // No newline anywhere in this chunk: the whole thing extends the
      // partial line. Held as a piece, not concatenated — see the doc above.
      if (segments.length === 1) {
        carryPieces.push(text)
        return
      }

      // The first segment is what finally terminates the held-back line;
      // the last is the new carry-over (empty when the chunk ended on a
      // newline); everything between is a complete line of its own.
      carryPieces.push(segments[0] ?? '')
      consumeLine(takeCarryOver())
      for (let i = 1; i < segments.length - 1; i += 1) consumeLine(segments[i] ?? '')
      const tail = segments[segments.length - 1] ?? ''
      if (tail.length > 0) carryPieces.push(tail)
    },
    finish: () => {
      consumeLine(takeCarryOver())
      return malformed
    },
    snapshot: () => [...events]
  }
}

/** The state one spawned process's streams accumulate into. */
export interface StreamReaderHandle {
  stderrChunks: string[]
  /**
   * Called once per parsed record, live, as each record's line completes —
   * read from this field at call time, so a caller may replace it after
   * attach. Stored here (rather than passed to `finalizeEvents`) because
   * the process starts emitting the moment it is spawned, well before
   * anything waits on its exit.
   */
  onParsedEvents?: (events: unknown[]) => void
  /**
   * A copy of the records parsed so far, in arrival order — complete only
   * after `finalizeEvents`. Always a fresh array: the framer's own record
   * of the stream never escapes, so a caller mutating what it gets back
   * (a redaction pass rewriting entries, say) cannot corrupt it.
   */
  snapshotEvents(): unknown[]
  /**
   * Parses the trailing line held back with no terminating newline and
   * reports the first malformed line seen, if any. Called by
   * `finalizeEvents` once the process has closed.
   */
  finishStdout(): MalformedLine | undefined
}

/**
 * Attaches `data` listeners to the given process's stdout/stderr and
 * returns the handle they feed. Must be called before the caller starts
 * waiting on the process's exit, or early output could arrive with no
 * listener yet attached to catch it.
 *
 * Every stdout chunk goes through one `StringDecoder` spanning the whole
 * stream, a `string` chunk included. A chunk boundary can land inside a
 * multi-byte character just as readily as inside a line, and decoding each
 * chunk independently turns that character into `U+FFFD` in both halves —
 * corrupting a record that was never malformed, the one framing failure a
 * line-level carry-over cannot catch. Letting a `string` chunk skip the
 * decoder is the same bug wearing a different hat: while the decoder holds
 * the first bytes of a character, a string framed around it would splice
 * the stream out of order, and the held bytes would surface at close in the
 * wrong line. `stdout`'s listener type permits either, so both go the same
 * way.
 *
 * Framing stops once the process has closed, and also once its lifecycle
 * owner has abandoned it. A `data` event cannot legitimately follow `close`
 * — it fires only after stdio has flushed — but a child that outlives a
 * kill signal can keep writing to a pipe nothing is waiting on any more,
 * and reporting records for a node whose failure was already emitted is
 * worse than dropping them. Reading `close` here is not owning the
 * process's lifecycle: nothing in this file starts, signals or waits on it.
 *
 * The residual case is that same child never closing at all — killed on the
 * process-lifecycle timeout, or on a cancellation request, and still alive
 * after the forced signal. `close` never arrives for it, so `close` alone
 * cannot stop the stream. `process-lifecycle.ts` owns the kill and is
 * therefore the only place that knows the wait is over; it says so by
 * marking the child abandoned, which this file checks per chunk
 * (`isProcessAbandoned`) rather than inferring. Checked per chunk and not
 * once at attach time because abandonment happens mid-stream, which is the
 * whole point of it.
 */
export function attachStreamReader(
  child: SpawnedProcessLike,
  onParsedEvents?: (events: unknown[]) => void
): StreamReaderHandle {
  const decoder = new StringDecoder('utf8')
  const framer = createNdjsonFramer(() => handle.onParsedEvents)
  let closed = false

  const handle: StreamReaderHandle = {
    stderrChunks: [],
    onParsedEvents,
    snapshotEvents: () => framer.snapshot(),
    finishStdout: () => {
      // Bytes the decoder is still holding belong to the stream's last
      // line; flush them through the framer before it closes that line out.
      framer.push(decoder.end())
      closed = true
      return framer.finish()
    }
  }

  child.stdout?.on('data', (chunk) => {
    if (closed || isProcessAbandoned(child)) return
    const text = decoder.write(typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk)
    framer.push(text)
  })
  child.stderr?.on('data', (chunk) => handle.stderrChunks.push(chunk.toString()))
  child.on('close', () => {
    closed = true
  })

  return handle
}

/**
 * Parses a complete newline-delimited JSON string in one call, through the
 * same framer the incremental path uses. Throws naming the offending line
 * when a line is not JSON.
 */
export function parseNdjson(raw: string, nodeId: string): unknown[] {
  const framer = createNdjsonFramer(() => undefined)
  framer.push(raw)
  const malformed = framer.finish()
  if (malformed) throw nonJsonError(nodeId, malformed)
  return framer.snapshot()
}

/**
 * Closes out a reader's stdout once its process has exited: parses the
 * final unterminated line and returns every record the stream produced, in
 * arrival order. Throws if any line was not JSON.
 *
 * The observer has already seen every newline-terminated record
 * individually, as its line completed. Two things are left for this
 * function: the stream's last line, when the process exited without a
 * trailing newline — that record is reported to the observer here, and is
 * the only one whose report is not live — and the failure, raised here
 * rather than from inside a `data` listener so it surfaces as a rejected
 * `executeAgentSpawnNode`.
 */
export function finalizeEvents(reader: StreamReaderHandle, nodeId: string): unknown[] {
  const malformed = reader.finishStdout()
  if (malformed) throw nonJsonError(nodeId, malformed)
  return reader.snapshotEvents()
}
