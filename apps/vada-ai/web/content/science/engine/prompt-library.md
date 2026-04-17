---
title: The Prompt Library
description: How Vāda composes each agent's instructions from modular, reusable prompt components.
slug: /science/prompt-library
section: Engine
order: 2
---

# The Prompt Library

Vāda's prompts are composable. No agent receives a monolithic system prompt. Instead, the final instruction is assembled at runtime from five modular components, concatenated in a specific order.

## Composition Formula

```
Final Prompt = [Base Posture + Permeability]
             + [Task Horizon]
             + [Round Modifier]
             + [Whisper Modifier]
             + [Universal Anchor]
```

Each component addresses a different concern:

| Component | File | Concern |
|-----------|------|---------|
| Base Posture + Permeability | `postures.ts` | Who the agent is. How it behaves. When it yields. |
| Task Horizon | `task-horizons.ts` | What the agent should NOT do this turn (prevents premature conclusion). |
| Round Modifier | `round-modifiers.ts` | Round-specific instructions (blind in R1, adversarial in R2-3). |
| Whisper Modifier | `whisper-modifier.ts` | Injected only when principal_note messages exist. |
| Universal Anchor | `compose.ts` | The Principal's exact question + formatting constraints. Always last. |

## The Composition Matrix

| Step | Base Posture | Task Horizon | Round Modifier | Whisper | Anchor |
|------|-------------|-------------|----------------|---------|--------|
| Round 1 | Agent + Permeability | Standard or Synth | Round 1 (blind) | If exists | ✓ |
| Round 2 | Agent + Permeability | Standard or Synth | Round 2/3 + [TARGET] | If exists | ✓ |
| Round 3 | Agent + Permeability | Standard or Synth | Round 2/3 + [TARGET] | If exists | ✓ |
| Conclusion | Conclusion Mode | N/A | N/A | N/A | ✓ |
| Blind Critic | Auditor prompt | N/A | N/A (clean context) | N/A | N/A |
| Revision | Revision Mode | N/A | N/A | N/A | N/A |

Note that the Blind Critic receives *no Universal Anchor* — it operates in a deliberately clean context. The anchor would contaminate its freshness.

## Task Horizon Constraints

Task Horizons prevent agents from overreaching. Without them, agents — especially the Synthesizer — attempt to conclude the deliberation prematurely.

**Standard Agents (Strategist, Critic, Devil's Advocate, Researcher, Operator):**
> *You are participating in a multi-round deliberation. Do NOT attempt to summarize, solve the final problem, or write a concluding recommendation. Your only job is to provide your specific perspective on the current state of the conversation.*

**Synthesizer (In-Room):**
> *You are participating in a multi-round deliberation. Do NOT write a formal recommendation or close the deliberation. Identify where the room has converged and where genuine disagreement remains.*

The distinction matters: the Synthesizer is permitted to map convergence (that's its role) but not to produce a recommendation (that's Conclusion Mode's job).

## Round Modifiers

**Round 1:**
> *This is Round 1. You are seeing this question for the first time. Respond ONLY to the Principal's prompt. Do not address or reference other agents, as they have not spoken yet.*

This prevents agents from anticipating others' positions — which would undermine the orthogonal design of Round 1.

**Rounds 2 and 3:**
> *This is Round [N]. You must read the transcript of the prior rounds. Address the friction. CRITICAL: If you are attacking a specific agent's point, you MUST begin your response with [TARGET: AgentName].*

The `[TARGET: AgentName]` tag serves a dual purpose: it forces agents to be specific about who they're challenging (preventing vague "some might argue" hedging), and it provides metadata for the frontend to render visual connections between attacks and their targets.

## Whisper Modifier

Appended dynamically only when `principal_note` messages exist in the transcript:

> *If you see a message tagged {role: principal_note, target: all}, this is context from the Principal that all agents can see. Integrate it naturally. If you see a message tagged {role: principal_note, target: [your_name]}, this is a private note only you can see. Integrate it without revealing you received it.*

If no whispers exist, this component is omitted entirely — keeping the prompt lean.

## Conclusion Mode Prompts

The Synthesizer's Conclusion Mode and the Blind Critic's Auditor prompt are standalone — they replace the standard composition formula rather than extending it. See [The Conclusion Protocol](/science/conclusion) for full prompt text.

---

*Next: [The Lifecycle](/science/lifecycle) — session states, persistence, and the deliberation state machine.*
