# Vāda Brokered Deliberation — Specification

**Status:** V1 specification
**Last updated:** April 2026
**Audience:** Implementers (Sonnet/Haiku agents), Principal, reviewers

---

## What Brokered Vāda is

Vāda Brokered externalizes the deliberation dynamic that Principal (Dani) and Critic (Claude) have been practicing manually for months: Claude drafts reviewer briefs, Principal dispatches them to other LLMs, Claude synthesizes responses into a coherent position with convergence/divergence analysis.

**Brokered removes Principal's manual tab-switching and paste work.** The caller Claude invokes Vāda's MCP, Vāda dispatches reviewers internally, Claude receives responses and synthesizes for the user.

This is not Autonomous Deliberation. Autonomous = multi-agent debate across 3 rounds inside a browser session. Brokered = single-shot advisory input that the caller Claude weaves into an ongoing conversation.

---

## The operational model

Three distinct roles in every Brokered interaction:

**1. The User** — the human using their AI chat client (Claude Desktop, Cursor, claude.ai). They own the decision being made.

**2. The Caller Claude** — the Claude instance the user is talking to. This Claude has Vāda MCP installed. It plays the role of Critic / Strategist: recognizes deliberation-worthy moments, requests user permission, writes briefs, dispatches reviewers via MCP, synthesizes responses, presents to user.

**3. The Reviewers** — the LLMs (potentially different models) that respond to briefs. They run inside the Vāda MCP server. They don't see each other. They don't see the user's conversation. They see only the brief the Caller Claude sent them, shaped by Vāda's role-specific system prompts.

**Implicit fourth role: Vāda itself** — the MCP server coordinates dispatch, persistence, error handling. It doesn't think; it routes.

---

## What Vāda V1 delivers

- **One MCP tool: `vada__deliberate`** — dispatches 2-N reviewers in parallel with per-reviewer briefs, returns structured responses
- **Core reviewer roster** (Roster A): Strategist, Critic, Devil's Advocate
- **Experimental persona**: Domain Expert (user-parameterized, flag-gated)
- **Reviewer system prompts** codifying each persona's character, output format, and forbidden failure modes
- **Session persistence** to Postgres for dashboard review and audit
- **Partial failure handling** — if one reviewer times out, others return with failure markers
- **Soft-structured output** — reviewers return semi-structured markdown (not rigid JSON, not free prose)

## What Vāda V1 does NOT deliver

- Streaming responses (accept 15-20s single-call latency)
- Domain Expert as default (flag-only in V1)
- `vada__record_synthesis` tool (deferred)
- Reviewer selection constraints beyond minimum-2 (Claude chooses freely)
- Reframer / Fatal Flaw Finder / other experimental personas (validate via production data first)

---

## Document index

This specification is split into separate documents for clarity:

1. **00-overview.md** — this file
2. **01-architecture.md** — component diagram, data flow, sequence diagrams
3. **02-mcp-tool-interface.md** — tool schema, parameters, return shape
4. **03-reviewer-personas.md** — system prompts for each persona, output formats
5. **04-caller-claude-protocol.md** — how the caller Claude uses Vāda, when to invoke, how to synthesize
6. **05-orchestration-rules.md** — when to run more rounds, when to escalate to Principal
7. **06-implementation-plan.md** — commit sequence, test gates, verification

Read in order. Each document assumes the previous ones are understood.

---

## Design principles (non-negotiable)

**Vāda is stateless across calls.** Each MCP call is independent. No memory of previous calls influences reviewer responses. Session persistence is for audit/dashboard only, not runtime logic.

**Claude owns synthesis.** Vāda returns raw reviewer responses. The caller Claude, with conversation context, synthesizes. Vāda does not attempt to pre-synthesize.

**Each reviewer is an orthogonal compression.** Strategist ≠ Critic ≠ Devil's Advocate. They process the same brief with different cognitive modes. Value comes from diversity, not redundancy.

**Reviewer system prompts forbid sycophancy.** All reviewers agreed this is their default failure mode. System prompts explicitly prohibit hedge phrases, polite introductions, and performative skepticism.

**Partial success over all-or-nothing.** One reviewer timing out does not fail the whole call. Responses return with per-reviewer status markers.

**Soft structure over rigid schema.** Required sections in markdown (Key Points / Risks / Recommendation). Flexible content within sections. Not JSON arrays.

**Principal (user) retains control.** Caller Claude asks permission before invoking Vāda unless the user explicitly requested reviewers. User can decline, refine the brief, or choose different reviewers.

**Empirical grounding over theoretical elegance.** Ship Roster A (validated). Add personas based on production data, not reviewer theory.

---

## Why this matters

Vāda Brokered's moat isn't the MCP protocol or the tool interface. It's the **quality of thinking each reviewer produces** and the **orchestration protocol the caller Claude follows**. The reviewer system prompts and the caller protocol are Vāda's core intellectual property.

Everything else — transport, persistence, UI — is infrastructure that could be rebuilt. The prompts and protocols, once validated by real use, are the durable asset.
