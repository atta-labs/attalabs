/**
 * @file stream-reader.ts
 * @description Accumulates an agent-spawn node's stdout/stderr and parses
 * the buffered stdout as newline-delimited JSON. Split out of
 * `node-executor.ts` so this concern — capturing and interpreting the
 * spawned process's structured output — has no knowledge of how the
 * process itself was spawned, timed out, or killed (`process-lifecycle.ts`).
 */

import type { SpawnedProcessLike } from './process-lifecycle'

/** The buffers one spawned process's stdout/stderr accumulate into, in order. */
export interface StreamReaderHandle {
  stdoutChunks: string[]
  stderrChunks: string[]
  /**
   * Stored at attach time, not called incrementally today — see
   * `attachStreamReader`. A future task makes event observation live by
   * editing only this file: read this field from inside the `stdout`
   * listener below instead of only at `finalizeEvents` time.
   */
  onParsedEvents?: (events: unknown[]) => void
}

/**
 * Calls `onParsedEvents`, if supplied, and swallows anything it throws. An
 * observer's own bug must never corrupt the run it is merely watching —
 * mirrors `graph-builder.ts`'s `safeEmit` for the same reason, kept local
 * here since this package's two node-execution files intentionally share
 * no runtime import between them.
 */
function safeEmitParsedEvents(onParsedEvents: ((events: unknown[]) => void) | undefined, events: unknown[]): void {
  if (!onParsedEvents) return
  try {
    onParsedEvents(events)
  } catch {
    // Deliberately swallowed — see the function doc above.
  }
}

/**
 * Attaches `data` listeners to the given process's stdout/stderr and
 * returns the buffers they accumulate into. Must be called before the
 * caller starts waiting on the process's exit, or early output could arrive
 * with no listener yet attached to catch it.
 *
 * `onParsedEvents` is accepted here — at attach time — rather than only at
 * `finalizeEvents` time, so a future task that makes emission live only
 * ever has to change what happens inside this function's `stdout` listener
 * (read `reader.onParsedEvents` there instead of waiting for
 * `finalizeEvents`), never the composer's call site.
 */
export function attachStreamReader(
  child: SpawnedProcessLike,
  onParsedEvents?: (events: unknown[]) => void
): StreamReaderHandle {
  const stdoutChunks: string[] = []
  const stderrChunks: string[] = []
  child.stdout?.on('data', (chunk) => stdoutChunks.push(chunk.toString()))
  child.stderr?.on('data', (chunk) => stderrChunks.push(chunk.toString()))
  return { stdoutChunks, stderrChunks, onParsedEvents }
}

/**
 * Parses the process's stdout as newline-delimited JSON. Throws naming the
 * offending line rather than falling back to prose-scraping — a candidate
 * agent with no structured output mode is a reporting concern, not
 * something this function silently works around.
 */
export function parseNdjson(raw: string, nodeId: string): unknown[] {
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  return lines.map((line, index) => {
    try {
      return JSON.parse(line)
    } catch {
      throw new Error(
        `Agent-spawn node '${nodeId}' produced non-JSON output on line ${index + 1} of its structured stream: ${line.slice(0, 200)}`
      )
    }
  })
}

/**
 * Parses a reader's fully-buffered stdout into structured events and
 * reports them via the reader's stored `onParsedEvents`, called exactly
 * once with the whole array — matching today's behavior, where the caller
 * only ever sees events after the process has already closed. Inert seam:
 * a future task makes event observation live (called incrementally, as
 * each line arrives) by editing only this file — the composer that calls
 * this function never changes.
 */
export function finalizeEvents(reader: StreamReaderHandle, nodeId: string): unknown[] {
  const events = parseNdjson(reader.stdoutChunks.join(''), nodeId)
  safeEmitParsedEvents(reader.onParsedEvents, events)
  return events
}
