import { existsSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  type AmendDepsDeps,
  type AmendDepsFlags,
  edgesEqual,
  locateBody,
  parseAmendArgs,
  parseEdgeFlag,
  resolveMilestoneToAttach,
  resolveShippableArgs,
  runAmendDeps,
  validateAmendFlags
} from './open-issue'

describe('locateBody', () => {
  it('reads --body-file <path> and records the file source with its arg index', () => {
    const dir = mkdtempSync(join(tmpdir(), 'open-issue-test-'))
    const p = join(dir, 'body.md')
    writeFileSync(p, 'hello from file', 'utf8')
    const result = locateBody(['--title', 't', '--body-file', p])
    expect(result).toEqual({
      body: 'hello from file',
      source: { kind: 'file', argIndex: 3, inlineForm: false }
    })
    rmSync(dir, { recursive: true, force: true })
  })

  it('reads -F <path> the same as --body-file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'open-issue-test-'))
    const p = join(dir, 'body.md')
    writeFileSync(p, 'short flag', 'utf8')
    const result = locateBody(['-F', p])
    expect(result?.body).toBe('short flag')
    expect(result?.source).toEqual({ kind: 'file', argIndex: 1, inlineForm: false })
    rmSync(dir, { recursive: true, force: true })
  })

  it('reads --body-file=<path> inline-equals form', () => {
    const dir = mkdtempSync(join(tmpdir(), 'open-issue-test-'))
    const p = join(dir, 'body.md')
    writeFileSync(p, 'equals form', 'utf8')
    const result = locateBody([`--body-file=${p}`])
    expect(result?.body).toBe('equals form')
    expect(result?.source).toEqual({ kind: 'file', argIndex: 0, inlineForm: true })
    rmSync(dir, { recursive: true, force: true })
  })

  it('reads --body/-b as an inline value, not a file source', () => {
    const result = locateBody(['--body', 'literal body text'])
    expect(result).toEqual({ body: 'literal body text', source: { kind: 'inline' } })
  })

  it('reads --body=<value> inline-equals form', () => {
    const result = locateBody(['--body=literal equals'])
    expect(result).toEqual({ body: 'literal equals', source: { kind: 'inline' } })
  })

  it('returns null when no body argument is present', () => {
    expect(locateBody(['--title', 'no body here'])).toBeNull()
  })
})

describe('resolveShippableArgs', () => {
  it('materializes a file-sourced body to a fresh temp file with identical bytes, and cleans it up', () => {
    const bodyResult = {
      body: 'validated content',
      source: { kind: 'file' as const, argIndex: 1, inlineForm: false }
    }
    const { finalArgs, cleanup } = resolveShippableArgs(['--body-file', '/some/original/path'], bodyResult)
    const shipPath = finalArgs[1] as string
    expect(shipPath).not.toBe('/some/original/path')
    expect(readFileSync(shipPath, 'utf8')).toBe('validated content')
    cleanup()
    expect(existsSync(shipPath)).toBe(false)
  })

  it('rewrites the --body-file=<path> inline-equals form to point at the temp file', () => {
    const bodyResult = {
      body: 'inline-equals content',
      source: { kind: 'file' as const, argIndex: 0, inlineForm: true }
    }
    const { finalArgs, cleanup } = resolveShippableArgs(['--body-file=/original/path'], bodyResult)
    expect(finalArgs[0]).toMatch(/^--body-file=/)
    const shipPath = (finalArgs[0] as string).slice('--body-file='.length)
    expect(shipPath).not.toBe('/original/path')
    expect(readFileSync(shipPath, 'utf8')).toBe('inline-equals content')
    cleanup()
    expect(existsSync(shipPath)).toBe(false)
  })

  it('leaves args untouched for an inline --body value — no temp file created', () => {
    const bodyResult = { body: 'inline body', source: { kind: 'inline' as const } }
    const original = ['--body', 'inline body']
    const { finalArgs, cleanup } = resolveShippableArgs(original, bodyResult)
    expect(finalArgs).toEqual(original)
    expect(finalArgs).toBe(original)
    expect(() => cleanup()).not.toThrow()
  })

  it('leaves args untouched when there is no body at all', () => {
    const original = ['--title', 'x']
    const { finalArgs, cleanup } = resolveShippableArgs(original, null)
    expect(finalArgs).toEqual(original)
    expect(() => cleanup()).not.toThrow()
  })
})

describe('stream body-file input (the live-fire bug: Issues #329/#330/#331, PRs #325/#332)', () => {
  it('ships the same bytes gh will re-read, even though the original source is gone by the time gh would re-read it', () => {
    // A real /dev/stdin subprocess reproduction is not portable across OSes
    // (confirmed: it throws ENXIO on Linux CI while working fine on macOS —
    // a platform difference in how a piped child stdin resolves that path,
    // not a Bun/Node difference this fix controls). Deleting the source file
    // immediately after the one validation read is a deterministic,
    // OS-independent stand-in for "this path is unreadable a second time" —
    // exactly the property a stream has (drained/EOF) that a regular file
    // does not. It proves the same invariant the bug report cares about:
    // the SHIPPED path must not depend on the original path still being
    // readable later, because for a stream it never is.
    const dir = mkdtempSync(join(tmpdir(), 'open-issue-stream-sim-'))
    const p = join(dir, 'body.md')
    const streamContent = 'this body came from a one-shot source, not a regular file\n'
    writeFileSync(p, streamContent, 'utf8')

    const bodyResult = locateBody(['--body-file', p])
    expect(bodyResult?.body).toBe(streamContent)

    const { finalArgs, cleanup } = resolveShippableArgs(['--body-file', p], bodyResult)
    const shipPath = finalArgs[1] as string

    // Simulate the stream being drained/gone: delete the original source
    // right after the one read that captured it, before gh would ever get
    // to re-read it.
    unlinkSync(p)

    // gh's own read of the SHIPPED path gets the full content, and
    // re-reading it again (idempotency check) still returns the same
    // content — it's a real, independent file now, not tied to the
    // original one-shot source.
    expect(readFileSync(shipPath, 'utf8')).toBe(streamContent)
    expect(readFileSync(shipPath, 'utf8')).toBe(streamContent)
    // The original path is genuinely gone — proving the fix does not
    // depend on it being re-readable (which is exactly what breaks for a
    // real stream, just via a different underlying mechanism: EOF instead
    // of ENOENT).
    expect(() => readFileSync(p, 'utf8')).toThrow()

    cleanup()
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('regular-file body-file input is unaffected by the fix', () => {
  it('ships identical content to what was validated, same as before the fix', () => {
    const dir = mkdtempSync(join(tmpdir(), 'open-issue-regular-file-'))
    const p = join(dir, 'body.md')
    const content = 'a perfectly ordinary regular-file PR/Issue body\n'
    writeFileSync(p, content, 'utf8')

    const bodyResult = locateBody(['--body-file', p])
    expect(bodyResult?.body).toBe(content)

    const { finalArgs, cleanup } = resolveShippableArgs(['--body-file', p], bodyResult)
    const shipPath = finalArgs[1] as string
    // The shipped path is a NEW temp file, not the original — but its
    // content matches exactly, and the original file is untouched/unaffected.
    expect(shipPath).not.toBe(p)
    expect(readFileSync(shipPath, 'utf8')).toBe(content)
    expect(readFileSync(p, 'utf8')).toBe(content)

    cleanup()
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('resolveMilestoneToAttach (aeg-review-gate-v1 task 1 follow-up)', () => {
  const activeLookup = vi.fn((slug: string) =>
    slug === 'aeg-review-gate-v1' ? { goal: '', lifecycle: 'active' as const } : null
  )

  it('attaches the slug when the label is present, an open Milestone matches, and no explicit --milestone was given', () => {
    const lookup = vi.fn().mockReturnValue({ goal: '', lifecycle: 'active' as const })
    const result = resolveMilestoneToAttach(['iteration:aeg-review-gate-v1', 'tier:1'], ['--title', 't'], false, lookup)
    expect(result).toBe('aeg-review-gate-v1')
    expect(lookup).toHaveBeenCalledWith('aeg-review-gate-v1')
  })

  it('returns null on edit — creation-time behavior only, never force-attaches retroactively', () => {
    const lookup = vi.fn().mockReturnValue({ goal: '', lifecycle: 'active' as const })
    const result = resolveMilestoneToAttach(['iteration:aeg-review-gate-v1'], ['--title', 't'], true, lookup)
    expect(result).toBeNull()
    expect(lookup).not.toHaveBeenCalled()
  })

  it('returns null when no iteration label is present — not a task Issue', () => {
    const lookup = vi.fn()
    const result = resolveMilestoneToAttach(['tier:1'], ['--title', 't'], false, lookup)
    expect(result).toBeNull()
    expect(lookup).not.toHaveBeenCalled()
  })

  it('returns null when the caller already passed an explicit --milestone flag', () => {
    const lookup = vi.fn()
    const result = resolveMilestoneToAttach(
      ['iteration:aeg-review-gate-v1'],
      ['--milestone', 'something-else'],
      false,
      lookup
    )
    expect(result).toBeNull()
    expect(lookup).not.toHaveBeenCalled()
  })

  it('returns null when the caller passed --milestone=<value> inline-equals form', () => {
    const lookup = vi.fn()
    const result = resolveMilestoneToAttach(['iteration:aeg-review-gate-v1'], ['--milestone=x'], false, lookup)
    expect(result).toBeNull()
    expect(lookup).not.toHaveBeenCalled()
  })

  it('returns null when no Milestone exists yet for the slug (not a hard failure)', () => {
    const lookup = vi.fn().mockReturnValue(null)
    const result = resolveMilestoneToAttach(['iteration:brand-new-iteration'], ['--title', 't'], false, lookup)
    expect(result).toBeNull()
  })

  it('returns null when a Milestone exists for the slug but is closed (complete, not active)', () => {
    const lookup = vi.fn().mockReturnValue({ goal: '', lifecycle: 'complete' as const })
    const result = resolveMilestoneToAttach(['iteration:aeg-forge-state-v1'], ['--title', 't'], false, lookup)
    expect(result).toBeNull()
  })

  it('uses the first iteration:<slug> label when multiple are somehow present', () => {
    const result = resolveMilestoneToAttach(
      ['iteration:aeg-review-gate-v1', 'iteration:other-iteration'],
      ['--title', 't'],
      false,
      activeLookup
    )
    expect(result).toBe('aeg-review-gate-v1')
  })
})

// ---------- amend-deps subcommand (Issue #481, drift class #1) ----------------

const BODY_429 = readFileSync(join(__dirname, '../../aeg-forge-state/src/fixtures/issue-429-body.md'), 'utf8')

describe('parseEdgeFlag', () => {
  it('splits a comma-joined value into trimmed ids', () => {
    expect(parseEdgeFlag('1, 2, aeg-x #3')).toEqual(['1', '2', 'aeg-x #3'])
  })
  it('treats every empty marker as no edges', () => {
    for (const marker of ['—', '–', '-', '', '  ']) expect(parseEdgeFlag(marker)).toEqual([])
  })
})

describe('edgesEqual', () => {
  it('is order-sensitive and length-sensitive', () => {
    expect(edgesEqual(['1', '2'], ['1', '2'])).toBe(true)
    expect(edgesEqual(['1', '2'], ['2', '1'])).toBe(false)
    expect(edgesEqual(['1'], ['1', '2'])).toBe(false)
    expect(edgesEqual([], [])).toBe(true)
  })
})

describe('parseAmendArgs', () => {
  it('parses the issue, both edge flags, note, actor, and dry-run', () => {
    const flags = parseAmendArgs([
      '481',
      '--depends-on',
      '1, 2',
      '--conflicts-with',
      '—',
      '--note',
      'why',
      '--actor',
      'Alice',
      '--dry-run'
    ])
    expect(flags).toEqual({
      issue: '481',
      dependsOn: ['1', '2'],
      conflictsWith: [],
      note: 'why',
      actor: 'Alice',
      dryRun: true
    })
  })
  it('leaves an unpassed edge field undefined (untouched)', () => {
    const flags = parseAmendArgs(['481', '--conflicts-with', '3', '--note', 'x'])
    expect(flags.dependsOn).toBeUndefined()
    expect(flags.conflictsWith).toEqual(['3'])
  })
  it('supports the --flag=value form', () => {
    const flags = parseAmendArgs(['481', '--depends-on=4,5', '--note=y'])
    expect(flags.dependsOn).toEqual(['4', '5'])
    expect(flags.note).toBe('y')
  })
})

describe('validateAmendFlags', () => {
  const base: AmendDepsFlags = { issue: '481', note: 'why', actor: 'Planner', dryRun: false }
  it('refuses when neither edge flag is present', () => {
    expect(validateAmendFlags(base)).toMatch(/at least one of/)
  })
  it('refuses an empty note', () => {
    expect(validateAmendFlags({ ...base, dependsOn: ['1'], note: '   ' })).toMatch(/non-empty `--note`/)
  })
  it('refuses a missing issue', () => {
    expect(validateAmendFlags({ ...base, issue: null, dependsOn: ['1'] })).toMatch(/target Issue number/)
  })
  it('accepts a well-formed flag set', () => {
    expect(validateAmendFlags({ ...base, dependsOn: ['1'] })).toBeNull()
  })
})

function makeDeps(overrides: Partial<AmendDepsDeps> = {}): {
  deps: AmendDepsDeps
  edited: Array<{ issue: string; body: string }>
  logs: string[]
} {
  const edited: Array<{ issue: string; body: string }> = []
  const logs: string[] = []
  const deps: AmendDepsDeps = {
    fetchLabels: () => ['iteration:aeg-forge-state-v1', 'tier:1'],
    fetchBody: () => BODY_429,
    editBody: (issue, body) => edited.push({ issue, body }),
    today: () => '2026-07-13',
    log: (m) => logs.push(m),
    fail: (m) => {
      throw new Error(m)
    },
    ...overrides
  }
  return { deps, edited, logs }
}

describe('runAmendDeps', () => {
  it('refuses when the target is not a task Issue (no iteration:* label)', () => {
    const { deps, edited } = makeDeps({ fetchLabels: () => ['tier:1'] })
    expect(() => runAmendDeps(parseAmendArgs(['429', '--depends-on', '2', '--note', 'x']), deps)).toThrow(
      /targets task Issues only/
    )
    expect(edited).toHaveLength(0)
  })

  it('refuses a missing --note (flag validation) with no forge write', () => {
    const { deps, edited } = makeDeps()
    expect(() => runAmendDeps(parseAmendArgs(['429', '--depends-on', '2']), deps)).toThrow(/non-empty `--note`/)
    expect(edited).toHaveLength(0)
  })

  it('refuses on a round-trip mismatch and writes nothing (the gate, on real data)', () => {
    // `aeg-governance-hardening #368, 5` — the bare `5` inherits the qualifier
    // on parse (→ `aeg-governance-hardening 5`), so the read-back != requested.
    const { deps, edited } = makeDeps()
    expect(() =>
      runAmendDeps(parseAmendArgs(['429', '--depends-on', 'aeg-governance-hardening #368, 5', '--note', 'x']), deps)
    ).toThrow(/round-trip FAILED for Depends-on/)
    expect(edited).toHaveLength(0)
  })

  it('dry-run prints the body + round-trip PASS and performs NO forge write', () => {
    const { deps, edited, logs } = makeDeps()
    runAmendDeps(parseAmendArgs(['429', '--depends-on', '2, 3', '--note', 'Task 3 dropped.', '--dry-run']), deps)
    expect(edited).toHaveLength(0)
    expect(logs).toContain('round-trip PASS')
    expect(logs.some((l) => l.includes('`Depends-on: 2, 3`'))).toBe(true)
  })

  it('a real run ships the amended body once and logs the edge change', () => {
    const { deps, edited, logs } = makeDeps()
    runAmendDeps(parseAmendArgs(['429', '--depends-on', '2, 3', '--note', 'Task 3 dropped.']), deps)
    expect(edited).toHaveLength(1)
    expect(edited[0]?.issue).toBe('429')
    expect(edited[0]?.body).toContain('**Amendment (2026-07-13, Planner)')
    expect(logs.some((l) => l.includes('Depends-on: [1, 3a, 3b] → [2, 3]'))).toBe(true)
  })
})
