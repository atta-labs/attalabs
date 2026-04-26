# Atta Labs — Concept Document

**Status:** Concept / future work
**Date captured:** April 26, 2026
**Supersedes:** `vada-calculator-concept.md` (the cost calculator becomes one feature inside Atta Labs)

---

## Why this document exists

The cost calculator concept was originally framed as a Vāda feature. That framing was wrong. The calculator operates on a YAML, compiles it via `@atta/engine`, and walks the resulting Plan to estimate cost. None of that is Vāda-specific. Any consumer of the engine (Vāda today, Vitakka tomorrow, third-party YAMLs ever) benefits equally.

The calculator is one feature inside a broader engine-level surface. That surface is Atta Labs.

This document captures what Atta Labs is, why it exists separately from Vāda, and how it grows.

---

## What Atta Labs is

Atta Labs is a developer/researcher surface for the `@atta/engine` itself. Independent of Vāda. Independent of any specific deliberation product.

The core proposition: **give Atta Labs a YAML, get back insight into what the engine does with it** — without spending API tokens, without committing to a product surface, without wiring through Vāda.

Initial scope (V0):
- Paste a YAML or select from a catalog
- See the compiled Plan visualized as a graph (nodes = agents/synth/audit, edges = control flow)
- See validation errors inline if the YAML is malformed
- See cost estimate per Plan
- See benchmark history per YAML (pulled from whatever benchmark data exists)

Not part of V0 (later):
- YAML editor with live re-render
- Plan diff (compare crucible-v1 to crucible-v2 visually)
- Quality score overlay on the cost-quality frontier
- Sharing / publishing YAMLs
- LLM-based "explain this YAML" or "suggest improvements"
- Live test runs from the Labs UI (run a deliberation against a cheap model and watch the transcript stream into the visualization)

---

## Why this is engine-surface, not Vāda-surface

Three reasons.

**1. Coupling discipline.** The engine has a hard rule: zero coupling to Vāda. Building visualization or cost tooling inside Vāda would inevitably leak Vāda assumptions into the engine — Vāda-shaped node renderers, Vāda-shaped cost models, Vāda-shaped benchmark records. Building it as a separate consumer of the engine forces clean separation. If Atta Labs is hard to build, the engine's API has hidden Vāda-coupling that needs fixing. The pressure-test is itself valuable.

**2. The engine has multiple consumers.** Today: Vāda's web app, Vāda's MCP server, verify scripts. Tomorrow: Vitakka, future Atta-app, third-party MCP integrations. Every consumer wants to inspect YAMLs, estimate costs, see plans. Building these tools inside Vāda makes them invisible to other consumers. Building them at the engine layer makes them universally available.

**3. Audience.** Vāda's audience is decision-makers using deliberation as a product. Atta Labs' audience is engineers, researchers, YAML authors — people writing or evaluating deliberation configurations. Different goals, different UX, different surface. Mixing them inside Vāda's UI dilutes both audiences.

---

## Naming

`Atta Labs`. No Pāli name because it's tooling, not a deliberation product. Naming rule holds: Pāli name = Attā built it AND it's a deliberation product surface. Atta Labs is engine-level developer infrastructure, not a deliberation product. The word "Labs" signals experimentation, internal tooling, the workshop where the engine is examined.

URL eventually: `labs.atta.ai`. For dev: `apps/atta-labs/` as a Next.js app inside the monorepo, served from a separate port.

---

## Phase 1: the flow visualizer

The first feature is the Plan visualizer. Detailed because it's the foundation everything else builds on.

### What it does

User pastes a YAML (or selects one from `listPublicSpecs()`). Atta Labs:

1. Calls `loadSpec(yaml)` from `@atta/engine`. If validation fails, shows the Zod error inline highlighting the problem.
2. Calls `compileSpec(spec, sampleQuestion)` to produce a Plan.
3. Renders the Plan as an interactive graph.

### Visual conventions

Each node renders as a card showing:
- Agent name (PascalCase from the YAML)
- Role / classifier mode (auto, skip, always_tools — color-coded)
- Tools attached (badges: web_search, web_fetch, etc.)
- Model (from spec defaults or per-agent override)
- Click to expand: full system_prompt, output schema if structured

Node types are visually distinct:
- Round agents — squared cards with round number badge
- Synthesizer — circular/rounded, distinct color, shows it's a commit point
- Auditors — distinct shape (e.g., diamond) signaling check/review
- Entry / exit — minimal markers

Edges:
- Solid arrows for sequential flow
- Dashed for conditional (revision triggers)
- Labels on conditional edges (e.g., "if FLAG")

### Layout

Rounds-based YAMLs lay out vertically: round 0 → round 1 → round 2 → synthesis → audit → done. Round agents fan out horizontally within each round (parallel execution). Reviewers-based YAMLs lay out as a fan: entry → N reviewers in parallel → exit.

`dagre` or `elkjs` handles auto-layout. Manual override available.

### Tech

- **React Flow** (`@xyflow/react`) for the canvas. Native React, custom node components, good for DAGs.
- **dagre** for auto-layout. **elkjs** as a future alternative if dagre is too rigid.
- **Tailwind v4 + shadcn** for node styling, matching the Atta ecosystem visual language.
- A `PlanToReactFlow` mapper: pure function, plan.nodes → RF nodes, plan.edges → RF edges. Lives in `apps/atta-labs/src/lib/plan-to-flow.ts`.
- Server component reads `listPublicSpecs()` for the catalog dropdown; YAML paste is fully client-side.

No backend logic needed for V0 beyond reading the YAML catalog. Compilation is pure (engine is a pure library), so it can run client-side or server-side.

### Why visualizer first, not calculator first

Three reasons:

1. The visualizer is a forcing function: rendering a Plan reveals whether the Plan structure is comprehensible. If the visualizer is hard to read, the Plan is structurally unclear, which is a problem for the engine's design, not for the visualizer.
2. The cost calculator depends on walking the Plan. Visualizer code IS the walker. Calculator becomes overlay on top of an existing walk, not a separate walk.
3. Visualization helps onboard YAML authors faster than cost data does. Cost matters once you know what your YAML does. Visualization helps you understand what your YAML does in the first place.

---

## Phase 2: the cost calculator (was Vāda calculator concept)

Once the visualizer exists, cost overlays trivially.

For each node in the rendered Plan, attach an estimated cost based on:
- The agent's model (lookup from a price catalog)
- Estimated input tokens (system_prompt size + brief size + prior responses for that round)
- Estimated output tokens (configurable defaults per role, e.g., reviewer = ~500, synthesizer = ~800; later: from benchmark data)

Show estimated cost per node, aggregated cost for the Plan, range (min/max based on output variance).

### Math sketch (preserved from the original calculator concept doc)

```
total_cost = sum across all agents of:
  (input_tokens × input_price_per_token_for_their_model)
  + (output_tokens × output_price_per_token_for_their_model)

where for each agent:
  input_tokens = brief_size + (round - 1) × prior_responses_size + system_prompt_size
  output_tokens = expected_output_size
```

### Required ingredients

- Token-counting utility (`@anthropic-ai/sdk` has one; `tiktoken` for OpenAI; provider-specific for others)
- Model price catalog: `model-prices.json` updated periodically; never hardcoded
- YAML parser → already exists (`loadSpec`)
- Plan walker → already exists (the visualizer)
- Cost summation that respects the Plan structure (rounds × agents × audit/synthesis phases)

### Output format

```
Estimated cost: $0.06 - $0.18
Breakdown per node visible on hover.
Plan total: $0.06 - $0.18
Tokens: ~3,600 input + ~1,200 output
Best case (concise responses): $0.04
Worst case (verbose responses): $0.18
```

Ranges matter. Point estimates mislead.

### YAML schema implication: token expectations

Two design choices on whether YAMLs declare expected tokens:

**Option A (preferred): YAML doesn't include token expectations.** Calculator infers from defaults or from observed benchmark data. Pre-benchmark YAMLs use defaults. Post-benchmark YAMLs use actual observed token counts. Accuracy improves with usage.

**Option B: YAML explicitly declares expected token ranges per agent.** More accurate up front but more verbose.

Recommendation: Option A — keep YAMLs simpler, let benchmark history inform the calculator.

### Pre-run vs post-run

- Pre-run estimate: from the Plan walk, before any LLM call
- Post-run actual: from the API response, source of truth
- UI labels these distinctly. Never conflates.

---

## Phase 3: benchmark history per YAML

For YAMLs with `benchmarked: true`, show:
- Run count
- Aggregate quality scores (cost-per-quality, marginal cost of improvement)
- Cost-quality frontier — chart all benchmarked YAMLs on (cost, quality) axes; show Pareto-optimal configurations
- Per-run drill-down: link to the specific deliberation transcript (in Vāda's dashboard) when a benchmark run came from Vāda

Pulled from whatever benchmark database exists at the time. Initially this is `benchmark_runs` (the table introduced in Phase 6.5). When non-Vāda consumers run benchmarks, they write to the same table, and Atta Labs aggregates across consumers.

---

## Phase 4 and beyond

- **Plan diff.** Side-by-side render of crucible-v1 vs crucible-v2. Highlights structural differences (added/removed agents, prompt changes, classifier mode changes). Pairs with the immutability principle (D-018) — fork-don't-edit makes diff a meaningful operation.
- **YAML editor.** In-browser editor with syntax highlighting, Zod-driven validation, live re-render of the Plan as you type. Useful for YAML authors. Builds on the visualizer's compile loop.
- **Quality overlay.** When benchmark data exists, overlay quality scores on the cost-quality frontier directly inside the visualizer.
- **Live test runs.** Run the YAML against a cheap model (claude-haiku) and stream the transcript into the visualization. Each node fills in as the agent responds. This is essentially the verify-script experience as a UI.
- **Sharing / catalog.** Publish YAMLs publicly with their benchmark data attached. The deliberation marketplace concept from the original calculator doc lives here, not in Vāda.
- **LLM-assisted YAML authoring.** Generate YAMLs from natural-language descriptions; suggest improvements. Last priority — it's a productized convenience, not foundational tooling.

---

## What this changes about ecosystem positioning

Before this doc:
- Engine and Vāda were conceptually entangled at the surface layer (no non-Vāda surface exposed engine internals)
- Calculator was framed as a Vāda feature
- "Where do YAMLs come from / how do users explore them?" had no clean answer

After this doc:
- Engine has a first-class non-Vāda surface (Atta Labs)
- Calculator is one feature inside a broader Labs vision
- YAML exploration, authoring, comparison all live at the engine layer where they belong
- Vāda gets to focus on being a deliberation product without absorbing tooling concerns
- Future engine consumers (Vitakka, third-party) get tooling for free

This aligns with Recognition 1 (Vāda is a YAML-driven runtime). The runtime has tooling around it. The tooling is engine-level. Vāda is one consumer of both.

---

## Sequencing

Where Atta Labs fits in the broader roadmap:

1. ✅ Phase 7.2 — YAML refactor (engine accepts YAML)
2. ✅ Phase 7.2.1 — YAML catalog loader
3. 🔄 Phase 7.3 — Complete YAML migration (in flight at the time of this writing)
4. Phase 8 — Synthesizer integration
5. Phase 9 — Real-case Brokered as YAML
6. Phase 10 — Benchmark architecture redesign
7. **Atta Labs Phase 1 (visualizer)** — fits well after Phase 8 lands; benchmark architecture (Phase 10) doesn't block it
8. **Atta Labs Phase 2 (calculator)** — overlay on visualizer; can ship same time or shortly after
9. **Atta Labs Phase 3 (benchmark history)** — depends on Phase 10 for meaningful data
10. Phase 11 was originally "YAML cost calculator" — redirects to Atta Labs Phase 2; Phase 11 in `vada-state.md` should be updated or retired
11. Phase 12 — Validation experiments

The original Phase 11 entry in `vada-state.md` should be reframed: not a Vāda feature, but a contribution to Atta Labs. The plan-update brief that runs after Phase 7.3 should note this.

---

## Cautions

**1. Don't build before Phase 7.3 lands.** Atta Labs depends on `listPublicSpecs()` being callable from a non-MCP-server location, which is a Phase 7.3 deliverable. Building Labs concurrently risks coupling to wherever the registry lives during the migration.

**2. Resist Vāda-shaped assumptions.** Even node visualization conventions can leak Vāda assumptions (e.g., "Synthesizer is always a single node"). For Atta Labs to be honestly engine-level, every UI affordance must work for any YAML, not just the seven currently in the catalog. The codebase test: try rendering a hypothetical YAML with no synthesizer, no audit, twelve agents in one round. Does it work? If no, Vāda-coupling has crept in.

**3. The engine is a pure library.** Atta Labs runs `compileSpec` to render Plans. This must be possible client-side (no Node-only deps in engine). If the engine has accumulated server-only dependencies, Phase 7.3 or earlier introduced them — flag and fix.

**4. Pricing data drifts.** Provider prices change. The `model-prices.json` catalog needs an update process. Don't hardcode in Labs code.

**5. Benchmark data can mislead pre-Phase-10.** The benchmark architecture flaw (judges raw transcripts, not synthesized output) means pre-Phase-10 scores are not directly comparable across configurations. Atta Labs Phase 3 should clearly mark which benchmark records are pre-Phase-10 and treat them as informational only.

---

## Implementation notes for whoever builds this

- New Next.js app at `apps/atta-labs/`. Tailwind v4, shadcn (existing `@atta/ui` components reused), follows the same monorepo patterns as `apps/vada-ai/web/`.
- Server-side reads spec catalog via `listPublicSpecs()` (post-Phase-7.3 location, likely `@atta/engine` or `@atta/spec-registry`).
- Client-side renders React Flow. SSR-safe with dynamic imports for the canvas.
- Routes:
  - `/` — landing page, brief intro, link to catalog
  - `/specs` — catalog browser (one card per public YAML)
  - `/specs/[id]` — single YAML page (visualizer + metadata + later: cost + benchmarks)
  - `/paste` — paste-a-YAML mode for ad-hoc inspection
- Shared types from `@atta/engine` (DeliberationSpec, Plan, etc.). No re-implementation of Plan walking — use the engine's own utilities.
- Validation errors render as inline annotations on the YAML, using the Zod error path to highlight the offending key.
- Authentication: probably none for V0. Public read-only access to the catalog. Adding auth comes when sharing/publishing user YAMLs becomes a feature.

---

## Why this doc exists separately from `vada-calculator-concept.md`

The original calculator concept is preserved in this document where its substance still applies (math sketch, schema implications, cautions). The home is different (Atta Labs, not Vāda) and the scope is broader (visualizer + calculator + benchmarks + future tooling).

`vada-calculator-concept.md` should be marked superseded by this document. The plan-update brief that runs after Phase 7.3 can handle that — note `vada-calculator-concept.md` as historical, point readers here.

The original concept emerged on April 25, 2026 in a session where the realization "Vāda is a YAML-driven runtime" had just landed. The concept naturally extended to "and the runtime needs tooling around it." That tooling, now properly framed, is Atta Labs.

The lesson worth preserving: when a feature concept emerges that operates on engine primitives (YAMLs, Plans, agents), the right home is rarely the consumer product (Vāda). It's almost always engine-level tooling. Default to that framing; let the consumer-product framing be a conscious exception, not the default.
