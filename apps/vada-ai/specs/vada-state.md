## Most recent session — May 5, 2026

BYOK + Settings restructure (branch: `feat/shared-keys-ui`). Key changes:
- Settings tabs restructured: Teams tab removed; Account / API Keys / Agent Style remain
- `ProviderKeysSection` and `ApiKeysSection` extracted to `packages/ui/account/` — shared across products
- Ecosystem schemas (`providerKeys`, `userPreferences`) moved from `apps/vada-ai/web` to `@atta/db`; query layer migrated
- Unified team agent model storage: `vada:team:<specId>` → `Record<agentName, string>` for all team types (D-027); replaces separate `vada:reviewer-models:` and `vada:team-model:` keys
- DB `getUserTeamModels` call removed from deliberate page; stale DB entries were overriding localStorage selections on every refresh (revert-to-Claude bug) — fixed
- `GlobalModelSelector` writes to unified storage via `specAgentNames` prop; `resolveModel` in `DeliberatePanel` reads from single source


# Vāda — Current State

> **Framing note (2026-04-30):** The "Brokered mode" and "Autonomous mode" product categories used in older entries have been retired. Current framing uses the Vāda Teams catalog (YAML specs at `apps/vada-ai/yamls/`). See `vada-reviewers-spec.md` for the in-progress Vāda Reviewers team spec.

**Last updated:** May 5, 2026
**Last milestone:** BYOK + Settings restructure (shared-keys-ui branch) — unified team storage, UI component extraction, schema migration
**Next milestone:** Phase 9 (real-case Brokered as a new YAML)

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
Eliminated all hardcoded spec references and static registries. Three `crucible-v1` fallbacks removed from web app (form initialization, route validation, session resume). MCP `spec-registry.ts` rewritten from a static `SPECS` record to dynamic `readdirSync`-based discovery delegating to `@atta/engine`'s `listPublicSpecs()`; `validateAllSpecs()` added for startup fail-fast validation. All 7 YAML filenames and `id` fields stripped of `-v1` suffixes (D-025); ALIASES simplified to `a0`/`a1` only. Drizzle migration backfills `sessions.spec_id` column. `@vada/agent-metadata` package deleted and collapsed into `apps/vada-ai/web/src/components/agents/visuals/`. `customVars` Handlebars rendering added for `system_prompt` fields.

### BYOK + Settings restructure (`feat/shared-keys-ui`)
Settings page restructured: Teams tab removed (model selection moved inline to deliberation panel). `ProviderKeysSection` and `ApiKeysSection` extracted to `packages/ui/account/` as shared components. Ecosystem DB schemas (`providerKeys`, `userPreferences`) moved to `@atta/db`. Team agent model storage unified to a single localStorage key format `vada:team:<specId>` → `Record<agentName, string>` for all team types; stale DB seeding that caused revert-to-Claude bug removed.

### Phase 8 — Synthesis exposed to consumers
The engine already produced structured synthesis via terminal nodes; both MCP and web app consumers stripped the structured field at the boundary. Phase 8 exposes it:
- `vada__deliberate` returns `structured` alongside `content`; null when the spec has no output_schema (D-026)
- Web app SSE adds typed `synthesis_complete` events with both content and structured payloads
- `transcriptEntries` gains a `structured jsonb` column; synthesis and revision phases insert a transcript entry with structured populated
- `persistTurn` threads `structured` from engine output (AgentOutput.structured) through to DB
- Schema validation tightened: synthesis agent must exist in agents list; `output_format: structured` requires `output_schema`; declaring `output_schema` without `output_format: structured` is rejected
- Resolves OQ-A (caller decides per-call) and OQ-B (per-YAML choice; engine surfaces both)
No schema 2.0 required. The change is at the API boundary, not the spec language.

---

## What's parked

These exist but are NOT the product direction. They remain as historical artifacts or as configurations that ship for compatibility.

### Reviewer-chain teams (brokered-trio, brokered-quartet) — role-based, single-shot
Three reviewers (Strategist, Critic, Devil's Advocate) running in parallel for one round. No synthesis at the engine layer. Currently expressed as `brokered-trio.yaml`. This is a parked configuration, not the destination.

### Role-based deliberation as theory
The Strategist/Critic/Devil's Advocate role split was a theoretical decomposition. It has not been validated empirically against role-free configurations. The manual workflow that this project is modeled on does NOT use roles. Whether roles add value over role-free reviewer multiplication is an open empirical question deferred to Phase 12 (validation experiments).

### Single-round deliberation
Single-round deliberation is a structurally weaker approximation of what the manual workflow actually does (iterative refinement with synthesis between rounds, terminated by Principal). It ships in the current reviewer-chain YAMLs (`brokered-trio`, `brokered-quartet`) but is not the product target.

---

## What's in flight

Nothing currently. BYOK + Settings restructure just landed. Awaiting decision on next phase.

---

## What's next, sequenced

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

These were raised but not resolved. They need answers before being designed into the system.

### OQ-C: How does the engine express Principal-terminated loops?
Real-case Brokered terminates when the Principal says it's done, not after a fixed number of rounds. Requires engine extension. Could be: external loop control via Caller Claude (Principal continues by re-invoking) or engine-internal with a "continue?" callback.

### OQ-G: How are YAML forks named without the -vN convention?
D-025 dropped the `-v1` suffix convention. When `crucible.yaml` needs to be iterated (after benchmark data exists), what naming scheme is used for the fork? Semantic names (`crucible-extended.yaml`)? Numeric suffixes reintroduced on first fork (`crucible-v2.yaml`)? Date-based? The answer shapes catalog readability and comparison UX.

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
- `apps/vada-ai/specs/brokered-deliberation/` — `vada__consult` reviewer-chain specs
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
