---
title: The Conclusion Protocol
description: How Vāda produces structured, audited conclusions — and the three terminal states.
slug: /science/conclusion
section: Architecture
order: 3
---

# The Conclusion Protocol

Every deliberation ends with a structured conclusion. Not a transcript. Not a summary. A conclusion with a specific format, because the format is part of the product.

## The Schema

The conclusion is enforced by Zod (TypeScript schema validation) and contains exactly five fields:

| Field | Description |
|-------|-------------|
| `recommendation` | Clear, actionable statement capturing *what* was decided and *why*. If the Principal requested a specific format (e.g., "5 lines"), formatting applies to this field's text string. Uses `\n` for line breaks within JSON. |
| `key_condition` | The single most important assumption that must hold for the recommendation to be valid. If this assumption fails, the recommendation should be revisited. |
| `unresolved_points[]` | Array of specific, named disagreements. Each references the agents involved and the specific claims they could not reconcile. Must not be invented — only real disagreements from the transcript. |
| `review_by` | ISO date set by the Synthesizer based on time-sensitivity in the transcript. When should this conclusion be revisited? |
| `participants[]` | Agents that participated, with version numbers. |

The schema is rigid by design. A conclusion that doesn't fit this structure is not a Vāda conclusion.

## The Blind Critic

After the Synthesizer produces the conclusion JSON, it is reviewed by the Blind Critic — an auditor who operates in a completely clean context window.

The Blind Critic sees exactly two things:
1. The Principal's original question.
2. The Synthesizer's conclusion JSON.

It has never seen the deliberation transcript. It does not know what arguments were made, which agents agreed, or how the room arrived at the conclusion. This is context deprivation as mechanism — the Critic's [freshness](/science/context) is what produces genuine skepticism.

The Blind Critic performs two audits:

**RULE 0 — Constraint Audit.** If the Principal requested a specific format ("5 lines", "bullet points"), the Critic evaluates only the `recommendation` field's text string. It does not flag the output for being JSON — that is the system's required format. `\n` characters count as valid line breaks.

**Logic Audit.** Does this conclusion hold up on its own? Is any claim unsupported? Has the Synthesizer papered over disagreement for fake consensus? Are the `unresolved_points` genuine or manufactured?

The output is binary: `PASS` (with no explanation) or `FLAG: [Field Name] - [Exact Objection]`. Vague objections are not actionable and are not permitted.

## Revision

If the Blind Critic flags an issue, the Synthesizer enters Revision Mode. It receives its original JSON plus the Blind Critic's specific objection. It fixes only the flagged element — it does not discard accurate parts. The Blind Critic then reviews the revision.

One revision cycle only. If the revision is also flagged, the deliberation terminates as Unconverged.

## The Three Terminal States

| State | Meaning | What the Principal Sees |
|-------|---------|------------------------|
| **Clean** | Conclusion passed the Blind Critic on first review. | Conclusion delivered. No annotations. |
| **Revised** | Conclusion was flagged, corrected, and approved. | Conclusion + "View the objection and revision." |
| **Unconverged** | Conclusion was rejected twice. No defensible conclusion could be produced. | Full transcript + honest note explaining why. |

**Unconverged is not a failure state.** It is the product telling the Principal something important about the nature of their question. Most AI products hide their uncertainty. Vāda names it.

A healthy distribution of terminal states is approximately 60% Clean, 30% Revised, 10% Unconverged. If Clean exceeds 80%, the Blind Critic may be too lenient. If Unconverged exceeds 20%, the Synthesizer may need recalibration.

---

*Next: [The Interventions](/science/interventions) — how the Principal interacts with an active deliberation.*
