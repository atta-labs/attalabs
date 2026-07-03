# Benchmark Comparison Implementation Plan

Status: retired

> **For agentic workers:** This plan is executed inline in the same session. Each phase is one commit.
>
> **Commit policy:** Ship after each phase is green (typecheck + working tree), per user's explicit "do all today" directive.

**Goal:** Enable A/B comparison between Vāda's multi-round synthesis and a single-shot response from the same model, with tokens/time metrics and an AI-judge verdict. Prove (or disprove) Vāda's value objectively.

**Architecture:** Opt-in checkbox on `/deliberate`. When checked, browser fires the baseline call in parallel with the deliberation; after terminal, fires a judge call comparing both. All metrics (tokens in/out, elapsed ms) persist to a new `benchmark_metrics` table. New `/deliberation/[id]/benchmark` page renders a comparison table + both full responses + judge verdict.

**Tech Stack:** Drizzle migration, new API routes (`/api/sessions/[id]/baseline`, `/api/sessions/[id]/judge`), extend `@atta/identity` `invokeAgent` to return usage, extend `/turn` endpoint to accept per-call tokens/elapsed.

---

## Four phases, four commits

### Phase 1 — Schema + checkbox + baseline (~2h)

- Drizzle migration: `benchmark_metrics` table keyed by `session_id`. Columns for baseline answer/model/tokens/elapsed, judge response/tokens/elapsed, deliberation aggregate tokens + call_count + wall_ms, created_at/updated_at.
- `/deliberate` page: new checkbox "Run benchmark comparison (extra API call)". Off by default.
- `useDeliberateForm`: include `benchmark` boolean in POST to `/api/deliberation/start`.
- `/api/deliberation/start` route: accepts the flag; if true, inserts empty benchmark_metrics row on session create.
- Browser: when deliberation starts with benchmark enabled, fire single-shot call in parallel using existing `invokeAgent` with a minimal system prompt (*"Answer the user's question directly. No framing, no caveats."*). Capture usage + elapsed ms.
- New endpoint: `POST /api/sessions/[id]/baseline` accepts `{ answer, tokens_input, tokens_output, elapsed_ms, provider, model_id }`. Updates benchmark_metrics.
- ConclusionPanel: if benchmark_metrics exists, show a "View benchmark →" link.

**Commit:** `Feat: Benchmark baseline — opt-in single-shot comparison`

### Phase 2 — Deliberation token aggregation (~1.5h)

- Extend `invokeAgent` in `@atta/identity`: return `usage` Promise alongside `textStream` + `fullText`. Vercel AI SDK v6's `streamText` result already exposes `usage`; just plumb it through.
- `useDeliberation` drive loop: after `result.fullText()` resolves, await `result.usage`, capture `elapsedMs` from a `performance.now()` bookend around the call.
- `/api/deliberation/[id]/turn` body accepts optional `{ tokens_input, tokens_output, elapsed_ms }`. Server adds these into the benchmark_metrics row (sum tokens, sum elapsed, increment call_count) only if benchmark is enabled for the session.
- Record wall_ms at terminal: `session.updated_at - session.created_at` is the end-to-end wall clock.

**Commit:** `Feat: Deliberation token + elapsed aggregation for benchmark`

### Phase 3 — Judge call (~1h)

- Browser hook, triggers when session hits terminal AND benchmark_metrics.judge_response is null AND both baseline + conclusion exist: fire `invokeAgent` with a compare prompt:

```
You are an impartial judge. You are given:
1. A question.
2. Response A, produced by a single call to you.
3. Response B, produced by a 3-round multi-agent deliberation using the same base model.

Compare the two responses on: decisiveness, depth, accuracy, usefulness. Identify where the deliberation added value and where it added noise. Conclude with a one-line verdict: which response would you recommend the user act on, and why? Keep your full response to about 100 lines of markdown.
```

- Capture usage + elapsed.
- `POST /api/sessions/[id]/judge` saves `{ response, tokens_input, tokens_output, elapsed_ms }`.

**Commit:** `Feat: Model self-judgment over baseline vs deliberation`

### Phase 4 — Benchmark page (~1.5h)

- New route: `apps/vada-ai/web/src/app/deliberation/[id]/benchmark/page.tsx`.
- Reads session + benchmark_metrics via server query.
- Layout:
  - Top: original question
  - Visual: SVG diagram — question → two branches labeled "Vāda (N agents × 3 rounds)" and "Single-shot baseline"
  - Metrics table: tokens input, tokens output, elapsed ms, calls, model — one column per branch
  - Two scrollable panels below: Vāda recommendation (markdown) | Single-shot answer (markdown)
  - Judge verdict rendered as markdown at the bottom
- Link from ConclusionPanel ("View benchmark →") wired.

**Commit:** `Feat: Benchmark page — /deliberation/[id]/benchmark`

---

## Out of scope for today

- Per-agent per-round token breakdown (only aggregate totals)
- Multi-model judge (judge uses the same model as the session's default)
- Historical benchmarking dashboard across multiple sessions
- Cost-in-dollars computation (requires per-provider price table)
