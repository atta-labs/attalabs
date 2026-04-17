---
title: Anti-Drift Mechanisms
description: The Universal Anchor and Meta-Debate Killswitch — preventing agents from forgetting their constraints.
slug: /science/anti-drift
section: Engine
order: 1
---

# Anti-Drift Mechanisms

In standard multi-round deliberations, agents drift. They respond to each other and gradually forget the original constraints from the Principal — length, tone, format, scope. By Round 3, a deliberation can become an echo chamber with increasingly loose adherence to the original question.

This is Context Drift, and it is especially severe with smaller, more efficient models operating under limited context windows. The problem is not a lack of instruction — it's a property of how language models process long contexts.

## Layer A: The Universal Anchor

**The Problem:** LLMs have a recency bias. The text at the end of the prompt has disproportionate influence on the generated output. When the Principal's constraints appear only at the beginning of the system prompt, the model has processed thousands of tokens of deliberation by the time it generates — and the constraints are diluted by the intervening context.

**The Solution:** Vāda appends a Critical Reminder block at the very end of every single prompt, every single turn:

```
CRITICAL REMINDER: The Principal's original question is: [QUESTION].
Your response must stay within the bounds of your role.
Do not exceed [TOKEN_LIMIT] words.
Do not summarize the entire conversation.
Provide only your perspective for this round.
```

This is not optional. Without the anchor, agents drift from constraints within 2-3 rounds. With it, constraint adherence remains stable through Round 3 and into the Conclusion Protocol.

**The Mechanism:** By placing the Principal's exact question and formatting rules at the bottom, the model reads them milliseconds before it starts generating text. The recency bias — normally a liability — becomes an enforcement tool. The constraints are the last thing the model sees, so they have disproportionate influence on the output.

**Implementation:** The `compose()` function in `compose.ts` concatenates prompt components in a specific order: Base Posture → Task Horizon → Round Modifier → Whisper Modifier → Universal Anchor. The anchor is always last.

## Layer B: The Meta-Debate Killswitch

**The Problem:** Contrarian agents — particularly the Devil's Advocate — tend to waste turns arguing that the question is poorly defined. "Is this even the right question to ask?" becomes a recursion trap. The agent argues about the meta-level rather than engaging with the substance.

This is intellectually valid but product-destructive. The Principal came for deliberation on *their question*, not a debate about whether the question deserves deliberation.

**The Solution:** The postures explicitly forbid meta-debates. Agents must participate in the exercise even if they disagree with the framing. They may challenge the frame as part of their argument — that's the Devil's Advocate's primary function — but they may NOT refuse to engage entirely or waste turns on meta-commentary.

The killswitch is embedded directly in the Devil's Advocate's posture:

```
Meta-Debate Killswitch: You must participate in the deliberation
even if you disagree with the framing of the question. You may
challenge the frame as part of your argument, but you may NOT
refuse to engage or waste turns arguing that the question is
poorly defined.
```

**The Balance:** The Devil's Advocate can say "This question assumes European expansion is desirable — what if consolidation is the better path?" That is frame-challenging. It cannot say "This question is too vague to deliberate" and stop there. That is meta-debate.

## Layer C: The Blind Audit Loop

**The Problem:** Even with the Universal Anchor and Killswitch, the Synthesizer can still produce a conclusion that papers over genuine disagreement. The Synthesizer has [context depth](/science/context) — it has been in the room for all three rounds. That depth can cause it to forgive logical errors because it understands the reasoning that led to them.

**The Solution:** The Blind Critic operates in a clean context window. It sees only the original question and the conclusion JSON. It knows nothing about the deliberation. This is context deprivation as mechanism — the [freshness](/science/context) that produces genuine skepticism.

If the Blind Critic flags an issue, the Synthesizer receives the specific objection and must fix only the flagged element. One revision cycle. If the revision is also flagged, the deliberation terminates as Unconverged.

This is the complete anti-drift stack: the Universal Anchor prevents agents from forgetting the question, the Killswitch prevents agents from dodging the question, and the Blind Audit prevents the Synthesizer from smoothing over the answer.

---

*Next: [The Prompt Library](/science/prompt-library) — the composable system that constructs each agent's instructions.*
