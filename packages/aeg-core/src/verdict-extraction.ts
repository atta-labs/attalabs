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
 * The anchor tolerates a leading markdown EMPHASIS run — one to three `*` or
 * `_`, immediately abutting the token — so `**VERDICT: APPROVE**` and
 * `_VERDICT: APPROVE_` match (PR #636: the reviewer subagent emitted the
 * bolded form and the gate read the PR as carrying no code-review verdict at
 * all). The spec still mandates the bare line; this only stops an agent's
 * markdown drift from silently DANGLING a real verdict.
 *
 * Emphasis ONLY — the following are deliberately NOT tolerated, because each
 * is a way for prose to *mention* a verdict rather than *cast* one, and this
 * gate blocks merges (#639 review, findings 1/3/5):
 *   `> VERDICT: APPROVE`   blockquote — GitHub's quote-reply syntax. A
 *                          Developer quoting the reviewer's earlier text
 *                          would otherwise become the PR's own verdict, and
 *                          most-recent-hit-wins means the quote beats a live
 *                          REQUEST CHANGES. Fail-open and silent.
 *   `* VERDICT: APPROVE`   list item — the space is what distinguishes it
 *                          from emphasis; a bullet is prose context. `-` and
 *                          `1.` never matched, so `*` must not either.
 *   `# VERDICT: APPROVE`   heading — same mention-not-cast reasoning.
 *   `` `VERDICT: APPROVE` ``  code span — decided, not overlooked. A
 *                          backticked marker is exactly how the role docs
 *                          and this comment WRITE about the contract, so
 *                          tolerating it would match prose describing the
 *                          rule. If a real agent ever emits the backticked
 *                          form, fix the agent: it fails loud (DANGLING),
 *                          which is the safe direction.
 *
 * The value-side boundary is `(?![A-Za-z0-9])`, not `\b`: `_` is a word
 * character, so `\b` after the captured value would reject the closing `_` of
 * `_VERDICT: APPROVE_` while accepting the `*` of the bolded form — the class
 * and the claim would disagree. It still rejects `APPROVED`/`PASSED`.
 *
 * What is NOT loosened is the requirement that a literal `VERDICT:` token be
 * present — ordinary prose and the Archivist's own DANGLING placeholder still
 * miss.
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
  return extractVerdict(
    comments,
    /^[ \t]*(?:\*{1,3}|_{1,3})?VERDICT:\s*(APPROVE|REQUEST[ _-]?CHANGES|LGTM)(?![A-Za-z0-9])/im,
    'code-reviewer'
  )
}

/** `value` is `PASS`, `FAIL`, or a DANGLING placeholder string. */
export function extractSecurityReviewVerdict(comments: string[]): VerdictExtraction {
  return extractVerdict(
    comments,
    /^[ \t]*(?:\*{1,3}|_{1,3})?VERDICT:\s*(PASS|FAIL)(?![A-Za-z0-9])/im,
    'security-review'
  )
}
