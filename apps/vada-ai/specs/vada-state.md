## Most recent session — April 26, 2026

Phase 7.2.1 (YAML catalog loader extraction) completed. Key changes:
- Extracted `loadYamlFromCatalog(id)` into `@atta/engine/src/catalog-loader.ts`
- Fixed two broken runtime YAML-loading paths (web route 500ing in dev, MCP spec-registry resolving to wrong directory)
- Migrated all 4 verify scripts to the shared loader
- Anchored path resolution to `import.meta.url` — immune to dev server cwd changes

Phase 8 (synthesizer integration) is next when ready.


# Vāda — Current State

**Last updated:** April 26, 2026
**Last milestone:** Phase 7.2.1 (YAML catalog loader extracted)
**Next milestone:** Phase 8 (synthesizer integration)

---

## What Vāda is, in one paragraph

Vāda is a YAML-driven deliberation runtime. The engine executes deliberation configurations expressed entirely as YAML files. Other applications (Claude Desktop, Cursor, custom apps) invoke Vāda via MCP by passing a YAML and a question; the engine runs the YAML and returns the result. Modes (Crucible, Sparring, Brokered, baselines) are not features — they are YAML configurations. The engine is mode-agnostic.

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
`BrokeredWorkflow` type, `compileBrokered`, `brokered-trio` team, `verify-brokered-port.ts` live test, `vada__consult` wired through engine.

### Phase 5 — Brokered specs update
`brokered-deliberation/00`, `01`, `02`, `06` specs updated to reflect engine-based architecture.

### Phase 6 — Brokered V1 polish
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

---

## What's parked

These exist but are NOT the product direction. They remain as historical artifacts or as configurations that ship for compatibility.

### Current Brokered V1 (role-based, single-shot)
Three reviewers (Strategist, Critic, Devil's Advocate) running in parallel for one round. No synthesis at the engine layer. Currently expressed as `brokered-trio-v1.yaml`. This is a parked configuration, not the destination.

### Role-based deliberation as theory
The Strategist/Critic/Devil's Advocate role split was a theoretical decomposition. It has not been validated empirically against role-free configurations. The manual workflow that this project is modeled on does NOT use roles. Whether roles add value over role-free reviewer multiplication is an open empirical question deferred to Phase 12 (validation experiments).

### Single-round deliberation
Single-round deliberation is a structurally weaker approximation of what the manual workflow actually does (iterative refinement with synthesis between rounds, terminated by Principal). It ships in current Brokered V1 but is not the product target.

---

## What's in flight

Nothing currently. Phase 7.2 just landed. Awaiting decision on next phase.

---

## What's next, sequenced

### Phase 7.5 — Architectural recognitions documented
Capture the architectural recognitions from the Phase 7.2 session into persistent documents. Includes this state document, `vada-product-recognitions.md`, `vada-decisions.md`, `vada-yaml-immutability-principle.md`. (In progress at the time of this writing.)

### Phase 8 — Synthesis as first-class component
Synthesizer becomes a mandatory engine-level concept, not a Caller-Claude responsibility. Every deliberation YAML must include a synthesizer configuration. Synthesizer produces structured output (convergence table, divergence map, new ideas, gaps, proposed solution). The synthesizer's prompt is treated as core IP and benchmarked alongside reviewer prompts.

### Phase 9 — Real-case Brokered as a new YAML
The "real-case" mode reflects what the manual workflow actually does: multi-round, role-free, Principal-terminated, synthesis between rounds. Defined as a new YAML file. May require engine extensions for Principal-terminated loops.

### Phase 10 — Benchmark architecture redesign
Current benchmark judges raw transcript concatenation, NOT what users actually receive (synthesized output). This is a structural flaw discovered in Phase 6.7's smoke test analysis. Judge must measure synthesized output (with augmentation if applicable) against single-shot baseline. Apples-to-apples comparison.

### Phase 11 — YAML cost calculator UI
Users can paste/select a YAML and see estimated cost to run it. Pairs with benchmark history to enable cost-per-quality and cost-quality frontier analysis. Concept document at `apps/vada-ai/specs/yaml-cost-calculator-concept.md` (or wherever it ends up filed). Requires per-agent model overrides in cost estimation (groundwork already done in Phase 7.2).

### Phase 12 — Validation experiments
Stratified test corpus across decision domains. Run each YAML against the corpus. Build benchmark data per YAML. Identify cost-quality frontier. Determine which YAMLs ship as products and which are research artifacts. Address open questions about role-based vs role-free, single-shot vs multi-round empirically.

---

## Open architectural questions

These were raised but not resolved during Phase 7.2 or earlier. They need answers before being designed into the system.

### OQ-A: Where does Caller Claude augmentation fit when Vāda produces synthesis?
If Vāda produces synthesis, what does Caller Claude do with it? Pass through as-is? Augment with conversation context? Both options should be possible per use case.

### OQ-B: Does the synthesizer produce text or structured output?
A structured synthesis (convergence table, divergence map, gaps, proposal) is more useful for downstream automation. A text synthesis is more useful for direct presentation to users. Both? One of each per YAML?

### OQ-C: How does the engine express Principal-terminated loops?
Real-case Brokered terminates when the Principal says it's done, not after a fixed number of rounds. Requires engine extension. Could be: external loop control via Caller Claude (Principal continues by re-invoking) or engine-internal with a "continue?" callback.

### OQ-D: System-prompt-as-template
Domain Expert YAML has `{{domain}}` literals in its system_prompt. Currently `consult.ts` ignores the YAML and uses `createDomainExpert(domain)` factory. Eventually the YAML must be the source of truth, which requires Handlebars rendering of system prompts (not just message templates). Deferred until needed.

### OQ-E: How is YAML immutability enforced technically?
The principle is that YAMLs are immutable once benchmark data exists. Currently this is honor-system. Could be enforced via: filename-based naming convention, file system permissions after first benchmark run, or a registry that tracks "benchmarked" status and rejects modifications.

### OQ-F: How are YAMLs versioned at the catalog level?
Each YAML has a unique `id` (e.g., `crucible-v1`). When a fork happens (e.g., `crucible-v2`), how do consumers know about the new version? Auto-detection from directory? Manual registry update? Implications for MCP-exposed tools.

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
The engine has zero branches on workflow type or mode. Whatever YAML configuration is expressible should be runnable. Even one agent is deliberation.

### Verify scripts are not runtime verification
The Phase A verify scripts passed while both runtime YAML-loading paths were broken. Scripts compute their own paths; they don't exercise the runtime loading code that the web server and MCP server use. When fixing a runtime bug, verify by running the actual runtime (or a script that calls through the same code path), not by running scripts that bypass it.

---

## File locations

Core architectural documents (read these first in a new session):
- `apps/vada-ai/specs/vada-state.md` (this document)
- `apps/vada-ai/specs/vada-product-recognitions.md`
- `apps/vada-ai/specs/vada-decisions.md`
- `apps/vada-ai/specs/vada-yaml-immutability-principle.md`

Existing canonical docs:
- `apps/vada-ai/specs/vada-product-spec.md` — full product positioning
- `apps/vada-ai/specs/vada-science-of-deliberation.md` — foundational theory
- `apps/vada-ai/specs/yaml-schema-reference.md` — YAML schema definitive reference
- `apps/vada-ai/specs/brokered-deliberation/` — Brokered-mode-specific specs
- `ROADMAP.md` — phase tracker
- `DOCS.md` — documentation index

Skills (`.claude/skills/`):
- `vada-architecture/SKILL.md` — architecture master reference
- `vada-yaml-authoring/SKILL.md` — how to create YAML specs
- `vada-mcp-server/SKILL.md` — MCP server implementation
- `atta-engine/SKILL.md` — engine internals
- `atta-adapter-langgraph/SKILL.md` — adapter internals
- `atta-teams/SKILL.md` — agent configs and YAML specs

YAMLs:
- `apps/vada-ai/yamls/` — all deliberation specs

---

## How to update this document

This is a living document. Update it at major milestones. Specifically:

- When a phase completes, move it from "What's next" or "What's in flight" to "What's complete"
- When a new phase starts, move it from "What's next" to "What's in flight"
- When new architectural recognitions emerge, add them or note them in calibration
- When open questions get resolved, move them to a "resolved" section or delete them
- Update the "Last updated" date and milestone at the top

The goal is for this document to always answer "what is the current state of Vāda?" in under 5 minutes of reading.
