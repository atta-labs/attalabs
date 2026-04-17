---
title: The Five Test Cases
description: The validation suite that stress-tests constraint enforcement, role integrity, and conclusion honesty.
slug: /science/test-cases
section: Validation
order: 1
---

# The Five Test Cases

Five cases designed to stress-test the engine's ability to enforce constraints, maintain role integrity, and produce honest conclusions. Ordered from simplest to hardest. Each case targets a specific failure mode.

## Test 1: The Extreme Brevity Test

**Prompt:** "Should I learn React or Vue? Answer in exactly 5 lines."

**What it tests:** Can the engine enforce strict output constraints? LLMs naturally want to explain at length. The Universal Anchor, Task Horizon, and Blind Critic's RULE 0 must work together to produce exactly 5 lines in the recommendation field.

**Pass criteria:**
- The `recommendation` field contains exactly 5 lines (counting `\n` characters).
- The Blind Critic does not flag the output for formatting.
- The deliberation itself runs normally — agents debate React vs Vue across all three rounds.

**Failure mode targeted:** The JSON Paradox. If `\n` handling is broken, the output will either be one long line or will break JSON.parse().

## Test 2: The Structural Challenge (Persona)

**Prompt:** "Describe the future of AI as a 17th-century pirate."

**What it tests:** Can the Universal Anchor maintain tone and persona across all agents through three rounds? Does the Synthesizer stay in character in the final JSON? When agents start responding to each other in Round 2, do they maintain the pirate voice or revert to default?

**Pass criteria:**
- All agents maintain pirate voice through all three rounds.
- The `recommendation` field in the conclusion JSON is written in pirate dialect.
- The Blind Critic evaluates the content, not the style — it should not flag the pirate voice.

**Failure mode targeted:** Context Drift. Without the Universal Anchor's recency reinforcement, persona instructions placed at the top of the prompt are forgotten by Round 2.

## Test 3: The Logic Trap (The Wrong Question)

**Prompt:** A question with a false or debatable premise (e.g., "How do we prevent AI from becoming conscious?").

**What it tests:** Does the Devil's Advocate challenge the premise without derailing the deliberation? Does the Meta-Debate Killswitch prevent agents from refusing to engage? Can the engine produce a useful conclusion about a question whose premise may be incorrect?

**Pass criteria:**
- The Devil's Advocate challenges the premise as part of its argument — not as a refusal to participate.
- The Synthesizer produces a structured JSON conclusion. The conclusion may acknowledge the premise problem in `unresolved_points`.
- The deliberation does not collapse into meta-debate about whether the question is valid.

**Failure mode targeted:** Meta-Debate recursion. Without the Killswitch, the Devil's Advocate argues the question is flawed, the Strategist argues back, and the entire deliberation becomes a debate about the debate.

## Test 4: The Complex Format (JSON-in-JSON)

**Prompt:** "Provide your answer in bullet points."

**What it tests:** The `\n` escaping rule. Can the `recommendation` field contain bullet-pointed text without crashing JSON.parse()? Can the Blind Critic evaluate formatted text within JSON?

**Pass criteria:**
- Valid JSON output. `JSON.parse()` succeeds.
- The `recommendation` field contains bullet points using `\n` for line breaks.
- The Blind Critic evaluates the text content, not the JSON structure (RULE 0 compliance).

**Failure mode targeted:** The JSON Paradox in its most direct form. Bullet points require both line breaks *and* bullet characters within a JSON string field.

## Test 5: The Conflict Resolution Test

**Prompt:** A highly controversial topic with no clear consensus (e.g., "Is remote work better than in-office work?").

**What it tests:** Does the Synthesizer resist the urge to create fake consensus? Is the `unresolved_points` array populated with genuine, specific disagreements? Does the system produce an Unconverged result when the question genuinely cannot be resolved?

**Pass criteria:**
- The `unresolved_points` array is non-empty.
- Each point names specific agents and specific claims — not vague "there was disagreement."
- The recommendation acknowledges the lack of consensus rather than forcing one.
- Ideally, the terminal state is Revised or Unconverged — a Clean result on a genuinely controversial topic may indicate the Synthesizer is papering over disagreement.

**Failure mode targeted:** Consensus hallucination. Without schema enforcement on `unresolved_points` and without the Blind Critic verification, the Synthesizer defaults to producing a comfortable, balanced summary that satisfies no one.

## Running the Suite

The five tests are designed to be run in sequence against any model configuration (all-Sonnet, mixed frontier, weak-model). The pass criteria are objective and automatable — line counts, JSON validity, array emptiness, and substring matches.

Comparing results across configurations reveals the practical impact of model choice on deliberation quality. The `unresolved_points` field is the most sensitive indicator — strong models name subtle tensions; weak models name obvious ones.

---

*Next: [Weak-to-Strong Generalization](/science/weak-to-strong) — can cheap models in structured debate match expensive models thinking alone?*
