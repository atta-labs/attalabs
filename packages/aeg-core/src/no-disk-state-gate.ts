/**
 * check-no-disk-state — pure evaluator (forge-sole-state task 1). Fails the
 * build if the tracked working tree contains a file that represents AEG work
 * state: iteration topology, task lists, or dependency/conflict edges. GitHub
 * (Issues, Milestones, PRs) is the sole state store (`iterations/README.md`
 * §4, §11 — forge-sole-state task 1's rewrite). Doctrine, reference, and a
 * small, closed, pre-`aeg-forge-state-v1` set of legacy iterations (no
 * Milestone exists to forge-derive their topology from — see
 * `iterations/README.md` §11) are NOT state and are explicitly grandfathered
 * below.
 *
 * Two failure classes:
 *   - LIVE: any `aeg-root/iterations/*.md` (top level, non-recursive) other
 *     than `README.md`. No exceptions — every active iteration is forge-native
 *     post this task; a live topology file can never legitimately reappear.
 *   - NEW-LEGACY: any `aeg-root/iterations/completed/*.md` or `*.tokens.md`
 *     path (anywhere in the repo) that is NOT already in the fixed
 *     grandfathered allowlist. The allowlist is closed — it cannot grow. A
 *     newly-completed iteration always has a Milestone (D-110) and needs no
 *     file; only the pre-Milestone-era set below is exempt, forever, by
 *     construction (adding to the allowlist recreates the disk-state problem
 *     this gate exists to prevent).
 */

/**
 * The closed, non-growing set of legacy files kept because no Milestone
 * exists to forge-derive their data from (`iterations/README.md` §11).
 * Verified against the live forge at authoring time (forge-sole-state task 1
 * PR body carries the check). Do not add to this list — a file that needs
 * adding here is a sign a Milestone should be backfilled instead, or that a
 * genuinely new disk-state regression is happening.
 */
export const GRANDFATHERED_LEGACY_PATHS: ReadonlySet<string> = new Set([
  'aeg-root/iterations/completed/aeg-coherence-v1.md',
  'aeg-root/iterations/completed/aeg-coherence-v1.tokens.md',
  'aeg-root/iterations/completed/aeg-consolidation.md',
  'aeg-root/iterations/completed/aeg-governance-hardening.md',
  'aeg-root/iterations/completed/aeg-governance-ui-v2.md',
  'aeg-root/iterations/completed/aeg-governance-ui-v2.tokens.md',
  'aeg-root/iterations/completed/aeg-studio-cleanup.md',
  'aeg-root/iterations/completed/aeg-ui-v1.md',
  'aeg-root/iterations/completed/aeg-ui-v1.tokens.md',
  'aeg-root/iterations/completed/herald-agents-v2.md',
  'aeg-root/iterations/completed/herald-agents-v2.tokens.md',
  'aeg-root/iterations/completed/herald-onto-engine.md',
  'aeg-root/iterations/completed/vada-agents-v2.md'
])

/** The one non-state file the live directory is allowed to carry: the convention pointer. */
const ITERATIONS_README = 'aeg-root/iterations/README.md'

/** Test fixture for the ledger PARSER, not a real iteration's state — exercises `parseLedger`, never read by any live gate. */
const KNOWN_TEST_FIXTURE = 'packages/aeg-core/src/fixtures/aeg-ui-v1.tokens.md'

export type DiskStateViolation = { path: string; reason: string }

/**
 * `trackedPaths`: every path `git ls-files` reports (repo-relative, forward
 * slashes). Pure — the caller gathers the file list; this function only
 * classifies it.
 */
export function checkNoDiskState(trackedPaths: string[]): DiskStateViolation[] {
  const violations: DiskStateViolation[] = []

  for (const path of trackedPaths) {
    if (path === ITERATIONS_README || path === KNOWN_TEST_FIXTURE) continue

    const liveTopologyMatch = /^aeg-root\/iterations\/([^/]+)\.md$/.exec(path)
    if (liveTopologyMatch) {
      violations.push({
        path,
        reason:
          'live iteration topology file — every active iteration is forge-native (Milestone + `iteration:<slug>`-labeled Issues); no file may represent it. Delete this file; if a Milestone genuinely cannot represent the fact you need, that is a doctrine gap — escalate, do not add a file.'
      })
      continue
    }

    const isLegacyShapedFile = /^aeg-root\/iterations\/completed\/.*\.md$/.test(path) || path.endsWith('.tokens.md')
    if (isLegacyShapedFile && !GRANDFATHERED_LEGACY_PATHS.has(path)) {
      violations.push({
        path,
        reason:
          'new archived-iteration or token-ledger file — the grandfathered legacy set is closed and does not grow. A newly-completed iteration is forge-native (closed Milestone); it needs no archived-iteration file. A NEW `.tokens.md` for an iteration that already reports tokens via the PR body Token-report heading is also forbidden here; if you believe a genuinely new `.tokens.md` is needed, that is the escalated token-ledger doctrine gap forge-sole-state task 1 left open (see its PR body) — raise it with the Principal rather than adding a file.'
      })
    }
  }

  return violations
}
