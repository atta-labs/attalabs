# Iteration: aeg-consolidation — July 2026
Lifecycle: complete

Goal: Home the AEG coherence-check engine (originally `scripts/verify-coherence.ts` +
`scripts/verify-docs.ts`) in `@atta/aeg-core` as pure, exhaustively-tested functions;
fix the CI≠local drift; re-arm the coherence gate as blocking; add the docs coherence
gate. The CLI shims themselves also moved, into `packages/aeg-core/bin/` — AEG is a
black box to the host monorepo; the only sanctioned crossing point is
`.github/workflows/*.yml` (a GitHub Actions platform requirement), never the
monorepo's generic `scripts/` folder. Full task rationale lives on each Issue
(Planner's rationale block); this file holds topology only.

Repo: daniboomerang/attalabs · Team Leader: Claude (web)

## Tasks (topology)

| #  | Task                                                          | Issue | Project(s) | Depends-on | Conflicts-with |
|----|----------------------------------------------------------------|-------|------------|------------|----------------|
| 1  | Home verify-docs checks in `@atta/aeg-core`                    | #263  | aeg, aeg-core | —          | —              |
| 2  | Home verify-coherence checks in `@atta/aeg-core`                | #264  | aeg, aeg-core | #263       | 4              |
| 3  | Fix CI≠local drift, complete grandfather, re-arm coherence gate | #220  | aeg, aeg-core | #264       | —              |
| 4  | Docs coherence gate (surfaced-doc manifest)                    | #265  | aeg, aeg-core | #263       | 2              |

## Cross-iteration dependencies

- **`aeg-governance-hardening`** depends on this iteration: its task 1 (#251) depends on this iteration's task 2 (#264); its task 2 (#252) and task 3 (#218) each depend on this iteration's task 1 (#263). Dispatch gates are forge-answerable regardless of which iteration file lists the task — do not dispatch those `aeg-governance-hardening` tasks until the referenced Issue here is merged.
- **`aeg-studio-cleanup`** (not yet planned) will depend on this iteration's task 4 (#265) — it defines the "surfaced doc" manifest that iteration's docs-curation task consumes.
- Superseded, absorbed the unbuilt tail of `aeg-coherence-v1` (D-070 movement, 2026-07-01): task 3 (#220) is that iteration's former task 5, re-scoped after a deep-dig into the actual code found the two real CI≠local bugs its old exit criteria depended on. See `aeg-root/iterations/aeg-coherence-v1.md` for the per-task move annotations.
