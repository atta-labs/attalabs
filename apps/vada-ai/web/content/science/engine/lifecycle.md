---
title: Session Lifecycle
description: The deliberation state machine — from question to terminal state.
slug: /science/lifecycle
section: Engine
order: 3
---

# Session Lifecycle

Every Vāda deliberation follows a unidirectional state machine. No state goes backward. Errors move forward or to TERMINAL with an error flag.

## State Machine

```
PENDING → ROUND_1 → ROUND_2 → ROUND_3 → CONCLUDING → AUDITING → [REVISING] → TERMINAL
```

| State | Description |
|-------|-------------|
| `PENDING` | Session created, question submitted, agents selected. Waiting for generation to begin. |
| `ROUND_1` | Agents generating orthogonal positions. All agents generate simultaneously (backend). Cards appear progressively in UI. |
| `ROUND_2` | Adversarial collision. Agents generate sequentially. Each reads the full Round 1 transcript. |
| `ROUND_3` | Convergence. Same structure as Round 2. Full transcript from Rounds 1-2 passed. |
| `CONCLUDING` | Synthesizer producing conclusion JSON in Conclusion Mode (temperature 0.2). |
| `AUDITING` | Blind Critic reviewing the conclusion in a clean context window. |
| `REVISING` | Optional. Synthesizer revising after a FLAG from the Blind Critic. |
| `TERMINAL` | Done. Terminal state set (Clean, Revised, or Unconverged). |

## Transitions

Transitions are unidirectional — no state goes backward. If the Blind Critic flags the conclusion, the state moves to REVISING (forward), not back to CONCLUDING.

A Stop intervention from the Principal immediately moves the state to CONCLUDING, skipping any remaining rounds.

An agent failure (API error, timeout) does not abort the deliberation. The failed agent is skipped and flagged in the transcript. Remaining agents continue.

## Persistence

**Incremental transcript persistence.** Each agent's response is written to the database as it completes — not at the end of the round or the end of the session. This enables mid-session reconnection.

**On reconnection:** The frontend reads the session state + persisted transcript, renders everything that has been generated, and resumes the live SSE stream from the current point. The Principal sees exactly where the deliberation was when they disconnected.

## Cost Guardrails

- Daily session limit per user. Default: 10 deliberations per day.
- Usage indicator: "You have N deliberations remaining today." No dollar amounts exposed.
- Daily count derived from query (`COUNT sessions WHERE created_at >= today`), not stored as a column. Stateless, correct by default.

## Streaming

All deliberation output is streamed via SSE (Server-Sent Events) using the Vercel AI SDK. A complete deliberation runs 2-3 minutes. SSE keeps the connection alive through serverless function timeouts.

The streaming experience is critical to the product feel:
- Round 1: cards appear as each agent completes (progressive reveal, no implied order).
- Rounds 2-3: word-by-word streaming with cognitive loading states between agents ("Critic is reading the Strategist's position...").
- Conclusion: visual shift — deliberation feed dims, conclusion panel appears with structured fields and terminal state badge.

---

*Next: [The JSON Paradox](/science/json-paradox) — the formatting problem that almost broke the Conclusion Protocol.*
