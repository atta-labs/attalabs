/**
 * New-on-disk-state guard (#512 Part D). Pure — no `fs`, no `git`/`gh` I/O.
 * Flags a diff-touched path as a disk-state offender given its change
 * status (`added` — the path didn't exist on the base ref — or `modified`
 * — it already did):
 *
 * (a) A live tranche topology file directly under `aeg-root/iterations/`
 *     (not a subdirectory) — the residue class this task's own Part B proved
 *     unnecessary (forge derivation already covers it, see
 *     `aeg-drift-prevention-v1.md`'s deletion). Fails on `added` OR
 *     `modified`: this file class shouldn't exist at all post-cutover,
 *     whether newly created or resurrected via an edit.
 *
 * (b) Any `.md` file anywhere under `aeg-root/iterations/` (any depth,
 *     including `completed/**`) — but ONLY when
 *     `added`. `completed/**`'s existing files are legacy archive
 * (explicitly excludes them, per `tranche-model.md` §4/§11 —
 *     they're never deleted or migrated, and editing one to fix a typo
 *     must stay legal); this rule instead closes the gap a path-shape-only
 *     exemption would leave open — a BRAND NEW file smuggled directly into
 *     `completed/` (or any other subdirectory) to dodge rule (a)'s
 *     top-level check. Deliberately status-based, not a hardcoded filename
 *     allowlist: the legacy set only grows via the (currently-dormant,
 *     forge-native-cutover-pending) Archivist move-to-completed flow, never
 *     via this gate's own exemption logic.
 *
 * (c) Any `*.tokens.md` file, anywhere in the repo — the pre- ledger
 *     shape `Tokens-in-PR-body` superseded — but ONLY when `added` (an
 *     edit to one of the 4 existing legacy `completed/*.tokens.md` files
 *     must stay legal, same reasoning as (b)).
 */

export type DiskStateFileStatus = 'added' | 'modified'

const TOP_LEVEL_TOPOLOGY_FILE = /^aeg-root\/iterations\/[^/]+\.md$/
const ANY_DEPTH_TRANCHES_MD = /^aeg-root\/iterations\/.*\.md$/
const TOKENS_FILE = /\.tokens\.md$/

export function isNewDiskStateFile(path: string, status: DiskStateFileStatus): boolean {
  // The tranche model doc used to live at `aeg-root/iterations/README.md`
  // and needed an explicit carve-out here so editing it never read as new disk
  // state. It is now `aeg-root/tranche-model.md`, outside the directory this
  // guard watches, so the carve-out is gone rather than left as a line that
  // can never fire.
  if (TOP_LEVEL_TOPOLOGY_FILE.test(path)) return true

  if (status !== 'added') return false

  return ANY_DEPTH_TRANCHES_MD.test(path) || TOKENS_FILE.test(path)
}
