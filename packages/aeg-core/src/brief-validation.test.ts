import { describe, expect, it } from 'vitest'
import {
  checkAutonomyClause,
  checkBriefSections,
  checkClosesN,
  checkDocUpdateList,
  checkForField,
  checkForgeTitle,
  checkPlanPrNoCloses,
  checkPremiseCoverage,
  checkPrincipalPlaceholder,
  checkProjectField,
  checkStopConditions,
  checkSurfaceMap,
  checkTestPlan,
  checkTestPlanExclusivity,
  checkTierField,
  checkWorktreeStep0,
  headerRegion,
  inferBranchFromBody,
  isBriefShaped
} from './brief-validation'
import { EOLS, FENCE_DELIMS, fenceShapes } from './fixtures/fence-shapes'
import { readTierFromPrBody } from './pr-tier'

const WELL_FORMED = `
**For:** Claude Sonnet (Claude Code CLI, dispatched non-interactive session)
**Project:** aeg

## Summary

Ships the brief-validation gate. Closes #252

## Test plan

- [ ] **[agent]** \`bun test\` passes.
- [ ] **[principal]** Reviewed in browser.

## Scope

One paragraph of blast radius.

**Tier:** 3

---

### 4. Technical surface map

- Create \`packages/aeg-core/src/brief-validation.ts\`.

### 5. Pre-flight checks

Step 0 (mandatory, verbatim):
\`\`\`
git worktree add .worktrees/task/aeg-governance-hardening/2 -b task/aeg-governance-hardening/2 origin/main
\`\`\`

### 7. Documentation-update list

- \`aeg-root/state-machine.md\` §12.

### 10. Stop conditions

- Pre-flight failure.

### 11. Constraints

**Autonomy:** Do not stop to ask clarifying questions. For any ambiguity not
covered by a Section 10 stop condition, choose the most reasonable option.
`

describe('checkTierField', () => {
  it('passes when a Tier field is present', () => {
    expect(checkTierField(WELL_FORMED, readTierFromPrBody).status).toBe('pass')
  })
  it('fails when no Tier field is present', () => {
    const r = checkTierField('no tier here', readTierFromPrBody)
    expect(r.status).toBe('fail')
    expect(r.errors[0]).toMatch(/tier/i)
  })
})

describe('checkTestPlan', () => {
  it('passes on unit-tests-only sentinel', () => {
    expect(checkTestPlan('Test Plan: unit-tests-only').status).toBe('pass')
  })
  it('passes on the bolded sentinel — brief-authoring §9 documents this exact form', () => {
    // The skill's own canonical example. Used to FAIL: `\s*` cannot cross the
    // `**` between the colon and the value, so a brief copying the skill
    // verbatim was rejected by the gate that documents it.
    expect(checkTestPlan('**Test Plan:** unit-tests-only').status).toBe('pass')
  })
  it('passes on the bolded sentinel with the emphasis closed before the colon', () => {
    expect(checkTestPlan('**Test Plan**: unit-tests-only').status).toBe('pass')
  })
  it('passes on at least one tagged item', () => {
    expect(checkTestPlan('- [ ] **[agent]** run the tests').status).toBe('pass')
  })
  it('fails when the Test Plan section is missing entirely', () => {
    const r = checkTestPlan('## Summary\n\nno test plan section here')
    expect(r.status).toBe('fail')
    expect(r.errors[0]).toMatch(/Test Plan/)
  })
  it('does not require unit-tests-only to be justified by the surface map (presence-only)', () => {
    // Per the Planner's trap: a Test Plan: unit-tests-only sentinel passes even
    // when §4 lists an API route — that mismatch is a Reviewer judgment call,
    // not something checkTestPlan catches.
    const body = 'Test Plan: unit-tests-only\n\n### 4. Technical surface map\n- apps/x/api/route.ts'
    expect(checkTestPlan(body).status).toBe('pass')
  })
})

describe('checkTestPlanExclusivity', () => {
  it('passes a legitimate unit-tests-only declaration with no checkbox items', () => {
    const body = 'Test Plan: unit-tests-only — pure parser, no runtime surface.'
    expect(checkTestPlanExclusivity(body).status).toBe('pass')
  })

  it('passes a legitimate mixed [agent]/[principal] plan with no unit-tests-only declaration', () => {
    const body = '## Test plan\n\n- [ ] **[agent]** run the tests\n- [ ] **[principal]** eyeball it in browser'
    expect(checkTestPlanExclusivity(body).status).toBe('pass')
  })

  it('fails when unit-tests-only is declared alongside a tagged checkbox item (PR #363 regression)', () => {
    const body =
      'Test Plan: unit-tests-only — fetchProvenance is pure-enough.\n\n' +
      '- [x] **[agent]** New regression tests for both root causes pass.'
    const r = checkTestPlanExclusivity(body)
    expect(r.status).toBe('fail')
    expect(r.errors[0]).toMatch(/mutually exclusive/)
  })

  it('fails when the BOLDED unit-tests-only is declared alongside a tagged checkbox item', () => {
    // The silent half of the same root cause: this guard's own clause never
    // matched the bolded sentinel either, so it returned an early `pass` and
    // let the self-contradictory body straight through — the exact combination
    // #340 built it to catch, wearing the emphasis the skill documents.
    const body = '**Test Plan:** unit-tests-only — pure parser.\n\n- [x] **[agent]** Regression tests pass.'
    const r = checkTestPlanExclusivity(body)
    expect(r.status).toBe('fail')
    expect(r.errors[0]).toMatch(/mutually exclusive/)
  })

  it('fails regardless of checkbox ticked state', () => {
    const body = 'Test Plan: unit-tests-only\n\n- [ ] **[principal]** None'
    expect(checkTestPlanExclusivity(body).status).toBe('fail')
  })
})

describe('checkPrincipalPlaceholder', () => {
  it('passes when no [principal] item exists at all', () => {
    expect(checkPrincipalPlaceholder('- [ ] **[agent]** run the tests').status).toBe('pass')
  })

  it('passes a legitimate [principal] item with real content', () => {
    const body = '- [ ] **[principal]** Sign in → upload a CV → CLEAN report with grade A/B/C/D'
    expect(checkPrincipalPlaceholder(body).status).toBe('pass')
  })

  it('fails a [principal] item whose content is a None placeholder (PR #363 regression)', () => {
    const body =
      '- [ ] **[principal]** None — this is a pure forge-query/detection-logic fix with no runtime/UI/auth surface.'
    const r = checkPrincipalPlaceholder(body)
    expect(r.status).toBe('fail')
    expect(r.errors[0]).toMatch(/None.*placeholder/)
  })

  it('is case-insensitive on the None placeholder', () => {
    const body = '- [x] **[principal]** none — nothing to verify here'
    expect(checkPrincipalPlaceholder(body).status).toBe('fail')
  })
})

describe('checkSurfaceMap', () => {
  it('passes when well-formed', () => {
    expect(checkSurfaceMap(WELL_FORMED).status).toBe('pass')
  })
  it('fails when missing', () => {
    expect(checkSurfaceMap('no such section').status).toBe('fail')
  })
})

describe('checkDocUpdateList', () => {
  it('passes when well-formed', () => {
    expect(checkDocUpdateList(WELL_FORMED).status).toBe('pass')
  })
  it('fails when missing', () => {
    expect(checkDocUpdateList('no such section').status).toBe('fail')
  })
})

describe('checkWorktreeStep0', () => {
  it('passes when a git worktree add command is present', () => {
    expect(checkWorktreeStep0(WELL_FORMED).status).toBe('pass')
  })
  it('fails when missing', () => {
    expect(checkWorktreeStep0('no worktree command here').status).toBe('fail')
  })
})

describe('checkStopConditions', () => {
  it('passes when well-formed', () => {
    expect(checkStopConditions(WELL_FORMED).status).toBe('pass')
  })
  it('fails when missing', () => {
    expect(checkStopConditions('no such section').status).toBe('fail')
  })
})

describe('checkAutonomyClause', () => {
  it('passes on the standing clause, bold-labeled', () => {
    expect(checkAutonomyClause(WELL_FORMED).status).toBe('pass')
  })
  it('tolerates whitespace/emphasis variance', () => {
    const body = 'Autonomy:   do NOT stop   to ask clarifying   questions.'
    expect(checkAutonomyClause(body).status).toBe('pass')
  })
  it('fails when missing', () => {
    expect(checkAutonomyClause('no autonomy clause here').status).toBe('fail')
  })
})

describe('checkClosesN', () => {
  it('passes when Closes #N is present', () => {
    expect(checkClosesN(WELL_FORMED).status).toBe('pass')
  })
  it('fails when missing', () => {
    expect(checkClosesN('no closes reference').status).toBe('fail')
  })
  it("fails a body whose only Closes #N is inside an inline code span — GitHub won't auto-close it", () => {
    const result = checkClosesN('Summary of the change. The bug: `Closes #5` was backticked.')
    expect(result.status).toBe('fail')
    expect(result.errors[0]).toContain('only inside a code span')
  })
  it('fails a body whose only Closes #N is inside a fenced block', () => {
    const result = checkClosesN('Summary.\n\n```\nCloses #5\n```\n')
    expect(result.status).toBe('fail')
    expect(result.errors[0]).toContain('only inside a code span')
  })
  it('passes a bare Closes #N in prose', () => {
    expect(checkClosesN('Ships the fix. Closes #5').status).toBe('pass')
  })
  it('passes a bare Closes #N inside the AEG:CLOSES anchor', () => {
    const body = 'Summary.\n\n<!-- AEG:CLOSES:START -->\nCloses #5\n<!-- AEG:CLOSES:END -->\n'
    expect(checkClosesN(body).status).toBe('pass')
  })
  it('passes when a fenced example Closes #99 sits alongside a real bare Closes #5', () => {
    const body = 'Ships it. Closes #5\n\n```\nExample: Closes #99\n```\n'
    expect(checkClosesN(body).status).toBe('pass')
  })
  it('fails a double-backtick-only Closes #N — GitHub sees a code span (PR #617 review)', () => {
    const result = checkClosesN('See ``Closes #5`` here.')
    expect(result.status).toBe('fail')
    expect(result.errors[0]).toContain('only inside a code span')
  })
  it('fails a triple-backtick inline-only Closes #N', () => {
    expect(checkClosesN('Ref: ```Closes #5``` inline.').status).toBe('fail')
  })
  it('does not over-strip a bare Closes #N sitting between two inline code spans', () => {
    // The lazy matched-run rule must close each span at its own delimiter,
    // never swallow the bare reference between them.
    expect(checkClosesN('Use `a` then Closes #5 and `b`.').status).toBe('pass')
  })
  it('accepts the closed/fixed/resolved past-tense keywords (GitHub keyword set)', () => {
    for (const phrase of ['Closed #5', 'Fixed #5', 'Resolved #5']) {
      expect(checkClosesN(phrase).status).toBe('pass')
    }
  })

  // ---- indented code blocks (PR #617 review, MINOR) ----
  it('fails a Closes #N that lives only in a 4-space indented code block', () => {
    const result = checkClosesN('Summary of the change.\n\n    Closes #5\n')
    expect(result.status).toBe('fail')
    expect(result.errors[0]).toContain('only inside a code span')
  })
  it('fails a Closes #N in a tab-indented code block', () => {
    expect(checkClosesN('Summary.\n\n\tCloses #5\n').status).toBe('fail')
  })
  it('fails only the indented copy — a real bare Closes #5 alongside it still passes', () => {
    expect(checkClosesN('Ships it. Closes #5\n\n    Example: Closes #99\n').status).toBe('pass')
  })
  it('strips a multi-line indented block, not just its first line', () => {
    expect(checkClosesN('Summary.\n\n    line one\n    Closes #5\n').status).toBe('fail')
  })

  // ---- over-strip guards: these must NOT be treated as code ----
  it('does NOT strip an indented Closes #N that is list-item continuation', () => {
    // 4-space indent under a list marker is list content, not code — GitHub
    // auto-closes it, so the gate must too.
    expect(checkClosesN('- item\n\n    Closes #5\n').status).toBe('pass')
  })
  it('does NOT strip an indented line that merely continues a paragraph', () => {
    // No blank line before it => cannot be an indented code block.
    expect(checkClosesN('Some running prose\n    Closes #5\n').status).toBe('pass')
  })
  it('resumes stripping after the list context closes at column 0', () => {
    expect(checkClosesN('- item\n\nBack to prose.\n\n    Closes #5\n').status).toBe('fail')
  })

  // ---- fenced blocks: character + run length (PR #617 security pass, MEDIUM) ----
  it('fails a Closes #N inside a tilde fence', () => {
    expect(checkClosesN('~~~\nCloses #5\n~~~').status).toBe('fail')
  })
  it('fails a Closes #N inside a tilde fence carrying an info string', () => {
    expect(checkClosesN('~~~js\nCloses #5\n~~~').status).toBe('fail')
  })
  it('fails a Closes #N inside a six-backtick fence (run-length leak)', () => {
    expect(checkClosesN('``````\nCloses #5\n``````').status).toBe('fail')
  })
  it('fails a Closes #N inside a backtick fence with an info string', () => {
    expect(checkClosesN('```js\nCloses #5\n```').status).toBe('fail')
  })
  it('fails a Closes #N after an unclosed fence — GitHub renders it as code too', () => {
    expect(checkClosesN('Summary.\n\n```\nCloses #5\n').status).toBe('fail')
  })
  it('does not let a short closing run terminate a longer fence', () => {
    // ``` cannot close ````` — the Closes stays inside the block.
    expect(checkClosesN('`````\nCloses #5\n```\n').status).toBe('fail')
  })
  it('still treats a same-line triple-backtick as an inline span, not a fence', () => {
    expect(checkClosesN('Ref ```Closes #5``` inline.').status).toBe('fail')
  })
  it('keeps a real bare Closes #5 that sits outside a tilde fence', () => {
    expect(checkClosesN('Ships it. Closes #5\n\n~~~\nExample: Closes #99\n~~~\n').status).toBe('pass')
  })
})

/**
 * Exhaustive fence matrix — {backtick, tilde} × {3,4,6} × {LF, CRLF} ×
 * {closed, unclosed} × {info string, none}, plus the closer-length rules.
 *
 * Three successive fence bugs (double-backtick spans, then tilde/run-length,
 * then CRLF) each shipped a fix whose tests covered only the axis just
 * reported, leaving the next axis to be found in review. This table exists so
 * the axes are enumerated rather than discovered one incident at a time — add
 * a dimension here, not another one-off `it`.
 */
describe('checkClosesN — fence matrix', () => {
  // Shapes come from the shared enumeration (`fixtures/fence-shapes.ts`), not a
  // local table: `anchored-region.test.ts` iterates the same list against
  // `maskCode`, so a dimension added there covers both consumers at once.
  for (const { name, open, close, eol } of fenceShapes()) {
    it(`${name}: closed fence hides Closes #5`, () => {
      expect(checkClosesN(['Summary.', '', open, 'Closes #5', close, ''].join(eol)).status).toBe('fail')
    })

    it(`${name}: unclosed fence hides Closes #5 to EOF`, () => {
      expect(checkClosesN(['Summary.', '', open, 'Closes #5'].join(eol)).status).toBe('fail')
    })

    it(`${name}: a real bare Closes #5 outside the fence still passes`, () => {
      const body = ['Ships it. Closes #5', '', open, 'Example: Closes #99', close, ''].join(eol)
      expect(checkClosesN(body).status).toBe('pass')
    })

    it(`${name}: a longer closer still closes the fence`, () => {
      const longer = close[0]?.repeat(close.length + 2) as string
      const body = ['Ships it. Closes #5', '', open, 'x', longer, '', 'tail'].join(eol)
      expect(checkClosesN(body).status).toBe('pass')
    })
  }

  // Rules below are properties of the fence *scanner* rather than of a shape,
  // so they stay here rather than multiplying the shared matrix.
  for (const [eolName, eol] of EOLS) {
    for (const [fenceName, ch] of FENCE_DELIMS) {
      it(`${eolName}/${fenceName}: a shorter run cannot close a longer fence`, () => {
        const body = ['Summary.', '', ch.repeat(5), 'Closes #5', ch.repeat(3), ''].join(eol)
        expect(checkClosesN(body).status).toBe('fail')
      })

      it(`${eolName}/${fenceName}: fence indented up to 3 spaces still opens`, () => {
        const body = ['Summary.', '', `   ${ch.repeat(3)}`, 'Closes #5', `   ${ch.repeat(3)}`, ''].join(eol)
        expect(checkClosesN(body).status).toBe('fail')
      })
    }

    it(`${eolName}: same-line triple backticks stay an inline span, not a fence`, () => {
      expect(checkClosesN(['Ref ```Closes #5``` inline.'].join(eol)).status).toBe('fail')
    })

    it(`${eolName}: bare Closes #5 in the AEG:CLOSES anchor passes`, () => {
      const body = ['<!-- AEG:CLOSES:START -->', 'Closes #5', '<!-- AEG:CLOSES:END -->'].join(eol)
      expect(checkClosesN(body).status).toBe('pass')
    })

    it(`${eolName}: indented code block hides Closes #5`, () => {
      expect(checkClosesN(['Summary.', '', '    Closes #5', ''].join(eol)).status).toBe('fail')
    })

    it(`${eolName}: list-continuation Closes #5 is NOT treated as code`, () => {
      expect(checkClosesN(['- item', '', '    Closes #5', ''].join(eol)).status).toBe('pass')
    })
  }
})

/**
 * Separator bound — `\s{0,8}` replaced `\s*` to kill the quadratic backtrack
 * two adjacent unbounded `\s*` groups produce (PR #617 security LOW). These
 * pin both halves of the trade: every realistic separator still matches, and
 * the pathological body no longer costs seconds.
 */
describe('checkClosesN — separator bound', () => {
  it.each([
    ['no separator', 'Closes#5'],
    ['single space', 'Closes #5'],
    ['colon', 'Closes: #5'],
    ['colon, no space', 'Closes:#5'],
    ['newline', 'Closes\n#5'],
    ['eight spaces (the bound)', `Closes${' '.repeat(8)}#5`]
  ])('accepts %s', (_name, body) => {
    expect(checkClosesN(body).status).toBe('pass')
  })

  it('rejects a separator past the bound rather than scanning unboundedly', () => {
    expect(checkClosesN(`Closes${' '.repeat(40)}#5`).status).toBe('fail')
  })

  it('scans a 65k adversarial body in well under a second', () => {
    // GitHub's body cap is 65,536 chars. `closes` + all-whitespace + no `#` is
    // the worst case: pre-bound this measured ~2.65s, and `checkClosesN` runs
    // the pattern twice on the fail path. Threshold is ~5x the observed
    // post-fix time, so it flags a reintroduced backtrack, not runner jitter.
    const body = `closes${' '.repeat(65_536)}`
    const started = performance.now()
    expect(checkClosesN(body).status).toBe('fail')
    expect(performance.now() - started).toBeLessThan(500)
  })
})

describe('headerRegion', () => {
  it('returns everything before the first h2+ heading', () => {
    expect(headerRegion('Tier: 3\nProject: aeg\n\n## Summary\n\nbody')).toBe('Tier: 3\nProject: aeg\n\n')
  })
  it('returns the whole body when no h2+ heading exists', () => {
    expect(headerRegion('Tier: 3\nProject: aeg')).toBe('Tier: 3\nProject: aeg')
  })
  it('does not split on an h1 heading', () => {
    const body = '# Task Brief\n\nProject: aeg\n\n## Context'
    expect(headerRegion(body)).toBe('# Task Brief\n\nProject: aeg\n\n')
  })
})

describe('checkProjectField', () => {
  it('passes when a Project field is in the header block', () => {
    expect(checkProjectField(WELL_FORMED).status).toBe('pass')
  })
  it('accepts the plain and Project(s) label forms', () => {
    expect(checkProjectField('Project: aeg, aeg-core\n\n## Summary').status).toBe('pass')
    expect(checkProjectField('**Project(s):** aeg\n\n## Summary').status).toBe('pass')
  })
  it('fails when absent entirely', () => {
    const r = checkProjectField('Tier: 3\n\n## Summary\n\nno project field')
    expect(r.status).toBe('fail')
    expect(r.errors[0]).toMatch(/Project/)
  })
  it('fails when the field only appears in prose after a heading (#311 regression)', () => {
    const body = 'Tier: 3\n\n## Decisions made\n\n- The `Project:` field was omitted because reasons.'
    expect(checkProjectField(body).status).toBe('fail')
  })
})

describe('checkForField', () => {
  it('passes when a For field is in the header block', () => {
    expect(checkForField(WELL_FORMED).status).toBe('pass')
  })
  it('accepts the plain form', () => {
    expect(checkForField('For: Sonnet (dispatched)\n\n## Summary').status).toBe('pass')
  })
  it('fails when absent entirely', () => {
    const r = checkForField('Tier: 3\n\n## Summary')
    expect(r.status).toBe('fail')
    expect(r.errors[0]).toMatch(/For/)
  })
  it('does not false-positive on a sentence starting with "For"', () => {
    expect(checkForField('For example: this is prose, not a field\n\n## Summary').status).toBe('fail')
  })
})

describe('checkBriefSections', () => {
  it('passes every section on a well-formed brief when nothing is missing', () => {
    const { errors } = checkBriefSections(WELL_FORMED, readTierFromPrBody)
    expect(errors).toEqual([])
  })

  it('fails only the missing section when one is stripped out', () => {
    const withoutTestPlan = WELL_FORMED.replace(
      /## Test plan[\s\S]*?(?=## Scope)/,
      '## Test plan removed for this test\n\n'
    )
    const { errors } = checkBriefSections(withoutTestPlan, readTierFromPrBody)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatch(/Test Plan/)
  })

  it('fails Project and For when a body carries every gated section but drops the header fields (#311 regression)', () => {
    // PR #311's exact failure shape: the Developer satisfied every section the
    // gate checked and omitted the two it didn't. Gate-contract parity means
    // this body must now fail on exactly those two.
    const gamedBody = WELL_FORMED.replace(/\*\*For:\*\*[^\n]*\n/, '').replace(/\*\*Project:\*\*[^\n]*\n/, '')
    const { errors } = checkBriefSections(gamedBody, readTierFromPrBody)
    expect(errors).toHaveLength(2)
    expect(errors[0]).toMatch(/Project/)
    expect(errors[1]).toMatch(/For/)
  })
})

describe('isBriefShaped', () => {
  it('detects a real brief', () => {
    expect(isBriefShaped(WELL_FORMED)).toBe(true)
  })

  it('still detects a brief that is MISSING its documentation-update list', () => {
    // The exact live failure this gate exists for: a standalone fix brief
    // shipped with no §7 list. Detection must survive the omission it catches,
    // or the gate silently exempts precisely the bodies it should grade.
    const withoutDocList = WELL_FORMED.replace(/### 7\. Documentation-update list[\s\S]*?(?=### 10\.)/, '')
    expect(withoutDocList).not.toMatch(/Documentation-update list/)
    expect(isBriefShaped(withoutDocList)).toBe(true)
    expect(checkBriefSections(withoutDocList, readTierFromPrBody).errors).toEqual([
      expect.stringMatching(/Documentation-update list/)
    ])
  })

  it('does not detect an ordinary PR body — the exemption the bypass protects', () => {
    const dependencyBump =
      '## Summary\n\nBumps `zod` from 3.23.8 to 3.24.1.\n\n## Test plan\n\n- [ ] **[agent]** `bun test` passes.\n\n## Scope\n\nLockfile only.\n\n**Tier:** 0\n'
    expect(isBriefShaped(dependencyBump)).toBe(false)
  })

  it('does not detect a body carrying exactly one marker', () => {
    const oneMarker = '## Stop conditions\n\n- Something went wrong.\n'
    expect(isBriefShaped(oneMarker)).toBe(false)
  })

  it.each(
    fenceShapes()
  )('does not detect a brief QUOTED inside a fence ($name) — discussing a brief is not carrying one', ({
    open,
    close,
    eol
  }) => {
    const quoted = [
      '## Summary',
      '',
      "Documents the brief grammar. Here's a sample brief:",
      '',
      open,
      '## Technical surface map',
      '- `packages/aeg-core/src/brief-validation.ts`',
      '',
      '## Stop conditions',
      '- Pre-flight failure.',
      '',
      '**Autonomy:** Do not stop to ask clarifying questions.',
      close,
      ''
    ].join(eol)
    expect(isBriefShaped(quoted)).toBe(false)
  })
})

describe('inferBranchFromBody', () => {
  it('reads the branch from the Step 0 worktree command inside a fence', () => {
    expect(inferBranchFromBody(WELL_FORMED)).toBe('task/aeg-governance-hardening/2')
  })
  it('reads a non-task branch the same way', () => {
    expect(inferBranchFromBody('git worktree add .worktrees/fix/x -b fix/x origin/main')).toBe('fix/x')
  })
  it('returns empty when the body has no Step 0', () => {
    expect(inferBranchFromBody('## Summary\n\nA dependency bump.')).toBe('')
  })
})

describe('checkBriefSections — requireClosesN', () => {
  const withoutCloses = WELL_FORMED.replace('Closes #252', 'Ships it.')

  it('requires Closes #N by default (every existing caller is unchanged)', () => {
    const { errors } = checkBriefSections(withoutCloses, readTierFromPrBody)
    expect(errors).toEqual([expect.stringMatching(/Closes #N/)])
  })

  it('skips Closes #N when requireClosesN is false — a standalone fix brief has no Issue to close', () => {
    const { errors } = checkBriefSections(withoutCloses, readTierFromPrBody, { requireClosesN: false })
    expect(errors).toEqual([])
  })

  it('still grades every other section when requireClosesN is false', () => {
    const withoutDocList = withoutCloses.replace(/### 7\. Documentation-update list[\s\S]*?(?=### 10\.)/, '')
    const { errors } = checkBriefSections(withoutDocList, readTierFromPrBody, { requireClosesN: false })
    expect(errors).toEqual([expect.stringMatching(/Documentation-update list/)])
  })
})

describe('checkForgeTitle', () => {
  it('passes commit-style titles with and without scope', () => {
    expect(checkForgeTitle('Fix(aeg): Gate-contract parity for Project/For').status).toBe('pass')
    expect(checkForgeTitle('Docs: Update the readme').status).toBe('pass')
    expect(checkForgeTitle('Plan(aeg): Add task 5d — post-merge Archivist').status).toBe('pass')
  })
  it('passes task-style titles', () => {
    expect(checkForgeTitle('[aeg-governance-hardening] 5d — Post-merge Archivist automation').status).toBe('pass')
    expect(checkForgeTitle('[aeg-studio-cleanup] 2 — Remove dependency-graph + board view').status).toBe('pass')
  })
  it('fails freeform titles', () => {
    expect(checkForgeTitle('fixed some stuff').status).toBe('fail')
    expect(checkForgeTitle('WIP do not merge').status).toBe('fail')
    expect(checkForgeTitle('feat: lowercase type').status).toBe('fail')
  })
  it('fails a bare type with no description', () => {
    expect(checkForgeTitle('Fix: ').status).toBe('fail')
  })
})

describe('checkPlanPrNoCloses', () => {
  it('fails a plan/* branch whose body carries Closes #N', () => {
    const result = checkPlanPrNoCloses('plan/aeg-consolidation', 'This plan adds tasks. Closes #123')
    expect(result.status).toBe('fail')
    expect(result.errors[0]).toMatch(/plan-PR guard/)
  })

  it('passes a plan/* branch whose body has no Closes reference', () => {
    const result = checkPlanPrNoCloses('plan/aeg-consolidation', 'This plan adds tasks 1-5 to the topology.')
    expect(result.status).toBe('pass')
    expect(result.errors).toEqual([])
  })

  it('passes a task/* branch with Closes #N — unaffected by the guard', () => {
    const result = checkPlanPrNoCloses('task/aeg-governance-hardening/5d', 'Ships the thing. Closes #309')
    expect(result.status).toBe('pass')
    expect(result.errors).toEqual([])
  })

  it('passes a non-plan, non-task branch regardless of body', () => {
    const result = checkPlanPrNoCloses('fix/something', 'Fixes a bug. Closes #1')
    expect(result.status).toBe('pass')
  })

  it('is case-insensitive on the Closes keyword', () => {
    const result = checkPlanPrNoCloses('plan/x', 'this CLOSES #42 is bad')
    expect(result.status).toBe('fail')
  })
})

describe('checkPremiseCoverage', () => {
  it('passes trivially when surfaceFiles is empty (no code surface to pin)', () => {
    const result = checkPremiseCoverage('no premise section at all', [])
    expect(result.status).toBe('pass')
  })

  it('passes when a Premise assertion path matches a surface file', () => {
    const body = `**Premise:**
- src/dispatch-gate.ts contains: export function checkDispatchReadiness
`
    const result = checkPremiseCoverage(body, ['src/dispatch-gate.ts', 'src/dispatch-gate.test.ts'])
    expect(result.status).toBe('pass')
  })

  it('fails when there is a code surface but no matching Premise assertion', () => {
    const result = checkPremiseCoverage('no premise section at all', ['src/dispatch-gate.ts'])
    expect(result.status).toBe('fail')
    expect(result.errors[0]).toContain('Premise')
  })

  it('fails when a Premise assertion exists but pins an unrelated path', () => {
    const body = `**Premise:**
- src/unrelated.ts contains: something
`
    const result = checkPremiseCoverage(body, ['src/dispatch-gate.ts'])
    expect(result.status).toBe('fail')
  })
})
