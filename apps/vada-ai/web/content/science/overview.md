---
title: Overview
description: What Vāda is, why it exists, and how it works — in two minutes.
slug: /science/overview
order: 1
---

# The Science of Vāda

Vāda is a deliberation engine. You bring a question. Multiple AI agents — each with a distinct cognitive role, running as separate instances with no shared memory — deliberate that question across three structured rounds. At the end, a conclusion surfaces that names what was resolved, what must be true for it to hold, and what could not be agreed on.

The name comes from Pāli, the language of the earliest Buddhist texts. *Vāda* means the act of deliberating toward a conclusion. Not argument for the sake of winning. Deliberation for the sake of arriving.

## Why This Exists

When you ask a single AI a question, you get one perspective. It will not argue with itself. It will not find the holes in its own reasoning. For simple questions, that is enough. For decisions that matter, it is not.

The best decisions in history were not made by one person thinking alone. They were made by groups of people with different knowledge, different dispositions, and the willingness to disagree in service of arriving at something true. That process — structured deliberation — is one of the most valuable things humans have ever figured out how to do.

It has never been available on demand. Vāda makes it accessible to anyone with a question.

## How It Works (The Short Version)

**Round 1 — Orthogonal.** Each agent looks at your question independently. No agent sees another's output. You get four to six genuinely independent perspectives.

**Round 2 — Adversarial.** The agents read each other. They attack. They challenge. They correct. This is where the product lives — the friction between perspectives that a single model cannot generate.

**Round 3 — Convergence.** The agents respond to the friction. Positions shift or harden. The Synthesizer maps where the room converged and where it genuinely cannot agree.

**Conclusion.** The Synthesizer produces a structured output: recommendation, key condition, unresolved points, review date. A Blind Critic — an auditor who never saw the deliberation — verifies the conclusion against your original question.

**Terminal State.** Clean (passed audit), Revised (caught a problem, fixed it), or Unconverged (no defensible conclusion possible — an honest signal, not a failure).

## The Three Modes

**The Crucible** — four agents, three rounds, full conclusion. Your default deliberation room.

**The War Room** — six agents (adds Researcher + Operator), three rounds, full conclusion. For decisions where abstract strategy must survive contact with reality.

**The Sparring Match** — two agents, no conclusion. Fast adversarial friction. The value is the debate itself.

## What Makes It Different

Vāda is not a chatbot with personas. It is a deliberation architecture grounded in four established frameworks: the Hegelian Dialectic, de Bono's Six Thinking Hats, Belbin Team Roles, and Military Red Teaming. Each agent's behavior maps to a specific epistemological function proven effective in human group decision-making.

The technical mechanism — Cognitive Quarantine — ensures that agent separation is structural, not theatrical. Each agent runs as a completely separate LLM instance. The Critic cannot see the Synthesizer's reasoning. The Devil's Advocate cannot predict how the Strategist will respond. The boundaries are real.

This documentation covers every layer: the science, the architecture, the engine, the validation, and the ecosystem.

---

*Start with [The Boardroom, Not the Factory](/science/boardroom) to understand Vāda's positioning, or dive into [Persona Collapse](/science/persona-collapse) to understand the problem it solves.*
