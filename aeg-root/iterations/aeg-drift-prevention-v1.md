# Iteration: aeg-drift-prevention-v1 — July 2026
Lifecycle: active

Goal: Close the "structured field vs. free-form amendment" drift class found repeatedly this
session — 5 confirmed live incidents (`aeg-forge-state-v1` #429/#431, `vinaya-studio-v1` #388
twice, `vinaya-cli-v1` #382), all the same shape: a Dependency rationale field goes stale the
moment a later Amendment paragraph describes a new value, because nothing forces the two to
change together. Build an atomic amend-deps command (Ring 0 — makes the mistake structurally
impossible, not just detected) and register the full audit of every other place in this repo
where two representations of one fact can independently drift, so remaining gaps become their
own tracked follow-up tasks rather than repeat surprises. Full audit table on Issue #481.

Repo: daniboomerang/attalabs · Team Leader: Claude (CLI)

## Tasks (topology)

| # | Task                                                                    | Issue | Project(s)      | Depends-on | Conflicts-with |
|---|--------------------------------------------------------------------------|-------|-----------------|------------|----------------|
| 1 | Close the field-vs-amendment drift class (5 live incidents this session) | #481 | aeg, aeg-core | — | — |

## Cross-iteration dependencies

None. Standalone `aeg`/`aeg-core` infrastructure iteration, same vein as `aeg-review-gate-v1`.
