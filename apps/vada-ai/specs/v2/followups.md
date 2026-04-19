# Vāda follow-ups

Deferred work discovered during the 2026-04-19 benchmark audit + pipeline containment session. Each item is scoped for a specific release and has a concrete trigger for revisiting.

## V1 — code-output gap

The synthesizer is correctly forbidden from pasting code into the `recommendation` field (rule 5 change on 2026-04-19). This prevents the nested-JSON + truncation class of failure that produced the shopping-cart regression (session `4697f15c`). But it leaves users asking code questions with no code in the conclusion.

**V1 fix:** add a UI helper on code-request conclusions that surfaces the Round 3 transcript entries. Detection heuristic: if the question or any agent's round content contains a fenced code block, show a "The team's code examples are in the Round 3 transcript above" link or scroll anchor on the conclusion panel. No engine changes.

**V2 consideration:** extend the conclusion JSON schema with a `chosen_code` field — a single code example implementing the recommended approach only, emitted as its own string field separate from the prose `recommendation`. Makes "multiple code blocks crammed into one markdown field" structurally impossible rather than prompt-forbidden. Requires: schema change, parser/salvage/rescue updates, UI rendering path.

## V2 — synthesizer two-pass architecture

Current synthesis asks the model to do six things in one output: valid JSON, answer the question, key_condition, unresolved_points, review_by, format constraints. For small models this overloads a single generation and is a root cause of truncation failures. Consider splitting:

- Pass 1 (commitment): "What is the verdict? 2-3 sentences prose, no code." → produces `recommendation` text.
- Pass 2 (structured output): "Given this verdict, emit the full JSON conclusion with key_condition, unresolved_points, etc." → produces the rest of the schema.

Two smaller passes are more reliable for capacity-limited models. Material architecture change — not V1 work.

## Cleanup — delete display-time rescue code

One-time historical-row migration ran successfully on 2026-04-19 (`scripts/migrate-historical-rescue.ts` without `--dry-run` — rewrote 8 `originalJson` rows and 2 `revisedJson` rows). After UI verification that those 10 rows render cleanly without the read-time rescue path, delete:

- `src/engine/conclusion-rescue.ts`
- All callers: `app/deliberation/[id]/page.tsx`, `app/deliberation/[id]/benchmark/page.tsx`, salvage-artifact display logic in `ConclusionPanel.tsx`.

Gate: manual UI verification of the 8 migrated sessions. Keep both robustness layers until then — the write-time containment added 2026-04-19 plus the display-time rescue. Once verified, collapse to write-time only.

## Security — apiKey redaction in agent route error responses

Step 2 route at `/api/deliberation/[id]/agent/strategist` echoes raw error messages in 500 responses. If the underlying framework or AI SDK throws an error containing the `apiKey`, it could leak to clients. Add key-redaction to error responses before Step 6 (browser integration) or any production exposure.

Pattern: `message.replace(/sk-[a-zA-Z0-9_-]+/g, 'sk-[REDACTED]')` or equivalent for other provider key formats (OpenAI `sk-`, Anthropic `sk-ant-`, Groq `gsk_`, Google `AIza`).

**Gate:** must be in place before Step 6 wires the browser deliberation engine to agent invocation routes.

## Small-model posture adherence (observed Step 3, 2026-04-20)

Qwen 2.5 14B does not reliably maintain distinct agent personas under Vāda's posture system prompts. Output defaults to generic advisory voice regardless of role (Strategist, Critic, etc.). Claude Sonnet 4.6 maintains personas clearly.

This is a model capability ceiling, not an infrastructure bug. Verified in Step 3 Critic sanity test: same question + same orchestration code produces distinct Critic posture on Anthropic, generic advisory on Ollama Qwen 14B.

Implications:
- Vāda Bench (future) should treat model capability as a primary dimension; measure posture-adherence rate across models.
- Product copy: note model capability requirement in `/trust` or `/science` when appropriate. Recommend Claude, GPT-4-class, or Llama 70B+ for serious deliberation.
- Containment work (Fixes #1-3 from previous session) is doubly justified: small-model posture failure and small-model JSON corruption are two axes of the same underlying capability ceiling.

No action for V1. This is ambient context for bench design and product positioning.

## Test scripts — Clerk token refresh for long-running runs

The Step 4a verification script (`scripts/test-full-deliberation.ts`) failed on its first run at Turn 5 with a 401 on `/next`. Root cause: Clerk session tokens fetched at script start expire in ~60s; the full 12-turn deliberation takes ~90–120s. Fixed by refreshing the token on each loop iteration.

For any future server-to-server orchestration (Step 5 workflow callbacks, CI-level smoke tests), tokens must refresh mid-run rather than once at invocation. Low priority — acceptable to handle per-script rather than centrally until there is a long-running server component that holds sessions across request boundaries.

## Step 5.5 — Add Mastra observability (logging + AI tracing)

Between Step 5 (Workflow migration) and Step 6 (browser integration), add observability to `@atta/orchestration`. Use Mastra's built-in logging and tracing primitives. Suggested exporter: Langfuse or Braintrust (evaluate both for free tier limits, trace retention, and pricing curve).

Outcomes: per-deliberation traces showing every agent call with latency and tokens, aggregated cost tracking, ability to debug "why did this deliberation go wrong" by replaying traces.

Why this step specifically: post-Workflow (traces have the most structure), pre-browser (we need it most for debugging real traffic).

## Step-6 BLOCKER — rewrite /trust page for transient-runtime BYOK

The current guarantee on `/trust` ("no server route accepts an API key as input") becomes **false** in Step 6, when the browser switches to sending keys to the server via RequestContext for agent invocation. This is a structurally visible change in the BYOK commitment.

Before or during Step 6, rewrite the "Server routes" bullet on `/trust` (and the matching line in `vada-byok-principles.md`) to describe the new architecture honestly:

- Keys transit server memory for the lifetime of the specific request that uses them
- Never logged, never persisted to database, garbage-collected at request end
- The transport is HTTPS; the key is never written to any storage layer

The new copy should make clear that the BYOK guarantee shifted from "keys never leave the browser" to "keys enter the server only for the duration of a single request and are not retained." This is an honest architectural evolution, not a regression — but it must be communicated accurately before Step 6 ships.

**Gate:** this rewrite must land before or simultaneously with Step 6.

## Step ~9 — Add Mastra evals

Mastra ships 16+ built-in evaluators: hallucination, faithfulness, prompt-alignment, context-relevancy, contextual-recall, tone-consistency, toxicity, keyword-coverage, summarization, answer-relevancy, etc. Both LLM-as-judge and rule-based variants.

When the full deliberation pipeline runs on Mastra (post-workflow, post-conclusion-migration), add evals as standardized quality signals. Specific applications:

- `prompt-alignment` measures posture adherence — directly addresses the Qwen 14B posture-failure finding from Step 3. Would produce systematic cross-model data.
- `faithfulness` measures whether Synthesizer's conclusion reflects the transcript — complements our containment work with automated detection.
- `hallucination` measures invented claims — directly relevant to past regressions like the React class-component failure.
- `context-relevancy` measures whether Rounds 2/3 agents actually use transcript context.

Evals complement (don't replace) our custom DIAGNOSIS judge. Our judge answers "did Vāda win vs baseline?" Evals answer "along which dimensions?" Combined data: "Vāda won, driven by higher faithfulness and lower hallucination."

This is foundational to the future Vāda Bench — evals are the measurement primitives that turn the bench from "did it terminate CLEAN?" to "CLEAN + scored X on alignment + Y on faithfulness."

**Gate:** not before full Mastra migration completes. Ideally after Step 7 (conclusion phases on Mastra) and before Step 10 (docs).

## Observability — benchmark diagnosis history view

Now that `benchmark_metrics.judge_diagnosis` is a typed enum (`VADA_WON` / `BASELINE_WON` / `TIE` / `NEGLIGIBLE_DIFFERENCE` / `PIPELINE_FAILURE`), build a simple history/tally view: "in last N runs, Vāda won X%, baseline won Y%, pipeline failed Z%." Filterable by question shape (code / planning / forecasting / etc.) once we classify questions. This turns the benchmark from a per-run A/B into longitudinal quality surveillance.
