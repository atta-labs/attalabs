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
**Status:** Active

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
