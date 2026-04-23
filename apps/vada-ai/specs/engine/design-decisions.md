# Vāda Engine — Design Decisions

Locked decisions from Phase 0. Each entry records what was decided, why, and the concern it addresses.
Rationale references reviewer consensus from the 6 deliberation rounds that validated the API surface.

---

## Section 1: Core Architecture

**Three-layer decoupling (App / Engine / Adapter)**
The app layer owns Teams, questions, and how results are presented. The engine owns compilation — transforming Teams into Plans. The adapter owns execution — invoking LLMs and advancing ExecutionState. This separation means compilation logic lives once in the engine and is not duplicated across runtimes. Per Round 6 consensus, the adapter must remain dumb: if it starts making compilation decisions, every adapter diverges.

**Pure data plans (JSON-serializable)**
Plans are fully serializable to JSON. This enables storage, replay, MCP serving, offline inspection, and diffing across runs without any special serialization logic. Per Round 13 consensus, serializability is load-bearing for the MCP use case where plans are retrieved and executed by remote agents. Function fields (hooks, llmCall, questionFilter) are runtime-only and never part of the Plan structure.

**Engine as compiler, adapter as dumb runtime**
The engine contains all graph-construction logic: allocating revision nodes, wiring conditional edges, resolving template IDs. The adapter receives a complete Plan and executes it node-by-node. This avoids the trap where "smart" adapters encode different graph-traversal assumptions, making Vāda results non-reproducible across runtimes.

---

## Section 2: Template DSL (Handlebars)

**Handlebars over callbacks**
Callbacks cannot be serialized to JSON. Since Plans must be fully serializable (MCP, replay), template rendering must be data-driven, not code-driven. Handlebars templates are strings, round-trip through JSON, and can be stored alongside Plans.

**Handlebars over Mustache**
Revision prompts need conditionals: "{{#if isRevision}}Address the audit's critique…{{/if}}". Mustache has no conditionals. Handlebars is the minimal upgrade that adds them while remaining familiar and audit-friendly.

**Handlebars over Liquid**
Liquid adds significant surface area (filters, tag system, drop protocol) without benefit for this use case. Handlebars provides conditionals, loops, and helpers with a smaller footprint and better TypeScript tooling.

**HTML escaping disabled**
LLM outputs are trusted content — they are not user input and will never appear in a browser context where XSS is a concern. Disabling HTML escaping avoids corrupting agent responses that contain HTML tags, code, or angle brackets.

**Template validation at plan compile time**
Templates are validated when compile() runs, before any LLM call is made. This surfaces typos and missing variables early, at configuration time rather than mid-execution. validateTemplate() is the enforcement point; adapters are not expected to re-validate.

---

## Section 3: State Design

**ExecutionState vs TemplateState separation**
ExecutionState is normalized mutable state: the record of what has happened (outputs, execution order, status). TemplateState is a derived read-only projection computed for a specific node at a specific moment. Keeping them separate avoids duplicating derived views in the mutable state and makes the derivation logic a single auditable function.

**deriveTemplateState lives in the engine**
All adapters must call `deriveTemplateState(state, node)` to build the Handlebars context. If each adapter computed its own projection, subtle differences in how `lastOutputByAgent` or `currentRoundOutputs` are built would create non-reproducible behavior across runtimes. Centralizing the derivation makes the template contract a first-class specification.

**State projections**
`allPreviousOutputs` gives a flat ordered list; `outputsByAgent` and `lastOutputByAgent` give per-agent views; `outputsByRound` and `currentRoundOutputs` give round-scoped views; `auditOutputs` scopes to just the audit agent; `previousRevisions` isolates the current node's prior revision history. These projections cover the templating needs of all three workflow types without requiring templates to filter or sort raw data themselves.

**customVars is runtime-only, not in Plan**
Custom variables (API keys, caller context, feature flags) change per invocation and must not be baked into a stored Plan. They are passed separately at executePlan/deliberate call time and injected into templates as `{{customVars.X}}`. This keeps Plans reusable across callers with different runtime contexts.

---

## Section 4: Revision Loops

**Pre-allocation over true cycles**
Instead of a graph with a backwards edge (a true cycle), the compiler pre-allocates N distinct revision nodes for the terminal agent at positions `revision-0`, `revision-1`, …, `revision-N`. This makes the graph a DAG with no cycles, simplifying adapter implementation significantly. Adapters never need to track visit counts or handle cycle detection. The cost — slightly larger plans — is negligible at realistic revision counts (≤3).

**Dynamic terminal node resolution**
`PlanGraph` has no `terminalNode` field. The adapter determines the terminal node at the end of execution by scanning `executionOrder` in reverse for the last node with `role='terminal'`. This supports revision loops where the terminal agent may execute at `revision-0` or `revision-2` depending on how many cycles fired, without the compiler needing to predict which position will be last.

**No maxVisits on conditional edges**
`PlanConditionalEdge` has no `maxVisits` field. Pre-allocation means there are no cycles to limit — each revision path is a distinct node sequence. Adding maxVisits would be misleading (implying cycles exist) and unused (the revision ceiling is enforced by pre-allocation count).

---

## Section 5: Discriminated Unions

**RoundsWorkflow as a discriminated union**
When `auditAgent` is provided, `auditTemplate` and `revisionCondition` must also be present — they form a coherent feature set. Modeling this as a discriminated union (`RoundsWorkflowWithAudit | RoundsWorkflowNoAudit`) enforces this at compile time. Without the union, a config with `auditAgent` but no `auditTemplate` would be silently accepted and fail at runtime.

**JudgeConfig uses a type union**
V1 only supports `'pairwise-llm'`. Using `type: 'pairwise-llm'` as a discriminant means future judge strategies (rubric-based, embedding-cosine, human-in-the-loop) can be added as union members without breaking existing JudgeConfig values. This was the minimal future-proofing decision made in Round 7.

**Workflow uses a type union**
Three workflow types have fundamentally different shapes: `SoloWorkflow` has no config; `RoundsWorkflow` has rounds, templates, and optional audit; `CustomWorkflow` has a steps array. A union with a `type` discriminant makes switch exhaustion work correctly in the compiler and prevents invalid cross-type field access.

---

## Section 6: Revision Conditions

**Three condition types only**
The V1 condition set is minimal by design: `contains` (substring check), `json-field-equals` (exact match on a JSON path), and `json-field-truthy` (boolean check on a JSON path). These cover the observable patterns from the V1 benchmark runs without complexity overhead.

**No AND/OR compound conditions**
Compound conditions push logic into config that belongs in the audit agent's prompt. If the revision decision requires "field A equals X and field B is truthy", the audit agent's system prompt should produce a single clear signal (e.g. a `needsRevision` boolean). This keeps config declarative and keeps deliberation strategy where it belongs — in the prompt.

**Dot-notation over JSONPath**
JSONPath (`$.result.verdict`) is more powerful but requires a parser library and has browser compatibility concerns. Dot-notation (`result.verdict`) is sufficient for V1 use cases and is trivially implementable. This decision was reviewed in Round 4 and held: no use case for array subscripts or recursive descent was identified.

---

## Section 7: Experiment Structure

**Variants as array (N-way ablations)**
Experiments take a `variants: ExperimentVariant[]` rather than a fixed A/B pair. This enables three-way and four-way comparisons (e.g. baseline vs 2-round vs 3-round vs 3-round-with-audit) in a single experiment run. Per Round 7 Deliberation Ladder design, the evaluation framework must support ablation studies across workflow configurations.

**Pairwise judging in V1**
All comparisons are pairwise: for N variants, N*(N-1)/2 pairs are judged independently. This follows standard NLP evaluation conventions (MT benchmark, Chatbot Arena) and avoids N-way prompt design which introduces variant-ordering bias. With N=2 (the common case), pairwise and N-way are identical.

**Wilson score CI over normal approximation**
`aWinRateCI95` uses Wilson score confidence intervals rather than the standard normal approximation (p ± z*sqrt(p(1-p)/n)). The normal approximation breaks down at extreme win rates (>90% or <10%) — exactly the range where Vāda vs baseline comparisons are likely to land. Wilson score is robust across the full [0,1] range.

**Raw data retention**
`ExperimentResult` includes the full `runs` array and full `verdicts` array alongside the aggregated `variantSummaries` and `pairwiseComparisons`. Aggregates are lossy — retaining the raw data enables re-aggregation, per-question analysis, and reproducibility audits without re-running the experiment.

---

## Section 8: No Versioning in Names

**Agents and Teams named by function, not iteration**
`SkepticalAuditor`, not `SkepticalAuditorV2`. `EthicsTeam`, not `EthicsTeamJan2025`. Git tracks which version of an Agent definition was used in a given commit; embedding version numbers into names creates divergence between the git record and the code. This convention was established in Round 1 and held throughout the design.

**schemaVersion on data types, not name types**
`Plan`, `Corpus`, `Experiment`, and `ExperimentResult` carry a `schemaVersion` literal field because these types are stored and transmitted as JSON documents. Schema versions enable readers to reject or migrate documents with incompatible shapes. Names like `Agent`, `Team`, and `Workflow` are configuration-level types that live in code, not documents, and do not need schema versioning.

---

## Section 9: Phase 2 Implementation Decisions

*Decisions surfaced during Task 8 — V1 Crucible port to `@atta/engine` + `@atta/adapter-langgraph`.*

**LangChain Anthropic wrapper bypassed in the LangGraph adapter**
`@langchain/anthropic` v0.3.x defaults `topP` to `-1` internally and includes it unconditionally in API requests. The Anthropic API rejects this value. After confirming the issue was a library default (not a fixable constructor option for the models in use), the decision was made to bypass `ChatAnthropic` entirely and make LLM calls directly through `@anthropic-ai/sdk`. The LangGraph state machine (`@langchain/langgraph`) is still used for graph orchestration. Direct SDK calls give full control over request parameters, eliminate opaque defaults, and remove a dependency that was adding noise without benefit. The cost is that LangChain's retry logic, streaming helpers, and structured output wrappers are no longer available automatically — these are implemented directly as needed. Provider substitution (e.g. to OpenAI) requires a direct SDK integration per provider rather than a LangChain adapter swap. Revisit if `@langchain/anthropic` addresses this in a stable release or if a second provider creates pressure for a unified abstraction. *File: `packages/adapter-langgraph/src/llm.ts`*

**Two-synthesizer pattern for V1 Crucible**
V1 Mastra had one Synthesizer agent that ran both in rounds and as the terminal node, switching behavior via a `CONCLUSION_MODE_PROMPT` injection. The engine port splits this into two agents: `Synthesizer` participates in each deliberation round and produces plain-text synthesis; `ConclusionSynthesizer` runs only as the terminal node and carries an `outputSchema` that produces a structured conclusion JSON. The split reflects genuinely different roles — round synthesis is exploratory and comparative, terminal synthesis is committed and structured. Collapsing them into one agent required prompt injection to change the role at runtime, which obscures the intent. This pattern generalizes: when an agent's role changes based on its position in the graph, splitting it into two named agents is preferred over runtime prompt switching. *Files: `apps/vada-ai/web/src/examples/agents/synthesizer.ts`, `apps/vada-ai/web/src/examples/agents/conclusion-synthesizer.ts`*

**Revision condition keyword-based for V1 behavior parity**
V1's `classifyVerdict` function triggered revision when BlindCritic's output contained "FLAG". The port uses `revisionCondition: { type: 'contains', value: 'FLAG', caseSensitive: false }` — a direct translation. The engine supports structured JSON audit output (`json-field-equals`, `json-field-truthy`), but that was not used here. Upgrading BlindCritic to produce structured output during a port introduces a confound: it becomes impossible to distinguish infrastructure changes (adapter, graph topology) from quality changes (audit signal fidelity). Behavior parity during Phase 2 keeps the V1 benchmark results directly comparable. Whether structured audit output improves revision quality is a Phase 6 research question. *File: `apps/vada-ai/web/src/examples/teams/crucible.ts`*
