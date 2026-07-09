# Vinaya — Product Spec (seed)

Status: draft

First mention of this file — created by `vinaya-studio-v1` task 0 (#479). Captures the ratified/pending decisions that define Vinaya so far. Most of the source decisions (D-086 through D-109) are themselves still `PENDING` ratification in `packages/governance/decisions.md` — this doc summarizes intent, it is not itself a ratified commitment. Full rationale lives in [`packages/governance/decisions.md`](../../../packages/governance/decisions.md) (D-086 through D-113); this doc is the product-level summary, not a replacement for it.

## What Vinaya is

A governance layer for AI coding agents: deterministic checks every agent must satisfy before merge, installed with `npx vinaya init`. Vinaya doesn't block agents — it redirects them into a governed flow, so a human reviews judgment, not compliance. "Vinaya" means "discipline" / "the rules of conduct" in Pali.

## Pages — the full site map, kept current here

Every route `apps/vinaya/web` has or will have, and its real status. Update this table whenever a page is added, built, or its status changes — this is the one place to check "what pages exist" without reconstructing it from task history.

| Route | Purpose | Status | Built by | UI polish |
|---|---|---|---|---|
| `/` | Landing — locked D-088/D-108 copy, `npx vinaya init` CTA (marked coming-soon) | **Live** | Task 0 (#479, merged) | Functional, not yet applying the rings-drilldown visual design |
| `/known-limits` | Honest, individually-verified list of what Vinaya doesn't do yet | **Live** | Task 0 (#479, merged) | Functional, not yet designed |
| `/aeg` | The AEG methodology itself — rings, roles, contracts — read from real files at build time, not hand-transcribed | **Live** | Task 0b (#480, PR #485, merged) | **Not yet applied** — content is real and verified; a more polished interactive "rings-drilldown" design (zoomable concentric rings around a central GitHub hub — Ring 0/1/2 plus two later additions, Roles and Contracts) was iterated separately as a design-tool prototype and exists in full (brief + two HTML mockups) but is held locally by the Principal, not yet committed to this repo. Applying it to the live page is its own follow-up: commit the design assets, then a task to wire the interaction up. No task registered for this yet. |
| `/docs` | CLI command reference | **Deferred, no task exists** | Not started — blocked on `vinaya-cli-v1` actually shipping commands (currently 0/7 issues dispatched). Documenting a CLI that doesn't exist would be premature. | N/A |
| Studio dashboard — mounted at `/studio` (route-collision decision: root `/` is the marketing landing page) | The live derived-status viewer | **Live** | Task 1 (#388, PR #493) | Not yet applied — same functional-not-visually-polished status as the other pages below; site-wide TopBar (Home/Known Limits/AEG/Studio/Docs) added on the root layout in the same PR's addendum |
| `/studio/docs` | AEG methodology + process doc browser — full nested tree of every surfaced `aeg-root/**.md` file (roles, contracts, `process.md`, `aeg-manual-flow.md`, iteration READMEs, etc.), mirrored from AEG Studio's `/docs` | **Live** | Task 1 addendum (#388, PR #493) | Not yet applied — same functional-not-visually-polished status as the pages above |

**`/studio/docs` (this app) and the deferred `/docs` (future CLI reference) are different things — do not conflate them.** `/studio/docs` is a full nested browser of AEG's own internal methodology docs, live today. The `/docs` row above is Vinaya's own not-yet-built CLI command reference, blocked on `vinaya-cli-v1` shipping — a distinct future surface with no relationship to `/studio/docs` beyond the shared word "docs."

**The UI-polish gap, named explicitly:** `/`, `/known-limits`, and `/aeg` are all functionally correct today but visually generic — none of them yet apply the design already explored in the rings-drilldown prototype (a separate, earlier design-exploration artifact, not yet wired to real data). The design itself is not lost: a design brief (`brief.md`) and two self-contained HTML mockups (`how-it-works-mockup.html` — the plainer static version the live `/aeg` page currently follows — and `how-it-works-rings-drilldown.html` — the polished, interactive zoomable version, not yet applied anywhere) exist and are held by the Principal locally, outside this repo. Before any task can implement the polished version, those design assets need to land in the repo (e.g. alongside this spec, or wherever design references are conventionally kept) so a Brief Author can point a Developer at them without depending on the Principal's local filesystem. No task exists yet for either the asset-commit step or the design-application pass. See the drift-prevention/registration note: this gap was found by direct Principal review of the built page, not by any process that would have caught it automatically — worth registering as its own task rather than leaving implicit.

## Positioning (locked copy — D-088, D-108)

Wording refinements are Principal-owned; do not improvise these fields.

- **Headline:** "Agents obey checkers, not documents."
- **Subhead:** Install Vinaya and every coding agent must satisfy the same deterministic rules before merge.
- **Clarifier:** "We don't block agents — we redirect them into a governed flow, so you review judgment, not compliance."
- **Genre anchor:** "Branch protection for the AI era."
- **Boundary statement:** sits underneath Cursor/Claude Code/Codex/Gemini CLI/GitHub, replaces none of them.
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

## `/aeg` methodology page (task 0b, #480)

`apps/vinaya/web/src/app/aeg/page.tsx` — D-102's standalone AEG methodology page ("citable, versioned, tool-independent... the methodology is the moat"). Distinct from `/docs` (deferred, CLI reference): this page explains the *mechanism* (rings, roles, contracts), not commands, and reads only this monorepo's own static structural files at **build time** — no forge/GitHub API dependency, unlike Studio's derived-status pages (task 1/2).

- **Roles** — one card per file in [`aeg-root/roles/*.md`](../../../aeg-root/roles), read + frontmatter/H1-parsed via `@atta/aeg-core/docs`' `parseDocFrontmatter`/`deriveTitle` (`src/lib/aeg/roles.ts`). **9 files today** (Archivist, Developer, Iteration Archivist, Planner, Principal, Reviewer, Security, Team Leader, Verifier) — more than the 6 named at planning time (Principal/Team Leader/Developer/Reviewer/Security/Archivist); the page renders whatever exists on disk, not a fixed list, so Iteration Archivist, Planner, and Verifier (added since planning) show up automatically.
- **Rings** — sourced from [`enforcement.md`](../../../aeg-root/enforcement.md)'s own summary table (Where / What-happens-on-violation / Who-pays) plus each ring's own detail table, parsed by a pure GFM-table extractor (`src/lib/aeg/markdown-table.ts`) — never hand-transcribed. Ring 0 rows link to the real `.husky/pre-commit`/`.husky/pre-push` hooks (or their `.claude/hooks/*.sh` non-git equivalents for the Edit/Forge-command/Merge gates) plus whatever `packages/aeg-core/bin/*.ts` scripts the row's own quoted text names. Ring 1/2 rows link to real CI job/step names, matched by keyword against a fresh regex parse of `forge-lifecycle.yml`/`ci.yml`/`claude-code-review.yml` (ring 1) and `archivist.yml` (ring 2) — **not all Ring 1 checks live in `forge-lifecycle.yml`** as assumed at planning time: `Typecheck + unit tests` is its own job in `ci.yml`, and `AI review` is `claude-code-review.yml`, kept separate from the consolidated gate-suite job for cost/overlap reasons documented in `forge-lifecycle.yml` itself. Three Ring 2 rows (`Coherence oracle, full sweep`, `Docs coherence gate (C6)`, `Staleness audits`) have no `archivist.yml` job at all — rendered honestly as "no real CI job/hook cross-reference found," not a fabricated link.
- **Contracts** — one card per file in [`aeg-root/contracts/*.md`](../../../aeg-root/contracts) (`src/lib/aeg/contracts.ts`), extracting each file's own `Status`/`Seam` lines and `## Why this file exists` paragraph verbatim. **Still exactly the 6 files named at planning time** (`brief-developer.md`, `reviewer-archivist.md`, `archivist-iteration-archivist.md`, `planner-brief.md`, `iteration-archivist-planner.md`, `developer-reviewer.md`) — verified unchanged at dig time (2026-07-08).

Every link on the page is existence-verified against the real file at build time (`extractRealPathLinks`/`findMatches` in `src/lib/aeg/`) — a row with no real cross-reference renders that fact explicitly instead of a stale or invented link.

## Known limits

Verified against current repo state at the time of writing (2026-07-08); see the live [Known Limits page](../web/src/app/known-limits/page.tsx) for the canonical, user-facing version:

- No CLI commands exist yet (`vinaya-cli-v1`, issues #381–#387, all open/undispatched).
- Vinaya Studio is local-only for v1.0 (D-101) — no deployed/hosted Studio, no committed date for one.
- No Windows support in v1.0 (D-104) — macOS/Linux only.
- No editor extension (D-086).
- No GitHub App / org-wide install (D-086, deferred).

## Iterations

- `vinaya-cli-v1` — CLI: scaffold, `StateSource`, check engine, `init`, forge writes, lifecycle, trust surface. Undispatched (issues #381–#387).
- `vinaya-studio-v1` — Studio: this bootstrap (task 0, #479), `/aeg` methodology page (task 0b, #480), port AEG Studio's dashboard routes into `apps/vinaya/web` under `/studio` (task 1, #388, **done**), plus an addendum on the same task/PR (#493) adding the `/studio/docs` methodology-doc browser and a site-wide TopBar, renderer contract (task 2, #389), `vinaya studio` launcher (task 3, #390).

## Related decisions

D-086 through D-113 in [`packages/governance/decisions.md`](../../../packages/governance/decisions.md) — search for "Vinaya" for the full set.
