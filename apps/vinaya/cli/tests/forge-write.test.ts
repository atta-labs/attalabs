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
    expect(extractLabels(['--label=vinaya/tranche:demo'])).toEqual(['vinaya/tranche:demo'])
  })
})

// The authoring-time gate must apply the SAME branch grammar the
// CI-time gate (`checks/bin/check-brief-shape.ts`) already applies. Before
// this, `pr create` graded every branch as a task branch and refused a
// non-task PR that CI would pass — one grammar, two enforcement points,
// disagreeing. Live repro: `vinaya pr create` on `chore/vinaya-upgrade-0.4.5`
// refused with "Closes #N: no `Closes #<N>` ... found in the PR body".
describe('validateForgeWrite — branch grammar', () => {
  // A body carrying ≥2 brief-shape markers, so it is graded as a brief and the
  // non-brief-shaped bypass below cannot be what makes these cases pass.
  const briefShapedNoCloses = [
    '**For:** Claude',
    '**Project:** demo',
    '**Tier:** 0',
    '',
    '## Technical surface map',
    '- a.ts',
    '',
    '## Documentation-update list',
    '- None',
    '',
    '## Stop conditions',
    'STOP if x.',
    '',
    '## Test plan',
    'Test Plan: unit-tests-only',
    '',
    '> **Autonomy:** Do not stop to ask clarifying questions. Choose the most reasonable option and continue.',
    '',
    '```',
    'git worktree add .worktrees/x -b x origin/main',
    '```'
  ].join('\n')

  const closesOnly: BriefSection[] = [{ builtin: 'closesN' }]

  it('requires Closes #N on a task branch', () => {
    const errors = validateForgeWrite({
      ...base,
      body: briefShapedNoCloses,
      sections: closesOnly,
      branch: 'task/some-tranche/2'
    })
    expect(errors.length).toBe(1)
    expect(errors[0]?.message).toContain('Closes #')
  })

  it('does NOT require Closes #N on a non-task branch — the regression this fixes', () => {
    const errors = validateForgeWrite({
      ...base,
      body: briefShapedNoCloses,
      sections: closesOnly,
      branch: 'chore/vinaya-upgrade-0.4.5'
    })
    expect(errors).toEqual([])
  })

  it('stays fail-closed when the branch is unresolvable (empty or omitted)', () => {
    // Outside a repo — behaviour must be byte-identical to pre-change, so an
    // unknown branch never silently relaxes a gate.
    const empty = validateForgeWrite({ ...base, body: briefShapedNoCloses, sections: closesOnly, branch: '' })
    const omitted = validateForgeWrite({ ...base, body: briefShapedNoCloses, sections: closesOnly })
    expect(empty.length).toBe(1)
    expect(omitted.length).toBe(1)
  })

  it("treats the literal 'HEAD' as unresolvable, not as a non-task branch", () => {
    // The detached-HEAD fail-open, caught in review: `git rev-parse
    // --abbrev-ref HEAD` prints the literal string `HEAD` (exit 0) rather
    // than an empty string, so the first cut of this change read a detached
    // HEAD as a resolvable non-task branch and skipped EVERY section — the
    // exact fail-open the branch grammar exists to prevent. `pr create` now
    // resolves via `symbolic-ref --quiet --short`, which yields '' when
    // detached; this pins the runner's own half so a future call site that
    // reintroduces the sentinel cannot silently relax the gate.
    //
    // Lossless by construction: git refuses to create a branch named `HEAD`
    // (`git check-ref-format --branch HEAD` fails), so mapping it to
    // unresolvable can never swallow a real branch.
    const asHead = validateForgeWrite({
      ...base,
      body: briefShapedNoCloses,
      sections: closesOnly,
      branch: 'HEAD'
    })
    expect(asHead.length).toBe(1)

    // And the total bypass must not be reachable via the sentinel either.
    const bypassAttempt = validateForgeWrite({
      ...base,
      body: '## Summary\nBump a dependency.',
      sections: PR_SECTIONS,
      branch: 'HEAD'
    })
    expect(bypassAttempt.length).toBeGreaterThan(0)
  })

  it('bypasses every section for a non-task branch whose body is not brief-shaped', () => {
    // The ordinary one-line dependency-bump PR: no brief, must not be forced
    // to grow one. Mirrors check-brief-shape.ts's identical bypass.
    const errors = validateForgeWrite({
      ...base,
      body: '## Summary\nBump a dependency.',
      sections: PR_SECTIONS,
      branch: 'chore/bump-dep'
    })
    expect(errors).toEqual([])
  })

  it('still grades a brief-shaped body on a non-task branch (bypass is not a blanket skip)', () => {
    // `fix/studio-tranche-href`'s failure mode: a standalone fix brief IS a
    // brief, so its sections are still enforced — only Closes #N is dropped.
    const errors = validateForgeWrite({
      ...base,
      body: briefShapedNoCloses,
      sections: [{ builtin: 'tier' }, { builtin: 'project' }, { builtin: 'docUpdateList' }],
      branch: 'fix/some-standalone-fix'
    })
    expect(errors).toEqual([])

    const missingDocList = validateForgeWrite({
      ...base,
      body: briefShapedNoCloses.replace('## Documentation-update list\n- None\n', ''),
      sections: [{ builtin: 'docUpdateList' }],
      branch: 'fix/some-standalone-fix'
    })
    expect(missingDocList.length).toBe(1)
  })

  it('grammar-checks the title regardless of branch', () => {
    // The title gate binds on every branch — it sits outside the bypass.
    const errors = validateForgeWrite({
      ...base,
      body: '## Summary\nBump a dependency.',
      sections: [],
      title: 'not a valid title',
      branch: 'chore/bump-dep'
    })
    expect(errors.length).toBe(1)
    expect(errors[0]?.check).toBe('forge-title')
  })
})
