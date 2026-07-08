# Vinaya — Product Spec (seed)

Status: draft

First mention of this file — created by `vinaya-studio-v1` task 0 (#479). Captures the ratified/pending decisions that define Vinaya so far. Most of the source decisions (D-086 through D-109) are themselves still `PENDING` ratification in `packages/governance/decisions.md` — this doc summarizes intent, it is not itself a ratified commitment. Full rationale lives in [`packages/governance/decisions.md`](../../../packages/governance/decisions.md) (D-086 through D-113); this doc is the product-level summary, not a replacement for it.

## What Vinaya is

A governance layer for AI coding agents: deterministic checks every agent must satisfy before merge, installed with `npx vinaya init`. Vinaya doesn't block agents — it redirects them into a governed flow, so a human reviews judgment, not compliance. "Vinaya" means "discipline" / "the rules of conduct" in Pali.

## Positioning (locked copy — D-088, D-108)

Wording refinements are Principal-owned; do not improvise these fields.

- **Headline:** "Agents obey checkers, not documents."
- **Subhead:** Install Vinaya and every coding agent must satisfy the same deterministic rules before merge.
- **Clarifier:** "We don't block agents — we redirect them into a governed flow, so you review judgment, not compliance."
- **Genre anchor:** "Branch protection for the AI era."
- **Boundary statement:** sits underneath Cursor / Claude Code / Codex / Gemini CLI / GitHub — replaces none of them.
- **Value sentence (D-108):** "Vinaya lets you trust AI agents to work inside your engineering process without becoming their compliance officer."
- **Sequencing law (D-108):** pain and refusal first, principles second — the first five minutes must feel like relief, not doctrine.

## v1.0 scope (D-104)

**IN:** `init`, `init product`, `demo break`, `doctor`, `upgrade`, `eject`, `check` (`--json`/`--diff-only`/`--parallel`), `pr create/edit`, `issue create/edit`, `waiver`, `new check`, `studio` (launcher).

**OUT:** the `gh` shim (fast-follow, opt-in accelerator per D-090), `vinaya worktree` (cut — a documented recipe suffices). TypeScript, Node ≥ 20, macOS + Linux; Windows deferred and documented; tarball fallback documented, not primary.

## Architecture

- **Entry point:** `npx vinaya init`; site at `vinaya.attalabs.dev`. No editor extension; GitHub App (deployed Studio / org installs) deferred (D-086).
- **Vinaya Studio:** visual proof of derived status, not the acquisition hook. One derivation library with N consumers (CLI gates, local Studio, future deployed Studio); Studio renders `check --json`/forge-facts output and never re-implements governance logic; no database (D-087). Ships as a separate optional npm package `@vinaya/studio` — in-repo, Studio is `apps/vinaya/web` (D-098). Deployment roadmap: Phase 1 (v1.0) local Studio only; Phase 2 generated Projects view; Phase 3 (deferred) deployed self-hosted stateless read-only Studio on a GitHub App token; Phase 3½ dogfood-as-demo over Vinaya's own public repo (D-101).
- **Enforcement hierarchy (D-090):** deterministic checks → CI + branch protection (the guarantee) → git hooks (ring 0, universal) → forge-write interception (ring 1, opt-in accelerator only, never load-bearing).
- **Substrate (D-091):** GitHub Issues + labels are machine truth; Projects v2 is an optional generated view, never a source of truth; `init` prints the recommended branch-protection command and never applies it.
- **Custom checks (D-092, D-109):** any executable honoring the §5 error contract, registered in `vinaya.config.json`. Core gates use the same interface — no privileged API. Glob scoping is allowed; conditional logic (if/unless/except) is forbidden.
- **Error contract (D-100):** every check error carries `agent_recovery_prompt` — a corrective instruction for the executing model, not a restated diagnosis. The check contract + error schema are a versioned public surface.
- **State placement (D-096, D-110, D-111):** process/work state lives on the forge (Milestones, labels, comments); low-churn parseable artifacts (decision log, project registry, doc-owners) stay plain files wrapped in a code-free workspace package; universal AEG doctrine ships inside the npm package with a scaffolded, visible pointer in the adopter's repo.

## Trust surface (D-089)

`init` is non-destructive by contract (full diff → confirm → install; `--dry-run`); `demo break` is the productized belief moment (refusal → self-correction → pass); `eject` restores stock in one command; `doctor` is treated as a product (diagnoses everything, mutates nothing).

## CMS / theming (this task's implementation note)

Vinaya has no Sanity project of its own yet. `apps/vinaya/web`'s layout borrows Atta's config/branding (`createProductClient('atta')`), the same precedent `apps/aeg/web/studio` uses for the same reason — a genuinely new product's visual identity isn't decided yet, and building one is out of scope for a two-page bootstrap. A dedicated Sanity project, theme, and branding are a later task once Vinaya's own visual identity is designed.

## Known limits

Verified against current repo state at the time of writing (2026-07-08); see the live [Known Limits page](../web/src/app/known-limits/page.tsx) for the canonical, user-facing version:

- No CLI commands exist yet (`vinaya-cli-v1`, issues #381–#387, all open/undispatched).
- Vinaya Studio is local-only for v1.0 (D-101) — no deployed/hosted Studio, no committed date for one.
- No Windows support in v1.0 (D-104) — macOS/Linux only.
- No editor extension (D-086).
- No GitHub App / org-wide install (D-086, deferred).

## Iterations

- `vinaya-cli-v1` — CLI: scaffold, `StateSource`, check engine, `init`, forge writes, lifecycle, trust surface. Undispatched (issues #381–#387).
- `vinaya-studio-v1` — Studio: this bootstrap (task 0, #479), `/aeg` methodology page (task 0b, #480), copy `apps/aeg/web` → `apps/vinaya/web` renamed to Vinaya Studio (task 1, #388), renderer contract (task 2, #389), `vinaya studio` launcher (task 3, #390).

## Related decisions

D-086 through D-113 in [`packages/governance/decisions.md`](../../../packages/governance/decisions.md) — search for "Vinaya" for the full set.
