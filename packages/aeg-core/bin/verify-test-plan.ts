#!/usr/bin/env bun

/**
 * verify-test-plan — runtime Test Plan checkbox-state gate (D-049).
 *
 * Reads the PR body from $PR_BODY (the same env var verify-docs uses) and asserts
 * the Verification phase's checkbox state:
 *
 *   - If the body has no `Test Plan:` section → PASS with a warning.
 *     (Don't break existing PRs that predate D-049. Brief Validation catches the
 *     "missing Test Plan" malformed-brief case separately, before dispatch.)
 *   - If the body declares `Test Plan: unit-tests-only` → PASS.
 *     (First-class allowed value for pure-logic briefs whose §4 surface has no
 *     runtime path. The CI unit-test gate is the whole proof.)
 *   - If the body's Test Plan section has any unchecked `- [ ]` box → FAIL.
 *     (An unchecked box means runtime verification hasn't happened — the
 *     `[agent]` evidence isn't posted yet, or the Principal hasn't ticked the
 *     `[principal]` boxes in the browser yet.)
 *   - If every box is `- [x]` (ticked) → PASS.
 *
 * The doctrine (Phase 11 Verification — `aeg-root/process.md`, `roles/verifier.md`)
 * holds whether this CI check is wired into branch protection or not. This script
 * is the optional enforcer that surfaces the checkbox state on every PR push.
 *
 * Scope is deliberately small (per D-049 — "Do NOT over-engineer; a checkbox-state
 * parse is the whole scope").
 */

const body = process.env.PR_BODY ?? ''

if (!body) {
  console.log('[verify-test-plan] PR_BODY env var is empty; nothing to check.')
  console.log('[verify-test-plan] PASS (no body — likely a local invocation; CI sets PR_BODY automatically).')
  process.exit(0)
}

const testPlanSectionRe = /(^|\n)\s*\*{0,2}Test Plan:?\*{0,2}/i
const sectionMatch = body.match(testPlanSectionRe)

if (!sectionMatch) {
  console.log('[verify-test-plan] No `Test Plan:` section in PR body.')
  console.log(
    '[verify-test-plan] PASS (advisory) — see aeg-root/roles/verifier.md and aeg-root/skills/brief-authoring/SKILL.md §9.'
  )
  console.log(
    '[verify-test-plan] A brief that touches a runtime surface and has no Test Plan is malformed; Brief Validation catches that case pre-dispatch.'
  )
  process.exit(0)
}

const sectionStart = sectionMatch.index ?? 0
const sectionBody = body.slice(sectionStart)

const nextSectionRe = /\n(?:#{1,3}\s|\*\*[A-Z][^*\n]*:\*\*)/
const nextMatch = sectionBody.slice(20).match(nextSectionRe)
const sectionEnd = nextMatch ? 20 + (nextMatch.index ?? sectionBody.length) : sectionBody.length
const section = sectionBody.slice(0, sectionEnd)

if (/unit-tests-only/i.test(section)) {
  console.log('[verify-test-plan] Test Plan: unit-tests-only — pure-logic brief, CI unit-tests are the proof.')
  console.log('[verify-test-plan] PASS.')
  process.exit(0)
}

const checkboxLines = section
  .split('\n')
  .map((line) => line.trimStart())
  .filter((line) => /^[-*]\s+\[[ xX]\]/.test(line))

if (checkboxLines.length === 0) {
  console.log('[verify-test-plan] Test Plan section found but has no checkbox items.')
  console.log(
    "[verify-test-plan] PASS (advisory) — the section may be empty or expressed in prose; verification is the Principal's call."
  )
  process.exit(0)
}

const unchecked = checkboxLines.filter((line) => /^[-*]\s+\[\s\]/.test(line))
const checked = checkboxLines.filter((line) => /^[-*]\s+\[[xX]\]/.test(line))

console.log(`[verify-test-plan] Test Plan items: ${checked.length} ticked, ${unchecked.length} unticked.`)

if (unchecked.length > 0) {
  console.log('')
  console.log('[verify-test-plan] FAIL — the following Test Plan items are unticked:')
  for (const line of unchecked) {
    console.log(`  ${line}`)
  }
  console.log('')
  console.log(
    '[verify-test-plan] Per D-049 and aeg-root/roles/verifier.md, a PR is not mergeable while any Test Plan box is unticked.'
  )
  console.log(
    '[verify-test-plan] - [agent] items: the Developer-agent posts the actual command output as evidence and ticks the box.'
  )
  console.log(
    '[verify-test-plan] - [principal] items: the Principal runs the item in a real signed-in browser and ticks the box.'
  )
  console.log(
    '[verify-test-plan] Note: editing the PR body does not retrigger most workflows. If your PR body changes do not surface here, push an empty commit to re-run.'
  )
  process.exit(1)
}

console.log('[verify-test-plan] All Test Plan items ticked — runtime verification complete.')
console.log('[verify-test-plan] PASS.')
process.exit(0)
