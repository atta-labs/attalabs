---
name: vada-brokered
description: Vāda Brokered mode — single-shot advisory dispatch via MCP. Load when working on vada__deliberate, reviewer personas, caller protocol, or the MCP server tools. Distinct from Autonomous mode (multi-round browser sessions).
---

# Vāda Brokered Mode

## What it is

Brokered is Vāda's first-shipping MCP mode. The user's AI client (Caller Claude) invokes `vada__deliberate`, Vāda dispatches reviewers in parallel, and returns structured responses that Caller Claude synthesizes.

This externalizes the manual deliberation dynamic: previously, Principal would open tabs, paste context to different LLMs, and manually synthesize. Brokered removes the manual work — Caller Claude does the briefing and synthesis, Vāda handles routing and persistence.

**Brokered ≠ Autonomous.** Autonomous = multi-agent debate across 3 rounds in a browser session. Brokered = single-shot advisory reviewers consulted by Caller Claude mid-conversation.

---

## The Three-Role Model

Every Brokered interaction involves three distinct roles:

| Role | Who | Does |
|------|-----|------|
| **User** | Human in chat client | Owns the decision; may or may not know Vāda is involved |
| **Caller Claude** | The Claude instance the user is talking to | Recognizes deliberation-worthy moments, writes briefs, dispatches via MCP, synthesizes responses, presents to user |
| **Reviewers** | LLMs running inside Vāda MCP server | Respond to the brief using role-specific system prompts; never see each other's responses; never see the full conversation |

**Implicit fourth: Vāda itself** — MCP server coordinates dispatch, persistence, error handling. Does not synthesize; does not think. Routes and returns.

---

## Key Concepts

### Caller Claude Protocol

Caller Claude is not a passive relay. It:
1. **Decides** when deliberation is warranted (high-stakes, user ambivalent, multiple viable options)
2. **Asks permission** from the user before invoking (`"Worth getting a second opinion from a few reviewers?"`)
3. **Writes the brief** — a compressed, reviewer-appropriate framing of the decision (not a paste of the conversation)
4. **Dispatches** via `vada__deliberate` with per-reviewer context if needed
5. **Synthesizes** responses with convergence/divergence analysis
6. **Presents** a position to the user (not just a list of reviewer outputs)

Caller Claude owns synthesis. Vāda returns raw reviewer responses. Do not build pre-synthesis into the MCP response.

### Reviewer Personas (Roster A — V1)

| Persona | Cognitive mode | Default tools |
|---------|---------------|---------------|
| **Strategist** | Decision landscape — tradeoffs, hidden costs, real decision underneath | OFF (brief-only) |
| **Critic** | Adversarial stress-testing — where the plan breaks, what's missing | OFF |
| **Devil's Advocate** | Steel-man the alternatives — makes the opposing case as strongly as possible | OFF |
| **Domain Expert** | Specialist knowledge — field-specific constraints, precedents (flag-gated V1) | OFF |

**Reviewer invariants:**
- No greetings, no hedges ("it depends", "both have merit", "ultimately" are forbidden)
- Output: required markdown sections (Key Points / Risks / Recommendation)
- Explicitly instructed to resist sycophancy
- Never see other reviewers' responses
- Never see the user's full conversation — only the brief

### Orchestration Rules

- Caller Claude freely chooses which reviewers to invoke (minimum 2)
- Each reviewer gets a brief — shared context plus any reviewer-specific framing
- Vāda runs reviewers **in parallel** — no round-trip sequencing
- Partial failure is graceful: if one reviewer times out, others return with failure markers
- V1 latency: 15–20s single-call (no streaming)

### When Caller Claude Escalates

Caller Claude escalates to Principal (user) when:
- Reviewer responses strongly disagree and synthesis is not converging
- A reviewer raises a concern outside Caller Claude's authority to resolve
- The user's question involves irreversible high-stakes decisions where Caller Claude's synthesis could mislead

**Escalation = surface the divergence, name the unresolved question, stop.** Not: pick a side and hope.

---

## Vāda V1 Scope

**Delivers:**
- `vada__deliberate` MCP tool — dispatches 2-N reviewers, returns structured responses
- Roster A: Strategist, Critic, Devil's Advocate (+ Domain Expert behind flag)
- Session persistence to Postgres via `@atta/db`
- Partial failure handling

**Does NOT deliver in V1:**
- Streaming responses
- `vada__record_synthesis` (Caller Claude's synthesis persisted — deferred)
- Reviewer-to-reviewer awareness
- Pre-synthesis inside the MCP response
- Autonomous mode integration (separate mode, separate tool)

---

## Spec Location

Full specifications live at:

```
apps/vada-ai/specs/brokered-deliberation/
├── 00-overview.md          # What it is, operational model, design principles
├── 01-architecture.md      # Component diagram, data flow, sequence diagrams
├── 02-mcp-tool-interface.md # Tool schema, parameters, return shape
├── 03-reviewer-personas.md # System prompts for each persona, output formats
├── 04-caller-claude-protocol.md # How Caller Claude uses Vāda, when to invoke, how to synthesize
├── 05-orchestration-rules.md   # When to run more rounds, when to escalate
└── 06-implementation-plan.md   # Commit sequence, test gates, verification
```

This location (`apps/vada-ai/specs/brokered-deliberation/`) is the canonical permanent home. It follows the same pattern as `apps/vada-ai/specs/engine/` for engine-layer specs. Read in document order (00 → 06); each assumes the previous ones are understood.

---

## Implementation Location

```
apps/vada-ai/mcp-server/
├── src/
│   ├── server.ts               # MCP server entry + tool registration
│   ├── tools/
│   │   ├── consult.ts          # vada__consult (Brokered mode)
│   │   └── deliberate.ts       # vada__deliberate (Autonomous mode — do not confuse)
│   ├── reviewer-profiles.ts    # Persona registry — system prompts
│   ├── teams-registry.ts       # Team → engine mapping
│   └── session-logger.ts       # Postgres persistence
```

---

## Anti-patterns

- ❌ Pre-synthesizing inside MCP response (Caller Claude owns synthesis, not Vāda)
- ❌ Letting reviewers see each other's responses (destroys orthogonality)
- ❌ Invoking Brokered without user permission unless user explicitly requested reviewers
- ❌ Confusing `vada__consult` with `vada__deliberate` — check the tool name when working in `tools/`
- ❌ Adding reviewer personas to Roster A without production validation (empirical grounding over theory)
- ❌ Building pre-synthesis into the MCP layer — synthesis belongs in Caller Claude's conversation context

---

## When you need more context

- MCP server implementation: `apps/vada-ai/mcp-server/src/`
- Reviewer persona prompts: `apps/vada-ai/specs/brokered-deliberation/03-reviewer-personas.md`
- Caller Claude protocol: `apps/vada-ai/specs/brokered-deliberation/04-caller-claude-protocol.md`
- Orchestration rules: `apps/vada-ai/specs/brokered-deliberation/05-orchestration-rules.md`
- Engine types (Team, Agent, Plan): **atta-engine** skill
- Agent/team configs: **atta-teams** skill
