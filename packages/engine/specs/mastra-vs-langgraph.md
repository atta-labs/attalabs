# Atta Engine — Mastra vs LangGraph Executor Choice

**Date captured:** April 26, 2026
**Status:** Architectural rationale document. Persistent.
**Companion documents:** `engine-layer-rationale.md` (why an engine layer exists), `engine-future-capabilities.md` (capability roadmap)

---

## Why this document exists

In Phase 1 (February 2026), Mastra was removed and LangGraph became the sole deliberation execution path. The decision was captured as D-001 with a one-paragraph rationale, and the audit doc (`vada-legacy-mastra-audit.md`) inventoried what was being replaced. But the "why LangGraph and not Mastra" comparison was never written up as a standalone document.

In April 2026, the question came up again: Mastra had Workflows, which sound like what `@atta/engine` does. Did the choice hold up? Will LangGraph carry the ecosystem (Vāda + Vitakka + future products) the way Mastra was supposed to?

This document captures the comparison properly. Both for the historical record (so the choice is justifiable months from now) and for periodic re-evaluation (this should be revisited if LangGraph changes character or if a new contender emerges).

---

## The comparison at a glance

|  | Mastra (early 2026, when removed) | LangGraph (April 2026) |
|---|---|---|
| **Authoring** | TypeScript builder API (`createWorkflow().then(...)`) | TypeScript graph builder (`StateGraph().addNode().addEdge()`) |
| **Workflow representation** | Live JS object with closures | Compiled graph object (also runtime, but supports streaming and time-travel) |
| **Parallel execution** | Limited — was blocking for Vāda | First-class via concurrent edge execution |
| **State management** | Workflow-scoped, less explicit | Typed state schema (TypedDict / Annotation), explicit reducers |
| **Conditional routing** | Branch DSL | `addConditionalEdges` with full predicate flexibility |
| **Memory (short-term)** | Memory primitives existed but were Vitakka-shaped, not used by Vāda | Thread-scoped state via checkpointers; built-in |
| **Memory (long-term)** | Memory primitives existed | Cross-thread Store with namespacing; first-class |
| **Persistence / checkpointing** | Optional | First-class, automatic per node, multiple backends (PostgreSQL, Redis, SQLite) |
| **Time-travel debugging** | Not native | First-class — list checkpoints, replay from any prior state |
| **Human-in-the-loop** | Possible but custom | First-class via `interrupt()` |
| **Tool execution** | Tool abstraction existed | ToolNode + ReAct templates |
| **Multi-agent / sub-graphs** | Some support | First-class — a complete graph can be one node in a parent graph |
| **Streaming** | Step-output streaming | Token-by-token from any node |
| **TypeScript parity with Python** | TypeScript-first | Was Python-first; reached parity in 2025-2026 |
| **Observability** | LangFuse integration | LangSmith first-party; LangFuse via integrations |
| **Maturity** | Early-stage product, evolving | Production-grade, multiple major adopters (Klarna, LinkedIn, Replit etc) |
| **Community / ecosystem** | Smaller, single-product | Large, part of LangChain ecosystem |

---

## What the Phase 1 audit found

The audit doc (`vada-legacy-mastra-audit.md`) inventoried what Mastra features Vāda actually used:

**Used:**
- Workflow DAG (sequential + conditional)
- Step execution as async functions
- Conditional edges (audit pass/revise branch)
- State threading between steps
- LangFuse observability (optional)

**NOT used:**
- Mastra Memory system (Vāda doesn't need memory; Vitakka territory, not in scope)
- Mastra Tools (no agent tool execution beyond classifier-routed)
- Multi-agent tool coordination
- Structured streaming output types
- Agent autonomous looping (Vāda's loops are explicit)

The audit's recommendation was direct: **all Mastra features Vāda used had direct LangGraph equivalents.** No custom implementations would be needed; the swap was 1:1 on the slice that mattered.

This means the Phase 1 decision was NOT "LangGraph is more powerful than Mastra in general." It was: **Vāda was using a thin slice of Mastra. That slice maps cleanly to LangGraph. LangGraph executes that slice better.** Specifically:
- Parallel execution worked correctly in LangGraph (was blocking in Mastra)
- State management was more explicit and typed in LangGraph
- Conditional routing was more flexible

The audit documented "all features Vāda uses have direct LangGraph equivalents" — which is a different claim than "LangGraph beats Mastra at everything."

---

## What changed Phase 2's calculus

Phase 2 wasn't only Mastra→LangGraph. The audit doc also captured a structural shift:

> *"Round sequencing: No longer hardcoded in Mastra; now declarative in Team config → compile() generates Plan."*
> *"Migration: The imperative Mastra workflow becomes declarative Vāda Team config + engine-generated Plan."*

The engine layer was being introduced **at the same time**. Before Phase 2, the deliberation flow was imperatively constructed in Mastra workflow code. After Phase 2, it was declaratively expressed in a Team config (initially TypeScript, later YAML in Phase 7.2).

The two changes — Mastra→LangGraph AND imperative→declarative — were entangled but distinct. The Mastra removal could have happened without introducing the engine. The engine could have been introduced on top of Mastra. They happened together because both made sense at the same moment.

This matters for the comparison: the engine layer is what gives Vāda its declarative spec language, not LangGraph. LangGraph is the runtime. Mastra Workflows would have been a runtime. The engine sits above whichever runtime is chosen.

---

## What LangGraph offers today (April 2026) that matters for the ecosystem

LangGraph TypeScript reached feature parity with Python on all core capabilities by early 2026. Specifically:

### Memory (relevant for Vitakka)

Two memory layers, both first-class:

- **Short-term (thread-scoped state):** Per-conversation state, automatically persisted by checkpointers. The agent state for a given conversation is recallable across the conversation, persists across server restarts (with PostgreSQL/Redis backend), and supports time-travel.
- **Long-term (cross-thread Store):** Namespaced stores keyed by user ID or any custom namespace. Memories scoped to namespaces persist across all threads. Queryable, searchable, structured.

This is exactly the memory shape Vitakka needs. A "longitudinal personal AI thinking partner" needs both: the per-conversation thread state, AND the cross-conversation user-scoped store.

### Persistence and time-travel

Checkpointing is built into the runtime. After every node execution, state is saved. This enables:
- Resume a deliberation/conversation after a crash
- Replay a deliberation from any prior state
- Inspect the exact state at any superstep
- Branch alternate histories from a checkpoint

For audit/compliance use cases (Vāda's MOAT-A) and for memory-aware products (Vitakka), this is foundational infrastructure that comes for free.

### Multi-agent and sub-graphs

A complete graph can be embedded as a single node in a parent graph. This is the architectural primitive for "Vitakka uses Vāda" — Vitakka's conversation graph can include a node that runs a Vāda deliberation sub-graph.

### Human-in-the-loop

The `interrupt()` primitive pauses execution; the graph resumes after external input is provided. This is the runtime support for OQ-C (Principal-terminated loops in real-case Brokered, Phase 9). The capability exists; the engine just needs to express it declaratively in YAML.

### Tool execution

ToolNode and ReAct agent templates handle multi-step tool reasoning loops. Vāda doesn't currently use this beyond classifier-routed web_search; future products will. The capability is mature.

### Streaming

Token-by-token streaming from any node. Already used in Vāda's autonomous deliberation page; extends naturally to any future product.

### Observability

LangSmith first-party integration. Vāda currently uses LangFuse via the optional integration; LangSmith is the path of least resistance.

---

## Where Mastra would have been comparable

If Mastra had matured and addressed the parallel execution / state limitations Vāda hit:

- Mastra's workflow primitives could have been competitive
- Mastra's Memory system was conceptually similar to LangGraph's Store
- Mastra's tool primitives were similar to LangGraph's ToolNode

In a parallel universe where Mastra fixed its blockers, the choice between the two would have been more about ecosystem (LangChain integrations, observability) than about capability.

What we don't know: how Mastra has evolved since early 2026. The decision to leave was made at a specific moment with specific capabilities. If Mastra has matured significantly since, that's relevant data for any future re-evaluation. But the cost of switching back would be high — the engine would need a new adapter, the runtime contract would need re-validation, migrations would need to happen. The decision should be revisited only if LangGraph fails in some specific way, not because Mastra exists.

---

## Where the worry was real and where it doesn't land

The worry expressed in conversation: "Vitakka and other future products will need more features. Will LangGraph have the power that Mastra would have had?"

The honest answer:

**The worry doesn't land on capability.** LangGraph today has memory, persistence, tools, multi-agent, HITL, streaming. All the things Vitakka and future products will need. Feature parity with Python is reached. The TypeScript-lags concern from 2024 is gone.

**The worry does land on a different axis: schema evolution.** When Vitakka starts using the engine, the YAML schema needs to grow:
- Memory primitives in YAML → schema 2.0 introduces `memory:` config
- Tool primitives in YAML → schema gains tool definition support
- Sub-graph invocation → schema gains `subgraph:` node type

These are NOT runtime-capability problems. They are schema-design problems. The runtime supports all of them already. The work is in the engine's spec language.

This is a manageable problem — it's exactly the kind of evolution the schema versioning system was designed for. It's also a problem the engine layer's existence makes tractable: without the engine, every new capability would need to be exposed by every consumer separately, in code, with no schema contract.

---

## What would prompt re-evaluation

The choice should be revisited if any of the following becomes true:

1. **LangGraph stops being maintained** or pivots away from declarative/typed graphs. Unlikely given LangChain's market position, but possible.
2. **Vitakka or another product needs runtime capabilities LangGraph doesn't have.** The current capability gap is zero based on April 2026 inventory; this could change.
3. **A new contender emerges** that has both:
   - The runtime capabilities LangGraph has
   - A clean way to swap in without rebuilding the engine layer
   The second is the harder bar — most candidates would require the engine to recompile to a new target, which is significant work.
4. **LangGraph's TypeScript support regresses.** Possible if LangChain shifts focus back to Python primarily. Unlikely given recent investment.

In all cases, the engine layer's existence makes the swap manageable: only the adapter changes, the spec language and consumers don't.

---

## The summary

The Mastra→LangGraph choice was correct at the time and has aged well. It was made on a narrow slice of capabilities (the part Vāda used) and that slice has direct equivalents in LangGraph. Since Phase 1, LangGraph has matured to feature parity with Python and now has the capabilities future products (Vitakka, multi-agent, tool-heavy use cases) will need.

The engine layer's existence is independent of this choice. The engine could compile to Mastra's primitives, LangGraph's primitives, or some future runtime's primitives. What we did is pick LangGraph as the current adapter target. That's a swappable choice. The engine layer is not.

Worry about runtime capability: lower than expected. Worry about schema evolution: real but manageable. Worry about re-evaluation: revisit if conditions above change, otherwise leave the choice in place.
