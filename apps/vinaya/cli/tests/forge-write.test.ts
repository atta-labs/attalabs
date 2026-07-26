import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { BriefSection } from '../src/lib/config'
import {
  ForgeArgError,
  extractLabels,
  extractTitle,
  locateBody,
  resolveShippableArgs,
  validateForgeWrite
} from '../src/lib/forge-write'

const FORGE_FIXTURES = join(import.meta.dir, 'fixtures', 'forge')
const validPr = readFileSync(join(FORGE_FIXTURES, 'pr-valid.md'), 'utf8')
const noTierPr = readFileSync(join(FORGE_FIXTURES, 'pr-no-tier.md'), 'utf8')
const noRationaleIssue = readFileSync(join(FORGE_FIXTURES, 'issue-no-rationale.md'), 'utf8')
const validIssue = readFileSync(join(FORGE_FIXTURES, 'issue-valid.md'), 'utf8')

const PR_SECTIONS: BriefSection[] = [
  { builtin: 'tier' },
  { builtin: 'testPlan' },
  { builtin: 'testPlanExclusivity' },
  { builtin: 'principalPlaceholder' },
  { builtin: 'surfaceMap' },
  { builtin: 'docUpdateList' },
  { builtin: 'worktreeStep0' },
  { builtin: 'stopConditions' },
  { builtin: 'autonomyClause' },
  { builtin: 'project' },
  { builtin: 'for' },
  { builtin: 'closesN' },
  { builtin: 'premiseCoverage' }
]

const base = {
  title: null,
  changedFiles: [] as string[],
  retryCommand: 'vinaya pr create --validate-only …'
}

describe('validateForgeWrite — brief-schema gate', () => {
  it('passes a fully-formed PR body against the full built-in section set', () => {
    const errors = validateForgeWrite({ ...base, body: validPr, sections: PR_SECTIONS })
    expect(errors).toEqual([])
  })

  it('refuses a PR body missing only Tier with exactly one finding', () => {
    const errors = validateForgeWrite({ ...base, body: noTierPr, sections: PR_SECTIONS })
    expect(errors.length).toBe(1)
    const [e] = errors
    expect(e?.check).toBe('brief-schema')
    expect(e?.schema).toBe(1)
    // The recovery prompt names the corrective command, and is NOT the diagnosis restated.
    expect(e?.agent_recovery_prompt).toContain('vinaya pr create')
    expect(e?.agent_recovery_prompt).not.toBe(e?.message)
  })

  it('emits one finding per missing rationale field for a task Issue', () => {
    const errors = validateForgeWrite({
      ...base,
      body: noRationaleIssue,
      sections: [{ builtin: 'issueRationale' }],
      retryCommand: 'vinaya issue create --validate-only …'
    })
    expect(errors.length).toBe(8)
    for (const e of errors) {
      expect(e.check).toBe('brief-schema')
      expect(e.agent_recovery_prompt).toContain('vinaya issue create')
    }
  })

  it('passes a task Issue carrying the full eight-field rationale', () => {
    const errors = validateForgeWrite({
      ...base,
      body: validIssue,
      sections: [{ builtin: 'issueRationale' }]
    })
    expect(errors).toEqual([])
  })

  it('refuses a body lacking an adopter-defined custom heading section', () => {
    const errors = validateForgeWrite({
      ...base,
      body: validPr,
      sections: [{ heading: 'Rollback Plan' }]
    })
    expect(errors.length).toBe(1)
    expect(errors[0]?.message).toContain('Rollback Plan')
    expect(errors[0]?.agent_recovery_prompt).toContain('Rollback Plan')
  })

  it('passes a body that carries the custom heading', () => {
    const withHeading = `${validPr}\n\n## Rollback Plan\n\nRevert the branch.\n`
    const errors = validateForgeWrite({ ...base, body: withHeading, sections: [{ heading: 'Rollback Plan' }] })
    expect(errors).toEqual([])
  })

  it('validates title grammar when a title is present', () => {
    const good = validateForgeWrite({ ...base, body: validPr, sections: [], title: 'Feat: valid title' })
    expect(good).toEqual([])
    const bad = validateForgeWrite({ ...base, body: validPr, sections: [], title: 'not a valid title' })
    expect(bad.length).toBe(1)
    expect(bad[0]?.check).toBe('forge-title')
  })

  it('premiseCoverage passes trivially when no files changed, fails when a surface is unpinned', () => {
    const empty = validateForgeWrite({ ...base, body: validPr, sections: [{ builtin: 'premiseCoverage' }] })
    expect(empty).toEqual([])
    const unpinned = validateForgeWrite({
      ...base,
      body: validPr,
      sections: [{ builtin: 'premiseCoverage' }],
      changedFiles: ['src/thing.ts']
    })
    expect(unpinned.length).toBe(1)
  })
})

describe('same-bytes body plumbing', () => {
  it('reads an inline --body value without touching disk', () => {
    const r = locateBody(['--title', 't', '--body', 'hello'])
    expect(r?.body).toBe('hello')
    expect(r?.source.kind).toBe('inline')
  })

  it('reads a --body-file path once and records the slot', () => {
    const path = join(FORGE_FIXTURES, 'pr-valid.md')
    const r = locateBody(['--body-file', path])
    expect(r?.body).toBe(validPr)
    expect(r?.source).toEqual({ kind: 'file', argIndex: 1, inlineForm: false })
  })

  it('throws ForgeArgError on --body-file with no path', () => {
    expect(() => locateBody(['--body-file'])).toThrow(ForgeArgError)
  })

  it('returns null when no body flag is present', () => {
    expect(locateBody(['--title', 't'])).toBeNull()
  })

  it('materializes the buffered body and rewrites the file slot to the same bytes', () => {
    const path = join(FORGE_FIXTURES, 'pr-valid.md')
    const args = ['--body-file', path]
    const bodyResult = locateBody(args)
    const { finalArgs, cleanup } = resolveShippableArgs(args, bodyResult)
    try {
      const rewritten = finalArgs[1] as string
      expect(rewritten).not.toBe(path)
      expect(readFileSync(rewritten, 'utf8')).toBe(validPr)
    } finally {
      cleanup()
    }
  })

  it('leaves inline-body args untouched (no temp file)', () => {
    const args = ['--body', 'hello']
    const bodyResult = locateBody(args)
    const { finalArgs } = resolveShippableArgs(args, bodyResult)
    expect(finalArgs).toEqual(args)
  })
})

describe('arg extraction', () => {
  it('extracts a title from both flag forms', () => {
    expect(extractTitle(['--title', 'x'])).toBe('x')
    expect(extractTitle(['--title=y'])).toBe('y')
    expect(extractTitle(['--body', 'b'])).toBeNull()
  })

  it('collects comma-separated and repeated labels', () => {
    expect(extractLabels(['--label', 'a,b', '--label', 'c'])).toEqual(['a', 'b', 'c'])
    expect(extractLabels(['--label=vinaya/iteration:demo'])).toEqual(['vinaya/iteration:demo'])
  })
})
