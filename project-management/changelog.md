# Atta — Changelog

**Completed work log.** Append-only, most recent first.

→ [now.md](now.md) — active work
→ [roadmap.md](roadmap.md) — tracks + sequencing
→ [lessons.md](lessons.md) — calibration

---

## 2026-05-13 — Chore: D-033 cleanup — signal-type rejection + RevisionCondition tighten (D-034)

Follow-up to PR #47. Two hardening changes identified during PR #47's diff review.

- **`buildRevisionCondition` throws on unsupported signal types.** Was silently coercing `signal.type: 'equals' | 'matches'` to `'contains'`, masking YAML authoring errors. Now throws explicitly with an actionable message naming the unsupported type. `compile-flow.ts`.
- **`RevisionCondition` collapsed to single-variant interface.** The v1 union had three variants (`contains`, `json-field-equals`, `json-field-truthy`); only `contains` was ever reachable from a v2 YAML. Collapsed to a plain interface with `type: 'contains'` (discriminator preserved for forward extensibility). `types.ts`.
- **Dead adapter switch-case branches deleted.** `json-field-equals` and `json-field-truthy` case blocks removed from `packages/adapter-langgraph/src/adapter.ts` and `graph-builder.ts`, plus the orphaned `getJsonField` helper (no callers).
- **Test coverage.** New test in `compile-flow.test.ts` mutates a sparring flow's audit round to use `signal.type: 'equals'`, asserts `compileFlow` throws with the exact message. 68 engine tests total.

5 files touched, +35/-86. Net deletion of 51 lines — what a cleanup PR should look like.

PR: #48
Commit: `c83b4311a7aca187d6b0cb38b0d185b447bf28ff` on `chore/d033-signal-and-revision-cleanup`.
Conforms to: `vada-decisions.md` D-033 (universal flow schema).
Logged as: `vada-decisions.md` D-034.

---

## 2026-05-13 — Refactor: Universal round-based schema + compileFlow (D-033 PR 2)

The architectural heavy lift of D-033. Vāda's YAML schema, engine compiler, and 29 consumer files migrated to the v2 universal round-based model in a single atomic PR.

- **Schema v2:** every flow is `{ schema_version: "2.0", id, defaults, agents, rounds }`. The three v1 shapes (brokered-no-synthesis, brokered-with-synthesis, rounds-based) collapsed into one model. Synthesizer = single-agent round. Audit = round. Revision = declarative via `on_failure: { action: revise, target, max_revisions, signal }`.
- **Engine compiler:** `compileFlow(flow, question, model?, customVars?) → Plan` replaces `compileSpec` + per-shape compilers. Greenfield 386-line implementation, no v1 shims. Shape detection at the top emits matching v1 Plan node ids (`solo`, `reviewer-{name}`, `brokered-synthesis`, `round-{r}-{name}`, `terminal-{k}`, `audit-{name}-{k}`, `__END__`) so the adapter executes the graph identically across shapes.
- **Catalog migration:** all 9 YAMLs hand-converted to `schema_version: "2.0"`. Every one validated by `validateFlow`. Behavioural verification: all existing engine tests pass against the migrated catalog (67/67).
- **Engine API surface:** `index.ts` now exports `loadFlow`, `compileFlow`, `validateFlow`, `resolveAgentFailure`, `InvalidFlowConfigError`, `Flow`, `FlowSchema`, and supporting types. Old exports (`loadSpec`, `compileSpec`, `specToTeam`, `Team`, `BrokeredWorkflow`, `RoundsWorkflow`, `SoloWorkflow`, `CustomWorkflow`, `Workflow`) all **deleted**. No backwards-compat shim.
- **Engine internals deleted:** `spec-types.ts`, `spec-schema.ts`, `spec-loader.ts`, `validate.ts`, `compile.ts`, the entire `compilers/` directory (`spec.ts`, `solo.ts`, `rounds.ts`, `custom.ts`, `brokered.ts`).
- **Consumer migration:** 29 files updated. MCP servers (`consult.ts`, `deliberate.ts`), route handler, 6 UI components (`DeliberatePanel`, `TeamPicker`, `TeamSummary`, `TeamHeader`, `AgentTab`, `calculator.ts`), verify scripts, and `apps/vada-ai/web/src/lib/flow-helpers.ts` (new — 39 lines, shared shape detection extracted out of every consumer).
- **Synthesis template bug fix:** `vada-reviewers-synthesis` synthesizer template was `{{reviewerResponses}}` — a variable the engine never populated. Synthesizer was running blind in production. Migration replaced with `{{#each allPreviousOutputs}}[{{this.agentName}}] {{this.content}}{{/each}}`. Caught during PR #47 diff review; fixed atomically with the migration.
- **`deliberation/page.tsx`:** `hasSynthesizer` detection now uses round structure instead of inspecting the deleted workflow union.
- **`start/route.ts`:** `agents` now read from `spec.rounds[0].agents` instead of the deleted `Team.agents`.
- **`planToVisualNodes.test.ts`:** updated cross-round edge test to match new node-id emission.

60 files touched, +477/-2637. The architecturally cleanest path was chosen over the backwards-compat shim the agent originally proposed — Principal rejected the half-merge in favour of full migration. Result: a fully consistent codebase with no half-merged state.

PR: #47
Commit: `45521c72cdab5e881202b92a9f83d5682523c706` on `feat/generic-flow-refactor-pr2`.
Conforms to: `vada-decisions.md` D-033.
Tests: 67 engine, 33 UI; 21/21 typecheck; biome clean.

---

## 2026-05-13 — Docs: v2 naming + framing audit (D-025 global)

Cross-product brand architecture refactor. Three rounds of multi-reviewer pressure-testing (Strategic/UX, Gemini, Grok) converged on a corrected framing of the AttaLabs vs Atta distinction. The original v1 framing ("Atta is the ecosystem; no product is named Atta") was giving away the brand the founder was actually building. The corrected v2 framing locks the following:

- **AttaLabs** = the dev/lab ecosystem at `attalabs.dev`. Multiple products live inside.
- **Atta** = a product within AttaLabs. The deep-thinking AI composed of Vāda + Vitakka + Sati. Target consumer domain `atta.ai` if/when available; not yet deployed.
- **Two ecosystems at different scales**: AttaLabs ecosystem (dev lab containing many products) and Atta ecosystem (internal composition of Vāda + Vitakka + Sati). Both legitimate; specs use the qualifier when ambiguity matters.
- **No `-AI` suffix on any product brand.** Atta, Vāda, Vitakka, Sati, Herald, Cetana are all bare. AI category signal carried via page content and site metadata.
- **Pāli rule demoted** from structural ("Pāli = built by Atta") to elective aesthetic. Mandatory inside Atta only. Cetana is Pāli but not part of Atta; Herald is non-Pāli but built by Dani.
- **Cetana is not part of Atta** — internal dev tooling, sibling AttaLabs product. Future public surface conditional on V0/V0.5 dogfood criteria.
- **Herald is a standalone AttaLabs product**, no longer "plugs in."
- **Sati standalone surface scope deferred** — OQ-cross-13 added.

Files updated in this PR:
- `apps/atta-ai/specs/atta-naming-decision.md` (canonical v2 rewrite)
- `apps/atta-ai/specs/atta-ecosystem-vision.md` (strategic content preserved; framing updated)
- Root `README.md` and `CLAUDE.md`
- `project-management/coordination.md` (names section + anti-patterns)
- `project-management/state.md` (Brand & domain section + per-product sections)
- `project-management/decisions.md` (new entry D-025 — Type 1, Lock: NO, ratified by Principal)

D-### numbering history of this PR is captured in the commit log: the framing was initially logged as D-033, then renumbered to D-034 (D-033 was already taken by the generic flow refactor in `vada-decisions.md` — but the agent didn't realise that D-033 was per-product, not global), then renumbered to D-025 once the audit discovered the global log only ended at D-024. The "D-025-D-033" references in `state.md` that initially confused the audit were per-product entries in `cetana-decisions.md` and `vada-decisions.md`, not global. The D-### overlap between logs is now disambiguated throughout the repo by naming the log (e.g. "global D-025" vs "vada-decisions.md D-025").

PR: #46
Commit: `311a743bbb2cd0a5f90ff28b3f70dc3f7ab85640` on `docs/naming-and-framing-audit-may-12`.
Logged as: global `decisions.md` D-025.
Calibration lesson worth surfacing: when two logs (global + per-product) can have overlapping D-### numbers, every reference must name the log. Captured in `vada-state.md` calibration notes; should propagate to `lessons.md` on next touch.

---

## 2026-05-12 — Feat: Flow types + Zod schema + validateFlow (D-033 PR 1)

Foundational schema work for the generic flow refactor. Introduces the new universal round-based schema alongside the existing v1 schema; old types stay alive. PR #47 consumes the new types in sequence.

- **New files:**
  - `packages/engine/src/flow-types.ts` — `Flow`, `Round`, `AgentInRound`, `OnFailureSpec`, and supporting types
  - `packages/engine/src/flow-schema.ts` — Zod schema for the new YAML shape; `schema_version` `'2.0'` denotes the new round-based structure
  - `packages/engine/src/validate-flow.ts` — `validateFlow()` enforces the 10 validation rules from D-033 (rounds non-empty, unique ids, no forward `on_failure.target` references, agent refs exist, template required somewhere, etc.)
  - `packages/engine/src/__tests__/validate-flow.test.ts` — unit tests covering every validation rule + 4 catalog-shape happy-path tests (30 tests total)
- **Updated:** `packages/engine/src/index.ts` exports the new types, schema, validator. Old exports unchanged.
- Nothing else in the monorepo imports from these new files yet — PR #47 wires up the migration. Build stays green; all 21 packages typecheck; all existing engine tests pass.

PR: #41
Commit: `86ed9cca5efa5c5aec8766e7bcb192f49ea73367` on `feat/generic-flow-refactor-pr1`.
Conforms to: `vada-decisions.md` D-033 (design); ratifies the schema + types portion of that design.

---

## 2026-05-12 — Fix: `cetana init` abort-path hang (D-021 follow-up)

`cetana init` printed "Aborted" when user declined overwriting existing config, but the process did not return shell control — required Ctrl+C. Root cause: `setupStdinReader()` called `process.stdin.resume()` putting stdin into flowing mode, holding an event loop ref; the abort branch returned without closing the stream, so for interactive (TTY) stdin — which never emits 'end' — the process hung indefinitely. Fix: `process.stdin.destroy()` in the abort branch, which closes the stream and releases the event loop ref (1-line change in `init.ts`). Regression test added in `commands.test.ts` verifying the abort path exits within 2 seconds with code 0.

Second D-021 install-gate violation discovered post-merge (PR #42 was the first). Calibration lesson added to `lessons.md`: install gate verification must cover every code path, not just the happy path.

PR: #43
Reproduction verified fixed: `echo n | cetana init` exits cleanly with code 0.

---

## 2026-05-12 — Fix: F5 install gate documentation correction

PR #39 (Cetana V0.5 Step 1) shipped with a broken install command in `apps/cetana-ai/README.md` and `apps/cetana-ai/cli/README.md`. The documented invocation `bun link --cwd apps/cetana-ai/cli` failed on Principal's machine with "Script not found 'link'" because `bun link` is not a workspace script and `--cwd` doesn't apply to it. Correct invocation is `(cd apps/cetana-ai/cli && bun link)` (run from inside the package directory via subshell).

The agent's install-gate verification in PR #39 used the working command but documented a different one. D-021's install gate (Lock: YES) was technically violated.

Calibration lesson added to `lessons.md`: install gate verification must produce Principal-runnable artifacts.

---

## 2026-05-12 — Cetana V0.5 Step 1: CLI scaffold + init (F5 complete)

Shipped the `cetana` CLI binary at `apps/cetana-ai/cli/`. Five commands: `init`, `dispatch`, `list`, `reply`, `logs`. Hierarchical config (local `.cetana.json` overrides global `~/.cetana/config.json`). Heartbeat-based CRASHED detection. Install gate verified end-to-end on fresh checkout.

PR: #39
Commit: 039768c
Conforms to: D-020 (CLI canonical), D-021 (install gate), D-022 (thin client over Coordinator).

After this PR: Cetana V0 is usable without manual JSON editing. Next: F6 (`cetana watch`).

---

## 2026-05-11 — Vendor registry consolidation (PR #31)

- **Two commits on the branch.** `2db31eb` shipped the architectural refactor (registry + SDK-shape dispatch + MCP `reviewer_config` + experimental flag on three YAMLs). `08a041b` shipped the tech-debt cleanup (delete `providers.ts` shim, migrate 6 ecosystem consumers + 12 web-app files). `58926a1` fixed a Vercel build issue (declared `@atta/models` as a workspace dep in `@vada/mcp-server`, masked locally by Bun's hoisted node_modules but exposed by Vercel's `--frozen-lockfile`).
- **Single source of truth.** `packages/models/src/vendors.ts` lists 12 vendors with `sdkShape`, `baseURL`, `keyConvention`, `modelPrefixes`, `envVar`, `localOnly`. `VendorId = keyof typeof VENDORS` replaces the 5-wide `RouteProvider` union. Adding a new OpenAI-compatible vendor is one registry entry; a new SDK shape is one adapter + one switch branch.
- **MCP `reviewer_config`.** `vada__consult` mirrors the web UI's per-slot model configurability. Validated against the registry — refuses `local_only_vendor` and `missing_provider_key` with structured errors. Closes the prior MCP/web contract gap.
- **Unpublished role-played teams.** Crucible, Sparring, War Room marked `experimental: true`. Public `/teams` catalog now shows 2 teams (Vāda Reviewers, Vāda Reviewers + Synthesis). YAMLs retained in repo for bench harness + future iteration.
- **Tech debt fully cleared.** `providers.ts` deleted; 18 consumer files migrated. Architecture clean.
- See D-032 for full decision.

## 2026-05-10 — Cetana V0 shipped (PR #25) + v3 operational model adopted

- Cetana coordinator built at `apps/cetana-ai/coordinator/`. Single Bun service, two MCP server entry points, 4 tools, 38 passing tests.
- State-machine-governed v3 operational model: three conversational roles (Principal, Team Leader, Developer) + Archivist automation. New files in `project-management/`: `state-machine.md`, `decisions.md`, role refs, ratification queue. Brief authoring migrated to `.claude/skills/brief-authoring/SKILL.md`.
- Slice -1 prototype deleted; `cetana-spec.md` finalized (D-018 locked).

## 2026-05-09 — MCP contract fixes + skill registration unblock

- **PR #20** (`fix/skill-paths-decouple`, commit `865c6c9`) merged. Moved per-skill path globs from custom `paths:` SKILL.md frontmatter into sibling `paths.txt` files. Skill tool's frontmatter parser silently drops skills with non-standard fields; the skill-check enforcement hook was demanding skills the Skill tool refused to load. 17 skills affected. Hook updated to read `paths.txt` instead of parsing frontmatter.
- **PR #21** (`fix/mcp-schema-drift`, commit `26c20ba`) merged. Aligned Vāda's `vada__consult` and `vada__deliberate` MCP surfaces with deployed runtime: structured inputSchema (`context`, `question`, `reviewers[{role, notes?, domain?}]`, plus optional `spec_id`, `current_leaning`, `stakes`, `session_title`); team enum expanded to all 5 published specs (later pruned to 2 in PR #31); stale `vada__deliberate_brokered` reference and `domain_expert` description removed; README retired Brokered/Autonomous mode framing, fixed broken specs link, added hosted MCP installation section. Validator (`validateAndNormalize`) untouched — both legacy and structured shapes still accepted.
- **Hosted MCP dogfooded.** Server verified end-to-end via curl (`initialize` + `tools/list` clean with bearer auth). Claude.ai web returns `ofid_5a58c66b85d09d04` — Track E12 broker bug reconfirmed (third independent reproduction). Claude Code CLI works.

## 2026-05-08 — rev 5 of Vāda Reviewers spec + ecosystem doc updates

- `vada-reviewers-spec.md` rev 5: three additions to reviewer + synthesizer prompts (Persona+Goal+Posture+Output structure, verification block requirement, phantom consensus detection). Derived from cross-vendor research synthesis (Gemini, Grok, ChatGPT — May 2026). See D-031.
- `vada-decisions.md` D-031: rev-4-to-rev-5 reasoning recorded.
- `vada-reviewers-tech-deep-dive.md` Section 9.6: methodological note on framework-vs-production patterns.
- `mcp-architecture.md`: known-issue note added on Claude.ai connector broker bug.
- `atta-plan.md`: Vāda Desktop parking-lot item, Track E12 OAuth hardening watchpoint, calibration lessons on principles-vs-specs and broker bug.
- `atta-coordination.md`: GitHub MCP connection note.

## 2026-05-06 — doc audit

- 7 repo files synced to May 4-5 reality via PR `docs/may-5-reality-sync` (commit `aa03a51`)
- D-028, D-029, D-030 appended to `vada-decisions.md`
- BYOK principles rewritten in place; gap report marked historical
- `mcp-architecture.md` flipped target → shipped
- `vada-mcp-server/SKILL.md`, `auth/SKILL.md`, `database/SKILL.md` all updated

## 2026-05-04 — hosted MCP + single-source-keys + shared-keys-ui

- May 4: Hosted MCP server shipped end-to-end (PRs #9 + #10). Endpoint `https://vada.attalabs.dev/api/mcp`. Bearer auth via `vada_*` API keys (SHA-256). Provider keys envelope-encrypted in `user_provider_keys`. Both MCP tools wired through. See D-029.
- May 4: Single-source-keys reversal (PR #13). Server-side canonical; IndexedDB demoted; `@atta/identity` preserved for probe/Ollama/migration. See D-028.
- May 5: `feat/shared-keys-ui` merged. Components extracted to `@atta/ui/account`, schemas moved to `@atta/db`, Settings restructured, D-027 unified team storage. See D-030.

## 2026-05-03 — engine-flow-ui PR

- Full teams catalog surface
- `@atta/ui/engine-flow` module shipped
- Engine vocabulary: `PlanNodeKind` + `PlanEdgeKind` emitted by all 4 compilers
- `AgentRole` deleted from engine

## 2026-05-02 — architectural locks

- Hosted MCP target architecture locked (endpoint, auth, BYOK trust model)
- Role/engine separation locked

## 2026-04-30 — Track B Item 2 + closeout

- Multi-vendor adapter, engine extensions, docs cleanup, web restructure, Vāda Reviewers v1 YAMLs all merged

## 2026-04-29 — post-launch fixes + audits

- Settings UI fixes; BYOK structural audit; Vāda Reviewers spec rev 4 locked
- "Brokered" and "Autonomous" retired as architectural concepts

## 2026-04-28 — production launch

- Vāda + atta hub deployed; DNS configured; OAuth-only V1 launched
