**Status:** ratified

## Most recent session — Jun 18, 2026

Homepage rewrite. Removed sections that described implementation internals (YAML, Atta Engine, `compileFlow`) and replaced them with product-focused copy that accurately describes what Vāda does. Key changes:

- Deleted `PositioningSection` (YAML syntax + engine diagram), `MechanismSection` (BYOK callout + round geometry), `EcosystemSection` (Atta/Vitakka branding — products not yet public), `ArchitectureDiagram`, `PositioningDiagram`
- Removed async CMS branding fetches (`getAttaBranding`, `getVitakkaBranding`) from homepage; page is now a plain sync Server Component
- Added `WhatItIsSection`, `WhyItWorksSection`, `TryItSection`, `McpDeveloperSection` — all static, no CMS dependencies
- Updated `NegationsSection`: removed "No tools. No file access. No code execution." (a YAML-level decision per D-046, not a product constraint); replaced with "Vāda is not a search engine."
- Updated `HomeHero`: subtitle "Deliberation Teams" → "Multi-model deliberation"; added concrete second line after animation

---

## Most recent session — May 12-13, 2026

D-033 generic flow refactor + D-034 cleanup landed. Vāda's YAML schema, engine compiler, and all consumers now operate on a single universal round-based model (v2 schema). Key changes:

- Schema v2: `Flow` (top-level) → `rounds: Round[]`. The three v1 shapes (brokered-no-synthesis, brokered-with-synthesis, rounds-based) collapsed into one model. Synthesizer is a single-agent round. Audit is a round. Revision is declarative via `on_failure: { action: revise, target, max_revisions, signal }`.
- Engine: `compileFlow(flow, question, model?, customVars?) → Plan` replaces `compileSpec` + per-shape compilers. Greenfield code; emits the same Plan node ids (`solo`, `reviewer-{name}`, `brokered-synthesis`, `round-{r}-{name}`, `terminal-{k}`, `audit-{name}-{k}`, `__END__`) so the adapter executes the graph identically across shapes.
- All 9 catalog YAMLs migrated to `schema_version: "2.0"`.
- `vada-reviewers-synthesis` synthesis template bug fixed in the migration: was `{{reviewerResponses}}` (never populated by the engine), now `{{#each allPreviousOutputs}}[{{this.agentName}}] {{this.content}}{{/each}}`. Synthesizer now actually sees the reviewer outputs.
- Deleted: `spec-types.ts`, `spec-schema.ts`, `spec-loader.ts`, `compile.ts`, all `compilers/*.ts` (brokered, rounds, solo, custom, spec). The `Team` / `BrokeredWorkflow` / `RoundsWorkflow` / `SoloWorkflow` / `CustomWorkflow` / `Workflow` union types deleted from `types.ts`.
- 29 consumer files updated: route handler, both MCP tool files (`consult.ts`, `deliberate.ts`), 6 UI components reading the spec shape (`DeliberatePanel`, `TeamPicker`, `TeamSummary`, `TeamHeader`, `AgentTab`, calculator), verify scripts, and `apps/vada-ai/web/src/lib/flow-helpers.ts` (new — shared shape detection for UI).
- D-034 cleanup (PR #48): `compile-flow.ts` `buildRevisionCondition` throws explicitly on unsupported signal types instead of silently treating `equals`/`matches` as `contains`. `RevisionCondition` in `types.ts` collapsed to single-variant interface (`type: 'contains'`); the unused `json-field-equals`/`json-field-truthy` variants and their adapter case blocks removed.
- See vada-decisions.md D-033 and D-034. Implementation across PRs #41 (schema + types + validation), #47 (compileFlow + migration + consumer updates), #48 (cleanup).

---

## Most recent session — May 5, 2026

BYOK + Settings restructure (branch: `feat/shared-keys-ui`). Key changes:
- Settings tabs restructured: Teams tab removed; Account / API Keys / Agent Style remain
- `ProviderKeysSection` and `ApiKeysSection` extracted to `packages/ui/account/` — shared across products
- Ecosystem schemas (`providerKeys`, `userPreferences`) moved from `apps/vada-ai/web` to `@atta/db`; query layer migrated
- Unified team agent model storage: `vada:team:<specId>` → `Record<agentName, string>` for all team types (D-027); replaces separate `vada:reviewer-models:` and `vada:team-model:` keys
- DB `getUserTeamModels` call removed from deliberate page; stale DB entries were overriding localStorage selections on every refresh (revert-to-Claude bug) — fixed
- `GlobalModelSelector` writes to unified storage via `specAgentNames` prop; `resolveModel` in `DeliberatePanel` reads from single source


# Vāda — Current State

> **Framing note (2026-04-30):** The "Brokered mode" and "Autonomous mode" product categories used in older entries have been retired. Current framing uses the Vāda Teams catalog (YAML specs at `packages/agents/vada-deliberation/yamls/`). See `vada-reviewers-spec.md` for the in-progress Vāda Reviewers team spec.

**Last updated:** Jun 18, 2026
**Last milestone:** Homepage rewrite — removed engine/implementation sections, replaced with product-focused copy (PR #147).
**Next milestone:** Track B Item 3b — Reviewer prompt iteration.

---

## What Vāda is, in one paragraph

Vāda is a YAML-driven deliberation runtime. The engine executes deliberation configurations expressed entirely as YAML files. Other applications (Claude Desktop, Cursor, custom apps) invoke Vāda via MCP by passing a YAML and a question; the engine runs the YAML and returns the result. Modes (Crucible, Sparring, Reviewers, baselines) are not features — they are YAML configurations. The engine is mode-agnostic.

The v2 schema (D-033) collapses all deliberation patterns into a single model: a flow is a sequence of rounds. Each round has agents, layout (parallel or serial), optional repeats, and optional declarative revision. The compiler detects four shapes from this structure (solo, brokered ± synthesis, rounds + audit) and emits a Plan graph the adapter executes identically across all of them.

Vāda is one product within the AttaLabs ecosystem (`vada.attalabs.dev`). It is also the deliberation layer inside Atta-the-product (the composed deep-thinking AI; see `apps/atta-ai/specs/atta-naming-decision.md` and `aeg-project/state.md` for the v2 framing locked in D-025). This document tracks Vāda-internal state — for ecosystem-level positioning see those documents.

---

## What's complete

### Phase 1 — Mastra removal
LangGraph is the sole deliberation execution path. Mastra and `@atta/orchestration` deleted.

### Phase 2 — Package restructure
`@atta/agents` extracted, `@vada/agents` and `@vada/teams` migrated to `apps/vada-ai/`. `@vada/mcp-server` consolidated.

### Phase 2.5 — Documentation hygiene
All affected skill files, CLAUDE.md files, and READMEs updated to match the restructured packages. `ROADMAP.md` and `DOCS.md` introduced.

### Phase 3.5 — Engine cleanup
Vestigial `declare` stubs removed. Vitest added. 8 compile tests passing.

### Phase 4 — Brokered through engine
`BrokeredWorkflow` type, `compileBrokered`, `brokered-trio` team, `verify-brokered-port.ts` live test, `vada__consult` wired through engine. (Note: the `BrokeredWorkflow` type was later deleted as part of D-033's v2 schema migration. The catalog `brokered-trio.yaml` survives as a v2 `brokered-no-synth` shape.)

### Phase 5 — Brokered specs update
`brokered-deliberation/00`, `01`, `02`, `06` specs updated to reflect engine-based architecture. (Some of these specs reference v1 framing — see `vada-teams-catalog/` directory; flagged for separate cleanup pass.)

### Phase 6 — Reviewer-chain teams (brokered-trio, brokered-quartet) polish
`vada__consult` tool description expanded (~1200 words), Zod input validation, DB migration adding 7 columns, Domain Expert agent added, `brokeredQuartet` flag-gated.

### Phase 6.5 — Benchmarks infrastructure
`benchmark_runs` table, judge script, `/brokered/bench` dashboard with detail pages, smoke test infrastructure.

### Phase 6.7 — Reviewer prompts audit + fix
Three reviewer rounds confirmed the original prompts were written for Autonomous multi-round and being incorrectly reused in Brokered single-shot. Strategist, Critic, Devil's Advocate prompts rewritten. Tool description rewritten with synthesis weighting. Per-reviewer notes routing added. Judge prompt restructured around 5 new criteria (assumption surfacing, actionable specificity, confidence calibration, frame quality, length efficiency). Smoke test re-run revealed a benchmark architecture flaw — see Open Questions below.

### Phase 7.1 — YAML schema investigation
Sonnet investigated current code, identified 30+ branches that needed to die, proposed YAML schema, drafted example YAMLs for all 7 flows, identified 9 open questions (5 resolved by Principal, 4 deferred).

### Phase 7.2 — YAML refactor (Phase A + Phase B)
**Phase A:** YAML support added alongside existing TypeScript. 10 commits. New `DeliberationSpec` types, Zod schema, `loadSpec()`, `compileSpec()`, `specToTeam()`, 7 YAML files, MCP `spec-registry`, web app `selectSpec`. All 5 behavioral verifications passed (A0, A1, Crucible, Sparring, Brokered).

**Phase B:** Old TypeScript deleted. `@vada/teams` package removed. Workflow union types removed. Adapter cleaned of mode-specific branches. Classifier name-substring hard rule replaced with `classifierMode` parameter. Documentation updated across skill files, CLAUDE.md files, and spec docs. Audit pass caught 9 stale items in specs and READMEs that the original Phase B scope had missed; all fixed before commit. 5 commits landed clean. Final typecheck 18/18.

### Phase 7.2.1 — YAML catalog loader extraction
Extracted `loadYamlFromCatalog(id)` from ad-hoc per-caller implementations into `@atta/engine` (`packages/engine/src/catalog-loader.ts`). Fixed two broken runtime YAML-loading paths: the web route was using `process.cwd()` (which resolves to `apps/vada-ai/web/` in dev) and the MCP spec-registry was using the wrong `../../../yamls` depth. Path resolution anchored to `import.meta.url` — immune to dev server cwd changes. `VADA_YAMLS_DIR` env var available for production override.

### Phase 7.3 — YAML catalog cleanup and complete migration
Eliminated all hardcoded spec references and static registries. Three `crucible-v1` fallbacks removed from web app (form initialization, route validation, session resume). MCP `spec-registry.ts` rewritten from a static `SPECS` record to dynamic `readdirSync`-based discovery delegating to `@atta/engine`'s `listPublicSpecs()`; `validateAllSpecs()` added for startup fail-fast validation. All 7 YAML filenames and `id` fields stripped of `-v1` suffixes (vada-decisions.md D-025 — Vāda-internal; note: the global PM `D-025` is the v2 naming framing — different log, same number); ALIASES simplified to `a0`/`a1` only. Drizzle migration backfills `sessions.spec_id` column. `@vada/agent-metadata` package deleted and collapsed into `apps/vada-ai/web/src/components/agents/visuals/`. `customVars` Handlebars rendering added for `system_prompt` fields.

### BYOK + Settings restructure (`feat/shared-keys-ui`)
Settings page restructured: Teams tab removed (model selection moved inline to deliberation panel). `ProviderKeysSection` and `ApiKeysSection` extracted to `packages/ui/account/` as shared components. Ecosystem DB schemas (`providerKeys`, `userPreferences`) moved to `@atta/db`. Team agent model storage unified to a single localStorage key format `vada:team:<specId>` → `Record<agentName, string>` for all team types; stale DB seeding that caused revert-to-Claude bug removed.

### Phase 8 — Synthesis exposed to consumers
The engine already produced structured synthesis via terminal nodes; both MCP and web app consumers stripped the structured field at the boundary. Phase 8 exposes it:
- `vada__deliberate` returns `structured` alongside `content`; null when the spec has no output_schema (vada-decisions.md D-026)
- Web app SSE adds typed `synthesis_complete` events with both content and structured payloads
- `transcriptEntries` gains a `structured jsonb` column; synthesis and revision phases insert a transcript entry with structured populated
- `persistTurn` threads `structured` from engine output (AgentOutput.structured) through to DB
- Schema validation tightened: synthesis agent must exist in agents list; `output_format: structured` requires `output_schema`; declaring `output_schema` without `output_format: structured` is rejected
- Resolves OQ-A (caller decides per-call) and OQ-B (per-YAML choice; engine surfaces both)
No schema 2.0 required. The change is at the API boundary, not the spec language.

### Phase 9 — Hosted MCP server shipped (May 4, 2026)
PRs #9 + #10 landed server end-to-end. Endpoint: `https://vada.attalabs.dev/api/mcp`. Streamable HTTP transport. Bearer auth via SHA-256-hashed `vada_*` API keys (`packages/auth/src/api-key-auth.ts`). Provider keys envelope-encrypted in `user_provider_keys` (AES-256-GCM, AAD-bound to clerkId, `MASTER_ENCRYPTION_KEY` env var, `kms_key_id` reserved for future KMS migration). Both `vada__consult` and `vada__deliberate` tools wired through. See `apps/vada-ai/specs/mcp-architecture.md` for full spec, `vada-decisions.md` D-029 for the architectural decision. Phase 5 (stdio session URL fix) and Phase 6 (rate limiting, audit log, hardening) remain as future work.

### Phase 10 — Single-source-keys reversal (May 4, 2026)
PR #13 demoted IndexedDB from canonical provider-key storage. Server-side `user_provider_keys` is now the single source of truth. Both UI surfaces (Settings → API Keys; the `/deliberate` model picker's inline key dialog) write to the server via `POST /api/keys/provider`. The `/deliberate` page's lock-icon row, "Sign," and "Forget this device" affordances were removed. `@atta/identity` package retained — `IdentityProvider` mounted in vada-ai and atta-ai layouts; `probeProviderKey` (validate before save), `fetchInstalledOllamaModels` (local Ollama discovery), `MigrationPrompt` (one-time UX nudge for users with pre-reversal IndexedDB keys), `useIdentity` hook used by judge benchmark + model picker. The package no longer holds canonical keys. See vada-decisions.md D-028.

### Phase 11 — Shared keys UI + ecosystem schemas (May 5, 2026)
`feat/shared-keys-ui` merged. `ProviderKeysSection` and `ApiKeysSection` extracted to `packages/ui/account/` as shared components. Ecosystem-shared key tables (`apiKeys`, `userProviderKeys`, `mcpSessions`) moved from `apps/vada-ai/web/src/db/schema.ts` to `packages/db/src/schema/keys.ts`. Vāda-specific tables (including `userSettings` for face-style preference) stay in app-local schema. Settings tabs restructured: Account / API Keys / Agent Style. Teams tab removed; team agent model selection moves inline via vada-decisions.md D-027's unified `vada:team:<specId>` localStorage key. See vada-decisions.md D-030.

### Phase 12 — Doc audit pass (May 6, 2026)
PR `docs/may-5-reality-sync` synced 7 repo files to May 4-5 reality: `vada-decisions.md` (D-028, D-029, D-030 appended), `mcp-architecture.md` (target → shipped), `vada-byok-principles.md` (rewritten in place), `vada-byok-gap-report.md` (resolution status block prepended), `vada-mcp-server/SKILL.md`, `auth/SKILL.md`, `database/SKILL.md`. Out-of-scope deferrals were addressed in a follow-up cleanup pass.

### Phase 13 — Vendor registry consolidation (May 11, 2026)
PR #31 shipped a single source of truth for vendor metadata at `packages/models/src/vendors.ts`. 12 vendors registered with `sdkShape`, `baseURL`, `keyConvention`, `modelPrefixes`, `envVar`, `localOnly`. Four prior divergent prefix-resolution implementations (in transform, adapter, route, reviewer-models) collapsed to one. Adapter dispatches by SDK shape (3 branches: `anthropic`, `google-genai`, `openai-compat`) instead of per-vendor switch. `vada__consult` MCP tool gains optional `reviewer_config: Record<agentName, modelId>` parameter, validated against the registry. Crucible, Sparring, War Room marked `experimental: true` and unpublished from the public `/teams` catalog. Tech debt cleared in the same PR — `providers.ts` shim deleted; 18 consumer files migrated. See vada-decisions.md D-032.

### Phase 14 — D-033 generic flow refactor + D-034 cleanup (May 12-13, 2026)
Universal round-based YAML schema shipped across the stack. PR #41 added the new types + Zod schema + `validateFlow` (10 validation rules). PR #47 implemented greenfield `compileFlow`, migrated all 9 catalog YAMLs to `schema_version: "2.0"`, deleted the old schema and per-shape compilers, and updated 29 consumer files. PR #48 cleanup removed dead code from the adapter switch tables and tightened `RevisionCondition` to a single-variant interface. Key outcomes:

- One compiler entrypoint (`compileFlow`) replaces `compileSpec` + per-workflow compilers. Shape detection at the top of the function emits matching Plan node ids (`solo`, `reviewer-{name}`, `brokered-synthesis`, `round-{r}-{name}`, `terminal-{k}`, `audit-{name}-{k}`, `__END__`) so the adapter executes the graph identically across shapes.
- Bug fix: `vada-reviewers-synthesis` synthesizer template now uses `{{#each allPreviousOutputs}}[{{this.agentName}}] {{this.content}}{{/each}}` (the v1 template referenced `{{reviewerResponses}}`, which the engine never populated — the synthesizer ran blind in production).
- `types.ts` shrunk by ~200 lines: `Team`, `BrokeredWorkflow`, `RoundsWorkflow`, `SoloWorkflow`, `CustomWorkflow`, and the `Workflow` discriminated union all deleted. `Plan`, `PlanNode`, `PlanEdge`, `PlanGraph`, `PlanNodeRole`, `PlanNodeKind`, `PlanEdgeKind`, and the `Agent` re-export survive.
- `index.ts` public API surface: `loadFlow`, `compileFlow`, `validateFlow`, `resolveAgentFailure`, `InvalidFlowConfigError`, `Flow`, `FlowSchema`, `Plan`, `Agent`, and supporting types. No backwards-compat shim — the consumer surface migrated atomically in PR #47.
- UI shape detection extracted into `apps/vada-ai/web/src/lib/flow-helpers.ts` (39 lines). `detectShape`, `getDisplayAgentNames`, `getFlowAgentCount`, `getFlowShapeLabel` consumed by `DeliberatePanel`, `TeamPicker`, `TeamSummary`, `TeamHeader`, `AgentTab`, and `calculator.ts`.
- D-034 cleanup: `compile-flow.ts` `buildRevisionCondition` throws on unsupported signal types instead of silently producing a `contains` Plan. `RevisionCondition` in `types.ts` collapsed to single-variant interface; adapter switch tables in `adapter.ts` and `graph-builder.ts` lost their dead `json-field-equals` / `json-field-truthy` case blocks.

The architectural ideal in D-033 ("engine has zero branches on workflow type") is met for the YAML schema layer (one schema, zero discriminators) but pragmatically weakened in the compiler — `compileFlow` contains shape detection over `flow.rounds` topology to emit matching node ids. The decision is documented in D-033 as deliberate; a future cleanup PR could revisit it once the adapter is refactored.

See `yaml-schema-reference.md` for the canonical schema documentation. See `generic-flow-refactor.md` for the design doc. See vada-decisions.md D-033 and D-034.

---

## What's parked

These exist but are NOT the product direction. They remain as historical artifacts or as configurations that ship for compatibility.

### Reviewer-chain teams (brokered-trio, brokered-quartet) — role-based, single-shot
Three reviewers (Strategist, Critic, Devil's Advocate) running in parallel for one round. No synthesis at the engine layer. Currently expressed as `brokered-trio.yaml` (v2 shape: `brokered-no-synth`). This is a parked configuration, not the destination.

### Role-based deliberation as theory
The Strategist/Critic/Devil's Advocate role split was a theoretical decomposition. It has not been validated empirically against role-free configurations. The manual workflow that this project is modeled on does NOT use roles. Whether roles add value over role-free reviewer multiplication is an open empirical question deferred to validation experiments.

### Single-round deliberation
Single-round deliberation is a structurally weaker approximation of what the manual workflow actually does (iterative refinement with synthesis between rounds, terminated by Principal). It ships in the current reviewer-chain YAMLs (`brokered-trio`, `brokered-quartet`) but is not the product target.

---

## What's in flight

D-033 docs cleanup PR (this PR) bringing all Vāda specs and skills into alignment with the v2 schema and `compileFlow` engine.

Next focused work after docs PR merges: reviewer prompt iteration (Track B Item 3b).

---

## What's next, sequenced

### Reviewer prompt iteration (Track B Item 3b)
Interactive D pair-mode session. Invoke `vada__consult` with `spec_id: "vada-reviewers"`, read the 3 reviewer responses, judge whether the prompt is producing the right behavior, tweak, re-run. §4.1.1 of the rev 5 spec is the starting prompt. Best done in a fresh session with uninterrupted attention. NOT a brief-and-dispatch task.

### Synthesizer prompt iteration (Track B Item 3c)
Same shape as 3b. §4.1.2 of the rev 5 spec is the starting prompt.

### First Vāda Reviewers benchmark run (Track B Item 4)
Six conditions per test case (A0, A1, VR-NS, VR-S-same, VR-S-cross, MW-where-available). Manual judging by Claude in fresh context, Dani as final arbiter. Per-question-type breakdown required.

### Iterate or ship Vāda Reviewers v1 (Track B Item 5)
Decide recommended synthesis mode based on benchmark data, not philosophy.

### Benchmark architecture redesign
Current benchmark judges raw transcript concatenation, NOT what users actually receive (synthesized output). This is a structural flaw discovered in Phase 6.7's smoke test analysis. Judge must measure synthesized output (with augmentation if applicable) against single-shot baseline. Apples-to-apples comparison.

### YAML cost calculator UI
Users can paste/select a YAML and see estimated cost to run it. The calculator was rewritten in PR #47 to consume `Flow` directly (via `flow-helpers.detectShape`). Pairs with benchmark history to enable cost-per-quality and cost-quality frontier analysis. Concept document at `apps/vada-ai/specs/vada-calculator-concept.md`.

### Validation experiments
Stratified test corpus across decision domains. Run each YAML against the corpus. Build benchmark data per YAML. Identify cost-quality frontier. Determine which YAMLs ship as products and which are research artifacts. Address open questions about role-based vs role-free, single-shot vs multi-round empirically.

---

## Open architectural questions

These were raised but not resolved. They need answers before being designed into the system.

### OQ-C: How does the engine express Principal-terminated loops?
Real-case Brokered terminates when the Principal says it's done, not after a fixed number of rounds. Requires engine extension. Could be: external loop control via Caller Claude (Principal continues by re-invoking) or engine-internal with a "continue?" callback.

### OQ-G: How are YAML forks named without the -vN convention?
vada-decisions.md D-025 dropped the `-v1` suffix convention. When `crucible.yaml` needs to be iterated (after benchmark data exists), what naming scheme is used for the fork? Semantic names (`crucible-extended.yaml`)? Numeric suffixes reintroduced on first fork (`crucible-v2.yaml`)? Date-based? The answer shapes catalog readability and comparison UX.

### OQ-H (NEW May 13): Adapter refactor to new TemplateState shape
PR #47 left the adapter on the v1 `TemplateState` shape (`outputsByRound`, `lastOutputByAgent`, etc.). The D-033 design contemplated a round-namespaced template context (`rounds.<id>.outputs`, `currentRound.prior_agents`, `revision.source_outputs`) — that refactor is future work. Currently v2 YAMLs use v1 template variable names; the adapter is unchanged. Decision needed on when (and whether) to refactor the TemplateState to match the new schema's mental model. Adjacent decision: SSE event names (`state_changed: ROUND_N` etc.) also still match v1 semantics; PR 3 (deferred) would rename to `round_started` / `round_completed` / `revision_started`.

### OQ-I (NEW May 13): Shape detection vs generic walker — keep, or revisit when the adapter is refactored?
D-033's compromise: `compileFlow` uses shape detection (4 branches: solo, brokered ± synthesis, rounds-audit) to emit matching v1 node ids so the adapter and `resolveAuditChain` continue working. This pragmatically weakens the "engine has zero branches" architectural ideal. A future PR could rewrite `compileFlow` as a generic walker that emits round-id-namespaced node ids (e.g. `round-{id}-{agent}` instead of `reviewer-{agent}`) — but the adapter and route handler would need updating in lockstep. Decide when the adapter refactor (OQ-H) happens.

---

## Calibration notes

Things to remember when working on Vāda. These shape how decisions get made.

### The manual workflow is the empirical reference, not theoretical thinking
When making product decisions, the question to ask is: "what does the manual workflow do?" If a proposed feature adds something not present in the manual workflow, the question becomes "do we have validation that this adds value?" If not, it's theory and should be parked or held as research.

### Refactor only after seeing what should be parameterized
Building the wrong thing first is necessary to see what the right thing should look like. Don't pre-optimize architecture before having concrete examples. The YAML refactor only made sense once we had 4+ concrete modes to compare. Pre-V1 YAML design would have been speculative.

### Files are immutable; iterate by forking
Once a YAML has benchmark history, do not modify it. Fork to a new file with a new id. Benchmark history accumulates per file as historical record. This enables clean comparison across configurations and prevents data corruption from "we changed the prompt mid-way."

### Synthesis is the product
Reviewer responses are inputs to the product. The synthesized output (convergence, divergence, proposal) is what the user actually receives. Optimize for synthesis quality.

### Engine supports anything
The engine has zero branches on workflow type at the schema layer (v2 collapses all shapes into rounds). The compiler still contains shape detection for v1 node-id compatibility — see OQ-I. Whatever YAML configuration is expressible should be runnable. Even one agent is deliberation.

### Verify scripts are not runtime verification
The Phase A verify scripts passed while both runtime YAML-loading paths were broken. Scripts compute their own paths; they don't exercise the runtime loading code that the web server and MCP server use. When fixing a runtime bug, verify by running the actual runtime (or a script that calls through the same code path), not by running scripts that bypass it.

### Dynamic YAML discovery prevents registry drift
The MCP server's static `SPECS` object required a manual code change for every new YAML. The engine's `readdirSync`-based `listPublicSpecs()` auto-discovers new files. When two parts of the system maintain separate registries of the same catalog, they will drift. Delegate to the authoritative source.

### Hardcoded fallbacks mask misconfiguration — fail loud
`.default('crucible-v1')` on the Zod schema for `specId` silently resolved bad requests to a hardcoded team. Removing it surfaces the true failure mode. Default values in routing layers hide bugs upstream; prefer 400 errors over opaque defaults.

### Don't add version suffixes before you have a fork
All 7 initial YAMLs were named with `-v1` but none had a `-v2` comparison to justify the suffix. Premature versioning creates churn (renaming at fork time) and implies a multi-version history that doesn't exist. Add numeric suffixes only when an actual fork exists.

### import.meta.url is the correct path anchor for library files
`process.cwd()` resolves relative to whatever process started the server — different for dev, prod, and scripts. `import.meta.url` resolves relative to the file itself, which is stable across all contexts. Any library file that needs to reference sibling assets should anchor on `import.meta.url`.

### customVars Handlebars rendering enables no-code YAML parameterization
`{{variable}}` placeholders in YAML `system_prompt` fields are rendered at runtime against `customVars`. This lets a single YAML express parameterizable behavior (domain, context, role) without code changes. The Domain Expert pattern — injecting `{{domain}}` into the system prompt — is the canonical use case.

### UX coherence walkthrough must precede architectural lock
"What does the user click? What does it mean? What state do they end up in?" — should have killed the two-store sync architecture immediately if asked when the hosted MCP architecture was first locked. Cost: a sync bug surfaced within minutes of feature use, multiple review rounds, and an architectural reversal (vada-decisions.md D-028) within the same week.

### SHA-256 + unique index is the right hash mechanism for high-entropy bearer tokens
bcrypt's per-request CPU cost is unjustified when the token has 256 bits of randomness and the lookup uses an indexed unique constraint. The hosted MCP API key path uses SHA-256 hex digest with `api_keys.key_hash` unique-indexed.

### Sycophancy at architectural decision points is dangerous
Reflexive flipping when challenged is as bad as defending a wrong choice. The right answer requires reasoning, not capitulation. Multiple challenges across the May 4 debugging marathon required pushing past the temptation to immediately reverse course.

### Pragmatic weakenings are not failures — they need to be honestly captured
D-033's intent was "engine has zero branches on workflow type." In practice, `compileFlow` keeps 4 shape-detection branches for v1 node-id compatibility. This is a deliberate pragmatic choice (the adapter and route handler depend on the v1 ids) but it materially differs from the ideal. Capture both the ideal and the pragmatic outcome in the decision log so future contributors understand what was traded and why.

### "Fix the entire stack" beats "leave it for a follow-up PR"
PR #47 originally proposed a backwards-compat shim (`compileSpec = compileFlow`-with-aliasing) so the route handler and MCP could merge unchanged, with consumer updates deferred. The Principal rejected the shim and demanded full consumer migration in the same PR. The result was a heavier PR (60 files) but a fully consistent codebase. Half-merged refactors compound; full migrations close the loop cleanly even when large.

---

## File locations

Core architectural documents (read these first in a new session):
- `apps/vada-ai/specs/vada-state.md` (this document)
- `apps/vada-ai/specs/vada-product-recognitions.md`
- `apps/vada-ai/specs/vada-decisions.md`
- `apps/vada-ai/specs/vada-yaml-immutability-principle.md`
- `apps/vada-ai/specs/generic-flow-refactor.md` — D-033 design document

Existing canonical docs:
- `apps/vada-ai/specs/vada-product-spec.md` — full product positioning
- `apps/vada-ai/specs/vada-science-of-deliberation.md` — foundational theory
- `apps/vada-ai/specs/yaml-schema-reference.md` — YAML schema definitive reference (v2)
- `apps/vada-ai/specs/vada-teams-catalog/` — `vada__consult` reviewer-chain specs (some still reference v1 framing — flagged for separate cleanup pass)

Ecosystem-level docs (for the wider AttaLabs framing, not Vāda-internal):
- `apps/atta-ai/specs/atta-naming-decision.md` — v2 brand architecture (AttaLabs vs Atta)
- `apps/atta-ai/specs/atta-ecosystem-vision.md` — strategic positioning
- `aeg-project/state.md` — current state across all products

Skills (`.claude/skills/`):
- `vada-architecture/SKILL.md` — architecture master reference
- `vada-yaml-authoring/SKILL.md` — how to create YAML specs
- `vada-mcp-server/SKILL.md` — MCP server implementation
- `atta-engine/SKILL.md` — engine internals

YAMLs:
- `packages/agents/vada-deliberation/yamls/` — all deliberation specs (9 files, all `schema_version: "2.0"`)

---

## How to update this document

This is a living document. Update it at major milestones. Specifically:

- When a phase completes, move it from "What's next" or "What's in flight" to "What's complete"
- When a new phase starts, move it from "What's next" to "What's in flight"
- When new architectural recognitions emerge, add them or note them in calibration
- When open questions get resolved, move them to a "resolved" section or delete them
- Update the "Last updated" date and milestone at the top

The goal is for this document to always answer "what is the current state of Vāda?" in under 5 minutes of reading.
