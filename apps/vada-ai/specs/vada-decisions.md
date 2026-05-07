# Vāda — Architectural Decision Log

**Format:** Append-only. Each entry has a unique ID, date, decision summary, alternatives considered, rationale, and consequences.

**Purpose:** Capture WHY architectural decisions were made, not just what was decided. Future contributors (human or AI) can understand the reasoning rather than re-deriving it.

**How to add an entry:** Append to the bottom. Use the next sequential ID. Don't modify existing entries — if a decision is later reversed or refined, add a new entry that references the original.

---

## D-001: LangGraph as sole deliberation execution path

**Date:** February 2026 (Phase 1)
**Status:** Active

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
**Area:** YAML catalog conventions

**Decision summary:** The `-v1` / `-vN` suffix naming convention is dropped. YAML files are named semantically without version suffixes (e.g., `crucible.yaml`, not `crucible-v1.yaml`). Iteration by forking remains correct for benchmarked YAMLs, but the forked name is chosen by the author and need not use numeric suffixes.

**Alternatives considered:**
- Keep `-v1` suffix as default starter name — adds churn at fork time and implies a multi-version history that doesn't exist yet
- Use date-based names (e.g., `crucible-2026-04.yaml`) — harder to read in tool descriptions
- Use git tags for versioning — no filename artifact; consumers need git access to discover history

**Rationale:** Phase 7.3 revealed the naming convention was speculative. All 7 YAMLs carried `-v1` suffixes with no corresponding `-v2` in sight. The convention added visual noise without adding value. Adding a version suffix before an actual fork exists implies a comparison that doesn't exist.

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

## How to add an entry

When adding a new decision:

1. Use the next sequential ID (D-020, D-021, ...)
2. Date format: Month Day, Year (e.g., "April 25, 2026")
3. Status: Active / Superseded / Reversed / Deprecated
4. Required sections: Decision summary (1-2 sentences), Alternatives considered (bullet list), Rationale (paragraph), Consequences (bullet list)
5. If the decision references or affects other entries, link them by ID
6. Append to the bottom — do not insert in the middle

When superseding an existing decision:

1. Add a new entry with the new decision
2. Reference the old entry's ID in the rationale
3. Update the old entry's Status to "Superseded by D-XXX" or "Reversed by D-XXX"
4. Do not modify the old entry's content otherwise — the historical record matters

When the rationale of an existing entry is wrong but the decision still holds:

1. Add a brief "Date revised:" note at the bottom of the entry
2. Note what was wrong and what's now understood
3. Don't rewrite the original rationale — preserve the historical reasoning
