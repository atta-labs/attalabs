import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { locateBody, resolveShippableArgs } from './open-issue'

const MODULE_PATH = join(import.meta.dirname, 'open-issue.ts')

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
  it('ships the same bytes gh will re-read, even though the original stream path cannot be safely re-read', () => {
    // Reproduces the exact failure mode: a non-seekable --body-file source
    // (/dev/stdin) is fully consumed by the FIRST read (this process's own
    // validation read). Before the fix, gh's own SEPARATE read of that same
    // path is what shipped empty. This fixture proves the shipped path
    // (finalArgs) carries the buffered bytes, and is unaffected by whatever
    // happens to the original stream on a second access.
    const fixtureDir = mkdtempSync(join(tmpdir(), 'open-issue-stream-fixture-'))
    const fixturePath = join(fixtureDir, 'repro.ts')
    writeFileSync(
      fixturePath,
      `
import { readFileSync } from 'node:fs'
const { locateBody, resolveShippableArgs } = await import(${JSON.stringify(MODULE_PATH)})
const bodyResult = locateBody(['--body-file', '/dev/stdin'])
const { finalArgs, cleanup } = resolveShippableArgs(['--body-file', '/dev/stdin'], bodyResult)
const shipPath = finalArgs[1]
const firstReadOfShipped = readFileSync(shipPath, 'utf8')
const secondReadOfShipped = readFileSync(shipPath, 'utf8')
let secondReadOfOriginalStream
try {
  secondReadOfOriginalStream = readFileSync('/dev/stdin', 'utf8')
} catch (e) {
  secondReadOfOriginalStream = '<threw: ' + e.message + '>'
}
console.log(JSON.stringify({
  bodyFromLocate: bodyResult ? bodyResult.body : null,
  firstReadOfShipped,
  secondReadOfShipped,
  secondReadOfOriginalStream
}))
cleanup()
`,
      'utf8'
    )

    const streamContent = 'this body came from a stream, not a regular file\n'
    const out = execFileSync('bun', [fixturePath], { input: streamContent, encoding: 'utf8' })
    const result = JSON.parse(out.trim())

    // The validated content (what the rationale/title gates saw) is exactly
    // the stream's content — this is the one and only read of the original path.
    expect(result.bodyFromLocate).toBe(streamContent)
    // gh's own read of the SHIPPED path (finalArgs) gets the full content,
    // and re-reading it again (idempotency check) still returns the same
    // content — it's a regular file now, not a one-shot stream.
    expect(result.firstReadOfShipped).toBe(streamContent)
    expect(result.secondReadOfShipped).toBe(streamContent)
    // A second, independent read of the ORIGINAL stream path does NOT
    // reliably return the validated content (empty string or a read error,
    // depending on environment) — this is the mechanism of the reported bug,
    // and proves the fix does not depend on the original path being re-readable.
    expect(result.secondReadOfOriginalStream).not.toBe(streamContent)

    rmSync(fixtureDir, { recursive: true, force: true })
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
