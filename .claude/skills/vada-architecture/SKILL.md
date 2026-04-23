---
name: vada-architecture
description: Vāda's product structure, two deliberation modes, wedges/capabilities/moats framework, current phase status, and locked architectural decisions. Load before any architectural decision, cross-cutting change, or when drafting executor tasks that span multiple layers.
---

# Vāda Architecture — Master Reference

## Context

Vāda is a multi-agent deliberation engine shipping as an MCP server. Multiple LLM agents debate or are consulted, dual audit checks the output, and conclusions return with a full audit trail. Accessed from any MCP-compatible chat client (Claude.ai, Cursor, Claude Desktop, etc.). Part of the Attā ecosystem (Attā = future memory substrate, Vitakka = future chat client, Vāda = deliberation, current focus).

---

## Two Deliberation Modes

| Mode | MCP Tool | Behavior | Cost | Serves |
|------|----------|----------|------|--------|
| **Autonomous** | `vada__deliberate` | Agents debate each other, Principal observes, full rounds + audit | Higher | MOAT-A (audit trail) |
| **Brokered** | `vada__consult` | Principal + Strategist summon individual reviewers on demand, no rounds | Lower | Acquisition surface |

Brokered ships first (simpler). Both must ship before public launch. Brokered → Autonomous escalation is a product-design imperative, not a UI option.

---

## Layer Stack

```
USER CHAT CLIENT            (Claude.ai, Cursor — external)
        ↓ MCP protocol (stdio in V1, HTTP later)
@vada/mcp-server            WEDGE-2   → see skill: mcp-server-layer
        ↓ Plan request
@atta/engine                WEDGE-1   → see skill: engine-layer
        ↓ Plan (JSON DAG)
@atta/adapter-langgraph     CAP-1     → see skill: adapter-layer
  (includes cognitive router nodes)
        ↓ per-turn dispatch
@vada/teams                 MOAT-B    → see skill: teams-layer
  (agents, teams, profiles)
        ↓ agent config
PROVIDER APIs               (Anthropic primary; OpenAI/Gemini future)

PARALLEL AUDIT: Postgres → vada.ai dashboard   MOAT-A  (Phase 3c)
```

---

## Wedges / Capabilities / Moats

Use this framework when labeling new work. Do NOT call something a moat unless it's structurally defensible.

| Label | Type | Defensibility |
|-------|------|---------------|
| WEDGE-1 | Deliberation engine as first coherent product | First-mover only. 6-12 months. |
| WEDGE-2 | First multi-agent deliberation MCP server | First-mover only. 6-12 months. |
| CAP-1 | Cognitive router / orchestration layer | Enabler. Inside adapter. Not a moat alone. |
| **MOAT-A** | Decision infrastructure with auditability | **Primary moat. Only one clearly defensible today.** |
| MOAT-B | Validated team corpora | Conditional on building them. Zero exist currently. |
| MOAT-C | Workflow embedding / process lock-in | Emerges from adoption. Not actionable directly. |

**Not moats:** engine itself, MCP first-mover alone, marketplace effects, brand, memory substrate (future).

---

## Phase Status

| Phase | Scope | Status |
|-------|-------|--------|
| 3a.1 | `@vada/teams` scaffolding + Crucible migration | ✅ committed |
| 3a.2 | A0/A1 baselines | ✅ committed |
| 3a.3 | Tools + FactChecker + parallel audit | ✅ committed |
| 3a.4 | Cognitive router nodes in adapter | ✅ committed |
| 3a.5 | Classifier tuning (role-based bias) | ✅ committed |
| **3b.1** | `@vada/mcp-server` + `vada__consult` | 🔨 in progress |
| 3b.2 | `vada__deliberate` (Autonomous mode) | queued |
| 3b.3 | `vada__list_teams` + `vada__get_session` | queued |
| 3c | vada.ai dashboard (MOAT-A surface) | queued |
| 6 | One verticalized team + 100+ corpus | required pre-public-launch |

---

## Locked Architectural Decisions

| Decision | Reason |
|----------|--------|
| Cognitive router inside `@atta/adapter-langgraph`, not a separate package | Round 23 reviewer convergence; over-modular for V1 |
| Sparring (2 agents) = default team, not Crucible (4-7) | Round 24 convergence; simpler, faster, easier to debug |
| Tools ON for reasoning agents, OFF for audit agents | Task 4.5 empirical finding; restricting reasoning tools degrades output |
| Brokered MCP tool ships before Autonomous | Round 24; validates distribution without betting on deliberation thesis first |
| Direct `@anthropic-ai/sdk` in adapter (not LangChain wrapper) | LangChain wrapper had a `top_p` bug |
| `Agent.tools: string[]` (not boolean) | Tool-specific config needed; adapter registry maps logical name → Anthropic API type |
| Recursion limit raised to 150 in LangGraph | Classifier nodes double graph step count; default 25 is insufficient |

---

## Reviewer Round Pattern

Architectural decisions get pressure-tested via informal rounds with Gemini, ChatGPT, DeepSeek. Rounds are numbered (17-24 so far). When a major architectural question arises, consider drafting a reviewer round before committing.

Reviewer responses: `apps/vada-ai/specs/engine/v2-results/`.

---

## Pre-Public-Launch Requirements

1. Autonomous + Brokered both shipping in MCP
2. At least one verticalized team with 100+ validated corpus questions (MOAT-B)
3. vada.ai dashboard with full transcript + cost attribution (MOAT-A)
4. Benchmark data showing measurable value over A0/A1 baselines

---

## Post-Launch Watchdog Metric

Autonomous usage share at 6 months:

| Share | Signal |
|-------|--------|
| ≥ 20% | Healthy |
| 10-20% | Investigate escalation, UI, pricing |
| < 10% | Thesis failure; reconsider positioning |

---

## What Vāda is NOT

- ❌ A chat app (no dedicated UI)
- ❌ A multi-model aggregator (Poe/Perplexity style)
- ❌ A frontier model competitor
- ❌ A developer framework (users don't write code)
- ❌ A chain-of-thought tool (distinct from sequential-thinking MCP)

---

## Full docs

- `apps/vada-ai/specs/vada-product-spec.md` — full product truth
- `apps/vada-ai/specs/engine/design-decisions.md` — tech decisions with rationale
- `apps/vada-ai/specs/vada-science-of-deliberation.md` — foundational theory
- `apps/vada-ai/specs/engine/v2-results/` — reviewer rounds
