# `karpathy/llm-council` and `Lykhoyda/ask-llm` — Technical Deep Dive

**Author:** Claude (Atta ecosystem — Critic role)
**Date:** April 28, 2026
**Audience:** Reviewers (LLMs and humans) pressure-testing the Vāda Reviewers spec. This document supports the spec by giving full technical context on the two prior-art projects we are learning from.
**Companion document:** `vada-reviewers-spec.md` — the forward-looking product spec this analysis informs.
**Scope:** Cognitive content, architecture, implementation patterns. Every prompt is verbatim. Every flow step is grounded in code references.

---

## 0. Why this document exists

The earlier cognitive analysis report dismissed `Lykhoyda/ask-llm` as "MCP transport with no cognitive content" based on the README. That was wrong. ask-llm contains substantial cognitive architecture in `packages/claude-plugin/agents/` and `packages/claude-plugin/skills/` — folders that were not opened in the original analysis.

This document is the corrected, symmetric analysis. Both projects are read end-to-end, every cognitive file is examined, every prompt is quoted verbatim. The goal is to give reviewers complete technical context so they can pressure-test the Vāda Reviewers spec against what these projects actually do.

The document is structured as four parts:

1. **`karpathy/llm-council` deep dive** (sections 1–3): every line of cognitive content
2. **`Lykhoyda/ask-llm` deep dive** (sections 4–7): the eight skills, four agents, lineage to the upstream Anthropic plugin
3. **Side-by-side comparison** (section 8): structural and behavioral differences
4. **Implications for Vāda Reviewers** (section 9): specific patterns to lift, specific patterns to avoid, open technical risks

---

# Part I — `karpathy/llm-council`

---

## 1. Project at a glance

**Repository:** `karpathy/llm-council`
**Size:** 818 lines of Python backend, ~1000 lines of React frontend, 5 commits in history
**Author's framing:** "99% vibe coded as a fun Saturday hack" — the README is explicit about this
**Stated purpose:** Side-by-side LLM comparison while reading books with LLMs. UX exploration, not deliberation research.

The project's full cognitive content lives in 6 Python files plus 3 string constants:

- `backend/config.py` — 26 lines. Hardcoded model list and Chairman selection.
- `backend/council.py` — 335 lines. The entire orchestration including all three prompts.
- `backend/openrouter.py` — 79 lines. API client. No system prompts.
- `backend/storage.py` — 172 lines. JSON conversation persistence. No cognitive logic.
- `backend/main.py` — 199 lines. FastAPI surface. Two endpoints (`/message` and `/message/stream`).
- `backend/__init__.py` — 1 line.

The frontend renders three tabs (Stage 1, Stage 2, Stage 3) and a sidebar of saved conversations. **No conversation history is passed between turns** — the input form only renders when `messages.length === 0`, confirming this is a strictly single-turn application.

**No system prompts are used anywhere.** Every model call uses a single user-role message containing the entire prompt as text.

**No temperature or sampling parameters are set.** The OpenRouter payload is `{"model": model, "messages": messages}` — provider defaults for everything else.

**Errors are silently swallowed.** Failed model calls return `None`; the pipeline continues with whatever survived.

These are facts about the implementation. They are not interpretations.

---

## 2. The three stages, fully verbatim

### 2.1 Stage 1 — Initial responses

There is **no prompt** for Stage 1. The user query is sent directly as a user-role message to all four council models in parallel:

```python
# council.py:23-33
async def stage1_collect_responses(
    user_query: str,
) -> List[Dict[str, Any]]:
    """Stage 1: Each council member independently answers the user query."""
    messages = [{"role": "user", "content": user_query}]

    # Query all council members in parallel
    responses = await query_models_parallel(COUNCIL_MODELS, messages)

    # Filter out failed responses and structure the data
    stage1_results = []
    for model, response in responses.items():
        if response is not None:
            stage1_results.append({
                "model": model,
                "response": response
            })
```

No system message. No framing. No role assignment. No format instruction.

The four council models are hardcoded in `config.py`:

```python
COUNCIL_MODELS = [
    "openai/gpt-5.1",
    "google/gemini-3-pro-preview",
    "anthropic/claude-sonnet-4.5",
    "x-ai/grok-4",
]
```

Each model receives an identical message and is asked nothing specific. This means **Stage 1's diversity is purely vendor diversity**. Same prompt, four providers, however each provider's defaults happen to differ.

### 2.2 Stage 2 — Anonymized cross-ranking

The full prompt, verbatim from `council.py:64-93`:

```
You are evaluating different responses to the following question:

Question: {user_query}

Here are the responses from different models (anonymized):

{responses_text}

Your task:
1. First, evaluate each response individually. For each response, explain
   what it does well and what it does poorly.
2. Then, at the very end of your response, provide a final ranking.

IMPORTANT: Your final ranking MUST be formatted EXACTLY as follows:
- Start with the line "FINAL RANKING:" (all caps, with colon)
- Then list the responses from best to worst as a numbered list
- Each line should be: number, period, space, then ONLY the response label
  (e.g., "1. Response A")
- Do not add any other text or explanations in the ranking section

Example of the correct format for your ENTIRE response:

Response A provides good detail on X but misses Y...
Response B is accurate but lacks depth on Z...
Response C offers the most comprehensive answer...

FINAL RANKING:
1. Response C
2. Response A
3. Response B

Now provide your evaluation and ranking:
```

How responses are presented (council.py:50-62):

```python
labels = [chr(65 + i) for i in range(len(stage1_results))]  # A, B, C, ...

# Build text representation with anonymized labels
responses_text = "\n\n".join([
    f"Response {label}:\n{result['response']}"
    for label, result in zip(labels, stage1_results)
])

label_to_model = {
    f"Response {label}": result['model']
    for label, result in zip(labels, stage1_results)
}
```

Each council member then receives this anonymized prompt and produces both qualitative critique and a parseable ranking. All four members run this in parallel — meaning each member is *also* ranking its own response anonymized.

Several technical details worth noting:

- **The criteria are unconstrained.** The README claims Stage 2 ranks responses on "accuracy and insight," but that phrase appears nowhere in the prompt. The prompt only says "evaluate" and "rank from best to worst." Each model invents its own evaluation criteria.
- **The labeling order is deterministic.** Labels A/B/C/D are assigned in `COUNCIL_MODELS` order, every time. No shuffling. If a model has primacy or recency bias in list evaluation, it's unmitigated.
- **Anonymization is name-stripping only.** Stylistic fingerprints leak through. A model that recognizes "Claude tends to use bullet lists with bolded headers" or "Grok tends to be terse and edgy" may de-anonymize via style.
- **The format is regex-parseable.** A `parse_ranking_from_text` function (council.py:177-208) extracts the rank order from the strict "FINAL RANKING:" header. Fallback extraction reads any "Response X" patterns in order — which can fail when qualitative critique mentions labels rhetorically.

### 2.3 Stage 3 — Chairman synthesis

The full prompt, verbatim from `council.py:142-157`:

```
You are the Chairman of an LLM Council. Multiple AI models have provided
responses to a user's question, and then ranked each other's responses.

Original Question: {user_query}

STAGE 1 - Individual Responses:
{stage1_text}

STAGE 2 - Peer Rankings:
{stage2_text}

Your task as Chairman is to synthesize all of this information into a
single, comprehensive, accurate answer to the user's original question.
Consider:
- The individual responses and their insights
- The peer rankings and what they reveal about response quality
- Any patterns of agreement or disagreement

Provide a clear, well-reasoned final answer that represents the council's
collective wisdom:
```

How the inputs are formatted (council.py:132-140):

```python
stage1_text = "\n\n".join([
    f"Model: {result['model']}\nResponse: {result['response']}"
    for result in stage1_results
])
stage2_text = "\n\n".join([
    f"Model: {result['model']}\nRanking: {result['ranking']}"
    for result in stage2_results
])
```

**Critical observation:** The Chairman sees full attribution. Stage 1 responses are presented as `Model: openai/gpt-5.1\nResponse: …` — fully de-anonymized. The Chairman knows who said what and who ranked what how. The anonymization protection only exists at Stage 2.

This matters because the Chairman is one of the council members. By default, `CHAIRMAN_MODEL = "google/gemini-3-pro-preview"` — meaning Gemini 3 Pro produced its own Stage 1 response, ranked others' responses anonymously at Stage 2, and now sees a fully de-anonymized synthesis input including its own response and its own ranking.

The synthesis prompt is non-specific about how to weight rankings. It says "consider … the peer rankings and what they reveal about response quality" but doesn't say how. The Chairman could weight, filter, ignore, or use rankings only to identify disagreement. Whichever it does is implicit.

### 2.4 Aggregate rankings — computed but not used in synthesis

The `calculate_aggregate_rankings` function (council.py:211-255) computes per-model average rank position across all peer evaluations. If Sonnet 4.5 was ranked 1st, 2nd, 1st, 2nd by the four evaluators, its average rank is 1.5.

This artifact is computed and returned to the frontend (where it's displayed as "Aggregate Rankings (Street Cred)" — yes, "Street Cred" is the literal UI label). **It is not given to the Chairman.** The Chairman receives raw ranking texts only.

The aggregate is purely for display. This is a missed opportunity in Karpathy's design: a structured quality signal computed cheaply, not used in synthesis. Whether intentional minimalism or an oversight is unknowable from the code; the "Saturday hack" framing suggests oversight.

---

## 3. Architectural choices and their implications

### 3.1 Single-turn only

The frontend's input form only appears when `messages.length === 0`. After the first question, the conversation is read-only. No follow-up. No conversation history passed to the council.

This is confirmed in the backend: `messages = [{"role": "user", "content": user_query}]` is constructed fresh every call, with no history.

**Implication:** llm-council is not a chat application. It's a question-answer demo with conversation-shaped persistence. This is a much weaker product than the README's "ChatGPT-like" framing suggests.

### 3.2 Silent error handling

From `openrouter.py:51-53`:

```python
except Exception as e:
    print(f"Error querying model {model}: {e}")
    return None
```

A `print` to stdout is not error handling. Failed model calls return `None` and the pipeline filters them out. A four-model council can become a three-model or two-model council mid-stage with no signal to the user.

**Implication:** llm-council's rigor is variable across runs. For UX exploration this is fine. For evaluation — which Karpathy isn't doing — this is unacceptable noise.

### 3.3 Lossy persistence

`storage.py:130-156` saves `stage1`, `stage2`, `stage3` text to JSON. **The `label_to_model` mapping and `aggregate_rankings` are not persisted.** Once saved, you cannot reconstruct from the JSON which "Response A" in a Stage 2 evaluation referred to which model.

The frontend de-anonymizes via string replacement at render time, using `label_to_model` from the live SSE event. After page reload, this metadata is gone.

**Implication:** llm-council treats deliberation as a chat log, not as a first-class auditable object. Any system aiming for "Conclusion as Record" (which Vāda does) cannot adopt this pattern.

### 3.4 No system messages, anywhere

Confirmed via grep across all backend files: `"role": "system"` does not appear. Every model call is a single user-role message containing the prompt text.

**Implication:** Every "role" in llm-council exists as text inside a user-role prompt. This is a weaker mechanism than a true system prompt, which providers tune their models to weight specifically. Karpathy almost certainly didn't intend this — it's just what defaults ship.

### 3.5 No temperature or sampling

`openrouter.py` constructs the payload as:

```python
payload = {
    "model": model,
    "messages": messages,
}
```

No temperature, no top_p, no top_k. Each provider's defaults apply.

**Implication:** Cross-provider variance includes default-temperature differences (GPT-5.1's defaults vs Sonnet 4.5's defaults differ). For a project whose explicit purpose is comparing models, this is methodologically loose. We should not adopt the pattern.

### 3.6 No benchmarks

There is no test suite for cognitive output. No example transcripts. No evaluation. The README explicitly disclaims any output-quality claim.

**Implication:** llm-council is not evidence that any of its design choices produce better outputs than single-shot. It is a UX exploration. Treat it as a design artifact, not as research.

---

# Part II — `Lykhoyda/ask-llm`

---

## 4. Project at a glance

**Repository:** `Lykhoyda/ask-llm`
**Type:** Monorepo with multiple npm packages (4 MCP servers + 1 Claude Code plugin)
**Status:** Active project. Multiple commits. CHANGELOG.md, DECISIONS.md, ROADMAP.md, benchmarks folder.
**Author's framing:** Engineering project with documented design decisions.

This is a *much* more serious project than llm-council, despite my earlier dismissal. The cognitive content lives in three places:

- **MCP servers** (`packages/*-mcp/`): transport-only. Shell out to CLI tools. Per the earlier analysis, these are correctly described as transport.
- **Sub-agents** (`packages/claude-plugin/agents/`): full Claude Code agent definitions with system prompts, tool access, and operational protocols. This is where the deliberation logic lives.
- **Skills** (`packages/claude-plugin/skills/`): slash-command definitions that wire the agents and MCP tools together.

The MCP servers are the lowest-level primitive. The agents are the cognitive coordinators. The skills are the user-facing entry points. This three-layer architecture is itself worth understanding — it separates transport from cognition from UX cleanly.

---

## 5. The eight skills

All skills live in `packages/claude-plugin/skills/*/SKILL.md`. Each is a Claude Code slash command. Here is the complete inventory:

| Skill | Function | Synthesis | Pattern |
|---|---|---|---|
| `/brainstorm` | General multi-LLM consultation, with synthesis | Yes | The flagship — closest to Vāda Reviewers |
| `/brainstorm-all` | Same but forces all 3 providers + Ollama | Yes | Convenience preset |
| `/compare` | Side-by-side raw responses, **no synthesis** | **No** | Inspection mode |
| `/multi-review` | Code-diff specific. Multiple reviewers + verification | Yes | Code specialization |
| `/gemini-review` | Single-vendor diff review (Gemini only) | N/A | Single-reviewer wrapper |
| `/codex-review` | Single-vendor diff review (Codex only) | N/A | Single-reviewer wrapper |
| `/ollama-review` | Single-vendor diff review (Ollama only) | N/A | Single-reviewer wrapper |
| `/codex-image` | Image generation via Codex CLI | — | Out of scope (not deliberation) |

The cognitive substance is in two of these:

- **`/brainstorm`** — the general-purpose synthesized review pattern. This is the one most relevant to Vāda Reviewers.
- **`/multi-review`** — the code-review specialization with explicit verification.

The single-vendor reviews (`/gemini-review`, `/codex-review`, `/ollama-review`) are convenience wrappers that let users invoke just one reviewer without the multi-vendor coordination overhead. `/compare` is a no-synthesis variant of `/brainstorm`. `/codex-image` is unrelated to deliberation.

**Implication for Vāda:** ask-llm has settled on a multi-skill architecture — a flagship + variants + specializations. Vāda Reviewers should plan for this evolution but ship the flagship first.

---

## 6. The flagship — `brainstorm-coordinator` agent

This is the central cognitive content of ask-llm. It's a 197-line system prompt for an Opus sub-agent that coordinates the entire `/brainstorm` flow.

The agent's frontmatter:

```yaml
name: brainstorm-coordinator
description: Coordinates multi-LLM brainstorming by (1) performing its own
  independent Claude Opus research on the topic and (2) consulting external
  providers (Gemini, Codex, Ollama) via a single foreground Bash dispatch,
  then synthesizing all findings into consensus points, unique insights,
  and actionable recommendations. Claude's findings are weighted higher
  when verified against real repository state.
model: opus
color: magenta
tools:
  - Bash
  - Glob
  - Grep
  - Read
  - WebFetch
  - WebSearch
  - mcp__gemini__ask-gemini
  - mcp__codex__ask-codex
  - mcp__ollama__ask-ollama
```

Note the Opus binding and the tool access — Bash, Glob, Grep, Read for filesystem inspection; WebFetch and WebSearch for external lookup; three MCP tools for external LLMs.

The agent's stated jobs:

> 1. **You are a first-class research participant.** Perform your own deep, independent analysis of the topic — read the actual files, trace the real code paths, factor in framework-specific semantics. Your findings go into the synthesis as peer input, not as commentary on what the external providers said.
> 2. **You orchestrate external consultations.** Dispatch the topic to the selected external providers (Gemini, Codex, Ollama) via a **single blocking foreground Bash call**, collect their responses, and combine them with your own research in a structured synthesis.

This is significant: **the coordinator is itself a participant**, not a meta-orchestrator. It does its own research, then dispatches externals, then synthesizes. The synthesizer is also a peer.

### 6.1 Core principles, verbatim

```
1. Sequential phases, internal parallelism — Phase 3B (Claude research) runs
   first, then Phase 3A (external dispatch) runs via a single blocking Bash
   call that parallelizes providers internally via & + wait. This is not a
   stylistic choice — sub-agents cannot own background processes that
   outlive their turn.

2. Blindness to external responses is load-bearing — Phase 3B must complete
   *before* Phase 3A dispatches external providers, otherwise Claude will
   anchor on external findings and stop being an independent participant.
   The sequential ordering enforces this structurally.

3. Verified findings outrank inferred ones — when Claude has Read the actual
   files and traced real code, those findings carry more weight than an
   external LLM pattern-matching from a topic description alone.

4. Preserve unique perspectives — don't flatten differences; highlight where
   participants disagree.

5. Actionable synthesis — the output should help the user make decisions,
   not just list opinions.
```

The "blindness" principle is the most cognitively interesting. It's an explicit anti-anchoring mechanism: Claude must commit to its own findings before being exposed to external opinions. This is exactly what Dani does manually (think first, then ask reviewers, then synthesize) and it's not present in llm-council or in Vāda's current YAMLs.

### 6.2 The four phases

**Phase 1 — Context Gathering:**

> - If the user provided a topic/question, use it directly
> - If the topic involves code, gather relevant context (diffs, file contents, architecture)
> - If the topic is a plan or design, include the full proposal text
> - Note which files, skills, or artifacts are referenced — you'll Read them in Phase 3B

**Phase 2 — Prompt Construction:**

> Build a clear, structured prompt for the external providers. The prompt should:
> - State the topic or question precisely
> - Include all relevant context (code, plans, constraints)
> - Ask for specific deliverables (e.g., "review for X, Y, Z" or "suggest alternatives for X")
> - Request structured output (numbered points, pros/cons, priorities)

**Phase 3B — Claude Opus Research (runs first, always):**

> 1. Read the actual artifacts. If the topic references specific files, skills, or code, Read them. Don't reason about what you assume they contain — verify. Use Glob and Grep to find supporting context.
> 2. Trace through the real behavior. If the topic involves a pipeline, effect, state machine, or control flow, mentally execute the code with the repo's actual conventions in mind. Factor in framework-specific semantics (React Compiler, XState, RTK Query, etc.) that a generic reviewer might miss.
> 3. Use WebFetch/WebSearch when the topic references external docs.
> 4. Form independent findings structured identically to the external providers' output: numbered points, pros/cons, priorities.
> 5. Record confidence per finding. Mark each finding as:
>    - **Verified** — backed by an actual file Read, code trace, or fetched document (highest confidence)
>    - **Inferred** — reasoned from the topic description without direct verification (lower confidence)
> 6. Do NOT skip ahead to Phase 4. External provider responses don't exist yet — Phase 3A hasn't run. Complete your entire Claude view *before* issuing the Phase 3A Bash call. This blindness is what makes you a peer participant instead of a commentator.

**Phase 3A — External Provider Dispatch (single blocking Bash call):**

This is the technically most interesting phase. The full Bash template is in section 6.3 below.

**Phase 4 — Synthesis:**

> **Cross-check high-confidence external claims first.** Before promoting any external-provider finding to "Consensus," spot-check it against the source if it cites a specific file/line/symbol. External providers can return high-confidence claims that are factually wrong — for example, on 2026-04-17 Gemini returned two findings at 95/100 confidence that were contradicted by the actual `.d.ts` and an existing fallback path. A 30-second `Read` or `Grep` is the difference between recommending a real fix and recommending a non-fix. Mark each cross-checked finding as **Verified** (matches source), **Rejected** (false positive — exclude from synthesis), or **Unverifiable** (no source citation or external-only knowledge — present as-is with a note).

The synthesis output structure:

> **Consensus Points** — Issues or suggestions that multiple participants independently identified AND survived cross-checking.
>
> **Unique Insights** — Valuable points raised by only one participant (after cross-check). Flag which participant raised it and why it's worth considering.
>
> **Contradictions** — Points where participants disagree. Present both sides and assess which is more likely correct based on the evidence.
>
> **Rejected (false positives)** — Surface high-confidence external claims that failed cross-check, with a brief note on what the provider missed.
>
> **Recommendations** — Synthesized recommendations based on the combined analysis, prioritized by impact and confidence.

### 6.3 The Bash dispatch — full verbatim

The single most operationally interesting piece of code in either repo:

```bash
set +e
workdir=$(mktemp -d /tmp/brainstorm-XXXXXX)
trap 'rm -rf "$workdir"' EXIT

# Write the constructed Phase 2 prompt once so all providers read the same bytes.
cat > "$workdir/prompt.md" <<'PROMPT_EOF'
<INSERT THE PHASE 2 PROMPT HERE>
PROMPT_EOF

# Background each provider DIRECTLY in this shell — no subshells.
gemini -p "@$workdir/prompt.md" > "$workdir/gemini.out" 2> "$workdir/gemini.err" &
pid_gemini=$!

codex exec --full-auto - < "$workdir/prompt.md" > "$workdir/codex.out" 2> "$workdir/codex.err" &
pid_codex=$!

ollama run qwen2.5-coder:7b < "$workdir/prompt.md" > "$workdir/ollama.out" 2> "$workdir/ollama.err" &
pid_ollama=$!

# Wait for each by PID so we capture per-provider exit codes independently.
wait "$pid_gemini" 2>/dev/null; rc_gemini=$?
wait "$pid_codex"  2>/dev/null; rc_codex=$?
wait "$pid_ollama" 2>/dev/null; rc_ollama=$?

echo "===== GEMINI (rc=$rc_gemini) ====="
cat "$workdir/gemini.out" 2>/dev/null
echo "===== GEMINI STDERR ====="
cat "$workdir/gemini.err" 2>/dev/null
echo "===== CODEX (rc=$rc_codex) ====="
cat "$workdir/codex.out" 2>/dev/null
echo "===== CODEX STDERR ====="
cat "$workdir/codex.err" 2>/dev/null
echo "===== OLLAMA (rc=$rc_ollama) ====="
cat "$workdir/ollama.out" 2>/dev/null
echo "===== OLLAMA STDERR ====="
cat "$workdir/ollama.err" 2>/dev/null
```

This is not boilerplate. The agent's prompt has an entire section explaining why it's structured this way. From the agent file:

> **Never dispatch external providers as background jobs from within this sub-agent.** When the coordinator's turn ends (e.g., because it has issued all its tool calls and is waiting for an external notification), Claude Code tears down the sub-agent's shell context and SIGKILLs all background processes owned by the sub-agent. Codex at high reasoning effort is especially vulnerable because it can take several minutes to produce a response, and during that time the coordinator has no foreground work left. This was issue #23 — and the failure mode is **silent**: 0-byte output files, no error, no exit code.
>
> Concretely:
> - ❌ **Don't** use `run_in_background: true` on Bash tool calls dispatching providers.
> - ❌ **Don't** use `(cmd &) && wait` — the parentheses spawn a subshell that detaches the child from the outer shell's job table, so the outer `wait` has nothing to wait for and returns immediately.
> - ❌ **Don't** split dispatch across multiple sequential Bash calls.
> - ✅ **Do** use a SINGLE blocking foreground Bash tool call with direct backgrounding.
> - ✅ **Do** pass `timeout: 600000` to the Bash tool call.
> - ✅ **Do** capture stdout and stderr per provider so Phase 4 can detect and report provider-level failures cleanly.

This pattern was learned by hitting issue #23 — silent provider failures with empty output. The pattern in the agent file is the post-incident correction.

**Implication for Vāda:** if Vāda's engine implements CLI subprocess execution, it must implement *this exact pattern*. The naive approach (background each provider in separate Bash calls, or run in the engine's own subprocess pool) will hit the same lifecycle issue if the execution context is similarly constrained. We should treat ask-llm's pattern as the reference implementation.

### 6.4 Failure handling

> **Failure handling:**
> - If a provider exits non-zero or its stdout is empty, record it as failed in Phase 4 ("⚠️ [Provider]: failed — stderr: …") and continue the synthesis with the ones that responded. Do NOT fabricate a missing provider's response.
> - If the whole Bash call times out (exceeds 600000ms), the tool returns a timeout error. Treat that as "at least one provider exceeded the 10-minute cap", report the timeout honestly in Phase 4, and proceed with whatever partial output the workdir files captured before the timeout.

Compare to llm-council's silent `return None`. ask-llm's pattern is explicit, surfaced, and forbids fabrication. This is significantly more rigorous.

### 6.5 Output format

The agent specifies the output structure:

```
## Brainstorm: [Topic]

### Participants Consulted
- ✅ Claude Opus: researched (verified against real files: path/to/a, path/to/b)
- ✅ Gemini: responded
- ✅ Codex: responded
- ⏭️ Ollama: not available

### Consensus (high confidence)
1. [Point] — agreed by Claude (verified), Gemini, Codex
2. [Point] — agreed by Gemini and Codex

### Unique Insights
- **Claude Opus** (verified): [Insight backed by actual file reads and why it matters]
- **Gemini**: [Insight and why it matters]
- **Codex**: [Insight and why it matters]

### Contradictions
- [Topic]: Claude (verified against src/foo.ts) says X, Gemini (inferred) says Y. Assessment: Claude's view is more likely correct because [evidence].

### Recommendations
1. [Highest priority action]
2. [Second priority action]
3. [Third priority action]
```

This is a structured cognitive synthesis with explicit attribution and verification status per finding. Compare to llm-council's free-form Chairman output: ask-llm's structure is significantly more rigorous and audit-friendly.

---

## 7. The code-review specialization — `gemini-reviewer` agent

The single-vendor reviewer pattern is worth understanding because it shows ask-llm's prompt-engineering at its sharpest. The full agent file:

### 7.1 Frontmatter and core principles

```yaml
name: gemini-reviewer
description: Runs an isolated Gemini code review in a separate context window.
  Uses confidence-based filtering to report only high-priority issues.
model: opus
color: cyan
tools:
  - Bash
  - Glob
  - Grep
  - Read
  - mcp__gemini__ask-gemini
```

Core principles:

> 1. Understand before reviewing — read the relevant files and context before sending to Gemini
> 2. High precision over recall — only report issues with confidence >= 80%
> 3. Project-aware — discover and scope CLAUDE.md conventions to the files being reviewed
> 4. Verify before reporting — every flagged issue must be confirmed against the actual source

### 7.2 The DO NOT Flag list

The single most important prompt-engineering pattern in this agent:

> ## DO NOT Flag
>
> - Pre-existing issues in unchanged code — only review the diff
> - Code style preferences unless a CLAUDE.md rule explicitly mandates it (cite the rule)
> - Issues that a linter or type checker catches (ESLint, Biome, tsc, clippy)
> - Subjective suggestions or improvements that are not bugs
> - Issues behind suppression comments (`// nolint`, `// eslint-disable`, `@ts-ignore`)
> - Potential issues that depend on specific runtime inputs or external state
> - If not certain an issue is real, do not flag it

This is performative-skepticism mitigation. Critic-style agents tend to over-flag because their training rewards finding problems. The explicit DO NOT list pre-empts entire categories of false-positive output.

### 7.3 The review prompt template

When `gemini-reviewer` calls the `ask-gemini` MCP tool, it constructs this prompt:

```
Review the following code changes. For each issue found, rate your confidence from 0-100:

- 0-25: Possible issue, might be a false positive
- 50: Real issue but minor or unlikely to hit in practice
- 75: Verified issue that will impact functionality
- 100: Certain issue that will cause bugs or security problems

ONLY report issues with confidence >= 80.

Flag issues where:
- The code will fail to compile or parse (syntax errors, type errors, missing imports)
- The code will produce wrong results regardless of inputs (clear logic errors)
- There is a security vulnerability (injection, auth bypass, data exposure)
- A CLAUDE.md rule is clearly violated (quote the exact rule)

Do NOT flag:
- Pre-existing issues in unchanged code
- Code style preferences (unless CLAUDE.md mandates it)
- Issues a linter or type checker would catch
- Suggestions or improvements that aren't bugs

For each issue provide:
- Confidence score (0-100)
- File path and line number
- Clear description and why it matters
- Concrete fix suggestion

Project conventions:
[paste CLAUDE.md rules scoped to modified files]

Changes:
[paste diff here]
```

Note the explicit confidence calibration ladder, the threshold filter (80+), and the duplicated DO NOT list. The duplication is intentional: the agent's system prompt has the principles; the user message reinforces them. Both are needed because the external model (Gemini) doesn't have access to the agent's system prompt — only what's in the user message it receives.

### 7.4 The validation phase

After Gemini responds, the agent validates each finding:

> ### Phase 4: Validation
>
> For each issue flagged by the provider, verify it before reporting:
>
> 1. Read the actual source file at the reported line number using the Read tool
> 2. Confirm the issue exists in the current code, not just the diff context
> 3. If the issue cites a CLAUDE.md rule, verify the rule exists and applies to this file's directory
> 4. Drop any issue where:
>    - The line number doesn't match the described problem
>    - The code has already been fixed or doesn't contain the claimed bug
>    - The CLAUDE.md rule doesn't exist or is scoped to a different directory
>
> Report only validated issues. State how many issues were dropped during validation.

This is post-LLM verification against ground truth. It's the same mechanism the brainstorm-coordinator uses (Phase 4 cross-check) but applied per-finding rather than at synthesis time.

**Implication for Vāda:** When reviewers make verifiable claims (file paths, line numbers, function names, API signatures), a verification step is feasible and dramatically improves output quality. This is a v2 candidate for Vāda Reviewers.

### 7.5 Lineage to upstream Anthropic plugin

ask-llm's `multi-review` skill (and by extension the per-vendor reviewers) credits Anthropic's `claude-code/plugins/code-review` plugin as the inspiration. The upstream plugin's command file (`commands/code-review.md`) lays out an 8-step pipeline:

1. **Eligibility filter** (cheap Haiku — is this PR even worth reviewing?)
2. **Convention discovery** (find relevant CLAUDE.md files in scope)
3. **PR summarization** (Sonnet)
4. **Four parallel auditors**: 2× CLAUDE.md compliance Sonnets, 2× Opus bug agents
5. **Per-finding validation** subagents
6. **Filter** (drop unvalidated)
7. **Output**
8. **Optional inline GitHub comments**

The upstream plugin's "DO NOT Flag" list, verbatim:

> Use this list when evaluating issues in Steps 4 and 5 (these are false positives, do NOT flag):
>
> - Pre-existing issues
> - Something that appears to be a bug but is actually correct
> - Pedantic nitpicks that a senior engineer would not flag
> - Issues that a linter will catch (do not run the linter to verify)
> - General code quality concerns (e.g., lack of test coverage, general security issues) unless explicitly required in CLAUDE.md
> - Issues mentioned in CLAUDE.md but explicitly silenced in the code (e.g., via a lint ignore comment)

This is the source pattern. ask-llm adapts it across vendors (instead of four Anthropic auditors, two Anthropic-different vendors). ask-llm adds: vendor diversity, confidence-score filtering, the "blindness" sequencing (in `/brainstorm`), explicit failure surfacing.

**Three ingredients ask-llm has that the upstream Anthropic plugin does not:**

1. **Vendor diversity in the auditor pool.** Anthropic's plugin uses four Anthropic auditors. ask-llm uses Claude (coordinator) + Gemini + Codex + optional Ollama. Genuinely different training, different blind spots.
2. **The "blindness" sequencing.** Anthropic's auditors all fire in parallel. ask-llm's coordinator commits to its own opinion *first*, then dispatches externals. Anti-anchoring mechanism.
3. **The Bash subprocess discipline.** Issue #23 and its fix. The upstream plugin doesn't deal with this because Anthropic's plugin runs subagents within Claude Code's native job system; ask-llm bridges to *external* CLIs and has to handle subprocess lifecycle explicitly.

These are the three ingredients to lift, not the entire pattern.

---

# Part III — Side-by-side comparison

---

## 8. Structural comparison

### 8.1 Project type and purpose

| | llm-council | ask-llm | Anthropic code-review |
|---|---|---|---|
| Type | Single-turn web app | Claude Code plugin + MCP servers + agents | Claude Code plugin |
| Primary use | UX exploration of multi-LLM | Multi-LLM consultation in a coding context | Code review automation |
| Deliberation surface | Browser UI | Slash commands in Claude Code | Slash command in Claude Code |
| User-facing | Yes (web) | Yes (Claude Code) | Yes (Claude Code) |
| Vendor diversity | 4 hardcoded | 3 configurable + Claude | None — all Anthropic |
| Author's stated rigor | "99% vibe coded" | Engineering project | Production Anthropic plugin |

### 8.2 Cognitive content

| Dimension | llm-council | ask-llm `/brainstorm` | Anthropic code-review |
|---|---|---|---|
| Number of distinct prompts | 3 (Stage 1 implicit, Stage 2, Stage 3) | 1 system prompt (197 lines) + per-call user message | 1 command file (110 lines) with embedded subagent prompts |
| Role specialization | None — all four get the same prompt | None — but coordinator has a distinct role from externals | None (4 parallel auditors look for similar things) |
| System prompts | None (everything in user-role) | Yes, on the agent | Yes, on subagents |
| Anonymization | Yes — Stage 2 only | No | No |
| Structured output schema | Free-form Chairman synthesis | Consensus / Unique / Contradictions / Rejected / Recommendations | List of issues with file:line + description + confidence |
| Pre-synthesis filter | Cross-ranking (peer-rank-based) | Verification (source-based) | Validation subagents (source-based) |
| Post-synthesis audit | None | None | None |
| Anti-anchoring sequence | Anonymization at Stage 2 only | Phase 3B "blindness" — coordinator commits before externals | None — all parallel from start |
| False-positive list | None | Yes — explicit DO NOT Flag | Yes — explicit DO NOT Flag |
| Confidence scores | Implicit (rankings) | Explicit (0-100, ≥80 threshold) | Implicit (HIGH SIGNAL filter) |
| Failure handling | Silent (return None) | Explicit (rc captured, surfaced) | Implicit (validation drops things) |

### 8.3 Implementation rigor

| Dimension | llm-council | ask-llm |
|---|---|---|
| Docs | README only | README + DECISIONS.md (182K) + CHANGELOG.md + ROADMAP.md |
| Benchmarks | None | Folder exists (not deeply inspected) |
| Tests | None for cognitive output | Has tests for MCP servers |
| Error handling | print + return None | Per-PID exit codes, captured stderr, explicit failure modes |
| Persistence | JSON; metadata discarded | Per-call workdir with structured artifacts |
| Subprocess management | N/A (uses HTTP API) | Detailed pattern from issue #23 |
| Lineage acknowledged | No | Yes — credits Anthropic upstream |

### 8.4 What each project does that the others don't

**Only llm-council:**
- Anonymized peer ranking with aggregate scoring ("Aggregate Rankings")
- Web UI for inspection of stages
- Cross-LLM rank visualization

**Only ask-llm:**
- Vendor-diverse auditor pool spanning Anthropic, Google, OpenAI, local
- "Blindness" sequencing in `/brainstorm`
- Confidence-threshold filtering with explicit calibration ladder
- Post-LLM source verification per finding
- Bash subprocess discipline for cross-CLI orchestration
- Documented design decisions (DECISIONS.md)

**Only Anthropic upstream:**
- 8-step pipeline with explicit eligibility check
- CLAUDE.md convention discovery + scoping
- Per-finding validation subagents (the per-finding pattern is upstream; ask-llm adapted it)
- GitHub-integration phase

### 8.5 Cognitive primitives across all three

Combining all three projects, the candidate primitives for Vāda Reviewers to consider are:

1. **Vendor diversity** (ask-llm) — different training, different blind spots
2. **Role uniformity in reviewer pool** (all three) — all reviewers do the same task
3. **Anonymized peer ranking** (llm-council) — pre-synthesis quality signal
4. **Aggregate rank as artifact** (llm-council) — computed but not used in synthesis
5. **"Blindness" anti-anchoring** (ask-llm) — primary commits before externals
6. **DO NOT Flag list** (ask-llm + Anthropic) — explicit false-positive exclusion
7. **Confidence calibration ladder** (ask-llm) — 0/25/50/75/100 scale with thresholds
8. **Source verification per finding** (ask-llm + Anthropic) — post-LLM ground-truth check
9. **Structured synthesis schema** (ask-llm) — Consensus/Unique/Contradictions/Rejected/Recommendations
10. **Failure surfacing without fabrication** (ask-llm) — explicit "provider failed" rather than silent drop
11. **Single foreground Bash call with `wait`** (ask-llm) — subprocess lifecycle pattern
12. **Eligibility check** (Anthropic upstream) — cheap pre-filter before expensive deliberation
13. **Convention discovery** (Anthropic upstream) — load relevant project rules into reviewer context

---

# Part IV — Implications for Vāda Reviewers

---

## 9. What to lift, what to skip, what to defer

The Vāda Reviewers v1 spec (`vada-reviewers-spec.md`) is intentionally narrow. Most of the primitives above are deferred to v2 or v3. This section justifies each decision.

### 9.1 Patterns adopted in v1

**Vendor diversity in reviewer pool (from ask-llm).** This is the central design choice of Vāda Reviewers. Different vendors, same role. Mirrors the manual workflow exactly. Adopted.

**DO NOT Flag list in reviewer system prompt (from ask-llm + Anthropic).** Cheap to add, demonstrably reduces performative skepticism, present in two of three reference projects. The default DO NOT list is in the spec's reviewer system prompt sketch. Adopted.

**Failure surfacing without fabrication (from ask-llm).** When a reviewer call fails, surface it explicitly. Do not fabricate. Do not silently drop. Adopted.

**Single foreground Bash dispatch pattern (from ask-llm).** When the engine implements CLI subprocess execution, this pattern is the reference. Adopted as engine implementation guidance, not as a YAML feature.

### 9.2 Patterns deferred to v2

**Anonymized peer ranking (from llm-council).** Real candidate. The mechanism is genuinely different from anything in Vāda today. But it adds complexity, requires another round-trip per reviewer, and the rank space is small with 3-4 reviewers. Test as a v2 variant against v1 baseline before adopting.

**Source verification per finding (from ask-llm).** Real candidate. The 2026-04-17 incident ask-llm cites is real and the lift is meaningful. But it requires the team to have file-system access (which it currently doesn't) and adds a verification phase. v2.

**"Blindness" sequencing (from ask-llm).** Vāda Reviewers v1 already has this implicitly: the primary AI authors the draft *before* invoking the team. The team's reviewers see the draft (post-blindness). The v2 candidate is adding a formal "primary AI commits to its own analysis before reviewers" step within the team itself, for the case where the user wants the team to do the whole thing.

**Confidence calibration ladder (from ask-llm).** Real candidate for the brief authoring helper, not for the team itself. v2.

**Structured synthesis schema (from ask-llm).** v1 lets the primary AI synthesize naturally. v2 may experiment with returning a structured artifact alongside reviewer responses, for cases where the calling AI can use a schema.

### 9.3 Patterns deferred to v3 or skipped

**Eligibility check (Anthropic upstream).** The primary AI decides whether to call the team. No need for a team-side eligibility filter. Skipped.

**Convention discovery (Anthropic upstream).** Specific to code review. Vāda Reviewers v1 is general-purpose. If a code-review specialization is added in v3, this becomes relevant.

**Specialized variants (`/multi-review`, `/code-review`, `/spec-validate`, `/flaw-find`).** v3 candidates. Build only when v1 + v2 data shows the variants are worth differentiating.

**Cross-LLM rank visualization, web UI as primary surface (llm-council).** Vāda's UI is for trial/demo, not the primary surface. Skipped.

### 9.4 Things ask-llm gets right that we should be careful about

**The Opus binding for the coordinator.** ask-llm's coordinator runs on Opus. This is expensive but it's what makes the "first-class research participant" framing work — Opus has the reasoning depth to be a peer, not a router. Vāda Reviewers v1 doesn't have a coordinator (the primary AI is the coordinator), so this binding choice doesn't transfer directly. But if v2 adds a team-side coordinator, the model binding matters.

**The verification incident memory.** ask-llm's prompt cites a real 2026-04-17 incident in the prompt itself. This is not gimmick — it's institutional memory baked into the agent's instructions. If Vāda Reviewers accumulates incidents (false positives that mattered, fabrications that misled), they should similarly bake into the system prompt over time.

**The duplicated DO NOT list.** ask-llm puts the DO NOT list in *both* the agent system prompt and the user message sent to the external LLM. The duplication is intentional because the external LLM doesn't see the agent's system prompt. Vāda Reviewers' brief construction needs to handle this: the brief should include the DO NOT list when sent to reviewers, not assume the reviewer has it from a system prompt that may not be propagated.

### 9.5 Open technical risks for Vāda Reviewers v1

**Risk 1: CLI subprocess execution in the engine.** Vāda's engine is API-only today. ask-llm's pattern shows how to do CLI subprocess dispatch correctly, but adapting it into the LangGraph adapter is non-trivial. This is the highest-risk implementation work and it's on the critical path.

**Risk 2: Per-vendor CLI quirks.** gemini-cli, codex-cli, claude-cli, ollama all have different invocation patterns, different output formats, different timeout behaviors. ask-llm has solved this for Gemini, Codex, Ollama. Claude CLI is unverified. Grok CLI may not exist. Each new CLI is a small but real engineering task.

**Risk 3: The fidelity gap between CLI mode and chat product.** CLI mode is closer than API mode but it is not the chat product. Some of the manual workflow's effectiveness may depend on chat-product-specific behavior (web search defaults, conversation memory, refusal patterns) that even CLIs don't replicate. The v1 benchmark is designed to surface this.

**Risk 4: The brief is the magic, and the brief is hard to write well.** Vāda Reviewers' team is a thin coordinator. Most of the cognitive work is in the brief the primary AI constructs. If briefs are bad, reviewers are bad, regardless of how well the team is built. v2 should consider a brief-authoring helper or template library.

---

## 10. Recommendations to reviewers

This document and the spec it accompanies are open for pressure-testing. Specific places to push back:

**On the lifts:** Are the four v1 adoptions (vendor diversity, DO NOT Flag, failure surfacing, subprocess pattern) the right four? Did I miss something cognitively essential that should be in v1 instead of v2?

**On the deferrals:** Am I deferring something that should be in v1? Specifically, source verification (ask-llm pattern) is genuinely powerful — is it worth the complexity to ship in v1 rather than waiting?

**On the skips:** Is "convention discovery" really code-review-only? Could it generalize to "load relevant project context into the brief" as a default v1 behavior?

**On the comparison framework:** Is the table in section 8.2 (cognitive content) the right axes? Are there axes I'm not considering that matter?

**On the lineage:** Is treating Anthropic's upstream plugin as a third reference point useful, or is it just adding noise to a comparison that should focus on the two real targets?

**On the implementation risks:** Risk 1 (CLI subprocess execution) is the biggest implementation gamble. Is there a simpler path I'm not seeing? Could v1 ship API-only and add CLI mode in v1.5? Would that change the v1 success criteria?

**On the meta-question:** Both ask-llm and llm-council exist because someone decided multi-LLM consultation was worth building. Neither has rigorous evidence it produces better outputs than single-shot. Vāda Reviewers is trying to ship the same thing with empirical validation. Is the empirical validation actually achievable, or does the workflow's value depend on factors that benchmarks can't capture?

---

## 11. Final note

This document corrects an earlier asymmetric analysis. The original cognitive analysis treated llm-council as the primary target and dismissed ask-llm based on the README. Reading both repos in full reveals that ask-llm contains substantially more cognitive content than llm-council, traceable to a serious upstream pattern (Anthropic's code-review plugin), with three original contributions (vendor diversity, blindness sequencing, subprocess discipline) that genuinely advance the pattern.

The Vāda Reviewers spec was authored after this corrected reading. If reviewers find the spec's design choices well-grounded, that's because the technical analysis informed them. If reviewers find the spec's design choices wrong, this document gives them the technical context to argue specifically rather than vaguely.

Both documents — this technical deep dive and the spec — are intended to be reviewed together. They are deliberate companions, not redundant.
