# Atta — Market Research

Status: draft

**Date:** May 3, 2026
**Status:** Snapshot of the competitive landscape across four rounds of research and review. Use this when returning to think about competition, when sequencing features, or when pitching what makes Atta different.

This document is research, not strategy. For strategy and positioning conclusions, see `atta-ecosystem-vision.md`. For sequencing implications, see `atta-build-strategy.md`.

---

## How to read this document

Atta competes — or appears to compete — with products across five distinct categories. Each category is filling at a different rate. Each contains different threat profiles. The mistake is treating all of them as competitors. Most are not.

The categories:

1. **Multi-model workspaces** — closest competitors, end-user products
2. **Aggregators** — baseline UX, not moat competition
3. **Memory infrastructure** — primitives Atta could use, not products to compete with
4. **Knowledge & thinking environments** — adjacent cognition tools, partial overlap
5. **Provider products** — structurally constrained, mostly not competition

After categorizing the products, the document closes with the competitive matrix produced by round 2 and refined in rounds 3-4, and the threat assessment from round 4.

---

## Category 1 — Multi-model workspaces (closest competitors)

These are the products users would compare directly to Atta. Closest in shape, audience, and ambition.

### Jenova

**Link:** [jenova.ai](https://www.jenova.ai)
**Status:** Live, polished
**What it does:** Multi-model chat (GPT-5.2, Claude Opus 4.5, Gemini 3 Pro, Grok 4.1) with persistent memory and MCP tool integration. Specialized agents for domain-specific work.
**vs Atta:** Closest existing product to Vitakka's surface shape. Has the multi-model and persistent memory columns. Missing structured deliberation, missing cross-AI portable memory, missing focus containers with hard scoping. Their DNA is "power user chat" — unlikely to pivot to adversarial deliberation because that adds friction, and their users want speed.
**Threat profile:** Medium. UX parity on multi-model workspaces is closing, but the deliberation gap is substantial.

### Halomate

**Link:** [halomate.com](https://halomate.com)
**Status:** Live, iOS-first
**What it does:** Multi-model chat (GPT, Claude, Gemini, Grok, DeepSeek) with "Mates" — persistent agents you build per project with persona, role, and independent memory. AutoPilot for autonomous multi-source research.
**vs Atta:** The Mate-per-project pattern is the closest existing analog to focus containers. Each Mate has its own memory. Multi-model selection mid-conversation. Missing structured deliberation, missing cross-AI portability, missing hard memory scoping (Mates share global memory).
**Threat profile:** Medium. Closer to focus container thinking than Jenova, but also single-app locked.

### Mimesys

**Link:** [mimesys.ai](https://mimesys.ai)
**Status:** Research-shaped product
**What it does:** Shared memory log across models. Any model in one conversation can read what the others wrote. Switch models mid-thread without losing context.
**vs Atta:** Philosophically closest match to Atta's neutrality thesis. The only end-user product that does cross-AI shared memory. But: no focus containers, no structured deliberation (only the *shared memory* primitive), no end-to-end product polish. Their thesis is *purer* than Atta's on one dimension; Atta's thesis is broader.
**Threat profile:** Medium-high. If Mimesys hires product talent and adds structured deliberation + focus containers, they have Atta's thesis in a simpler package. Watch for Series A or product hires.
**Architecture note:** Their shared-history-log pattern (immutable log with per-record provider/model metadata) is described in plain English in [Eric Hestenes's Medium post](https://medium.com/@erichestenes/ai-collaboration-through-shared-memory-fc069ba7d854). Trivially copyable on Atta's existing LangGraph adapter.

---

## Category 2 — Aggregators (baseline UX)

These are price-arbitrage plays. Their value is "one subscription instead of four." They define the workspace UX baseline Atta has to beat, but they don't compete on the moat columns (deliberation, focus, portability, provenance).

### Aymo AI (formerly Geeky.chat)

**Link:** [aymo.ai](https://aymo.ai)
**What:** 45+ models in one workspace. File upload, BYOK, integrations with Notion/Drive/Slack.

### AiZolo

**Link:** [aizolo.com](https://aizolo.com)
**What:** Multi-model chat, simultaneous comparison, prompt library, persistent AI memory, multimedia generation. Around $9.90/month replacing $80-110/month in separate provider subscriptions.

### MagAI

**Link:** [magai.co](https://magai.co)
**What:** 50+ LLMs in a single platform. Mid-conversation model switching. Custom personas.

### Poe (by Quora)

**Link:** [poe.com](https://poe.com)
**What:** Multi-model platform. Solid for casual exploration. Lacks side-by-side comparison, prompt manager, multimedia generation.

### TypingMind

**Link:** [typingmind.com](https://typingmind.com)
**What:** BYOK frontend for any provider. Developer-friendly. One-time purchase. No bundled subscriptions.

### Monica AI

**What:** All-in-one AI assistant with browser extension and desktop/mobile apps.

**Aggregator threat profile:** Low for moat columns. High for normalizing model fluidity culturally — they teach users that "models are interchangeable," which is helpful for Atta's eventual positioning. Atta has to beat them on workspace UX baseline (multi-model, basic persistence). They don't define the category.

---

## Category 3 — Memory infrastructure (primitives, not products)

These are developer tools for AI memory. Sati's eventual implementation will likely build on or learn from one of these. **None of them are direct competition for Sati as a user-facing product** — they're infrastructure. But they could become competition if any pivots to consumer.

### Mem0

**Link:** [github.com/mem0ai/mem0](https://github.com/mem0ai/mem0)
**License:** Apache 2.0
**What:** Universal memory layer for AI agents. Mature, benchmarked. LoCoMo 91.6, LongMemEval 93.4, BEAM 64.1 at 1M tokens. 21 framework integrations.
**Relevance:** Read this code before writing Sati. Their changelog (async by default, rerankers, hybrid search) encodes lessons Atta would otherwise rediscover.
**Threat:** Low if they stay infrastructure. Medium if they ship a consumer product layer.

### MemOS

**Link:** [github.com/MemTensor/MemOS](https://github.com/MemTensor/MemOS)
**License:** Open source (check current)
**What:** Memory OS for LLMs and agents. Skill memory, multi-agent memory sharing, OpenClaw plugins (cloud and local). 100% on-device option with SQLite + FTS5 + vector.
**Relevance:** Different thesis from Mem0 — "OS for memory" framing. Worth studying for the multi-agent sharing patterns Cetana might need.

### MemPalace

**Link:** [github.com/mempalace/mempalace](https://github.com/mempalace/mempalace)
**License:** Open source
**What:** Local-first AI memory. Verbatim storage, pluggable backend. 96.6% R@5 raw on LongMemEval (best-in-class). Structured index — people/projects become "wings," topics become "rooms."
**Relevance:** Interesting alternative thesis (don't summarize, just index well). Worth comparing to Mem0's extraction approach before locking Sati's architecture.

### MemWire

**Link:** [github.com/memoryoss/memwire](https://github.com/memoryoss/memwire)
**License:** Open source
**What:** Self-hosted graph memory with auditable facts, decay, multi-tenant. Bring-your-own-DB (Postgres, Qdrant, Pinecone, Chroma, Weaviate). Bring-your-own-LLM.
**Relevance:** Closest to Atta's "user-owned, self-hostable" ethos. Auditable facts + decay is a genuinely interesting pattern.

### OpenMemory

**Link:** [github.com/CaviraOSS/OpenMemory](https://github.com/CaviraOSS/OpenMemory)
**What:** Cognitive memory engine for LLMs and agents. Plugs into Claude Desktop, GitHub Copilot, Codex.
**Relevance:** Direct integration with Claude Desktop is interesting — could plug into Vāda's MCP layer.

### Mimir

**Link:** [github.com/orneryd/Mimir](https://orneryd.github.io/Mimir/)
**License:** MIT
**What:** Graph-powered memory + multi-agent orchestration. PM/Worker/QC patterns built in. Direct integration with Claude, ChatGPT, MCP.
**Relevance:** Closest to Sati + Cetana combined. MIT licensed — you could fork it. Worth serious study.

### Honcho

**Link:** [github.com/plastic-labs/honcho](https://github.com/plastic-labs/honcho)
**What:** User-modeling-as-a-service for AI agents. Dialectic user models.
**Relevance:** Sati's "evolving thinking patterns" overlaps Honcho's territory. Hermes Agent already uses it, signaling production maturity.

---

## Category 4 — Knowledge & thinking environments (adjacent cognition tools)

This category surfaced in round 2 and 3 reviews. These products own *cognition behaviors* (sustained thinking, knowledge graphs, focuses) without being AI-native. They are adjacent to Atta in user behavior more than in features.

### Heptabase

**Link:** [heptabase.com](https://heptabase.com)
**What:** Spatial whiteboard + cards + journal. Visual learning. Card is literally a focus container with tagged memory.
**vs Atta:** Their focus container UX is the benchmark. Missing multi-model and structured deliberation. If Heptabase adds AI model routing, they're a direct threat on the focus dimension.
**Threat profile:** Medium. Adjacent enough to matter. Their UX for compounding thinking is *better than Notion's*.

### Obsidian + AI plugins

**Link:** [obsidian.md](https://obsidian.md)
**What:** Local-first PKM. Graph memory. Multi-model via plugins. Plugin ecosystem is open.
**vs Atta:** The threat is not Obsidian the company — it's that the primitives are open and composable. Structured deliberation could appear as a community plugin before Atta ships. Local-first ethos matches Atta's data-sovereignty leanings.
**Threat profile:** Low-medium. The plugin ecosystem is the watch indicator.

### Roam Research, Tana, Logseq, Reflect, Capacities

These trained users into networked thinking, graph cognition, persistent context. They're adjacent because they own the user behavior Atta wants. Most lack first-class AI; the ones adding it (Tana especially) are worth tracking.

### Notion AI

**Link:** [notion.so](https://www.notion.so)
**What:** Workspace + AI. Custom Agents (Feb 2026 update) with explicit model selection per task. Persistent pages, knowledge graphs, collaborative cognition.
**vs Atta:** The most dangerous product in the matrix. Already owns persistent workspaces, focus containers (in the organizational sense), trust at scale, distribution to 300M+ users. If they ship a "Debate" or "Council" block type with structured outputs, three columns close in 2-3 quarters of engineering.
**Threat profile:** High, but slow. Notion moves slowly on AI-native features. The leading indicator is Notion's MCP integration: if they allow plugging in a "Deliberation Agent" via MCP, the technical reason for Atta's neutrality narrows.
**Specific feared move (from round 4):** User types claim → Cmd+/ "Debate" → two-panel block → left: Claude arguing for, right: GPT arguing against → synthesis field below → page is the focus container → global search retrieves past debates. 2-3 quarters for them. The defense: Atta must have typed conclusions with provenance shipped *before* Notion ships this.

---

## Category 5 — Provider products (structurally constrained)

The major model providers all have project/memory products. Their inclusion in the matrix reveals why they're mostly *not* competition: they cannot be neutral.

### Claude Projects (Anthropic)

**What:** Project-scoped context, persistent within Anthropic's ecosystem. Single-provider.
**vs Atta:** Multi-model = no (Anthropic only). Cross-AI portable = no. Focus containers = partial (project-scoped but not hard isolated). Persistent memory = yes within Anthropic.
**Threat profile:** **Highest among providers**, but only if Anthropic pivots. Round 4 reviewers flagged Anthropic as the most likely provider to ship adjacent because: MCP is theirs, Claude is positioned as the thoughtful AI, philosophically aligned with reflective workflows. Specific threat: Adversarial Mode in Claude Projects allowing pipe-in of Gemini/GPT API keys for red-teaming.
**Watch indicators (monthly check):** Anthropic job postings for "AI collaboration" or "workspace experiences." MCP ecosystem growth around Claude Desktop. Public statements about "long-running cognitive workflows" or "persistent projects." If any of these light up, the timeline shortens.

### OpenAI Projects (ChatGPT)

**What:** Project-scoped context. Single-provider.
**vs Atta:** Same shape as Claude Projects. Multi-model = no. Cross-AI portable = no.
**Threat profile:** Medium. ChatGPT has the largest user base and could ship "Project Memory with cross-session continuity" that captures 80% of casual users. The wedge user (founder making high-stakes decisions) might still want neutrality and provenance. But the market becomes "OpenAI for most thinking, Atta for high-stakes decisions."

### Gemini Gems (Google)

**What:** Persona-based project cognition.
**vs Atta:** Single-provider. Threat profile similar to OpenAI but with weaker ecosystem traction.

### Why providers are structurally constrained

This argument does not rest on "providers are unwilling." It rests on incentive alignment:

- **Engagement, retention, model centrality** — what providers optimize for
- **Epistemic quality, portability, model pluralism, continuity** — what Atta optimizes for

These are not the same. A provider shipping cross-AI memory enables users to leave them. A provider shipping adversarial deliberation requires admitting their model is sometimes wrong. They *can* build these products. They have to fight their business model to do so.

This is a watch-not-worry observation, not a threat to obsess over. The framing was sharpened in round 4: trivial version is "any incumbent could win" (low signal). Useful version is "Anthropic specifically is the most likely, here are the indicators."

---

## Adjacent: Agent runtimes and developer tools

These are not Atta competitors but show up in the landscape and are worth knowing.

### Hermes Agent (Nous Research)

**Link:** [hermes-agent.nousresearch.com](https://hermes-agent.nousresearch.com/docs)
**What:** Self-improving CLI agent. Skills, persistent memory, multi-channel (Telegram, Discord, Slack, etc.). Runs on $5 VPS or Modal serverless. MIT-licensed.
**vs Atta:** Different category. Hermes is for *delegated execution* (agent runs continuously, executes tasks). Atta is for *thinking*. Hermes could be a Cetana executor. Not competition.

### MindStudio

**Link:** [mindstudio.ai](https://www.mindstudio.ai)
**What:** Visual builder for multi-agent workflows. Different model per agent. Pass-through model pricing.
**vs Atta:** Developer tool, not end-user product. Same primitives as Vāda but different audience.

### Multi-agent frameworks

**LangChain, AutoGen (Microsoft), CrewAI, CAMEL** — all have multi-agent debate primitives. They're frameworks, not products. The threat is not the frameworks themselves but that anyone could build a Vāda-shaped product on top of them in 3-4 months.

---

## The capability matrix (round 2, refined rounds 3-4)

Legend: ✓ = yes · ◐ = partial · — = no · OS = open source

| Product | Multi-model | Persistent memory | Cross-AI portable | Deliberation w/ typed conclusions | Provenance | Cognitive continuity | Focus containers (hard scoping) | OS |
|---|---|---|---|---|---|---|---|---|
| **Atta (target)** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Jenova | ✓ | ✓ | — | — | — | ◐ | ◐ | — |
| Halomate | ✓ | ✓ | — | — | — | ◐ | ◐ | — |
| Mimesys | ✓ | ✓ | ◐ | ◐ | ◐ | — | — | — |
| Notion AI | ✓ (Custom Agents Feb 2026) | ✓ | — | — | ◐ (page history) | ◐ | ◐ | — |
| Heptabase | — | ✓ | — | — | — | ✓ | ✓ | — |
| Obsidian + AI | ◐ (via plugins) | ✓ | ◐ (local files) | — | — | ◐ | ◐ | partial |
| Aggregators (Aymo, AiZolo, Poe) | ✓ | ◐ | — | — | — | — | — | — |
| Claude Projects | — (Anthropic only) | ✓ | — | — | — | ◐ | ◐ | — |
| OpenAI Projects | — (OpenAI only) | ✓ | — | — | — | ◐ | ◐ | — |
| Gemini Gems | — (Google only) | ✓ | — | — | — | ◐ | ◐ | — |
| Mem0 | — (infra) | ✓ | ✓ | — | ◐ | ◐ | — | ✓ |
| MemOS | — (infra) | ✓ | ✓ | — | ◐ | ◐ | — | ✓ |
| MemPalace | — (infra) | ✓ | ✓ | — | ◐ | ◐ | — | ✓ |
| MemWire | — (infra) | ✓ | ✓ | — | ✓ (auditable) | ◐ | — | ✓ |
| Mimir | — (infra) | ✓ | ✓ | ◐ (PM/QC patterns) | ◐ | ◐ | — | ✓ (MIT) |
| Hermes Agent | ✓ | ✓ | — | — | — | ◐ | — | ✓ |

### Where Atta is uniquely "yes"

**Three columns where Atta is alone:**
1. **Deliberation with typed conclusions** — adversarial multi-agent debate that produces structured artifacts, not prose
2. **Provenance** — traceable lineage of which model said what, what objections existed, what changed
3. **Focus containers with hard memory scoping** — facts from Focus A do not leak to Focus B (no product currently delivers this)

These are the three durable differentiators inside the product. They might not all be marketing surface (the father doesn't care about provenance), but they're what makes the product behave better than ChatGPT.

---

## Threat assessment (round 4 conclusion)

### Highest priority threats

**1. Notion (high, slow).** Already owns containers and distribution. If they ship Debate block + multi-model routing + structured outputs, three matrix columns close. Watch their MCP integration roadmap and any AI-native feature signals beyond writing assistance.

**2. Anthropic (high, uncertain timeline).** Most likely provider to ship adjacent. Philosophically aligned. MCP is theirs. The defense argument relies on structural conflict-of-interest — which holds today but not forever. Watch Claude Projects evolution, especially toward cross-model orchestration or persistent reasoning.

**3. Stealth startups / Mimesys / well-funded neutral builders.** A team raising $20M+ on "thinking workspace" or "compound cognition" is a real risk. The defense is execution speed and product taste. The category was empty 18 months ago; it's filling.

### Lower priority but watch

**4. Aggregators (low threat, high category-shaping).** They normalize model fluidity culturally, which helps Atta. Don't compete with them on price.

**5. Infrastructure pivots (Mem0, Mimir).** Low today. Higher if they ship consumer products.

### Threats Atta should not worry about

**Hermes Agent / agent runtimes** — different category.
**Aggregators on the moat columns** — they don't compete here.
**Provider products as currently shipped** — single-provider, structurally constrained.
**Frontier model capability gaps** — Atta is not trying to beat the next ChatGPT. That's not the bet.

### The single move that would invalidate Atta

Three reviewers in round 4 named the same scenario: **a major player shipping a clean "thinking mode" with external model calls + MCPs + lightweight memory + invisible deliberation**. The specific implementation could come from Notion (Debate block), Anthropic (Adversarial Mode in Projects), or a stealth competitor. The leading indicator is any product announcement using terms like "adversarial reasoning," "council mode," "deliberation," or "structured disagreement" as core features.

If this happens before Atta ships its full composition, the differentiation collapses. The defense is **shipping the composition first**, not perfecting it in isolation.

---

## Conclusions for next time you return to this

When you come back to this document — months from now, after Vāda has shipped publicly, maybe after Vitakka V1 — these are the things to check:

**Did Notion ship a Debate block or anything similar?** If yes, your differentiation timeline shortened.

**Did Anthropic ship cross-model orchestration in Claude Projects?** If yes, the structural conflict-of-interest argument weakens. Reassess the threat model.

**Did Mimesys raise a Series A or hire product leadership?** If yes, they may be productizing seriously. Watch their roadmap.

**Did any aggregator ship structured deliberation?** If yes, the category is filling faster than expected. Check whether they did it well or theatrically.

**Did a stealth startup launch with "thin thinking layer" or "compound cognition" framing?** If yes, the category is being claimed. Move faster.

**Did Mem0 or Mimir ship a consumer product?** If yes, the infrastructure-vs-product line you assumed isn't holding.

If most of these happened, the strategy may need revision. If none did, the runway is real and the bet still holds.

---

## Related documents

- `atta-ecosystem-vision.md` — strategic positioning derived from this research
- `atta-build-strategy.md` — how the sequencing accounts for these competitive threats
- `vitakka-human.md` — the substantial middle layer that holds many of the "Atta uniquely yes" columns
