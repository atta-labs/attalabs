---
title: Principal Interventions
description: Whisper, Directive, and Stop — the three ways a Principal can influence an active deliberation.
slug: /science/interventions
section: Architecture
order: 4
---

# Principal Interventions

The Principal is not a participant. The Principal is the person the deliberation is for. The agents talk to each other, not to the Principal. But the Principal is not powerless — three intervention mechanisms provide control without contaminating the debate.

## The Whisper — Asynchronous Context Injection

**Timing:** Any moment during the deliberation. Does not interrupt the current agent.

**Effect:** A note enters the room's awareness without disrupting the flow. The currently generating agent is unaffected — the whisper is only visible to agents in subsequent generations.

**Two types:**

- **Room Whisper** (`target: all`) — every agent sees it. Use for clarifying context, adding constraints, or redirecting the room's focus.
- **Agent Whisper** (`target: agent_name`) — only the targeted agent sees it. Use for giving specific instructions to one agent without others knowing. The targeted agent integrates the whisper naturally, without revealing it received private direction.

**UX:** During streaming, the whisper is invisible — the Principal stays in observation mode. In the archived transcript, whispers appear as faint, timestamped margin annotations with connection lines to the point where they entered the deliberation.

**Implementation:** `{role: principal_note, content: "...", target: all | agent_name}`

## The Directive — Synchronous Pivot

**Timing:** Between rounds only. The option surfaces when a round concludes.

**Effect:** A heavier intervention that explicitly redirects the deliberation. The Directive is shown to all agents at the start of the next round. It changes the room's trajectory.

**Safety interlock:** Before the Directive is applied, the system shows a one-sentence preview of the redirect. The Principal confirms. This prevents accidental derailing.

**When to use:** When the deliberation has gone down a productive but wrong path. The room is generating good friction about the wrong question. The Directive says: "Focus on X instead" or "The budget constraint is actually $500K, not $2M."

## The Stop — Emergency Synthesis

**Timing:** Instantaneous. Can be triggered at any moment.

**Effect:** Aborts the current agent's generation immediately. Triggers the full Conclusion Protocol on whatever transcript exists at the moment of the Stop.

**Outcome:** Early Stops naturally produce Unconverged conclusions, because the deliberation was interrupted before the Synthesizer could map genuine convergence. This is expected behavior — the Principal chose to stop, and the system is honest about what the incomplete deliberation could and could not resolve.

**When to use:** When the deliberation has given the Principal enough information and continuing would add noise rather than signal. Or when the Principal realizes the question itself was wrong and wants to start a new deliberation with a better frame.

## Design Philosophy

The three interventions form a spectrum of disruption:

| Intervention | Disruption | Visibility | Timing |
|-------------|-----------|-----------|--------|
| Whisper | None — absorbed silently | None (live), faint (archived) | Any time |
| Directive | Medium — redirects next round | Full — all agents see it | Between rounds |
| Stop | Maximum — ends deliberation | Full — triggers conclusion | Any time |

The design principle: the Principal should almost never need to intervene. A well-framed question with the right mode (Crucible vs War Room) produces a useful deliberation without interference. Interventions exist for the edge cases — the question that needs refinement mid-flight, the room that has gone down a productive but irrelevant path, the decision that has already been made.

---

*Next: [Context Depth vs. Freshness](/science/context) — the two kinds of knowledge that produce better conclusions.*
