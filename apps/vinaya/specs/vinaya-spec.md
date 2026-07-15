# Vinaya — Product Spec (seed)

Status: draft

First mention of this file — created by `vinaya-studio-v1` task 0 (#479). Captures the ratified/pending decisions that define Vinaya so far. Most of the source decisions (D-086 through D-109) are themselves still `PENDING` ratification in `packages/governance/decisions.md` — this doc summarizes intent, it is not itself a ratified commitment. Full rationale lives in [`packages/governance/decisions.md`](../../../packages/governance/decisions.md) (D-086 through D-113); this doc is the product-level summary, not a replacement for it.

## What Vinaya is

A governance layer for AI coding agents: deterministic checks every agent must satisfy before merge, installed with `npx vinaya init`. Vinaya doesn't block agents — it redirects them into a governed flow, so a human reviews judgment, not compliance. "Vinaya" means "discipline" / "the rules of conduct" in Pali.

## Pages — the full site map, kept current here

Every route `apps/vinaya/web` has or will have, and its real status. Update this table whenever a page is added, built, or its status changes — this is the one place to check "what pages exist" without reconstructing it from task history.

| Route | Purpose | Status | Built by | UI polish |
|---|---|---|---|---|
| `/` | Landing — v3 hero copy ("Sustainable software development for the AI era" + Two-Eras story), `npx vinaya init` CTA (marked coming-soon) | **Live** | Task 0 (#479, merged); **task 2 of `vinaya-pages-v1` (#509)**, delivered by PR #561 (`feat/vinaya-landing-v3`); landing v3 design applied (`vinaya-landing-v3-implementation-brief`); renderer reworked from SVG+CSS to hand-rolled `<canvas>` (`vinaya-landing-v3-canvas-rework-brief`) | Applies landing v3 design — canvas hero scenes (`NormalEraCanvas`/`LightSpeedEraCanvas`/`ProtectedCanvas`), token-faithful (colors resolved from CSS vars, never hardcoded), not yet the cream theme itself |
| `/known-limits` | Honest, individually-verified list of what Vinaya doesn't do yet | **Live** | Task 0 (#479, merged) | Functional, not yet designed |
| `/aeg` | The AEG methodology itself — rings, roles, contracts — read from real files at build time, not hand-transcribed | **Live** | Task 0b (#480, PR #485, merged) | **Not yet applied** — content is real and verified; a more polished interactive "rings-drilldown" design (zoomable concentric rings around a central GitHub hub — Ring 0/1/2 plus two later additions, Roles and Contracts) was iterated separately as a design-tool prototype and is now committed at `apps/vinaya/web/design/` (brief + two HTML mockups), closing the "held locally by the Principal" gap. Applying it to the live page is its own follow-up: the live diagram derives from the DiagramModel (#506), not from these fixtures directly. |
| `/docs` | CLI command reference | **Deferred, no task exists** | Not started — blocked on `vinaya-cli-v1` actually shipping commands (currently 0/7 issues dispatched). Documenting a CLI that doesn't exist would be premature. | N/A |
| Studio dashboard — mounted at `/studio` (route-collision decision: root `/` is the marketing landing page) | The live derived-status viewer | **Live** | Task 1 (#388, PR #493) | Not yet applied — same functional-not-visually-polished status as the other pages below; nav reversed from task 3 (#500)'s sidebar: `(site)` route group (Home/Known Limits/AEG) carries the site TopBar, `studio/layout.tsx` carries its own TopBar (logo "Vinaya Studio", links Projects/Iterations/Backlog/Docs) with no left sidebar, mirroring `apps/aeg/web/studio`'s TopBar-only chrome |
| `/studio/docs` | AEG methodology + process doc browser — full nested tree of every surfaced `aeg-root/**.md` file (roles, contracts, `process.md`, `aeg-manual-flow.md`, iteration READMEs, etc.), mirrored from AEG Studio's `/docs` | **Live** | Task 1 addendum (#388, PR #493) | Not yet applied — same functional-not-visually-polished status as the pages above |
| `/studio/backlog` | Every open Issue with no `iteration:*` label, excluding `vinaya:state-object` Issues (D-110's permanent forge-native storage objects — pinned per-project state, ratification queue, lessons log, which carry no actionable work), grouped by `project:<name>` label — closes the gap where unscoped Issues (e.g. #497) were invisible on every iteration-scoped Studio page | **Live** | Task 2 (#498) | Not yet applied — same functional-not-visually-polished status as the pages above |

**`/studio/docs` (this app) and the deferred `/docs` (future CLI reference) are different things — do not conflate them.** `/studio/docs` is a full nested browser of AEG's own internal methodology docs, live today. The `/docs` row above is Vinaya's own not-yet-built CLI command reference, blocked on `vinaya-cli-v1` shipping — a distinct future surface with no relationship to `/studio/docs` beyond the shared word "docs."

**The UI-polish gap, named explicitly:** `/`, `/known-limits`, and `/aeg` are all functionally correct today but visually generic — none of them yet apply the design already explored in the rings-drilldown prototype (a separate, earlier design-exploration artifact, not yet wired to real data). The design itself is not lost: a design brief (`brief.md`) and two self-contained HTML mockups (`how-it-works-mockup.html` — the plainer static version the live `/aeg` page currently follows — and `how-it-works-rings-drilldown.html` — the polished, interactive zoomable version, not yet applied anywhere) exist and are held by the Principal locally, outside this repo. Before any task can implement the polished version, those design assets need to land in the repo (e.g. alongside this spec, or wherever design references are conventionally kept) so a Brief Author can point a Developer at them without depending on the Principal's local filesystem. No task exists yet for either the asset-commit step or the design-application pass. See the drift-prevention/registration note: this gap was found by direct Principal review of the built page, not by any process that would have caught it automatically — worth registering as its own task rather than leaving implicit.

**What task 2 (#509) specified and the v3 landing does not carry.** #509's settled design was a refusal page: a hero replaying the #474 review-gate incident (block → recovery prompt → self-correct → merge), the recognition line, three "corpses" each citing a real PR number, an identity-vs-syntax waiver panel, and a live dogfood strip reading open PRs / undispatched work / real red via StateSource. The v3 rework replaced that design at Principal direction; none of those elements are on the live page. Recorded here because the Issue's Boundary describes the design that was *settled*, not the one that *shipped* — the two diverged and nothing else states it. The dogfood strip is the one element dropped with no replacement: the landing reads doctrine (`loadDoctrineQuestions`) but no live forge state. No task exists for it.

**Known false claims live on the landing today.** `FeatureGrid` feature 02 (`_components/FeatureGrid.tsx`) reads, in full:

> `body: 'non-destructive install, one-command eject, each ring is opt-in'`

Two distinct defects, both **currently live on `main`**, both shipped by PR #561:

1. **"non-destructive install, one-command eject"** — `vinaya init` and `vinaya eject` are `vinaya-cli-v1` commands with **no code merged**. `/known-limits`, two sections below on the same page, states this plainly. The page contradicts itself.
2. **"each ring is opt-in"** — contradicts **D-090** (`Status: PENDING`, `Lock: YES`), which makes git hooks the **universal ring 0** and reserves "opt-in accelerator only" for forge-write interception alone. **D-118** rejected a Ring-0/CI config key for precisely this reason: it "would misleadingly imply they're optional". The page states on the acquisition surface exactly what the config schema was forbidden from implying. It also contradicts `FEATURES[4]` three cells away ("the same deterministic checks gate every merge — no special cases").

**This paragraph is the only thing catching defect 2.** §11's CONTRADICTION check fires on `ACTIVE` decisions; D-090 is `PENDING`, so the machinery does not see it. Do not delete this note without fixing the cell.

Correcting the copy is a positioning call against a locked decision — Principal-owned per the Positioning block below ("do not improvise these fields"), escalated `severity:product`, and deliberately not improvised. `rings 1 and 2 are opt-in` would be true; `each` and `or none` are the false parts.

## Positioning (locked copy — D-088, D-108)

**The live landing (`/`) now carries the v3 hero copy** ("Sustainable software development for the AI era" + the Two-Eras story), replacing the headline/subhead/clarifier below per the Principal-approved `vinaya-landing-v3-implementation-brief`. The decision-log amendment superseding D-088's landing copy is **Principal-owned and still pending ratification** — the fields below remain the last-ratified record until that amendment lands in `packages/governance/decisions.md`.

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

- **Studio cannot lie by omission (D-087).** When live forge enumeration fails (rate limit, network, `gh`/token missing, or `resolveRepo()` unresolvable), Vinaya Studio's iteration lists render an explicit "live forge state unavailable" warning banner — never a truth-shaped empty "No active iterations." state. The flag (`IterationLists.forgeAvailable`, `iterationsForProject().forgeAvailable` in `apps/vinaya/web/src/lib/aeg-fs/read-root.ts`) is derived per-request from that request's failures only (Studio stores nothing); the legacy `completed/*.md` supplement is not a failure and never trips the banner.

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

## CLI (`vinaya-cli-v1`, task 1, #381)

`apps/vinaya/cli` — the `@atta/vinaya-cli` package, bin name `vinaya`. This task ships a **skeleton only**:

- **Router:** `vinaya help` / `vinaya version` (`--json` supported) — no real command logic yet (`init`, `check`, `doctor`, forge writes are later tasks in this iteration).
- **Config loader:** ported from Cetana's `apps/cetana-ai/cli/src/lib/config.ts` (copy-adapt; Cetana untouched). Hierarchical, file-level precedence — repo-local `vinaya.config.json` (walked up from `cwd`) over global `~/.vinaya/config.json`, `null` if neither exists. Its precedence regression tests ported alongside it (`apps/vinaya/cli/tests/config.test.ts`).
- **Config schema — D-118 (provisionally labeled D-117 at brief time):** a `rings` object (`ring1_forgeWriteInterception` / `ring2_asyncAudits`, plain booleans, no conditional logic per D-092/D-109) is the only schema surface this task ships. Ring 0 and the CI/branch-protection guarantee are never represented — they aren't configurable. **Now ratified as D-118** in `packages/governance/decisions.md` (backfilled by the `fix/d-117-decision-backfill` PR) — the gap flagged at this task's dig time (2026-07-11, when the decision log's last entry was D-116) is resolved. The Issue #381 comment's provisional "D-117" label was superseded by a numbering collision with PR #517 (a different, unrelated decision that merged first and claimed D-117).
- **JSON envelope:** `src/lib/envelope.ts` wraps every `--json` payload as `{ schema: 1, data: ... }` (D-100/D-103) — no code path emits unversioned machine output.
- **Ported, not carried over:** the config pattern + its tests only. No JSONL, no IPC, no coordinator, no state-sync code (D-095). No `@atta/aeg-core` import yet (keeps this task pure-`Project: vinaya`; the `StateSource` seam is a later task, already built and parked behind this one per D-081 row-adjacency).

See `apps/vinaya/cli/README.md` for install (`bun link`, not a workspace script) and the config/envelope reference.

## StateSource (`vinaya-cli-v1`, task 2, #382)

The seam every pure evaluator (`deriveIteration`, `sumLedger`, ...) consumes state through, so they never care whether an `Iteration` came from a git-tracked file or the forge.

- **Contract:** `StateSource` (`packages/aeg-core/src/state-source.ts`, re-exported from `@atta/aeg-core`'s `index.ts`) — one method, `getIteration(slug: string): Promise<Iteration>`. Builds on `@atta/aeg-types`'s existing `Iteration`/`Task` shapes; does not redefine them. `aeg-core`'s zero-I/O purity charter (post-#372) means this file holds only the type — no adapter implementation lives here.
- **Adapters** — both live in a new workspace, `apps/vinaya/sources` (`@atta/vinaya-sources`), the only package in this seam allowed I/O:
  - `createForgeSource` (`src/forge-adapter.ts`) — the **primary** design. Wires `@atta/aeg-forge-state`'s `deriveIterationFromForge` behind the contract. **Imported as a workspace dependency (`workspace:*`), not re-homed** — `@atta/aeg-forge-state` (built by `aeg-forge-state-v1` #425, D-112 resequencing) is already a clean, general-purpose, repo/owner-parameterized package with its own existing consumers (`packages/aeg-core/bin/*`, both apps' `read-root.ts`/`stale-blocker.ts`); re-homing it would be a rename with no functional benefit and would break those consumers.
  - `createFileSource` (`src/file-adapter.ts`) — **transitional**, a deliberate throwaway deleted once every `StateSource` consumer is forge-backed. Wraps `@atta/aeg-core`'s `parseIteration` over a configurable governance root (`FileSourceConfig.root`, default `aeg-root`) — never a hardcoded path constant (2026-07-05 Planner amendment), so the pending `vinaya-finding-aeg-root-into-aeg-core` relocation is a config flip, not a rewrite.
  - `selectSource` (`src/select-source.ts`) — config-driven selection between the two, validated by a zod schema (`StateSourceConfigSchema`) mirroring `apps/vinaya/cli/src/lib/config.ts`'s schema-first shape.
- **Proof:** a golden comparison (`apps/vinaya/sources/src/golden-forge-vs-file.test.ts`) derives `aeg-forge-state-v1` — a real, complete iteration — from both adapters and asserts equivalent `Iteration` shapes on every field the pure evaluators read (task ids/titles/issues/projects/dependency edges, lifecycle, goal). The file-side input is `aeg-root/iterations/completed/aeg-forge-state-v1.md`'s content pinned at commit `8112a295` (the live working-tree path was deleted by PR #521 the same day this task ran; the Milestone and Issues it derives from are untouched on GitHub, so the comparison remains genuine real-data proof). Gated on GitHub auth being available (`describe.skipIf` off `resolveGithubToken()`) — passed for real at dispatch time.
- **Out of scope for this task:** rewiring `packages/aeg-core/bin/*` gates onto `StateSource` (`aeg-forge-state-v1`'s completed job); Studio changes (`vinaya-studio-v1` task 2); a Discussions or Projects-v2 client (excluded by D-110). Publish-time packaging of `sources` relative to the CLI's "surgically small" rule (D-084/D-104) is recorded as an open question in `apps/vinaya/sources/README.md`, deferred to a launch-readiness task.

## DiagramModel derivation (enforcement-derivation-v1 task 5, #506)

One pure library turns governance doctrine into a renderer-agnostic model every diagram consumer reads — Studio, this portal's future `/aeg` drilldown, a CLI visualizer — so none re-implements the governance logic (D-087: one derivation library, N consumers).

- **Contract:** `deriveDiagramModel(doctrine, config, iteration): DiagramModel` (`packages/aeg-core/src/diagram-model.ts`, exported from `@atta/aeg-core`'s `index.ts`). Pure — zero I/O, zero `fs`/`node:` imports (aeg-core's purity charter, #372/#521). Doctrine arrives already-read as `DoctrineContent` (raw `enforcement.md` + roles/contracts markdown); config is the declarative `DiagramConfig` (ring-level + per-gate enable/disable booleans, `null` = nothing disabled); `iteration` is the `StateSource` live-context passthrough, carried on the model and **never** used to compute render-state.
- **Model shape:** `nodes` (kind `ring | gate | check | action | role | contract`, each with a kind-prefixed stable id, label, optional `ringIndex`, and a derived `renderState`), `edges` (`guards` gate→action, `performs` role→action, `produces`/`consumes` role→contract), `findings` (config keys that reference no real gate/check), and the passthrough `iteration`. **Geometry — radius, angle, colour, coordinates — is NOT in the model; the renderer owns it.** A ring index and a render-state are structural facts; a pixel is not.
- Every gate/check/action/role/contract node also carries an optional `summary` (a short, non-technical question, e.g. "Ever had someone push straight to main and nobody noticed?") — gate/check nodes additionally carry `category` (`ci`/`hook`/`event`, describing when the check fires relative to a bare repo with no governance installed) and role nodes carry `actorType` (`agent`/`human`/`either`, from the role's own pre-existing frontmatter). Added by `vinaya-pages-v1` task 3 (#551), consumed by task 4's (#508) drill panels.
- **Render-state is derived, never authored** (precedence top-down): `locked` when the doctrine row's `lock` column is non-empty (config can never override a lock, e.g. a principal/foundational gate); `disabled` when config disables it (per-gate `gates[slug] === false`, or the ring-level `ring1_forgeWriteInterception`/`ring2_asyncAudits` switch for that ring's checks); else `active`. Ring 0 has no ring-level switch (D-117) — only a per-gate entry can disable a ring-0 gate, and a locked one ignores even that.
- **DoctrineSource seam:** the library takes doctrine, not `aeg-root/` paths (D-111 — it must be packageable for adopters with no `aeg-root/`). The type `DoctrineSource` (`packages/aeg-core/src/doctrine-source.ts`, I/O-free, mirrors `StateSource`) is implemented by `createFileDoctrineSource({ root? })` in `@atta/vinaya-sources` (`src/doctrine-file-adapter.ts`), reading `<root>/enforcement.md`, `<root>/roles/*.md`, `<root>/contracts/*.md` over a configurable root (default `DEFAULT_GOVERNANCE_ROOT`, never a hardcoded literal).
- **No-drift substrate:** the derivation consumes the canonical `ACTIONS` and its `CROSSING_KEYWORDS` map (promoted into `actions.ts` this task) — the same list G3's crossing check reads — so gate→action edge counts can never drift from G3's completeness set (D-119). The markdown-table parser is likewise the one aeg-core-owned `markdown-table.ts` (promoted out of the web app this task); `registry-parse.ts` and the Vinaya `/aeg` renderer both sit on it.
- **Proof:** fixture tests (`diagram-model.test.ts`) assert the exact node set, a config-disabled gate `disabled`, a locked gate `locked` even when config also disables it, an unknown config key surfacing as exactly one finding, and edge counts matching `ACTIONS`; a real-`aeg-root/` cross-check asserts every `into-github` action gets ≥1 `guards` edge, every `performedBy` role resolves to a role node, and node ids are globally unique.
- **Out of scope for this task:** the renderer (pages own SVG/geometry — the `/aeg` rings-drilldown application is a later Pages-table follow-up); wiring per-gate switches into the CLI's `VinayaConfigSchema` (a later CLI task — `DiagramConfig` is this task's only config surface); any change to the current `/aeg` render (the web half was an import-only parser swap, proven byte-identical).

## Related decisions

D-086 through D-113 in [`packages/governance/decisions.md`](../../../packages/governance/decisions.md) — search for "Vinaya" for the full set. D-118 (this task's `rings` config amendment, provisionally labeled D-117 at brief time) is referenced above with its ratification-status caveat.
