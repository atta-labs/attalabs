# Vāda — Product Recognitions

**Date captured:** April 25, 2026
**Status:** ratified

---

## Purpose of this document

This document captures the recognitions about what Vāda actually is — recognitions that emerged across many sessions but were not previously written down in one place. The Phase 7.2 session in particular surfaced these understandings clearly enough to commit them to persistent record.

Each recognition shapes the architecture and roadmap. Together they define Vāda's product identity.

This document is foundational. It is referenced by the state document, the decisions log, and skill files. Update it only when a recognition itself changes — not when implementation details around it change.

---

## Recognition 1: Vāda is a YAML-driven deliberation runtime, not a closed app

### What this means

Vāda's product is not a UI. It is not a chat experience. It is not a deliberation engine offered as a service. It is a deliberation runtime that any application can invoke by passing a YAML configuration.

The pattern is:
1. A consuming application (Claude Desktop, Cursor, custom apps, vada.ai's own UI) decides a deliberation should happen
2. The application picks or composes a YAML describing the deliberation
3. The application invokes Vāda via MCP, passing the YAML and the question
4. Vāda's engine runs the YAML and returns the result
5. The consuming application presents the result to the user as fits its UX

Vāda's value lives in the engine + the YAML catalog + the benchmark data. Surfaces (the vada.ai web app, third-party integrations, custom apps) are consumers of this platform, not Vāda itself.

### Why this matters

Treating Vāda as an app constrained the product. Adding a new deliberation mode meant building TypeScript code, deploying it, exposing it through the UI. Other applications could not benefit from new modes without Vāda doing engineering work.

Treating Vāda as a runtime inverts this. Adding a new deliberation pattern is creating a YAML file. Other applications can use any YAML by passing it via MCP. The platform is open by construction.

This also changes what gets prioritized. The most valuable artifacts to develop next are not features in the UI. They are high-quality YAMLs that solve specific deliberation needs. The catalog is the product.

### How this manifests in the codebase

- Engine has zero branches on workflow type or mode (Phase 7.2)
- All deliberation configuration lives in YAML files in `packages/agents/vada-deliberation/yamls/`
- MCP receives full YAML content per call (consumers can pass any YAML, not just registered ones)
- The vada.ai web app's deliberation runner uses the same YAML mechanism as third-party MCP consumers — there is no privileged path

**Date strengthened: April 26, 2026 (Phase 7.3)** — Three hardcoded `crucible-v1` fallbacks were removed from the web app and MCP server. The MCP spec-registry was rewritten from a static SPECS object to dynamic `readdirSync`-based discovery. The catalog is now the single source of truth at all layers — adding a new YAML file is sufficient to make it discoverable, with no code change required.

### What this implies for the future

- Multiple consuming applications (Claude Desktop, Cursor, custom Vāda surfaces) are all first-class
- A user with a recurring decision type might write their own YAML tuned for it
- YAMLs themselves are publishable, shareable, comparable artifacts
- Product positioning is "deliberation infrastructure" not "deliberation product"

---

## Recognition 2: Synthesis is the product, not a side effect

### What this means

The user-visible output of deliberation is not the reviewer responses. It is the synthesis of those responses — the convergence table, the divergence map, the new ideas that emerge from the combination, the gaps no individual reviewer addressed, the proposed solution drawn from the analysis.

The reviewer responses are inputs. The synthesis is the deliverable.

### Why this matters

In Phase 6 / 6.5 / 6.7, the initial reviewer-chain teams (`brokered-trio`, `brokered-quartet`) were built without synthesis as an engine-layer concept. Synthesis was relegated to "the consuming Caller Claude does it" — documented in the tool description, not produced by Vāda itself. This decision was inherited from earlier architectural discussions and not questioned closely.

In Phase 6.7's smoke test, this surfaced as a structural problem. The benchmark judged the raw transcript (three independent reviewer outputs) against a single-shot polished baseline. The raw transcript lost on coherence and length efficiency. This was not a prompt problem — it was a measurement problem: we were measuring the wrong artifact. The artifact that mattered (synthesized output) wasn't being measured because it wasn't being produced by Vāda at all.

The recognition: if synthesis is the deliverable, it cannot live outside the system. If we delegate synthesis to consuming applications, we get inconsistent quality, inconsistent format, and we cannot benchmark our actual product.

### How this manifests going forward

Phase 8 makes synthesis a first-class engine concept:
- Every YAML must include a synthesizer configuration (mandatory, not optional)
- The synthesizer is an agent like any other — it has a prompt, a model, an output structure
- Synthesizer output is what gets returned to consumers
- Consuming applications can augment with their own context, but they receive a fully synthesized analysis, not raw inputs

Phase 10 redesigns the benchmark to measure synthesizer output, not raw transcript. Apples-to-apples comparison against single-shot baseline.

### What this implies for the future

- The synthesizer's prompt is core IP, equal in importance to reviewer prompts
- Different YAMLs can specify different synthesizer behaviors (different output structures for different use cases)
- The synthesizer becomes a primary lever for improving deliberation quality
- "Better synthesis" is a meaningful product roadmap line, not a UI feature

---

## Recognition 3: Real-case reviewer teams are the actual product direction; current `brokered-trio` / `brokered-quartet` are parked configurations

### What this means

The reviewer-chain YAMLs that ship in Phase 7.2 (`brokered-trio.yaml`, `brokered-quartet.yaml`) are not the destination. They are parked configurations that ship for compatibility and to enable benchmarking comparison.

The actual product direction — "real-case Brokered" — is structurally different:
- **Multi-round, not single-shot.** Reviewers respond, are seen, can be addressed, can refine.
- **Role-free.** No predetermined Strategist/Critic/Devil's Advocate decomposition. Reviewers are themselves; differentiation comes from notes/instructions/models, not from canned roles.
- **Principal-terminated.** Deliberation continues until the Principal decides it's done. Not a fixed-N round count.
- **Synthesis between rounds.** Each round produces convergence/divergence analysis that informs the next round.
- **Synthesis-mandatory.** Every round has synthesis. No raw transcripts.

### Why this matters

The manual workflow that Vāda is modeled on is itself a "real-case" deliberation. The Principal opens conversations with multiple AI assistants, pastes responses across them, synthesizes via a chat AI with full conversation context, and continues until satisfied. This workflow has been used for months and produces output the Principal trusts.

The initial `brokered-trio` / `brokered-quartet` YAMLs are an attempt to externalize this workflow. The externalization made several compromises for engineering tractability:
- Roles were introduced because differentiation via prompts was easier than via models
- Single-round was chosen because parallel orchestration was complicated
- Synthesis was delegated because building a synthesizer was deferred

Each compromise was defensible at the time. Together they built something that does NOT replicate what works empirically.

The recognition: keep what we built (it's valuable infrastructure and ships as a parked configuration), but don't mistake it for the destination. The product target is the real-case team.

### How this manifests going forward

Phase 9 defines `brokered-real-case.yaml` as a new YAML:
- Multi-round flow with explicit round structure
- Role-free reviewer specifications (or with optional role decoration if the YAML chooses)
- Synthesizer-between-rounds defined in flow
- Termination condition: Principal-decides (requires engine extension for this)

This is a separate YAML, not a modification of `brokered-trio.yaml`. The trio remains immutable.

### What this implies for the future

- `brokered-trio` / `brokered-quartet` and the real-case YAML ship side by side
- Users (and Caller Claude) can pick which to use per question
- Benchmark history accumulates separately for each
- The cost-quality comparison between them is a real research question
- Multiple YAML variants of real-case may emerge (different round counts, different synthesizer prompts)

---

## Recognition 4: Roles are theory, not validated practice

### What this means

The Strategist / Critic / Devil's Advocate decomposition was a theoretical attempt to engineer cognitive diversity through role assignment. The hypothesis was: assigning each agent a different role with a different system prompt would produce more diverse perspectives than running multiple identical agents.

This hypothesis has not been empirically validated. The manual workflow that Vāda is modeled on does NOT use roles. The Principal pastes the same question to different AI models (Claude, Gemini, GPT, Grok), and differentiation comes from the models themselves, not from imposed roles.

### Why this matters

Phase 6.7 spent significant effort tuning role-based prompts. The smoke test results were not strongly conclusive about whether roles were the problem or whether other factors dominated. We do not yet know:
- Do roles add value over identical reviewers?
- Do roles add value over differentiation by model (Claude / Gemini / GPT)?
- Is role-based deliberation strictly worse, strictly better, or context-dependent?

Treating roles as validated leads to optimizing prompts within a paradigm that may itself be wrong. Treating roles as a hypothesis leads to designing experiments that test the hypothesis directly.

### How this manifests going forward

- Real-case Brokered (Phase 9) ships as role-free
- Phase 12 (validation experiments) treats roles as a variable to test, not a fixture
- Stratified test corpus runs both role-based and role-free YAMLs
- The empirical question: in which conditions (if any) do roles help?

### What this implies for the future

- Future YAMLs may experiment with: roles, no roles, model-differentiated reviewers, mixed-model teams, single-model teams with different prompts
- The product roadmap doesn't pick a winner up front. It runs the experiment.
- The cost-quality frontier across configurations becomes the empirical answer

---

## Recognition 5: YAMLs are immutable once benchmarked; iterate by forking

### What this means

When a YAML file has been benchmarked (i.e., has accumulated benchmark run data linking back to that exact configuration), it must not be modified. Iteration happens by forking — copying the YAML to a new file with a new `id`, modifying the copy, and benchmarking the new version.

Benchmark history accumulates per YAML file as the historical record of that configuration's performance.

### Why this matters

Without immutability, benchmark data corrupts. If `crucible-v1.yaml` had a bug fixed mid-way, benchmark runs from before the fix and after the fix would average together as if they were the same configuration. Cross-comparison becomes meaningless.

With immutability, every benchmark run links to a precise configuration. Comparing `crucible-v1` to `crucible-v2` becomes a clean question with a clean answer. The cost-quality frontier across configurations is meaningful.

This also enforces clear thinking. Modifying an existing YAML implies "this is now a different version of the same thing." Forking implies "this is a new configuration to compare." The latter framing is more honest about what's happening.

### How this manifests going forward

- Each YAML has a unique `id` field matching its filename
- Benchmark records reference YAML files by their full id
- A `benchmarked: true` flag (in YAML or external registry) marks files that should not be modified
- Forks produce new files with new ids; old files remain in repo

A dedicated principle document, `vada-yaml-immutability-principle.md`, expands on this.

**Date revised: April 26, 2026 (Phase 7.3 / D-025)** — The `-v1` / `-vN` naming convention was dropped. YAML files are now named semantically without version suffixes (`crucible.yaml`, not `crucible-v1.yaml`). The core immutability principle (once benchmarked, do not modify; iterate by forking) is unchanged. The naming convention section of `vada-yaml-immutability-principle.md` is superseded.

### What this implies for the future

- The YAML catalog accumulates over time. Old YAMLs don't disappear; they become historical records.
- A user picking a YAML can see its full benchmark history (cost, quality, when it ran, what conditions)
- Comparing patterns across YAMLs is a meaningful product feature (cost-quality frontier)
- "Versioning" of deliberation patterns is data, not code

---

## Recognition 6: The benchmark architecture has a structural limitation

### What this means

The current benchmark (Phase 6.5 infrastructure) judges raw transcripts — concatenated reviewer outputs. It does not judge what users actually receive (the synthesized output, possibly augmented by the consuming application's context).

This is a structural mismatch. The benchmark cannot fairly compare Vāda against single-shot baselines because the baseline produces a polished synthesized answer while Vāda's "output" in the benchmark is unpolished raw input.

### Why this matters

Phase 6.7 smoke tests revealed this. Results showed Brokered losing to single-shot baselines, scoring poorly on coherence and length efficiency. Sonnet's diagnosis was correct: "Until the Caller Claude synthesis step is part of what gets judged, brokered will be structurally disadvantaged."

This is a measurement problem, not a product problem. Fixing the measurement (Phase 10) is necessary before the benchmark produces meaningful comparison data.

### How this manifests going forward

Phase 10 redesigns the benchmark:
- Judge measures full synthesizer output (convergence/divergence/proposed-solution structure)
- Optionally includes Caller Claude augmentation if applicable to the use case
- Compares this synthesized output against single-shot baselines on the same criteria
- Per-YAML benchmark history accumulates against this fairer measurement

This requires Phase 8 (synthesis as first-class component) to be in place — there must be a synthesizer producing measurable output before the benchmark can judge it.

### What this implies for the future

- Pre-Phase 10 benchmark data is not directly comparable to post-Phase 10 data
- Pre-Phase 10 data is still useful for: infrastructure validation, cost trends, latency trends
- Post-Phase 10 data becomes the basis for product claims about quality
- The benchmark itself is part of the platform; its design quality matters as much as the engine's

---

## How these recognitions interact

The six recognitions are not independent. They form a coherent picture:

1. Vāda is a runtime → consumed by many surfaces → each surface needs a complete deliverable from Vāda → the deliverable is synthesis (Recognition 2)
2. The deliverable is synthesis → synthesis must be in the engine → Phase 8 (synthesis first-class)
3. The product target is what the manual workflow does → real-case is multi-round, role-free, synthesis-between-rounds → Phase 9 (real-case YAML)
4. Roles are theory → don't optimize within unvalidated theory → ship parked role-based + experiment with role-free → Phase 12 (validation)
5. Configurations are YAMLs → many will be tried → tracking what works requires immutability → fork-not-modify principle
6. Comparison requires measuring the right thing → current benchmark measures wrong thing → Phase 10 (benchmark redesign)

Together: Vāda is a YAML-driven runtime where synthesis is the product, where the YAML catalog accumulates as immutable artifacts with benchmark history, where the empirical question of which configurations work is open and being investigated, and where the current shipped reviewer-chain YAMLs (`brokered-trio`, `brokered-quartet`) are starting points already known to be parked configurations en route to the real-case team.

---

## How to update this document

These recognitions are foundational. They should not change frequently. Update only when a recognition itself shifts — not when implementation details around it shift.

Examples of when to update:
- A recognition is invalidated by evidence (e.g., experiments show roles DO add value robustly — Recognition 4 changes)
- A new recognition emerges that's at the same level (a new "what Vāda actually is" insight)
- A recognition is refined into a sharper statement

Examples of when NOT to update:
- New phase ships (update `vada-state.md` instead)
- New YAML created (update YAML catalog references)
- Open questions resolved (update `vada-decisions.md` or `vada-state.md`)

When updating: add a "Date revised" entry under the affected recognition with a one-paragraph note on what changed and why. Keep the original text unless it's outright wrong; recognitions evolve, and the evolution itself is signal.
