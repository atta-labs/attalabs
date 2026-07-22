// Interactive stdin reader ported from Cetana's `apps/cetana-ai/cli/src/
// commands/init.ts` (deleted with apps/cetana-ai in #638; recovered from git
// history). The abort discipline is the point: when the user declines a
// confirmation the command MUST call `closeStdin()` (which runs
// `process.stdin.destroy()`), or the resumed stdin stream keeps the event
// loop alive and the process hangs — Cetana PR #43's regression.
//
// The shared line buffer survives across `prompt()` calls so piped input
// (`printf 'y\n' | vinaya init`) is not lost between reads.

let stdinBuffer = ''
let stdinEnded = false
const pendingResolvers: Array<(line: string) => void> = []
let reading = false

function flushLines(): void {
  while (stdinBuffer.includes('\n') && pendingResolvers.length > 0) {
    const idx = stdinBuffer.indexOf('\n')
    const line = stdinBuffer.slice(0, idx).trim()
    stdinBuffer = stdinBuffer.slice(idx + 1)
    pendingResolvers.shift()?.(line)
  }
  // stdin ended with a trailing partial line (no newline): flush it once.
  if (stdinEnded && stdinBuffer.length > 0 && pendingResolvers.length > 0) {
    const line = stdinBuffer.trim()
    stdinBuffer = ''
    pendingResolvers.shift()?.(line)
  }
  // stdin ended with nothing left: resolve every remaining waiter with '' so
  // callers fall through to their defaults instead of hanging forever.
  if (stdinEnded) {
    while (pendingResolvers.length > 0) pendingResolvers.shift()?.('')
  }
}

function setupStdinReader(): void {
  if (reading) return
  reading = true
  process.stdin.setEncoding('utf-8')
  process.stdin.on('data', (chunk: string) => {
    stdinBuffer += chunk
    flushLines()
  })
  process.stdin.on('end', () => {
    stdinEnded = true
    flushLines()
  })
  process.stdin.resume()
}

/** Ask a question on stdout, resolve with the trimmed answer line. */
export function prompt(question: string): Promise<string> {
  process.stdout.write(question)
  setupStdinReader()
  if (stdinEnded && pendingResolvers.length === 0) return Promise.resolve('')
  return new Promise((resolve) => {
    pendingResolvers.push(resolve)
    if (stdinEnded) flushLines()
  })
}

/** Yes/no prompt. Empty answer takes `defaultYes`. */
export async function promptYesNo(question: string, defaultYes = false): Promise<boolean> {
  const hint = defaultYes ? 'Y/n' : 'y/N'
  const answer = await prompt(`${question} (${hint}): `)
  if (answer.length === 0) return defaultYes
  return answer.toLowerCase().startsWith('y')
}

/**
 * Release stdin so the process can exit cleanly. MUST be called on every exit
 * path that opened a prompt — including the abort path — or the resumed stream
 * keeps the event loop alive and the CLI hangs (Cetana PR #43).
 */
export function closeStdin(): void {
  if (reading) {
    process.stdin.destroy()
    reading = false
  }
}

/** Test-only: reset the module-level buffer between cases. */
export function __resetStdinForTest(): void {
  stdinBuffer = ''
  stdinEnded = false
  pendingResolvers.length = 0
  reading = false
}
