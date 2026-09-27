/**
 * @file stream-reader.ts
 * @description Frames an agent-spawn node's stdout into newline-delimited
 * JSON records as the process emits them, reporting each record to the
 * observer the moment its line completes rather than after the process
 * closes. Also accumulates stderr verbatim. Split out of
 * `node-executor.ts` so this concern — capturing and interpreting the
 * spawned process's structured output — has no knowledge of how the
 * process itself was spawned, timed out, or killed (`process-lifecycle.ts`).
 *
 * One framer implements the framing, and both entry points go through it:
 * `attachStreamReader` feeds it `data` chunk by `data` chunk, and
 * `parseNdjson` feeds it a whole string at once. A second, string-at-once
 * parser beside it could disagree with the incremental one about a chunk
 * boundary, a blank line, or which line number a malformed record sits on,
 * and only the incremental path is exercised by a real process.
 */

import type { SpawnedProcessLike } from './process-lifecycle'

/** A complete line that was not JSON, with its position among the stream's non-empty lines (1-based). */
interface MalformedLine {
  line: string
  lineNumber: number
}

/**
 * Builds the error a non-JSON line raises. Naming the offending line and
 * its position rather than falling back to prose-scraping is deliberate: a
 * candidate agent with no structured output mode is a reporting concern,
 * not something this file silently works around.
 */
function nonJsonError(nodeId: string, malformed: MalformedLine): Error {
  return new Error(
    `Agent-spawn node '${nodeId}' produced non-JSON output on line ${malformed.lineNumber} of its structured stream: ${malformed.line.slice(0, 200)}`
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
  /** Records parsed so far, in arrival order. The same array the caller keeps a reference to. */
  events: unknown[]
  /** Feeds more text in. Only lines a newline has already terminated are parsed. */
  push(text: string): void
  /** Parses whatever is held back with no terminating newline, then reports the first malformed line seen. */
  finish(): MalformedLine | undefined
}

/**
 * The framer. Two properties are the whole point of it:
 *
 * - **A partial trailing line is held over, never parsed or dropped.** A
 *   `data` chunk boundary falls wherever the OS pipe happens to flush, so
 *   the tail of a chunk is routinely half a record. It is carried into the
 *   next chunk and only parsed once a newline terminates it — or, at
 *   `finish`, as the stream's last line, since a process is free to exit
 *   without a trailing newline.
 * - **Ordering is the order lines complete.** Records are appended to
 *   `events` and reported in that order, one report per record, so an
 *   observer sees the same sequence the process wrote.
 *
 * The first malformed line stops parsing but not counting: later lines
 * still advance the line counter, so the reported line number is the
 * offending line's real position in the stream, and no record after a
 * malformed one is reported (the run is going to fail on it anyway).
 */
function createNdjsonFramer(onRecord: () => ((events: unknown[]) => void) | undefined): NdjsonFramer {
  const events: unknown[] = []
  let carryOver = ''
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

  return {
    events,
    push: (text) => {
      if (text.length === 0) return
      carryOver += text
      const segments = carryOver.split('\n')
      // `split` always yields the text after the last newline as its final
      // element — an empty string when the chunk ended on a newline. That
      // element is the carry-over, and popping it is what keeps a partial
      // record out of the parser.
      carryOver = segments.pop() ?? ''
      for (const segment of segments) consumeLine(segment)
    },
    finish: () => {
      const trailing = carryOver
      carryOver = ''
      consumeLine(trailing)
      return malformed
    }
  }
}

/** The state one spawned process's streams accumulate into. */
export interface StreamReaderHandle {
  /** The stdout text, in the order it arrived. Kept for reporting; framing reads the framer's own carry-over, not this. */
  stdoutChunks: string[]
  stderrChunks: string[]
  /**
   * Called once per parsed record, live, as each record's line completes —
   * read from this field at call time, so a caller may replace it after
   * attach. Stored here (rather than passed to `finalizeEvents`) because
   * the process starts emitting the moment it is spawned, well before
   * anything waits on its exit.
   */
  onParsedEvents?: (events: unknown[]) => void
  /** Records parsed so far, in arrival order — complete only after `finalizeEvents`. */
  events: unknown[]
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
 */
export function attachStreamReader(
  child: SpawnedProcessLike,
  onParsedEvents?: (events: unknown[]) => void
): StreamReaderHandle {
  const framer = createNdjsonFramer(() => handle.onParsedEvents)

  const handle: StreamReaderHandle = {
    stdoutChunks: [],
    stderrChunks: [],
    onParsedEvents,
    events: framer.events,
    finishStdout: () => framer.finish()
  }

  child.stdout?.on('data', (chunk) => {
    const text = chunk.toString()
    if (text.length === 0) return
    handle.stdoutChunks.push(text)
    framer.push(text)
  })
  child.stderr?.on('data', (chunk) => handle.stderrChunks.push(chunk.toString()))

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
  return framer.events
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
  return reader.events
}
