import { describe, expect, it } from 'vitest'
import { fenceShapes } from './fixtures/fence-shapes'
import {
  checkBlastRadiusScope,
  checkConflictCompleteness,
  checkIssueRationale,
  checkNoBriefContent,
  checkRationaleNamesDocs,
  declaredProjects,
  isTaskIssueLabelSet,
  type TaskIssueFacts
} from './issue-validation'

// Bold-inline style, as on Issue #309.
const BOLD_STYLE = `
**Iteration:** aeg-governance-hardening · **Task:** 5d · **Project(s):** aeg

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

### Dependency rationale

Depends on task 3.

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
  it('is true when an iteration label is present', () => {
    expect(isTaskIssueLabelSet(['iteration:aeg-governance-hardening', 'tier:3'])).toBe(true)
  })
  it('is false for non-iteration labels', () => {
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
const SHARED = ['packages/ui', 'packages/aeg-core', 'packages/governance']

/** Registry rows as `parseRegistry` returns them — `vinaya` is an app, `aeg-core` IS a shared package. */
const REGISTRY = [
  { name: 'vinaya', path: 'apps/vinaya' },
  { name: 'aeg-core', path: 'packages/aeg-core' },
  { name: 'vada', path: 'apps/vada-ai' }
]

/** A minimally-valid rationale, parameterised on the two fields the content checks read. */
function rationale(opts: { boundary: string; docs?: string; traps?: string; extra?: string }): string {
  return `
## Planner's rationale

**Boundary** — ${opts.boundary}

**Sizing** — Passes the four.

**Project(s) + blast radius** — \`Project: vinaya\`.

**Dependency rationale** — Depends-on: —.

**Traps to avoid** — ${opts.traps ?? 'Read `.claude/skills/ui-library-system/SKILL.md` first.'}

**Suggested agent-class** — mid.

**Stop-and-escalate** — If X, stop.

**Docs to keep coherent** — ${opts.docs ?? 'Keep `apps/vinaya/web/CLAUDE.md` coherent.'}
${opts.extra ?? ''}
`
}

describe('declaredProjects', () => {
  it('unions the project:* labels with the body field', () => {
    const body = rationale({ boundary: 'x' })
    expect(declaredProjects(body, ['project:vada', 'iteration:x'])).toEqual(expect.arrayContaining(['vada', 'vinaya']))
  })

  it('survives the labels being dropped — the body field alone still resolves', () => {
    expect(declaredProjects(rationale({ boundary: 'x' }), [])).toEqual(['vinaya'])
  })
})

describe('checkBlastRadiusScope (A)', () => {
  it('fails a single-project task whose Boundary edits a shared package it does not own', () => {
    const body = rationale({ boundary: 'Restyle the shared TopBar (`packages/ui/topbar/index.tsx`).' })
    const r = checkBlastRadiusScope(body, ['project:vinaya'], SHARED, REGISTRY)
    expect(r.status).toBe('fail')
    expect(r.errors[0]).toMatch(/packages\/ui/)
  })

  it('passes once a second project is declared — the review fan-out actually widens', () => {
    const body = rationale({ boundary: 'Restyle the shared TopBar (`packages/ui/topbar/index.tsx`).' })
    expect(checkBlastRadiusScope(body, ['project:vinaya', 'project:vada'], SHARED, REGISTRY).status).toBe('pass')
  })

  it('passes on an explicit blast-radius-ack: line', () => {
    const body = rationale({
      boundary: 'Restyle the shared TopBar (`packages/ui/topbar/index.tsx`).',
      extra: '\n**blast-radius-ack:** every consumer keeps the existing fallback path.\n'
    })
    expect(checkBlastRadiusScope(body, ['project:vinaya'], SHARED, REGISTRY).status).toBe('pass')
  })

  it('passes a single-project task editing the package that IS its own project (no under-declaration)', () => {
    const body = rationale({ boundary: 'Add a check to `packages/aeg-core/src/issue-validation.ts`.' })
    expect(checkBlastRadiusScope(body, ['project:aeg-core'], SHARED, REGISTRY).status).toBe('pass')
  })

  it('does not count a cited document as a touched domain', () => {
    const body = rationale({ boundary: 'Resolve the registry row in `packages/governance/projects.md`.' })
    expect(checkBlastRadiusScope(body, ['project:vinaya'], SHARED, REGISTRY).status).toBe('pass')
  })

  it('does not count a shared path named outside Boundary / blast radius (an import, a trap)', () => {
    const body = rationale({
      boundary: 'Add a CLI flag in `apps/vinaya/cli`.',
      traps: 'The CLI imports `packages/aeg-core` unchanged — do not edit it.'
    })
    expect(checkBlastRadiusScope(body, ['project:vinaya'], SHARED, REGISTRY).status).toBe('pass')
  })

  it('is dormant when no collision-domain list is available', () => {
    const body = rationale({ boundary: 'Restyle `packages/ui/topbar/index.tsx`.' })
    expect(checkBlastRadiusScope(body, ['project:vinaya'], [], REGISTRY).status).toBe('pass')
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
    expect(checkBlastRadiusScope(body, ['project:vinaya'], SHARED, REGISTRY).status).toBe('pass')
  })
})
