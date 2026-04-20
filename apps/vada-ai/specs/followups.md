# Vāda follow-ups

Deferred work discovered during development sessions. Each item is scoped for a specific release and has a concrete trigger for revisiting.

---

## V1 — code-output gap

The synthesizer is correctly forbidden from pasting code into the `recommendation` field (rule 5 change on 2026-04-19). This prevents the nested-JSON + truncation class of failure that produced the shopping-cart regression (session `4697f15c`). But it leaves users asking code questions with no code in the conclusion.

**V1 fix:** add a UI helper on code-request conclusions that surfaces the Round 3 transcript entries. Detection heuristic: if the question or any agent's round content contains a fenced code block, show a "The team's code examples are in the Round 3 transcript above" link or scroll anchor on the conclusion panel. No engine changes.

**V2 consideration:** extend the conclusion JSON schema with a `chosen_code` field — a single code example implementing the recommended approach only, emitted as its own string field separate from the prose `recommendation`. Makes "multiple code blocks crammed into one markdown field" structurally impossible rather than prompt-forbidden. Requires: schema change, parser/salvage/rescue updates, UI rendering path.

---

## V2 — synthesizer two-pass architecture

Current synthesis asks the model to do six things in one output: valid JSON, answer the question, key_condition, unresolved_points, review_by, format constraints. For small models this overloads a single generation and is a root cause of truncation failures. Consider splitting:

- Pass 1 (commitment): "What is the verdict? 2-3 sentences prose, no code." → produces `recommendation` text.
- Pass 2 (structured output): "Given this verdict, emit the full JSON conclusion with key_condition, unresolved_points, etc." → produces the rest of the schema.

Two smaller passes are more reliable for capacity-limited models. Material architecture change — not V1 work.

---

## Cleanup — delete display-time rescue code

One-time historical-row migration ran successfully on 2026-04-19 (`scripts/migrate-historical-rescue.ts` without `--dry-run` — rewrote 8 `originalJson` rows and 2 `revisedJson` rows). After UI verification that those 10 rows render cleanly without the read-time rescue path, delete:

- `src/engine/conclusion-rescue.ts`
- All callers: `app/deliberation/[id]/page.tsx`, `app/deliberation/[id]/benchmark/page.tsx`, salvage-artifact display logic in `ConclusionPanel.tsx`.

Gate: manual UI verification of the 8 migrated sessions. Keep both robustness layers until then — the write-time containment added 2026-04-19 plus the display-time rescue. Once verified, collapse to write-time only.

---

## Security — apiKey redaction in agent route error responses

Step 2 route at `/api/deliberation/[id]/agent/strategist` echoes raw error messages in 500 responses. If the underlying framework or AI SDK throws an error containing the `apiKey`, it could leak to clients. Add key-redaction to error responses before Step 6 (browser integration) or any production exposure.

Pattern: `message.replace(/sk-[a-zA-Z0-9_-]+/g, 'sk-[REDACTED]')` or equivalent for other provider key formats (OpenAI `sk-`, Anthropic `sk-ant-`, Groq `gsk_`, Google `AIza`).

**Gate:** must be in place before Step 6 wires the browser deliberation engine to agent invocation routes.

---

## Small-model posture adherence (observed Step 3, 2026-04-20)

Qwen 2.5 14B does not reliably maintain distinct agent personas under Vāda's posture system prompts. Output defaults to generic advisory voice regardless of role (Strategist, Critic, etc.). Claude Sonnet 4.6 maintains personas clearly.

This is a model capability ceiling, not an infrastructure bug. Verified in Step 3 Critic sanity test: same question + same orchestration code produces distinct Critic posture on Anthropic, generic advisory on Ollama Qwen 14B.

Implications:
- Vāda Bench should treat model capability as a primary dimension; measure posture-adherence rate across models.
- Product copy: note model capability requirement in `/trust` or `/science` when appropriate. Recommend Claude, GPT-4-class, or Llama 70B+ for serious deliberation.
- Containment work (Fixes #1-3 from previous session) is doubly justified: small-model posture failure and small-model JSON corruption are two axes of the same underlying capability ceiling.

No action for V1. This is ambient context for bench design and product positioning.

---

## Test scripts — Clerk token refresh for long-running runs

The Step 4a verification script (`scripts/test-full-deliberation.ts`) failed on its first run at Turn 5 with a 401 on `/next`. Root cause: Clerk session tokens fetched at script start expire in ~60s; the full 12-turn deliberation takes ~90–120s. Fixed by refreshing the token on each loop iteration.

For any future server-to-server orchestration (Step 5 workflow callbacks, CI-level smoke tests), tokens must refresh mid-run rather than once at invocation. Low priority — acceptable to handle per-script rather than centrally until there is a long-running server component that holds sessions across request boundaries.

---

## Typecheck OOM on @atta/vada-ai-web (observed 2026-04-20, temporary measure applied)

`bun run typecheck` crashed with SIGABRT/OOM on the @atta/vada-ai-web package. Reproduced on baseline `acc45fc` (before Commit 4 workflow code). Not caused by recent migration work — pre-existing type complexity issue.

**Update:** applied `NODE_OPTIONS='--max-old-space-size=8192'` to the typecheck script in `apps/vada-ai/web/package.json` as a temporary measure. Pre-commit hook now completes successfully.

Runtime is unaffected. Dev server, tests, and IDE diagnostics all work normally.

Still worth investigating long-term — 8GB heap is a heavy hammer. When addressing:
1. Use `tsc --traceResolution` or `--listFiles` to find hot spots
2. Look for generic explosions (Zod inference chains, Drizzle query builders, Clerk types)
3. Long-term: isolate the package into smaller compilation units

---

## Bench — V1 bench token-cost analysis

Now that workflow path correctly records deliberationTokensInput/Output (fix committed 2ef5638 on 2026-04-21), the next bench run (post-Synthesizer-refinement) will have clean cost data per question. V1 bench results (7/7 diagnosis split) have mixed data — T1/A1/E2 still have zero-token rows from pre-fix smoke test runs that were not re-executed.

**Action when analyzing V2 Experiment 1.A results:** re-run T1, A1, E2 to get clean token data, OR accept partial token coverage and focus analysis on the 11 questions with clean rows.

---

## Step 5.5 followup — LLM-level span instrumentation

Current Langfuse integration (committed 70b4bcd on 2026-04-21) traces at workflow and step level only. Individual LLM calls inside `executeAgentTurn` and `executeConclusionTurn` do not emit spans — prompts, responses, and per-call token counts are not visible in traces.

Verified in dashboard: workflow hierarchy and step execution are captured. `apiKey` correctly shows as `[REDACTED]`. But drilling into "what did the Critic say on Round 2?" requires reading the DB transcript, not the trace.

**Fix:** add OpenTelemetry span instrumentation inside `executeAgentTurn` and `executeConclusionTurn` in `@atta/orchestration` — emit a child span per LLM call with prompt (redacted), response snippet, input/output tokens, and duration.

Medium priority — workflow-level visibility is sufficient for V1 debugging. Per-call visibility helps with V2 experiments (e.g., comparing agent prompt variants, diagnosing why a specific round diverged).

**Gate:** ideally alongside or before V2 Phase 1 experiments where per-agent behavior becomes important to diagnose.

---

## Bench — Vāda Synthesizer over-compression (root cause of BASELINE_WON)

**Updated 2026-04-21 based on judge reasoning analysis.**

V1 bench produced 7 VADA_WON / 7 BASELINE_WON. Reading the three BASELINE_WON judge reasonings reveals the actual pattern: Vāda's Synthesizer is **not hedging** — it is **over-compressing**. The deliberation transcript contains useful content (conditional branches, stress-test warnings, practical caveats, heuristics) that the Synthesizer strips in producing the final conclusion.

Judge quotes:
- *"Deliberation tightened the prose and provided a cleaner verdict, but removed critical stress-test content"*
- *"Compressed away the unplanned work/capacity reservation heuristic"*
- *"Sacrificed important practical warnings"*

**Earlier hedging diagnosis (April 20) is superseded.** The pattern is compression, not caution.

**V2 fix (Experiment 1.A):** update conclusion-phase Synthesizer prompt to preserve conditional structure, caveats, and decision-support scaffolding from the deliberation transcript. Move from "produce a single recommendation" to "produce a structured recommendation with conditional branches where the deliberation surfaced them." See `vada-v2-specification.md` for full experiment plan.

---

## V2 — benchmarkMetrics experiment_id column

V2 experiments need to tag benchmarkMetrics rows with architecture version so historical comparisons are possible. Currently all rows are interchangeable; after V2 experiments start, we need to know which rows are V1 baseline vs V2 Experiment 1.A vs V2 Experiment 1.B, etc.

**Implementation:** Drizzle migration adding `experiment_id TEXT` or `architecture_version TEXT` column to `benchmark_metrics`. Default `"v1-baseline"` for existing rows. Bench runner accepts `--experiment-id` arg.

**Gate:** before first V2 experiment run.

---

## V2 — "Claude.ai equivalent" baseline for honest comparison

Current bench baseline is stripped single-shot Claude Sonnet API call (no tools, no search). This is fair as an architectural test but does not represent how humans actually use AI — real user comparison would be Claude.ai with web search and tool access.

**V2 addition:** add a second baseline column to bench: `baseline_claude_ai_equivalent` — single API call with web search tool enabled. Shows whether Vāda (with Challenge 2 tool parity) beats "what a user would actually use."

**Gate:** not before Challenge 2 Phase 2.1 (web search for all agents) ships — baseline is meaningful only once Vāda has equivalent capability.

---

## Step ~9 — Add Mastra evals

Mastra ships 16+ built-in evaluators: hallucination, faithfulness, prompt-alignment, context-relevancy, contextual-recall, tone-consistency, toxicity, keyword-coverage, summarization, answer-relevancy, etc. Both LLM-as-judge and rule-based variants.

When the full deliberation pipeline runs on Mastra (post-workflow, post-conclusion-migration), add evals as standardized quality signals. Specific applications:

- `prompt-alignment` measures posture adherence — directly addresses the Qwen 14B posture-failure finding from Step 3. Would produce systematic cross-model data.
- `faithfulness` measures whether Synthesizer's conclusion reflects the transcript — complements our containment work with automated detection. **Particularly relevant now:** V1 bench revealed Synthesizer over-compression; faithfulness eval would catch this systematically.
- `hallucination` measures invented claims — directly relevant to past regressions like the React class-component failure.
- `context-relevancy` measures whether Rounds 2/3 agents actually use transcript context.

Evals complement (don't replace) our custom DIAGNOSIS judge. Our judge answers "did Vāda win vs baseline?" Evals answer "along which dimensions?" Combined data: "Vāda won, driven by higher faithfulness and lower hallucination."

This is foundational to the future Vāda Bench — evals are the measurement primitives that turn the bench from "did it terminate CLEAN?" to "CLEAN + scored X on alignment + Y on faithfulness."

**Gate:** not before full Mastra migration completes. Ideally after Step 10 (docs).

---

## Observability — benchmark diagnosis history view

Now that `benchmark_metrics.judge_diagnosis` is a typed enum (`VADA_WON` / `BASELINE_WON` / `TIE` / `NEGLIGIBLE_DIFFERENCE` / `PIPELINE_FAILURE`), build a simple history/tally view: "in last N runs, Vāda won X%, baseline won Y%, pipeline failed Z%." Filterable by question shape (code / planning / forecasting / etc.) once we classify questions. This turns the benchmark from a per-run A/B into longitudinal quality surveillance.

**V2 requirement:** once experiment_id column exists, this view should also group by experiment_id so visible trend is "V1 baseline 7/14 → V2 Exp 1.A 9/14 → V2 Exp 1.B 11/14" etc.

---

## Docs — BYOK principles rewrite for transient-runtime model (Step 6)

`vada-byok-principles.md` currently claims:
- "API calls to model providers are made directly from your browser"
- "No server route accepts an API key as input"
- "Network tab: You'll see calls going directly from your browser to api.anthropic.com"

**After Step 6 (in progress on 2026-04-21), all three statements are false.** The new architecture sends apiKey to the server for each deliberation request, held in-memory for request lifetime, never persisted, never logged, redacted from all traces.

**Gate:** byok-principles.md rewrite must land in the same commit (or immediately after) Step 6 code changes. Communicate the evolution honestly: BYOK commitment shifts from "keys never leave browser" to "keys enter server only for the duration of a single request and are not retained anywhere." This is a structurally stronger posture than standard BYOK, just different in shape.

---

## Docs — V1 bench results as persistent document

`/tmp/vada-bench-morning.log` contains the raw 2026-04-21 bench output but will be cleared when /tmp is purged. The bench learnings should live in the repo.

**Action:** create `apps/vada-ai/specs/vada-v1-bench-results.md` capturing:
- 7 VADA_WON / 7 BASELINE_WON distribution
- Per-category breakdown
- Per-question session IDs and cost
- Full judge reasoning excerpts for BASELINE_WON cases
- Root-cause analysis (Synthesizer over-compression)
- Link to V2 Experiment 1.A as the response

This becomes the historical baseline referenced by all V2 experiments.

---

## Docs — architecture diagram

No doc visualizes Vāda's data flow: how the Mastra workflow executes, where apiKey transits, where redaction happens, what the browser sees vs server holds, where Langfuse traces attach.

**Action:** create a one-page diagram (SVG or Mermaid) showing:
- User enters question → session create
- Browser POSTs to /workflow/run with apiKey
- Server runs Mastra workflow → 12 agent turns → conclusion phases
- Each step persists to DB, emits Langfuse span (with apiKey redacted)
- SSE events stream back to browser as steps complete
- Terminal state → browser fetches full session for conclusion panel

**Value:** prevents future confusion about data flow. Supports onboarding. Documents security claims visually.

**Gate:** after Step 6 ships (data flow stabilizes).

---

### Probe: dynamic model discovery (replace hardcoded DEFAULT_PROBE_MODEL)

**Current problem:** `packages/identity/src/probe.ts:36` hardcodes one model per provider as probe fallback. These will rot as providers deprecate/rename models. On April 21, 2026, Anthropic's `claude-sonnet-4-6` was rejected by /v1/messages — the hardcoded default for anthropic. Fixed symptomatically, architectural problem remains.

**Proper design — dynamic model discovery:**
1. Replace probe with "list models" call per provider:
   - Anthropic: GET /v1/models
   - OpenAI: GET /v1/models
   - Google: GET /v1beta/models
   - Groq: GET /openai/v1/models
   - OpenRouter: GET /api/v1/models (no auth)
   - Ollama: GET /api/tags (local)
2. Listing models with a key acts as validation. If 401 → invalid key. If 200 → key valid, pick cheapest model from returned list for future fallback needs.
3. Cache discovered models per-session in identity state.
4. Remove `DEFAULT_PROBE_MODEL` entirely.

**Chicken-and-egg resolution:** list-models IS the validation. No pre-validation needed to list models.

**Providers without list-models endpoints:** graceful degradation — fall back to a "known-safe probe model" or skip probe entirely, letting first real use validate the key.

**Estimated effort:** 3-5 hours. Touches `packages/identity/src/probe.ts`, requires new cache in identity state, updates to `ApiKeyRow`, `useGlobalModelSelector`. Test across all 6 providers.

**Priority:** High. Tackle as first V2 infrastructure task before V2 Experiment 1.A. Avoids repeating the hardcoded-model rot for OpenAI, Google, Groq which will happen eventually.
