/**
 * Test Plan section locator (aeg-governance-hardening task 25, #365). Pure —
 * no `fs`, no `gh`/`git`. Extracted from `bin/verify-test-plan.ts`'s original
 * inline-only regex to fix the live-fire gap PR #377 exposed: its body used
 * the `## 9. Test Plan` heading form, which the old inline-only regex never
 * matched, so `verify-test-plan` reported "no section" and advisory-PASSED a
 * PR that actually had an unticked `**[principal]**` box.
 *
 * Recognizes BOTH forms `roles/developer.md`'s canonical PR-body template and
 * real brief numbering produce:
 *   - Heading form:  `## Test Plan`, `## 9. Test Plan`, `### 9a. Test Plan`
 *   - Inline form:   `**Test Plan:**`, `Test Plan:` (optionally followed on
 *                     the same line by the `unit-tests-only` sentinel)
 *
 * NOT unified with `brief-validation.ts`'s `checkTestPlan`/
 * `checkTestPlanExclusivity` (the closest analogs to the brief's named
 * `checkPlanShape`, which does not exist under that name in this codebase):
 * those are whole-body presence checks (a Test Plan section is not
 * even located — they match `**[agent]**`/`**[principal]**` tags or the
 * `unit-tests-only` sentinel anywhere in the PR body), used pre-dispatch to
 * validate brief shape. This module locates section BOUNDARIES to check
 * checkbox tick-state at PR-open/push time — a different property. Unifying
 * would force `checkTestPlan` to become section-scoped, changing its
 * already-shipped pass/fail behavior — see this task's PR body for the
 * decision record.
 */

export type TestPlanSection = { found: true; section: string } | { found: false }

const HEADING_FORM_RE = /^#{1,4}[ \t]*(?:\d+[a-z]?\.[ \t]*)?\*{0,2}Test Plan\*{0,2}[ \t]*$/im
const INLINE_FORM_RE = /^[ \t]*\*{0,2}Test Plan:?\*{0,2}/im
const NEXT_SECTION_RE = /\n(?:#{1,3}[ \t]|\*\*[A-Z][^*\n]*:\*\*)/

/**
 * Locates the Test Plan section (heading form preferred, falling back to the
 * inline marker form) and slices it out up to — but not including — the next
 * heading or `**Field:**`-style section boundary. Returns `{ found: false }`
 * when neither form is present anywhere in the body.
 */
export function locateTestPlanSection(body: string): TestPlanSection {
  const headingMatch = HEADING_FORM_RE.exec(body)
  const match = headingMatch ?? INLINE_FORM_RE.exec(body)
  if (!match || match.index === undefined) return { found: false }

  const sectionBody = body.slice(match.index)
  const firstLineEnd = sectionBody.indexOf('\n')
  const searchFrom = firstLineEnd === -1 ? sectionBody.length : firstLineEnd + 1
  const nextMatch = sectionBody.slice(searchFrom).match(NEXT_SECTION_RE)
  const sectionEnd = nextMatch ? searchFrom + (nextMatch.index ?? 0) : sectionBody.length

  return { found: true, section: sectionBody.slice(0, sectionEnd) }
}
