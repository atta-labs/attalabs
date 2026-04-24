# Vāda Brokered Deliberation — Specification

**Status:** V1 specification — partial implementation (Phase 4 complete)
**Last updated:** April 2026
**Audience:** Implementers, Principal, reviewers

---

## What Brokered Vāda is

Vāda Brokered externalizes the deliberation dynamic that Principal (Dani) and Critic (Claude) have been practicing manually for months: Claude drafts reviewer briefs, Principal dispatches them to other LLMs, Claude synthesizes responses into a coherent position with convergence/divergence analysis.

**Brokered removes the manual tab-switching and paste work.** The caller Claude invokes Vāda's MCP, Vāda dispatches reviewers internally, Claude receives responses and synthesizes for the user.

This is not Autonomous Deliberation. Autonomous = multi-agent debate across 3 rounds inside a browser session. Brokered = single-shot advisory input that the caller Claude weaves into an ongoing conversation.

---

## The operational model

Three distinct roles in every Brokered interaction:

**1. The User** — the human using their AI chat client (Claude Desktop, Cursor, Claude.ai). They own the decision being made.

**2. The Caller Claude** — the Claude instance the user is talking to. This Claude has Vāda MCP installed. It plays the role of Critic / Strategist: recognizes deliberation-worthy moments, requests user permission, writes briefs, invokes the Vāda MCP tool, synthesizes responses, presents to user.

**3. The Reviewers** — the LLM instances that respond to briefs. They run inside Vāda's deliberation engine. They don't see each other (V1 sequential execution means they run in order, but each reviewer only sees the original brief, not prior reviewers' outputs). They don't see the user's conversation. They see only the brief, shaped by Vāda's role-specific system prompts.

**Implicit fourth role: Vāda itself** — the MCP server + engine + adapter coordinate execution, persistence, and error handling. It doesn't think; it executes.

---

## What Vāda V1 delivers

**Already shipped (Phase 4):**
- One MCP tool: `vada__consult` — dispatches 2-5 reviewers sequentially through the Vāda deliberation engine
- `BrokeredWorkflow` type in `@atta/engine` — sequential execution, no audit, no synthesis, no revision
- `brokeredTrio` team in `@vada/teams` — Strategist + Critic + Devil's Advocate
- Reviewer system prompts in `@vada/agents` (inherited from Crucible; validated for Brokered use in Phase 6)
- Session persistence to Postgres for dashboard review and audit

**Remaining V1 polish (Phase 6):**
- Tool description teaching Caller Claude when and how to invoke
- Input schema with strict validation and structured error responses
- Session persistence schema enrichment (session_title, origin, stakes, etc.)
- Domain Expert persona behind feature flag
- Reviewer prompt validation for single-shot context

## What Vāda V1 does NOT deliver

- Parallel execution (Phase 4.5 — sequential-only in V1)
- Partial failure handling (tied to parallel work)
- Web UI integration (`/deliberate` remains Autonomous-only in V1)
- Streaming responses
- Synthesis inside Vāda (Caller Claude owns synthesis)
- Reframer / Fatal Flaw Finder / other experimental personas (validate via production data first)

---

## Document index

1. **00-overview.md** — this file
2. **01-architecture.md** — component diagram, data flow, integration with @atta/engine
3. **02-mcp-tool-interface.md** — tool schema, parameters, return shape
4. **03-reviewer-personas.md** — system prompts for each persona, output formats
5. **04-caller-claude-protocol.md** — how the caller Claude uses Vāda, when to invoke, how to synthesize
6. **05-orchestration-rules.md** — when to run more rounds, when to escalate to Principal
7. **06-implementation-plan.md** — V1 status plus remaining work
8. **07-brokered-ui.md** — dashboard surface (pending repo migration)

Read in order. Each document assumes the previous ones are understood.

---

## Design principles (non-negotiable)

**Vāda uses `@atta/engine` like any other flow.** Brokered goes through the same engine + adapter that Crucible, Sparring, and baselines use. The only difference is the workflow type (`BrokeredWorkflow` vs `RoundsWorkflow`).

**Vāda is stateless across MCP calls.** Each call is independent. No memory of previous calls influences reviewer responses. Session persistence is for audit/dashboard only, not runtime logic.

**Claude owns synthesis.** Vāda returns raw reviewer responses per the tool contract. The caller Claude, with conversation context, synthesizes. Vāda does not attempt to pre-synthesize (V1 reserves `synthesisAgent` in the type but does not execute synthesis).

**Each reviewer is an orthogonal compression.** Strategist ≠ Critic ≠ Devil's Advocate. They process the same brief with different cognitive modes. Value comes from diversity, not redundancy.

**Reviewer system prompts forbid sycophancy.** All reviewers agreed this is their default failure mode. System prompts explicitly prohibit hedge phrases, polite introductions, and performative skepticism.

**Soft structure over rigid schema.** Required sections in markdown (Key Points / Risks / Recommendation). Flexible content within sections. Not JSON arrays.

**Principal (user) retains control.** Caller Claude asks permission before invoking Vāda unless the user explicitly requested reviewers. User can decline, refine the brief, or choose different reviewers.

**Empirical grounding over theoretical elegance.** Ship Roster A (Strategist + Critic + Devil's Advocate — validated). Add personas based on production data, not reviewer theory.

**Sequential execution in V1.** Parallel fan-out is a separate engineering problem (executionOrder determinism, LangGraph Send semantics). Sequential is correct and ships faster. 3 reviewers sequentially ≈ 3× one reviewer's latency, acceptable for V1.

---

## Why this matters

Vāda Brokered's moat isn't the MCP protocol or the engine integration. It's the **quality of thinking each reviewer produces** and the **orchestration protocol the caller Claude follows**. The reviewer system prompts (doc 03) and the caller protocol (doc 04) are Vāda's core intellectual property.

Everything else — transport, persistence, UI — is infrastructure that could be rebuilt. The prompts and protocols, once validated by real use, are the durable asset.
