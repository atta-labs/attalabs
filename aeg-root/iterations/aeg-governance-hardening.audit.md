# aeg-governance-hardening — task 3 audit: bind-all + staleness

**Task:** Issue #218, `task/aeg-governance-hardening/3`
**Date:** 2026-07-02
**Conforms-to:** D-069

Coverage report for the bind-all + staleness audit. Two deliverables:

1. Every skill (23) and spec (97) is either bound as a `doc-owners` pointer, or its
   audit-table row explains why it doesn't need one.
2. Every doc that became a **newly-bound** `doc-owners` pointer in this task was read
   against the global decision log (`aeg-project/decisions.md`, D-001…D-070) for
   contradictions. Confirmed contradictions were filed as Issues (§3).

---

## 1. Scoreboard result

Before this task: `bun packages/aeg-core/bin/verify-docs.ts` reported **16 unbound
surfaces**. After: **0** — `Completeness scoreboard: all top-level surfaces are bound
or exempted.` No M1 (dangling pointer) or M3 (duplicate glob) errors introduced.

`packages/instrumentation/**` could not be bound to an owning skill or spec — no
documentation exists for it anywhere in the repo and no skill's scope covers it. Per
this brief's Section 10 stop condition ("structural surface with no documentation and
no obvious owning skill → surface, likely a missing skill"), it was **not** force-bound;
instead a `# no-doc:` line was added exempting it from the scoreboard, with a note
flagging it for the Planner. This is a documented exception, not a real binding — see
`aeg-root/doc-owners`.

## 2. New bindings added (`aeg-root/doc-owners`)

| Code glob | Pointer | Rationale |
|---|---|---|
| `packages/crypto/**` | `apps/vada-ai/specs/vada-byok-principles.md` | Only doc that documents `@atta/crypto`'s envelope-encryption implementation in depth ("Implementation in `packages/crypto/`"); no package-local README/CLAUDE.md exists. |
| `packages/identity/**` | `apps/vada-ai/specs/vada-byok-principles.md` | Same doc covers `@atta/identity`'s current scope (probe/Ollama-discovery utilities) after the V2 BYOK reversal. |
| `packages/auth/**` | `.claude/skills/auth/SKILL.md` | Exact existing skill for the package. |
| `packages/atta-agents/**` | `.claude/skills/atta-engine/SKILL.md` | Physical home of the `@atta/agents` package (Agent/CustomToolSpec primitives) per D-051 — distinct from `packages/agents/<name>/`, already bound. atta-engine's skill documents the Agent-type contract in depth (re-export relationship, `Agent[]` usage). No dedicated skill exists for `@atta/agents` itself. |
| `packages/models/**` | `.claude/skills/model-picker/SKILL.md` | Exact existing skill (model catalog, `models.dev` fetch, overlay curation). |
| `packages/storage/**` | `packages/storage/CLAUDE.md` | Package has its own CLAUDE.md; no dedicated skill exists. |
| `packages/cms/**` | `.claude/skills/ui-cms-theme/SKILL.md` | Most specific of several CMS-adjacent skills (theme/SSR loading is the bulk of `@atta/cms`'s runtime surface). |
| `packages/cms/schemas/branding.ts` | `.claude/skills/ui-branding/SKILL.md` | More specific binding for the branding schema/seed-script slice of `@atta/cms`. |
| `packages/cms/scripts/seed-branding.ts` | `.claude/skills/ui-branding/SKILL.md` | Same. |
| `packages/db/**` | `.claude/skills/database/SKILL.md` | Exact existing skill. |
| `packages/engine/**` | `.claude/skills/atta-engine/SKILL.md` | Exact existing skill. |
| `packages/adapter-langgraph/**` | `.claude/skills/atta-adapter-langgraph/SKILL.md` | Exact existing skill. |
| `packages/ui/canvas/**` | `.claude/skills/ui-canvas-animation/SKILL.md` | Exact existing skill (AIACanvas/AIASphere/AIARing). |
| `packages/ui/styles/**` | `.claude/skills/ui-theme-tokens/SKILL.md` | Exact existing skill (semantic token list). |
| `apps/cetana-ai/coordinator/**` | `.claude/skills/cetana-coordinator/SKILL.md` | Exact existing skill, per its own stated scope. |
| `apps/cetana-ai/**` | `apps/cetana-ai/specs/cetana-spec.md` | Catch-all for the rest of the surface (`cli/`), per the coordinator skill's own pointer to this spec for high-level questions. |
| `apps/atta-ai/**` | `apps/atta-ai/CLAUDE.md` | Product's own CLAUDE.md, consistent with root `CLAUDE.md`'s Products table convention. |
| `apps/attalabs/**` | `apps/attalabs/CLAUDE.md` | Same convention. Note: `apps/attalabs` is a real, independently-implemented app (distinct `page.tsx`/`layout.tsx`/components from `apps/atta-ai`, confirmed via diff), not a stale duplicate — but it is *absent from the root `CLAUDE.md` Products table*, which only lists `apps/atta-ai`. Flagged as an observation, not a filed contradiction (root `CLAUDE.md` is outside this task's 23-skill + 97-spec audit universe). |
| `apps/aeg/**` | `apps/aeg/specs/aeg-app-architecture.md` | Canonical AEG-product spec; matches `apps/aeg/web/studio`. |
| `apps/vada-ai/mcp-server/**` | `.claude/skills/vada-mcp-server/SKILL.md` | Exact existing skill. |
| `apps/vada-ai/mcp-server/src/spec-registry.ts` | `.claude/skills/vada-yaml-authoring/SKILL.md` | Auto-discovery mechanism the yaml-authoring skill documents. |
| `apps/vada-ai/web/src/app/(main)/components/home/**` | `.claude/skills/vada-home-sections/SKILL.md` | Exact existing skill. |
| `apps/vada-ai/**` | `.claude/skills/vada-architecture/SKILL.md` | Catch-all — architecture master reference, already the pointer for `packages/agents/**`. |
| `apps/herald-ai/web/src/app/api/audit/**` | `.claude/skills/herald-engine/SKILL.md` | Exact existing skill (forensic audit engine); most specific code path for the audit route. |
| `apps/*/web/src/app/api/**` | `.claude/skills/ui-api-routes/SKILL.md` | Cross-app glob — this skill's scope is explicitly cross-cutting API-route conventions, not one product. |

Plus one no-doc line: `packages/instrumentation/**` (see §1).

## 3. Confirmed contradictions → filed Issues

| # | Doc(s) | Contradicts | Issue |
|---|---|---|---|
| 1 | `.claude/skills/ui-cms-theme/SKILL.md` | D-060 (theme centralization — doc still describes per-studio theme editing) | [#278](https://github.com/daniboomerang/attalabs/issues/278) |
| 2 | `.claude/skills/ui-api-routes/SKILL.md` | D-044/D-045 (canonical example teaches deleted `generateText()` pattern + references deleted `/api/match` route) | [#279](https://github.com/daniboomerang/attalabs/issues/279) |
| 3 | `apps/atta-ai/CLAUDE.md`, `apps/attalabs/CLAUDE.md` | D-025 (`-AI` suffix in prose; false "no specs yet" claim — 6 ratified specs exist) | [#280](https://github.com/daniboomerang/attalabs/issues/280) |
| 4 | `apps/cetana-ai/specs/cetana-spec.md`, `.claude/skills/cetana-coordinator/SKILL.md` | D-050/D-052 (Archivist mischaracterized as GitHub-Action-triggered automation; ACTIVE decisions establish manual Principal-dispatch) | [#281](https://github.com/daniboomerang/attalabs/issues/281) |
| 5 | `.claude/skills/herald-engine/SKILL.md` | D-044/D-045 (endpoint `/api/match`→`/api/audit`, deleted `SKEPTICAL_AUDITOR_PROMPT` constant, direct `generateText()` call → engine-based) | [#282](https://github.com/daniboomerang/attalabs/issues/282) |

**5 Issues filed, covering 7 audited-doc rows** (two Issues each cover a pair of docs sharing the same root-cause decision: #280 covers two byte-identical CLAUDE.md files; #281 covers two docs with the same Archivist mischaracterization).

## 4. Newly-bound docs audited as "current" (no contradiction)

| Doc | Notes |
|---|---|
| `apps/vada-ai/specs/vada-byok-principles.md` | Current. |
| `.claude/skills/atta-engine/SKILL.md` | Current — actively confirmed against D-051. |
| `.claude/skills/atta-adapter-langgraph/SKILL.md` | Current — actively confirmed against D-053. |
| `.claude/skills/vada-mcp-server/SKILL.md` | Current. **Watch item:** D-066 (draft, unratified as of D-070) would redefine the published-team catalog this doc documents. Not a contradiction today because D-066 isn't ACTIVE — re-audit once it ratifies. |
| `.claude/skills/vada-yaml-authoring/SKILL.md` | Current. Same D-066 watch item. |
| `.claude/skills/vada-home-sections/SKILL.md` | Current. |
| `.claude/skills/vada-architecture/SKILL.md` | Current — actively confirmed against D-053. Same D-066 watch item (naming collision in progress: published "Outside Read" team vs draft D-066's differently-scoped "Outside Read"). |
| `.claude/skills/auth/SKILL.md` | Current — actively confirmed against D-031/D-035/D-036/D-061. |
| `.claude/skills/database/SKILL.md` | Current. Doc's own "D-029"/"D-030" citations resolve to `vada-decisions.md` (per-product log), not the global log — disambiguated in-doc, not a contradiction. |
| `.claude/skills/model-picker/SKILL.md` | Current. **Watch item:** D-068 (draft) proposes a `min_tier` gating order that may not match this skill's display-sort order — not ACTIONABLE today (D-068 not ACTIVE). |
| `packages/storage/CLAUDE.md` | Current. Minor cosmetic note: example URLs use `atta.ai` (target/unowned domain per D-025) rather than `attalabs.dev` — not a substantive contradiction. |
| `.claude/skills/ui-branding/SKILL.md` | Current — per-product Sanity project-ID table unaffected by D-060 (which only centralized `uiTheme`/`library`, not `branding`). |
| `.claude/skills/ui-canvas-animation/SKILL.md` | Current — no decision addresses this subsystem. |
| `.claude/skills/ui-theme-tokens/SKILL.md` | Current — actively confirmed against D-065/D-046. |
| `apps/aeg/specs/aeg-app-architecture.md` | Current. Predates D-069's `dropped`/`incoherent` status additions — evolution, not contradiction. |

**Cross-doc drift observation (not a decisions.md contradiction, no Issue filed):** `vada-mcp-server/SKILL.md`'s "9 YAMLs / 2 published" figure doesn't match `vada-architecture/SKILL.md`'s "10 YAMLs / 3 published" — the two skills have drifted from each other, not from the decision log. Worth a follow-up doc-sync task.

**Decision-namespace note:** Several vāda-scoped docs cite decision IDs (e.g. "D-028", "D-029", "D-033") that resolve into the *per-product* `apps/vada-ai/specs/vada-decisions.md` log, not `aeg-project/decisions.md`. The two logs number independently; this audit checked substantive claims against the global log only, per this task's chartered range.

## 5. Full coverage table — 23 skills

| Skill | Status | Pointer / reason |
|---|---|---|
| atta-adapter-langgraph | bound | `packages/adapter-langgraph/**` |
| atta-engine | bound | `packages/engine/**`, `packages/atta-agents/**` |
| atta-teams | bound (pre-existing) | `packages/agents/vada-deliberation/yamls/**` |
| auth | bound | `packages/auth/**` |
| cetana-coordinator | bound | `apps/cetana-ai/coordinator/**` |
| code-style | exempted | Cross-cutting Biome/TypeScript style guide; no single owning code surface. |
| database | bound | `packages/db/**` |
| executor-protocol | exempted | Process guide for dispatched agents, not tied to a code surface. |
| git-commits | exempted | Cross-cutting commit-format guide (commitlint/husky config); no single owning code surface. |
| herald-engine | bound | `apps/herald-ai/web/src/app/api/audit/**` |
| model-picker | bound | `packages/models/**` |
| monorepo-structure | exempted | Cross-cutting workspace/tooling guide; no single owning code surface. |
| ui-api-routes | bound | `apps/*/web/src/app/api/**` |
| ui-branding | bound | `packages/cms/schemas/branding.ts`, `packages/cms/scripts/seed-branding.ts` |
| ui-canvas-animation | bound | `packages/ui/canvas/**` |
| ui-cms-theme | bound | `packages/cms/**` |
| ui-components | bound (pre-existing) | `packages/ui/topbar/**` |
| ui-library-system | bound (pre-existing) | `packages/ui/libraries/**` |
| ui-theme-tokens | bound | `packages/ui/styles/**` |
| vada-architecture | bound | `packages/agents/**` (pre-existing), `apps/vada-ai/**` (new) |
| vada-home-sections | bound | `apps/vada-ai/web/src/app/(main)/components/home/**` |
| vada-mcp-server | bound | `apps/vada-ai/mcp-server/**` |
| vada-yaml-authoring | bound | `apps/vada-ai/mcp-server/src/spec-registry.ts` |

19 bound (15 new + 4 pre-existing), 4 exempted (all cross-cutting process/style guides without a single owning code surface — consistent reasoning across all four).

## 6. Full coverage table — 97 specs

### apps/aeg/specs/ (5)

| Spec | Status |
|---|---|
| aeg-app-architecture.md | bound — pointer for `apps/aeg/**` |
| aeg-backlog.md | exempted — operational backlog, subsidiary to the catch-all binding |
| aeg-consolidation-spec.md | exempted — point-in-time consolidation spec, subsidiary to the catch-all |
| aeg-decisions.md | exempted — decision log; not a bindable owned doc |
| aeg-observability-spec.md | exempted — subsidiary spec, covered by the catch-all |

### apps/atta-ai/specs/ (6) and apps/attalabs/specs/ (6, byte-identical content)

| Spec | Status |
|---|---|
| atta-build-strategy.md | exempted — strategy doc, subsidiary to `CLAUDE.md` catch-all |
| atta-ecosystem-vision.md | exempted — same |
| atta-finetuning-research.md | exempted — same |
| atta-market-research.md | exempted — same |
| atta-naming-decision.md | exempted — same (canonical naming doc, but not independently bound — referenced from root `CLAUDE.md` directly) |
| cetana-reality-check.md | exempted — same |

(All 12 files — 6 per app — carry pre-existing F1 `Status:` gaps; out of this task's edit surface, see §7.)

### apps/cetana-ai/specs/ (4)

| Spec | Status |
|---|---|
| cetana-backlog.md | exempted — operational backlog |
| cetana-decisions.md | exempted — decision log |
| cetana-experiment-log.md | exempted — experiment log, historical |
| cetana-spec.md | bound — pointer for `apps/cetana-ai/**` |

### apps/desktop/specs/ (15)

All 15 files (`00-overview.md` … `10-research-log.md`, `README.md`, `desktop-backlog.md`, `desktop-decisions.md`) — exempted via the pre-existing `# no-doc: apps/desktop/** — stub only` allow-list rule. Not newly bound; not re-audited (out of this task's "newly-bound" scope).

### apps/herald-ai/specs/ (3)

| Spec | Status |
|---|---|
| herald-app-architecture.md | bound (pre-existing) — `apps/herald-ai/web/src/app/[username]/**` |
| herald-backlog.md | exempted — operational backlog |
| herald-decisions.md | exempted — decision log |

### apps/vada-ai/specs/ (49)

| Spec | Status |
|---|---|
| engine/design-decisions.md | exempted — decision-log-shaped content |
| engine/flow-configurations.md | exempted — covered by `apps/vada-ai/**` catch-all |
| engine/v2-results/*.md (6 files) | exempted — historical benchmark/experiment results |
| legacy/*.md (12 files) | exempted — D-013 protects `apps/*/specs/legacy/**` as frozen archives; do not touch |
| vada-teams-catalog/*.md (7 files) | exempted — covered by the catch-all; content specs for the Teams concept, not independently bound |
| fusion-as-team-spike.md | exempted — spike proposal, covered by catch-all |
| generic-flow-refactor.md | exempted — refactor proposal, covered by catch-all |
| mcp-architecture.md | exempted — covered by catch-all (`vada-mcp-server` skill is the living doc for the shipped surface) |
| tools-capability-spike.md | exempted — spike proposal, covered by catch-all |
| vada-backlog.md | exempted — operational backlog |
| vada-byok-gap-report.md | exempted — historical gap analysis, superseded in currency by `vada-byok-principles.md` (bound) |
| vada-byok-principles.md | bound — pointer for `packages/crypto/**`, `packages/identity/**` |
| vada-calculator-concept.md | exempted — concept doc, covered by catch-all |
| vada-decisions.md | exempted — decision log (per-product) |
| vada-human.md | exempted — covered by catch-all |
| vada-product-recognitions.md | exempted — covered by catch-all |
| vada-product-spec.md | exempted — covered by catch-all |
| vada-rethink-v1-decision.md | exempted — decision-adjacent historical doc |
| vada-rethink.md | exempted — covered by catch-all |
| vada-reviewers-spec.md | exempted — covered by catch-all |
| vada-reviewers-tech-deep-dive.md | exempted — covered by catch-all |
| vada-science-of-deliberation.md | exempted — covered by catch-all |
| vada-state.md | exempted — operational state doc, not architecture |
| vada-web-restructure-plan.md | exempted — point-in-time plan doc |
| vada-yaml-immutability-principle.md | exempted — principle covered conceptually by `vada-yaml-authoring` binding, not independently bound |
| yaml-schema-reference.md | exempted — covered by catch-all; candidate for a future direct binding to `vada-yaml-authoring` if this surface grows its own code path |

### apps/vitakka-ai/specs/ (2)

`vitakka-human.md`, `vitakka-spec.md` — exempted via the pre-existing `# no-doc: apps/vitakka-ai/** — scaffold only` allow-list rule.

### packages/engine/specs/ (3)

`engine-future-capabilities.md`, `engine-layer-rationale.md`, `mastra-vs-langgraph.md` — exempted, covered by the `packages/engine/**` catch-all (`atta-engine` skill).

### specs/ (root, 5)

`aeg-improvement-findings.md`, `aeg-study/aeg-build-vs-adopt.md`, `aeg-study/aeg-market-study.md`, `aeg-study/aeg-process-reflection.md`, `ecosystem-backlog.md` — exempted: root-level cross-cutting research/backlog docs, not tied to a single code surface. `ecosystem-backlog.md` is additionally out-of-surface for this task (owned by the parallel #266 dispatch).

**Total: 97 specs — 5 bound as pointers (`aeg-app-architecture.md`, `cetana-spec.md`, `herald-app-architecture.md` pre-existing, `vada-byok-principles.md`), 92 exempted with recorded reason** (decision logs, backlogs, experiment/historical archives, or covered by a catch-all binding).

## 7. Out-of-scope observations (not fixed, not filed as Issues)

- **F1 baseline (pre-existing, unrelated to this task):** `bun packages/aeg-core/bin/verify-docs.ts` full mode reports 44 pre-existing F1 (`spec-status`)/F2 (`decision-shape`) issues — confirmed identical count (44) before and after this task's `doc-owners` changes. None of the docs newly bound in §2 are among them. Bulk `Status:` backfill across 44 specs is bulk content/metadata work outside this task's charter (bind-all + staleness audit); left for a separate task.
- **CLAUDE.md package table staleness (root file, outside the 23-skill + 97-spec audit universe):** the Shared Packages table row `@atta/agents | packages/agents/` is stale against D-051 (the physical `@atta/agents` package is at `packages/atta-agents/`; `packages/agents/` holds *per-agent implementation* packages). Noted in `doc-owners` as a comment; not filed as an Issue since root `CLAUDE.md` is not part of this task's chartered audit range, and it's a one-line table cell, not an architectural claim a decision explicitly contradicts.
- **`apps/attalabs` absent from root `CLAUDE.md` Products table:** see §2 note on the `apps/attalabs/**` binding — same out-of-surface reasoning.
