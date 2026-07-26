/**
 * Single-plan-PR guard predicate ( task 19 / #336). Extracted from
 * `bin/open-pr.ts` (aeg-governance-hardening task 24, #364, Part 1) so the
 * exact same implementation can be consumed by both the ring-0 local wrapper
 * (`open-pr.ts`, prevention) and a ring-1 CI check (detection, for PRs opened
 * via the web UI that bypass the wrapper entirely) — one implementation per
 * fact (§11 constraint), never a second copy of this predicate.
 *
 * Pure — no `fs`, no `gh`/`git` I/O. Callers gather the facts (this branch's
 * touched files, every other open PR's touched files) and pass them in.
 */

/**
 * Parses an iteration slug from a touched file path, when that path is an
 * active (non-`completed/`) iteration topology file. Returns `null` for
 * everything else — including `README.md` and `*.tokens.md`, neither of
 * which is a topology file the single-plan-PR guard (below) cares about.
 */
export function iterationSlugFromTopologyPath(path: string): string | null {
  const m = path.match(/^aeg-root\/iterations\/([^/]+)\.md$/)
  if (!m) return null
  const slug = m[1] as string
  if (slug === 'README' || slug.endsWith('.tokens')) return null
  return slug
}

export type OpenPrFiles = { number: number; files: string[] }

/**
 * Single-plan-PR guard ( task 19 / #336): refuses a plan-branch diff
 * that touches an iteration's topology file when another OPEN PR's diff
 * already touches that SAME iteration's topology file. Ends the plan-PR
 * race that produced two concurrent plan PRs for `aeg-governance-hardening`
 * itself (#352/#354) — each cut from `origin/main` unaware of the other's
 * newly-cut Issue.
 *
 * `branchFiles` is this branch's diff vs `origin/main` (or vs the PR's
 * base); `otherOpenPrs` is every other currently-open PR's touched files
 * (the caller excludes this PR's own number when editing). An ordinary
 * task-branch PR touches no topology file at all, so `branchFiles` yields
 * no slugs and this passes trivially without even needing `otherOpenPrs`.
 */
export function checkSinglePlanPr(
  branchFiles: string[],
  otherOpenPrs: OpenPrFiles[]
): { ok: boolean; message?: string } {
  const touchedSlugs = new Set(branchFiles.map(iterationSlugFromTopologyPath).filter((s): s is string => s !== null))
  if (touchedSlugs.size === 0) return { ok: true }

  for (const pr of otherOpenPrs) {
    const otherSlugs = new Set(pr.files.map(iterationSlugFromTopologyPath).filter((s): s is string => s !== null))
    for (const slug of touchedSlugs) {
      if (otherSlugs.has(slug)) {
        return {
          ok: false,
          message: `single-plan-pr: another open PR (#${pr.number}) already touches iteration "${slug}"'s topology file. Only one open plan PR per iteration is allowed at a time — wait for #${pr.number} to merge or close, or coordinate with its author.`
        }
      }
    }
  }
  return { ok: true }
}

/** True when any of `files` touches an active iteration's topology file — i.e. this diff is a plan-PR diff. */
export function touchesAnyTopology(files: string[]): boolean {
  return files.some((f) => iterationSlugFromTopologyPath(f) !== null)
}
