# @atta/aeg-forge-state

A generic, repo-parameterized adapter that derives an `@atta/aeg-core` `Iteration`
purely from GitHub forge objects — no topology file required:

- a Milestone titled exactly `<slug>` → `goal` (description) + `lifecycle`
  (`open`/`closed` → `active`/`complete`); `null` when no Milestone exists yet
  for that slug (a real, expected transitional state during rollout)
- `iteration:<slug>`-labeled Issues → the `Task[]` list, with `id`/`title`
  parsed from the `[<slug>] <id> — <title>` Issue-title convention,
  `projects` from `project:<name>` labels, and `dependsOn`/`conflictsWith`
  edges parsed from each Issue's "Dependency rationale" section — hardened
  against both the topology file's single comma-joined backtick-span form
  and the multi-span prose form real Issue bodies also use

`owner`/`repo` are explicit parameters to every public function — never
hardcoded. All forge access shells out to the local `gh` CLI (the same
pattern already used throughout `packages/aeg-core/bin/*.ts`), not a second
octokit-based access path.

## Two consumers

1. **This repo's own migration** (`aeg-forge-state-v1` tasks 3/4/5) — the live
   The gates and Vinaya Studio cut over from reading `aeg-root/iterations/*.md`
   files to calling this package directly.
2. **`vinaya-cli-v1`'s shippable CLI** (task 2, #382) — imports or re-homes
   this package as the forge-backed half of Vinaya's `StateSource` seam, for
   arbitrary adopter repos (not just `daniboomerang/attalabs`).

Keep the public API shaped for an arbitrary `(owner, repo, slug)` triple, not
this-repo-only conveniences — that genericity is the entire reason this
package exists as its own thing instead of living inside `vinaya-cli-v1`.

## What this package does NOT do

- No writes to the forge (read-only, always).
- No `backlog` derivation — the file's `## Backlog` section is project-level
  prose with no owning forge object; forge-derived iterations always report
  `backlog: []`. No currently-active iteration's forge derivation loses real
  backlog content today because none has been proven to round-trip yet — a
  future task's problem, not this one's.
- No amendment-prose ingestion — `dependsOn`/`conflictsWith` are parsed from
  an Issue's structured "Dependency rationale" field only. A later free-text
  amendment appended below that field (a real pattern seen on this repo) is
  out of scope; see the golden-comparison test's doc comment for a concrete,
  evidenced example.
