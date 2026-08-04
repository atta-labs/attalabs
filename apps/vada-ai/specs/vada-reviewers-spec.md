# Vāda Reviewers — Product Specification (v1, revision 5)

**Author:** Claude (Atta ecosystem — Critic role)
**Date:** May 8, 2026
**Status:** draft
**Audience:** Implementers and final-pass reviewers.

**Revision note (rev 5):** Three additions to the reviewer and synthesizer prompts, derived from a cross-vendor research synthesis (Gemini, Grok, ChatGPT) on multi-agent orchestration patterns conducted in parallel with the rev 4 work. The research surfaced five convergent patterns; three of those five were already in rev 4 (DO-NOT-FLAG list, GROUNDED/INFERRED tagging, structured synthesis schema with grounded-over-inferred weighting). The remaining two, plus one structural refinement, land here:

1. **Reviewer system prompt restructured as Persona + Goal + Posture + Output (§4.1.1).** Refinement, not content change. The rev 4 prompt has all four elements scattered through prose; rev 5 makes them explicit labeled sections so the prompt is easier to maintain, audit, and selectively override per question class. Persona stays generic ("external critical reviewer") — vendor-diversity-via-binding remains the design (§3.4); specific personas remain a v2 candidate (§6.2).

2. **Reviewer system prompt requires a verification block at the start of every response (§4.1.1).** Distinct from the per-finding GROUNDED/INFERRED tagging that rev 4 added. The verification block is a *response prefix* enumerating the facts the reviewer is treating as given before critique begins. It commits the reviewer to a specific reading of the draft and lets the synthesizer (and the primary AI) detect cases where reviewers critiqued different readings of the same text.

3. **Synthesizer system prompt requires phantom consensus detection (§4.1.2).** When two or more reviewers agree on a point but for incompatible reasons (e.g., one says "X is wrong because of A," another says "X is wrong because of not-A"), the synthesizer must surface the disagreement underneath the surface agreement. Without this, the synthesizer over-counts agreement and the primary AI gets a falsely high-confidence consensus signal. The synthesizer marks such items as `phantom_consensus: true` in the consensus block.

These are the only changes from rev 4. All rev 4 content (asymmetric design, vendor-agnostic seats, API-first transport, optional synthesizer, brief-authoring documentation, subprocess discipline, JSON parsing four-tier) stands unchanged.

---

**Revision note (rev 4 — preserved for traceability):** Eight changes from rev 3. Four are implementation findings from a code-grounded Gemini review of `Lykhoyda/ask-llm` and `karpathy/llm-council`. Four are clarity additions consolidating fragmented information into a one-page "this is what we're building" view.

Implementation findings from Gemini's code-grounded review:

1. **Reviewer system prompt now requires GROUNDED/INFERRED tagging on every substantive point (§4.1.1).** Adopted from ask-llm's `brainstorm-coordinator` Phase 3B. Each reviewer finding is marked as either GROUNDED (cited from the draft) or INFERRED (reasoned outside the draft). This is general-purpose verification status, applies to any review topic, low-cost addition.

2. **Synthesizer schema gains a `verification` field on each finding; synthesizer prompt instructs to weight grounded > inferred (§3.7, §4.1.2).** When reviewers tag their findings, the synthesizer can preserve and weight that signal. Helps resolve contradictions cleanly: a grounded finding contradicting an inferred one likely wins.

3. **§3.5 v1.5 CLI mode now specifies four mandatory subprocess-discipline mitigations explicitly.** Per Gemini's flag, "follow ask-llm's pattern" was insufficient — engineers could implement naive in-memory piping and hit stdout buffer deadlocks. The four mitigations (`mktemp -d`, redirect-to-file, `trap` cleanup, `wait` per PID) are now listed verbatim with code reference.

4. **Synthesizer parsing gains a fourth-tier regex fallback (§4.1.2).** When fenced JSON, bare JSON, and tolerant JSON-extract all fail, fall back to regex extraction of top-level sections. Output marked `degraded: true` so the primary AI knows it's getting partially-extracted data. Pattern adapted from llm-council's `parse_ranking_from_text`.

Clarity additions consolidating fragmented information:

5. **New §1.3 "v1 deliverable, in one page".** Single concrete page: this team, this flow, this YAML, this MCP tool, this UI. No theory, no ambiguity. The "if you read nothing else, read this" section.

6. **§1.3 includes a concrete flow walkthrough with a real example.** A worked example: Dani decides whether to ship Vāda Reviewers v1 with API mode only. The walkthrough traces the flow from invocation to synthesis, showing what the team actually does in a real case.

7. **§1.1 implementation-reference table tightened.** Pattern, source repo, source file path, lands where in our build, status (v1/v1.5/v2). Becomes the engine team's checklist.

8. **New §4.1.3 — Brief template.** The reviewer system prompt and synthesizer system prompt are documented (§4.1.1, §4.1.2) but the *user-message-side* prompt structure — the brief itself — was scattered across §3.8 and the YAML examples. §4.1.3 consolidates: this is what a brief looks like, with concrete templates by question class.

Plus one minor placement change:

- **Confidence calibration ladder (0/25/50/75/100, ≥80) lands in brief-authoring documentation (§3.8), not in the reviewer system prompt.** Gemini suggested putting it in the reviewer prompt; on review, hard-coding code-review-style confidence calibration in a general-purpose reviewer prompt would mismatch non-code question types. Brief authors who want it use it; brief authors who don't, don't. Consistent with "the brief is the contract."

The asymmetric design, vendor-agnostic seat policy, API-first transport, optional synthesizer with same-vendor default, and brief-authoring documentation all stand from rev 3. No structural changes.

---

## 0. TL;DR

Vāda Reviewers is the first product team built on the Atta engine. It packages a single proven workflow — *primary author writes a draft, vendor-diverse reviewers critique it, primary author synthesizes the critiques into a revised conclusion* — into an MCP-callable team plus a web UI. It mirrors the manual workflow Dani has used for 18+ months across hundreds of decisions, and which he has empirical confidence in.

The product is **vendor-agnostic on every seat**: the primary author is whichever model the user is currently chatting with, and the reviewers are configurable per call. Default reviewer pool is the set of vendors *not* currently being used as the author.

**Auth and transport modes:**
- **v1: API mode (BYOK)** — direct provider API calls, keys configured by the user (or via OpenRouter for unified billing). Web UI uses BYOK. MCP server uses environment variables.
- **v1.5: CLI mode** — subprocess wrapping of `gemini-cli`, `codex-cli`, `claude --print`, `ollama`. Closer to chat-product fidelity (tool access). Added only if the v1 API benchmark shows the workflow works at all — if API mode fails the cognitive bar, CLI mode is unlikely to rescue it.

**Synthesis modes:**
- **Default (off):** team returns raw reviewer responses; primary AI in the user's conversation synthesizes naturally. Faithful to the manual workflow when the primary AI is sophisticated.
- **Optional (`return_synthesis: true`):** team additionally runs a structured-synthesis agent that produces Consensus / Unique / Contradictions / Rejected / Recommendations in ask-llm's format. Returned alongside raw responses. Hedge against primary AI synthesis variability across vendors and users.

The first cut intentionally implements **one team variant** — equivalent to ask-llm's `/brainstorm` skill: general-purpose. Other variants (`compare` for explicitly-no-synthesis, code-review specialization, flaw-finding mode, etc.) are documented in the v2/v3 roadmap but not built in v1.

---

## 1. Product reframe — Vāda Teams

Before describing Vāda Reviewers itself, the broader product reframe must be locked.

**Vāda is the deliberation primitive in the Atta engine.** It is not a product. It is the part of the engine that compiles a multi-agent orchestration into a runnable Plan graph — the YAML compiler, the Plan types, the LangGraph-adapter execution, the cognitive router. This already works. It has been built. It is not in question.

**Vāda Teams is the product surface.** Each team is a packaged YAML deliberation spec, exposed via MCP and (where appropriate) a web UI, that solves a specific real-world workflow. Teams are authored on top of the engine. They are what users actually interact with. They are the deliverables that justify the engine's existence.

**Vāda Reviewers is the first team.** It mirrors the workflow Dani has empirically validated through manual use. It is the first thing Vāda will ship as a product, the first thing benchmarked, and the first thing positioned externally.

This reframe matters because Vāda's existing YAMLs (`crucible.yaml`, `sparring.yaml`, `war-room.yaml`, `brokered-trio.yaml`, `brokered-quartet.yaml`) were written before this product framing existed. They are engine-level demonstrations — proof the engine can compile and execute multi-agent flows — but they are not products. They were not derived from a validated workflow. The benchmarks against them have been ambiguous in part because they're testing something that has no real-world referent.

Vāda Reviewers is the inverse: it starts from a workflow with empirical confidence and builds the team to match it.

### 1.1 Reference architecture — what we track from prior art

Two external repositories are kept as living reference implementations for Vāda Teams development. **We do not depend on them, fork them, or borrow code.** We track their cognitive design choices and copy specific patterns into our YAMLs and engine where the patterns earn their place.

**Repositories tracked:**

- **`Lykhoyda/ask-llm`** ([github.com/Lykhoyda/ask-llm](https://github.com/Lykhoyda/ask-llm)) — Claude Code plugin with 4 sub-agents and 8 skills. Contains the most cognitively serious prior art: the `brainstorm-coordinator` agent (4-phase pipeline with "blindness" sequencing), per-vendor reviewer agents (DO-NOT-FLAG list, confidence calibration), and explicit Bash subprocess discipline for cross-CLI orchestration (issue #23 pattern). Lineage traces to Anthropic's upstream `claude-code/plugins/code-review` pattern.
- **`karpathy/llm-council`** ([github.com/karpathy/llm-council](https://github.com/karpathy/llm-council)) — Local web app, 818 lines of Python backend. Three-stage flow (parallel responses → anonymized cross-ranking → Chairman synthesis). Cognitively thinner than ask-llm but contributes one primitive Vāda Teams does not have: anonymized peer cross-ranking of pre-synthesis contributions.
- **`anthropics/claude-code/plugins/code-review`** ([github.com/anthropics/claude-code](https://github.com/anthropics/claude-code/tree/main/plugins/code-review)) — The upstream pattern ask-llm adapted. 8-step pipeline with eligibility filter, convention discovery, parallel auditors, per-finding validation, and the canonical DO-NOT-FLAG list.

**What we copy (with attribution in code):**

| Pattern | Source repo | Source file | Lands in our build | Status |
|---|---|---|---|---|
| DO-NOT-FLAG list in reviewer prompts | Anthropic + ask-llm | `plugins/code-review/commands/code-review.md` (lines 79-86); `agents/gemini-reviewer.md` (lines 24-31) | Reviewer system prompt (§4.1.1) | **v1** |
| Failure surfacing without fabrication | ask-llm | `agents/brainstorm-coordinator.md` Phase 4 failure handling | Engine failure-handling | **v1** |
| GROUNDED/INFERRED tagging on findings | ask-llm | `agents/brainstorm-coordinator.md` Phase 3B (lines 51-62) | Reviewer system prompt (§4.1.1) + synthesizer schema (§3.7) | **v1** *(rev 4 addition)* |
| Structured synthesis schema (Participants / Consensus / Unique / Contradictions / Rejected / Recommendations) | ask-llm | `agents/brainstorm-coordinator.md` Phase 4 + Output Format | Optional synthesizer (§3.7) | **v1** |
| Synthesizer JSON tolerance (fenced + bare + tolerant + regex fallback) | ask-llm + llm-council | ask-llm Phase 4 parsing; llm-council `backend/council.py:177-208` (`parse_ranking_from_text`) | Synthesizer parsing layer (§4.1.2) | **v1** |
| "Blindness" sequencing (commit before exposure) | ask-llm | `agents/brainstorm-coordinator.md` Core Principles 1-2 | Implicit in v1 (primary AI authors before invocation); explicit if v2 adds team-side primary research phase | **v1** (implicit) |
| Single foreground Bash call with backgrounded PIDs + `wait` per PID | ask-llm | `agents/brainstorm-coordinator.md` Phase 3A template (lines 80-123) | Engine CLI executor (§3.5) | **v1.5** |
| `mktemp -d` workdir + redirect-to-file + `trap 'rm -rf' EXIT` | ask-llm | Same Phase 3A template | Engine CLI executor (§3.5) | **v1.5** *(rev 4 explicit)* |
| Confidence calibration ladder (0/25/50/75/100, ≥80 threshold) | ask-llm | `agents/gemini-reviewer.md` Phase 2 review prompt (lines 49-58) | Brief-authoring docs as recommended template (§3.8) | **v1** *(rev 4 placement)* |
| Anonymized peer cross-ranking | llm-council | `backend/council.py:64-93` (Stage 2 prompt) | Optional flag on Reviewers team | **v2** |
| Source verification per finding | ask-llm + Anthropic | `agents/gemini-reviewer.md` Phase 4; Anthropic `code-review.md` step 5 | Optional flag on Reviewers team | **v2** |
| Eligibility filter (cheap pre-check before expensive deliberation) | Anthropic | `code-review.md` step 1 | Optional flag on Reviewers team | **v2** |

**What we deliberately do not copy:**

- llm-council's silent error handling (`return None` in `backend/openrouter.py`) — replaced by ask-llm's explicit failure surfacing
- llm-council's lossy persistence (discards `label_to_model` mapping in `backend/storage.py`) — Vāda persists everything
- ask-llm's default of synthesis-as-final-output — we keep synthesis as scaffold for the primary AI's conversational integration
- Single-turn-only constraint from llm-council (input form only when `messages.length === 0`) — Vāda Teams support multi-turn through the primary AI's conversation
- Vendor-specific specialization in ask-llm's per-CLI agents (`gemini-reviewer`, `codex-reviewer`, `ollama-reviewer`) — we use uniform reviewer prompts, vendor diversity comes from binding only

**Operational practice:** the technical deep-dive document (`vada-reviewers-tech-deep-dive.md`) is the source of truth for what each pattern looks like in the source repos, with code citations. When a v2/v3 team adds a new primitive, the implementer reads the deep-dive section for that primitive and adapts the pattern. The companion document is updated when new patterns are tracked.

### 1.2 The Vāda Teams catalog

Every Vāda Team is a **YAML team specification** authored on top of the Atta engine. The YAML is the team's authoritative configuration. The engine compiles it into a runnable Plan. The MCP server exposes the Plan as a callable tool. The web UI (where present) renders the same Plan with BYOK auth.

**This is the product surface.** Not the engine. Not the YAML format. The catalog of teams is what users actually select from when they invoke Vāda. A user does not know about Plans or LangGraph. They know they can call `vada_reviewers__consult` (or, in the future, `vada_<other-team>__<verb>`).

**v1 ships exactly one team:**

| Team | YAML | Status | Maps to (in prior art) |
|---|---|---|---|
| **Vāda Reviewers** | `vada-reviewers/team.yaml` | v1 | ask-llm `/brainstorm` (closest match), generalized away from code |

**v2 candidate teams (build only after v1 validates):**

| Team (working name) | Likely YAML | Status | Maps to (in prior art) |
|---|---|---|---|
| **Vāda Reviewers — Compare mode** | `vada-reviewers/team.yaml` with `return_synthesis: false` enforced and primary AI instructed not to integrate | already v1 capable; needs UX | ask-llm `/compare`, llm-council Stage 1 only |
| **Vāda Reviewers — Code Review** | `vada-code-review/team.yaml` | v2 specialization | ask-llm `/multi-review`, Anthropic `code-review` plugin |
| **Vāda Reviewers — Cross-Ranked** | `vada-reviewers/team.yaml` with `cross_ranking: true` flag | v2 enhancement | llm-council Stage 2 added to v1 flow |
| **Vāda Reviewers — Multi-round** | `vada-reviewers/team.yaml` with `max_rounds: 2` flag | v2 enhancement | No prior-art equivalent; Vāda original |

**v3 candidate teams (much later, only with strong evidence from v2):**

| Team (working name) | Status | What it is |
|---|---|---|
| **Vāda Council** *(name placeholder, will be renamed)* | v3 candidate | Symmetric flow: no primary author, multiple vendors answer the same question, optional cross-ranking. Maps directly to llm-council's pattern. Built only as a research baseline if v1/v2 data suggests asymmetric review may be over-engineered relative to symmetric independent answers. |
| **Vāda Sparring** | v3 candidate | Multi-round adversarial: primary author and a single dedicated critic iterate. Reuses the existing engine `sparring.yaml` config but reframes it as a v3 team. Different cognitive shape than Reviewers — adversarial role-played, not vendor-diverse review. |
| **Vāda Crucible** | v3 candidate | Multi-agent role-played: Strategist + Critic + Devil's Advocate + Synthesizer with rounds. Reuses existing engine `crucible.yaml` config. The most ambitious deliberation shape Vāda has built. v3 status because it's currently unvalidated and the v1/v2 data may show simpler shapes win. |

**Catalog operational rules:**

- Every team has a Pāli name (per the Atta naming rule). "Vāda Reviewers" violates this and is a working name; final Pāli name picked before public launch using Vāda Reviewers itself.
- Every team has its own benchmark suite. v1's benchmark validates Vāda Reviewers only.
- Teams may share engine primitives (the optional synthesizer, the Bash dispatch pattern in v1.5, etc.) but each team is a complete YAML, not a parametric variant of another team unless explicitly marked as a flag-toggled variant.
- The `crucible.yaml` and `sparring.yaml` configs that exist in the engine today are *not* Vāda Teams products. They are engine-level demonstrations and will be reframed into v3 candidate teams *or* retired, depending on what v1/v2 data shows.

**What is not in the catalog (deliberately):**

- A "general AI deliberation" team that does multiple workflows. Each team has one shape. Users pick the team that matches their workflow.
- Free-form team builders for end users. The product is the curated catalog. v1+v2+v3 has 7 candidate teams in total; that is the product, not "build your own team."
- Teams that do not start from a validated workflow. Crucible-as-product was already this mistake. Avoiding the repeat.

### 1.3 v1 deliverable — in one page

If you read nothing else in this spec, read this section. It says exactly what we are building.

**The product:** Vāda Reviewers, a single team that automates the validated manual workflow Dani has used hundreds of times. Vendor-diverse external review of a primary AI's draft, with the primary AI synthesizing the reviews back into the conversation.

**Composition (v1):**

- **One YAML team specification** — `vada-reviewers/team.yaml`, compiled by the Atta engine into a runnable Plan
- **One MCP tool** — `vada_reviewers__consult`, called by any MCP client (Claude Code, Cursor, the Vāda web UI, custom integrations)
- **One web UI** — for trial/demo and BYOK users without local CLI installation
- **One default flow** — primary AI authors a draft → Vāda Reviewers fans the draft + a brief out to N reviewers (different vendors) in parallel → reviewer responses return to the primary AI → primary AI synthesizes conversationally
- **One optional flow branch** — when the caller passes `return_synthesis: true`, the team additionally runs a structured synthesizer agent that produces a parseable Consensus/Unique/Contradictions/Rejected/Recommendations object alongside raw reviewer responses
- **API mode only** — direct provider API calls, BYOK on the web UI, environment-variable keys on the MCP server. CLI mode is v1.5, conditional on the v1 benchmark

**Concrete flow walkthrough (a real example):**

Dani is in a conversation with Claude. They've been discussing whether to ship Vāda Reviewers v1 with API mode only versus with both API and CLI modes. Claude has drafted a recommendation: "Ship API mode only in v1, defer CLI mode to v1.5." Dani wants external pressure-testing before committing.

1. **Claude calls `vada_reviewers__consult`** with:
   - `draft`: the recommendation text Claude just wrote
   - `brief`: "Pressure-test this recommendation. Is API-mode-first the right choice or am I missing something CLI mode would deliver in v1? Specifically: would API mode's missing tool access (web search, filesystem) make the v1 benchmark's results uninterpretable? Cite passages from the draft when making claims."
   - `user_question`: the original question Dani asked Claude
   - `reviewer_pool`: `["gemini", "gpt", "grok"]` (defaults; primary's vendor Claude excluded)
   - `primary_vendor`: `"claude"`
   - `return_synthesis`: `false` (default)

2. **The Vāda engine compiles** `vada-reviewers/team.yaml` into a Plan with three parallel reviewer nodes (gemini, gpt, grok), no synthesizer node (because `return_synthesis: false`).

3. **The engine dispatches all three reviewer calls in parallel** via the API binding. Each receives the same system prompt (§4.1.1 — uniform reviewer role with DO-NOT-FLAG list and GROUNDED/INFERRED tagging instruction) and the same user message constructed from the draft + brief + user_question (§4.1.3 brief template).

4. **Reviewers respond.** Gemini returns a 400-word critique with two GROUNDED concerns and one INFERRED concern. GPT returns a 600-word critique that broadly agrees but raises a third GROUNDED concern. Grok returns a 200-word terse critique that disagrees with one of Gemini's concerns.

5. **The team collects the three responses** with explicit per-vendor status (success/timeout/error/empty), durations, and any errors. No fabrication. No silent drops.

6. **The team returns the structured response to Claude.** Claude (still in the conversation with Dani) now has three external critiques.

7. **Claude integrates the critiques conversationally** — synthesizes for Dani. "Three reviewers responded. Two concerns recurred across Gemini and GPT (grounded in the draft's claim about benchmark interpretability). Grok pushed back on one of those concerns. My initial recommendation stands but with one revision: we should add a fallback plan for if API mode benchmarks come back inconclusive."

8. **Dani reads Claude's synthesis and decides.** End of flow.

That's v1. Single round, fan-out to vendor-diverse reviewers, primary AI synthesizes in the conversation.

**What the optional synthesizer adds (when `return_synthesis: true`):**

Between steps 5 and 6, the team additionally runs a synthesizer agent. The synthesizer (defaults to Claude Opus when primary is Claude — same vendor) receives all three reviewer responses with attribution and produces a structured object:

```json
{
  "participants": [...],
  "consensus": [{ "point": "...", "raised_by": ["gemini","gpt"],
                  "verification": "grounded", "confidence": "high" }],
  "unique_insights": [...],
  "contradictions": [{ "topic": "...", "positions": [...], "assessment": "..." }],
  "rejected": [...],
  "recommendations": [...]
}
```

Claude receives both the raw reviewer responses *and* the structured synthesis. Claude can:
- Use the structured synthesis directly (lazy mode — the spec actively warns against this; see §7.7)
- Synthesize from raw responses ignoring the structured artifact
- Use the structured synthesis as a scaffold for a richer conversational integration

The benchmark tests both default-off (VR-NS) and default-on with same-vendor synthesizer (VR-S-same) and default-on with cross-vendor synthesizer (VR-S-cross). Whichever performs best per question type informs v1.5's recommendation.

**Where to find the technical details:**

- YAML team specification: §4.2
- MCP tool signature: §4.1
- Reviewer system prompt: §4.1.1
- Synthesizer system prompt: §4.1.2
- Brief template (user-message structure with examples): §4.1.3
- Engine constraints required for v1: §4.3
- Default reviewer pool: §4.4
- Benchmark conditions: §5.2
- Implementation patterns copied from prior art: §1.1
- v1.5 + v2 + v3 roadmap: §6

**One-line summary:**

Vāda Reviewers v1 is a vendor-agnostic MCP team that takes a primary AI's draft + a brief, fans them out in parallel to N vendor-diverse reviewers via API, and returns structured responses (with optional structured synthesis) for the primary AI to integrate conversationally. The YAML is the team's authoritative configuration; the engine compiles it; the MCP tool exposes it; the web UI hosts it for users without local installations.

---

## 2. The validated workflow — what Vāda Reviewers must mirror

The workflow Dani has used hundreds of times, condensed to its essential shape:

1. **Primary conversation.** Dani is in conversation with a primary AI assistant — currently Claude, but historically and prospectively any high-tier model. They are working through a project, decision, design, or other artifact requiring substantive judgment.
2. **Decision to consult.** At some point in the conversation, the primary AI or Dani decides external perspective is needed. The trigger is fuzzy — usually when the question is high-stakes, contested, or has hidden dimensions one model alone is unlikely to surface.
3. **Brief authorship.** The primary AI writes a brief — a structured prompt for *external reviewers*. This brief includes context, the specific question, what's out of scope, what the reviewer should pressure-test, and often specific sub-questions to answer or constraints (length limits, format requirements).
4. **External dispatch.** Dani manually pastes the brief into 2–4 other AI products: typically Gemini, Grok, ChatGPT, DeepSeek, sometimes others. Each external AI has its own context, tools, and product harness. They each play the same role: critical reviewer of the primary AI's work.
5. **Response collection.** External AIs respond. Dani pastes their answers back into the primary conversation.
6. **Synthesis.** The primary AI synthesizes: identifies convergence, divergence, what was missed, what was wrong, what the consensus implies, what the disagreements reveal.
7. **Optional second round.** Sometimes — not always — the synthesis surfaces a clarification or revision worth re-checking. The primary AI revises and re-dispatches. Most decisions stop after one round.

Several things about this workflow matter for the design of Vāda Reviewers:

**The primary AI is the author and synthesizer.** Not one role among peers. The primary AI writes the substantive content; the reviewers critique it; the primary AI then synthesizes. This is asymmetric by design, not by accident. It mirrors how serious decisions are actually made: someone takes responsibility for a position, others stress-test it, the responsible party integrates the feedback.

**The reviewers play one role, not differentiated roles.** All external reviewers are asked to critically review. They are not assigned distinct cognitive postures (Strategist vs Critic vs Devil's Advocate). The diversity comes from the fact that they are *different vendors* — different training, different defaults, different blind spots. This is vendor diversity at the reviewer pool, role uniformity within it.

**The brief is the magic.** The quality of the workflow's output depends overwhelmingly on the brief. Dani has learned over hundreds of iterations that vague briefs produce vague reviews; specific briefs with explicit sub-questions and explicit DO-NOT-FLAG lists produce sharp reviews. The brief is where the cognitive work concentrates. The team architecture supports the brief; the brief does the heavy lifting.

**The reviewers are chats, not raw models.** Critically: the empirical workflow is validated against AI products (Gemini app, Grok web, ChatGPT) that wrap the underlying model in a product harness — system prompts, tools, default behaviors. The validated outputs come from those wrapped products. Raw API calls to the same models produce *different* outputs: less hedging, no prior-conversation context, more raw and sometimes more wrong. This fidelity gap is the central technical risk of automating the workflow. *(T3a update 2026-06-24: web search has been closed for both the Reviewers team and the Reviewers + Synthesis team — Gemini uses native grounding, GPT/Grok use a function-calling handler. Synthesizer agent (Claude) deliberately has no tools. Remaining gap: product harness system prompts and conversation memory.)*

**One round is the default.** The vast majority of decisions stop after one round. Multi-round is an option, not a baseline.

---

## 3. Product design

### 3.1 The single first variant

Vāda Reviewers v1 implements **one team variant**: the general-purpose synthesized review. This is the equivalent of ask-llm's `/brainstorm` skill, adapted to Vāda's shape. It is *not* a code-review specialization. It is *not* a no-synthesis comparison tool. It is the synthesized review of any artifact, decision, or question.

The reasoning for shipping one variant:

- The MCP tool surface is simpler — one tool, one team, prompt-shaped behavior.
- The benchmark target is single — we can validate one shape rigorously before splitting it.
- The workflow Dani validates is one shape. Variants come later, justified by data.

ask-llm has eight skills; we ship one. Theirs evolved over time. Ours will too. We start where the empirical workflow is.

### 3.2 The seven-step flow

The team executes a seven-step flow on each invocation. This maps directly onto the validated workflow:

1. **Receive invocation.** The primary AI calls the team via MCP, passing: a draft (or a question to be drafted on), a brief for the reviewers, and a configured reviewer pool.
2. **(Optional) Author phase.** If no draft was provided, the primary AI's draft is authored as turn 1 of the team's work. (See section 3.3 for whether this happens inside the team or before invocation.)
3. **Brief construction.** The brief becomes the prompt for the reviewers. Constructed by the primary AI, passed through verbatim by the team. The team does not modify the brief — the primary AI is in control of what the reviewers see.
4. **Parallel review dispatch.** The team dispatches the brief to each configured reviewer in parallel. Each reviewer receives: the user's original question, the primary AI's draft, and the primary AI's brief.
5. **Response collection.** Reviewer responses are collected. Failed responses (timeout, error, empty) are surfaced explicitly, not silently dropped or fabricated.
6. **Return to primary AI.** Reviewer responses are returned to the primary AI as the team's output. **By default the team does not synthesize.** Synthesis is the primary AI's job in the user's conversation — it has the conversation context, the user's actual goals, and the responsibility for the conclusion. Optionally, when the caller passes `return_synthesis: true`, the team additionally produces a structured synthesis (see §3.7) returned alongside raw responses. The primary AI can use it, ignore it, or treat it as scaffolding.
7. **Synthesis (in primary AI).** The primary AI receives the reviewer responses (and optionally the structured synthesis) and integrates them into the conversation. The user sees the integration as part of the natural conversation flow.

This is deliberately asymmetric. The team is a *fan-out collector* with an *optional structured synthesizer*, not an autonomous deliberator that closes the loop with the user. The primary AI is the one closing the loop with the user — even when the optional synthesizer ran, its output is an input to the primary AI's conversational integration, not a replacement for it.

This differs from ask-llm's `brainstorm-coordinator`, which uses an Opus sub-agent that *both* synthesizes structurally *and* presents the synthesis as the final answer. In our design, structural synthesis is optional and is always handed back to the primary AI for conversational integration. This is closer to the manual workflow: when Dani pastes Gemini's response back to Claude, it goes into the same conversation Claude was already having, not into a fresh sub-agent context.

### 3.3 Where the draft comes from

Two options for how the primary AI's draft enters the flow:

**Option A — Draft authored before invocation.** The primary AI writes its draft in the conversation, then calls the team with `{ draft, brief, reviewer_pool }`. The team only handles dispatch and collection. This is the simpler implementation and matches the manual workflow most directly (Dani sees Claude's draft before Claude calls Vāda Reviewers).

**Option B — Draft authored inside the team.** The primary AI calls the team with `{ question, brief, reviewer_pool }`. The team's first step is a "primary author" call back to the primary AI's vendor to produce the draft. The team then dispatches reviewers. This is more autonomous — the team produces a complete artifact — but it adds complexity and obscures what the user sees.

**Recommended for v1: Option A.** The primary AI authors the draft in the conversation, the user sees it, then the team is invoked for review. This:
- Mirrors the manual workflow exactly
- Keeps the team's responsibilities narrow (dispatch + collection)
- Lets the user inspect and modify the draft before review begins
- Avoids the technical complexity of "calling back into the user's primary vendor from within the team"

### 3.4 Reviewer pool — vendor-agnostic, configurable

There is no fixed reviewer pool. The pool is determined per call by the configuration the primary AI passes:

- Primary AI specifies `reviewer_pool: ["gemini", "gpt", "grok"]` (or similar)
- Default behavior when no pool is specified: all available reviewers *minus* the primary AI's vendor
- "Available" means: configured with valid auth on the running Vāda instance (CLI installed and authed, or API key present)

This generalizes the design. Whether the primary AI is Claude, Gemini, GPT, or another vendor is irrelevant to the team. The team coordinates an asymmetric flow regardless of which vendor sits in which seat.

This matters because the market for primary AI assistants rotates. Today's best chat experience may not be tomorrow's. Vāda Reviewers must work for users of any primary AI, including those who switch primaries over time. The team makes no assumption about which vendor is "preferred."

### 3.5 Transport modes — API in v1, CLI in v1.5

Reviewer feedback on rev 1 correctly flagged that committing to CLI subprocess wrapping as the v1 production path was a bet without evidence. The CLI fidelity claim ("CLIs come with tool access, closer to chat-product behavior") is plausible but untested. Implementing CLI mode is also the highest-risk engine work item. Building the riskier transport before validating that the workflow works *at all* is the wrong sequencing.

**Revised plan: ship API mode in v1; add CLI mode in v1.5 only if the v1 benchmark indicates the transport gap actually matters.**

#### v1 — API mode only

All reviewer invocations go through direct provider APIs (or OpenRouter for unified billing). This applies to both the web UI (BYOK from the user, scoped to session) and the MCP server (keys configured via environment variables on the host machine).

Properties:
- Implementation cost is low (existing engine capability via the LangGraph adapter)
- No subprocess lifecycle complexity, no per-CLI quirks
- Fidelity gap to chat products is real and known: no product harness system prompts, no conversation memory, raw model defaults *(T3a + T3a follow-up 2026-06-24: web search gap closed for both Reviewers and Reviewers + Synthesis teams — see §7.3)*
- The cognitive design (brief, reviewer system prompt, optional synthesizer) is what is actually being tested

If v1 API mode ties or beats the manual workflow on Dani's test cases, the cognitive design is validated. CLI mode then becomes an optional enhancement, not a rescue.

If v1 API mode fails to tie the manual workflow, the failure is most likely in the cognitive design — the brief, the reviewer prompts, or the synthesizer. CLI mode (transport) is unlikely to rescue a flawed cognitive design. The v1.5 question is then deferred until v1 is fixed.

#### v1.5 — CLI mode added (conditional on v1 result)

CLI mode shells out to `gemini-cli`, `codex-cli`, `claude --print` (subject to verification of non-interactive behavior), and `ollama`. Auth is the user's local CLI auth — no keys passed through Vāda Reviewers.

CLI mode is added if and only if:
1. v1 API mode validation succeeded (we know the workflow works), AND
2. There is reason to believe CLI tool access materially improves output quality on the specific question types Dani uses the workflow for. This is testable: pre-v1.5, take 5 representative test cases, run them through CLI mode and API mode, compare outputs. If CLI is qualitatively better, v1.5 is justified. If not, defer indefinitely.

The architectural abstraction in the engine must accommodate both modes (`binding.mode: api | cli_subprocess` in the YAML), but only the API path is implemented in v1.

##### Mandatory subprocess discipline (rev 4)

Per Gemini's code-grounded review of `Lykhoyda/ask-llm`'s `brainstorm-coordinator` (lines 80-123 of the agent file), "follow ask-llm's pattern" is insufficient as engineering guidance. The pattern has four mandatory mitigations that the engine team must implement together. Naive in-memory piping or detached subshells will hit silent failures (issue #23 in ask-llm — 0-byte output files, no error, no exit code).

The four mandatory mitigations:

1. **Per-call workdir via `mktemp -d`.** Each call to the engine's CLI executor creates a fresh temporary directory: `workdir=$(mktemp -d /tmp/vada-reviewers-XXXXXX)`. This isolates concurrent calls and prevents output collision.

2. **Redirect each provider's stdout AND stderr to files in the workdir, not pipes.** `gemini -p "@$workdir/prompt.md" > "$workdir/gemini.out" 2> "$workdir/gemini.err" &`. Direct piping between provider processes and the engine's reader risks deadlock when multiple slow LLM streams fill OS pipe buffers simultaneously. Redirect to disk; read from files after `wait` returns.

3. **Cleanup via `trap`.** Set `trap 'rm -rf "$workdir"' EXIT` immediately after creating the workdir so the directory is removed regardless of how the call terminates (success, error, signal). Without this, `/tmp` accumulates per-call directories.

4. **`wait` per backgrounded PID, capturing each exit code independently.** Background each provider directly in the outer shell (no subshells via parentheses — those detach the child from the outer shell's job table and break `wait`). Capture exit codes one at a time: `wait "$pid_gemini"; rc_gemini=$?; wait "$pid_codex"; rc_codex=$?`. After `wait`, read each output file from the workdir and report per-provider status (success / non-zero exit / empty output) without fabrication.

Reference implementation: `Lykhoyda/ask-llm`, file `packages/claude-plugin/agents/brainstorm-coordinator.md`, the Phase 3A Bash template at lines 80-123. The engine's CLI executor adapts this pattern; the exact shell out can be any subprocess library that preserves these guarantees. The Python equivalent uses `tempfile.mkdtemp()`, `subprocess.Popen` with `stdout=` and `stderr=` set to file handles in the workdir, `proc.wait()` per PID, and an `atexit` or context-manager cleanup.

Engine team: do not skip any of the four. Each one is a real failure mode ask-llm has already paid the cost to discover.

#### Pre-v1.5 sanity check

Before any CLI implementation work begins, run a small-N test: take 5 questions from the v1 test corpus, run them through (a) Gemini chat product, (b) Gemini CLI (no Vāda integration, just the raw CLI), and (c) Gemini API. Compare outputs qualitatively. This tells us:
- Whether CLI is meaningfully closer to chat product than API is
- Whether the gap is closed by tool access or by something else (system prompts, defaults)
- Whether v1.5 is worth the engineering work at all

This sanity check costs hours, not weeks. It must precede CLI implementation.

### 3.6 Fidelity gap — explicit accounting

Vāda Reviewers cannot fully replicate the chat-product workflow Dani validated against. The gap is real and the spec is honest about it. The v1 benchmark is designed to surface whether the gap matters in practice.

| Dimension | Chat product (what Dani validated) | v1 — API mode (what we ship first) | v1.5 — CLI mode (conditional) |
|---|---|---|---|
| Tool access | Web, code, image, memory | None | Whatever each CLI supports |
| System prompt | Vendor's chat product system prompt | None — Vāda's reviewer system prompt only | CLI's default (usually thinner than chat product) |
| Conversation memory | Vendor's product memory | None | None |
| Streaming | Native chat streaming | Native API streaming | Subprocess output |
| Refusal patterns | Tuned for consumer chat | Most permissive (raw API) | Often more permissive than chat |
| Implementation risk | N/A | Low — existing engine capability | High — subprocess lifecycle (ask-llm pattern) |

**The v1 benchmark explicitly tests whether API mode is sufficient.** If yes, we ship API-only and treat CLI mode as a discretionary enhancement, not a requirement. If no, we diagnose the cause before assuming CLI mode is the answer — the cognitive design (brief, prompts, optional synthesizer) is the more likely culprit.

### 3.7 The optional team-side synthesizer

Reviewer feedback on rev 1 raised an unargued assumption: rev 1 placed all synthesis responsibility on the primary AI, on the grounds that this mirrors the manual workflow. But in the manual workflow Dani is the synthesizer, not Claude. When Vāda Reviewers ships and the primary AI is GPT or Gemini synthesizing for a user other than Dani, synthesis quality may collapse — the primary AI is not Dani-equivalent, and conversational synthesis of three diverse reviewer outputs is itself a hard task that varies in quality across vendors.

The fix is optionality, not commitment in either direction.

#### Default behavior — synthesizer off

When `return_synthesis: false` (default), the team behaves as rev 1 specified: dispatch reviewers, collect responses, return them to the primary AI for conversational synthesis. This is faithful to the manual workflow when the primary AI is sophisticated and the user is integrating reviews actively.

#### Optional behavior — synthesizer on

When `return_synthesis: true`, after reviewer responses are collected, the team runs an additional synthesizer agent. The synthesizer:

- Receives: the user's question, the primary AI's draft, the reviewer brief, and all reviewer responses (with vendor attribution)
- Runs on a high-capability model — by default, **the primary AI's vendor's flagship model** (e.g., primary is Claude → synthesizer is Claude Opus; primary is Gemini → synthesizer is Gemini Pro)
- Caller can override via the `synthesizer_model` parameter
- Produces structured output in the schema below

**Why same-vendor is the default:** the user picked their primary AI for its reasoning style. A cross-vendor synthesizer (e.g., always GPT regardless of primary) would add a translation layer between the reviewers' raw output and the primary AI's conversational integration. That layer may distort what gets passed downstream. Same-vendor synthesis preserves epistemic chain consistency: the synthesizer thinks in the same idiom the primary AI will think in when it integrates. This is the conservative default.

**Counter-argument:** same-vendor synthesis may share blind spots and biases with the primary AI (the reviewer pool already excludes the primary's vendor from review for exactly this reason). A cross-vendor synthesizer would bring an additional independent perspective at the synthesis step, possibly catching biases the primary AI's vendor consistently misses.

**How we resolve:** the v1 benchmark tests both. A sixth condition (VR-S-cross) uses a cross-vendor synthesizer (a fixed model — Opus when primary is not Claude, GPT when primary is Claude — chosen to be different from the primary). If cross-vendor consistently outperforms same-vendor, the default flips in v1.5. If they tie or same-vendor wins, the default stands.

The structured synthesis is returned **alongside** raw reviewer responses, not in place of them. The primary AI receives both. It can:

- Use the structured synthesis directly (lowest cost, suitable for sophisticated synthesis-handoff)
- Ignore it and synthesize the raw responses itself (matches rev 1's intent)
- Use it as scaffolding — read the structured synthesis, then write a richer conversational version (highest quality, intermediate cost)

#### Synthesizer output schema

Modeled directly on ask-llm's `brainstorm-coordinator` synthesis structure:

```yaml
participants:
  - vendor: gemini
    status: success | failed | empty
    response_summary: "<one-sentence summary if success>"
  # ... per reviewer

consensus:
  - point: "<a finding multiple reviewers independently raised>"
    raised_by: [gemini, gpt]
    confidence: high | medium | low
    verification: grounded | inferred | mixed  # NEW (rev 4): preserves the
                                                # GROUNDED/INFERRED tag from
                                                # the reviewers. "mixed" when
                                                # different reviewers tagged
                                                # the same point differently.
    grounded_in: "<draft passage if applicable>"
    phantom_consensus: false                    # NEW (rev 5): true when
                                                # reviewers reach the same
                                                # surface conclusion through
                                                # incompatible reasoning.
                                                # Detected by synthesizer.
    rationale: "<when phantom_consensus is true: explain how reviewers'
                stated reasons contradict each other despite reaching the
                same surface conclusion. When false: brief note on what
                grounds the agreement.>"

unique_insights:
  - point: "<a finding only one reviewer raised, judged worth surfacing>"
    raised_by: [grok]
    verification: grounded | inferred  # NEW (rev 4)
    why_it_matters: "<brief reasoning>"

contradictions:
  - topic: "<what reviewers disagreed about>"
    positions:
      - vendor: gemini
        position: "<short summary>"
        verification: grounded | inferred  # NEW (rev 4): per-position tag
      - vendor: gpt
        position: "<short summary>"
        verification: grounded | inferred
    assessment: "<which side is stronger and why, or 'unresolved'>"
    # The synthesizer is instructed to lean toward GROUNDED positions when
    # they contradict INFERRED ones, all else equal.

rejected:
  # claims by reviewers that are flagged as likely wrong (when grounding allows)
  - point: "<the disputed claim>"
    raised_by: [gemini]
    verification: grounded | inferred  # NEW (rev 4)
    rejection_reason: "<why this likely fails>"

recommendations:
  - action: "<what the primary AI should consider doing>"
    priority: high | medium | low
    based_on: [consensus | unique_insights | contradictions]
```

The `verification` field on each finding (rev 4 addition) captures the reviewer's GROUNDED/INFERRED tag from §4.1.1. This lets the synthesizer preserve that signal end-to-end and lets the primary AI weight findings appropriately during conversational integration. Per ask-llm's `brainstorm-coordinator`: verified findings outrank inferred ones in consensus scoring, but inferred can still win when grounded findings are weak or absent.

This is a *structural* synthesis. It does not replace conversational synthesis. It surfaces points in a parseable form so that the primary AI's conversational integration has a stable scaffold.

#### Cost and timing

The synthesizer is one additional LLM call after reviewer collection. It runs sequentially (it needs all reviewer responses before it can synthesize). Estimated added latency: 5–15 seconds depending on model. Estimated added cost: roughly equal to one reviewer call.

When `return_synthesis: false`, this work is skipped entirely. The cost and latency apply only when explicitly requested.

#### When to use which mode

The MCP tool's documentation will recommend:

- **`return_synthesis: false`** for sophisticated primary AIs that the user is actively conversing with, when conversational integration is the goal
- **`return_synthesis: true`** for: less sophisticated primary AIs, headless/automated invocations where there is no conversation to integrate into, multi-round workflows where the synthesis becomes input to the next round, or any case where the user wants a parseable artifact

The default is `false` because the spec's empirical anchor (Dani's manual workflow) does not use a structured synthesizer.

### 3.8 Brief authoring — guidance shipped, helper deferred

Reviewer feedback on rev 1 correctly noted that "the brief is the magic" was acknowledged but not addressed. The team's quality is bounded by the brief's quality. v1 must ship with explicit brief-authoring guidance even if the team itself is just transport-and-synthesizer.

#### What ships in v1

A brief-authoring guide as part of the MCP tool's documentation and the web UI. Concretely:

- **The anatomy of a good brief.** Five components, each illustrated with examples from past Dani sessions: (1) context, (2) the specific question or sub-questions, (3) what's out of scope, (4) explicit DO-NOT-FLAG list, (5) format and length constraints if any. Full anatomy reference is in §4.1.3.
- **A library of templates.** Six to eight templates extracted from Dani's accumulated practice — each tagged with the question class it suits. Question classes and template names listed in the §4.1.3 table: architecture decision, naming decision, strategy question, technical problem, document review, spec validation, flaw-finding, idea pressure-test.
- **Anti-patterns.** Five to ten examples of bad briefs and what they produce, drawn from real failures in past sessions where Dani had to re-dispatch with a sharper brief. Anti-pattern reference is in §4.1.3.
- **The DO-NOT-FLAG default list.** Adopted from ask-llm and Anthropic's upstream code-review plugin: pre-existing issues, stylistic preferences, linter-catchable issues, suggestions-not-bugs, suppression-marked code, speculative issues without source grounding. The brief author can extend this; the default catches the common over-flagging modes.
- **Confidence calibration ladder (rev 4 addition).** Adopted as an *optional* template element from ask-llm's `gemini-reviewer` (`packages/claude-plugin/agents/gemini-reviewer.md` lines 49-58). When the question class supports confidence quantification (verifiable claims with file/line citations, factual assertions, security/correctness checks), the brief can ask reviewers to score each finding 0/25/50/75/100 and only report findings ≥80. Sample text the brief author can paste in:
  ```
  For each issue you raise, score your confidence 0-100:
  - 0-25: Possible issue, might be a false positive
  - 50: Real issue but minor or unlikely to hit in practice
  - 75: Verified issue that will impact what's being decided
  - 100: Certain issue that will cause a problem

  Only report issues with confidence >= 80.
  ```
  This is *not* baked into the reviewer system prompt because not all question classes have meaningful confidence semantics (a naming decision doesn't have ≥80% confidence in the same way a security finding does). The brief author opts in when relevant.

This documentation is non-trivial but it is *not* code. It can be drafted in 2–3 days. It should be drafted before the v1 benchmark runs because the benchmark briefs themselves should follow the documented patterns.

#### What ships in v1.5

A brief-authoring helper agent: `vada_reviewers__draft_brief`. Takes the user's question and draft, asks 2–3 clarifying questions about review intent (objective: validate / find flaws / pressure-test / answer specific Qn), then produces a structured brief using the templates.

This is one more agent, one more prompt, exposed as either an additional MCP tool or a slash command in the Claude Code plugin. Cost: 1–2 days.

It ships in v1.5 (not v1) because:
- The documentation is the prerequisite — the helper produces briefs that conform to the documented patterns
- The v1 benchmark will reveal whether briefs are the bottleneck
- If briefs are the bottleneck, the helper has high leverage; if not, we save the engineering

The decision to build the helper happens after the v1 benchmark, with data.

### 3.9 What the team does not do (in v1)

Several things Vāda Reviewers v1 explicitly does *not* do, to keep the first product narrow:

- **No multi-round by default.** A single round of fan-out + collect. If the primary AI wants a second round, it calls the team again with a refined brief. (v2 candidate: explicit multi-round support with state.)
- **No cross-ranking.** Reviewers do not see each other's responses. (v2 candidate based on llm-council's pattern.)
- **No source verification.** Reviewer claims are not cross-checked against external ground truth. (v2 candidate based on ask-llm's pattern.)
- **No structured output enforcement on reviewers.** Reviewers respond in whatever format the brief asks for; the brief is the contract. (The optional synthesizer enforces structure on the *synthesis*, not on individual reviewer responses.)
- **No reviewer specialization.** All reviewers play the same role: pressure-test the primary AI's draft. (Specialized variants like flaw-find, spec-validate are v3 candidates.)
- **No anonymization between reviewers and synthesizer.** The synthesizer (when enabled) sees full vendor attribution. The primary AI sees full vendor attribution. (Anonymization is a v2 candidate.)
- **No CLI mode.** API mode only. (v1.5 candidate, conditional on v1 benchmark and the pre-v1.5 sanity check in §3.5.)
- **No brief-authoring helper agent.** Documentation only. (v1.5 candidate.)

These are all candidate enhancements. They are excluded from v1 because each adds complexity without empirical evidence it improves the validated workflow. The discipline is: ship the workflow with the smallest credible feature set, learn from the benchmark, then add features against the baseline.

---

## 4. Technical specification

### 4.1 The MCP tool

Vāda Reviewers is exposed as a single MCP tool: `vada_reviewers__consult`.

**Signature (Zod):**

```ts
const ConsultInput = z.object({
  draft: z.string().describe(
    "The primary AI's draft answer to be reviewed. " +
    "Required. The reviewers will see this as the artifact under review."
  ),
  brief: z.string().describe(
    "The brief for the reviewers — the prompt that tells them what to do. " +
    "Required. This is where the primary AI's intent for the review is encoded. " +
    "Should include: context, the specific question, what's out of scope, " +
    "explicit DO-NOT-FLAG list if relevant, format/length constraints if relevant. " +
    "See the brief-authoring guide for templates and anti-patterns."
  ),
  user_question: z.string().describe(
    "The user's original question or request. Provides context to reviewers " +
    "beyond just the draft and brief. Required."
  ),
  reviewer_pool: z.array(z.enum(["gemini", "gpt", "grok", "claude", "ollama", "deepseek"]))
    .optional()
    .describe(
      "Which reviewers to consult. If omitted, defaults to all available " +
      "reviewers minus the primary AI's vendor."
    ),
  primary_vendor: z.enum(["gemini", "gpt", "grok", "claude", "ollama", "deepseek"])
    .optional()
    .describe(
      "The vendor of the primary AI making this call. Used to exclude self " +
      "from the default reviewer pool. If omitted, no exclusion."
    ),
  return_synthesis: z.boolean().default(false).describe(
    "When true, the team runs an additional synthesizer agent after collecting " +
    "reviewer responses and returns a structured synthesis (Consensus / Unique / " +
    "Contradictions / Rejected / Recommendations) alongside raw responses. " +
    "Adds one sequential LLM call (5-15s latency, ~1 reviewer-call cost). " +
    "Default false: primary AI synthesizes conversationally from raw responses."
  ),
  synthesizer_model: z.string().optional().describe(
    "Model identifier for the synthesizer agent. Only used when " +
    "return_synthesis is true. Defaults to the primary AI's vendor's " +
    "flagship model. Caller can override (e.g., to use a cheaper model " +
    "or a more capable one)."
  ),
  timeout_ms: z.number().optional().default(600000).describe(
    "Timeout per reviewer call. Default 10 minutes. Reviewers that exceed " +
    "are reported as failed. Synthesizer call uses the same timeout."
  ),
});

const ConsultOutput = z.object({
  reviews: z.array(z.object({
    vendor: z.string(),
    status: z.enum(["success", "timeout", "error", "empty"]),
    response: z.string().optional(),
    error: z.string().optional(),
    duration_ms: z.number(),
  })),
  synthesis: z.object({
    // Returned only when return_synthesis was true in the input.
    // null/absent when return_synthesis was false.
    participants: z.array(z.object({
      vendor: z.string(),
      status: z.enum(["success", "failed", "empty"]),
      response_summary: z.string().optional(),
    })),
    consensus: z.array(z.object({
      point: z.string(),
      raised_by: z.array(z.string()),
      confidence: z.enum(["high", "medium", "low"]),
      grounded_in: z.string().optional(),
    })),
    unique_insights: z.array(z.object({
      point: z.string(),
      raised_by: z.array(z.string()),
      why_it_matters: z.string(),
    })),
    contradictions: z.array(z.object({
      topic: z.string(),
      positions: z.array(z.object({
        vendor: z.string(),
        position: z.string(),
      })),
      assessment: z.string(),
    })),
    rejected: z.array(z.object({
      point: z.string(),
      raised_by: z.array(z.string()),
      rejection_reason: z.string(),
    })),
    recommendations: z.array(z.object({
      action: z.string(),
      priority: z.enum(["high", "medium", "low"]),
      based_on: z.array(z.enum(["consensus", "unique_insights", "contradictions"])),
    })),
    synthesizer_model: z.string(),
    synthesizer_duration_ms: z.number(),
  }).optional(),
  metadata: z.object({
    requested_pool: z.array(z.string()),
    available_pool: z.array(z.string()),
    excluded: z.array(z.string()),
    total_duration_ms: z.number(),
    transport_mode: z.enum(["api", "cli"]),  // "cli" only available in v1.5+
  }),
});
```

**Behavior:**
- Validates input
- Determines effective reviewer pool (requested ∩ available, minus primary_vendor)
- Dispatches all reviewers in parallel
- Collects responses with explicit failure handling (no fabrication, no silent drops)
- **If `return_synthesis: true`:** runs the synthesizer agent sequentially after reviewer collection completes (passing user_question, draft, brief, and all collected reviewer responses); returns structured synthesis in the output
- **If `return_synthesis: false` (default):** skips the synthesizer step entirely; output's `synthesis` field is absent
- Returns the structured response

### 4.1.1 The reviewer system prompt (sketch)

The reviewer system prompt is uniform across all reviewer agents — diversity is in vendor binding, not in role differentiation. v2 (June 2026) rewrites the prompt around three goals: force commitment to ONE primary concern, make anti-convergence explicit, and create output structure that makes shallow responses impossible to hide. The verification block and GROUNDED/INFERRED taxonomy from rev 5 are retired in favor of a tighter structured output format.

```
You are a critical reviewer. Three reviewers are reading this simultaneously —
you will not see what the others say.

Assume other reviewers will find the obvious issues: logical gaps, unsupported
claims, missing evidence, factual errors. Your job is to find what they will miss.

Commit to ONE primary concern. Not a list. One. Surface your most important
finding, then support it with precision. A short response with a genuine concern
outperforms a long list of hedged ones.

PHANTOM CONSENSUS FLAG: If you find yourself agreeing with every part of the
draft and have no substantive concern, do not fabricate one. Write:

  PRIMARY CONCERN: None identified.

Then note what you examined. Fabricated dissent is as harmful as fabricated
agreement.

---

Respond in this exact structure:

PRIMARY CONCERN (1 sentence)
Your single most important concern. Must be a genuine concern, not praise.
No hedging.

EVIDENCE (2-3 sentences)
Specific support. Quote or directly reference the draft. "The draft could be
clearer" is not evidence — name the exact passage or claim that fails.

WHAT THE DRAFT GETS RIGHT (1-2 sentences)
The strongest part of the draft. This is honest observation, not a formality.

WHAT WOULD CHANGE MY MIND (1 sentence)
The one thing the primary AI could show you that would cause you to withdraw
your concern.
```

v2 rationale: the rev 5 prompt allowed reviewers to produce lists of generic findings (errors, omissions, weak claims) that three different vendors would independently generate from the same priority list — producing phantom consensus without any mechanism to detect or prevent it at the reviewer level. Structured output with a single mandatory primary concern forces prioritization; the phantom consensus flag makes convergence a named failure mode rather than a silent outcome. The verification block and GROUNDED/INFERRED taxonomy are not carried forward — they added overhead without preventing surface-level convergence.

#### v1 (archived)

Rev 5 reviewer system prompt — active until June 2026.

```
You are an external critical reviewer. The text below structures your role
in four parts: PERSONA, GOAL, POSTURE, OUTPUT. Read all four before responding.

## PERSONA

You are an external critical reviewer. You did not write the draft you are
about to review. You have no stake in defending it. Your usefulness depends
on identifying real flaws, not performing skepticism.

You will receive:
- The user's original question or request
- A draft answer written by another AI assistant (the primary AI)
- A brief from the primary AI describing what specifically to review

## GOAL

Pressure-test the draft. Surface substantive errors, significant omissions,
weak claims, and hidden assumptions. Help the primary AI revise toward a
better answer.

Read the brief carefully — it specifies what the primary AI wants from you.
Follow its instructions. If the brief asks specific sub-questions, answer
them. If it specifies length or format constraints, respect them. The brief
overrides the defaults below when they conflict.

Default critical review priorities (apply unless the brief overrides):
- Substantive errors (factual, logical, mathematical)
- Significant omissions (things the question requires that the draft missed)
- Weak claims (assertions without justification)
- Hidden assumptions (premises the draft relies on but doesn't state)

DO NOT flag (unless the brief explicitly asks for these):
- Stylistic preferences
- Things you would have written differently but that are correct
- Speculation about what the author "should have" considered
- Issues you cannot ground in a specific passage of the draft
- Pre-existing context outside the draft

## POSTURE

Be direct. Be specific. Cite passages from the draft when making GROUNDED
claims. Length should match substance — a short critique is better than a
long one if the draft has few real issues.

If you find no substantive issues, say so clearly. Do not invent problems
to seem useful. Performative skepticism is a failure mode this prompt is
designed to prevent.

## OUTPUT

Begin your response with a verification block listing the facts you are
treating as given. This forces you to commit to your understanding of the
draft before critiquing it, and lets the synthesizer (and the primary AI)
catch cases where reviewers misread the draft in different ways.

<verification>
- The draft proposes [your one-sentence summary of what the draft argues].
- I am taking as given:
  - [key claim, definition, or framing 1 the draft establishes]
  - [key claim 2]
  - [key claim 3 — typically 2-4 items]
- I am NOT verifying [optional]:
  - [claims in the draft that fall outside what you can assess from the
    text alone, e.g., empirical claims requiring tools you don't have]
</verification>

After the verification block, produce your critique. Mark every substantive
point as either GROUNDED or INFERRED:

- GROUNDED — you can quote or directly reference a specific passage from the
  draft that the point is about. Use this when the issue is in the text in
  front of you. Prefix the point with "GROUNDED:" or use whatever structure
  the brief specifies.
- INFERRED — you are reasoning outside the draft text (e.g., about
  implications, missing context, or claims that would be true regardless of
  what the draft says). Prefix with "INFERRED:" or follow the brief's structure.

Use this tagging on every substantive point. The synthesizer (when present)
weights GROUNDED findings more heavily than INFERRED ones, and the primary
AI uses the same signal to decide which critiques to act on first. Do not
skip the tagging — an unmarked point is treated as less actionable.

If the brief specifies a different output format (e.g., "respond as a
numbered list of concerns" or "answer Q1, Q2, Q3 in order"), follow it.
The verification block requirement and GROUNDED/INFERRED tagging apply
regardless of format — fold them into whatever shape the brief asks for.
```

The DO-NOT-FLAG list is adopted verbatim from ask-llm + Anthropic's upstream code-review plugin, generalized from code review to general review. The GROUNDED/INFERRED tagging is adopted from ask-llm's `brainstorm-coordinator` Phase 3B, generalized from "verified vs inferred against repo files" to "grounded vs inferred against the draft." The Persona+Goal+Posture+Output structural pattern and the verification block are rev 5 additions adopted from cross-vendor research convergence (Gemini, Grok, ChatGPT — May 2026).

### 4.1.2 The synthesizer system prompt (sketch)

When `return_synthesis: true`, the synthesizer agent runs with this system prompt. Rev 5 adds phantom consensus detection (CONSENSUS section), verification-block divergence flagging (PARTICIPANTS section), and a recommendations-prioritization rule that de-prioritizes phantom-flagged consensus.

```
You are a synthesizer for the Vāda Reviewers team. The user asked a question.
A primary AI assistant wrote a draft answer. Several external reviewers
(different LLM vendors) critiqued the draft. Your job is to organize their
critiques into a structured synthesis.

You will receive:
- The user's original question
- The primary AI's draft
- The brief that was sent to reviewers
- All reviewer responses with vendor attribution
- Each reviewer's verification block (the facts they took as given)

Produce a structured synthesis with these sections:

1. PARTICIPANTS — list each reviewer, status (success/failed/empty), and a
   one-sentence summary of their response if successful. Note any meaningful
   divergence between reviewers' verification blocks (e.g., "Reviewer A
   treated claim X as given; Reviewer B did not"). Significant verification
   divergence may indicate reviewers were critiquing different readings of
   the draft, which the primary AI should know.

2. CONSENSUS — points raised by two or more reviewers independently. For
   each point:
   - Mark confidence (high/medium/low).
   - Mark `verification` as GROUNDED if the reviewers' tags agree it's
     grounded in the draft, INFERRED if they agree it's outside the draft,
     or MIXED if reviewers disagreed on the tag.
   - Include the draft passage in `grounded_in` when GROUNDED.
   - **CHECK FOR PHANTOM CONSENSUS.** Two reviewers reaching the same
     surface conclusion through incompatible reasoning is NOT real
     consensus — it's two separate signals that happen to point the same
     direction by coincidence. Set `phantom_consensus: true` and use the
     `rationale` field to explain how the reviewers' stated reasons
     contradict each other. Examples of phantom consensus:
       - Reviewer A: "The draft underweights Concern X." Reviewer B: "The
         draft overweights Concern X." Both could be paraphrased as "the
         draft mishandles X" — but they recommend opposite revisions.
       - Reviewer A flags a claim as wrong because of evidence E1.
         Reviewer B flags the same claim as wrong because of evidence E2
         that contradicts E1.
     When `phantom_consensus: false`, use the `rationale` field for a brief
     note on what grounds the agreement. Err on the side of false (real
     consensus) when in doubt — phantom requires *incompatible* reasoning,
     not merely *different* reasoning.

3. UNIQUE INSIGHTS — points raised by only one reviewer that you judge
   worth surfacing. Briefly explain why each matters. Preserve the
   reviewer's own GROUNDED/INFERRED tag in the `verification` field.

4. CONTRADICTIONS — disagreements between reviewers, where the disagreement
   is on the surface (not phantom — those go in CONSENSUS with the flag).
   Present each side with the reviewer's verification tag preserved per
   position. Give your assessment of which is stronger.
   **When a GROUNDED finding contradicts an INFERRED one, lean toward the
   GROUNDED view unless the inferred finding is exceptionally well-reasoned
   about something the draft cannot itself answer.** Mark unresolved when
   neither side is clearly stronger.

5. REJECTED — claims by reviewers that you judge likely wrong, with brief
   reasoning. Use this category sparingly and only when you can articulate
   why the claim fails. Preserve the verification tag.

6. RECOMMENDATIONS — what the primary AI should consider doing, prioritized.
   When prioritizing:
   - Weight grounded real consensus (phantom_consensus: false) highest.
   - Weight grounded unique insights next.
   - Weight inferred consensus next, but de-prioritize phantom-flagged
     consensus regardless of GROUNDED/INFERRED status — the underlying
     disagreement makes the signal weak even when the surface agreement
     looks strong.
   - Weight inferred unique insights last.

Output a JSON object matching the provided schema. You may wrap it in a
markdown code fence (```json ... ```) if that produces more reliable output;
the parser accepts either bare JSON or fenced JSON. Do not add explanatory
prose outside the JSON / code-fence boundary. If you cannot complete a
section (e.g., no contradictions found), include the field with an empty
array rather than omitting it.

You are not the primary AI. You do not close the loop with the user. Your
output is an input to the primary AI's conversational integration.
```

Parsing implementation — four tiers of robustness, in order of preference:

1. **Tier 1 — fenced JSON.** Look for a ```json ... ``` (or ``` ... ```) fenced block; parse its contents as JSON. This is the canonical happy path.
2. **Tier 2 — bare JSON.** If no fenced block, parse the entire response as JSON. Some models follow "no preamble" instructions and return raw JSON.
3. **Tier 3 — tolerant extraction.** Find the largest substring that parses as a valid JSON object. Handles cases where the model added a brief preamble or trailing text outside the JSON.
4. **Tier 4 — regex section extraction (rev 4 addition).** When all three JSON-aware tiers fail, fall back to regex extraction of the six top-level sections by name (PARTICIPANTS, CONSENSUS, UNIQUE_INSIGHTS, CONTRADICTIONS, REJECTED, RECOMMENDATIONS). The extracted sections are stored as opaque text strings (one string per section), not as structured arrays. The output's metadata is annotated with `degraded: true` so the primary AI knows it's getting partially-extracted data and can adjust its conversational integration accordingly. Pattern adapted from llm-council's `parse_ranking_from_text` (`backend/council.py:177-208`), which uses regex sequence matching to extract rankings even when the model breaks the expected format.

If all four tiers fail, the synthesizer's response is reported as an error in the output's `synthesis` field (set to `null` with an error string), and the team returns reviewer responses normally. This is the failure-surface-without-fabrication pattern from ask-llm applied to the synthesizer: never silently drop, never fabricate.

The synthesizer prompt is intentionally less editorial than ask-llm's brainstorm-coordinator's Phase 4. ask-llm's coordinator is the user-facing voice; Vāda Reviewers' synthesizer is upstream of the user-facing voice (which is the primary AI). The synthesizer is structural; it is not opinionated.

### 4.1.3 The brief template (user-message structure)

The reviewer system prompt (§4.1.1) defines the role. The synthesizer system prompt (§4.1.2) defines structural synthesis. **The brief is the user-message-side prompt** — the actual content the primary AI fills in per call. It is not part of any system prompt; it is data passed into `vada_reviewers__consult` via the `brief` parameter.

This section documents what a brief should look like. The full brief-authoring guide ships with v1 (§3.8) — this section is the reference structure.

#### Anatomy of a brief

A complete brief has five components:

```markdown
## Context

<2-4 sentences of background. What is the user trying to do? What's
the project? Why does this question matter? Reviewers don't need the
full project history — just enough to make the question intelligible.>

## The question / sub-questions

<The specific question the primary AI wants pressure-tested. If
multi-part, enumerate as Q1, Q2, Q3.>

<For each sub-question, indicate the kind of answer wanted: yes/no,
ranked list, prose argument, specific data point, etc.>

## Out of scope

<What you do NOT want reviewers to spend energy on. E.g., "do not
re-architect the system; assume the existing structure"; "do not
suggest alternative product names; we have one"; "do not flag style
preferences in the prose.">

## DO NOT flag

<Default list — adopt verbatim from the reviewer system prompt unless
the question class warrants a different list:>

- Stylistic preferences
- Things you would have written differently but that are correct
- Speculation about what the author "should have" considered
- Issues you cannot ground in a specific passage of the draft
- Pre-existing context outside the draft

<Add question-specific exclusions when relevant. E.g., for a strategy
question, "do not propose alternative strategies; pressure-test this one.">

## Format / constraints

<Length cap if any. E.g., "respond in under 400 words." Format
instructions if any. E.g., "structure your response as: (1) Summary
verdict in one sentence, (2) Top 2 concerns with GROUNDED/INFERRED
tags, (3) One thing you'd test next.">
```

#### Brief templates by question class

The brief-authoring documentation (§3.8) ships with templates for these question classes. Each template starts from the anatomy above and tunes the four malleable components (context boilerplate, question framing, out-of-scope defaults, format).

| Question class | Template name | What it tunes |
|---|---|---|
| Architecture decision | `architecture-decision.brief.md` | "Out of scope" pre-fills with "do not re-architect"; format asks for trade-off matrix |
| Naming decision | `naming-decision.brief.md` | "Out of scope" excludes alternative names; format asks for ranking with one-sentence rationale |
| Strategy question | `strategy-question.brief.md` | "Out of scope" prevents counter-strategies; format asks for steelman + objections |
| Technical problem | `technical-problem.brief.md` | Asks reviewers to identify specific failure modes; format asks for ordered risk list |
| Document review | `document-review.brief.md` | Format asks for line-anchored critique; GROUNDED required for all flagged issues |
| Spec validation | `spec-validation.brief.md` | Asks reviewers to find gaps and inconsistencies; uses confidence calibration ladder (≥80) |
| Flaw-finding | `flaw-finding.brief.md` | Adversarial framing; explicitly asks "what would break this?" |
| Idea pressure-test | `idea-pressure-test.brief.md` | Asks for 2 strongest objections and 1 unstated assumption |

#### Concrete brief example (the §1.3 walkthrough, expanded)

For the worked example in §1.3 — Dani asking Claude whether to ship Vāda Reviewers v1 with API mode only — Claude would author this brief and pass it to the team:

```markdown
## Context

We're shipping the first product on top of the Atta engine: Vāda Reviewers,
a vendor-diverse external review tool. The spec has gone through three
revisions and is implementation-ready. The current proposal is to ship
"API mode only" in v1 (direct provider API calls) and defer "CLI mode"
(subprocess wrapping of gemini-cli, codex-cli, etc.) to v1.5, conditional
on the v1 benchmark.

## The question

Q1: Is shipping API mode only in v1 the right choice, or am I missing
something that CLI mode would deliver in v1?

Q2 (sub-question): Specifically — would API mode's lack of tool access
(web search, filesystem, code execution that CLIs may have) make the v1
benchmark's results uninterpretable? E.g., reviewers fail to verify a
claim in a way that confounds the cognitive evaluation.

## Out of scope

- Do not propose abandoning the v1 launch
- Do not propose third options beyond API-first or CLI-first
- Do not re-litigate the cognitive design (roles, synthesis, etc.) — that
  is settled
- Do not propose changing the benchmark conditions (already six conditions,
  designed)

## DO NOT flag (additional to defaults)

- Stylistic preferences in the spec text
- General "you should benchmark more rigorously" advice — already accounted
  for

## Format

Respond in under 400 words. Structure as:
(1) Summary verdict in one sentence — should we ship API-only or CLI-too?
(2) Top 2 concerns about API-only, each tagged GROUNDED or INFERRED
(3) One specific thing the v1 benchmark should look for to surface
    whether API mode's transport gap is fatal
```

This is a real brief shape. It produces sharp reviewer output because it tells reviewers exactly what to do and what not to do.

#### Anti-patterns (full list in brief-authoring docs §3.8)

- "Review this and give me your thoughts." (Vague. Reviewers will produce vague output.)
- "Find anything wrong with this draft." (Open-ended. Triggers performative skepticism.)
- "Tell me if I'm right." (Asking for confirmation, not pressure-testing.)
- Briefs longer than 600 words. (Reviewers lose track of what's being asked.)
- Briefs that don't mark out-of-scope. (Reviewers waste energy on adjacent issues.)
- Briefs without a format constraint. (Responses are incomparable across reviewers.)

The brief-authoring documentation (§3.8) ships with 5-10 worked anti-pattern examples drawn from real failures.

### 4.2 The YAML spec

Working draft. The YAML is the team's authoritative configuration; the MCP tool reads from it.

```yaml
# packages/engine/specs/vada-reviewers/team.yaml
schema_version: 2

id: vada-reviewers
name: "Vāda Reviewers"
description: |
  Vendor-diverse external review of a primary AI's draft, with synthesis
  performed by the primary AI in the calling context. Single round, no
  cross-ranking, no internal synthesis. Mirrors the proven manual workflow
  of pasting a draft to multiple chat products for critique.

mode: brokered
rounds: 1

# The team has two agent definitions: reviewer (parallel, vendor-diverse)
# and synthesizer (single, optional). The primary AI is external to the team
# (it's the calling context). All reviewer agents share the same role and
# system prompt; diversity comes from vendor binding, not role differentiation.
agents:
  - id: reviewer
    role: reviewer
    instances: dynamic  # determined by reviewer_pool at call time
    binding:
      mode: api  # v1: api only. v1.5 will add cli_subprocess option.
      vendors:
        gemini:
          api_endpoint: "https://generativelanguage.googleapis.com/..."
          # cli_command for v1.5: ["gemini", "-p", "@${prompt_file}"]
        gpt:
          api_endpoint: "https://api.openai.com/v1/chat/completions"
          # cli_command for v1.5: ["codex", "exec", "--full-auto", "-"]
        grok:
          api_endpoint: "https://api.x.ai/v1/chat/completions"
          # No known CLI; API-only indefinitely.
        claude:
          api_endpoint: "https://api.anthropic.com/v1/messages"
          # cli_command for v1.5: ["claude", "--print"] — to be verified
        ollama:
          api_endpoint: "http://localhost:11434/api/chat"
          # cli_command for v1.5: ["ollama", "run", "${model}"]
        deepseek:
          api_endpoint: "https://api.deepseek.com/v1/chat/completions"
          # No known CLI.

  - id: synthesizer
    role: synthesizer
    instances: 0_or_1  # 1 when return_synthesis is true, 0 otherwise
    runs_after: reviewer  # sequential: requires all reviewer responses
    binding:
      mode: api
      vendor: ${synthesizer_model_or_default}  # caller-overridable
    output_schema: structured  # see §4.1 for the schema

# Reviewer system prompt — see §4.1.1 above.
reviewer_system_prompt: |
  [as documented in §4.1.1]

# Reviewer user message template
reviewer_user_message_template: |
  ## User's original question

  ${user_question}

  ## Primary AI's draft

  ${draft}

  ## Brief for you

  ${brief}

# Synthesizer system prompt — see §4.1.2 above. Used only when synthesizer
# is instantiated (return_synthesis: true).
synthesizer_system_prompt: |
  [as documented in §4.1.2]

# Synthesizer user message template
synthesizer_user_message_template: |
  ## User's original question

  ${user_question}

  ## Primary AI's draft

  ${draft}

  ## Brief sent to reviewers

  ${brief}

  ## Reviewer responses

  ${reviewer_responses_with_attribution}

  Produce the structured synthesis as JSON.

# Output handling
output:
  format: free_text  # reviewers respond in whatever shape the brief specifies
  structured_schema: null  # v1 does not enforce schema; brief is the contract
  failure_modes:
    - timeout: "report as failed; include partial output if any"
    - error: "report stderr; do not fabricate response"
    - empty: "report as empty; do not fabricate"
```

This is a sketch. The exact schema fields depend on the engine's current YAML schema. The intent is captured here; the engine team adapts to the existing format.

### 4.3 Engine constraints we depend on

For Vāda Reviewers v1 to be implementable, the engine must support:

1. **Dynamic agent instances.** The number of reviewer agents is determined at call time, not compile time. The Plan compiler must accept `instances: dynamic` (or equivalent) and produce a Plan with N parallel reviewer nodes where N is determined per invocation. The synthesizer is `instances: 0_or_1` — a single optional node that runs sequentially after reviewer collection.

2. **Per-agent vendor binding.** Each reviewer instance binds to a specific vendor. The binding determines which API endpoint (and credentials) to use. The same role (`reviewer`), different vendor per instance. The synthesizer also takes a vendor binding, defaulting to the primary AI's vendor's flagship model and overridable per call.

3. **Conditional sequential node.** The Plan must support an optional node that runs after the parallel reviewer nodes complete, conditional on an input flag (`return_synthesis: true`). When the flag is false, the node is omitted from the compiled Plan entirely. This is a small extension of the engine's current capabilities.

4. **Failure surfacing without halt.** Reviewer-level failures must be reported in the output, not crash the whole call. The synthesizer (when enabled) must be robust to partial reviewer responses — it receives whatever succeeded.

5. **API-only execution path in v1.** The existing LangGraph adapter's API-call capability is sufficient. No new transport work is required for v1.

If any of these constraints are not met by the current engine, they become engine work items that gate Vāda Reviewers v1. Constraint 3 (conditional sequential node for the optional synthesizer) is the most likely small extension required; the rest are believed to be supported by the current schema.

#### v1.5 additional constraint

6. **CLI subprocess execution as a binding alternative.** New for Vāda when v1.5 ships. The pattern from ask-llm (single foreground Bash call, direct backgrounding, `wait` per PID, captured stderr per PID, explicit per-vendor failure handling) is the reference implementation. This is the highest-risk engine work item and is intentionally pushed past v1 to keep the v1 scope narrow.

### 4.4 Default reviewer pool

For v1, the default reviewer pool is **API mode only**:

- **Gemini** — large context, strong at analysis. API: Google Generative Language API.
- **GPT** — strong general reasoning. API: OpenAI Chat Completions.
- **Grok** — different training distribution. API: xAI.
- **Claude** — when primary is not Claude, Claude is in the pool. API: Anthropic Messages.
- **Ollama** — local, private, free. Quality varies by model. API: local Ollama HTTP.
- **DeepSeek** — different training distribution from Western labs. API: DeepSeek.

When primary is Claude (Dani's current default), the reviewer pool defaults to `[gemini, gpt, grok]`. When primary is Gemini, pool is `[claude, gpt, grok]`. Etc. Three reviewers is a reasonable default — enough for triangulation, not so many that synthesis becomes overwhelming.

DeepSeek is omitted from default-by-default because Dani has used it less in the manual workflow. It can be added explicitly via `reviewer_pool` if desired. v1 will benchmark with and without DeepSeek to see whether including it improves or dilutes outputs.

For v1.5, the same default pool is available via either CLI mode (where a CLI exists) or API mode (where it does not). Grok and DeepSeek are likely API-only indefinitely.

---

## 5. How v1 will be validated

The benchmark must answer one question: **does Vāda Reviewers in API mode produce outcomes comparable to the manual workflow Dani has empirically validated?**

This is *not* the question "does multi-agent beat single-agent?" That's Vāda's broader research question. Vāda Reviewers v1's question is narrower and more practical: did we successfully automate the workflow Dani knows works, with API-mode transport and the cognitive primitives we chose to lift from prior art?

The benchmark also tests, secondarily, whether the optional team-side synthesizer adds value over conversational synthesis by the primary AI. This is the §3.7 hedge — if it's pure overhead, we deprecate it; if it materially helps, it becomes the default.

### 5.1 Test corpus

10–15 hard questions where Dani has visibly benefited from the manual workflow. Real questions, not synthetic. From the past 6 months of Atta development:

- Architecture decisions (e.g., "should @atta/engine and Vāda live as separate packages?")
- Naming decisions (e.g., the AttaLabs domain decision)
- Strategy questions (e.g., "should we pause Vitakka and focus on Vāda?")
- Technical problems with multiple valid approaches
- Document reviews (e.g., the cognitive analysis report itself)

For each test case, we have:
- The original question
- Claude's initial draft
- The actual reviewer responses Dani collected manually (saved from past sessions where possible)
- The synthesized conclusion Dani arrived at
- Outcomes if known (did the decision turn out well?)

### 5.2 Conditions to test

Six conditions per test case. The matrix isolates the cognitive question (does the workflow work) from secondary questions (does optional synthesis help, does same-vendor or cross-vendor synthesis work better, does the manual workflow exceed automation).

- **A0 (single-shot, no reviewers):** Just primary AI's draft, no review. Baseline lower bound.
- **A1 (single-shot with structured schema):** Primary AI's draft in structured form (the existing A1 baseline from Vāda V2 results). Existing-baseline comparison.
- **VR-NS (Vāda Reviewers, no synthesis):** Primary AI's draft + 3 reviewer responses (API mode) + primary AI's conversational synthesis. Tests v1's default mode.
- **VR-S-same (Vāda Reviewers, same-vendor synthesis):** As VR-NS plus `return_synthesis: true` with synthesizer model = primary AI's vendor's flagship. Tests v1's optional default-synthesis-binding.
- **VR-S-cross (Vāda Reviewers, cross-vendor synthesis):** As VR-NS plus `return_synthesis: true` with synthesizer model = a fixed model from a different vendor than the primary. Specifically: when primary is Claude, synthesizer is GPT (e.g., GPT-5.1); when primary is anything else, synthesizer is Claude Opus. Tests whether cross-vendor synthesis would be a better default.
- **MW (Manual workflow, historical):** Where available, the original Dani-collected response: chat-product reviewers, Dani synthesizer. Treated as the empirical ceiling because this is what we know works.

The five-way comparison among A1, VR-NS, VR-S-same, VR-S-cross, and MW is what we care about most. A0 is included only to confirm the obvious lower bound.

This conditions list does not include a separate VR-CLI condition because CLI mode is not in v1. v1.5 will add CLI conditions once the cognitive design is validated by the v1 conditions.

The repeatable benchmark harness (T9, Issue #184) runs these six plus two conditions added after this section was written — FUSION-default and FUSION-native — against identical per-question input. See §6a for the full eight-condition input/artifact protocol.

### 5.3 Judging method

**Manual judging by Claude in a fresh context, with Dani as final arbiter.**

For the first benchmark, no LLM-judge automation. Each test case's outputs are presented blind (anonymized as "Output A, B, C, D, E") to a fresh Claude instance with no knowledge of which output came from which condition. The judge ranks them on:

- **Correctness:** are the substantive claims true?
- **Completeness:** does the output address what the question asked?
- **Insight:** does it surface non-obvious considerations?
- **Calibration:** does it acknowledge uncertainty appropriately?

After the blind ranking, Dani reviews each case manually. He has the highest-fidelity judgment because he knows the actual context and outcomes. His judgment is final; the blind Claude judge is supporting evidence.

This is slower than an LLM-judge benchmark but it avoids the trap Vāda's existing benchmarks fell into (Recognition 6 in `vada-product-recognitions.md`): measuring the wrong thing.

### 5.4 Success criteria

Vāda Reviewers v1 is considered validated if:

- **The best of (VR-NS, VR-S-same, VR-S-cross) ties or beats A1 on at least 70% of test cases** (judged blindly by Claude, confirmed by Dani). Whichever of the three performs best is the recommended default mode going forward.
- **The best of (VR-NS, VR-S-same, VR-S-cross) is at least as good as MW (the manual workflow) on at least 50% of test cases**, where historical MW data is available. Where MW data is not available, this criterion is replaced by Dani's qualitative judgment of whether the output captures what the manual workflow would have produced.
- **VR-S-same and VR-S-cross are meaningfully different from VR-NS** — one or both perform differently. If all three tie on every case, the optional synthesizer adds no value and should be deprecated; the v1 product becomes VR-NS only. If one of the synthesis modes consistently dominates, that mode becomes the recommended default and the others are flagged for v1.5 reconsideration.
- **VR-S-same and VR-S-cross are meaningfully compared to each other** — the same-vendor-vs-cross-vendor question is empirically resolved. The winner becomes the default synthesizer binding (potentially flipping the rev 3 same-vendor default).

The 70% and 50% thresholds are starting points. The first benchmark may surface that one threshold is too strict and the other too loose; calibrate based on the first run's distribution.

#### Reporting requirement

The benchmark report must include both aggregate results across all test cases **and a per-question-type breakdown**. Question types are categorized in advance: architecture decisions, naming decisions, strategy questions, technical problems with multiple valid approaches, document reviews, spec validation, flaw-finding, idea pressure-testing.

Per-type breakdown matters because some question types may favor different modes. Architecture decisions may benefit from VR-S-cross's outside perspective. Naming decisions may benefit from VR-NS's preserving of disagreement texture. Without per-type reporting, aggregate numbers may hide the right product behavior — which is "use VR-S-cross for these question types, VR-NS for those."

#### What a falsifying result tells us

If none of (VR-NS, VR-S-same, VR-S-cross) clears the 70% threshold against A1, the v1 hypothesis is rejected. Investigation paths in priority order:

1. **Brief quality.** Were the test-case briefs themselves well-authored? Re-run with sharper briefs from the documentation. If briefs were the bottleneck, re-test before drawing further conclusions.
2. **Reviewer pool composition.** Was the pool the right one? Try alternative pools (4 reviewers, different vendor mixes).
3. **Synthesis quality across modes.** If VR-S-same fails but VR-S-cross succeeds (or vice versa), the synthesizer binding matters more than expected and the default needs to flip.
4. **Cognitive design.** If none of the above rescue the result, the v1 cognitive design (review-then-synthesize) is fundamentally inadequate. Add v2 features (cross-ranking, source verification) and re-test. If those don't help either, reconsider whether multi-agent deliberation provides cognitive lift over single-shot at all — this is the existential test.

A falsifying result is a successful experiment, not a failure. It tells us the design is wrong before we ship it widely.

### 5.5 What we are *not* measuring in v1

- **Latency.** API-mode reviewers add per-vendor API latency. Three reviewers in parallel + optional synthesizer adds ~10-30s end-to-end depending on vendors. We accept this for v1.
- **Cost.** Three reviewer calls per request (plus optional synthesizer call) is 3-4× the cost of A1. We accept this for the proof-of-value phase.
- **Robustness at scale.** v1 is a Dani-and-collaborators tool first. Multi-user reliability is a v2 concern.
- **The CLI fidelity gap.** Until v1.5 ships, we cannot measure whether CLI tool access closes the gap to chat products. The pre-v1.5 sanity check (§3.5) addresses this before any CLI implementation work begins.

---

## 6. Roadmap — what comes after v1

These are documented but not built in v1. Each is a candidate experiment to test against the v1 baseline. The buckets (v1.5, v2, v3) are ordered by complexity, not strict timeline.

### 6.1 v1.5 candidates (next-up after v1 benchmark)

The v1.5 bucket is for low-complexity additions that the v1 benchmark may identify as high-leverage.

- **CLI mode.** Subprocess wrapping of `gemini-cli`, `codex-cli`, `claude --print`, `ollama`. Closes the chat-product fidelity gap to the extent CLIs preserve it. Conditional on the pre-v1.5 sanity check (§3.5) showing it's worth the engineering. Highest implementation risk.
- **Brief-authoring helper agent.** `vada_reviewers__draft_brief` — separate MCP tool that takes the user's question and draft, asks 2–3 clarifying questions, produces a structured brief using the documented templates. Cheap to build (1–2 days), high practical value if briefs are the bottleneck.
- **`/compare` flag — explicitly skip synthesis even when caller wants no integration.** Functionally already supported by `return_synthesis: false`, but exposing it as a named convenience may help adoption. Trivial to add.
- **Per-pool latency optimization.** If certain vendors are slow, allow callers to set per-vendor timeouts. Useful for production but not blocking v1.

### 6.2 v2 candidates (after v1.5 stabilizes)

The v2 bucket is for cognitive enhancements with less certain payoff. Each is tested as an additive variant against the v1.5 baseline.

- **Cross-ranking step (from llm-council).** Optional flag: reviewers see each other's responses (anonymized, properly shuffled) and rank them; rankings flow into the synthesizer. Test against v1.5 baseline.
- **Source verification step (from ask-llm).** When reviewers cite specific files/lines, the team Reads those files and marks claims Verified/Rejected/Unverifiable before returning. Useful for code/spec review especially.
- **Multi-round.** A second round where the primary AI revises and re-dispatches based on first-round critique. Probably gated behind explicit user request; not a default.
- **Reviewer specialization.** Per-reviewer system prompts that nudge cognitive posture (one as steelman, one as devil's advocate, one as domain skeptic). Test whether role differentiation adds to vendor diversity.
- **Anonymization between reviewers and synthesizer.** Hide vendor identities from the synthesizer to reduce vendor-loyalty bias. Test against attributed.
- **Confidence-weighted synthesis.** Reviewers self-rate confidence (0-100, ≥80 threshold from ask-llm pattern); synthesizer weights accordingly.

### 6.3 v3 candidates (later)

- **Domain-specialized variants.** `vada-code-review-team`, `vada-spec-validate-team`, `vada-flaw-find-team`. Each tunes reviewer prompts for its purpose. Build only when v2 data shows variants are worth differentiating.
- **Memory across rounds.** Conversation history threaded through multi-round invocations. Required if multi-round becomes common.
- **Team composition learning.** Track which reviewer pools and synthesis modes work for which question types; auto-recommend per call. Far-future; needs data.

### 6.4 What we will not build

- **No web UI as the primary surface.** v1 ships MCP-first because that's where Dani uses it. The web UI exists for trial/demo and onboarding, not as a primary product surface.
- **No autonomous agent-to-agent debate.** Vāda's existing autonomous mode (Crucible, Sparring, War Room) is a different research direction. Vāda Reviewers is a brokered-mode product. Autonomous mode lives separately and is tested separately.
- **No fixed-vendor lock-in.** The team must remain vendor-agnostic indefinitely. If a vendor exits the market or becomes uncompetitive, the team must continue functioning with the others.

---

## 6a. Comparison protocol — pinned before any benchmark run

This section is the harness contract: for each condition, the exact common input, the artifact a judge (T10) evaluates, and any per-condition invocation parameters. Pinned by `vada-production-v1` T9 (Issue #184) before the first dry run. Implemented by `apps/vada-ai/web/scripts/run-benchmark.ts`.

§5.2 locked six conditions (A0, A1, VR-NS, VR-S-same, VR-S-cross, MW). Two more were added to the harness matrix after §5.2 was written, once `vada-fusion` (A2 external benchmark, Issue #179) and `vada-fusion-native` (Outside Read engine, Issue #180) existed: **FUSION-default** and **FUSION-native**. All eight run against identical per-question input.

### Common input contract

Per benchmark question (from `apps/vada-ai/web/scripts/bench/corpus.ts`), the harness computes exactly two upstream artifacts, once, and reuses them verbatim across every condition that needs them — no condition re-derives its own input:

1. **`question`** — the raw corpus question text. Used directly by A0, A1, FUSION-default, FUSION-native, MW.
2. **`draft`** — the primary AI's draft, computed by running the **A1** spec once (`a1-baseline.yaml`, structured JSON output). Reused as "the primary AI's draft" required by VR-NS/VR-S-same/VR-S-cross (§5.2). A1 is not re-run per reviewer condition — the harness caches it per question (`getPrimaryDraft()` in the runner) so VR-NS, VR-S-same, and VR-S-cross literally share one draft, keeping the input structurally identical across the three (§11 of the T9 brief: "structurally impossible to pass different prompts to different conditions").

The three reviewer conditions (VR-NS, VR-S-same, VR-S-cross) additionally share one composed **review brief** — `question` + `draft`, wrapped in a fixed template (`buildReviewBrief()`) — passed as the `{{question}}` template variable into `vada-reviewers.yaml` / `vada-reviewers-synthesis.yaml`. This is not a YAML edit: the brief is caller-supplied content, exactly how the production MCP tools already work (the calling AI composes the brief; the YAML template is generic).

### Per-condition definition

| Condition | YAML | Input | Judged artifact | Invocation parameters |
|---|---|---|---|---|
| **A0** | `a0-baseline` | `question` | Raw response text | None. Primary model default `claude-sonnet-4-6` (`--model` overridable). |
| **A1** | `a1-baseline` | `question` | Structured JSON (`recommendation` + full object) | None. Same primary model as A0. This run **is** the shared `draft` reused below. |
| **VR-NS** | `vada-reviewers` | review brief (`question` + `draft`) | The **conversational synthesis** — see below | 3 reviewers, no engine synthesis round. |
| **VR-S-same** | `vada-reviewers-synthesis` | review brief (`question` + `draft`) | Synthesizer's structured output | No override — the YAML's own `Synthesizer` default (`claude-sonnet-4-6`) already matches "primary AI's vendor's flagship" for a Claude primary. |
| **VR-S-cross** | `vada-reviewers-synthesis` | review brief (`question` + `draft`) | Synthesizer's structured output | Invocation-time `reviewerConfig: { Synthesizer: <model> }` override (`LangGraphAdapter.reviewerConfig`, zero YAML edits). Model chosen from primary's vendor: primary=Claude → `gpt-5`; primary=anything else → `claude-opus-4-7`. |
| **MW** | — (no YAML) | `question` | The historical Dani-collected response, when recorded | See "MW data path" below. |
| **FUSION-default** | `vada-fusion` | `question` | Raw response text (opaque `openrouter/fusion` route) | None — single agent, `defaults.model: openrouter/fusion`. |
| **FUSION-native** | `vada-fusion-native` | `question` | The battlefield map (`core_agreement` / `concessions` / `irreducible_conflict` / `risk_ranking`), post-audit | None. Four-agent attack-vector panel → synthesizer → BlindCritic+FactChecker audit, as declared in the YAML. |

**VR-NS's judged artifact — reconstructing "conversational synthesis."** `vada-reviewers.yaml` compiles to a review round only; it has no synthesis round (that is the point of VR-NS — it tests the *unsynthesized* default). But §5.2 defines VR-NS's artifact as "primary AI's draft + 3 reviewer responses + primary AI's **conversational synthesis**" — in production, that synthesis happens downstream in the calling AI's own conversation turn, outside anything the engine executes. The harness reconstructs this as one additional plain LLM call (same model as the primary, no engine/YAML/adapter change — the same pattern `scripts/bench/runner.ts` and `scripts/bench/judge-brokered.ts` already use for baseline/judge calls): given the question, the draft, and the three reviewer critiques, the primary model writes its final conversational answer. That text is VR-NS's judged artifact, and its tokens/cost/elapsed are folded into the row's totals alongside the review round's.

**MW data path.** No historical Dani-collected corpus has been transcribed into the repo yet. `apps/vada-ai/web/scripts/bench/mw-corpus.ts` defines the lookup table (`Record<corpusQuestionId, { response, source }>`), currently empty. When a question id has an entry, the harness records `terminalState: 'HISTORICAL'` and tags the row `mw-present`. When it doesn't — every question today — the harness still writes one `benchmark_runs` row (no LLM call, `terminalState: 'ABSENT'`, tagged `mw-absent`, `response` set to a fixed "no historical data" note) rather than skipping or erroring. This keeps MW's presence/absence visible in the same table T10/T12 read, instead of silently vanishing from the matrix.

**FUSION-default cost.** `openrouter/fusion` is an opaque multi-model route with no fixed per-token price; the harness records `costUsd: null` for this condition rather than fabricating a number (mirrors `@atta/adapter-langgraph`'s own "unknown model skips cost tracking" behavior for its internal, unexported pricing table).

**Key-gating.** FUSION-default requires `OPENROUTER_API_KEY`; missing it is a clean skip (no partial row), not a crash. VR-S-cross requires whichever cross-vendor key its synthesizer override needs (`OPENAI_API_KEY` when primary is Claude, `ANTHROPIC_API_KEY` otherwise) — same clean-skip behavior. VR-NS/VR-S-same tolerate individual reviewer vendors missing their key (existing adapter behavior: that reviewer's transcript entry carries an error, the run continues) since losing one of three reviewers doesn't invalidate the condition the way losing the sole synthesizer would.

---

## 7. Open questions for second-round reviewers

This section lists what remains uncertain after rev 2's revisions. Items that were open in rev 1 but are now resolved are listed below for transparency.

### 7.1 Resolved (no longer open)

By rev 2:
- **rev 1 §7.1 — Draft authored before vs inside team.** Locked: Option A (before invocation). All four reviewers explicitly endorsed.
- **rev 1 §7.5 — No internal synthesis as regression vs ask-llm.** Resolved by adding optional team-side synthesizer (§3.7). Default off, opt-in on.
- **rev 1 §7.3 — CLI fidelity claim.** Defused by inverting the order: API mode in v1, CLI mode in v1.5 conditional on benchmark. The fidelity claim becomes a v1.5 hypothesis to test, not a v1 assumption.

By rev 3:
- **rev 2 §7.6 — Synthesizer vendor binding default.** Resolved by combining all three reviewers' positions: same-vendor is the default (epistemic chain consistency), AND a cross-vendor condition (VR-S-cross) is added to the benchmark to empirically test whether the default should flip in v1.5. See §3.7 (rationale), §5.2 (sixth condition), §5.4 (success criteria), and the rev 3 revision note.

### 7.2 Should the team optionally enforce a structured output schema on reviewers?

Rev 1 argued against because "the brief is the contract." Reviewer feedback was split — some thought structure (severity, confidence, file:line) would force specificity; others agreed with the no-schema position.

The rev 2 compromise: still no enforced schema on reviewers in v1 (to preserve flexibility on what kind of question can be reviewed), but the brief-authoring guidance (§3.8) recommends *brief authors* to ask reviewers for structured output when the question class supports it (e.g., code review, spec validation). Reviewers respond in whatever format the brief asks for; the team doesn't second-guess.

**Still open:** if v1 benchmark shows reviewer responses are too unstructured to synthesize cleanly, an optional `enforce_schema: zod-schema` parameter could be added in v1.5. Worth flagging but not building yet.

### 7.3 Should reviewers have tool access mid-review?

~~Reviewers in v1 API mode have no tool access (no web search, no filesystem, no code execution). This is a known fidelity gap.~~

**Resolved (T3a + T3a follow-up, 2026-06-24):** `web_search` has been added to the Gemini, GPT, and Grok reviewer agents in both teams — `vada-reviewers.yaml` (T3a, PR #205) and `vada-reviewers-synthesis.yaml` (T3a follow-up). The Synthesizer agent (Claude/Anthropic) deliberately has no tools — it operates on reviewer transcripts only. Remaining fidelity gap: product harness system prompts and conversation memory (no change from before).

~~**Still open:** even in API mode, providers like Anthropic and OpenAI now support tool use via API. We could selectively grant web search to reviewers when the brief asks them to verify external claims. The cost is added latency and complexity; the benefit is closing part of the fidelity gap without committing to CLI mode.~~

~~The rev 2 position: don't add this to v1. Test API-no-tools first to establish a baseline. If the v1 benchmark shows reviewers are blocked by missing context (e.g., they can't verify a fact about a recent event), v1.5 adds web search as an opt-in reviewer tool.~~

### 7.4 The brief — primary AI vs user authorship

Rev 1 assumed the primary AI authors the brief. But the user can author it, modify it, or co-author it. The MCP tool already accepts `brief` as input — it doesn't care who authored it. The question is whether the spec should privilege one path.

The rev 2 position: leave authorship unspecified in v1. The MCP tool's input is `brief: string`. How that string was authored is up to the caller. The brief-authoring guide (§3.8) targets primary AIs as readers (because they typically author programmatically), but humans can use the same templates manually.

**Still open:** should the web UI's interface make brief authorship explicit? E.g., "Write your brief here, with help from these templates" vs "Let me draft a brief for you to review." Probably yes, but it's a UX question, not a spec-level decision.

### 7.5 Is "Vāda Reviewers" the right name?

Reviewer feedback was split. One reviewer said "Vāda Sounding Board" or "Vāda Council" (despite Karpathy overlap) better captures the broader use case. Another said "Vāda Reviewers" is fine but slightly narrow. None said the name was blocking.

The rev 2 position: keep "Vāda Reviewers" as the working name through v1. If the benchmark validates the design and the product moves toward external launch, run the naming question through Vāda Reviewers itself (deliberation eats its own dogfood) before locking.

**Still open until external launch.** For internal/development use, "Vāda Reviewers" is good enough.

### 7.6 ~~Synthesizer vendor binding default~~ — RESOLVED in rev 3

This was the only substantive open question DeepSeek's second-round review flagged. It is resolved as described in §7.1 above and the rev 3 revision note. Default same-vendor; benchmark tests both via VR-S-cross. Section retained for traceability.

### 7.7 New for rev 2 — Does the optional synthesizer eat the manual workflow's value?

The manual workflow's synthesis is done by Dani — a human with judgment, contextual memory, and the authority to call something settled. The optional team-side synthesizer is a structured artifact, not a Dani-equivalent. There's a real risk that ship users start treating the structured synthesis as the conclusion, when in reality it's just one input to the primary AI's conversational synthesis.

**Still open.** The MCP tool's documentation must be explicit: the structured synthesis is a *scaffold*, not a *conclusion*. The primary AI is still responsible for the final integration. UX and prompt engineering need to reinforce this.

If the v1 benchmark shows VR-S (with synthesis) is consistently better than VR-NS (without), the temptation will be to make synthesis default. We should resist that until we understand whether VR-S is better because *the synthesizer adds value* or because *primary AIs lean too heavily on its scaffolding*. These are different things and have different implications.

---

## 8. Decisions locked vs decisions deferred

To avoid ambiguity for implementers, here is what is decided in rev 4 versus what remains open.

**Locked (will be built this way unless final-pass reviewers strongly push back):**

- Vāda is the engine primitive; Vāda Teams is the product surface; Vāda Reviewers is the first team
- The Vāda Teams catalog has one team in v1, four candidates in v2, three candidates in v3 (§1.2)
- ask-llm, llm-council, and Anthropic's upstream code-review plugin tracked as living reference implementations; specific patterns copied with attribution (§1.1)
- Single team variant in v1 (no comparison mode, no specialization)
- Single round, no cross-ranking, no source verification in v1
- Vendor-agnostic on every seat
- **API mode for v1**, CLI mode deferred to v1.5 conditional on benchmark
- BYOK for the web UI; environment-variable keys for the MCP server
- Reviewers play a uniform role; diversity comes from vendor pool
- **Reviewer system prompt requires GROUNDED/INFERRED tagging** on every substantive point (rev 4, §4.1.1)
- **Synthesis is optional in v1.** Default off (primary AI synthesizes conversationally). Opt-in on (`return_synthesis: true`) runs an additional synthesizer agent producing structured output alongside raw responses
- **Synthesizer schema includes `verification` field** preserving GROUNDED/INFERRED per finding; synthesizer prompt instructs to weight grounded > inferred (rev 4, §3.7, §4.1.2)
- **Synthesizer defaults to same-vendor as primary AI** (rev 3). Cross-vendor tested as a benchmark condition; default may flip in v1.5 based on data
- **Synthesizer parsing has four-tier robustness** (fenced JSON → bare JSON → tolerant extract → regex section extraction with `degraded: true` flag) (rev 4, §4.1.2)
- Default reviewer pool: 3 reviewers, vendor-diverse, primary's vendor excluded
- **Brief-authoring documentation ships in v1.** Includes anatomy reference (§4.1.3), templates by question class, anti-patterns, DO-NOT-FLAG default list, and optional confidence calibration ladder for question classes that support it. Brief-authoring helper agent is v1.5
- Manual judging for v1 benchmark, not LLM-judge automation
- **Six benchmark conditions** (A0, A1, VR-NS, VR-S-same, VR-S-cross, MW-where-available)
- **Per-question-type breakdown required** in benchmark report, not just aggregate
- Dani reviews brief-authoring documentation before benchmark runs (rev 3)
- **CLI mode subprocess discipline (v1.5) has four mandatory mitigations** (mktemp -d, redirect-to-file, trap cleanup, wait per PID) — all required, not optional (rev 4, §3.5)
- Engine constraints: dynamic agent instances, per-vendor binding, conditional sequential node, failure surfacing, API-only execution path
- **Battlefield-map phantom-consensus guard (`vada-fusion-native`, Outside Read team; vada-production-v1 T8, Issue #183).** Analogue of the VR synthesizer's phantom-consensus detection above (§4.1.2): the `BattlefieldSynthesizer` must not manufacture agreement where the four-vector attack panel actually diverged. Prompt-level invariant, enforced in the `BattlefieldSynthesizer` system prompt in `vada-fusion-native.yaml` (not in the output schema — the schema is locked, this is a prompt-only guard): if `irreducible_conflict` is non-empty, `core_agreement` must be strictly weaker than the single strongest claim made by any one panelist. Concretely: two panelists reaching the same surface conclusion through incompatible reasoning (e.g., one via a hidden-assumption argument, another via a base-rate argument that contradicts the first reviewer's premise) is phantom consensus, not real consensus — the synthesizer must route the underlying disagreement into `irreducible_conflict` rather than folding it into a confident `core_agreement`. `BlindCritic`'s audit prompt independently checks this same invariant (does `core_agreement` match or exceed a single panelist's own strongest claim?) as a second, blind pass before the map reaches the caller.

**Deferred (open questions to be resolved during v1 implementation, by benchmark, or by future reviewers):**

- Optional structured-schema enforcement on reviewers (§7.2) — leaning no for v1, possible for v1.5
- ~~Reviewer tool access (§7.3) — leaning no for v1, web search possible in v1.5~~ **Resolved (T3a + T3a follow-up, 2026-06-24): web_search added to all non-Anthropic reviewers in both teams.**
- Brief authorship UX in the web UI (§7.4) — to be designed during UI implementation
- Final product name (§7.5) — "Vāda Reviewers" through v1, eat-our-own-dogfood naming review before external launch
- How to communicate that structured synthesis is scaffold, not conclusion (§7.7) — UX and prompt-engineering question
- Threshold values in success criteria (70%, 50%) — calibrate during first run
- Test corpus exact composition — to be assembled before benchmark

---

## 9. Implementation sequence

Approximate. Subject to engine team's actual constraints.

1. **Engine readiness check** (1 day). Verify the engine supports: dynamic agent instances, per-vendor API binding, conditional sequential nodes (for the optional synthesizer), failure surfacing without halt. The conditional sequential node is the most likely small extension required; the rest are believed to be supported.

2. **YAML schema finalization** (0.5 day). Lock the schema for `vada-reviewers-team.yaml`.

3. **Brief-authoring documentation** (2-3 days, parallelizable with engine work). Templates, anti-patterns, examples extracted from Dani's accumulated practice. Five components per brief (context, question, scope, DO-NOT-FLAG, constraints). Six to eight templates by question class. Five to ten anti-pattern examples.

4. **Dani reviews brief documentation** (0.5 day, sequential after step 3). Dani is the only person with full empirical context on what makes briefs work. He reviews the documentation for accuracy, completeness, and missing patterns. The benchmark test cases use briefs constructed from this documentation — if the documentation is off, the benchmark briefs are off, and the benchmark results are uninterpretable. This step gates the benchmark.

5. **MCP tool implementation** (1-2 days). The `vada_reviewers__consult` tool wraps the team's compiled Plan and exposes it to MCP clients. Includes optional synthesizer wiring. Pattern from existing Vāda MCP tools.

6. **Reviewer system prompt iteration** (1-2 days). Draft from §4.1.1, refine. Compare API responses on test briefs against the same briefs sent to chat products to surface what API mode loses.

7. **Synthesizer system prompt iteration** (1-2 days). Draft from §4.1.2, refine. Validate that structured JSON output is reliably produced (with the markdown-fence fallback). Test against representative reviewer-response inputs. Test both same-vendor and cross-vendor synthesizer bindings.

8. **First benchmark run** (2-3 days). Assemble test corpus. Run **six conditions per case** (A0, A1, VR-NS, VR-S-same, VR-S-cross, MW-where-available). Manual judging by Claude in fresh context, confirmed by Dani. Report includes both aggregate results and per-question-type breakdown (§5.4).

9. **Iterate or ship.** If criteria met (§5.4), document the v1 release. Decide which mode (VR-NS, VR-S-same, or VR-S-cross) becomes the recommended default — possibly per question type, not globally. Start v1.5 candidate selection — particularly the pre-v1.5 sanity check on CLI mode (§3.5). If criteria not met, follow the diagnosis priority in §5.4.

Total estimated time to v1 benchmark result: **9–13 days of focused work** (was 8–12 in rev 2; the half-day Dani-review and the extra benchmark condition each add ~half a day). Engine readiness must be confirmed early.

---

## 10. The honest meta-statement (rev 4)

This spec is an attempt to translate a workflow Dani has empirical confidence in into a product. The empirical confidence is real but informal — it's grounded in hundreds of past sessions with Dani as the synthesizer. The product is a bet that the workflow's value can be captured by an automated team, callable from any primary AI, with the primary AI (or optionally the team-side synthesizer) doing what Dani used to do.

The bet may be wrong. Specifically:

- **The chat-product harness may matter more than the underlying model.** CLI mode in v1.5 partially recovers this; API mode in v1 does not. The v1 benchmark surfaces whether this is a fatal gap.
- **The brief may be doing most of the cognitive lift.** v1 ships brief-authoring documentation; v1.5 may add a brief-authoring helper. If briefs are the bottleneck, the team's design is secondary.
- **Synthesis may be where the real intelligence lives.** The primary AI may not be a Dani-equivalent synthesizer. The optional team-side synthesizer (§3.7) is rev 2's hedge against this risk. The benchmark tests three modes (VR-NS, VR-S-same, VR-S-cross) to find out which carries the load and whether vendor binding for synthesis matters.
- **Multi-agent deliberation may not produce cognitive lift over single-shot at all.** This is Vāda's broader unresolved question. Vāda Reviewers v1 is *one specific instance* of multi-agent — vendor-diverse review with the empirical anchor of a validated manual workflow. If even this instance fails to beat A1, the broader Vāda thesis is in trouble.

If the first three are true but the fourth is not, Vāda Reviewers is a convenience layer that eliminates copy-paste friction. That's still a worthwhile product; it just doesn't validate the broader thesis. We'd ship it as the convenience layer it is and continue testing the thesis with v2 and v3 cognitive primitives.

If the fourth is true — if multi-agent doesn't lift — then Vāda's broader research direction is wrong, and we have learned something more important than any single product launch.

The benchmark will tell us. We design Vāda Reviewers honestly: faithful to the workflow, with explicit accounting of what's lost in automation, with the optional synthesizer hedging against synthesis variability, with API-first transport to validate cognitive design before transport choices, with brief-authoring guidance to avoid the "brief is magic but undocumented" trap. The benchmark is designed to surface gaps rather than hide them.

If the v1 result is "this is a convenience layer," we ship it as that. If it's "this reproduces the manual workflow's value," we ship it as that. If it's "this is worse than the manual workflow," we redesign rather than ship.

Either way, this is the first Vāda team. It has a shape. It's testable. We start here.

---

## 11. Outside Read — vada-fusion-native (V1 team addition)

**Spec:** `vada-fusion-native.yaml` in `packages/agents/vada-deliberation/yamls/`
**MCP tool:** `vada__consult` (spec_id: `vada-fusion-native`)
**Decision authority:** vada-rethink-v1-decision.md §4.1

### 11.1 — Flow architecture

Three phases, one YAML (engine shape: `rounds-audit`):

```
Attack-Vector Panel (4 agents, parallel isolation)
        ↓ all panel outputs
Battlefield Map Synthesis (BattlefieldSynthesizer, web-OFF)
        ↓ structured battlefield map
Map Audit (BlindCritic + FactChecker, max_revisions: 1)
        ↓ CLEAN or REVISED battlefield map
```

**Panel isolation invariant:** each panel agent's `message_template` is `{{question}}` only. Agents run sequentially (ordering edges from `rounds-audit` compiler) but receive no cross-output. The "parallel, no cross-talk" product guarantee is enforced at the template level.

**Web-off synthesis:** the BattlefieldSynthesizer has no tools. All freshness lives in the panel responses. The synthesizer combines; it does not search. Importing new data at synthesis would contaminate the map without panel attribution.

### 11.2 — Attack-vector roles (vendor-diverse)

| Role | Vendor | Attack vector |
|---|---|---|
| `AssumptionHunter` | Anthropic (claude-sonnet-4-6) | Load-bearing assumptions the user has not named |
| `BaseRate` | Google (gemini-2.5-pro) | Reference class and historical frequency |
| `FailureMode` | OpenAI (gpt-4o) | Failure modes the proposal has not addressed |
| `SecondOrder` | xAI (grok-3) | Downstream and second-order consequences |

All four roles have `tools: [web_search]` and `classifier.mode: skip` (single-shot advisory with always-on web access).

### 11.3 — Battlefield map output contract (locked)

```json
{
  "core_agreement": string,        // What every reviewer converged on
  "concessions": string[],         // Positions weakened by the panel's combined attack
  "irreducible_conflict": string,  // Unresolved core — what remains contested after the panel
  "risk_ranking": string | null    // Single most load-bearing risk; null when no clear winner
}
```

The `irreducible_conflict` field is non-optional and non-skippable. It is what makes the map honest — it names what the panel could NOT resolve, not just what it agreed on.

### 11.4 — Audit non-negotiable (MOAT-A)

Model-written synthesis is the highest verdict-smuggling surface. Two auditors run before the map reaches the caller:

| Auditor | Tools | Audit type |
|---|---|---|
| `BlindCritic` | None | Logical/structural: internal consistency, phantom consensus, unsupported leaps |
| `FactChecker` | `web_search, web_fetch` | Factual: verifiable claims, base rate accuracy, cited precedents |

If either auditor writes `FLAG`, the synthesizer is prompted to revise (max 1 revision). Terminal states `CLEAN` and `REVISED` are both valid delivery states.

### 11.5 — Three presets (prompt-only; same routing flow)

| Preset | How to invoke |
|---|---|
| `find-blind-spots` | Frame question: "Here is my thinking about X. What load-bearing assumptions am I missing?" |
| `critique-draft` | Frame question: "Here is my draft proposal for X. What are its structural or factual weaknesses?" |
| `pre-mortem` | Frame question: "Assume this plan for X failed in 12 months. Reconstruct the failure." |

The YAML handles all three framings. The preset is caller-level context, not a separate `spec_id`. Agent prompts are written to respond to any of the three framings via their attack-vector lens.

### 11.6 — MCP response shape (vada__consult with vada-fusion-native)

```json
{
  "responses": [
    { "reviewer": "AssumptionHunter", "response": "..." },
    { "reviewer": "BaseRate", "response": "..." },
    { "reviewer": "FailureMode", "response": "..." },
    { "reviewer": "SecondOrder", "response": "..." },
    { "reviewer": "BattlefieldSynthesizer", "response": "..." },
    { "reviewer": "BlindCritic", "response": "CLEAR ..." },
    { "reviewer": "FactChecker", "response": "CLEAR ..." }
  ],
  "structured": {
    "core_agreement": "...",
    "concessions": ["...", "..."],
    "irreducible_conflict": "...",
    "risk_ranking": "..."
  },
  "terminal_state": "CLEAN",
  "session_id": "...",
  "session_url": "https://vada.attalabs.dev/sessions/...",
  "cost_breakdown": { ... }
}
```

The `structured` field contains the parsed battlefield map JSON. The `terminal_state` is `CLEAN` (audit passed first attempt) or `REVISED` (synthesizer revised after audit FLAG). Both are valid delivery states.

