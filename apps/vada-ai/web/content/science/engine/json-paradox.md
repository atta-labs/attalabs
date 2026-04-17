---
title: The JSON Paradox
description: How Vāda handles the tension between user formatting requests and JSON schema compliance.
slug: /science/json-paradox
section: Engine
order: 4
---

# The JSON Paradox

An implementation discovery — not predicted by theory. The gap between what the user wants and what the system needs.

## The Problem

When the Principal requests a specific format — "answer in exactly 5 lines," "use bullet points," "write a haiku" — the Synthesizer must produce formatted text inside a JSON structure. But JSON does not naturally contain line breaks within strings. A raw newline inside a JSON string breaks the parser:

```json
// BREAKS — raw newline inside string
{ "recommendation": "Line one
Line two" }

// WORKS — escaped newline
{ "recommendation": "Line one\nLine two" }
```

The tension: the Principal wants a human-readable format. The system requires machine-parseable JSON. The Synthesizer must satisfy both simultaneously.

## The Solution

Two rules enforced at the prompt level:

**Rule 1: Formatting applies only to the `recommendation` string.** The schema structure (`key_condition`, `unresolved_points`, `review_by`) is not subject to the Principal's formatting constraints. If the Principal asks for "5 lines," those 5 lines live inside the `recommendation` field. The rest of the JSON is structural.

**Rule 2: Use `\n` for line breaks.** The Synthesizer uses escaped newlines (`\n`) within the recommendation string, preserving valid JSON while allowing formatted text. The frontend renders `\n` as actual line breaks.

## RULE 0 — The Blind Critic Accommodation

The JSON Paradox created a secondary problem: the Blind Critic would flag conclusions for "not being in the requested format" because it saw JSON when the Principal asked for "5 lines."

RULE 0 was added to the Blind Critic's prompt:

> *The system REQUIRES JSON output. Do NOT flag for being JSON. If the Principal asked for a specific format, evaluate ONLY the `recommendation` field's text string. CRITICAL: `\n` characters are valid line breaks — count them.*

With RULE 0, the Blind Critic evaluates formatting constraints against the text inside the JSON, not the JSON itself.

## The Forgiving Audit Pattern

A related discovery when testing with smaller models (Llama 3, Haiku): these models often add conversational filler around their output — "Here is my assessment: PASS" instead of simply "PASS."

The strict string match failed. The solution: the Blind Critic's output parser looks for the word `PASS` *anywhere* in the response (substring match), and `FLAG:` similarly. This accommodation handles model-specific verbosity without compromising the audit's integrity.

## Why This Matters

The JSON Paradox is a case study in the gap between specification and implementation. The Conclusion Protocol was designed with clean abstractions — schema, audit, terminal states. The reality of user formatting requests, JSON escape handling, and model-specific output patterns required three layers of accommodation (Rule 1, Rule 2, RULE 0) that the original design did not anticipate.

This is why the Science paper includes an Implementation Discoveries section. Theory gets you to 80%. The remaining 20% is earned through building.

---

*Next: [The Five Test Cases](/science/test-cases) — the validation suite that stress-tests every layer of the engine.*
