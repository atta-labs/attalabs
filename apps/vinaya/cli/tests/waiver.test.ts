import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { positionalArgs, waiverCommand } from '../src/commands/waiver.js'

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

  // F2 regression (code-review REQUEST CHANGES, PR #713): a `--reason` value
  // that happens to look like a kind (`docs`/`review`) or a PR number (a bare
  // digit string) must never be silently consumed by the positional kind/PR
  // scan. `positionalArgs` is the exact mechanism that excludes `--reason`
  // (and its value token) before that scan runs — unit-tested directly here,
  // with no prompt/stdin involved.
  describe('positionalArgs (F2 fix)', () => {
    it('drops a value flag and its value token, leaving no positional candidates', () => {
      expect(positionalArgs(['--reason', 'docs', '--print-only'])).toEqual([])
      expect(positionalArgs(['--reason', 'review', '--print-only'])).toEqual([])
      expect(positionalArgs(['--reason', '42', '--print-only'])).toEqual([])
    })

    it('keeps a real positional candidate that appears outside --reason', () => {
      expect(positionalArgs(['review', '--reason', '42', '--print-only'])).toEqual(['review'])
      expect(positionalArgs(['--reason', 'docs', '5'])).toEqual(['5'])
    })

    it('handles the --reason=value form identically (no extra token consumed)', () => {
      expect(positionalArgs(['--reason=docs', '5', '--print-only'])).toEqual(['5'])
    })
  })

  describe('ambiguous --reason text never misbinds kind/PR-number (F2 fix)', () => {
    it('--reason docs: kind stays the real positional (review), reason stays "docs"', async () => {
      const out = await captureStdout(() => waiverCommand(['review', '456', '--reason', 'docs', '--print-only']))
      expect(out).toContain('gh pr edit 456 --add-label vinaya/waiver:review')
      expect(out).not.toContain('vinaya/waiver:docs')
      expect(out).toContain('Reason: docs')
    })

    it('--reason review: kind stays the real positional (docs), reason stays "review"', async () => {
      const out = await captureStdout(() => waiverCommand(['docs', '456', '--reason', 'review', '--print-only']))
      expect(out).toContain('gh pr edit 456 --add-label vinaya/waiver:docs')
      expect(out).not.toContain('vinaya/waiver:review')
      expect(out).toContain('Reason: review')
    })

    it('--reason 42: PR number stays the real positional (456), reason stays "42"', async () => {
      const out = await captureStdout(() => waiverCommand(['docs', '456', '--reason', '42', '--print-only']))
      expect(out).toContain('gh pr edit 456 --add-label vinaya/waiver:docs')
      expect(out).not.toContain('gh pr edit 42 ')
      expect(out).toContain('Reason: 42')
    })

    it('--reason 42, PR number given as a flag value only: still binds 456, never the reason digit-string', async () => {
      const out = await captureStdout(() => waiverCommand(['review', '--reason', '42', '456', '--print-only']))
      expect(out).toContain('gh pr edit 456 --add-label vinaya/waiver:review')
      expect(out).not.toContain('gh pr edit 42 ')
    })
  })
})
