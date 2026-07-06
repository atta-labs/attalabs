# Iteration: vinaya-cli-v1 — July 2026
Lifecycle: active

Goal: `apps/vinaya/cli` ships the Vinaya v1.0 command surface (init, init product, check,
pr/issue create+edit, doctor, upgrade, eject, demo break, waiver, new check) over
`@atta/aeg-core`, with the StateSource seam — contract in aeg-core (pure, types only),
consuming the already-built, already-proven forge-reading package from
`aeg-forge-state-v1` (D-112 resequencing — the package is built and validated against this
repo's real state before the CLI packages it, not built fresh here) + a file-backed
(transitional throwaway) adapter in `apps/vinaya/sources`. Out of scope: the gh shim,
`vinaya worktree`, npm publish, the site, and any Cetana/AEG-product deletion (all deferred
to later iterations). Full task rationale lives on each Issue; this file holds topology only.

Repo: daniboomerang/attalabs · Team Leader: Claude (web)

## Tasks (topology)

| # | Task                                                              | Issue | Project(s)       | Depends-on                        | Conflicts-with                    |
|---|-------------------------------------------------------------------|-------|------------------|-----------------------------------|-----------------------------------|
| 1 | Scaffold apps/vinaya/cli: vinaya bin, router, hierarchical config | #381  | vinaya           | —                                 | —                                 |
| 2 | StateSource: contract in aeg-core, forge/file adapters in sources | #382  | aeg-core, vinaya | aeg-governance-hardening #372, aeg-forge-state-v1 #425 | aeg-governance-hardening #365     |
| 3 | Check engine: vinaya check, error contract, custom checks         | #383  | vinaya           | 1, 2                              | —                                 |
| 4 | vinaya init + init product: diff-and-confirm installer, ruleset   | #384  | vinaya           | 3                                 | —                                 |
| 5 | Validated forge writes: vinaya pr/issue create + edit             | #385  | vinaya           | 3                                 | —                                 |
| 6 | Installation lifecycle: doctor, upgrade, eject                    | #386  | vinaya           | 4                                 | —                                 |
| 7 | Trust surface: demo break + waiver command                        | #387  | vinaya           | 4, aeg-governance-hardening #380  | —                                 |

## Cross-iteration dependencies

- **Task 2 depends on `aeg-governance-hardening` #372** (task 28 — aeg-core purity; the
  StateSource contract is built against the purified package shape, satisfied — #372 merged)
  and **conflicts with #365** (same aeg-core collision domain; topological fact, resolved —
  #365 merged, so this edge no longer blocks dispatch, per forge derivation, not a file edit).
  **Task 2 now ALSO depends on `aeg-forge-state-v1` #425** (D-112, 2026-07-06): the generic
  forge-reading adapter is built and proven THERE first, against this repo's real data; task 2
  imports/re-homes that already-working package into `apps/vinaya/sources` rather than building
  it from scratch. Task 2's own scope shrinks accordingly — see #382's amendment.
- **Task 7 depends on `aeg-governance-hardening` #380** (task 29 — the waiver-authentication
  mechanism is proven live in this repo before Vinaya productizes it; D-097).
- **Dispatch gate reality:** every `aeg-core`-projected task here is mechanically
  undispatchable until `aeg-governance-hardening` is fully archived (verify-dispatch's
  prior-iteration predicate). Task 1 is the only row that escapes that gate — and the
  Principal has directed that nothing in this iteration dispatches until they trigger it,
  after the governance iteration closes.
