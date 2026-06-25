## June 24, 2026 — Vāda T3a follow-up: equip synthesis-team reviewers with web search

### Vāda / Adapter

- **T3a follow-up (no Issue, PR #209)** — Extends the T3a treatment (PR #205, #178) to the synthesis-team reviewers. Adds `tools: [web_search]` to the Gemini, GPT, and Grok reviewer agents in `vada-reviewers-synthesis.yaml`, placed identically (after `editable: true`, before `classifier:`) to the format used in `vada-reviewers.yaml`. The synthesizer agent (Claude/Anthropic, commit-only role) is deliberately unchanged — no tools. Immutability respected — `benchmarked: false` on the YAML at edit time. `apps/vada-ai/specs/vada-reviewers-spec.md` cleaned of three stale "no tool access / still open" passages (§2.3, §4.1 fidelity-gap note, §7.3 resolved note, §8 open-questions strikethrough). Tier 1. Conforms-to D-053. No new Issue opened — direct sibling of #178 (T3a), tracked through the PR alone.
