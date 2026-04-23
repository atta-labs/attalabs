# Vāda — Product Specification

**Status:** Living document. Reflects current locked understanding.
**Last significant update:** April 2026.

This document describes what Vāda is, how it's structured, how it's accessed, and what business it intends to run. Tech details (types, APIs, implementation decisions) live in `engine/design-decisions.md` and in the source code. This doc is about the product, not the code.

---

## 1. What Vāda is

Vāda is a **deliberation engine**. It takes a question, orchestrates multi-agent reasoning across one or more models, and returns a structured conclusion with a complete audit trail of how that conclusion was reached.

Vāda is accessed primarily as an **MCP (Model Context Protocol) server**, allowing it to be called from any MCP-compatible chat client (Claude.ai, Cursor, Claude Desktop, and others as the ecosystem matures). A web dashboard at vada.ai provides the canonical audit-trail view of all deliberations.

Vāda is not a chat app. It is not a multi-model aggregator. It does not compete with frontier models on raw reasoning. It produces **auditable, defensible deliberations** — the thing frontier models structurally cannot offer.

---

## 2. What Vāda is building that doesn't exist

Investigation across Rounds 17-22 established that Vāda is pioneering multiple capabilities that do not exist as products today. Not "underdeveloped," not "needing improvement" — they simply do not exist. This is a key reason the opportunity is available: the dependency chain is hard enough that most attempts stop at building one layer, not four.

Each of these is labeled MOAT throughout this document. The four gaps Vāda is filling now:

**MOAT-1 — The deliberation engine itself.** Multi-agent deliberation with cognitive quarantine, role-based agents, structured conclusions, and cross-provider dispatch does not exist as a product. Developer frameworks like CrewAI, AutoGen, and LangGraph provide primitives, not polished deliberation products. Confirmed by reviewers across multiple rounds.

**MOAT-2 — Deliberation-as-MCP.** No MCP server exposes multi-agent deliberation as a callable tool. The sequential-thinking MCP server offers single-model structured reasoning (chain-of-thought-as-a-tool) but not deliberation across distinct agents. Vāda is first in this category.

**MOAT-3 — The cognitive router / orchestration layer.** The mediation layer that chat products (Claude.ai, ChatGPT, Gemini) use internally — intent classification, tool filtering, budget enforcement, pre-fetched grounding — does not exist as a buyable product. Primitives exist (LangGraph nodes, LiteLLM gateway). The coherent orchestration layer does not. Vāda builds this as `@atta/cognitive-router`, designed for extraction as a standalone package.

**MOAT-4 — Decision infrastructure with auditability.** Chat products save transcripts. Compliance tooling covers documents, messages, financial records. Nothing combines traceable multi-perspective deliberation transcripts with structured audit (logical + factual) and retention policies suitable for regulated industries. Vāda's vada.ai dashboard is this surface.

Two future gaps Vāda addresses through the Attā ecosystem:

**MOAT-5 — Persistent memory substrate for AI deliberations.** Chat products have memory per-product; no substrate spans products or specializes in deliberation history. Attā (future project) fills this.

**MOAT-6 — Validated team corpora.** Curated, hand-validated question sets encoding what "hard" means for a given domain. Copying an engine is easy; copying 1,000 validated medical deliberation questions is not. Vāda ships Crucible (generic) in V1; verticalized teams with corpora follow in V2+.

---

## 3. Technical architecture

The full schema, showing what we reuse and what we build. Every "build" item corresponds to a MOAT.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      USER LAYER                                     │
│                                                                     │
│  User's existing chat client (Claude.ai, Cursor, ChatGPT, etc.)     │
│  Principal Agent = host's native agent with full product-layer tools│
│                                                                     │
│  Reuse: existing chat clients. No building.                         │
└──────────────────────────┬──────────────────────────────────────────┘
                           │  MCP protocol (stdio / HTTP)
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│                  VĀDA MCP SERVER          [@atta/mcp-server]        │
│                                                                     │
│  Exposes tools: vada__deliberate, vada__consult, vada__list_teams   │
│  Logs every deliberation to Postgres for vada.ai dashboard          │
│                                                                     │
│  Reuse: @modelcontextprotocol/sdk (protocol), drizzle-orm (DB)      │
│  MOAT-2: First deliberation MCP server                              │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│               @atta/engine   (Plan Compiler)                        │
│                                                                     │
│  Takes: Team + Workflow + Question                                  │
│  Produces: Plan (declarative JSON DAG)                              │
│  Pure library, zero runtime deps, content-agnostic                  │
│                                                                     │
│  Reuse: TypeScript, Zod                                             │
│  MOAT-1: Deliberation-specific plan compiler                        │
└──────────────────────────┬──────────────────────────────────────────┘
                           │  Plan
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│         @atta/adapter-langgraph   (Plan Executor)                   │
│                                                                     │
│  Executes Plans via LangGraph state machine                         │
│  Dispatches agent turns to provider APIs                            │
│                                                                     │
│  Reuse: @langchain/langgraph, @anthropic-ai/sdk                     │
│  Build: Plan→LangGraph compilation, provider routing                │
└──────────────────────────┬──────────────────────────────────────────┘
                           │  for each agent turn:
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│         @atta/cognitive-router   (Orchestration Layer)              │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 1. Intent Classifier                                          │  │
│  │    Cheap Haiku call per turn                                  │  │
│  │    "Question + agent role → which tools needed?"              │  │
│  │    Output: {search: bool, fetch: bool, budget: int}           │  │
│  └───────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 2. Tool Filter                                                │  │
│  │    Based on classifier, filter agent's declared tools         │  │
│  │    Pass only classified-as-needed to the agent's API call     │  │
│  └───────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 3. Budget Enforcer                                            │  │
│  │    Per-turn tool call counter in state                        │  │
│  │    Hard cap per agent role                                    │  │
│  │    "Budget exceeded" feedback into context                    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 4. Cost & Latency Tracker                                     │  │
│  │    Per-call metadata: tokens, cost, duration                  │  │
│  │    Accumulates into deliberation-level breakdown              │  │
│  │    Powers vada.ai dashboard transparency                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Future: pre-fetched grounding (V2), post-call reflection (V2)      │
│                                                                     │
│  Reuse: direct Anthropic SDK (no LangChain wrapper here)            │
│  MOAT-3: No reusable orchestration layer exists in the market       │
└──────────────────────────┬──────────────────────────────────────────┘
                           │  with filtered tools + budget
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│            @atta/teams   (Validated Deliberation Content)           │
│                                                                     │
│  Crucible: Strategist + Critic + Devil's Advocate +                 │
│            round-Synthesizer + ConclusionSynthesizer +              │
│            BlindCritic + FactChecker                                │
│  A0/A1 baselines (single-shot reference points)                     │
│                                                                     │
│  V2+: Legal Risk Team, Medical Deliberation Team, etc.              │
│                                                                     │
│  Reuse: @atta/engine types                                          │
│  MOAT-6 (future): Verticalized teams with validated corpora         │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│                      PROVIDER APIs                                  │
│                                                                     │
│  Anthropic /v1/messages    (web_search, web_fetch server tools)     │
│  OpenAI /v1/responses      (future — web_search, file_search,       │
│                             code_interpreter, image_gen, computer)  │
│  Google Gemini             (future — grounding, multimodal)         │
│                                                                     │
│  Reuse: provider SDKs, provider-native server tools                 │
│  No building: we ride on what each provider ships                   │
└─────────────────────────────────────────────────────────────────────┘

╔═════════════════════════════════════════════════════════════════════╗
║                    PARALLEL: AUDIT TRAIL                            ║
║                                                                     ║
║  Every deliberation writes to Postgres via Drizzle ORM              ║
║  vada.ai web dashboard reads this                                   ║
║                                                                     ║
║  Reuse: Neon Postgres, Drizzle ORM, Clerk (auth), Next.js 16        ║
║  MOAT-4: Decision-infrastructure audit trail                        ║
╚═════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════
                    FUTURE (Attā ecosystem, V2+)
═══════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────┐
│  @atta/memory    — cross-session deliberation recall                │
│  @atta/identity  — persistent self substrate                        │
│                                                                     │
│  MOAT-5 (future): Persistent memory substrate for AI deliberations  │
└─────────────────────────────────────────────────────────────────────┘
```

### Reuse vs build summary

| Layer | Reuse (what exists) | Build (what doesn't) | MOAT |
|---|---|---|---|
| User chat client | Claude.ai, Cursor, ChatGPT, etc. | — | — |
| MCP protocol | `@modelcontextprotocol/sdk` | `@atta/mcp-server` | MOAT-2 |
| Plan compilation | TypeScript, Zod | `@atta/engine` | MOAT-1 |
| State machine | `@langchain/langgraph` | `@atta/adapter-langgraph` (Plan→Graph) | — (technical) |
| LLM client | `@anthropic-ai/sdk`, future OpenAI SDK | — | — |
| **Orchestration** | **Primitives only (no coherent product)** | **`@atta/cognitive-router`** | **MOAT-3** |
| Deliberation content | — | `@atta/teams` (Crucible now; verticalized later) | MOAT-6 (future) |
| Server tools (search/fetch) | Anthropic server tools, OpenAI server tools | — | — |
| Database | Neon Postgres, Drizzle ORM | — | — |
| Dashboard frontend | Next.js 16, React 19, Tailwind, shadcn/ui | vada.ai (app) | — |
| Audit trail | — | Database schema + dashboard views | MOAT-4 |
| Auth | Clerk | — | — |
| Memory substrate (V2+) | — | `@atta/memory`, `@atta/identity` | MOAT-5 (future) |

Six packages we build. Twelve libraries we reuse. Everything we build addresses a gap that does not exist as a product today.

---

## 4. Primitives

**Agent** — a named entity with a system prompt and optional output schema. Example: Strategist, Critic, Devil's Advocate, Synthesizer, BlindCritic, FactChecker.

**Workflow** — a choreography for how agents interact. Variants: Solo (one agent, one turn), Rounds (N agents × R rounds with optional audit+revision), Custom (arbitrary DAG). The Rounds workflow supports multiple parallel auditors (e.g., BlindCritic + FactChecker both run after ConclusionSynthesizer; either flag triggers revision).

**Team** — a named composition of Agents + Workflow. Example: Crucible = 4 round agents + ConclusionSynthesizer + BlindCritic + FactChecker + RoundsWorkflow with revision loop.

**Plan** — the compiled, declarative execution graph for a specific question. Pure JSON-serializable data. Stored in vada.ai for replay, audit, and reproducibility.

**Conclusion** — the final output of a deliberation: content, structured output (if schema defined), full transcript, terminal state (CLEAN / REVISED / MAX_REVISIONS / FAILED), token/timing metrics, tool-use metadata.

For type definitions, see `packages/engine/src/types.ts`.

---

## 5. Surfaces

### 5.1 MCP server (primary)

Vāda's primary interface is an MCP server. A user installs it in their MCP-compatible chat client and gains tools like:

- `vada__deliberate(question, team)` — run a deliberation, return Conclusion
- `vada__list_teams()` — available validated teams
- `vada__get_session(id)` — retrieve transcript of a past deliberation

The user's existing chat agent (Claude, GPT, etc.) becomes the Principal Agent. When deliberation is needed, it calls Vāda tools. The Principal Agent's cost lives in the user's existing chat subscription; Vāda only incurs cost for reviewer dispatches and classifier/orchestration overhead.

### 5.2 vada.ai web dashboard

Canonical record of all deliberations across any client. Shows full transcripts, convergence analysis, per-team metrics, reproducibility data, and cost/tool-use breakdowns. Designed for audit-trail use cases — users can point to a vada.ai URL to show how a decision was reached, with sourced reasoning from tool-equipped Reviewers.

### 5.3 Direct API

Programmatic access for developers who prefer not to use MCP. Same capabilities, different surface. Priced separately from MCP access.

---

## 6. Moats — strategic defensibility

The market-gap MOATs in Section 2 describe what Vāda is pioneering. This section describes why those positions are defensible over time. Two categories reinforce each other.

**Compliance / auditability (strongest).** Vāda's structural property — a traceable multi-perspective transcript with dual audit (logical and factual) — cannot be reproduced by frontier models doing internal reasoning. Regulated industries (finance, healthcare, legal) cannot deploy opaque single-shot reasoning for high-stakes decisions; they need the transcript of the debate. This moat survives even if GPT-6 or Claude Opus 5 native reasoning matches Vāda's conclusion quality. Powered by MOAT-4.

**Proprietary benchmark corpora (strong).** Curated question sets encoding what "hard" means for a given domain. Copying the engine is easy; copying 1,000 hand-validated legal-risk questions is not. Whoever has the best questions finds the best team configurations. Realized as MOAT-6 in V2+.

**Integration / workflow embedding (medium).** Once Vāda is "the deliberation step" inside a team's product/legal/strategy pipeline, switching costs are operational, not technical. MCP distribution (MOAT-2) accelerates this because adding Vāda is one-command install rather than migration.

**Orchestration layer as standalone asset (medium).** MOAT-3 — `@atta/cognitive-router` — could ship as an independent open-source or commercial package. Vāda becomes infrastructure for other agent products beyond deliberation. Optionality: if Vāda's deliberation product struggles, the orchestration layer is a separable business.

**Methodology + continuous eval loop (medium).** Span-level evaluators, information-flow metrics, cognitive quarantine design. Requires ongoing research investment; erodes if frontier reasoning improves faster than Vāda's measurement sophistication.

**Trust at the decision layer (slow to build, hard to replicate).** "We run this through Vāda before committing" becomes a professional habit. Reputational switching cost exceeds technical switching cost once established.

**Validated team configurations (weak alone, strong when paired).** Patterns converge quickly once discovered. Crucible as a generic config has limited moat. Defensibility comes from verticalized teams paired with proprietary corpora — MOAT-6 realized with domain expertise — e.g. "Medical Treatment Deliberation Team validated against 1,000 clinical cases."

### What is NOT a moat

- The engine as infrastructure alone (will commoditize over time)
- Marketplace/network effects (wishful thinking for V1)
- Brand/category creation (possible but not reliable as standalone moat)
- First-mover status (can be leapfrogged if underlying moats are weak)

---

## 7. Product framing

Vāda is **decision infrastructure with auditability**. Not "better answers than GPT-5." Not "AI for thinking." The positioning focuses on use cases where a defensible transcript of reasoning matters more than the raw quality of a single-shot answer.

Primary targets:

- **Regulated industry decision-makers** — legal, medical, financial analysts who need auditable reasoning paths for compliance purposes
- **High-stakes B2B decisions** — procurement, architecture, strategic planning where "how did we decide" matters
- **Senior knowledge workers already running multi-model deliberations manually** — architects, founders, researchers, consultants

Not targets: casual users, developers doing routine tasks, consumer search, general-purpose chat.

---

## 8. Revenue model

Staged approach. Launch narrow, expand as retention data validates.

**Stage 1 — Free tier (BYOK).** User provides their own reviewer API keys. Unlimited deliberations with the default team (Crucible). Full audit dashboard. Cost per user: minimal.

**Stage 2 — Pro ($20–30/mo, BYOK).** User still provides reviewer API keys. Access to all validated teams. Custom team creation. Extended session retention. Export capabilities.

**Stage 3 — Managed ($50–80/mo).** Vāda covers reviewer API costs up to a session cap. User keeps their own chat subscription for the Principal Agent. Aimed at non-technical users.

**Stage 4 — Enterprise ($150–300/seat/mo).** Team-shared team configurations, audit logging with retention policies, compliance certifications (SOC2, HIPAA as applicable), SSO, usage analytics. Aimed at regulated industries.

**Stage 5 — Team marketplace (future).** Verticalized teams (Legal Risk Review, Medical Treatment Deliberation, etc.) sold as add-ons. Each requires domain-specific corpus + validation; high margins reflect research investment.

**Stage 6 (optional — MOAT-3 spinout) — `@atta/cognitive-router` as separate product.** Orchestration-layer-as-a-service for non-deliberation agent products. Decoupled from Vāda's product surface. Only pursued if Vāda's core deliberation product validates AND the orchestration layer sees external demand.

Priorities: Enterprise is the real business. BYOK freemium solves distribution. Managed fills the non-technical gap. Marketplace and MOAT-3 spinout are long-term compounds.

Pricing model explicitly avoided: flat managed subscription without session caps, which bankrupts the product on power users.

---

## 9. Integration context

Vāda is MCP-native and standalone-usable. Designed to run in any MCP-compatible environment.

Within the Attā ecosystem (separate project), Vitakka — a centralized chat client built on Attā memory substrate — will use Vāda for deliberation. This integration is deep: Vāda deliberations become part of Attā's memory of the user's decision history. See the Attā project for that ecosystem's documentation.

Outside the Attā ecosystem, Vāda works independently via any MCP client. The product is not dependent on Attā or Vitakka existing. It can ship, earn revenue, and serve users standalone.

---

## 10. What Vāda is NOT

- **Not a chat app.** No dedicated chat UI. Users access Vāda through chat clients they already use.
- **Not a multi-model aggregator.** Not Poe, not Perplexity. Those switch models per turn; Vāda orchestrates structured deliberations with role-persistent agents.
- **Not a frontier model competitor.** Vāda doesn't try to reason better than GPT-5 or Claude Opus in a single shot. It produces a defensible multi-perspective transcript that single-shot models structurally cannot.
- **Not a developer framework.** AutoGen, CrewAI, LangGraph are frameworks; Vāda is a product built on one (LangGraph). Users don't write code to use Vāda.
- **Not a chain-of-thought tool.** Unlike sequential-thinking MCP (single-model structured monologue), Vāda brings cross-provider agents with distinct roles into genuine debate.

---

## 11. Open questions and deferred decisions

Items not yet locked; require reviewer rounds, validation data, or production experience to resolve:

- **Specific pricing tier boundaries.** Ranges above are directional; exact numbers depend on reviewer cost data from real usage.
- **SLA targets for vada.ai dashboard.** Audit trail availability and retention commitments for enterprise tier.
- **Number of validated teams at GA.** Minimum viable team catalog — is Crucible sufficient, or do we need 3 teams before public launch?
- **Deliberation retention policy.** How long does vada.ai keep transcripts? Affects storage costs and compliance positioning.
- **Enterprise audit certifications.** Which (SOC2, HIPAA, ISO 27001) to pursue first, and when.
- **Public launch timing.** Gated on validation results showing deliberation produces measurable value over single-shot on at least one domain.
- **`@atta/cognitive-router` open-sourcing.** Whether to open-source the orchestration layer immediately (maximizes adoption and moat defense), delay until V1 revenue validates (safer), or keep proprietary (maximum direct value). Decision deferred to post-V1 launch.
- **Team marketplace submission model.** User-generated teams (scale + risk) vs Vāda-only teams (quality + slow growth). Decision deferred to V2.

---

## Related documents

- `engine/design-decisions.md` — architectural and implementation decisions
- `engine/mastra-audit.md` — record of why we migrated off Mastra
- `engine/v2-results/` — reviewer round responses (Rounds 10–22) and benchmark data
- `vada-human.md` — public-facing narrative (⚠️ partial refresh pending; tech stack and bench data need updating)
- `vada-byok-principles.md` — BYOK architectural promise
- `vada-science-of-deliberation.md` — foundational theory
