/**
 * New-on-disk-state guard (#512 Part D). Pure — no `fs`, no `git`/`gh` I/O.
 * Flags a diff-touched path as a disk-state offender when it is either
 * (a) a live iteration topology file other than `README.md` — the residue
 * class this task's own Part B proved unnecessary (forge derivation
 * already covers it, see `aeg-drift-prevention-v1.md`'s deletion) — or
 * (b) any `*.tokens.md` file, anywhere in the repo — the pre-D-071 ledger
 * shape `Tokens-in-PR-body` superseded.
 *
 * `aeg-root/iterations/completed/**` files are exempt from (a): their path
 * carries an extra `completed/` segment, so the single-level topology
 * regex below never matches them — this gate only stops *new* state-file
 * creation (decisions.md D-117); it does not retroactively flag the
 * deferred archive.
 */

const TOPOLOGY_FILE = /^aeg-root\/iterations\/[^/]+\.md$/
const TOKENS_FILE = /\.tokens\.md$/

export function isNewDiskStateFile(path: string): boolean {
  if (TOPOLOGY_FILE.test(path)) return path !== 'aeg-root/iterations/README.md'
  return TOKENS_FILE.test(path)
}
