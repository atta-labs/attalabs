# Forensic Auditor Prompt Quality Fixtures

Before/after evidence for the prompt improvements shipped in herald-agents-v2 Task 5.

## Evaluation Framework

Four quality dimensions scored 1–3 per report:

| Dimension | 1 (Poor) | 2 (Acceptable) | 3 (Strong) |
|-----------|----------|----------------|------------|
| **Signal evidence tier** | Bare CV stack listings presented as evidence | Some artifact anchoring, some self-report | Every signal cites a tier (High/Medium/Low) with a specific artifact or GitHub observation |
| **Signal specificity** | Generic ("strong TypeScript skills") | Named tool/framework with context | Named tool + architectural decision + production outcome |
| **Interview hook quality** | Concept probes ("how do you do X?") | Topic-anchored but not artifact-anchored | Artifact-anchored with decision boundary + aging dimension |
| **Gap/mitigation quality** | Vague gaps, platitude mitigations | Named gaps, adjacent-skill mitigations | Named gaps, specific evidence-backed mitigations citing profile artifacts |

A report scoring 2+ on all four dimensions is acceptable. 3 on all four is the target.

## Fixture Pairs

- `before/` — representative outputs captured before the prompt improvements (simulated from production behaviour patterns observed in June 2026 logs)
- `after/` — ideal-form outputs the improved prompt is designed to produce

Both fixtures use the same candidate+JD pair: **Alex Chen (PERFECT_MATCH) × Senior Frontend Engineer — Web3**. This pair is chosen because:
- The candidate has strong GitHub signal (wagmi, Turborepo, zod, radix-ui, active commits)
- The JD has clear hard requirements (8+ years, Web3 stack)
- A strong auditor should produce 6+ High-confidence signals and 3+ artifact-anchored hooks

## Scoring Evidence

`scoring.json` records the before/after scores per dimension and the rationale for each delta.
