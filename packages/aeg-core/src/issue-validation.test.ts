import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { amendRationaleDeps, projectsFromBody } from '@atta/aeg-forge-state'
import { describe, expect, it } from 'vitest'
import { fenceShapes } from './fixtures/fence-shapes'
import {
  checkBlastRadiusScope,
  checkConflictCompleteness,
  checkIssueRationale,
  checkNoBriefContent,
  checkProjectsRegistered,
  checkRationaleNamesDocs,
  declaredProjects,
  isTaskIssueLabelSet,
  type TaskIssueFacts
} from './issue-validation'

// Bold-inline style, as on Issue #309.
const BOLD_STYLE = `
**Tranche:** aeg-governance-hardening · **Task:** 5d · **Project(s):** aeg

## Planner's rationale

**Boundary** — What this task is and is not.

**Sizing** — Passes all four tests.

**Project(s) + blast radius** — aeg, aeg-core.

**Dependency rationale** — No depends-on.

**Traps to avoid** — Do not do X.

**Suggested agent-class** — high.

**Stop-and-escalate** — If Y happens, stop.

**Docs to keep coherent** — state-machine.md §12.
`

// Heading style, as on Issue #219.
const HEADING_STYLE = `
### Boundary

The flow derives the list.

### Sizing

Small-medium.

### Project(s) + blast radius

aeg only.

**Dependency rationale** — Depends on task 3.

### Traps

- The helper is an aid, not an enforcer.

### Stop-and-escalate

- Derivation needs undeclared intent.

### Suggested agent-class

Medium.

### Docs to keep coherent

planner.md.
`

describe('checkIssueRationale', () => {
  it('passes the bold-inline rationale style (#309 shape)', () => {
    expect(checkIssueRationale(BOLD_STYLE).status).toBe('pass')
  })

  it('passes the heading rationale style (#219 shape)', () => {
    expect(checkIssueRationale(HEADING_STYLE).status).toBe('pass')
  })

  it('fails an empty body with one error per missing field', () => {
    const r = checkIssueRationale('Just a title-ish body with no rationale.')
    expect(r.status).toBe('fail')
    expect(r.errors).toHaveLength(8)
  })

  it('fails only the missing field when one is dropped', () => {
    const body = BOLD_STYLE.replace('**Traps to avoid** — Do not do X.\n', '')
    const r = checkIssueRationale(body)
    expect(r.status).toBe('fail')
    expect(r.errors).toHaveLength(1)
    expect(r.errors[0]).toMatch(/Traps/)
  })

  it('does not accept a field name mentioned in plain prose (needs bold or heading form)', () => {
    const body = 'The boundary of this task is unclear and the sizing was never done.'
    expect(checkIssueRationale(body).status).toBe('fail')
  })
})

describe('isTaskIssueLabelSet', () => {
  it('is true when a tranche label is present', () => {
    expect(isTaskIssueLabelSet(['vinaya/tranche:aeg-governance-hardening', 'vinaya/tier:3'])).toBe(true)
  })
  it('is false for non-tranche labels', () => {
    expect(isTaskIssueLabelSet(['bug', 'help wanted'])).toBe(false)
  })
  it('is false for no labels', () => {
    expect(isTaskIssueLabelSet([])).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Content checks (A/B/D block, C warns)
// ---------------------------------------------------------------------------

/** The real collision-domain shape; the live list is read from `.aeg/packages` by `open-issue.ts`. */
const SHARED = ['packages/ui', 'packages/aeg-core', '.vinaya']

/** Registry rows as `parseRegistry` returns them — `vinaya` is an app, `aeg-core` IS a shared package. */
const REGISTRY = [
  { name: 'vinaya', path: 'apps/vinaya' },
  { name: 'aeg-core', path: 'packages/aeg-core' },
  { name: 'vada', path: 'apps/vada-ai' }
]

/**
 * A minimally-valid rationale, parameterised on the fields the content checks
 * read. It carries BOTH shapes every live Issue does: the `Project(s) + blast
 * radius` prose field (narrative, and where paths get named), and the
 * line-anchored project field at the foot (the declaration — the only thing
 * `projectsFromBody` reads, and therefore the only thing the gates read). See
 * `issue-863-body.md` / `issue-870-body.md` for the live shape this mirrors.
 */
function rationale(opts: {
  boundary: string
  docs?: string
  traps?: string
  extra?: string
  projects?: string
}): string {
  return `
## Planner's rationale

**Boundary** — ${opts.boundary}

**Sizing** — Passes the four.

**Project(s) + blast radius** — \`Project: ${opts.projects ?? 'vinaya'}\`.

**Dependency rationale** — Depends-on: —.

**Traps to avoid** — ${opts.traps ?? 'Read `.claude/skills/ui-library-system/SKILL.md` first.'}

**Suggested agent-class** — mid.

**Stop-and-escalate** — If X, stop.

**Docs to keep coherent** — ${opts.docs ?? 'Keep `apps/vinaya/web/CLAUDE.md` coherent.'}
${opts.extra ?? ''}

**Project:** ${opts.projects ?? 'vinaya'}
`
}

describe('declaredProjects', () => {
  it('reads every project the body field declares', () => {
    const body = rationale({ boundary: 'x', projects: 'vada, vinaya' })
    expect(declaredProjects(body, [])).toEqual(expect.arrayContaining(['vada', 'vinaya']))
  })

  it('ignores a residual project:* label — project is a field, never a label (#614)', () => {
    expect(declaredProjects(rationale({ boundary: 'x' }), ['project:vada', 'vinaya/tranche:x'])).toEqual(['vinaya'])
  })
})

/** The registry reduced to the name column — what `checkProjectsRegistered` consumes. */
const REGISTERED = REGISTRY.map((p) => p.name)

/**
 * Real task-Issue bodies, saved from the forge. Fixtures for this check must
 * come from the live corpus: a synthetic body can carry a `Project:` shape no
 * real Issue has, and the suite then passes over a gate that never fires.
 *
 * Verbatim with ONE exception: a third-party adopter repo's identifier in
 * `issue-870-body.md` is redacted. `packages/aeg-core` ships inside the published
 * `@attalabs/vinaya` tarball, so a real Issue body pasted in here travels further
 * than the forge. Nothing these tests assert touches the redacted span — check an
 * identifier before copying the next body in.
 */
const realBody = (n: number): string => readFileSync(join(__dirname, 'fixtures', `issue-${n}-body.md`), 'utf8')

describe('checkProjectsRegistered', () => {
  it('#863 (modern `**Project:**` footer) — EVALUATES its names, and passes on their merit', () => {
    const body = realBody(863)
    // The load-bearing assertion: it found names. A pass with zero names found is
    // the vacuous pass that made the first version look green while inert.
    expect(projectsFromBody(body)).toEqual(['aeg-core', 'vinaya'])
    expect(checkProjectsRegistered(body, [], REGISTERED).status).toBe('pass')
  })

  it('#863 fails once one of its real declared names is not a registry row', () => {
    // Same real body, registry missing `vinaya` — proves the pass above is earned.
    const r = checkProjectsRegistered(realBody(863), [], ['aeg-core', 'vada'])
    expect(r.status).toBe('fail')
    expect(r.errors[0]).toMatch(/vinaya/)
    expect(r.errors[0]).toMatch(/\.vinaya\/projects\.md/)
  })

  it('#188 (legacy `**Project(s):**` colon style) — still fires', () => {
    const body = realBody(188)
    expect(projectsFromBody(body)).toEqual(['vada', 'engine', 'adapter'])
    const r = checkProjectsRegistered(body, [], REGISTERED)
    expect(r.status).toBe('fail')
    expect(r.errors[0]).toMatch(/engine/)
    expect(r.errors[0]).toMatch(/adapter/)
  })

  it('#870 (prose field full of file paths) — invents no project named `src`', () => {
    // Its `**Project(s) + blast radius**` line names `packages/aeg-core/src/…`.
    // The prose-field read turned that into `src, bin, verify-briefts, …` and
    // refused a correctly-declared Issue; the line-anchored field read cannot.
    const body = realBody(870)
    expect(body).toContain('packages/aeg-core/src/brief-validation.ts')
    expect(projectsFromBody(body)).toEqual(['vinaya'])
    expect(checkProjectsRegistered(body, [], REGISTERED).status).toBe('pass')
  })

  it('reads the same field the derivation does — gate and `projectsFromBody` cannot disagree', () => {
    // The reviewer's reproduction: an unregistered project declared on the footer
    // line, invisible to the prose-field read, and resolved by the derivation.
    const body = [
      '**Project(s) + blast radius** — `aeg-types` owns the edited path.',
      '',
      '**Tier:** 1',
      '**Project:** aeg-types'
    ].join('\n')
    expect(projectsFromBody(body)).toEqual(['aeg-types'])
    const r = checkProjectsRegistered(body, [], REGISTERED)
    expect(r.status).toBe('fail')
    expect(r.errors[0]).toMatch(/aeg-types/)
  })

  it('names every unregistered project, not just the first', () => {
    const body = '**Project:** aeg-types, vda'
    const r = checkProjectsRegistered(body, [], REGISTERED)
    expect(r.status).toBe('fail')
    expect(r.errors[0]).toMatch(/aeg-types/)
    expect(r.errors[0]).toMatch(/vda/)
  })

  it('matches exactly — a case variant is refused, because downstream comparison is literal', () => {
    const r = checkProjectsRegistered('**Project:** Vinaya', [], REGISTERED)
    expect(r.status).toBe('fail')
    // …and says why, naming the row it differs from only in case.
    expect(r.errors[0]).toMatch(/differs from the registered `vinaya` only in case/)
  })

  it('is dormant when the registry is absent — a gate with no source of truth invents none', () => {
    expect(checkProjectsRegistered('**Project:** aeg-types', [], []).status).toBe('pass')
  })

  it('passes a body with no `**Project:**` line — field presence is checkIssueRationale’s job', () => {
    const body = 'A body with no rationale and no Project field at all.'
    expect(projectsFromBody(body)).toEqual([])
    expect(checkProjectsRegistered(body, [], REGISTERED).status).toBe('pass')
  })
})

describe('checkBlastRadiusScope (A)', () => {
  it('fails a single-project task whose Boundary edits a shared package it does not own', () => {
    const body = rationale({ boundary: 'Restyle the shared TopBar (`packages/ui/topbar/index.tsx`).' })
    const r = checkBlastRadiusScope(body, [], SHARED, REGISTRY)
    expect(r.status).toBe('fail')
    expect(r.errors[0]).toMatch(/packages\/ui/)
  })

  it('passes once a second project is declared — the review fan-out actually widens', () => {
    const body = rationale({
      boundary: 'Restyle the shared TopBar (`packages/ui/topbar/index.tsx`).',
      projects: 'vinaya, vada'
    })
    expect(checkBlastRadiusScope(body, [], SHARED, REGISTRY).status).toBe('pass')
  })

  it('passes on an explicit blast-radius-ack: line', () => {
    const body = rationale({
      boundary: 'Restyle the shared TopBar (`packages/ui/topbar/index.tsx`).',
      extra: '\n**blast-radius-ack:** every consumer keeps the existing fallback path.\n'
    })
    expect(checkBlastRadiusScope(body, [], SHARED, REGISTRY).status).toBe('pass')
  })

  it('passes a single-project task editing the package that IS its own project (no under-declaration)', () => {
    const body = rationale({
      boundary: 'Add a check to `packages/aeg-core/src/issue-validation.ts`.',
      projects: 'aeg-core'
    })
    expect(checkBlastRadiusScope(body, [], SHARED, REGISTRY).status).toBe('pass')
  })

  it('does not count a cited document as a touched domain', () => {
    const body = rationale({ boundary: 'Resolve the registry row in `.vinaya/projects.md`.' })
    expect(checkBlastRadiusScope(body, [], SHARED, REGISTRY).status).toBe('pass')
  })

  it('does not count a shared path named outside Boundary / blast radius (an import, a trap)', () => {
    const body = rationale({
      boundary: 'Add a CLI flag in `apps/vinaya/cli`.',
      traps: 'The CLI imports `packages/aeg-core` unchanged — do not edit it.'
    })
    expect(checkBlastRadiusScope(body, [], SHARED, REGISTRY).status).toBe('pass')
  })

  it('is dormant when no collision-domain list is available', () => {
    const body = rationale({ boundary: 'Restyle `packages/ui/topbar/index.tsx`.' })
    expect(checkBlastRadiusScope(body, [], [], REGISTRY).status).toBe('pass')
  })

  // -------------------------------------------------------------------------
  // The parse and the count (#864), proven on live bodies. A synthetic body can
  // carry a project shape no real Issue has, and the suite then passes over a
  // gate that never fires — which is how both defects below survived a green
  // suite. Every fixture here is a body that shipped on the forge.
  // -------------------------------------------------------------------------

  it('#870 — the prose read invented five projects and bought the bypass; the field read does not', () => {
    const body = realBody(870)
    // What the body-wide read saw: path fragments off its own blast-radius line,
    // parsed as project names. Five of the six are fiction, and the count alone
    // cleared the `> 1` bypass, so this check never ran on the Issue at all.
    const invented = declaredProjects(body, [])
    expect(invented).toContain('src')
    expect(invented.length).toBeGreaterThan(1)
    // The line-anchored field, read through the one shared parser: one project.
    expect(projectsFromBody(body)).toEqual(['vinaya'])
    // And with the real declaration visible, the real reach is refused: a task
    // on `vinaya` (apps/vinaya) editing `packages/aeg-core`, no ack line.
    const r = checkBlastRadiusScope(body, [], SHARED, REGISTRY)
    expect(r.status).toBe('fail')
    expect(r.errors[0]).toMatch(/packages\/aeg-core/)
    expect(r.errors[0]).toMatch(/\(vinaya\)/)
  })

  it('#863 — passes on ownership, not on the six names its prose used to yield', () => {
    const body = realBody(863)
    expect(declaredProjects(body, [])).toContain('src')
    expect(projectsFromBody(body)).toEqual(['aeg-core', 'vinaya'])
    // `aeg-core` owns `packages/aeg-core`, so the reach is declared exactly —
    // this pass never depended on the bypass, and still does not.
    expect(checkBlastRadiusScope(body, [], SHARED, REGISTRY).status).toBe('pass')
  })

  it('#863 with `aeg-core` unregistered — an unregistered name no longer buys the bypass', () => {
    // Same real body, registry as the only variable: two declared names, one of
    // which resolves to no row. Raw-token counting made that `> 1` and passed;
    // one registry-validated name is one review lens, so it must not.
    const r = checkBlastRadiusScope(realBody(863), [], SHARED, [{ name: 'vinaya', path: 'apps/vinaya' }])
    expect(r.status).toBe('fail')
    expect(r.errors[0]).toMatch(/packages\/aeg-core/)
    expect(r.errors[0]).toMatch(/Not counted: aeg-core/)
  })

  it('a genuine multi-project declaration still gets the bypass — both names are rows', () => {
    const body = rationale({
      boundary: 'Restyle the shared TopBar (`packages/ui/topbar/index.tsx`).',
      projects: 'vinaya, vada'
    })
    expect(projectsFromBody(body)).toEqual(['vinaya', 'vada'])
    expect(checkBlastRadiusScope(body, [], SHARED, REGISTRY).status).toBe('pass')
  })

  it('the same body fails once the second name is fiction — one real lens is one lens', () => {
    const body = rationale({
      boundary: 'Restyle the shared TopBar (`packages/ui/topbar/index.tsx`).',
      projects: 'vinaya, aeg-types'
    })
    const r = checkBlastRadiusScope(body, [], SHARED, REGISTRY)
    expect(r.status).toBe('fail')
    expect(r.errors[0]).toMatch(/Not counted: aeg-types/)
  })
})

describe('checkNoBriefContent (B)', () => {
  it('fails a body carrying a brief-shaped References section', () => {
    const body = `${rationale({ boundary: 'x' })}\n## References\n\nSkills to read first: …\n`
    const r = checkNoBriefContent(body)
    expect(r.status).toBe('fail')
    expect(r.errors[0]).toMatch(/References/)
  })

  it.each(['Technical surface map', 'Step 0', 'Test Plan'])('fails on a brief-shaped "%s" heading', (heading) => {
    expect(checkNoBriefContent(`${rationale({ boundary: 'x' })}\n## ${heading}\n\nstuff\n`).status).toBe('fail')
  })

  it('fails on a bold Premise field', () => {
    expect(checkNoBriefContent(`${rationale({ boundary: 'x' })}\n**Premise:** the file contains X\n`).status).toBe(
      'fail'
    )
  })

  it('passes a clean rationale-only body', () => {
    expect(checkNoBriefContent(rationale({ boundary: 'x' })).status).toBe('pass')
  })
})

describe('checkRationaleNamesDocs (D)', () => {
  it('fails when neither Docs nor Traps names a concrete doc path', () => {
    const body = rationale({
      boundary: 'Fix the tab layout in `apps/vinaya/web`.',
      docs: 'No docs touched.',
      traps: 'Do not weaken the assertions.'
    })
    const r = checkRationaleNamesDocs(body)
    expect(r.status).toBe('fail')
    expect(r.errors[0]).toMatch(/no-doc-surface/)
  })

  it('passes when Docs names a concrete doc path', () => {
    const body = rationale({
      boundary: 'Fix the tab layout in `apps/vinaya/web`.',
      docs: 'Keep `apps/vinaya/web/CLAUDE.md` coherent.',
      traps: 'Do not weaken the assertions.'
    })
    expect(checkRationaleNamesDocs(body).status).toBe('pass')
  })

  it('passes when only Traps names one — the read artifact can live in either field', () => {
    const body = rationale({
      boundary: 'x',
      docs: 'None expected.',
      traps: 'Read `.claude/rules/ui-patterns.md` RULE 2 first.'
    })
    expect(checkRationaleNamesDocs(body).status).toBe('pass')
  })

  it('passes a genuinely doc-less surface via the explicit sentinel', () => {
    const body = rationale({
      boundary: 'x',
      docs: 'no-doc-surface — pure internal refactor, nothing documents it.',
      traps: 'Do not weaken the assertions.'
    })
    expect(checkRationaleNamesDocs(body).status).toBe('pass')
  })

  // Regression: under the `m` flag the field slicer's `$` terminator matched
  // end-of-LINE, so a heading-style field sliced to its own label with no
  // content and D failed Issues that name their docs on the next line.
  it('reads a heading-style rationale, not just the bold-inline one (#219 shape)', () => {
    const body = HEADING_STYLE.replace('planner.md.', '`aeg-root/roles/planner.md` — the §7 derivation rule.')
    expect(checkRationaleNamesDocs(body).status).toBe('pass')
  })

  it('still fails a heading-style rationale whose Docs field names no path', () => {
    expect(checkRationaleNamesDocs(HEADING_STYLE).status).toBe('fail')
  })
})

describe('checkConflictCompleteness (C, warn-only)', () => {
  const mk = (ref: string, path: string, conflictsWith: string[] = []): TaskIssueFacts => ({
    ref,
    body: rationale({ boundary: `Edit \`${path}\`.` }),
    conflictsWith
  })

  it('warns when two open task Issues name the same domain with no mutual edge', () => {
    const w = checkConflictCompleteness(
      mk('#621', 'packages/ui/topbar/index.tsx'),
      [mk('#626', 'packages/ui/lib/color-scheme-toggle.tsx')],
      SHARED
    )
    expect(w).toHaveLength(1)
    expect(w[0]).toMatch(/#626/)
    expect(w[0]).toMatch(/packages\/ui/)
  })

  it('is silent once either side declares the edge', () => {
    expect(
      checkConflictCompleteness(
        mk('#621', 'packages/ui/topbar/index.tsx', ['#626']),
        [mk('#626', 'packages/ui/lib/color-scheme-toggle.tsx')],
        SHARED
      )
    ).toEqual([])
  })

  it('is silent for disjoint domains', () => {
    expect(
      checkConflictCompleteness(
        mk('#621', 'packages/ui/topbar/index.tsx'),
        [mk('#630', 'packages/aeg-core/src/x.ts')],
        SHARED
      )
    ).toEqual([])
  })
})

describe('code-blindness — every content check reuses the single stripCode (PR #617)', () => {
  it.each(fenceShapes())('does not trip A or B on quoted content inside a $name fence', (shape) => {
    const quoted = [
      shape.open,
      '## References',
      '**Premise:** packages/ui/topbar/index.tsx contains: TopBar',
      'Restyle packages/ui/topbar/index.tsx',
      shape.close
    ].join(shape.eol)
    const body = `${rationale({ boundary: 'Add a CLI flag in `apps/vinaya/cli`.' })}\n${quoted}\n`
    expect(checkNoBriefContent(body).status).toBe('pass')
    expect(checkBlastRadiusScope(body, [], SHARED, REGISTRY).status).toBe('pass')
  })
})

// ---------------------------------------------------------------------------
// One rationale grammar (task 738): an Issue body the creation gate accepts
// must always be rewritable by `amend-deps`. `checkIssueRationale` and
// `amendRationaleDeps` are two independent consumers of the same
// `Dependency rationale` field; this suite feeds a shared set of bodies
// through BOTH and asserts they agree, rather than trusting two
// independently-passing unit tests that never run against each other's
// fixtures (Issue #736, found live 2026-08-05).
// ---------------------------------------------------------------------------

/** A complete, otherwise-canonical rationale body with only the `Dependency
 * rationale` field's form varied — isolates disagreement to that one field. */
function rationaleWithDependencyForm(dependencyField: string): string {
  return `
**Boundary** — What this task is and is not.

**Sizing** — Passes all four tests.

**Project(s) + blast radius** — aeg, aeg-core.

${dependencyField}

**Traps to avoid** — Do not do X.

**Suggested agent-class** — high.

**Stop-and-escalate** — If Y happens, stop.

**Docs to keep coherent** — state-machine.md §12.
`
}

/** Whether `amendRationaleDeps` can locate the section at all — the same
 * question `checkIssueRationale`'s new check answers for the creation gate. */
function amendDepsAcceptsSectionLocation(body: string): boolean {
  try {
    amendRationaleDeps(body, { dependsOn: ['1'], note: 'round-trip probe', date: '2026-01-01' })
    return true
  } catch {
    return false
  }
}

/** Whether `checkIssueRationale` accepts this body on the `Dependency
 * rationale` field specifically (ignores errors on the other seven fields,
 * which `rationaleWithDependencyForm` always satisfies). */
function checkIssueRationaleAcceptsDependencyField(body: string): boolean {
  return !checkIssueRationale(body).errors.some((e) => e.startsWith('issue-validation Dependency rationale'))
}

const DEPENDENCY_FORM_FIXTURES: Array<{ name: string; field: string; accepted: boolean }> = [
  {
    name: 'canonical bold form (Issue #309 shape)',
    field: '**Dependency rationale** — No depends-on.',
    accepted: true
  },
  {
    name: 'colon-inside-bold form (Issue #736 shape, found live 2026-08-05)',
    field: '**Dependency rationale:** No depends-on.',
    accepted: false
  },
  {
    name: 'heading form (Issue #219 shape) — amend-deps has no heading grammar for this field',
    field: '### Dependency rationale\n\nNo depends-on.',
    accepted: false
  }
]

describe('checkIssueRationale / amendRationaleDeps — round-trip agreement (task 738)', () => {
  it.each(DEPENDENCY_FORM_FIXTURES)('$name: both consumers agree (accepted=$accepted)', ({ field, accepted }) => {
    const body = rationaleWithDependencyForm(field)
    expect(checkIssueRationaleAcceptsDependencyField(body)).toBe(accepted)
    expect(amendDepsAcceptsSectionLocation(body)).toBe(accepted)
  })

  it('rejects the exact colon-form body from Issue #736 (real, captured 2026-08-05) with an actionable error', () => {
    const body = readFileSync(join(__dirname, 'fixtures', 'issue-736-body.md'), 'utf8')
    const result = checkIssueRationale(body)
    expect(result.status).toBe('fail')
    const depError = result.errors.find((e) => e.startsWith('issue-validation Dependency rationale'))
    expect(depError).toBeDefined()
    expect(depError).toMatch(/\*\*Dependency rationale\*\* — …/)
    expect(depError).toMatch(/\*\*Dependency rationale:\*\* …/)
    // And the same body is, independently, unamendable — the defect this task closes.
    expect(amendDepsAcceptsSectionLocation(body)).toBe(false)
  })

  it('still passes the canonical form on both consumers — no regression on the accepted shape', () => {
    const body = rationaleWithDependencyForm('**Dependency rationale** — Depends-on: 1.')
    expect(checkIssueRationale(body).status).toBe('pass')
    expect(amendDepsAcceptsSectionLocation(body)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// `hasRationaleField` regex-grouping regression (found live 2026-08-07 while
// unblocking PR #754): `labelPattern`'s own top-level `|` (e.g. `Dependency
// rationale|Depends[- ]on`) must not split the surrounding
// `(?:\*\*|^#{1,4}\s+)\s*` alternation. Ungrouped, `Depends[- ]on` becomes a
// bare, unanchored alternative that matches ANY "Depends on"/"Depends-on"
// text anywhere in the body — including plain prose with no bold/heading
// marker nearby — and a body that never had this field at all gets
// misreported as "field found, but malformed" instead of "field missing".
// ---------------------------------------------------------------------------

describe('hasRationaleField — label-pattern grouping (regression, found live 2026-08-07)', () => {
  it('a body with a bare "Depends on" in ordinary prose, and no bold/heading Dependency-rationale field, reports the field MISSING', () => {
    const body = `
**Boundary** — Depends on the reader having already read the design doc.

**Sizing** — One PR.

**Project(s) + blast radius** — aeg, aeg-core.

**Traps to avoid** — Do not do X.

**Suggested agent-class** — high.

**Stop-and-escalate** — If Y happens, stop.

**Docs to keep coherent** — state-machine.md §12.
`
    const result = checkIssueRationale(body)
    expect(result.status).toBe('fail')
    const depError = result.errors.find((e) => e.startsWith('issue-validation Dependency rationale'))
    expect(depError).toBeDefined()
    // Missing (no prefix match) — not the "found but wrong form" message task 738 added.
    expect(depError).toMatch(/rationale field not found/)
    expect(depError).not.toMatch(/rationale field found, but not in the form/)
  })

  it('a real-shaped Issue with only inline "Depends-on: #N" prose in an unrelated section (Issue #240/#241 shape) reports the field MISSING, not malformed', () => {
    const body = `
**Boundary** — Depends on: **#186 (T11)** — the benchmark data answers the signal question.

**Sizing** — One PR.

**Project(s) + blast radius** — vada only.

**Traps to avoid** — Do not do X.

**Suggested agent-class** — high.

**Stop-and-escalate** — If Y happens, stop.

**Docs to keep coherent** — some-doc.md.
`
    const result = checkIssueRationale(body)
    const depError = result.errors.find((e) => e.startsWith('issue-validation Dependency rationale'))
    expect(depError).toBeDefined()
    expect(depError).toMatch(/rationale field not found/)
  })
})
