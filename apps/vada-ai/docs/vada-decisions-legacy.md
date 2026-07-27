# Vāda decisions — legacy archive (frozen 2026-07-27)

**History, not machinery.** No check reads this file. No gate requires an entry.
It is kept because `D-###` citations across code, specs and skills resolve here.

Do not add entries. A decision that still binds belongs in the spec for the
surface it governs, where a doc-ownership binding keeps it current. A decision
about one change belongs in that change's pull request.

---

# Vāda — Architectural Decision Log

**Status:** ratified

**Purpose:** Capture WHY architectural decisions were made, not just what was decided. Future contributors (human or AI) can understand the reasoning rather than re-deriving it.

---

## D-001: LangGraph as sole deliberation execution path

**Date:** February 2026 (Phase 1)
**Status:** Active
**Type:** 1

**Decision:** Remove Mastra entirely. LangGraph is the sole deliberation execution path.

**Alternatives considered:**
- Keep Mastra alongside LangGraph during transition
- Migrate gradually with feature flags
- Stay on Mastra, fix its limitations

**Rationale:** Mastra had limitations on parallel execution, state management, and cognitive routing that were blocking. Maintaining two execution paths in parallel doubled the complexity of every feature. A clean cutover was less work than gradual migration.

**Consequences:**
- All deliberation flows are LangGraph graphs
- `@atta/orchestration` package deleted
- Future flow logic relies on LangGraph primitives

---

## D-002: `@atta` vs `@vada` package namespace split

**Date:** February 2026 (Phase 2)
**Status:** Active
**Type:** 1

**Decision:** Generic deliberation primitives live under `@atta` (engine, agents, adapter-langgraph). Vāda-specific configurations live under `@vada` and inside `apps/vada-ai/`.

**Alternatives considered:**
- All packages under `@vada`
- All packages under `@atta`
- Per-product namespaces (e.g., `@vada-ai`)

**Rationale:** Atta is the broader ecosystem; Vāda is one product within it. Separating engine primitives from product-specific configurations enables Atta to support other products (Vitakka, etc.) without coupling them to Vāda's deliberation patterns.

**Consequences:**
- `@atta/engine` is product-neutral
- `@vada/agents`, `@vada/teams` (now deleted in D-013), `@vada/mcp-server` are Vāda-specific
- Cross-product reuse is intentional and explicit

---

## D-003: Brokered as a separate workflow type alongside Rounds

**Date:** March 2026 (Phase 4)
**Status:** Superseded by D-013
**Type:** 1

**Decision:** Add `BrokeredWorkflow` as a discriminated union variant alongside `RoundsWorkflow` and `SoloWorkflow`. Implement `compileBrokered` as a dedicated compiler.

**Alternatives considered:**
- Treat Brokered as a degenerate case of Rounds (count=1, no audit, no synthesis)
- Build Brokered outside the engine entirely (in MCP layer)

**Rationale:** Brokered's lack of synthesis and lack of audit made forcing it into Rounds awkward. A dedicated type was clearer.

**Consequences:**
- Engine type system gained a third workflow variant
- `compileBrokered` produces a different graph shape
- Adapter required a brokered-specific branch

**Superseded by D-013:** When the engine became YAML-driven, Workflow types became unnecessary. Brokered becomes a YAML configuration, not a TypeScript type.

---

## D-004: Caller Claude owns synthesis (not Vāda)

**Date:** March 2026 (early Phase 4 / Phase 5)
**Status:** Reversed by D-016
**Type:** 1

**Decision:** Synthesis lives outside Vāda. Caller Claude (the AI agent invoking Vāda via MCP) reads reviewer responses and synthesizes them for the user. Vāda's responsibility ends at returning reviewer responses.

**Alternatives considered:**
- Vāda runs a synthesizer agent and returns synthesized output
- Hybrid: Vāda runs basic synthesis, Caller Claude can augment

**Rationale at the time:** Caller Claude has the user's conversation context. Vāda doesn't. Therefore Caller Claude is best positioned to produce a synthesis that reflects the user's specific situation.

**Consequences:**
- Brokered V1 ships without engine-level synthesis
- Tool description instructs Caller Claude on how to synthesize (~1200 words of guidance)
- Benchmark cannot measure Vāda's actual deliverable (the synthesis happens outside Vāda)

**Reversed by D-016:** Phase 6.7 smoke tests revealed this decision created a structural measurement problem and put inconsistent quality outside Vāda's control. Synthesis becomes a Vāda responsibility.

---

## D-005: 4-round Crucible / 3-round Sparring with dual audit

**Date:** February 2026 (carried from Mastra-era design)
**Status:** Active for current Crucible/Sparring YAMLs
**Type:** 1

**Decision:** Crucible runs 3 rounds with 4 agents (Strategist, Critic, Devil's Advocate, Synthesizer). Sparring runs 3 rounds with 2 agents (Strategist, Critic). Both have BlindCritic + FactChecker dual audit with revision.

**Alternatives considered:**
- Variable round counts (terminate when convergence detected)
- Different audit configurations per mode
- Single auditor

**Rationale:** Empirically tuned via manual experimentation. 3 rounds was enough for substantive deliberation; more produced diminishing returns. Dual audit (one verifying logic without transcript, one verifying facts via web search) caught complementary failure modes.

**Consequences:**
- These configurations are crystallized as YAML (`crucible-v1.yaml`, `sparring-v1.yaml`) per D-013
- Future variations are forks (`crucible-v2.yaml` etc.) per D-018

---

## D-006: Domain Expert as flag-gated experimental fourth reviewer

**Date:** April 2026 (Phase 6)
**Status:** Active (parked configuration)
**Type:** 1

**Decision:** Add a Domain Expert reviewer to Brokered (`brokered-quartet`), gated by `VADA_DOMAIN_EXPERT` environment flag. Domain Expert receives a `domain` parameter that gets injected into its system prompt.

**Alternatives considered:**
- Don't ship Domain Expert until validated
- Make Domain Expert always-on
- Make Domain Expert a separate mode entirely

**Rationale:** Domain expertise was an obvious gap in Brokered V1's three-reviewer team. Flag-gating allowed shipping without committing to a default behavior. Caller Claude could opt in when domain context was clearly relevant.

**Consequences:**
- `brokered-quartet-v1.yaml` ships in Phase 7.2 with `experimental: true`
- `consult.ts` checks the env flag and adds Domain Expert when enabled
- The `{{domain}}` variable in Domain Expert's system prompt is currently injected via the `createDomainExpert` factory (not via YAML rendering — see OQ-D in `vada-state.md`)

---

## D-007: Reviewer prompt rewrite — remove "multi-round deliberation" instruction

**Date:** April 25, 2026 (Phase 6.7)
**Status:** Active
**Type:** 1

**Decision:** Rewrite Strategist, Critic, and Devil's Advocate prompts to remove instructions written for multi-round deliberation. Add explicit single-shot framing, structured output constraints, length constraints, and decisiveness mandates.

**Alternatives considered:**
- Keep prompts as written, accept that they were misaligned
- Less aggressive rewrite (smaller surgical fixes)
- Wait until real-case Brokered is built and rewrite for that

**Rationale:** Three reviewer rounds (using Vāda-pattern manual deliberation with external reviewers) confirmed the original prompts were written assuming reviewers would see each other and refine across rounds. In Brokered V1, reviewers run independently with no cross-visibility. The prompts were not just suboptimal; they were architecturally wrong for the context.

**Consequences:**
- Brokered prompts in `brokered-trio-v1.yaml` and related YAMLs reflect single-shot context
- 300-500 word soft limits on responses
- Path A / Path B structure for Devil's Advocate
- Forced 5-section structure for Strategist
- Critic gets explicit "stay silent if no fatal flaws" clause

---

## D-008: Benchmark judge prompt restructure — five new criteria

**Date:** April 25, 2026 (Phase 6.7)
**Status:** Active
**Type:** 1

**Decision:** Replace original judge criteria (alternatives_considered, assumptions_surfaced, actionable_specificity, confidence_calibration, reviewer_divergence) with five new criteria: assumption_surfacing, actionable_specificity, confidence_calibration, frame_quality, length_efficiency.

**Alternatives considered:**
- Add new criteria alongside originals (10 criteria total)
- Keep originals and add scoring modifiers
- Drop the judge entirely and rely on aggregate scores from external models

**Rationale:** The original `reviewer_divergence` criterion was applicable to brokered but not to baselines, breaking comparability. `alternatives_considered` and `assumptions_surfaced` had significant overlap. The new set: clearer anchors, no overlap, comparable across modes, captures length-efficiency which the original set ignored.

**Consequences:**
- Pre-April 25 benchmark scores not directly comparable to post-April 25 scores (different criteria)
- Aggregate scores reflect the new five criteria
- `length_efficiency` exposes a structural weakness in raw-transcript-based output (see D-016)

---

## D-009: YAML schema design — investigation only before implementation

**Date:** April 25, 2026 (Phase 7.1)
**Status:** Active
**Type:** 1

**Decision:** Phase 7.1 produces a design document only. No code changes. Sonnet investigates current code, proposes YAML schema, drafts example YAMLs, surfaces open questions for Principal review before any implementation begins.

**Alternatives considered:**
- Implement and refine in parallel
- Skip investigation and go directly to implementation
- Multi-pass design with Sonnet iterating on its own

**Rationale:** A schema is a contract. Implementing against a not-yet-finalized schema locks in choices that should be deliberate. Investigation surfaces what the schema needs to express; only then can we design it cleanly.

**Consequences:**
- Phase 7.1 took one investigation cycle, not multiple
- Schema design captured 9 open questions; 5 resolved by Principal, 4 deferred
- Phase 7.2 implementation was mechanical because schema was settled

---

## D-010: YAML refactor as single cutover, no parallel migration

**Date:** April 25, 2026 (Phase 7.2 design)
**Status:** Active
**Type:** 1

**Decision:** The YAML refactor lands as a single transition (split into Phase A "YAML alongside TypeScript" and Phase B "delete TypeScript"). No long-running parallel migration where old and new exist for weeks.

**Alternatives considered:**
- Gradual migration with feature flags
- Migrate one mode at a time over multiple PRs
- Two-phase but with weeks between phases

**Rationale:** Parallel old/new code paths multiply the maintenance burden of every change. Long migrations bit-rot. A clean two-phase cutover (Phase A enables YAML alongside, behaviorally verifies, then Phase B deletes) is the smallest reversible step that produces a clean end state.

**Consequences:**
- Phase A has 10 commits, Phase B has 5+ commits, all in a tight timeframe
- Behavioral verification gate between Phase A and Phase B catches divergence before deletion
- Final state has no parallel code paths

---

## D-011: All deliberation configuration in YAML — engine has zero branches on workflow type

**Date:** April 25, 2026 (Phase 7.1 / 7.2)
**Status:** Active
**Type:** 1

**Decision:** The engine has no code branches on workflow type, mode, or configuration shape. Every variation between deliberations is expressed in YAML and processed identically by the engine.

**Alternatives considered:**
- Engine has a small set of supported "kinds" (rounds, brokered, custom) with clean abstraction
- Engine reads YAML but compiles to discriminated unions internally
- Hybrid: YAML for content, code for flow control

**Rationale:** Discriminated unions accumulate. Every new deliberation pattern requires an engine code change. A truly mode-agnostic engine treats any YAML as data and runs whatever the data says. This is the architectural commitment that makes "Vāda is a runtime" real (Recognition 1 in `vada-product-recognitions.md`).

**Consequences:**
- 30+ branches in engine, adapter, and consumers were eliminated in Phase 7.2
- New deliberation patterns are YAML files, not code changes
- Engine code is smaller and more uniform

---

## D-012: Single-agent YAMLs use the same schema as multi-agent

**Date:** April 25, 2026 (Phase 7.1 OQ-1)
**Status:** Active
**Type:** 1

**Decision:** Single-agent flows (A0, A1 baselines) use the standard YAML schema. No special "single-agent shorthand" syntax.

**Alternatives considered:**
- Add `flow.single_agent: AgentRef` shorthand to schema
- Different file format for baselines
- Treat baselines as code rather than YAML

**Rationale:** Principal directive: engine must support anything. Even one agent is deliberation. Adding special syntax for "small" cases creates two paths for what's conceptually the same thing. Whatever the YAML says, the engine runs.

**Consequences:**
- A0 and A1 baselines are full YAML files with a single agent
- Engine treats them identically to multi-agent flows
- Future single-agent variations are just more YAMLs

---

## D-013: Delete `@vada/teams` package entirely

**Date:** April 25, 2026 (Phase 7.2 Phase B)
**Status:** Active
**Type:** 1

**Decision:** The `@vada/teams` package is deleted. Team configurations become YAML files. The package's role (defining `Team` objects with workflow + agents) is replaced by `DeliberationSpec` YAML files loaded at runtime.

**Alternatives considered:**
- Keep `@vada/teams` as a thin package containing only YAML loading utilities
- Move YAML files into `@vada/teams` to preserve the package
- Keep YAML files separate but also keep TypeScript team definitions

**Rationale:** The package's only role was to define teams. Once teams live in YAML, the package has no contents. Keeping an empty package adds no value and creates confusion ("why is `@vada/teams` here if it has nothing in it?"). Delete it.

**Consequences:**
- Workspace package count decreases by one (from 19 to 18 typecheck targets)
- `@vada/teams` references in imports are removed across the codebase
- Teams are no longer a code concept; they're a YAML concept

---

## D-014: Delete `CustomWorkflow` and `compileCustom`

**Date:** April 25, 2026 (Phase 7.2 OQ-6)
**Status:** Active
**Type:** 1

**Decision:** Delete `CustomWorkflow` type and `compileCustom` compiler. They are dead code — no team currently uses them.

**Alternatives considered:**
- Keep them in case future flows need them
- Move them to a `legacy/` directory
- Replace with YAML equivalent

**Rationale:** Dead code is unmaintained code. If a future flow needs custom step sequencing, that flow can be expressed in YAML (rounds count=1 with arbitrary agents, or a future YAML feature for explicit step ordering).

**Consequences:**
- Engine type system simpler
- Code surface area reduced
- "Custom workflows" is no longer a dimension

---

## D-015: Replace `workflowType` field with `specId` in Plan

**Date:** April 25, 2026 (Phase 7.2 OQ-5)
**Status:** Active
**Type:** 1

**Decision:** The `Plan` interface no longer has a `workflowType` field. It has a `specId` field that uniquely identifies the YAML the plan was compiled from.

**Alternatives considered:**
- Keep `workflowType` for backwards compatibility with the dashboard
- Have both `workflowType` and `specId`
- Migrate gradually

**Rationale:** `workflowType` was a leaky abstraction — it told consumers what category of workflow this was, but in a YAML world, every plan is just "a plan compiled from a YAML." The category is encoded in the YAML's structure, not in a top-level type discriminator. `specId` (the YAML's identity) is the canonical reference.

**Consequences:**
- Database schema migration to use `spec_id` instead of `workflow_type`
- Existing session records backfilled
- Dashboard updated to read `spec_id`
- Single cutover commit included this change (no parallel paths)

---

## D-016: Synthesis becomes a Vāda responsibility (reverses D-004)

**Date:** April 25, 2026 (Phase 6.7 / Phase 7.2 recognition)
**Status:** Active (implementation deferred to Phase 8)
**Type:** 1

**Decision:** Synthesis is not delegated to Caller Claude. It is produced by Vāda's engine. Every deliberation YAML must specify a synthesizer configuration. The synthesizer is an engine-level agent that produces structured synthesis output (convergence, divergence, new ideas, gaps, proposed solution).

**Alternatives considered:**
- Keep D-004 (Caller Claude owns synthesis)
- Hybrid: Vāda produces baseline synthesis, Caller Claude augments
- Make synthesis optional per-YAML

**Rationale:** D-004 was made when "what is Vāda's deliverable" was less clear. Phase 6.7's smoke test made clear that synthesis IS the deliverable — without it, Vāda returns inputs, not outputs. The benchmark could not measure Vāda's actual product because the product was being produced outside Vāda. Recognition 2 in `vada-product-recognitions.md` captures the reasoning.

The hybrid option (Vāda + Caller Claude both synthesize) is structurally allowed but not architecturally privileged. Caller Claude can augment Vāda's synthesis with conversation context if useful.

**Consequences:**
- Phase 8 implements synthesizer as engine-level concept
- All YAMLs gain a mandatory synthesizer configuration
- Synthesizer prompt becomes core IP (alongside reviewer prompts)
- Benchmark redesign (Phase 10) measures synthesizer output

---

## D-017: MCP receives full YAML content per call, not references

**Date:** April 25, 2026 (Phase 7.2 OQ-4)
**Status:** Active
**Type:** 1

**Decision:** When invoking the MCP, consumers pass the full YAML content (the file's text) along with the question. Not just a YAML file ID or registry reference.

**Alternatives considered:**
- Pass a YAML id; Vāda looks up content from a registry
- Pre-register YAMLs at MCP startup (which Vāda does, but consumers can also pass new YAMLs)
- Hybrid: registry for known YAMLs, full content for ad-hoc

**Rationale:** Full-content mode means consumers don't need Vāda to know about their YAMLs in advance. A consumer can develop a custom YAML, hand it to Vāda, and run a deliberation — all without registering anything centrally. This is what makes Vāda a runtime that any application can extend, rather than a closed catalog. Recognition 1 in `vada-product-recognitions.md` depends on this.

The registry-based shortcut still exists for Vāda's own UI surfaces (vada.ai web app, MCP tool defaults) — they can refer to bundled YAMLs by ID. But the underlying capability is full-content.

**Consequences:**
- MCP tool signature accepts a YAML string parameter
- Vāda validates and compiles any well-formed YAML
- Consumer ecosystem can develop YAMLs without Vāda's involvement
- A side effect: cost calculator UI (Phase 11) operates on YAML content directly

---

## D-018: YAMLs are immutable once benchmarked; iterate by forking

**Date:** April 25, 2026 (Phase 7.2 architectural recognition)
**Status:** Superseded by D-025 (naming convention only; core immutability intent retained)
**Type:** 1

**Decision:** Once a YAML file has accumulated benchmark run data, it is treated as immutable. Iteration on the configuration happens by forking — copying the file to a new file with a new `id`, modifying the copy, and benchmarking the new version. Both versions remain in the repository.

**Alternatives considered:**
- Standard semver versioning (v1.0.0, v1.0.1) within a single file
- Git-based versioning (rely on git history)
- Database-backed versioning with a YAML registry

**Rationale:** Benchmark data is only meaningful if it links to a precise configuration. Modifying a YAML in place corrupts benchmark history — runs from before and after the change get averaged together as if they were the same configuration. Forking creates a clean separation: each YAML file is a single, immutable configuration with its own benchmark history. Recognition 5 in `vada-product-recognitions.md` and the dedicated principle document `vada-yaml-immutability-principle.md` expand on this.

**Consequences:**
- YAML naming convention: `{name}-v{N}.yaml` (e.g., `crucible-v1.yaml`)
- Each YAML has a unique `id` field matching its filename
- Benchmark records reference the full YAML id
- A `benchmarked: true` flag (in YAML metadata) marks files that should not be modified
- The catalog grows over time; old YAMLs are historical records, not deletable
- "Versioning" is data, not code

**Superseded by D-025:** The `-v1` naming convention was dropped in Phase 7.3. The core immutability principle (don't modify benchmarked YAMLs) remains active. See D-025.

---

## D-019: Phase B documentation hygiene caught via three-list audit

**Date:** April 25, 2026 (Phase 7.2 Phase B)
**Status:** Active (process pattern, not architectural decision)
**Type:** 1

**Decision:** After major refactors, run an explicit three-list audit before committing documentation: (1) files modified in this phase, (2) all documentation in the repo, (3) cross-reference marking each as TOUCHED / STALE / CURRENT / UNKNOWN.

**Alternatives considered:**
- Trust the executor (Sonnet) to identify all stale docs
- Defer doc cleanup to a separate phase
- Skip auditing and rely on developers noticing stale docs over time

**Rationale:** The Phase B execution touched 11 files. The audit caught 9 additional stale items that the executor had not surfaced. This is the same pattern Phase 2.5 documented months earlier: mechanical refactors create documentation debt that's invisible until audited. Without the audit, the post-Phase-B repo state would have shipped with stale specs and READMEs describing deleted code.

**Consequences:**
- Documentation hygiene becomes a standard step in any major refactor phase
- Worth capturing as a skill (potentially `documentation-hygiene/SKILL.md` in future)
- Adds time to each phase but prevents long-term doc rot

---

## D-020 — Shared YAML catalog loader in `@atta/engine`

**Date:** April 26, 2026
**Status:** Active
**Type:** 1
**Area:** Engine — YAML loading

**Decision summary:** Extract `loadYamlFromCatalog(id)` into `@atta/engine` as the single shared entry point for loading deliberation specs from the catalog directory. All callers (web route, MCP server, verify scripts) use this function rather than computing catalog paths themselves.

**Alternatives considered:**
- Keep per-caller path computation (status quo) — each caller continued to resolve the path to `apps/vada-ai/yamls/` independently
- Separate `@vada/catalog` package — dedicated package for YAML loading; rejected as over-modular for one function
- Environment variable injection only — have callers receive the catalog path via env var; rejected because it moves the burden to deployment config rather than code

**Rationale:** Two of three callers had independently broken path computation: the web route used `process.cwd()` (resolves to `apps/vada-ai/web/` in dev), the MCP spec-registry used the wrong `../../../yamls` depth (resolved to `apps/yamls/`). Only the verify scripts worked, but they bypass the runtime loading code entirely. The correct path anchor is `import.meta.url` relative to the engine source file — this resolves correctly in dev, production build, and Bun scripts. Centralizing the function ensures that all callers benefit from the correct implementation and that future path changes require one edit.

**Consequences:**
- Any caller that needs to load a YAML spec imports `loadYamlFromCatalog` from `@atta/engine`
- `VADA_YAMLS_DIR` env var available for production path override (evaluated at call time, not module init)
- Verify scripts that computed their own paths are now using the shared function — script verification and runtime verification exercise the same code path
- D-017 (no privileged path between web app and MCP) is reinforced: the catalog loader is the concrete code artifact that implements the principle

---

## D-021: Agent-metadata package collapsed into web app visuals

**Date:** April 26, 2026
**Status:** Active
**Type:** 1
**Area:** Package architecture

**Decision summary:** The `@vada/agent-metadata` package (display-only metadata for agent visual rendering) was deleted and its types moved directly into `apps/vada-ai/web/src/components/agents/visuals/`.

**Alternatives considered:**
- Keep as a separate package — over-modular for display-only types with a single consumer
- Merge into `@atta/ui` — wrong home; Vāda-specific display config doesn't belong in a shared UI library

**Rationale:** The types had one consumer: the web app's rendering layer. A standalone package for a handful of type definitions added workspace overhead without adding abstraction value.

**Consequences:**
- `@vada/agents` / `@vada/agent-metadata` workspace package deleted
- Display types colocated with the component that uses them
- `apps/vada-ai/web/src/components/agents/visuals/` is the new canonical location

---

## D-022: MCP spec-registry rewritten from static SPECS object to dynamic discovery

**Date:** April 26, 2026
**Status:** Active
**Type:** 1
**Area:** MCP server — spec loading

**Decision summary:** `apps/vada-ai/mcp-server/src/spec-registry.ts` no longer maintains a static `SPECS` record. `listPublicSpecs()` delegates to `@atta/engine`'s `listPublicSpecs()` (which uses `readdirSync`). `lookupSpec(id)` calls `loadYamlFromCatalog(id)` on demand. ALIASES remain for short-name UX.

**Alternatives considered:**
- Keep static SPECS (existing behavior) — drift-prone; adding a YAML requires a code change
- Move ALIASES into YAML front-matter — rejected; aliases are MCP UX configuration, not authoring concern

**Rationale:** The engine already used `readdirSync` for auto-discovery. The static SPECS record in the MCP server was a second source of truth that would inevitably drift. Any new YAML required both a file creation and a code change.

**Consequences:**
- `validateAllSpecs()` at startup catches malformed YAMLs (fail-fast)
- ALIASES (`a0`, `a1`) are the only explicit registry; all other IDs are discovered from the filesystem
- MCP tool descriptions are generated from the actual live catalog

---

## D-023: Hardcoded spec fallbacks removed — missing specId is an explicit error

**Date:** April 26, 2026
**Status:** Active
**Type:** 1
**Area:** Web app — deliberation routing

**Decision summary:** Three callsites previously fell back to `'crucible-v1'` when `specId` was absent. All now fail explicitly: `useDeliberateForm` throws if no specs are available at initialization; `/deliberation/start` returns 400 if `specId` is not provided; `/workflow/run` throws if `session.specId` is null.

**Alternatives considered:**
- Keep defaults for backward compatibility with old sessions (handled by Drizzle migration instead)
- Use the first spec alphabetically as a default (still a hidden assumption)

**Rationale:** Hardcoded fallbacks mask misconfiguration. A missing specId means something went wrong earlier in the flow. Explicit failures surface bugs at the point of failure, not downstream.

**Consequences:**
- Pre-migration sessions with null `specId` would error on resume; addressed by D-024 migration
- No implicit "default team" concept in the routing layer

---

## D-024: Drizzle data migration strips -v1 from sessions.spec_id

**Date:** April 26, 2026
**Status:** Active
**Type:** 1
**Area:** Database — sessions table

**Decision summary:** A data-only Drizzle migration (`0015_spec_id_backfill.sql`) strips `-v1` suffixes from existing `sessions.spec_id` values: `UPDATE "sessions" SET "spec_id" = REPLACE("spec_id", '-v1', '') WHERE "spec_id" LIKE '%-v1'`.

**Alternatives considered:**
- Leave old sessions with -v1 spec IDs (they would 404 on resume after YAML rename)
- Lazy migration on first access (inconsistent state during rollout window)

**Rationale:** Immediate backfill is deterministic and safe. All `-v1` IDs map cleanly to the new unsuffixed IDs. No ambiguity; migration is idempotent.

**Consequences:**
- Old sessions resume correctly with new YAML filenames
- One-time migration; idempotent on re-run

---

## D-025: Catalog versioning dropped; immutability principle scoped to benchmarked YAMLs

**Date:** April 26, 2026
**Status:** Active (supersedes D-018's naming convention; retains its core immutability intent)
**Type:** 1
**Area:** YAML catalog conventions

**Decision summary:** The `-v1` / `-vN` suffix naming convention is dropped. YAML files are named semantically without version suffixes (e.g., `crucible.yaml`, not `crucible-v1.yaml`). Iteration by forking remains correct for benchmarked YAMLs, but the forked name is chosen by the author and need not use numeric suffixes.

**Alternatives considered:**
- Keep `-v1` suffix as default starter name — adds churn at fork time and implies a multi-version history that doesn't exist yet
- Use date-based names (e.g., `crucible-2026-04.yaml`) — harder to read in tool descriptions
- Use git tags for versioning — no filename artifact; consumers need git access to discover history

**Rationale:** Phase 7.3 revealed the naming convention was speculative. All 7 YAMLs carried `-v1` suffixes with no corresponding `-v2` in sight. The convention added visual noise without adding value. Adding a version suffix before an actual fork exists implies a comparison that doesn't exist.

**Note (May 13, 2026):** This entry is the Vāda-internal D-025. The global `decisions.md` D-025 is the v2 naming framing (AttaLabs vs Atta). Same number, different logs — disambiguate references by naming the log.

**Consequences:**
- All 7 YAML files renamed to drop `-v1` (e.g., `crucible.yaml`, `sparring.yaml`)
- YAML `id` fields updated to match filenames
- Drizzle migration backfills `sessions.spec_id` (D-024)
- `vada-yaml-immutability-principle.md` naming section superseded; core principle (don't modify benchmarked YAMLs) remains
- Recognition 5 in `vada-product-recognitions.md` notes this update

---

## D-026: Consumers receive both structured and rendered synthesis output

**Date:** April 26, 2026
**Status:** Active
**Type:** 1
**Area:** MCP tool API, web app SSE, database persistence

**Decision summary:** When a Vāda spec declares synthesis with `output_format: structured`, both consumers (MCP `vada__deliberate`, web app SSE/database) receive both the rendered text content and the parsed JSON structured field. The consumer chooses how to use each.

**Alternatives considered:**
- Per-YAML response envelope declaration controlling what gets returned — adds configuration burden to YAML authors for no gain; consumer can already ignore fields it doesn't need
- Return only the structured form when available — rendered text is needed for non-machine readers and as a fallback
- Re-synthesize at the consumer — discards engine work, produces inconsistency between consumers
- Caller Claude synthesizes from transcript (original brokered model) — works for brokered, but deliberation specs already produce synthesis as a first-class engine output

**Rationale:** The engine produces both fields naturally as part of the existing synthesis pipeline (AgentOutput.content for text, AgentOutput.structured for parsed JSON). The gap was solely at the consumer boundary where both fields were dropped. Surfacing both lets each consumer choose without adding configuration burden to YAML authors. Caller Claude (or any other consumer) has more context about how to present output than the engine does.

**Consequences:**
- Existing callers reading only `content` continue to work — `structured` is an additive field
- New callers can build on the structured form without parsing rendered text
- The web app's deliberation viewer becomes able to render structured fields with proper UI (follow-up work; Phase 8.5 scope)
- For specs without output_schema (a0-baseline, brokered), `structured` is null; consumers must handle this case
- Resolves OQ-A (caller decides per-call how to augment) and OQ-B (per-YAML choice; engine surfaces both text and structured)
- Schema validation enforces: if synthesis agent has `output_format: structured`, it must have `output_schema`; declaring `output_schema` without `output_format: structured` is rejected

---

## D-027: Unified team agent model storage — single localStorage key for all team types

**Date:** May 5, 2026
**Status:** Active
**Type:** 1

**Decision summary:** All team configurations (Reviewers, Sparring, Crucible, War Room, and any future team) use a single localStorage key format: `vada:team:<specId>` → `Record<agentName, string>`. The value maps each agent name to its modelId. There is no distinction in storage between editable reviewer-chain teams and non-editable role-based teams.

**Alternatives considered:**
- Two separate keys: `vada:reviewer-models:<specId>` (per-agent config) and `vada:team-model:<specId>` (global selection) — was the previous implementation; required divergent code paths per team type
- Three keys with a type discriminator — adds encoding overhead for no readability gain
- DB persistence for selected models — was briefly in place (`userTeamModels` table) but caused a regression where stale DB entries always overrode localStorage selections (see below); removed in favour of client-only persistence

**Rationale:** From the YAML's perspective, every team is the same structure — a list of agents with names. The distinction between "editable" and "non-editable" is a UI hint (whether to show the ReviewerConfigModal vs. the GlobalModelSelector), not a data distinction. Both UIs should write the same format to the same location. `resolveModel` then has a single read path (`teamConfig?.[agentName]`) with no branching on team type.

The DB-backed `userTeamModels` table was removed because it caused a revert-to-Claude bug: the DB rows (seeded before the Teams tab was removed) had priority in the seeding effect, overriding whatever the user had picked in localStorage on every page refresh.

**Consequences:**
- `STORAGE_KEY_PREFIX` in `reviewer-models.ts` changed from `'vada:reviewer-models:'` to `'vada:team:'`; all other functions unchanged
- `useGlobalModelSelector` reads/writes via `getReviewerConfig`/`setReviewerConfig` instead of its own key/format; `specAgentNames` prop added so the global picker writes all agent names when the user picks one model
- `resolveModel` in `DeliberatePanel` collapses from a conditional expression to one line: `teamConfig?.[a.name] ?? undefined`
- DB `getUserTeamModels` query no longer called from the deliberate page; one fewer DB round-trip on page load
- Adding a new team type in the future requires no storage layer changes — it inherits the unified key automatically

---

## D-028: Server-side as canonical key store; IndexedDB demoted from key-storage role

**Date:** May 4, 2026 (PR #13, `refactor/single-source-keys`)
**Status:** Active
**Type:** 1

**Decision summary:** Server-side `user_provider_keys` table (envelope-encrypted at rest) is the single canonical store for user provider API keys. Browser-side IndexedDB-via-passkey is no longer the canonical store; `@atta/identity` is no longer responsible for storing provider keys. Both UI surfaces (Settings → API Keys; the `/deliberate` model picker's inline key dialog) read and write the same server-side store via `POST /api/keys/provider`. This reverses the "two stores with sync" architecture briefly in place earlier in the same week.

**Alternatives considered:**
- Keep two stores with sync (the architecture in place between PRs #9-10 and #13) — required reconciliation logic and surfaced a sync bug within minutes of feature use; the lock-icon UX promised "browser-only" trust that the existence of the server-side hosted-MCP store had already invalidated
- Drop server-side storage and stay browser-only — incompatible with hosted MCP (an MCP client on Claude Desktop has no access to the user's browser IndexedDB or passkey context)
- Encrypt server-side only, drop IndexedDB entirely — the option chosen
- Drop hosted MCP entirely to preserve browser-only BYOK — would have killed the dogfooding goal that day 4 work

**Rationale:** Once hosted MCP shipped (D-029), the server had to hold a decryptable copy of provider keys for any user who wanted to dogfood Vāda via Claude.ai. The `/deliberate` page's lock-icon row, "Sign out," and "Forget this device" affordances had been the UX surface that made browser-only BYOK tangible to users — but with hosted MCP active, those affordances no longer reflected reality (signing out of the browser store didn't sign the user out of the server store, which now had the same keys). Two stores with synchronized state added complexity that served no user-visible purpose, while creating a real bug: the sync was last-write-wins and could revert intentional changes. The UX coherence question — "what does this button do, and is the resulting state honest?" — only had a clean answer once IndexedDB was removed from the canonical role.

**Consequences:**
- `user_provider_keys` is the single source of truth for provider keys; envelope-encrypted with AES-256-GCM, AAD-bound to `user_id`; master key from `MASTER_ENCRYPTION_KEY` env var (KMS migration via `kms_key_id` field reserved for future)
- `/deliberate` page top-bar key UI removed: lock-icon row, "Sign out" button, "Forget this device" button, `IdentityBanner`, `useIdentityBanner`
- Inline "ANTHROPIC KEY REQUIRED" dialog in the model picker preserved as a fast-path, but it now writes to the server via `POST /api/keys/provider` rather than to IndexedDB
- `MigrationPrompt` ships as a one-time UX nudge for users who had keys in IndexedDB pre-reversal, asking them to migrate
- `@atta/identity` package retained — it is still mounted via `IdentityProvider` in `apps/vada-ai/web/src/app/layout.tsx` and `apps/atta-ai/web/src/app/layout.tsx`, and continues to provide key-adjacent utilities: `probeProviderKey` (validate a typed key is responsive before persisting server-side), `fetchInstalledOllamaModels` (local Ollama discovery, browser-direct), and the `useIdentity` hook used by `MigrationPrompt`, the judge benchmark hook, and the shared model picker
- Workflow run route (`/api/deliberation/[id]/workflow/run`) no longer accepts `apiKey` / `apiKeys` in the request body — it reads the user's provider keys from the DB by `clerkId` and decrypts inside the handler
- Old `vada-byok-principles.md` framing (transit-mode, IndexedDB at rest) is superseded by this entry; the doc is rewritten in place to describe the current single-source architecture, with a brief history note preserving prior framing
- `vada-byok-gap-report.md` becomes largely moot: Gap 1's Path A vs Path B dichotomy doesn't apply (we picked neither — keys are server-side at rest, decrypted only inside request handlers). Gap 2 (multi-vendor adapter) was closed May 1 in separate work. Gaps 3 and 4 are about `@atta/identity`-as-key-store and are no longer the relevant question. The doc is updated with resolution status, kept as historical record.

---

## D-029: Hosted MCP server architecture (shipped)

**Date:** May 4, 2026 (PRs #9 + #10, `feat/mcp-server`)
**Status:** Active
**Type:** 1

**Decision summary:** Hosted MCP server shipped end-to-end. Endpoint at `https://vada.attalabs.dev/api/mcp`. Streamable HTTP transport per the MCP specification. Bearer-token authentication via SHA-256-hashed API keys (`vada_*`) stored in the `api_keys` table. Provider keys stored separately in `user_provider_keys` with envelope encryption (AES-256-GCM, AAD-bound to user_id, env-var-derived master key, version field for future KMS migration). Both `vada__consult` and `vada__deliberate` tools wired through. This is a deliberate trust-model escalation distinct from the prior browser-only BYOK story.

**Alternatives considered:**
- Stay stdio-only — would have made dogfooding via Claude.ai impossible; Claude.ai has no way to spawn a local stdio process for an MCP server
- KMS-managed master key (AWS KMS, GCP Cloud KMS, HashiCorp Vault) for envelope encryption — deferred to V2; env-var master with `kms_key_id` version field on the row preserves migration path
- bcrypt for API key hashing — slow per-request; unnecessary given key entropy (32 bytes random base64url) and the fact that the database lookup uses a unique index on the hash column
- OAuth instead of bearer tokens — MCP OAuth client support across consumer clients is patchy as of mid-2026; bearer tokens work universally
- Per-key tool scoping (e.g., key authorized only for `vada__consult`) — not designed; future work
- Production domain `vada.ai` instead of `vada.attalabs.dev` — `vada.ai` is the long-term target but not held; using `vada.attalabs.dev` until the domain question resolves

**Rationale:** Dogfooding Vāda via Claude.ai requires a hosted endpoint Claude.ai can connect to — which means HTTP, an authentication mechanism the MCP client supports universally (bearer header), and a way for the server to call provider APIs on behalf of the authenticated user (server-side decryptable provider keys). Each piece of this — envelope encryption, separate API key vs provider key tables, SHA-256 hash with prefix lookup — was the simplest mechanism that satisfies the threat model without introducing infrastructure (KMS, bcrypt-as-rate-limit) that V1 doesn't yet need.

The trust-model escalation is real and intentional: the prior browser-only BYOK story was strictly stronger than what hosted MCP can offer (server cannot decrypt what it cannot reach). Users opting into hosted MCP accept that Vāda's server holds an encrypted copy of their provider keys, decrypted only inside request handlers. This is documented separately.

**Consequences:**
- Hosted route handler at `apps/vada-ai/web/src/app/api/mcp/route.ts`
- `verifyApiKeyBearer` in `packages/auth/src/api-key-auth.ts` parses the `Authorization: Bearer <vada_...>` header, computes SHA-256 hex digest, looks up by hash via the unique index on `api_keys.key_hash`
- `generateApiKey('vada')` in `packages/crypto/src/api-keys.ts` produces `vada_<base64url(32 random bytes)>` with the SHA-256 hash returned alongside; plaintext shown to user exactly once at creation
- `api_keys` table columns: `id` (uuid PK), `clerk_id`, `name`, `product` (default `'vada'`), `key_hash` (unique-indexed), `created_at`, `last_used_at`, `revoked_at`. No bcrypt cost, no plaintext column
- `user_provider_keys` table holds envelope-encrypted provider keys with `kms_key_id` version field for future KMS migration; one row per provider per user
- `MASTER_ENCRYPTION_KEY` env var holds the 32-byte base64-encoded master key on Vercel production; AAD on each ciphertext binds it to the user's `clerkId` so a row swap between users is detectable on decrypt
- Per-product key generation supported by the `product` column on `api_keys` — Vitakka and other future products would mint their own `vitakka_*` etc.
- Settings → API Keys section provides UI for provider key management AND Vāda API key generation; both surfaces extracted to `@atta/ui/account` (D-030)
- Discovered during deployment: Vercel's "Sensitive" flag on environment variables hides the Value field on Edit, allowing a paste-into-Notes mistake to remain invisible. `vercel env pull` is the only reliable verification path. Captured as a calibration lesson, not an architectural fact.
- `mcp-architecture.md` rewritten from "Target architecture. Implementation pending." to describe shipped reality; KMS-related "TBD" notes resolved as "deferred to V2"
- `vada-mcp-server/SKILL.md` updated to describe two live surfaces (stdio + hosted) rather than one current + one target
- Implementation Phases 1-4 from the original architecture doc are complete; Phase 5 (session URL fix in stdio server, addressing the `vada.ai` hardcode bug) and Phase 6 (rate limiting, audit log retention, hardening) remain as future work

---

## D-030: Shared `@atta/ui/account` components and ecosystem-shared key schemas in `@atta/db`

**Date:** May 5, 2026 (PR `feat/shared-keys-ui`)
**Status:** Active
**Type:** 1

**Decision summary:** `ProviderKeysSection` and `ApiKeysSection` extracted from `apps/vada-ai/web/src/app/(main)/settings/components/` into `packages/ui/account/` as shared components — usable by any future Atta product's Settings page. Ecosystem-shared key tables (`api_keys`, `user_provider_keys`, `mcp_sessions`) moved from `apps/vada-ai/web/src/db/schema.ts` to `packages/db/src/schema/keys.ts`. Vāda-specific tables (including `userSettings` for face-style preference) stay in the app-local schema. The Settings → Teams tab is removed; team agent model selection moves inline to the deliberation panel via D-027's unified storage.

**Alternatives considered:**
- α — Per-product convention with shared query layer only — would have kept schema definitions duplicated in each product's `db/schema.ts`, inviting drift the moment a column was added in one product but not the other
- β — Move ecosystem-shared tables to `@atta/db` as a documented exception to per-product schema convention (the option chosen)
- γ — Stand up a dedicated `apps/account/web` hub at `account.attalabs.dev` and host the shared Settings UI there, with each product's `/settings` redirecting — adds a deployment surface and a redirect step for what is fundamentally a presentation-layer share

**Rationale:** With hosted MCP shipped (D-029) and provider keys + API keys becoming first-class ecosystem concerns rather than Vāda-specific ones, the schemas describing them belong at the ecosystem layer. A future Vitakka or Sati Settings page that needs to show "your provider keys" or "your API keys for hosted MCP" must read the same tables — duplicating the schema in `apps/vitakka-ai/` would guarantee divergence. Moving the schemas to `@atta/db` accepts a narrow, documented exception to the per-product schema convention rather than spreading the exception via copy-paste.

The shared UI components follow the same logic: `ProviderKeysSection` and `ApiKeysSection` are the same UI in any product context. Extraction to `@atta/ui/account` (alongside the existing `<AttaUserProfile />` Clerk wrapper) lets the Vāda Settings page compose them today and the next product's Settings page compose them tomorrow.

The decision NOT to build `account.attalabs.dev` as a redirect hub is deliberate — it would add a deployment surface, a redirect step, and a domain-routing boundary for no functional gain over component-level sharing. Each product's `/settings` URL stays product-local; the components inside are shared.

**Consequences:**
- `packages/ui/account/` exports `ProviderKeysSection`, `ApiKeysSection`, alongside the existing `AttaUserProfile`
- `packages/db/src/schema/keys.ts` holds `apiKeys`, `userProviderKeys`, `mcpSessions` — read by both Vāda's web app and (future) any other product's web app
- Per-product DB schema files (e.g., `apps/vada-ai/web/src/db/schema.ts`) keep product-specific tables: for Vāda, that includes `userSettings` (single column: `face_style`), benchmark tables, deliberation transcripts, and so on
- API route handlers (`/api/keys/provider`, `/api/keys/api`, `/api/mcp`) stay per-product and import shared query helpers from `packages/db/src/queries/keys.ts` (or equivalent)
- Settings tab structure (Vāda): Account / API Keys / Agent Style. The Teams tab is removed; team agent model selection moves inline to the deliberation panel and shares storage with the picker via D-027
- `auth/SKILL.md` RULE #5 ("`account.attalabs.dev` is the canonical settings/billing surface") is wrong as of this decision and gets rewritten — the canonical pattern is product-local `/settings` URLs composing shared `@atta/ui/account` components
- Future products that want a Settings page can adopt the shared components without a separate hub; cross-product navigation between Settings surfaces is via the SSO cookie scope already in place (auth/SKILL.md RULE #2)

---

## D-031: Reviewer prompt rev 5 — Persona+Goal+Posture+Output structure, verification block, phantom consensus detection

**Date:** May 8, 2026
**Status:** Active
**Type:** 1
**Area:** Vāda Reviewers — reviewer + synthesizer system prompts

**Decision summary:** Three additions to the Vāda Reviewers v1 prompt design, captured as rev 5 of `vada-reviewers-spec.md` (§4.1.1, §4.1.2, §3.7). (1) Reviewer system prompt restructured as four explicit labeled sections — Persona, Goal, Posture, Output — replacing the rev 4 prose-ordered prompt with the same content laid out in maintainable sections. (2) Reviewer system prompt now requires a `<verification>` block at the start of every response, enumerating the facts the reviewer is treating as given before critique begins. (3) Synthesizer system prompt now requires phantom consensus detection — when two or more reviewers reach the same surface conclusion through incompatible reasoning, the synthesizer marks the consensus item with `phantom_consensus: true` and explains the underlying disagreement in a `rationale` field on the schema. The synthesizer also de-prioritizes phantom-flagged consensus in recommendations, regardless of GROUNDED/INFERRED status.

**Alternatives considered:**
- Adopt specific personas per reviewer (e.g., "Forensic Financial Auditor with 20 years in fraud detection") as the cross-vendor research thread suggested — rejected because it contradicts Vāda Reviewers' uniform-role design (§3.4 of the spec). Vendor diversity comes from binding, not from role differentiation. Persona stays generic ("external critical reviewer"); specific personas remain a v2 candidate (§6.2).
- Bake the verification block into the brief template (§4.1.3) rather than the system prompt — rejected because the verification block applies regardless of brief content. Putting it in the brief means brief authors might omit it; putting it in the system prompt enforces it across all calls.
- Add phantom consensus detection as a v2 enhancement rather than v1 — rejected because the cost is one prompt instruction and one schema field, while the benefit (preventing the primary AI from over-weighting illusory consensus) is felt on every synthesis call.
- Spawn a separate "principles doc" capturing the cross-vendor research synthesis rather than patching the spec — rejected because the rev 4 spec already absorbed most of the research findings (DO-NOT-FLAG, GROUNDED/INFERRED tagging, structured synthesis schema). The remaining gaps were small and surgical and belong in the spec, not in a parallel document that would risk drifting from implementation.

**Rationale:** A cross-vendor research thread (Gemini, Grok, ChatGPT — May 2026) on multi-agent orchestration patterns surfaced five convergent patterns. Three of those five were already in `vada-reviewers-spec.md` rev 4 (the DO-NOT-FLAG list, GROUNDED/INFERRED tagging, the structured synthesis schema with grounded-over-inferred weighting). The remaining two — verification block and phantom consensus detection — plus the structural refinement of the reviewer prompt into Persona+Goal+Posture+Output sections, are independently defensible additions whose cost is low and whose value is realized on every reviewer/synthesizer call.

The Persona+Goal+Posture+Output restructure is maintenance, not innovation: same content, more maintainable layout. The verification block is the addition with the most uncertain payoff — it depends on reviewers actually following the format across vendors — but is defensible on first principles (committing to a reading before critiquing is good epistemic hygiene) and the v1 benchmark will surface compliance reliability as observable in transcripts. Phantom consensus detection has the highest potential value if it works and the highest false-flag risk; the prompt instruction errs on the side of `phantom_consensus: false` when in doubt (real consensus default; phantom requires *incompatible* reasoning, not merely *different* reasoning).

The decision to patch the existing spec rather than create a new principles doc reflects a calibration lesson from the same session: research syntheses often duplicate existing spec work; checking the spec first usually reveals the right move is a small patch rather than a parallel document.

**Consequences:**
- `vada-reviewers-spec.md` rev 5 published, replacing rev 4 as the implementation baseline
- §4.1.1 reviewer prompt restructured into Persona+Goal+Posture+Output; verification block requirement added under OUTPUT section
- §4.1.2 synthesizer prompt includes phantom consensus detection in CONSENSUS section, verification-block divergence flagging in PARTICIPANTS section, and de-prioritization rule for phantom-flagged consensus in RECOMMENDATIONS section
- §3.7 synthesizer output schema gains `phantom_consensus: boolean` and `rationale: string` fields on consensus items
- §1.1 implementation-reference table gains three rev 5 entries (Persona+Goal+Posture+Output structural pattern, verification block, phantom consensus detection) attributed to "Cross-vendor research convergence (Gemini, Grok, ChatGPT — May 2026)"
- §7.8 (new) — open question on verification block compliance reliability across vendors
- §7.9 (new) — open question on phantom consensus detection achievability by the synthesizer
- §8 lock list updated with rev 5 additions
- Implementation sequence (§9) unchanged — rev 5 prompts replace rev 4 prompts as the baseline for steps 6-7 (reviewer + synthesizer prompt iteration)
- Track B Item 3b (Reviewer prompt iteration) starts from rev 5 prompts, not rev 4
- No engine changes required — prompt content lives in YAML free-text fields; no schema or compiler changes
- `vada-reviewers-tech-deep-dive.md` Section 9.6 added — methodological note on framework-vs-production patterns, reflecting the calibration lesson that prompted the rev 5 patch approach

---

## D-032: Vendor registry — single source of truth for SDK shapes, base URLs, and key conventions

**Date:** May 11, 2026 (PR #31, `feat/vendor-registry`)
**Status:** Active
**Type:** 1
**Area:** Vendor routing across `@atta/models`, `@atta/adapter-langgraph`, `apps/vada-ai/web`, `apps/vada-ai/mcp-server`

**Decision summary:** Vendor routing is consolidated into a single registry at `packages/models/src/vendors.ts`. Each registered vendor is a data record carrying `sdkShape` (one of `anthropic`, `google-genai`, `openai-compat`), `baseURL`, `keyConvention`, `modelPrefixes`, `envVar`, and `localOnly`. The adapter (`packages/adapter-langgraph/src/llm.ts`) dispatches by `sdkShape` — three branches total — reading vendor-specific configuration (notably `baseURL`) from the registry at call time. `ProviderKeys` becomes `Partial<Record<VendorId, string>>`. `VendorId = keyof typeof VENDORS` replaces the 5-wide `RouteProvider` union. All prior prefix-resolution implementations (`resolveProvider` in the adapter, `resolveModelVendor` in the web route, the local `resolveVendor` in `reviewer-models.ts`, `NATIVE_ROUTE_BY_MODELS_DEV_ID` + `OPENROUTER_ALLOWED_PROVIDERS` logic in `transform.ts`) are deleted or simplified to consult the registry. `vada__consult` MCP tool gains an optional `reviewer_config: Record<agentName, modelId>` parameter, validated against the registry, refused with structured `local_only_vendor` or `missing_provider_key` errors — same contract surface the web UI's deliberate route already supported.

Twelve vendors are registered in v1: `anthropic`, `openai`, `google`, `xai`, `groq`, `openrouter`, `deepseek`, `cerebras`, `mistral`, `together`, `fireworks`, `ollama`. Ten of them use `sdkShape: openai-compat` with different `baseURL`s. Two have their own SDK shapes (`anthropic`, `google-genai`). One is `localOnly: true` (`ollama`) — refused at validation in any hosted execution context.

Crucible, Sparring, and War Room marked `experimental: true` in the same PR — unpublished from the public `/teams` catalog while keeping their YAMLs in the repo for the bench harness, explicit `spec_id` MCP calls, and future iteration. Vāda Reviewers and Vāda Reviewers + Synthesis are the two currently published teams.

**Alternatives considered:**
- α — Add Groq and OpenRouter to the existing 4-vendor hardcoded list, leave the architecture in place. Faster but kicks the architectural problem down the road; the next vendor that comes along reproduces the same fix. Rejected.
- β — Single registry at the catalog layer; adapter still hardcodes per-vendor dispatch branches. Rejected because the asymmetry the architecture should capture is "many vendors, few SDK shapes" — hardcoding dispatch per vendor preserves the prior failure mode.
- γ — Single registry, dispatch by `sdkShape`, three SDK adapters (`callAnthropic`, `callGoogleGenAI`, `callOpenAICompat`). The chosen design. Adding a new OpenAI-compatible vendor becomes one registry entry; a new SDK shape becomes one new adapter + one switch branch.
- δ — Keep `providers.ts` as a backward-compat shim re-exporting registry symbols under old names (`RouteProvider`, `PROVIDERS`, `ROUTE_PROVIDER_ORDER`). Briefly in place between commit `2db31eb` and commit `08a041b` as a scope-management decision. Subsequently rejected — half-merged refactor with a "follow-up PR" sitting on the backlog is exactly the pattern where the follow-up never happens and the shim outlives the migration. PR #31 ultimately migrated the 6 consumer files (`model-picker.tsx`, `provider-keys-section.tsx`, `identity/{keymap,storage,react,errors}.ts`) plus 12 `apps/vada-ai/web/src/` files and deleted the shim in commit `08a041b`. Single atomic clean architecture.
- ε — Extend the `Vendor` interface with presentation-layer fields like `keyPlaceholder` (used by `model-picker.tsx`'s input UX). Rejected — vendor identity is not vendor presentation. `keyPlaceholder` derives from `keyPrefix` + `localOnly`, both already on `Vendor`. Inlined at the call site as a 3-line computation. Generalizable rule: if a value is `f(canonical-fields)` and only one consumer reads it, that's the consumer's concern, not the canonical type's.

**Rationale:** The May 10 empirical failure that prompted this work was a user-configured Groq-served model (`deepseek-r1-distill-llama-70b`) returning `Unrecognized model` from the web `/workflow/run` route. Root cause: four divergent prefix-resolution implementations across the codebase, all answering "what vendor does this model route to" differently. The picker (catalog-aware) accepted the model; the route (hardcoded 4-vendor prefix list) refused it; the adapter (same hardcoded list) would have refused it; the MCP path lacked the input shape entirely. Per the May 9 calibration lesson — *"when something feels uncannily like a spec we already wrote, check if we already wrote it"* — the catalog already had a notion of vendor routing for every model (`route: RouteProvider`); the executor layer was independently re-implementing the question.

The asymmetry the design captures: vendor count grows (Groq, DeepSeek, Cerebras, Together, Fireworks, Mistral, ...); SDK shape count is small and stable. Almost all new vendors speak OpenAI-compatible Chat Completions. Anthropic and Google are the only genuine SDK exceptions. Three SDK shapes is the realistic ceiling for the foreseeable future. Capturing this in code — code is shape-aware, data is vendor-aware — produces an architecture where adding a vendor is data, not code; and a new SDK shape is the only thing that requires real engineering.

The `reviewer_config` addition to `vada__consult` is part of the same architectural fix: the web's `/workflow/run` route already accepted per-slot model configuration via `reviewerConfig`, validated against provider keys before dispatch. The MCP tool didn't expose the field. With the registry centralized, the MCP validation path becomes the same catalog-and-registry lookup the web route now uses — same source of truth, mirrored on the contract surface.

The decision to unpublish Crucible/Sparring/War Room in the same PR — rather than as a separate change — reflects Principal direction (May 10): the role-played multi-round teams have not been validated in production; flow design, system prompts, and inter-agent interactions all need iteration before they should be re-exposed to external users. The change is data-only (one YAML field per file) and ships with the registry refactor without expanding code scope.

**Consequences:**
- `packages/models/src/vendors.ts` is the canonical source of vendor metadata, ordering, and types across the entire monorepo. 12 vendors registered.
- `packages/models/src/providers.ts` deleted; 6 ecosystem consumer files and 12 web-app files migrated from `RouteProvider`/`PROVIDERS`/`ROUTE_PROVIDER_ORDER` to `VendorId`/`VENDORS`/`VENDOR_ORDER`. No half-merged state on main.
- `ProviderKeys = Partial<Record<VendorId, string>>` accepts all 12 vendors; encrypted at-rest schema in `user_provider_keys` (`@atta/db`) is unchanged (keys are stored by vendor name string — already vendor-agnostic, per D-030)
- Adapter dispatch in `packages/adapter-langgraph/src/llm.ts` is a 3-branch switch on `vendor.sdkShape`. New OpenAI-compatible vendors require zero adapter code changes. A new SDK shape (rare; the realistic ceiling is ~3-4 for the foreseeable future) requires one new adapter function and one new switch branch.
- `createMultiVendorLlmCall` gains `agentVendorOverrides: Record<string, VendorId>` parameter — catalog-resolved vendor map keyed by agent name. The web route and MCP `consult.ts` both populate this from `findModelEntryByModelId(catalog, modelId)`, with `resolveVendorByPrefix` as fallback. The override map is what correctly routes cross-vendor models like `deepseek-r1-distill-llama-70b` served by Groq (prefix matching alone misidentifies as `deepseek`).
- `vada__consult` MCP tool's input schema declares `reviewer_config` as an optional `Record<string, string>`. `runConsult` validates each `[agentName, modelId]` against the catalog + registry before constructing the `LangGraphAdapter`. Refuses with structured `local_only_vendor` error if the resolved vendor has `localOnly: true` (hosted MCP is production by definition). Refuses with `missing_provider_key` if `providerKeys[vendorId]` is absent. Both errors include the resolved `vendorId`, `modelId`, and `agentName` for client-side reporting.
- `vada__deliberate` MCP tool's `team` enum is pruned to the 2 currently published specs (`vada-reviewers`, `vada-reviewers-synthesis`). The 7 experimental specs (`crucible`, `sparring`, `war-room`, `a0-baseline`, `a1-baseline`, `brokered-trio`, `brokered-quartet`) remain accessible by explicit `spec_id` via `vada__consult` but are not advertised in the enum.
- `crucible.yaml`, `sparring.yaml`, `war-room.yaml` carry `experimental: true`; filtered out of the public `/teams` catalog by `listPublicSpecs()`. YAMLs retained for bench harness, explicit `spec_id` MCP calls, and future iteration when their flow design + prompts have been re-iterated.
- `apps/vada-ai/mcp-server/package.json` gains `@atta/models` as a workspace dep. Tech-debt-adjacent calibration lesson: Bun's hoisted node_modules masked the missing declaration locally; Vercel's `--frozen-lockfile` surfaced it as a build-time error.
- Local-only enforcement is layered: the route handler refuses upstream of dispatch; the adapter has a defense-in-depth check that throws if asked to dispatch to a `localOnly: true` vendor in a production execution context. Local dev / stdio MCP remain free to use Ollama with no friction.
- Tests added in `packages/adapter-langgraph/src/vendor-registry.test.ts` (structural invariants on the registry; `resolveVendorByPrefix` correctness; `isLocalOnly` behavior — 30 tests). `llm.test.ts` updated with new error messages and cross-vendor dispatch tests. All 50 tests pass.
- Empirical deliverable closed: a user with a Groq key can configure a Reviewer slot to `deepseek-r1-distill-llama-70b` and successfully dispatch from BOTH web UI and MCP `vada__consult`. Catalog-resolved `vendorId='groq'` flows through `agentVendorOverrides` to Groq's `baseURL` with the Groq key. Same path on both surfaces.
- Open question OQ-cross-12 (in `state.md`): when a future vendor's SDK shape genuinely diverges (e.g., streaming-only with non-OpenAI-compatible response shape, AWS SigV4 auth, or a fundamentally different request shape), decide per case whether to add a 4th `sdkShape` branch (one new adapter + one switch branch; preferred when latency matters) or route through OpenRouter (zero adapter code; preferred when latency doesn't).

---

## D-033: Generic flow refactor — universal round-based YAML schema (stack-wide)

**Date:** May 12, 2026
**Status:** Active. Design ratified; PRs #41 + #47 + #48 shipped May 12-13, 2026. PR 3 (MCP `agent_config` rename + new SSE events) and PR 4 (UI rewrite) deferred — see `generic-flow-refactor.md` for the deferred-work breakdown.
**Type:** 1
**Area:** YAML schema, engine compiler, MCP server, web route handler, SSE event contract, UI renderer
**Design doc:** `apps/vada-ai/specs/generic-flow-refactor.md`

**Decision summary:** The three structurally distinct YAML shapes that exist today — brokered-no-synthesis (`vada-reviewers`), brokered-with-synthesis (`vada-reviewers-synthesis`), and rounds-based (`sparring`, `crucible`, `war-room`) — collapse into one universal schema: **a flow is a sequence of rounds**. Each round has agents, layout, name, repeats, failure semantics, and optional declarative revision via `on_failure: { action, target, signal }`. Synthesizer is just a single-agent round. Audit is just a round. Revision is data-driven, not a code special case.

The schema is implemented end-to-end across the stack:

- **Schema + types:** one `Flow` type with `rounds: Round[]`. The discriminated union of `BrokeredWorkflow`/`RoundsWorkflow`/`SoloWorkflow` is deleted. `validateFlow` replaces the per-workflow validators.
- **Engine compiler:** one `compileFlow(flow, question, model) → Plan` function. Walks rounds, emits Plan nodes and edges (including conditional revision edges for `on_failure: revise`). All 9 catalog YAMLs migrated to the new schema. Old compilers deleted.
- **Data flow:** the engine populates a uniform Handlebars template context (`rounds.<id>.outputs`, `currentRound.prior_agents`, `currentRound.repeat_index`, `revision.*`). Each round's `message_template` references prior round outputs by id. This is Option A from the design — implicit template context, not explicit `inputs:` declaration. Explicit `inputs:` is deferred to future work.
- **Within-round input:** `message_template` lives on the round (default for all agents in the round) with optional per-agent override. Removes the duplication of `{{question}}` × 3 in today's `vada-reviewers.yaml`. Conceptually: a round has one input fanned out to N agents.
- **MCP server:** `reviewer_config` (D-032) is renamed to `agent_config: Record<agentName, modelId>` to match the new vocabulary. Flat keying — same agent uses same model across all rounds it appears in.
- **SSE event contract:** the special-cased `state_changed: ROUND_N | CONCLUDING | AUDITING | REVISING` events are replaced by generic `round_started { round_id, name, repeat_index }`, `round_completed { round_id, repeat_index, signal_matched? }`, and `revision_started { source_round_id, target_round_id, revision_index }`. `agent_completed` carries `round_id` (string) + `repeat_index` (0-based int) instead of integer `round`. `synthesis_complete` is removed — synthesis-style agents emit `agent_completed` with the existing optional `structured` field per D-026.
- **UI renderer:** rounds-era components (`RoundStrip`, `Round`, `RoundView`, `useRoundStrip`) deleted. New components (`FlowFeed`, `RoundColumn`, `AgentGrid`, `AgentChain`, `AgentCard`, `useFlowState`) render one column per round, top-to-bottom, centered. Parallel rounds render agents as a grid; serial rounds render agents in a chain with arrows; multi-repeat rounds stack repeats with "Round N of M" dividers; revised rounds stack original and revision with the original marked superseded.

This is Path β from the prior `generic-flow-ui-design.md` exploration — the full stack migration, not a UI-only normalization layer. Path α (UI-only adapter, schema unchanged) was rejected because piecemeal cleanup leaves the YAML schema as a permanent bug-magnet; the Principal directive was "refactor must fix the entire stack."

**Implementation status (May 13, 2026 update):**

PR #41 (Flow types + Zod schema + validateFlow), PR #47 (greenfield `compileFlow` + 9 YAML migration + 29 consumer files + v1 engine surface deletion), and PR #48 (D-034 cleanup — signal-type rejection + RevisionCondition tighten) have shipped. Five pragmatic deviations from the original design were captured honestly in `generic-flow-refactor.md`:

1. `compileFlow` keeps shape detection (4 branches) over `flow.rounds` topology rather than emitting a fully generic Plan graph. Adapter and route handler depend on v1 Plan node ids; rewriting them in lockstep was out of scope. Captured as OQ-I in `vada-state.md`.
2. TemplateState shape unchanged. v2 YAMLs still use v1 template variable names (`outputsByRound`, `lastOutputByAgent`, `conclusion`, etc.). The round-namespaced context (`rounds.<id>.outputs`, `currentRound.*`, `revision.*`) was not implemented. Captured as OQ-H in `vada-state.md`.
3. PR 3 (MCP `agent_config` rename + new SSE events) deferred. `reviewer_config` and the v1 SSE event vocabulary still ship.
4. PR 4 (UI rewrite) deferred. `RoundStrip`/`Round`/`RoundView`/`useRoundStrip` still in place; the "Agents are getting ready…" empty state still present.
5. Synthesis template bug fix landed inside PR #47. The v1 `vada-reviewers-synthesis.yaml` template referenced `{{reviewerResponses}}` — a variable the engine never populated. The PR #47 migration replaced it with `{{#each allPreviousOutputs}}[{{this.agentName}}] {{this.content}}{{/each}}`.

All 10 original Open Questions resolved (most as designed, some deferred to PR 3 / PR 4). See the Implementation Status section in `generic-flow-refactor.md` for the per-OQ resolution table.

**Alternatives considered:**

- α — Path α from the prior design: normalize in the UI only, leave YAML schema as-is. Rejected. The UI is the bottleneck right now but the schema is the root cause; the same architectural drift would reappear at the next consumer that needs to interpret the YAML.
- β — Stack-wide refactor with the round-based universal schema (this decision).
- γ — Keep three discriminated YAML shapes but unify behind a single TypeScript type. Rejected. The discriminator becomes a code branch the engine must handle; D-011 said the engine has zero branches on workflow type. Three shapes in the YAML = three code paths somewhere, even if abstracted.
- δ — Migrate the engine but keep the UI rounds-era. Rejected. The UI breaks for single-round teams today (the Bug #1 from May 11). The refactor doesn't deliver user-visible value without the UI rewrite.
- ε — Migrate the YAML schema to a generic primitive (functional composition, graph nodes, etc.) rather than rounds. Rejected as over-abstraction. Rounds are the natural unit of deliberation thinking; users already think in rounds. A more abstract schema would push complexity to YAML authors.

On the revision question specifically:

- A — Keep revision implicitly via `on_failure: revise_previous` (smallest schema). Rejected — too magical, hard to read.
- B — Drop revision entirely from v1. Sparring/crucible/war-room don't audit-revise. Cleaner architecture, but loses a real feature. Principal rejected: "we need to build something generic now, even if we don't use it today."
- C — Model revision as declarative `on_failure: { action, target, signal }` with `target` referencing a prior round id (this decision). Heaviest schema, most explicit. Generic primitive: any round can declare any retry pattern.

**Rationale:**

The May 11 audit surfaced three structurally distinct YAML shapes the codebase has been carrying since Phase 7.2. D-011 committed to "engine has zero branches on workflow type" — but the YAML schema kept three. The engine compilers had three. The UI had hardcoded assumptions matching only one. PR #31 (vendor registry, May 11) showed what consolidation looks like done right: a many-to-few asymmetry (many vendors → few SDK shapes) captured as data + 3 code branches. D-033 applies the same pattern to flow shapes: many flows → one universal round-based schema.

The conceptual model — **a round is a phase that takes accumulated state and produces an array of outputs** — is generic enough to express every current and future deliberation pattern without code changes. Synthesizer is just a round with one agent. Audit is just a round whose agents emit signals. Revision is a declarative pattern on `on_failure`. There is no special case the engine needs to know about; everything is YAML.

The Principal observation that "a round with 3 reviewers has 3 inputs, not 1" was a real correction to the first design. The schema now treats `message_template` as living on the round (default for all agents) with optional per-agent override. A round has ONE conceptual input (its message_template, rendered against accumulated state); the engine fans that input to N agents. This is what vendor diversity looks like in YAML: declare the template once, not N times.

Declarative revision (Option C) was chosen over dropping revision (Option B) per Principal direction: "I know I don't use it, but we need to build something generic now." This is the right call. If we drop revision, the architecture has a special case (rounds-with-audit need different schema). If we keep revision as a non-generic special case, we've kicked the architectural problem down the road. The generic `on_failure: { action, target, signal }` mechanism costs schema weight but pays back the moment any future flow needs retry semantics.

The data flow model (uniform template context, Option A) over explicit `inputs:` declaration is the v1 pragmatic choice. Today's engine already populates `outputsByRound`, `lastOutputByAgent`, `reviewerResponses`, etc. via Handlebars. Generalizing this to `rounds.<id>.outputs` is one rename and one new variable mapping (`currentRound.*`). Adding explicit `inputs:` declaration would be architecturally cleaner (validatable data flow, visible without reading templates) but it doubles the schema surface for a benefit that's only realized at validation time. It's a non-breaking future addition.

The naming convention — "round" everywhere instead of "phase" — matches today's codebase vocabulary, today's YAML field names (`flow.rounds`), and today's user mental model. Renaming would have rebuilt vocabulary across the team and the codebase for no benefit. The decision-doc's earlier `phase` framing was Claude's error; reverted at Principal direction.

**Consequences:**

- All 9 catalog YAMLs migrated to the new schema in PR 2 of the refactor sequence. Old YAML field shapes (`reviewers:`, `flow.synthesis:`, `flow.audit:` blocks) gone.
- `packages/engine/src/types.ts` removes `BrokeredWorkflow`, `RoundsWorkflow`, `SoloWorkflow`, and the workflow discriminated union. Adds `Flow`, `Round`, `AgentInRound`, `OnFailureSpec` types.
- `packages/engine/src/compile.ts` is one `compileFlow` function. Old per-workflow compilers (`compileBrokered`, `compileRounds`, `compileSolo`) deleted. (D-014's `compileCustom` was already deleted.)
- `validateFlow` enforces: rounds.length >= 1; all round ids unique; `on_failure.target` references prior rounds; `agents[].name` references the top-level `agents` array; `repeats >= 1`; `max_revisions >= 1` when action=`revise`; either round has `message_template` OR every agent in the round has its own; a round with zero agents is rejected.
- `apps/vada-ai/mcp-server`: `reviewer_config` renamed to `agent_config: Record<agentName, modelId>` (D-032's registry-backed validation preserved). Cosmetic name change to match new vocabulary.
- `/api/deliberation/[id]/workflow/run` route emits new SSE events (`round_started`, `round_completed`, `revision_started`) and drops `state_changed: ROUND_N` and `synthesis_complete`. `agent_completed` payload becomes `{ id, agent, round_id, repeat_index, content, structured?, error? }`. PR 3 temporarily emits both old and new events for transition; cleanup PR removes the old emission once UI consumes new.
- UI renderer rewritten: `RoundStrip`, `Round`, `RoundView`, `useRoundStrip` deleted. New components `FlowFeed`, `RoundColumn`, `AgentGrid`, `AgentChain`, `AgentCard`, `useFlowState` introduced. The "Agents are getting ready…" empty state is gone — phase columns render on mount with `pending` agent cards that fill in as events arrive. Fixes Bug #1 from May 11.
- Conclusion fallback text from PR #38 (May 12) remains correct under the new architecture: a team without a single-agent synthesis-style round renders "This team produces parallel reviewer outputs without a unified conclusion…" — derived now from the spec's round topology rather than the `flow.synthesis` field.
- Vendor registry from D-032 (May 11) is unchanged. SDK-shape dispatch is orthogonal to flow shape. `agentVendorOverrides` populated by `agent_config` instead of `reviewer_config`.
- D-026 (consumers receive both rendered text and structured synthesis output) preserved. Structured output now flows through generic `agent_completed.structured` field rather than the special-cased `synthesis_complete` event.
- D-027 (unified team agent model storage at `vada:team:<specId>` localStorage key) preserved. The picker continues writing per-agent modelId selections; D-033 just renames the SSE/MCP surface from "reviewer" to "agent" for consistency.
- D-022 (dynamic spec registry via `readdirSync`) preserved. Adding a new YAML to the catalog requires no code changes (auto-discovered).
- D-011 (engine has zero branches on workflow type) is finally delivered fully. The compiler has no switch on workflow kind because there is no workflow kind — there's just `rounds[]`. The branching that does exist is per-round (parallel vs serial layout, repeats > 1, on_failure.action) and is data-driven.
- D-013 (delete `@vada/teams`) preserved. Teams remain a YAML concept; the new schema is a refinement of how the YAML expresses that concept.
- Migration of existing sessions: no data migration needed. `sessions.spec_id` is a stable identifier; the new YAML at the same id describes the same flow. Old transcripts have agent names that still exist in the new YAML's top-level `agents:` block. Old session SSE events were already persisted to `transcript_entries`; the UI on session resume reads from the DB, not from a fresh SSE stream.
- Audit/revision signal robustness: v1 ships with `signal.type: 'contains'` only (current behavior). `signal.type: 'matches'` (regex) and `signal.type: 'structured_field'` (look at JSON field of agent output) are noted as future additions when use cases surface — they're additive to the OnFailureSpec discriminated union with no breaking change.
- Rollout: 4 PRs sequenced on `feat/generic-flow-refactor`:
  - PR 1: schema + types + validation (Haiku, ~1 day) — SHIPPED as PR #41 May 12
  - PR 2: `compileFlow` + YAML migration (Sonnet, ~2 days) — SHIPPED as PR #47 May 13 with full v1 surface deletion + 29 consumer files
  - PR 3: MCP server + route handler + new SSE events (Sonnet, ~1 day) — DEFERRED
  - PR 4: UI rewrite (Sonnet, ~2-3 days) — DEFERRED
  - Cleanup PR: drop deprecated event emission (~½ day, mechanical) — N/A since PR 3 deferred
  - D-034 cleanup PR: signal-type rejection + RevisionCondition tighten — SHIPPED as PR #48 May 13 (not in original plan)
- Open question on explicit `inputs:` declaration (Option B from the data flow design section) parked as future work. Non-breaking when added later.
- Open questions OQ-1 through OQ-10 from the design doc all resolved at design ratification (Principal: "All confirmed, proceed with D-033"). Implementation-time resolution status captured in `generic-flow-refactor.md`.
- The `design/generic-flow-ui` branch with the abandoned UI-only Path α design doc (`generic-flow-ui-design.md`) is superseded by this entry and the doc lives on `design/generic-flow-refactor` as `generic-flow-refactor.md`.

---

## D-034: Signal-type rejection + RevisionCondition single-variant tighten

**Date:** May 13, 2026 (PR #48, `chore/d033-signal-and-revision-cleanup`)
**Status:** Active
**Type:** 1
**Area:** Engine — `compile-flow.ts`, `types.ts`; adapter — `adapter.ts`, `graph-builder.ts`

**Decision summary:** Two hardening changes identified during PR #47 (D-033 PR 2) diff review. (1) `compile-flow.ts` `buildRevisionCondition` now throws explicitly when it encounters `signal.type: 'equals'` or `signal.type: 'matches'` instead of silently coercing them to `'contains'`. (2) `RevisionCondition` in `types.ts` collapses from a 3-variant discriminated union (`contains` / `json-field-equals` / `json-field-truthy`) to a single-variant interface (`type: 'contains'`); the dead `json-field-equals` and `json-field-truthy` adapter switch-case branches and the orphaned `getJsonField` helper are deleted from `packages/adapter-langgraph/src/adapter.ts` and `graph-builder.ts`.

**Alternatives considered:**
- Keep the silent fallthrough — silently coercing `equals`/`matches` to `contains` masks YAML authoring errors and makes the engine surface look like it supports patterns it doesn't. Rejected.
- Keep the 3-variant `RevisionCondition` union for forward extensibility — the union variants were unreachable from any v2 YAML. The schema (`flow-schema.ts`) preserves all three types in `signal.type` for forward extensibility; the compiler is honest about emitting only `contains`. The union in `types.ts` was an over-design that promised behaviour the runtime didn't have. Rejected — collapse to single-variant interface preserves the discriminator field for future expansion without misleading consumers.
- Remove `equals` and `matches` from the schema entirely — rejected. The schema (`flow-schema.ts`) is a forward-compatibility surface; reserving the types for a future engine implementation is cheaper than discovering them later as a contract gap. Compiler refuses; schema accepts. Honest split.
- Add `equals` and `matches` to the engine — rejected as out of scope. v1 ships `contains` only. The two reserved types remain available for future implementation when a use case surfaces.

**Rationale:**

PR #47 diff review surfaced two related issues. First, `buildRevisionCondition` had this branch structure:

```ts
if (signal.type === 'contains') {
  return { type: 'contains', value: signal.value, caseSensitive: signal.caseSensitive ?? false }
}
// 'equals' and 'matches' → treat as contains for v2 (only 'contains' in use today)
return { type: 'contains', value: signal.value, caseSensitive: signal.caseSensitive ?? false }
```

The silent fallthrough was correct for the v2 catalog (no YAML uses `equals` or `matches`) but it masked YAML authoring errors — a typo in `signal.type` would silently coerce to `contains` with no indication that the schema-valid input had been re-interpreted. The right behaviour is for the engine to be honest: if it can't handle a signal type, it should refuse the input loudly and direct the YAML author to either fix the type or extend the engine. The schema layer's forward-extensibility (accepting all three types as syntactically valid) is preserved; the engine layer's honesty is restored.

Second, `RevisionCondition` was declared as a 3-variant discriminated union:

```ts
export type RevisionCondition =
  | { type: 'contains'; value: string; caseSensitive?: boolean }
  | { type: 'json-field-equals'; path: string; value: unknown }
  | { type: 'json-field-truthy'; path: string }
```

The `json-field-equals` and `json-field-truthy` variants were left over from a pre-v2 design (which had two ways to express revision conditions — substring matching for text outputs and JSON path matching for structured outputs). They were never reachable from any v2 YAML (v2 only emits `contains`). The adapter and `graph-builder` still had switch-case branches handling these variants, plus a `getJsonField` helper used exclusively by them — all dead code. Collapsing the union to a single-variant interface (`type: 'contains'`) and deleting the dead switch cases is a mechanical cleanup that doesn't change runtime behaviour. The single-variant interface preserves the `type` discriminator so future expansion to a real union (when `equals` or `matches` are implemented) doesn't break consumers.

The two changes are paired because they share a common cause: forward-extensibility in the schema is fine, but forward-extensibility in the type system that promises behaviour the engine doesn't have is misleading. The schema (`flow-schema.ts`) reserves `equals` and `matches` for future. The engine type system (`types.ts`) reflects what's actually implemented.

**Consequences:**

- `compile-flow.ts` `buildRevisionCondition` throws explicitly on unsupported signal types with a message naming the unsupported type and pointing to the resolution (update YAML or extend `compileFlow`).
- `types.ts` `RevisionCondition` is a single-variant interface with `type: 'contains'`. The discriminator field is preserved for forward extensibility; when `equals` or `matches` are implemented, the interface becomes a discriminated union again with no breaking change to existing consumers.
- `packages/adapter-langgraph/src/adapter.ts`: `json-field-equals` and `json-field-truthy` case blocks removed from `evaluateRevisionCondition`. The remaining `contains` case is the only one left.
- `packages/adapter-langgraph/src/graph-builder.ts`: same removal in `evaluateRevisionCondition`. The orphaned `getJsonField` helper is deleted (no callers).
- `compile-flow.test.ts` gains a test that mutates a sparring flow's audit round to use `signal.type: 'equals'` and asserts that `compileFlow` throws with the exact message naming the unsupported type. 68 engine tests pass total (was 67 in PR #47).
- Net diff: +35 / -86 across 5 files. Cleanup PR — what it looks like when the previous PR's work is honest enough to expose its own follow-up.
- Documentation: this entry plus the changelog and `vada-state.md` Phase 14 entry. The skill docs (`atta-engine/SKILL.md`, `vada-yaml-authoring/SKILL.md`) reflect the single-variant `RevisionCondition` and the engine-throws-on-unsupported-signal-types behaviour in the in-flight docs cleanup PR.
- No schema change. `flow-schema.ts` still accepts `equals` and `matches` at parse time. The schema is the forward-compatibility surface; the compiler is the implementation honesty surface.
- Future work: when `signal.type: 'equals'` or `'matches'` actually needs to ship, the work is (1) implement evaluation in `compile-flow.ts buildRevisionCondition`, (2) expand `RevisionCondition` back to a discriminated union, (3) restore the corresponding adapter switch-case branches, (4) add test coverage. The structural separation between schema (permissive) and compiler (strict) means this future expansion is additive, not breaking.

---

## D-035: Council = web question-answering team, distinct from draft-critique Reviewers

**Date:** Jun 23, 2026 (vada-production-v1, branch `task/vada-production-v1/council-teams`)
**Status:** ACTIVE
**Type:** 2
**Area:** Vāda Teams catalog — `packages/agents/vada-deliberation/yamls/vada-council.yaml`, `vada-council-synthesis.yaml`. No engine change.

**Decision summary:** Introduce two new web teams — **Council** and **Council + Synthesis** — that answer the user's question directly with N vendor-diverse models in parallel. No draft. No critique framing. Each model is an independent answer slot with live web access. The Council variant returns three independent answers side by side. The Council + Synthesis variant adds one synthesizer agent that compares the answers into `{ agreements, disagreements, bottomLine }`. The existing Reviewers and Reviewers + Synthesis teams are untouched and remain canonical for the **critique-a-draft** workflow (a primary AI's draft → reviewers attack it).

**Alternatives rejected:**
- Repurpose Reviewers to answer questions when no draft is provided — rejected. Reviewer prompts are heavily tuned for adversarial critique (PHANTOM CONSENSUS FLAG, PRIMARY CONCERN structure, EVIDENCE referencing the draft, WHAT WOULD CHANGE MY MIND). Reusing them for direct answers would either degrade the critique workflow or produce off-shape answers when used without a draft. Two teams, two prompts.
- One unified team with a runtime "has draft?" flag — rejected as YAML schema bloat. The two shapes have different agent prompts, different message templates, and different downstream UI surfaces. A flag in YAML would not collapse the underlying divergence; it would just defer the divergence to runtime branching in the adapter or UI. Keep the shapes separate at the catalog level.
- Ship only Council (no synthesizer variant) — rejected. The synthesizer materializes the comparison work the user would otherwise do by eye across three columns. Both variants are useful; one without the other is incomplete.

**Rationale:**

Vāda's Reviewers teams answer the question "I have a draft — what's wrong with it?" Council answers a different question: "I have a question — what do several models think?" Both are deliberation patterns, but their inputs differ (draft present vs absent) and their agent roles differ (adversarial critic vs independent answerer). Conflating them under one team would require either (a) generic prompts that handle both contexts (degrading both) or (b) runtime branching that hides the divergence from the YAML catalog (the catalog is the source of truth for deliberation shapes; hidden branching breaks that contract).

The synthesizer in Council + Synthesis intentionally produces a different output shape from the Reviewers + Synthesis Synthesizer. Reviewers + Synthesis emits a richly structured analysis ({ participants, consensus, uniqueInsights, contradictions, rejected, recommendations, verification }) because the source material is critique with GROUNDED/INFERRED tags. Council's source material is answers, not critique — there is no draft to ground claims against. The right output is the three-field shape: what the models agree on, what they disagree on, and the through-line. Forcing Council into the Reviewers synthesis shape would introduce phantom fields the agent has no material to populate.

**Synthesis output contract (locked):**

```ts
{ agreements: string[], disagreements: string[], bottomLine: string }
```

The future Council results view consumes this contract directly.

**Consequences:**

- Two new YAMLs in `packages/agents/vada-deliberation/yamls/`: `vada-council.yaml` (3 agents, 1 round, `layout: parallel`) and `vada-council-synthesis.yaml` (4 agents, 2 rounds: parallel answer + serial synthesis).
- Both YAMLs are auto-discovered by `listPublicSpecs()` — no registry edits required.
- `vada-council` and `vada-council-synthesis` agents use `tools: [web_search]` and `classifier.mode: skip` — independent single-shot answerers, no classifier overhead, web search forwarded directly (per-vendor tool substrate, see vada-state Jun 23, 2026 / D-053).
- The Synthesizer agent uses `role: synthesizer`, fixed `model: claude-sonnet-4-6`, `classifier.mode: skip`, no `tools`, no `editable` — mirrors the Reviewers + Synthesis Synthesizer structure exactly, differing only in prompt and output shape.
- The existing rounds UI (`ConclusionPanel` and the synthesis parser) is keyed to the Reviewers JSON shape and will **not** render the Council `{ agreements, disagreements, bottomLine }` synthesis correctly. This is expected — the Council results view (columns + AIASphere/matrix + synthesis panel) is a separate task. Do not retrofit the old rounds UI to handle both shapes; the Council view will read the contract directly.
- Engine: 70/70 tests pass. Both YAMLs validate cleanly against the D-033 rules (Rule 1: rounds≥1, Rule 4: agent refs exist, Rule 8: per-agent templates on the answer round, etc.). `compileFlow` shape detection identifies `vada-council` as `brokered-no-synth` and `vada-council-synthesis` as `brokered-synth`.
- Reviewers and Reviewers + Synthesis are untouched — the critique-a-draft workflow remains canonical and unchanged.

## D-036: Outside Read engine — vada-fusion-native architecture

**Date:** 2026-06-29
**Status:** ACTIVE
**Type:** 3
**Issue:** #180
**PR:** #237
**Author:** Principal (ratified via merge)
**Ratifies:** apps/vada-ai/specs/vada-teams-catalog/06-outside-read.md

**Decision:** `vada-fusion-native` is the Outside Read engine. It is the `vada__consult` catalog team for situated consultation. Architecture: a 4-agent attack-vector panel (parallel, no cross-talk) → battlefield-map synthesizer (web-OFF) → BlindCritic + FactChecker audit; max 1 revision.

**Engine shape:** `rounds-audit` at the compiler level. The product label `brokered-no-synth` (from vada-rethink-v1-decision.md §4.1) describes the panel's isolation model (each agent sees only `{{question}}`, no peer outputs), not the engine compiler. `compileBrokeredNoSynth` only processes `flow.rounds[0]` and silently drops subsequent rounds — it cannot compile a 3-phase flow. `rounds-audit` correctly compiles all three phases. Panel isolation is enforced at the template level (`message_template: "{{question}}"` on every panel agent), not by parallel execution.

**Battlefield map contract (locked):**
```json
{
  "core_agreement": "string — non-null; what every reviewer converged on",
  "concessions": "string[] — may be empty; positions weakened by the panel",
  "irreducible_conflict": "string — non-null; what the panel could not resolve",
  "risk_ranking": "string | null — single most load-bearing risk"
}
```
`irreducible_conflict` is non-optional. It is what makes the map honest.

**Attack-vector roles (locked):**
- AssumptionHunter — Anthropic (claude-sonnet-4-6): load-bearing assumptions the user has not named
- BaseRate — Google (gemini-2.5-pro): reference class and historical frequency
- FailureMode — OpenAI (gpt-4o): failure modes the proposal has not addressed
- SecondOrder — xAI (grok-3): downstream and second-order consequences

All panel agents have `tools: [web_search]`, `classifier.mode: skip` (always-on web access, single-shot, no classifier overhead). BattlefieldSynthesizer has `tools: []` — freshness lives in the panel.

**Audit non-negotiable:** BlindCritic (no tools, logical/structural audit) + FactChecker (`web_search, web_fetch`, factual audit) run before the map reaches the caller. FLAG from either → synthesizer revises (max 1 revision). `CLEAN` and `REVISED` are both valid delivery states.

**Three presets:** `find-blind-spots`, `critique-draft`, `pre-mortem` — same YAML, same routing flow. Preset is caller-level context (question framing), not a YAML routing construct.

**Consequences:**
- New YAML: `packages/agents/vada-deliberation/yamls/vada-fusion-native.yaml` (rounds-audit shape, 3 rounds: panel, synthesis, audit).
- New package: `packages/agents/vada-fusion-native/` (workspace: `@atta/vada-fusion-native`) — organizational home for the spec.
- `vada__consult` ConsultOutput gains `structured: unknown | null` and `terminal_state: string`; transcript mapping uses optional chain for multi-phase flows.
- Catalog auto-discovered via `listPublicSpecs()` — no registry edits required.
- `vada__consult` default team remains `brokered-trio`; switching default to `vada-fusion-native` is a separate behavioral decision for Principal.
