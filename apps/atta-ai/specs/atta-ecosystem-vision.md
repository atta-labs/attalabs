# Atta Ecosystem — Vision

**Last updated:** May 3, 2026 (post round-4 deliberation)
**Status:** Strategic direction document. Not a build specification. The canonical ecosystem vision.

This document supersedes prior versions. It incorporates the corrections produced by four rounds of multi-agent deliberation between Principal (Dani), Critic (Claude), and four reviewer agents (Gemini, Grok, DeepSeek, ChatGPT) conducted May 3, 2026.

---

## What Atta is

Atta is an ecosystem of AI products built around a single conviction: **your thinking should compound across every AI you use, every focus you work on, and every session you have. It should not be locked inside any single provider's interface.**

The name comes from the Pāli word for *self*. Products in the ecosystem carry names from the same Buddhist cognitive psychology tradition — each describing precisely what it does.

Atta is not a product. It is the house. The products live inside it.

### The category insight

The strongest sentence produced across four rounds of strategic review was this:

> *"Centralisation of thinking, not centralisation of work."*

That sentence is the category. Atta is not a workspace (that's Notion). Atta is not an executor (that's Claude Code, Cursor, Hermes Agent). Atta is not an aggregator (that's Aymo, AiZolo, Poe). Atta is the layer where your *thinking* lives — across all the tools where your *work* happens.

Think here. Work anywhere.

### The two-layer brand architecture

- **Atta** = the ecosystem (parent organization, monorepo, code namespace `@atta/*`)
- **AttaLabs** = the lab where Atta builds publicly. Permanent home at `attalabs.dev`. This is where Vāda lives now, where Vitakka and other components ship as they're released, where friends try things, where research and experimentation happen.
- **The final product** = lives at its own home (`atta.ai` if available, or `atalabs.app`, or another consumer-grade domain). Separate from the lab.

This is a sharper distinction than earlier framings. AttaLabs is not the product. AttaLabs is the *lab* that ships components publicly. The polished consumer product gets its own home, with its own name discipline.

### The naming rule

Pāli name = built by Atta.
No Pāli name = it plugs in.

Herald is the example: English name, plugs in via MCP, not part of the core ecosystem.

---

## The current product set

Four core products. One pluggable tool. Each is independent — but built to compose.

The composition is the moat. **Coherent longitudinal cognition** — deliberation, memory, focus, provenance, synthesis reinforcing each other over time — is what no single product alone provides. Atomic features are copyable. Cognition that compounds across weeks and months is not.

### Vāda — Episodic Cognition

**Pāli: debate, discourse.**
**Status: V1 in active development. Multi-vendor adapter shipped. Vāda Reviewers v1 merged May 1.**
**Public surface: `vada.attalabs.dev`.**

Vāda is the deliberation primitive. Bring a question, get structured adversarial debate from multiple agents, receive a typed conclusion (recommendation, key_condition, unresolved_points, participants).

Vāda alone is not a product for end users. It is an engine. Its public surface today is the MCP server — Claude Desktop, Cursor, and any MCP-compatible host can call Vāda via `vada__consult` with a YAML team specification.

**Vāda is replicable as a primitive.** Multi-agent debate is afternoon work with LangGraph. The defensible part is everything around it: posture discipline, synthesis protocols, typed conclusions, multi-vendor routing, BYOK encryption, the YAML catalog. None of those are unique. The combination, calibrated through real use, is.

### Vitakka — Situated Cognition

**Pāli: directed thought, applied thought.**
**Status: V2 direction. Concept clarified May 3 — substantially larger and more important than previously framed.**
**Public surface: `vitakka.attalabs.dev` (when built).**

Vitakka is *not* "Vāda with a chat surface." This was the central correction of round 4.

Vitakka is the layer where deliberation becomes **contextually grounded** within a focus over time:

- **Deliberation with artifacts** — docs, code, images, data brought into the focus inform the debate
- **Deliberation with MCP context** — the system pulls from connected tools mid-deliberation
- **Deliberation with conversation history** — this round's debate sees the previous rounds in the same focus
- **Deliberation compaction** — long-running focuses summarize without losing reasoning lineage
- **Short and long-form invocations** — 30-second checks vs 30-minute investigations, system infers stakes
- **Accumulating conclusions** — the focus accumulates typed conclusions over time, not as a transcript but as evolving cognition

Each item is non-trivial software. The novel difficulty is not in inventing the primitives — those exist. The novel difficulty is **integrating them without destroying cognitive clarity**.

**Vitakka is the category innovation.** Round 4 reviewer consensus: atomic debates are copyable. Coherent long-horizon cognition inside a focus is much harder. The center of gravity has shifted from Vāda to Vitakka.

The contrast with existing products: Claude Projects, ChatGPT Projects, and Gemini Gems all tie focuses to one provider. Jenova and Halomate offer multi-model chat with memory but no structured deliberation. Notion has containers but is workspace-shaped (organize work), not cognition-shaped (compound thinking). Vitakta sits in the gap.

The core primitive is the **Focus**: a beginning (intent), a middle (multi-model conversation with Vāda invoked invisibly when stakes are high, with artifacts and MCPs grounding the work), and an end (a conclusion or artifact set, persisted to Sati).

### Sati — Cross-Focus Memory

**Pāli: mindfulness, recollection, memory.**
**Status: V3 direction. Renamed April 26, 2026 (was previously "Atta-the-product"). Concept clarified by round 4.**
**Public surface: `sati.attalabs.dev` (when built).**

Sati is the memory substrate that makes intelligence persist *across* focuses, *across* sessions, and *across* AI providers.

What Sati holds:
- Closed Vitakta focuses and their accumulated conclusions
- Cumulative typed conclusions from Vāda deliberations
- Cross-focus retrieval (a new focus on a related theme inherits relevant prior cognition)
- Provenance chains — which model said what, what objections existed, what changed
- The user's evolving thinking patterns (eventual fine-tuning ground; see `atta-finetuning-research.md`)

Sati's defensibility is structural. Anthropic, OpenAI, and Google will not build cross-AI memory because portable memory means portable users. Mem0, Mimir, and other infrastructure projects build the primitives, but as developer tools, not as user-facing products that compose with deliberation and focus.

**The clarified framing of Sati's value:** memory is not "what happened." Memory is "how your thinking evolved." Sati stores the deltas of cognition, not transcripts.

### Cetana — Deliberation-Guided Execution

**Pāli: volition, intention, the mental factor that initiates action.**
**Status: V4+ direction. V0 path is a Vāda YAML team. V0.7 is MCP+CLI. V1 earliest late 2026 / early 2027.**
**Public surface: `cetana.attalabs.dev` when V1.**

Cetana is Vāda used as planning authority over a body of work. Not a single deliberation — a loop:

1. Vāda deliberates on a goal
2. Produces a structured plan (typed conclusion + next-step breakdown)
3. User approves, revises, or rejects
4. Cetana dispatches the next step to an execution agent (Claude Code, Cursor, MCP-based agent, custom executor)
5. Executor acts and reports
6. Vāda reviews the results adversarially
7. Loop continues until terminal state

**Executor-agnostic.** Cetana doesn't care who executes — Claude Code, Cursor, Hermes Agent, a human. The value is the deliberation-driven coordination, not the execution itself. This explicitly distinguishes Cetana from autonomous-agent products that bundle planning and execution.

**Honest scope.** Cetana V1 is not an autonomous architect. It is structured tooling that makes human-supervised AI-assisted work dramatically better than ad-hoc chat sessions. See `cetana-reality-check.md` for the full capability honesty.

### Herald — Pluggable MCP Tool

**English name (signals "plugs in").**
**Status: independently developed. Not a core ecosystem product.**

Forensic CV-to-job-description match tool. Plugs into Vitakta or any MCP-compatible host. Per the naming rule: no Pāli name, not Atta-built.

---

## How the products compose

```
              Atta Ecosystem (atta.ai or atalabs.app eventually)
                                    │
                                    │
                 Lab: AttaLabs (attalabs.dev permanently)
                                    │
  ┌────────────┬───────────────────┼──────────────────┬──────────────┐
  │            │                   │                  │              │
 Vāda       Vitakka              Sati              Cetana         Herald
episodic    situated         cross-focus       deliberation-    CV/JD match
cognition   cognition          memory          guided execution  (plugs in)
                                    │
                                    ↑
                  Memory substrate read by Vitakka, Vāda, Cetana
```

**Vitakka invokes Vāda** invisibly when a sub-question deserves adversarial synthesis. The user does not press a button.

**Vāda's typed conclusions persist into Sati** when the user accepts them.

**Vitakka loads Sati** to bring relevant prior cognition into the current focus, automatically.

**Cetana invokes Vāda** for planning and review, dispatches to executors, persists state to Sati.

**Connected tools (Herald, Google Maps, image models, GitHub, anything MCP)** plug into Vitakka, Vāda, or Cetana. They extend the ecosystem; they are not Atta products.

### What composition produces

Atomic features are copyable. The composition is what no single competitor will replicate, because the components have to be designed together for the simplicity to hold.

The user experience is simple. The product underneath is not. This is the core discipline.

---

## A user journey, told end-to-end

A founder is making a strategic decision about pricing.

She opens Atta. Not because she has a question — because she has a *focus* she's been thinking about for two weeks. Vitakka has the focus loaded already, with three artifacts she dropped in last session (her current pricing page, two competitors' pricing pages, a customer interview transcript). Sati surfaces a typed conclusion from a related focus three weeks ago: "Customer willingness-to-pay scaled with team size, not seat count."

She types: *"Should we move from per-seat to per-team pricing?"*

Atta does not run a debate immediately. It pulls relevant context from the artifacts, checks the prior conclusion, and decides this is a high-stakes question. Vāda invokes invisibly — three reviewers, structured adversarial deliberation, synthesizer producing a typed output. The chat surface shows: *"I'm thinking carefully about this — checking what we concluded last time and pressure-testing both directions."* Thirty seconds later, a response that's notably more nuanced than what one model would have produced. A small icon next to the response says *"3 perspectives reviewed"* — clickable to see the debate, but not necessary to see the answer.

She refines the question. Adds an artifact. Asks Vāda to consider a new angle. The focus accumulates — not as a chat log, but as a structured set of conclusions that compound.

Mid-conversation she needs to send the recommendation to her co-founder. Atta delegates to Notion via MCP — the conclusion exports as a draft strategy doc. She doesn't leave Atta. She doesn't manage the integration.

She closes the focus. Sati persists what was concluded. Six months later, when she revisits pricing for a new product line, that prior focus surfaces automatically.

**Vitakta is where she thinks.** **Vāda is where ideas are pressure-tested.** **Sati is what makes thinking compound.** **Cetana** (eventually) **is where conclusions become work.** **Herald and other tools** extend the ecosystem.

Atta is the house that holds it all — and the conviction that the user's thinking is hers.

---

## Why this composition is defensible

### What exists elsewhere

- Multi-agent frameworks (LangChain, AutoGen, CrewAI) — developer tools, not products
- Multi-model aggregators (Aymo, AiZolo, Poe, TypingMind) — multi-model UX without deliberation, focus, or portable memory
- AI memory infrastructure (Mem0, Mimir, MemPalace, MemWire, OpenMemory, Honcho) — primitives, not products
- Multi-model workspaces (Jenova, Halomate, Mimesys) — closest to the category, missing structured deliberation and longitudinal cognition
- Knowledge tools with AI (Notion, Heptabase, Obsidian, Roam, Tana) — workspace-shaped, not cognition-shaped
- Provider Projects (Claude, ChatGPT, Gemini Gems) — single-provider, by design

See `atta-market-research.md` for the full landscape.

### What doesn't exist as a coherent product

- Multi-agent **adversarial** deliberation as a default invocation, not a feature
- Typed conclusions with provenance as a first-class output, not prose
- Focus containers with hard memory scoping, designed for sustained problem-solving
- Cross-AI memory that persists across providers, owned by the user
- Executor-agnostic deliberation-guided execution
- All bound by a single coherent ecosystem with neutrality as a structural commitment

The synthesis is the product. Each layer has precedents. The composition does not.

### The structural reason providers cannot build this

This argument does not rest on "providers are unwilling." It rests on **structural conflict of interest:**

- Anthropic, OpenAI, Google optimize for engagement, retention, and model centrality
- Atta optimizes for epistemic quality, portability, model pluralism, continuity independent of provider

Anthropic *could* ship adversarial mode in Claude Projects. They are the most likely provider to do so — philosophically aligned, MCP is theirs, Claude is positioned as the thoughtful AI. But shipping it requires admitting their model is sometimes wrong, and structurally enabling users to work outside their ecosystem. That conflicts with their business.

This is a *watch-not-worry* observation, not a threat to obsess over. Leading indicators: provider neutrality signals, persistent cognition moves in Claude Projects, invisible deliberation in Claude's main interface. Check monthly. Move on. Build.

### Defensibility timeline

- **0-12 months:** clear runway. The composition is undefended.
- **12-24 months:** smaller players (Mimesys, Jenova, a stealth team) may add adjacent features. Speed of execution matters.
- **24+ months:** if the category proves valuable, providers may pivot. Brand, user base, and architectural lead determine outcome.

Speed-to-market matters. Execution quality matters more. The disciplined hide-the-work design philosophy matters most. See `atta-build-strategy.md`.

---

## The four-round deliberation that produced this version

Between May 3, 2026, the Principal and four reviewer agents (Gemini, Grok, DeepSeek, ChatGPT) ran four rounds of adversarial review on the Atta positioning. The major corrections that shaped this document:

**Round 1.** "Chat is the wrong unit of work" identified as the central insight. Wedge persona corrected to founders/strategists. Notion identified as primary competitive threat.

**Round 2.** Capability matrix produced. Three columns added that previous framings missed: provenance, typed conclusions, cognitive continuity. Several cell ratings corrected. Anthropic surfaced as a more dangerous threat than treated.

**Round 3.** Principal articulated the "thin thinking layer" framing. Reviewers split on whether it survived. Strong consensus that simplicity is not a moat.

**Round 4.** Principal corrected: simplicity was always a UX claim, never a moat claim. Vitakta corrected from "packaging" to "the substantial middle layer that delivers situated cognition." Vāda repositioned as the primitive, not the category. The strategic center moved to Vitakta's longitudinal cognition.

**The framing that survived all four rounds:**

The user experience is simple. The product underneath is not. The moat is coherent longitudinal cognition. The category is centralisation of thinking, not centralisation of work. The composition is what no provider will build.

---

## Sequencing — what ships when

See `atta-build-strategy.md` for the full sequencing logic. Summary:

1. **Vāda V1** — currently in production at `vada.attalabs.dev`. MCP server. Test from Claude Desktop, Cursor, etc. Validates the deliberation primitive.
2. **Vitakta V1** — substantial middle layer. Artifacts, MCPs, history, compaction, accumulating conclusions. Ships standalone to AttaLabs because each piece teaches something the next layer depends on.
3. **Atta V1** — composition layer. Cross-focus memory (Sati), focus indexation, fine-tuning ground. Ships to atta.ai or atalabs.app — the consumer surface, separate from the lab.
4. **Cetana V0/V0.7/V1** — deliberation-guided execution. Earliest realistic V1: late 2026 / early 2027.

AttaLabs is the lab where each component ships publicly as it's built. The final product is the composed Atta, and it lives at its own polished home when ready.

---

## Strategic positioning

### One sentence

> **Think here. Work anywhere.**

Subhead options:

> *Atta is where your thinking compounds. One place for the decisions, drafts, and deliberations that matter — across any model, any tool, any session.*

> *The private memory layer where your high-stakes decisions compound, instead of getting lost in the chat.*

### Per-product framing

- **Vāda:** *Structured deliberation when the answer matters.* Multi-agent adversarial review with typed conclusions.
- **Vitakka:** *A focus where your thinking compounds.* Multi-model conversation with deliberation invoked invisibly, artifacts grounded, conclusions accumulating.
- **Sati:** *Your thinking, remembered across every AI.* Cross-focus, cross-provider, cross-session.
- **Cetana:** *Your best thinking, applied to real work.* Deliberation-guided execution, executor-agnostic.

### Positioning relative to existing categories

- **Not competing with ChatGPT/Claude/Gemini** for one-shot answers. Those are for ephemeral questions.
- **Not competing with Cursor/Claude Code/Hermes Agent** for execution. Those are for when you know what to build.
- **Not competing with LangChain/CrewAI/AutoGen** for agent frameworks. Those are developer tools.
- **Not competing with Notion/Obsidian/Heptabase** for workspace. Those are for organizing work.
- **Competing with the absence of a category**: a place for thinking that compounds, structurally neutral, designed for high-stakes judgment.

---

## How to use this document

When the ecosystem story is being told to investors, advisors, friends, or future Claude sessions: this is the source. When scope creep threatens any single product: this is the "is this product's job or another's?" test. When competitive pressure emerges: this is the "what makes us different?" reminder.

When this document conflicts with what's been built or what's about to be built, this document loses. Ship the truth, then update.

---

## Related documents

- `atta-naming-decision.md` — the rename of Atta-the-product to Sati and the AttaLabs/atta.ai distinction
- `atta-current-state.md` (project knowledge) — concrete state across products and infrastructure
- `atta-plan.md` (project knowledge) — active work plan
- `atta-build-strategy.md` — sequencing, hide-the-work discipline, first-user tests
- `atta-market-research.md` — competitive landscape and what to watch
- `atta-finetuning-research.md` — technical research for Sati's eventual fine-tuning layer
- `vitakka-human.md` — the substantial middle layer described in human terms (corrected May 3)
- `cetana-reality-check.md` — capability honesty for Cetana
- `vada-state.md`, `vada-product-spec.md`, `vada-decisions.md` — Vāda internal documentation

---

*This document is the strategic compass for the Atta ecosystem. It exists to preserve coherence under execution pressure. When scope decisions get hard, return here.*
