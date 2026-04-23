# Vāda — Product Specification

**Status:** Living document. Reflects current locked understanding.
**Last significant update:** April 2026.

This document describes what Vāda is, how it's structured, how it's accessed, and what business it intends to run. Tech details (types, APIs, implementation decisions) live in `engine/design-decisions.md` and in the source code. This doc is about the product, not the code.

---

## 1. What Vāda is

Vāda is a **deliberation engine**. It takes a question, orchestrates multi-agent reasoning across one or more models, and returns a structured conclusion with a complete audit trail of how that conclusion was reached.

Vāda is accessed primarily as an **MCP (Model Context Protocol) server**, allowing it to be called from any MCP-compatible chat client (Claude.ai, Cursor, Claude Desktop, and others as ecosystem matures). A web dashboard at vada.ai provides the canonical audit-trail view of all deliberations.

Vāda is not a chat app. It is not a multi-model aggregator. It does not compete with frontier models on raw reasoning. It produces **auditable, defensible deliberations** — the thing frontier models structurally cannot offer.

---

## 2. Architecture

Three layers, strictly decoupled:

**Engine layer** — `@atta/engine`. Pure library. Compiles a Team + Workflow + question into a Plan (abstract execution DAG). Zero content injection. User provides all prompts. No runtime dependencies.

**Adapter layer** — `@atta/adapter-langgraph`. Executes Plans via LangGraph state machine. Dispatches LLM calls directly through provider SDKs (Anthropic, OpenAI, Google, etc.). Returns a Conclusion.

**Surface layer** — `@atta/mcp-server` (primary surface) and the vada.ai web dashboard (canonical audit-trail view). Direct API access available for programmatic use.

The strict separation ensures the engine stays runtime-agnostic and the surface layer stays swappable. A different adapter (or different surface) can replace its corresponding layer without changing the others.

---

## 3. Primitives

**Agent** — a named entity with a system prompt and optional output schema. Example: Strategist, Critic, Devil's Advocate, Synthesizer, BlindCritic.

**Workflow** — a choreography for how agents interact. Three variants: Solo (one agent), Rounds (N agents × R rounds with optional audit+revision), Custom (arbitrary DAG).

**Team** — a named composition of Agents + Workflow. Example: Crucible = 4 round agents + terminal Synthesizer + BlindCritic auditor + RoundsWorkflow with revision loop.

**Plan** — the compiled, declarative execution graph for a specific question. Pure JSON-serializable data. Stored in vada.ai for replay, audit, and reproducibility.

**Conclusion** — the final output of a deliberation: content, structured output (if schema defined), full transcript, terminal state (CLEAN / REVISED / MAX_REVISIONS / FAILED), token/timing metrics.

For type definitions, see `packages/engine/src/types.ts`.

---

## 4. Surfaces

### 4.1 MCP server (primary)

Vāda's primary interface is an MCP server. A user installs it in their MCP-compatible chat client and gains tools like:

- `vada__deliberate(question, team)` — run a deliberation, return Conclusion
- `vada__list_teams()` — available validated teams
- `vada__get_session(id)` — retrieve transcript of a past deliberation

The user's existing chat agent (Claude, GPT, etc.) becomes the Principal Agent. When deliberation is needed, it calls Vāda tools. The Principal Agent's cost lives in the user's existing chat subscription; Vāda only incurs cost for reviewer dispatches.

### 4.2 vada.ai web dashboard

Canonical record of all deliberations across any client. Shows full transcripts, convergence analysis, per-team metrics, and reproducibility data. Designed for audit-trail use cases — the user can point to a vada.ai URL to show how a decision was reached.

### 4.3 Direct API

Programmatic access for developers who prefer not to use MCP. Same capabilities, different surface. Priced separately from MCP access.

---

## 5. Moats

Listed by defensibility. Round 19 reviewer convergence informed this ordering.

**Compliance / auditability (strongest).** Vāda's structural property — a traceable multi-perspective transcript — cannot be reproduced by frontier models doing internal reasoning. Regulated industries (finance, healthcare, legal) cannot deploy opaque single-shot reasoning for high-stakes decisions; they need the transcript of the debate. This is the moat that survives even if GPT-6 or Claude Opus 5 native reasoning matches Vāda's conclusion quality.

**Proprietary benchmark corpora (strong).** Curated question sets encoding what "hard" means for a given domain. Copying the engine is easy; copying 1,000 hand-validated legal-risk questions is not. Whoever has the best questions finds the best team configurations.

**Integration / workflow embedding (medium).** Once Vāda is "the deliberation step" inside a team's product/legal/strategy pipeline, switching costs are operational, not technical. MCP distribution accelerates this because adding Vāda is one-command install rather than migration.

**Methodology + continuous eval loop (medium).** Span-level evaluators, information-flow metrics, cognitive quarantine design. Requires ongoing research investment; erodes if frontier reasoning improves faster than Vāda's measurement sophistication.

**Trust at the decision layer (slow to build, hard to replicate).** "We run this through Vāda before committing" becomes a professional habit. Reputational switching cost exceeds technical switching cost once established.

**Validated team configurations (weak alone).** Patterns converge quickly once discovered. Crucible as a generic config has limited moat. The defensibility comes from verticalized teams paired with proprietary corpora (e.g. "Medical Treatment Deliberation Team validated against 1,000 clinical cases" is defensible; "Strategic Reasoning Team" is not).

**What is NOT a moat:** the engine itself (infrastructure, commoditizing); marketplace/network effects (wishful thinking for V1); brand/category creation (possible but not reliable).

---

## 6. Product framing

Vāda is **decision infrastructure with auditability**. Not "better answers than GPT-5." Not "AI for thinking." The positioning focuses on use cases where a defensible transcript of reasoning matters more than the raw quality of a single-shot answer.

Primary targets:

- **Regulated industry decision-makers** — legal, medical, financial analysts who need auditable reasoning paths for compliance purposes
- **High-stakes B2B decisions** — procurement, architecture, strategic planning where "how did we decide" matters
- **Senior knowledge workers already running multi-model deliberations manually** — architects, founders, researchers, consultants

Not targets: casual users, developers doing routine tasks, consumer search, general-purpose chat.

---

## 7. Revenue model

Staged approach. Launch narrow, expand as retention data validates:

**Stage 1 — Free tier (BYOK).** User provides their own reviewer API keys. Unlimited deliberations with the default team (Crucible). Full audit dashboard. Cost per user: minimal (dashboard hosting + MCP infra).

**Stage 2 — Pro ($20–30/mo, BYOK).** User still provides reviewer API keys. Access to all validated teams. Custom team creation. Extended session retention. Export capabilities.

**Stage 3 — Managed ($50–80/mo).** Vāda covers reviewer API costs up to a session cap. User keeps their own chat subscription for the Principal Agent. Aimed at non-technical users who don't want to manage multiple API keys.

**Stage 4 — Enterprise ($150–300/seat/mo).** Team-shared team configurations, audit logging with retention policies, compliance certifications (SOC2, HIPAA as applicable), SSO, usage analytics. Aimed at regulated industries.

**Stage 5 — Team marketplace (future).** Verticalized teams (Legal Risk Review, Medical Treatment Deliberation, Security Architecture, etc.) sold as add-ons. Each requires domain-specific corpus + validation; high margins reflect research investment.

Model priorities: Enterprise is the real business. BYOK freemium solves distribution. Managed fills the non-technical gap. Marketplace is a long-term compound.

Pricing model explicitly avoided: flat managed subscription without session caps, which bankrupts the product on power users. Reviewer convergence in Round 19 confirmed this.

---

## 8. Integration context

Vāda is MCP-native and standalone-usable. It's designed to run in any MCP-compatible environment.

Within the Attā ecosystem (separate project), Vitakka — a centralized chat and intelligence client built on Attā memory substrate — uses Vāda for deliberation. This integration is deep: Vāda deliberations become part of Attā's memory of the user's decision history. See the Attā project for that ecosystem's documentation.

Outside the Attā ecosystem, Vāda works independently via any MCP client. The product is not dependent on Attā or Vitakka existing. It can ship, earn revenue, and serve users standalone.

---

## 9. What Vāda is NOT

- **Not a chat app.** No dedicated chat UI. Users access Vāda through chat clients they already use.
- **Not a multi-model aggregator.** Not Poe, not Perplexity. Those switch models per turn; Vāda orchestrates structured deliberations with role-persistent agents.
- **Not a frontier model competitor.** Vāda doesn't try to reason better than GPT-5 or Claude Opus in a single shot. It produces a defensible multi-perspective transcript that single-shot models structurally cannot.
- **Not a developer framework.** AutoGen, CrewAI, LangGraph are frameworks; Vāda is a product built on one (LangGraph). Users don't write code to use Vāda.
- **Not a chain-of-thought tool.** Unlike sequential-thinking MCP (single-model structured monologue), Vāda brings cross-provider agents with distinct roles into genuine debate.

---

## 10. Open questions and deferred decisions

Items not yet locked; require either reviewer rounds, validation data, or production experience to resolve:

- **Specific pricing tier boundaries.** Ranges above are directional; exact numbers depend on reviewer cost data from real usage.
- **SLA targets for vada.ai dashboard.** Audit trail availability and retention commitments for enterprise tier.
- **Number of validated teams at GA.** Minimum viable team catalog — is Crucible sufficient, or do we need 3 teams before public launch?
- **Deliberation retention policy.** How long does vada.ai keep transcripts? Affects storage costs and compliance positioning.
- **Enterprise audit certifications.** Which certifications (SOC2, HIPAA, ISO 27001) to pursue first, and when. Depends on early enterprise customers' needs.
- **Public launch timing.** Gated on Phase 6 validation results showing deliberation produces measurable value over single-shot on at least one domain.
- **Team marketplace submission model.** Whether third parties can submit teams (user-generated content risk) or only the Vāda team ships teams (slower but higher quality).

---

## Related documents

- `engine/design-decisions.md` — architectural and implementation decisions
- `engine/mastra-audit.md` — record of why we migrated off Mastra
- `engine/plans/` — plan artifacts
- `engine/v2-results/` — reviewer round responses (rounds 10–19)
- Historical product docs (`vada-human.md`, `vada-product-thesis.md`, `vada-v1-tech-spec.md`, `vada-v2-experiment-plan.md`, `vada-v2-specification.md`, etc.) — preserved for provenance; this doc supersedes them as current truth.
