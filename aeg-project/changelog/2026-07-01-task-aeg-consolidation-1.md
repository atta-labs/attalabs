## July 1, 2026 — aeg-consolidation task 1: verify-docs checks homed in @atta/aeg-core

### AEG
- **Task 1 (#263, PR #271)** — Homed `verify-docs.ts`'s checks in `@atta/aeg-core` as pure, tested functions. Scope grew to relocate AEG's CLI tools out of the monorepo's `scripts/` into `packages/aeg-core/bin/` (AEG stays a black box to the host repo). Tier 3, conforms to D-070. Closes #263.
- Two incidental fixes shipped alongside (PRs #273, #274): a Turbopack workspace-root bug and a Herald landing-page crash.
- **Dangling:** no independent Reviewer/Security pass ran on PR #271 (D-026 gap) — flagged on the merged PR, not fabricated.
