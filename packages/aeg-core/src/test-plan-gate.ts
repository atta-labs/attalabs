/**
 * Test Plan checkbox-state gate evaluator (; aeg-governance-hardening
 * task 25, #365). Pure — no `fs`, no `gh`/`git`. The CLI shim
 * (`bin/verify-test-plan.ts`) reads `PR_BODY`/`BRANCH` from env and prints
 * this function's messages.
 *
 * See `locateTestPlanSection` for section-boundary detection (both the
 * inline `**Test Plan:**` marker and the `## N. Test Plan` heading form).
 * This module owns the checkbox tick-state decision built on top of it:
 *
 * - No section found, task branch → `fail` (a task PR without a
 *     Test Plan is malformed, not exempt — the exact #377 live-fire gap).
 *   - No section found, non-task branch (or no BRANCH) → `pass` (advisory).
 *   - `Test Plan: unit-tests-only` sentinel → `pass`.
 *   - Any unticked `- [ ]` checkbox → `fail`, naming every unticked line.
 *   - All boxes ticked (or no checkbox items at all) → `pass`.
 */

import { locateTestPlanSection } from './test-plan-section'

export type TestPlanGateVerdict = 'pass' | 'fail'
export type TestPlanGateResult = { verdict: TestPlanGateVerdict; messages: string[] }

const TASK_BRANCH_PATTERN = /^task\/[^/]+\/[^/]+$/

export function evaluateTestPlanGate(body: string, branch: string): TestPlanGateResult {
  if (!body) {
    return {
      verdict: 'pass',
      messages: [
        'PR_BODY env var is empty; nothing to check.',
        'PASS (no body — likely a local invocation; CI sets PR_BODY automatically).'
      ]
    }
  }

  const located = locateTestPlanSection(body)

  if (!located.found) {
    if (TASK_BRANCH_PATTERN.test(branch)) {
      return {
        verdict: 'fail',
        messages: [
          `FAIL — no Test Plan section found in the PR body for task branch \`${branch}\`.`,
          'Searched for a `## Test Plan` / `## N. Test Plan` heading and an inline `**Test Plan:**`/`Test Plan:` marker — neither was found.',
          'Per D-049, a task PR without a Test Plan is malformed, not exempt — add one (or `Test Plan: unit-tests-only` for a pure-logic brief with no runtime surface).'
        ]
      }
    }
    return {
      verdict: 'pass',
      messages: [
        'No Test Plan section in PR body.',
        'PASS (advisory) — see aeg-root/roles/developer.md (Verification) and aeg-root/skills/brief-authoring/SKILL.md §9.',
        'Non-task branch (or BRANCH unset) — a brief that touches a runtime surface and has no Test Plan is malformed on a task branch; Brief Validation catches that case pre-dispatch.'
      ]
    }
  }

  const section = located.section

  if (/unit-tests-only/i.test(section)) {
    return {
      verdict: 'pass',
      messages: ['Test Plan: unit-tests-only — pure-logic brief, CI unit-tests are the proof.', 'PASS.']
    }
  }

  const checkboxLines = section
    .split('\n')
    .map((line) => line.trimStart())
    .filter((line) => /^[-*]\s+\[[ xX]\]/.test(line))

  if (checkboxLines.length === 0) {
    return {
      verdict: 'pass',
      messages: [
        'Test Plan section found but has no checkbox items.',
        "PASS (advisory) — the section may be empty or expressed in prose; verification is the Principal's call."
      ]
    }
  }

  const unchecked = checkboxLines.filter((line) => /^[-*]\s+\[\s\]/.test(line))
  const checked = checkboxLines.filter((line) => /^[-*]\s+\[[xX]\]/.test(line))

  const messages = [`Test Plan items: ${checked.length} ticked, ${unchecked.length} unticked.`]

  if (unchecked.length > 0) {
    messages.push('', 'FAIL — the following Test Plan items are unticked:')
    for (const line of unchecked) messages.push(`  ${line}`)
    messages.push(
      '',
      'Per D-049 and aeg-root/roles/developer.md (Verification), a PR is not mergeable while any Test Plan box is unticked.',
      '- [agent] items: the Developer-agent posts the actual command output as evidence and ticks the box.',
      '- [principal] items: the Principal runs the item in a real signed-in browser and ticks the box.',
      'Note: editing the PR body does not retrigger most workflows. If your PR body changes do not surface here, push an empty commit to re-run.'
    )
    return { verdict: 'fail', messages }
  }

  messages.push('All Test Plan items ticked — runtime verification complete.', 'PASS.')
  return { verdict: 'pass', messages }
}
