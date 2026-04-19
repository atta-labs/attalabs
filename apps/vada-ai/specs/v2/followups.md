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

## Security — apiKey redaction in Mastra route error responses

Step 2 route at `/api/deliberation/[id]/mastra/strategist` echoes raw error messages in 500 responses. If Mastra or AI SDK throws an error containing the `apiKey`, it could leak to clients. Add key-redaction to error responses before Step 6 (browser integration) or any production exposure.

Pattern: `message.replace(/sk-[a-zA-Z0-9_-]+/g, 'sk-[REDACTED]')` or equivalent for other provider key formats (OpenAI `sk-`, Anthropic `sk-ant-`, Groq `gsk_`, Google `AIza`).

**Gate:** must be in place before Step 6 wires the browser deliberation engine to Mastra routes.

## Observability — benchmark diagnosis history view

Now that `benchmark_metrics.judge_diagnosis` is a typed enum (`VADA_WON` / `BASELINE_WON` / `TIE` / `NEGLIGIBLE_DIFFERENCE` / `PIPELINE_FAILURE`), build a simple history/tally view: "in last N runs, Vāda won X%, baseline won Y%, pipeline failed Z%." Filterable by question shape (code / planning / forecasting / etc.) once we classify questions. This turns the benchmark from a per-run A/B into longitudinal quality surveillance.
