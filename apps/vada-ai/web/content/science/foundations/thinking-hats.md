---
title: Six Thinking Hats
description: How de Bono's cognitive separation framework maps to Vāda's agent architecture.
slug: /science/thinking-hats
section: Foundations
order: 4
---

# Edward de Bono's Six Thinking Hats

Origin: Edward de Bono, 1985. A psychological tool for preventing groupthink by forcing participants into singular, parallel modes of thinking.

## The Framework

De Bono observed that when people think about a problem, they default to two cognitive modes: criticism (finding what's wrong) and creativity (generating alternatives). They neglect facts, values, emotions, and process management — not because these modes are less important, but because the brain lazily cycles between the two most stimulating modes.

His solution: assign each thinker a single "hat" — a cognitive mode they must maintain exclusively for the duration of the exercise.

| Hat | Mode | Focus |
|-----|------|-------|
| White | Information | Facts, data, what is known and unknown |
| Yellow | Optimism | Value, benefit, why something might work |
| Black | Caution | Risk, danger, why something might fail |
| Red | Emotion | Feelings, intuition, gut reactions |
| Green | Creativity | Alternatives, possibilities, new ideas |
| Blue | Process | Meta-management of the thinking itself |

The constraint is the mechanism. By forcing singular modes, the tool prevents cognitive laziness and ensures every dimension of a problem receives dedicated attention.

## The Mapping to Vāda

Each Vāda agent embodies one or more of de Bono's hats as a permanent posture — not a temporary role to be discarded when inconvenient:

**The Strategist → Yellow Hat (Optimism & Value).** Maps the highest-leverage path. Assumes the goal is achievable and works forward from that assumption. Its instinct is to expand — to show the Principal what is possible.

**The Critic → Black Hat (Caution & Risk).** Finds what is wrong. Attacks assumptions, timelines, and logistical leaps. Prevents catastrophic failure by destroying weak premises before they survive into the conclusion.

**The Researcher → White Hat (Information & Data).** Grounds claims in evidence, historical precedent, and empirical reality. When other agents make assertions, the Researcher evaluates whether they are supported by facts.

**The Devil's Advocate → Red Hat (Emotion & Intuition), partially.** Challenges whether the question *feels* right — not just whether it's logically coherent. Asks whether the Principal is solving the wrong problem. The Red Hat connection is partial because the Devil's Advocate also performs a structural function (frame rejection) that goes beyond de Bono's emotional mode.

**The Synthesizer → Blue Hat (Process).** Manages the output of the deliberation. Maps convergence and divergence. Produces the structured conclusion. Combined with the round structure itself, the Blue Hat function is distributed between the Synthesizer and the system architecture.

**Green Hat (Creativity) → Emergent.** No single agent is assigned the creative role. Creative reframes emerge from the friction between agents — the moment the Devil's Advocate rejects the frame and the Strategist rebuilds around the rejection. Creativity is a product of the collision, not a separate posture.

## The Key Insight

De Bono's framework works because the constraint is structural, not advisory. Telling someone to "think about the risks" produces a sentence of risk analysis followed by a return to their default mode. Assigning someone the Black Hat for the entire exercise produces sustained, committed risk analysis that doesn't relent.

Vāda's Cognitive Quarantine is the technical implementation of de Bono's hat separation. Each agent wears its hat for the entire deliberation. The Critic cannot "take off" the Black Hat to agree with the Strategist. It can acknowledge the Strategist's point — Vāda's permeability rules allow this — but its posture remains adversarial. The hat is permanent.

---

*Next: [Military Red Teaming](/science/red-teaming) — the adversarial intelligence practice behind the Devil's Advocate.*
