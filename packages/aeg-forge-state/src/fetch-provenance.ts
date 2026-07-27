/**
 * Provenance fetch — the single implementation of the "does this Issue's
 * closing PR carry an `### AEG provenance` block?" fact.
 *
 * Moved here from `packages/aeg-core/bin/verify-coherence.ts` (task 28, #372
 * bundled finding) so Studio's server components can call it without pulling
 * in that CLI's top-level `process.chdir` side effect. The CLIs
 * (`verify-coherence.ts`, `verify-dispatch.ts`) import it from here — same
 * direction as their existing `fetchForgeFacts`/`resolveRepo` imports. One
 * implementation per fact (discipline); do not re-implement.
 *
 * Read-only, always. No writes, no labels, no comments.
 */

import { graphql } from '@octokit/graphql'

const PROVENANCE_PATTERN = /^###\s+AEG provenance\b/im

/**
 * True only when `text` carries a provenance block whose own `Issue:` field
 * names `issueNum`. Required by the cross-reference fallback below: an
 * unrelated PR can legitimately mention `#<issueNum>` in passing while
 * carrying a genuine provenance block for a *different* task (confirmed
 * live — PR #193 mentions #170 but its provenance targets #171; PR #321
 * mentions #168 but targets #282). Matches `buildProvenanceBlock`'s fixed
 * `- Issue:        #<N>` line (`archive-task.ts`).
 */
function provenanceMatchesIssue(text: string, issueNum: number): boolean {
  if (!PROVENANCE_PATTERN.test(text)) return false
  const m = text.match(/^-\s*Issue:\s*#(\d+)/im)
  return m !== null && Number(m[1]) === issueNum
}

type CloserPr = { number: number; body: string; comments: { nodes: Array<{ body: string }> } }
type CloserNode = CloserPr | Record<string, never> | null

function isPrCloser(closer: CloserNode): closer is CloserPr {
  return closer !== null && typeof (closer as CloserPr).number === 'number'
}

type ProvenanceResponse = {
  repository: Record<string, { timelineItems: { nodes: Array<{ closer: CloserNode }> } } | null> | null
}

type CrossRefPr = { number: number; body: string; comments: { nodes: Array<{ body: string }> } }
type CrossRefSource = CrossRefPr | Record<string, never> | null
type CrossRefResponse = {
  repository: Record<string, { timelineItems: { nodes: Array<{ source: CrossRefSource }> } } | null> | null
}

/**
 * Fallback for issues whose most-recent `ClosedEvent` has no PR `closer` —
 * the confirmed case for Issues closed via an explicit `gh issue close`
 * (the manual-close path, live case: Issue #170), where the primary
 * fallback would return `false` for all three.
 *
 * Instead this searches `CROSS_REFERENCED_EVENT` timeline items, which
 * GitHub populates for *any* PR that mentions `#<issueNum>` anywhere (not
 * only an unresolved `Closes #N` link) — covering both the "PR body never
 * linked the issue" case and the "link was present but native auto-close
 * didn't fire" case (#170 → PR #191) with one mechanism. Candidates are
 * verified with `provenanceMatchesIssue` so an unrelated cross-referenced PR
 * carrying someone else's provenance can't produce a false positive.
 */
async function fetchProvenanceViaCrossReferences(
  issueNums: number[],
  owner: string,
  repo: string,
  token: string
): Promise<Map<number, boolean>> {
  const result = new Map<number, boolean>()
  if (issueNums.length === 0) return result

  const client = graphql.defaults({ headers: { authorization: `bearer ${token}` } })

  const perIssue = issueNums
    .map(
      (n) => `
    i_${n}: issue(number: ${n}) {
      timelineItems(first: 50, itemTypes: [CROSS_REFERENCED_EVENT]) {
        nodes {
          ... on CrossReferencedEvent {
            source {
              ... on PullRequest {
                number
                body
                comments(first: 50) { nodes { body } }
              }
            }
          }
        }
      }
    }`
    )
    .join('')

  const query = `query ProvenanceCrossRef($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {${perIssue}
  }
}`

  let response: CrossRefResponse
  try {
    response = await client<CrossRefResponse>(query, { owner, repo })
  } catch {
    return result
  }

  if (!response.repository) return result

  for (const n of issueNums) {
    const raw = response.repository[`i_${n}`]
    const nodes = raw?.timelineItems?.nodes ?? []
    const found = nodes.some(({ source }) => {
      if (!source || typeof (source as CrossRefPr).number !== 'number') return false
      const pr = source as CrossRefPr
      if (provenanceMatchesIssue(pr.body ?? '', n)) return true
      return pr.comments.nodes.some((c) => provenanceMatchesIssue(c.body, n))
    })
    result.set(n, found)
  }

  return result
}

/**
 * Batch-fetch closing-PR bodies + comments for `issueNums` and return a map
 * of issue number → `true` when `### AEG provenance` is found in the PR body
 * or any of its first 50 comments.
 *
 * Fetches the most recent `ClosedEvent` (`last: 1`, not `first: 1`) — a
 * reopened-then-reclosed issue's real closer is the *last* `ClosedEvent`, not
 * the first (confirmed live: Issue #287 was closed by PR #288, reopened,
 * then really closed by PR #313 — the PR carrying provenance). `timelineItems`
 * supports `last` combined with `itemTypes` filtering directly, so no
 * client-side bounded-window workaround is needed.
 *
 * When the resolved closer isn't a PR (explicit `gh issue close`, closer is
 * null), falls back to `fetchProvenanceViaCrossReferences`.
 *
 * Returns an empty Map (all skipped) when no token is available.
 */
export async function fetchProvenance(
  issueNums: number[],
  owner: string,
  repo: string,
  token: string
): Promise<Map<number, boolean>> {
  const result = new Map<number, boolean>()
  if (issueNums.length === 0) return result

  const client = graphql.defaults({ headers: { authorization: `bearer ${token}` } })

  const perIssue = issueNums
    .map(
      (n) => `
    i_${n}: issue(number: ${n}) {
      timelineItems(last: 1, itemTypes: [CLOSED_EVENT]) {
        nodes {
          ... on ClosedEvent {
            closer {
              ... on PullRequest {
                number
                body
                comments(first: 50) {
                  nodes { body }
                }
              }
            }
          }
        }
      }
    }`
    )
    .join('')

  const query = `query Provenance($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {${perIssue}
  }
}`

  let response: ProvenanceResponse
  try {
    response = await client<ProvenanceResponse>(query, { owner, repo })
  } catch {
    return result // network / auth error — A2 will skip entries with no key
  }

  if (!response.repository) return result

  const needsFallback: number[] = []

  for (const n of issueNums) {
    const raw = response.repository[`i_${n}`]
    if (!raw) {
      result.set(n, false)
      continue
    }
    const closer = raw.timelineItems?.nodes?.[0]?.closer
    const c = closer ?? null
    if (!isPrCloser(c)) {
      needsFallback.push(n)
      continue
    }
    const bodyHas = PROVENANCE_PATTERN.test(c.body ?? '')
    const commentHas = c.comments.nodes.some((x) => PROVENANCE_PATTERN.test(x.body))
    result.set(n, bodyHas || commentHas)
  }

  if (needsFallback.length > 0) {
    const fallback = await fetchProvenanceViaCrossReferences(needsFallback, owner, repo, token)
    for (const [n, found] of fallback) result.set(n, found)
  }

  return result
}
