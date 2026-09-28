/**
 * @file reason-text.ts
 * @description The one treatment every caller-supplied reason string gets
 * before this package embeds it in a message it throws, records on an error,
 * or lets a checkpoint store persist.
 *
 * **Why this is a file of its own.** Two seams take a reason from a caller,
 * and neither is the other's caller: `process-lifecycle.ts` reads the string
 * a caller passed to `abort()`, and `run-halt.ts` takes the one a caller
 * passed to `halt()`. Both interpolate it into an error message that outlives
 * the process, so both need the same treatment — and a second copy beside the
 * first is how the two drift, one gaining a bound the other never got. Neither
 * file is the natural home for the shared function: a halt reason is not a
 * cancellation, and the control surface should not have to reach into the
 * process layer for a string helper. So the treatment lives here and both
 * import it.
 */

/**
 * The longest caller-supplied reason carried into a message. Generous enough
 * for a real sentence, short enough that no single reason can dominate a log
 * line or a stored error.
 */
export const MAX_REASON_TEXT_LENGTH = 200

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
 * Two treatments, each closing a distinct abuse of that path. Control
 * characters — newlines above all — are collapsed to single spaces, because a
 * reason carrying `\n` can forge additional log records or terminate a line
 * early in any consumer that treats one line as one event, and a `\r` can
 * overwrite what was already written to a terminal. And the whole thing is
 * length-bounded, because nothing upstream bounds it: `abort()` and `halt()`
 * both accept a string of any size, and this one is re-serialized into every
 * checkpoint write the thread makes afterwards.
 *
 * Sanitizing at each entry point rather than only at the interpolation site is
 * deliberate: those are the two points where a caller's reason enters the
 * package, so the value stored on `ProcessCancelledError.cancellationReason`
 * and on `RunControl.haltReason` is the safe one too, and a consumer that
 * renders either field instead of the message is covered without having to
 * know it needed to be.
 */
export function sanitizeReasonText(raw: string): string {
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
  const collapsed = out.trim()
  if (collapsed.length <= MAX_REASON_TEXT_LENGTH) return collapsed
  // The bound is in UTF-16 code units, but the cut must fall between code
  // points: a supplementary-plane character (an emoji, a CJK extension
  // ideograph) whose high surrogate sits at the boundary would otherwise be
  // sliced in half, leaving an unpaired surrogate in the stored reason and in
  // the thrown message — which every consumer downstream re-serializes, and
  // `JSON.stringify` and a UTF-8 checkpoint write both render as a replacement
  // character or mangled bytes. Dropping the orphaned half keeps the bound
  // (the result is never longer) and keeps the string well-formed.
  const cut = collapsed.slice(0, MAX_REASON_TEXT_LENGTH)
  const lastUnit = cut.charCodeAt(cut.length - 1)
  const wholeCodePoints = lastUnit >= 0xd800 && lastUnit <= 0xdbff ? cut.slice(0, -1) : cut
  return `${wholeCodePoints}…`
}
