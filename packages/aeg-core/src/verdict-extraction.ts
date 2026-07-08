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
 * merely matching the loose marker pattern (aeg-review-gate-v1 task 1 fix —
 * the original single-comment `.find()` broke on real multi-comment PRs:
 * a REQUEST_CHANGES verdict followed by fixes and a later clean APPROVE, or
 * the post-merge Archivist's own DANGLING-note prose — which contains the
 * word "verdict" — loosely matching the marker pattern ahead of a genuine
 * later verdict comment. Verified live against PR #461/#472, both of which
 * carry exactly this shape). A comment only counts as ambiguous/"unclear"
 * when at least one comment matches the marker but NONE carries a clear value.
 */

export type VerdictExtraction = { value: string; danglingNote: string | null }

function extractVerdict(
  comments: string[],
  markerPattern: RegExp,
  valuePattern: RegExp,
  missingLabel: string
): VerdictExtraction {
  const clearHits = comments.filter((c) => valuePattern.test(c))
  if (clearHits.length > 0) {
    const latest = clearHits[clearHits.length - 1] as string
    const m = latest.match(valuePattern) as RegExpMatchArray
    return { value: (m[1] as string).toUpperCase().replace(/[_-]/g, ' '), danglingNote: null }
  }

  const ambiguousHit = comments.find((c) => markerPattern.test(c))
  if (!ambiguousHit) {
    return {
      value: `no ${missingLabel} pass was run before merge — DANGLING, see below`,
      danglingNote: `no ${missingLabel} verdict comment found on this PR`
    }
  }
  return {
    value: `${missingLabel} comment found but verdict marker unclear — DANGLING, see below`,
    danglingNote: `${missingLabel} comment found but could not extract a clear verdict marker`
  }
}

/** `value` is `APPROVE`, `REQUEST CHANGES`, `LGTM`, or a DANGLING placeholder string. */
export function extractCodeReviewVerdict(comments: string[]): VerdictExtraction {
  return extractVerdict(
    comments,
    /verdict|APPROVE|REQUEST[ _-]?CHANGES|LGTM/i,
    /\b(APPROVE|REQUEST[ _-]?CHANGES|LGTM)\b/i,
    'code-reviewer'
  )
}

/** `value` is `PASS`, `FAIL`, or a DANGLING placeholder string. */
export function extractSecurityReviewVerdict(comments: string[]): VerdictExtraction {
  return extractVerdict(
    comments,
    /security.*\b(PASS|FAIL)\b|\b(PASS|FAIL)\b.*security/i,
    /\b(PASS|FAIL)\b/i,
    'security-review'
  )
}
