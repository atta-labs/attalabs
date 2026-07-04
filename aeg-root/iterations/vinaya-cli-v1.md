# Iteration: vinaya-cli-v1 — July 2026
Lifecycle: active

Goal: `apps/vinaya/cli` ships the Vinaya v1.0 command surface (init, init product, check,
pr/issue create+edit, doctor, upgrade, eject, demo break, waiver, new check) over
`@atta/aeg-core`, with the StateSource seam — contract in aeg-core (pure, types only),
forge-backed (primary) + file-backed (transitional throwaway) adapters in
`apps/vinaya/sources`. Out of scope: the gh shim, `vinaya worktree`, npm publish, the
site, the file→forge state migration of this repo, and any Cetana/AEG-product deletion
(all deferred to later iterations). Full task rationale lives on each Issue; this file
holds topology only.

Repo: daniboomerang/attalabs · Team Leader: Claude (web)

## Tasks (topology)

| # | Task                                                              | Issue | Project(s)       | Depends-on                        | Conflicts-with                    |
|---|-------------------------------------------------------------------|-------|------------------|-----------------------------------|-----------------------------------|
| 1 | Scaffold apps/vinaya/cli: vinaya bin, router, hierarchical config | #381  | vinaya           | —                                 | —                                 |
| 2 | StateSource: contract in aeg-core, forge/file adapters in sources | #382  | aeg-core, vinaya | aeg-governance-hardening #372     | aeg-governance-hardening #365     |
| 3 | Check engine: vinaya check, error contract, custom checks         | #383  | vinaya           | 1, 2                              | —                                 |
| 4 | vinaya init + init product: diff-and-confirm installer, ruleset   | #384  | vinaya           | 3                                 | —                                 |
| 5 | Validated forge writes: vinaya pr/issue create + edit             | #385  | vinaya           | 3                                 | —                                 |
| 6 | Installation lifecycle: doctor, upgrade, eject                    | #386  | vinaya           | 4                                 | —                                 |
| 7 | Trust surface: demo break + waiver command                        | #387  | vinaya           | 4, aeg-governance-hardening #380  | —                                 |

## Cross-iteration dependencies

- **Task 2 depends on `aeg-governance-hardening` #372** (task 28 — aeg-core purity; the
  StateSource contract is built against the purified package shape) and **conflicts with
  its in-flight task 25 (#365)** — same aeg-core collision domain.
- **Task 7 depends on `aeg-governance-hardening` #380** (task 29 — the waiver-authentication
  mechanism is proven live in this repo before Vinaya productizes it; D-097).
- **Dispatch gate reality:** every `aeg-core`-projected task here is mechanically
  undispatchable until `aeg-governance-hardening` is fully archived (verify-dispatch's
  prior-iteration predicate). Task 1 is the only row that escapes that gate — and the
  Principal has directed that nothing in this iteration dispatches until they trigger it,
  after the governance iteration closes.
