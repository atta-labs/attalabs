# Vāda — Product Specification

**Status:** Living document. Reflects current locked understanding.
**Last significant update:** April 2026 (post Round 23 reviewer integration).

This document describes what Vāda is, how it's structured, how it's accessed, and what business it intends to run. Tech details (types, APIs, implementation decisions) live in `engine/design-decisions.md` and in the source code. This doc is about the product, not the code.

---

## 1. What Vāda is

Vāda is a **deliberation engine** accessed primarily as an **MCP (Model Context Protocol) server**. It enables multi-agent deliberation on difficult questions, returning structured conclusions backed by full audit trails.

Vāda operates in two modes (detailed in Section 3):

- **Autonomous Deliberation** — agents debate each other, Principal observes
- **Brokered Deliberation** — Principal + primary agent orchestrate other reviewers on demand

Both modes share infrastructure: one engine, one adapter, one MCP surface, one audit trail. They expose different MCP tools for different workflows.

Vāda is not a chat app. It is not a multi-model aggregator. It does not compete with frontier models on raw reasoning. It produces **auditable, defensible decisions** — the thing frontier models structurally cannot offer.

---

## 2. Wedges, capabilities, and moats

Post Round 23 reviewer integration, we distinguish sharply between:

- **Wedges** — things we build that don't exist, giving first-mover advantage. Not long-term moats; a competitor with a few months can replicate.
- **Capabilities** — infrastructure we build that enables moats. Not moats alone.
- **Moats** — structural defensibility that survives competition.

### Wedges (first-mover advantages, 6-12 month temporary moats)

**WEDGE-1 — Deliberation engine (first coherent product).** No polished multi-agent deliberation product exists. CrewAI/AutoGen/LangGraph are developer frameworks. Vāda's engine is the first deliberation-specific product. Competitors can replicate in months once the thesis is validated.

**WEDGE-2 — Deliberation-as-MCP (first in category).** No MCP server exposes multi-agent deliberation. First-mover advantage in MCP ecosystem is real — switching costs are low, so being default matters. Erodes in 6-12 months as others copy.

### Capabilities (enablers, not moats)

**CAP-1 — Cognitive router / orchestration layer.** Intent classification, tool filtering, budget enforcement, cost tracking. No reusable product exists in the market. We build this inside `@atta/adapter-langgraph` (not a separate package in V1, per Round 23 reviewer convergence). Enables quality deliberation but isn't a moat by itself — competitors can build their own. Future optionality for extraction if external demand emerges (2027+).

### Moats (structural defensibility)

**MOAT-A — Decision infrastructure with auditability (primary moat).** Traceable multi-perspective transcripts with dual audit (logical + factual) cannot be reproduced by frontier models doing internal reasoning. Regulated industries (finance, healthcare, legal) cannot deploy opaque single-shot reasoning for high-stakes decisions. Once integrated into compliance workflows, switching is a massive organizational risk. **This is the only clearly-defensible long-term moat we have today.**

**MOAT-B — Validated team corpora (conditional on execution).** Curated, hand-validated question sets per domain (1000 legal-risk questions, 1000 clinical deliberation cases, etc.). Copying the engine is easy; copying validated corpora is not. Currently zero corpora exist. Moat realized only through execution. Pre-public-launch requirement: build ONE verticalized team with 100+ validated questions.

**MOAT-C — Workflow embedding / process lock-in (emerges from adoption).** When Vāda becomes a required step in a team's decision workflow ("no architecture doc approved without a Vāda deliberation link attached"), switching costs transcend the technical. This moat emerges from distribution and integration. Not actionable directly; emerges if MOAT-A creates the initial trust and distribution takes off.

### What is NOT a moat

- The engine itself as infrastructure (commoditizes; WEDGE-1 is honest framing)
- MCP first-mover status alone (WEDGE-2 is honest framing)
- Marketplace/network effects (wishful for V1)
- Brand/category creation (too early)
- The cognitive router as standalone product (CAP-1 is honest framing; spinout is 2027+ optionality)
- Memory substrate (future Attā territory; doesn't exist yet)

**Reviewer convergence (Round 23):** Only MOAT-A is clearly defensible today. MOAT-B is conditional on real execution. MOAT-C emerges from adoption. Everything else is wedge or capability.

---

## 3. Two deliberation modes

Vāda ships two modes of operation. Both run on the same engine, adapter, and MCP surface. They expose different MCP tools.

### 3.1 Autonomous Deliberation

Agents debate each other. Principal poses the question and observes. The deliberation runs to completion, produces a structured Conclusion, and returns.

**When to use:** well-framed decisions where the Principal wants a committed answer with full deliberation transcript. Compliance use cases. High-stakes decisions where the audit trail matters.

**MCP tool:** `vada__deliberate(question, team)` → returns Conclusion + session URL.

**Default team: Sparring** (2 agents × 3 rounds, dual audit layer). Frames as "best for most questions" — not a stripped-down mode, but the right shape for typical deliberations. Crucible (4-7 agents) is visibly available as "heavier deliberation for high-stakes, multi-perspective decisions." War Room (6 agents) is V2+. Team choice is explicit and prominent in the MCP interface; users select based on decision stakes, not as a power-user escape hatch.

**Cost profile:** higher per session (multiple rounds, multiple agents, dual audit, tool use).

### 3.2 Brokered Deliberation

Principal interacts with ONE primary agent (Strategist) directly. The Principal + Strategist together call on reviewer agents on demand. Reviewers respond to specific consultations; they don't debate each other.

This mode replicates the Principal's current manual workflow (copy-pasting between chat tabs). The Strategist inside the Principal's chat client coordinates; Vāda handles reviewer dispatch.

**When to use:** exploratory work, iterative questions, cases where the Principal wants to stay in the conversation. Quick consults that don't warrant a full deliberation.

**MCP tool:** `vada__consult(prompt, reviewer_profile)` → returns reviewer response.

The Principal's existing chat agent (Claude in Claude.ai, GPT in ChatGPT) serves as the Strategist by default. Vāda's role is summoning reviewers on other providers or with other configurations.

**Cost profile:** low per consultation (one reviewer call, no rounds, no full audit).

### 3.3 Why two modes

Different use cases, different cost profiles, different pricing tiers. One product, two front doors.

Brokered Deliberation is mechanically simpler and ships first. Autonomous Deliberation ships second with Sparring as the default team.

### 3.4 Escalation principle

Brokered is the acquisition surface. Autonomous is where the primary moat (MOAT-A auditability) lives. The product must actively escalate users from Brokered to Autonomous for high-stakes decisions — not just offer both and hope users find Autonomous.

Concrete escalation patterns (implementation detail, but shaping principle now):
- After a Brokered conversation with multiple consultations on the same thread, the Strategist suggests running a formal deliberation
- UI distinguishes "quick consultation" from "committed decision" as separate user intents
- The vada.ai dashboard shows Autonomous deliberations with higher prominence than Brokered consultations
- Enterprise tier bundles Autonomous usage; Brokered alone is Pro tier

Without active escalation, Brokered usage patterns can dominate and Autonomous never builds the corpus of compliance-grade decision records that constitute MOAT-A. This is a product-design imperative, not a UI option.

---

## 4. Technical architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      USER LAYER                                     │
│  User's chat client (Claude.ai, Cursor, ChatGPT, etc.)              │
│  Principal Agent = host's native agent with full product tools      │
│                                                                     │
│  Reuse: existing chat clients                                       │
└──────────────────────────┬──────────────────────────────────────────┘
                           │  MCP protocol (stdio / HTTP)
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│               VĀDA MCP SERVER     [@atta/mcp-server]                │
│                                                                     │
│  Tools: vada__deliberate (autonomous) | vada__consult (brokered)    │
│         vada__list_teams | vada__get_session                        │
│  Logs all sessions to Postgres                                      │
│                                                                     │
│  Reuse: @modelcontextprotocol/sdk, drizzle-orm                      │
│  WEDGE-2: First deliberation MCP server                             │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│              @atta/engine    (Plan Compiler)                        │
│                                                                     │
│  Input: Team + Workflow + Question                                  │
│  Output: Plan (declarative JSON DAG)                                │
│  Pure library, zero runtime deps                                    │
│                                                                     │
│  Reuse: TypeScript, Zod                                             │
│  WEDGE-1: Deliberation-specific plan compiler                       │
└──────────────────────────┬──────────────────────────────────────────┘
                           │  Plan
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│     @atta/adapter-langgraph    (Plan Executor + Cognitive Router)   │
│                                                                     │
│  Executes Plans via LangGraph state machine                         │
│  Includes cognitive router nodes per-turn:                          │
│    • Intent Classifier (Haiku call: which tools needed?)            │
│    • Tool Filter (pass only classified-needed tools to agent)       │
│    • Budget Enforcer (hard cap on tool calls per turn)              │
│    • Cost & Latency Tracker (per-turn metadata for audit)           │
│                                                                     │
│  Cognitive router is internal to this package in V1.                │
│  Future: extract as @atta/cognitive-router if external demand       │
│  emerges (2027+).                                                   │
│                                                                     │
│  Reuse: @langchain/langgraph, @anthropic-ai/sdk                     │
│  CAP-1: Orchestration layer (moat-enabler, not moat itself)         │
└──────────────────────────┬──────────────────────────────────────────┘
                           │  per-turn calls
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│         @atta/teams    (Deliberation Content)                       │
│                                                                     │
│  V1: Sparring (2 agents, default) + Crucible (4-7 agents, heavy)    │
│      + A0/A1 single-shot baselines (benchmarking)                   │
│                                                                     │
│  V2+: Verticalized teams (Legal, Medical, Security, etc.)           │
│       with validated corpora                                        │
│                                                                     │
│  Reuse: @atta/engine types                                          │
│  MOAT-B (future): Verticalized teams with corpora                   │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│                      PROVIDER APIs                                  │
│                                                                     │
│  Anthropic /v1/messages   (web_search, web_fetch server tools)      │
│  OpenAI /v1/responses     (future)                                  │
│  Google Gemini            (future)                                  │
└─────────────────────────────────────────────────────────────────────┘

╔═════════════════════════════════════════════════════════════════════╗
║           PARALLEL: AUDIT TRAIL   [vada.ai dashboard]               ║
║                                                                     ║
║  Every deliberation writes to Postgres via Drizzle                  ║
║  Web dashboard renders transcripts with tool-use breakdowns,        ║
║  cost attribution, and session reproducibility data                 ║
║                                                                     ║
║  Reuse: Next.js 16, Clerk, Neon Postgres                            ║
║  MOAT-A: Decision infrastructure with auditability (primary moat)   ║
╚═════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════
                 FUTURE (Attā ecosystem, V2+)
═══════════════════════════════════════════════════════════════════════
@atta/memory  — cross-session deliberation recall
@atta/identity  — persistent self substrate
(These power future Attā and Vitakka products; not on V1 critical path)
```

### Reuse vs build summary

| Layer | Reuse | Build | Category |
|---|---|---|---|
| User chat client | Claude.ai, Cursor, ChatGPT | — | — |
| MCP protocol | `@modelcontextprotocol/sdk` | `@atta/mcp-server` | WEDGE-2 |
| Plan compilation | TypeScript, Zod | `@atta/engine` | WEDGE-1 |
| State machine | `@langchain/langgraph` | Plan→Graph compiler (inside adapter) | — |
| Cognitive router | Primitives only | **Inside `@atta/adapter-langgraph`** | CAP-1 |
| Deliberation teams | — | `@atta/teams` | MOAT-B (future) |
| Server tools | Provider-native (web_search, etc.) | — | — |
| Database | Neon Postgres, Drizzle | — | — |
| Dashboard | Next.js, Tailwind, shadcn | vada.ai app | MOAT-A |
| Auth | Clerk | — | — |

**Five packages we build** (down from six after folding cognitive router into adapter).

---

## 5. Primitives

**Agent** — a named entity with a system prompt, optional output schema, optional tools (declared as string names mapped via adapter's tool registry). Example: Strategist, Critic, Devil's Advocate, Synthesizer, BlindCritic, FactChecker.

**Workflow** — a choreography for how agents interact. Variants: Solo (one agent, one turn), Rounds (N agents × R rounds with optional parallel audit + revision), Custom (arbitrary DAG). Rounds workflow supports multiple parallel auditors — either flag triggers revision.

**Team** — a named composition of Agents + Workflow. Example: Sparring = 2 round agents + ConclusionSynthesizer + BlindCritic + FactChecker + RoundsWorkflow with revision loop.

**Plan** — the compiled, declarative execution graph for a specific question. Pure JSON-serializable data. Stored in vada.ai for replay, audit, and reproducibility.

**Conclusion** — the final output: content, structured output (if schema defined), full transcript, terminal state (CLEAN / REVISED / MAX_REVISIONS / FAILED), token/timing metrics, tool-use metadata, cost breakdown.

For type definitions, see `packages/engine/src/types.ts`.

---

## 6. Surfaces

### 6.1 MCP server (primary)

Vāda's primary interface is an MCP server. A user installs it in their MCP-compatible chat client and gains tools:

- `vada__deliberate(question, team)` — autonomous deliberation, returns Conclusion
- `vada__consult(prompt, reviewer_profile)` — brokered consultation, returns reviewer response
- `vada__list_teams()` — available validated teams
- `vada__get_session(id)` — transcript of past deliberation

The user's existing chat agent becomes the Principal (autonomous mode) or the Strategist (brokered mode). The user's chat subscription covers Principal/Strategist token cost; Vāda covers reviewer dispatches.

### 6.2 vada.ai web dashboard

Canonical record of all deliberations across any client. Shows full transcripts, per-turn cost and tool-use breakdown, convergence analysis, reproducibility data. Designed for audit-trail use cases.

### 6.3 Direct API

Programmatic access for developers who prefer not to use MCP. Same capabilities, different surface.

---

## 7. Product framing

Vāda is **decision infrastructure with auditability**. Not "better answers than GPT-5." Not "AI for thinking." Positioning focuses on use cases where a defensible transcript of reasoning matters more than single-shot answer quality.

Primary targets:

- **Regulated industry decision-makers** — legal, medical, financial analysts needing auditable reasoning for compliance
- **High-stakes B2B decisions** — procurement, architecture, strategic planning where "how did we decide" matters
- **Senior knowledge workers already running multi-model deliberations manually** — architects, founders, researchers

Not targets: casual users, general-purpose chat, consumer search.

---

## 8. Revenue model

Staged. Launch narrow; expand as data validates.

- **Free tier (BYOK).** User provides reviewer API keys. Unlimited deliberations with Sparring team.
- **Pro ($20–30/mo, BYOK).** Access to all validated teams. Custom team creation. Extended retention.
- **Managed ($50–80/mo).** Vāda covers reviewer API costs up to a session cap.
- **Enterprise ($150–300/seat/mo).** Shared team configs, audit retention policies, compliance certifications, SSO.
- **Team marketplace (V2+).** Verticalized teams sold as add-ons (Legal Risk, Medical Deliberation, etc.).

**Not pursuing in V1:**
- Flat managed subscription without session caps (bankrupts on power users)
- Cognitive router as standalone product (potential 2027+ spinout if external demand emerges)

---

## 9. Integration context

Vāda is MCP-native and standalone-usable. Within the Attā ecosystem (separate project), future Vitakka client will use Vāda by default with Attā memory underneath. Outside that ecosystem, Vāda works via any MCP client.

---

## 10. What Vāda is NOT

- Not a chat app (no dedicated UI)
- Not a multi-model aggregator (Poe/Perplexity style)
- Not a frontier model competitor
- Not a developer framework (users don't write code)
- Not a chain-of-thought tool (distinct from sequential-thinking MCP)

---

## 11. Pre-public-launch requirements

Informed by Round 23 reviewer convergence:

1. **Autonomous + Brokered modes both shipping** in MCP server
2. **At least one verticalized team with 100+ validated corpus questions.** Generic Crucible alone is infrastructure without application. MOAT-B must be realized, not just planned.
3. **vada.ai dashboard with full transcript + cost attribution.** MOAT-A surface.
4. **Benchmark data showing measurable value** over single-shot baselines on the verticalized domain.

### Post-launch watchdog metric

After public launch, monitor the **Autonomous usage share** — the percentage of total Vāda traffic that uses `vada__deliberate` rather than `vada__consult`.

- **Healthy:** Autonomous share ≥ 20% after 6 months
- **Concerning:** Autonomous share 10-20% after 6 months — investigate escalation patterns, UI prompts, pricing friction
- **Thesis failure signal:** Autonomous share < 10% after 6 months despite active escalation — indicates users don't want deliberation, they want lightweight consulting. Consider pivoting the positioning (become "the best AI consultation router") or killing Autonomous as a product.

This metric is not a vanity number. It directly tests whether the deliberation thesis has product-market fit, or whether Vāda is actually a different product.

---

## 12. Open questions

- Which domain for the first verticalized team (Security Architecture / Medical / Legal Risk)?
- Specific pricing tier boundaries
- SLA targets for vada.ai dashboard
- Enterprise audit certifications roadmap (SOC2 first? HIPAA?)
- Open-sourcing the cognitive router: when/whether to extract from adapter
- Team marketplace submission model (UGC vs curated)

---

## Related documents

- `engine/design-decisions.md` — architectural and implementation decisions
- `engine/v2-results/` — reviewer rounds (10-23) and benchmark data
- `vada-human.md` — public-facing narrative (⚠️ partial refresh pending)
- `vada-byok-principles.md` — BYOK architectural promise
- `vada-science-of-deliberation.md` — foundational theory
