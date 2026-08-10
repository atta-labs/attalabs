# Vāda — rethink: positioning, teams, model sources, frontier findings

**Status:** draft · positioning / research backlog (out of the AEG flow; not a ratified spec)
**Date:** June 28, 2026
**Context:** Captured mid-way through `vada-production-v1` while finishing the deliberate page work. Nothing here blocks that work — these decisions ride on top, post-merge.

---

## §0 — Why this doc exists

On June 28, mid-way through the `vada-production-v1` deliberate-page work, the Principal surfaced that Vāda's named "Council" team doesn't match what it does, which opened a full reconsideration of Vāda's positioning, team taxonomy, model sources, and competitive landscape. This doc captures that thinking before it's lost.

It is a positioning/research backlog, not a task backlog. Nothing here blocks the deliberate-page work — that work ships the deliberate view + four working teams; these decisions ride on top, post-merge.

---

## §1 — Vāda's reason for existence (the real user workflow)

Vāda comes from a recurring real-life pain: during a deep conversation with a primary AI (e.g. claude.ai), at the moment of drawing conclusions, the user realizes they can't fully trust the single LLM they're talking to — they suspect it needs outside help.

Today the user manually:

- (a) asks the primary AI to author a brief for other LLMs,
- (b) pastes it into Gemini/Grok/others,
- (c) copies those answers back,
- (d) brings them to the primary AI to resolve.

The pain is the manual copy-paste courier round-trip, not "I want three essays." **Vāda exists to kill that round-trip.**

**Map of the loop vs. what's built:**

| Step | Where it happens | What's built |
|---|---|---|
| Deep chat | Outside Vāda | — |
| Doubt ("can't fully trust this") | No trigger exists | — |
| Author brief | Manual, AI helps | — |
| Send to N models | Manual paste | **Council does the fan-out** |
| Bring answers back | Manual paste — the worst step | — |
| Resolve in primary chat | Outside Vāda | — |

Council nailed only the middle (fan-out); the two steps that actually cost the user — getting the brief out and the answers back — are exactly what's missing.

---

## §2 — The Council naming ↔ intention gap (B-1)

"Council" promises intention — a body that convenes to do something (decide, advise, judge), where members hear and respond to each other. Vāda's Council has none of that: three models answer the same prompt in separate rooms, never see each other, never respond — it's intention-less parallel fan-out.

The honest mechanism name is "Parallel" / "Contextless Parallel." But **renaming to the honest-but-empty mechanism is the wrong fix**; the right fix is to give the mechanism an intention and name that.

**Two-axis framing (core insight):**

**Mechanism** (independent/parallel — they don't see each other ↔ interactive/sequential — they read and respond) × **Intention** (answer a question · give an opinion on a draft · critique/stress-test · vote/decide · surface what's unique).

The current picker mixes the axes:

- **Reviewers** = critique-a-draft (intention) done in parallel (mechanism)
- **Council** = answer-a-question (intention) done in parallel (mechanism) — same mechanism, different intention.

"Council / Reviewers / Sparring" are intentions; "Parallel / rounds" are mechanisms. **Users pick a goal, not a topology.**

**Open decision** (route through the vendor-diverse panel): rename to honest mechanism vs. give it a real intention.

---

## §3 — Council is correct not to deliberate, given the loop

In the real workflow, the outside models should give independent, uncontaminated reads so the user carries them back to the primary AI, where the real deliberation happens (user + primary partner + outside evidence).

A built-in synthesizer reintroduces the exact problem Vāda exists to escape — trusting a new single LLM's judgment at the moment of doubt.

So for the core use case: **Council plain, no synthesizer**; the synthesizer is a feature for users who lack a primary AI to resolve with. The independence is the feature, not a flaw.

This resolves the ChatGPT critique (below): "make Council debate" is asking Council to be Reviewers — a category error ChatGPT itself walked back once told there's no context/roles.

---

## §4 — The MCP round-trip is Vāda's true center of gravity (B-2)

The defensible product is **not** the standalone "3 models in columns" web app (commoditizing in real time — Grok "Heavy," OpenRouter Fusion, OpenRouter multi-model).

The defensible product is **the protocol-level second-opinion layer the user's primary AI calls mid-conversation**: via the Vāda MCP server (already hosted), the primary AI hands Vāda the brief it just helped write, Vāda polls the council, answers return inline to the primary chat — **no copy-paste either direction**.

This makes Council's independence **correct-by-construction** (synthesis happens at home). Standalone web = showroom/config; product = the MCP loop.

The moat is four things, not the fan-out:

1. **Provenance / auditability**
2. **Phantom-consensus guard**
3. **Provider flexibility** (any vendor, BYOK)
4. **Workflow integration** (brief-out / opinions-back wired into the primary AI)

**Honest self-critique to record:** this session polished the least defensible surface (web Council) while the most defensible (MCP loop) is comparatively under-built.

The rethink is "re-point center of gravity at MCP; rename teams by intention; stop polishing the showroom" — **NOT** "throw away the build" (engine, adapter, teams, MCP, AEG are real).

---

## §5 — Frontier UI findings, June 28 (B-3)

Direct observations from screenshots of four frontier chat apps:

- **DeepSeek:** mode pills **Instant / Expert / Vision**; per-message toggles **DeepThink** and **Search**.
- **Claude:** model tier (**Opus 4.8** "for complex tasks" / **Sonnet 4.6** "most efficient everyday" / **Haiku 4.5** "fastest"; **Fable 5** shown "currently unavailable") × **Effort** (Low / Medium / High [default] / Extra / Max) × **Thinking** toggle; `/` for **Skills**.
- **Gemini:** tier (**3.1 Flash-Lite** "fastest" / **3.5 Flash** "all-around" / **3.1 Pro** "advanced maths & code") × **Thinking level** (**Standard** "best for most" / **Extended** "complex problem solving").
- **Grok:** **Fast** / **Auto** ("chooses Fast or Expert") / **Expert** ("thinks hard") / **Heavy** ("Team of Experts"); SuperGrok upsell; Custom Instructions.

**Cross-cutting finding (the important one):**

Every frontier product collapsed the choice into **effort/depth on a (mostly) single model**. Multi-model-as-a-team appears exactly once — **Grok "Heavy"** — and is named by **outcome** ("Team of Experts"), never by mechanism. None expose "parallel vs sequential." None say "council."

**Lesson: name what the user gets (the outcome/effort), never how it's wired.** Grok "Heavy" is the closest competitor to Vāda's idea and the one to study.

---

## §6 — Competitive: Fusion (B-4)

Next in the iteration roadmap (from LangGraph). Fusion validates the panel-plus-judge shape (= Reviewers + Synthesis).

**Claimed Vāda differentiation vs Fusion:** provenance tagging, phantom-consensus guard, provider flexibility, auditable record, plus the MCP-into-primary-AI loop.

**Research to do:** pin down exactly what "Fusion" is (LangGraph multi-agent fusion vs OpenRouter Fusion — disambiguate), how it routes and judges, what it lacks vs Vāda; then position Vāda explicitly against it.

> *(Note: not yet web-verified — research-pass item.)*

---

## §7 — Model-source & ecosystem research: NVIDIA NIM + Hugging Face (B-5)

**NVIDIA `build.nvidia.com/models` (NIM hosted catalog):** evaluate as an additional vendor/model source for council slots — any unique models worth adding to `packages/models/src/vendors.ts`? Priority: lower ("evaluate as vendor").

**Hugging Face — three candidate relationships for AttaLabs:**

1. **Model source** — HF Inference / Inference Endpoints / open-weight models (Llama, Qwen, DeepSeek) → more diverse council slots, which directly amplifies Vāda's core value since vendor diversity IS the product.
2. **Distribution** — publish the Vāda MCP server / an AEG Space for reach + credibility.
3. **Community / credibility surface.**

**Starting position to test:** HF primarily as model source (high value), secondarily distribution; NVIDIA lower priority.

> **Caveat to record in the doc:** these NVIDIA/HF notes are from training knowledge, **NOT** live-fetched — the live catalogs and offerings must be verified in the research pass.

---

## §8 — Strategic guardrails (B-6)

Multi-agent consumer-priced chat is structurally unviable; correct business shapes are **BYOK + flat fee**, **MCP distribution**, **B2B / enterprise**.

Keep center of gravity on **MCP + the four differentiators** (provenance, phantom-consensus guard, provider flexibility, auditable record). Don't out-polish the commodity surface.

**Anthropic Consumer ToS** prohibits using subscription OAuth tokens in third-party hosted products (subscription arbitrage = ToS violation for hosted SaaS) — relevant to any BYOK/hosting decision.

---

## §9 — The research is a panel decision, not solo

This taxonomy / positioning / naming call goes through the **vendor-diverse reviewer panel** (Gemini, Grok, DeepSeek, ChatGPT) + a live web pass, exactly as prior positioning calls (e.g. v2 brand architecture).

**Questions to resolve, in order:**

1. What intentions does Vāda actually serve (likely two: "independent opinions on a question" + "critique of a draft", mechanism hidden);
2. Does the synthesizer belong given the resolve-at-home loop;
3. What Fusion is and the real differentiation;
4. NVIDIA NIM + HF — model source / distribution / both / neither;
5. Naming, derived from (1) + the frontier "name by outcome" finding.

**Guardrail:** not a Sunday-morning solo rename — **panel + a night**.
