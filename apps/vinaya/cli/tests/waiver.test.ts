import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { waiverCommand } from '../src/commands/waiver.js'

/**
 * A fake `gh` on PATH — logs every invocation's argv to `logPath` and, for
 * `gh pr view`, echoes a canned PR number. Lets the tests prove the real
 * shape of what waiver.ts shells out to without touching a real forge.
 */
function fakeGhScript(logPath: string, prNumber: string): string {
  return `#!/usr/bin/env sh
echo "$@" >> "${logPath}"
if [ "$1" = "pr" ] && [ "$2" = "view" ]; then
  echo "${prNumber}"
fi
exit 0
`
}

let binDir: string
let logPath: string
let originalPath: string | undefined

function installFakeGh(prNumber = '123'): void {
  binDir = join(tmpdir(), `vinaya-waiver-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(binDir, { recursive: true })
  logPath = join(binDir, 'gh.log')
  writeFileSync(logPath, '')
  writeFileSync(join(binDir, 'gh'), fakeGhScript(logPath, prNumber), { mode: 0o755 })
  originalPath = process.env.PATH
  process.env.PATH = `${binDir}:${originalPath ?? ''}`
}

function ghLog(): string {
  return readFileSync(logPath, 'utf-8')
}

/** Capture process.stdout.write output during `fn`, returning the output. */
async function captureStdout(fn: () => Promise<unknown>): Promise<string> {
  const original = process.stdout.write.bind(process.stdout)
  let buf = ''
  process.stdout.write = ((chunk: string) => {
    buf += chunk
    return true
  }) as typeof process.stdout.write
  try {
    await fn()
  } finally {
    process.stdout.write = original
  }
  return buf
}

beforeEach(() => {
  installFakeGh()
})

afterEach(() => {
  process.env.PATH = originalPath
  rmSync(binDir, { recursive: true, force: true })
})

describe('vinaya waiver', () => {
  it('--print-only prints the exact gh commands and never invokes gh', async () => {
    const out = await captureStdout(() =>
      waiverCommand(['docs', '456', '--reason', 'legacy doc genuinely out of scope', '--print-only'])
    )

    expect(out).toContain('--print-only')
    expect(out).toContain('gh pr edit 456 --add-label vinaya/waiver:docs')
    expect(out).toContain('gh pr comment 456 --body')
    expect(ghLog()).toBe('') // no gh mutation call fired
  })

  it('applies the label and posts the reason as a PR comment for real (non-print-only)', async () => {
    await captureStdout(() => waiverCommand(['review', '789', '--reason', 'reviewed manually, waiving CI re-run']))

    const log = ghLog()
    expect(log).toContain('pr edit 789 --add-label vinaya/waiver:review')
    expect(log).toContain('pr comment 789 --body Waiver applied: `vinaya/waiver:review`')
    expect(log).toContain('reviewed manually, waiving CI re-run')
  })

  it('auto-detects the PR number via `gh pr view` when none is given', async () => {
    rmSync(binDir, { recursive: true, force: true })
    installFakeGh('999')

    const out = await captureStdout(() => waiverCommand(['docs', '--reason', 'auto-detected PR', '--print-only']))

    expect(out).toContain('gh pr edit 999 --add-label vinaya/waiver:docs')
    expect(ghLog()).toContain('pr view')
  })

  it('never applies a review waiver when docs was requested, and vice versa', async () => {
    const out = await captureStdout(() => waiverCommand(['review', '5', '--reason', 'x', '--print-only']))
    expect(out).toContain('vinaya/waiver:review')
    expect(out).not.toContain('vinaya/waiver:docs')
  })
})
