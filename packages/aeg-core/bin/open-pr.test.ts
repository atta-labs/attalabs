import { existsSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { locateBody, resolveShippableArgs } from './open-pr'

describe('locateBody', () => {
  it('reads --body-file <path> and records the file source with its arg index', () => {
    const dir = mkdtempSync(join(tmpdir(), 'open-pr-test-'))
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
    const dir = mkdtempSync(join(tmpdir(), 'open-pr-test-'))
    const p = join(dir, 'body.md')
    writeFileSync(p, 'short flag', 'utf8')
    const result = locateBody(['-F', p])
    expect(result?.body).toBe('short flag')
    expect(result?.source).toEqual({ kind: 'file', argIndex: 1, inlineForm: false })
    rmSync(dir, { recursive: true, force: true })
  })

  it('reads --body-file=<path> inline-equals form', () => {
    const dir = mkdtempSync(join(tmpdir(), 'open-pr-test-'))
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
    const dir = mkdtempSync(join(tmpdir(), 'open-pr-stream-sim-'))
    const p = join(dir, 'body.md')
    const streamContent = 'this PR body came from a one-shot source, not a regular file\n'
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
    const dir = mkdtempSync(join(tmpdir(), 'open-pr-regular-file-'))
    const p = join(dir, 'body.md')
    const content = 'a perfectly ordinary regular-file PR body\n'
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
