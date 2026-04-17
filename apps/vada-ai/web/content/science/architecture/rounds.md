---
title: The Three Rounds
description: Orthogonal → Adversarial → Convergence — the geometry of structured deliberation.
slug: /science/rounds
section: Architecture
order: 1
---

# The Three Rounds

A single AI generation is linear — one model, one pass, one output. Vāda's three rounds are geometric, designed to manufacture the one thing a single AI cannot create: genuine surprise.

## Round 1 — Orthogonal Positions

Every agent receives the Principal's question and nothing else. No agent sees another's output. Each responds from its own posture — the Strategist maps opportunity, the Critic identifies risk, the Devil's Advocate questions the frame, the Synthesizer notes initial tensions.

The positions are orthogonal — they point in different directions because they originate from structurally different viewpoints. This is the thesis stage of the [Hegelian Dialectic](/science/dialectic).

**Implementation details:**
- All agents generate simultaneously on the backend.
- Context passed: the Principal's question only.
- UI: progressive reveal. Each agent's card appears as it completes, with a "waiting for N more..." indicator. Cards appear in a grid — no causal ordering implied.
- Timeout: per-agent (30 seconds). If one agent fails, present the others and flag the incomplete agent.
- Error recovery: if an agent errors entirely (API failure, timeout), skip it. Flag in transcript. Never abort the deliberation.

## Round 2 — Adversarial Collision

The agents read each other's Round 1 positions — the full, raw, uncompacted text. Then they respond.

This is where the product lives.

The Critic reads the Strategist's position and attacks the assumptions. The Devil's Advocate reads both and tells them they're arguing over the wrong question. The Researcher presents evidence that contradicts the room's emerging direction. The Strategist, reading the attacks, either defends or — through Vāda's permeability rules — acknowledges the flaw and rebuilds.

A single AI cannot replicate the moment a Devil's Advocate reads a Critic's takedown and says: "You are both arguing over the wrong timeline entirely." That moment requires two independent perspectives colliding, with neither able to predict the other.

**Implementation details:**
- Agents generate sequentially. Each reads the full raw transcript from Round 1 plus any preceding Round 2 responses.
- Responses stream word-by-word with `[TARGET: AgentName]` metadata tags for UI hooks. When the Critic attacks the Strategist's specific point, the tag creates a visual connection in the feed.
- The language is the data. No compaction, no summarization between rounds.

## Round 3 — Convergence

Same structure as Round 2. Full transcript from Rounds 1 and 2 is passed to each agent.

Agents converge toward resolution or clarify irreducible disagreement. Positions that survived Round 2's friction strengthen. Positions that were destroyed are abandoned — through the permeability rules, agents acknowledge when they've been beaten.

The Synthesizer speaks last. It maps where the room has converged and where genuine, irreducible disagreement remains. This mapping becomes the foundation of the [Conclusion Protocol](/science/conclusion).

## Why Raw Transcript Between Rounds

The specific language of disagreement is the data. When the Critic writes "Your assumption about European regulatory timelines is off by 18 months," those exact words are what the Devil's Advocate uses to build its Round 3 argument. If the system compressed that to "The Critic raised concerns about timelines," the friction surface is destroyed.

Compaction removes nuance. Nuance is what makes Round 2 adversarial and Round 3 productive.

At four agents and approximately 500 words each, Round 1 produces approximately 3,000 tokens — well below context rot thresholds. There is no technical reason to compress.

Compaction is appropriate only for distant-past context: reopening a V1 deliberation months later for review, or importing prior conclusions into a new session.

## The Geometry

<!-- DIAGRAM: Three connected circles
   Circle 1: "Orthogonal" — 4 arrows pointing outward in different directions
   Circle 2: "Adversarial" — arrows crossing, colliding, with friction marks
   Circle 3: "Convergence" — arrows narrowing toward a focal point (with 1-2 arrows still diverging)
   Caption: "Orthogonal → Adversarial → Convergence. The structure that no single model can replicate."
-->

The three rounds form a geometry of thinking:

**Divergence (Round 1)** produces breadth. Multiple independent perspectives ensure no single frame dominates.

**Collision (Round 2)** produces depth. Adversarial friction forces each position to defend itself or die.

**Convergence (Round 3)** produces resolution. What survived the collision is stronger than any single perspective. What didn't survive is honestly named.

This is not a conversation. It is a deliberation architecture.

---

*Next: [The Six Agents](/science/agents) — the cognitive postures that inhabit the rounds.*
