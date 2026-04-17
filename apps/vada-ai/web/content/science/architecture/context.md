---
title: Context Depth vs. Freshness
description: Two kinds of knowledge — and why Vāda's architecture deliberately employs both.
slug: /science/context
section: Architecture
order: 5
---

# Context Depth vs. Context Freshness

A discovery from the deliberation process that produced Vāda's own specification. Not predicted by theory — emerged from observing how the system behaved in practice.

## Context Depth

Context depth is what an agent has when it has been "in the room" for all rounds. It has seen every argument, every challenge, every shift in position. Its relationship to the material is deep and layered.

The Synthesizer works because it has context depth. It has witnessed the Strategist's opening position, the Critic's attack, the Devil's Advocate's frame rejection, and the Strategist's adaptation. When it maps the borders of agreement and disagreement, it draws on the full history of how those borders were negotiated.

The risk of context depth: anchoring. An agent with deep context can become captured by the room's gravitational pull. It may forgive a logical error in the conclusion because it remembers the plausible reasoning that led to it. It may underweight a flaw because it saw the room argue through it. Context depth creates empathy with the process — which can compromise judgment of the output.

## Context Freshness

Context freshness is what an agent has when it encounters something for the first time. It notices what the room stopped seeing. It asks the questions the room forgot to ask. Its judgment is uncorrupted by the deliberation's internal logic.

The Blind Critic works because it has context freshness. It evaluates the conclusion without the deliberation's gravitational pull. It sees the recommendation, the key condition, and the unresolved points as a stranger would — and asks: does this make sense on its own?

The risk of context freshness: ignorance. An agent with zero context may flag something that was thoroughly resolved in the deliberation. It may miss nuance that would be obvious to anyone who followed the full discussion.

## Why Both Are Necessary

Neither alone is sufficient:

- Depth without freshness produces conclusions that feel internally consistent but fail to stand alone. The Synthesizer knows too much about *why* the conclusion is shaped this way — and that knowledge prevents it from seeing the conclusion as an outsider would.

- Freshness without depth produces audits that are technically correct but miss the deliberation's earned understanding. The Blind Critic cannot know whether an unresolved point was genuinely unresolvable or simply unexplored.

Vāda's architecture deliberately employs both: in-room agents have depth, the Blind Critic has freshness. The Conclusion Protocol bridges them — the Synthesizer's depth-informed conclusion is verified by the Blind Critic's freshness-informed audit.

## Architectural Equivalent

This pattern has a precise analog in academic research: the double-blind peer review.

The researchers (depth) have spent months with the material. They understand every nuance, every design choice, every tradeoff. But they are too close to judge their own work objectively.

The reviewers (freshness) encounter the paper for the first time. They evaluate it strictly on what is written, not on what the authors intended. They catch assumptions that the authors stopped questioning. They identify gaps that the authors filled with tacit knowledge.

The combination — deep expertise audited by fresh judgment — is the mechanism that makes peer review work. Vāda implements this mechanism computationally.

---

*Next: [Anti-Drift Mechanisms](/science/anti-drift) — the enforcement layers that prevent agents from forgetting their constraints.*
