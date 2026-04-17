---
title: Cognitive Quarantine
description: How structural isolation between agents produces genuine adversarial friction.
slug: /science/cognitive-quarantine
section: Foundations
order: 2
---

# Cognitive Quarantine

Vāda's solution to [Persona Collapse](/science/persona-collapse) is structural, not instructional. Each agent runs as a completely separate LLM instance with its own system prompt, its own context buffer, and its own behavioral constraints. No agent reads the internal reasoning of another — only their outputs.

This is Cognitive Quarantine. It is the mechanism that makes multi-agent deliberation real rather than theatrical.

## How It Works

When the Critic receives the Strategist's Round 1 position, it sees only the Strategist's *published output* — the same text the Principal sees. It does not see the Strategist's system prompt. It does not know the Strategist's temperature setting. It cannot predict how the Strategist will respond to criticism.

The Critic's only directive is to find what is wrong. It does not know, nor does it care, how the Synthesizer will resolve the tension.

This substitutes the LLM's internal "probability smoothing" with actual, hard boundaries. The result is genuine surprise — moments where an agent says something that no single model would produce, because no single model would commit to a position strongly enough to be genuinely surprised by a challenge to it.

## The Quarantine Boundaries

Each agent is isolated along four dimensions:

**System Prompt.** Each agent has a distinct posture — a base directive, a permeability rule, and behavioral constraints. The Strategist's posture tells it to expand and map. The Critic's posture tells it to destroy. These are not suggestions — they are architectural commitments.

**Context Buffer.** Agents share transcript data (what was said) but not internal state (why it was said). The Critic sees the Strategist's argument but not the probability distribution that produced it.

**Temperature.** Different agents run at different temperatures. The Synthesizer in Conclusion Mode runs at 0.2 (precise, schema-compliant). The Devil's Advocate runs at 0.7 (exploratory, willing to commit to unusual positions). Temperature is a cognitive characteristic, not just a randomness dial.

**Instance.** Each agent is a separate API call. There is no shared state between calls. The model that generates the Critic's response literally cannot access the Strategist's generation context.

## What Quarantine Produces

The observable difference between a quarantined multi-agent system and a single-model multi-persona simulation is the *quality of disagreement*.

In a quarantined system, disagreements are substantive. The Critic attacks the Strategist's assumptions, not its tone. The Devil's Advocate rejects the frame entirely rather than suggesting minor adjustments. The Researcher presents evidence that contradicts the room's emerging consensus rather than confirming it.

In a single-model simulation, disagreements are performative. The "Critic" finds superficial flaws and then agrees with the "Strategist's" broader point. The "Devil's Advocate" raises a concern and then immediately qualifies it. The model is incapable of sustained adversarial commitment because it is optimizing for a resolution that satisfies all its internal "personas" simultaneously.

## Quarantine vs. Prompt Engineering

Cognitive Quarantine operates at a different level than prompt engineering:

**Prompt engineering** manipulates a model's behavior within a single inference. It shapes what the model says. It cannot change the model's fundamental drive toward internal consistency.

**Cognitive Quarantine** separates the inferences themselves. Each agent's generation is independent. The model cannot smooth between agents because the agents do not share an inference context.

This is why Vāda's architecture is structural separation, not more sophisticated prompting. The separation *is* the product.

## Maintaining Quarantine

Several implementation patterns protect the quarantine:

**No state sharing between agents.** The orchestrator passes only transcript text between rounds — never system prompts, internal reasoning, or metadata about other agents' configurations.

**Update, don't remount.** Changing an agent's state (idle → speaking → complete) uses `updateSphere` on the existing registration, not unmount/remount. Remounting causes cluster reassignment and breaks the quarantine's observable stability.

**Raw transcript between adjacent rounds.** The full, uncompacted text of prior rounds is passed to each agent. No summarization, no compression, no editorial cleanup. The specific words are the data — compaction removes the friction surface that makes Rounds 2 and 3 productive.

---

*Next: [The Hegelian Dialectic](/science/dialectic) — the philosophical backbone of Vāda's three-round structure.*
