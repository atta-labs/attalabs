/**
 * Shared code-reviewer / security-review verdict extraction (aeg-review-gate-v1
 * task 1, #474). Originally private to `archive-task.ts`'s post-merge
 * provenance assembly (advisory-only, DANGLING on a missing/unclear verdict).
 * Extracted so the pre-merge `review-gate.ts` blocking check calls the
 * IDENTICAL regex/parsing logic — a future drift between two copies of the
 * same pattern would silently reopen the gap this task exists to close (one
 * implementation per fact, §11 constraint). Pure — no `fs`, no `fetch`.
 *
 * Picks the MOST RECENT comment carrying a clear value, not the first comment
 * merely matching the pattern (aeg-review-gate-v1 task 1 fix — the original
 * single-comment `.find()` broke on real multi-comment PRs: a REQUEST_CHANGES
 * verdict followed by fixes and a later clean APPROVE).
 *
 * Line-anchored `VERDICT:` marker only — NOT a bare word search anywhere in
 * the comment (aeg-review-gate-v1 task 1 follow-up, security-review FAIL
 * finding, confirmed by direct execution: the old bare `\b(PASS|FAIL)\b`
 * pattern matched the post-merge Archivist's own auto-generated DANGLING
 * placeholder text — "no security-review pass was run before merge —
 * DANGLING, see below" — as a clean PASS, since it contains the standalone
 * word "pass". Same risk in reverse for "APPROVE" inside ordinary prose,
 * e.g. "I do NOT approve of that design"). `^\s*VERDICT:\s*<value>\b`,
 * multiline, is the real subagent contract (`roles/reviewer.md`/
 * `roles/security.md`'s own VERDICT block, which `.claude/agents/
 * code-reviewer.md`/`security-reviewer.md` require verbatim) — tightening
 * to it closes the gap without inventing a new convention.
 *
 * The anchor tolerates leading markdown emphasis/structure characters
 * (`*`, `_`, `#`, `>`) before the literal token, so a bolded or quoted
 * `**VERDICT: APPROVE**` line still matches (PR #636: the reviewer subagent
 * emitted the bolded form and the gate read the PR as carrying no code-review
 * verdict at all). The spec still mandates the bare line; this only stops an
 * agent's markdown drift from silently DANGLING a real verdict. What is NOT
 * loosened is the requirement that a literal `VERDICT:` token be present —
 * ordinary prose and the Archivist's own DANGLING placeholder still miss.
 *
 * No separate "marker present but value unclear" branch: a generic
 * `VERDICT:`-prefix-only marker would itself cross-contaminate the two
 * extractors (a security reviewer's own `VERDICT: PASS` line would loosely
 * match the code-review marker too, misreporting "code-reviewer comment
 * found but unclear" for a comment that was never a code review at all).
 * Anything that doesn't match the exact value pattern reads as "missing",
 * identical to no comment existing — which is also what the DANGLING
 * placeholder case above requires.
 */

export type VerdictExtraction = { value: string; danglingNote: string | null }

function extractVerdict(comments: string[], valuePattern: RegExp, missingLabel: string): VerdictExtraction {
  const clearHits = comments.filter((c) => valuePattern.test(c))
  if (clearHits.length > 0) {
    const latest = clearHits[clearHits.length - 1] as string
    const m = latest.match(valuePattern) as RegExpMatchArray
    return { value: (m[1] as string).toUpperCase().replace(/[_-]/g, ' '), danglingNote: null }
  }

  return {
    value: `no ${missingLabel} pass was run before merge — DANGLING, see below`,
    danglingNote: `no ${missingLabel} verdict comment found on this PR`
  }
}

/** `value` is `APPROVE`, `REQUEST CHANGES`, `LGTM`, or a DANGLING placeholder string. */
export function extractCodeReviewVerdict(comments: string[]): VerdictExtraction {
  return extractVerdict(comments, /^[\s>*_#]*VERDICT:\s*(APPROVE|REQUEST[ _-]?CHANGES|LGTM)\b/im, 'code-reviewer')
}

/** `value` is `PASS`, `FAIL`, or a DANGLING placeholder string. */
export function extractSecurityReviewVerdict(comments: string[]): VerdictExtraction {
  return extractVerdict(comments, /^[\s>*_#]*VERDICT:\s*(PASS|FAIL)\b/im, 'security-review')
}
