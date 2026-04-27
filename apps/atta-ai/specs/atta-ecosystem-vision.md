# Atta Ecosystem — Vision

**Last updated:** April 27, 2026
**Status:** Strategic direction document. Not a build specification. The canonical ecosystem vision — supersedes older `Atta_Ecosystem.docx` marketing material and the original `atta-ecosystem-vision.md` four-layer architecture document.

---

## What Atta is

Atta is an ecosystem of AI products rooted in a single belief: **your intelligence — the things you think, decide, explore, and conclude across every AI system you use — should belong to you, not to any single tool.**

The name comes from the Pāli word for *self*. The products in the ecosystem carry names from the same philosophical tradition — each one describing precisely what the product does, drawn from Buddhist cognitive psychology.

Atta is not a product. It is the house. The products live inside it.

The public domain is **`attalabs.dev`**. Each product lives at its own subdomain. The code namespace is `@atta/*`. AttaLabs is the public brand wrapper for the domain because bare `atta.{premium-tld}` is unavailable.

---

## The naming rule

If a product has a Pāli name, Atta built it.
If it does not, it plugs in.

This rule is the system's signature. A user who learns it can predict, from any tool name, whether it's part of the core ecosystem or an integration. The rule applies to all current and future products.

---

## The current product set

Four core products. One pluggable tool. Each is independent — stands alone, has its own domain, has its own users — but built to compose with the others through the shared identity layer (Sati) and the shared engine (Vāda when deliberation is needed).

### Vāda — Deliberation

**Pāli: debate, discourse.**
**Subdomain: `vada.attalabs.dev`.**
**Status: V1 in active development. Phase 7.3 complete.**

Vāda is a YAML-driven deliberation runtime. The engine executes deliberation configurations expressed entirely as YAML files. Other applications (Claude Desktop, Cursor, custom apps) invoke Vāda via MCP by passing a YAML and a question; the engine runs the YAML and returns the result.

Modes (Crucible, Sparring, Brokered, baselines) are not features — they are YAML configurations. The engine is mode-agnostic.

**The product Vāda exposes:** structured deliberation as a tool. Bring a question, select a deliberation configuration, watch agents work through it in structured rounds, receive a typed Conclusion (recommendation, key_condition, unresolved_points, participants).

Conclusions are stateful, versioned, and auditable.

### Vitakka — Focus

**Pāli: directed thought, applied thought.**
**Subdomain: `vitakka.attalabs.dev`.**
**Status: V2 direction. Concept locked, not actively in development.**

Vitakka is the **focus layer**. A session starts with an intent (an idea, a project, a topic of inquiry) and builds a conversation toward a conclusion.

Within a Vitakka focus, the user can:
- Talk to any model at any time (Claude, Gemini, ChatGPT, Grok, local models via Ollama)
- Call Vāda for deep deliberation on specific sub-questions with any team configuration
- Call connected tools (via MCP) without leaving the conversation
- Accumulate artifacts (documents, code, decisions) as the focus progresses
- Close the focus with a final conclusion or artifact set

**Contrast with existing "projects":** Claude projects, ChatGPT projects, Gemini conversations all tie you to one vendor and one model. Vitakka is **model-agnostic from the ground up**. The user owns the focus, not the platform. Moving between models within a single focus is native, not a migration.

The core primitive is the Focus: a beginning (intent), a middle (multi-model conversation with Vāda deliberations as needed), and an end (a conclusion or artifact set).

### Sati — Memory

**Pāli: mindfulness, recollection, memory.**
**Subdomain: `sati.attalabs.dev`.**
**Status: V3 direction. Renamed April 26, 2026 (was previously called "Atta-the-product"). Concept locked, no code yet.**

Sati is the **memory substrate** that makes intelligence persist. All Vitakka focuses, Vāda Conclusions, and accepted decisions persist into Sati. Returning to any product brings back the relevant prior state — what was concluded, what was decided, what's still unresolved.

What Sati remembers:
- Closed Vitakka focuses and their artifacts
- Cumulative Conclusions from Vāda deliberations across focuses
- The user's evolving thinking patterns and preferences
- Connections between focuses (themes that recur, questions that link)

**Sati is the differentiator no single AI provider will build.** Cross-AI memory — conclusions from a Claude/Gemini debate persist across every future session, regardless of which model is active — requires neutrality. OpenAI won't build it. Anthropic won't. Google won't. The user has to own the memory layer. Sati is that layer.

The original product concept used the name "Atta" for this layer. The rename to Sati happened in April 2026 because Atta was already serving as the ecosystem name — a parent that contains itself is a category error. Sati is the more accurate Pāli word for what the product actually does (memory, recollection), and the rename freed Atta to refer unambiguously to the ecosystem.

Technical approach: RAG over personal corpus first, fine-tuning later if specific capability gaps emerge. See `atta-finetuning-research.md`.

### Cetana — Deliberation-Guided Execution

**Pāli: volition, intention, the mental factor that initiates action.**
**Subdomain: `cetana.attalabs.dev` (future).**
**Status: V4+ direction. Earliest realistic build: late 2026 / early 2027.**

Cetana is **Vāda used as a decision-making authority over a body of work.** Not a single deliberation — a loop:

1. Vāda deliberates on a goal or problem
2. Produces a structured plan (Conclusion + next-step breakdown)
3. User approves, revises, or rejects
4. Cetana dispatches the next step to an execution agent (Claude Code, Cursor, MCP-based agent, custom executor)
5. Executor acts and reports results
6. Vāda deliberates on the results — are they good? does the plan need revision? is the step complete?
7. Loop continues until terminal state

**Key property: executor-agnostic.** The execution agent could be Claude Code, Cursor, a custom MCP-based agent, or eventually a human with Cetana providing structured guidance. Cetana doesn't care who executes — only that execution happened and can be reviewed.

**Why this is novel:** competitors use single-voice planners. Cetana's planner is Vāda — multi-agent adversarial deliberation. The Conclusion format is typed and validated, not loose text. Review uses the same adversarial structure on results, not simple "did it work?" checks. The executor is swappable, not bundled. Memory persists via Sati so long-running projects stay coherent across sessions.

**The honest scope:** Cetana V1 is *not* an autonomous architect agent. It's a structured collaboration framework that makes human-supervised AI-assisted architecture work dramatically better than ad-hoc chat sessions. The human stays in the loop where judgment matters; coordination overhead is removed where it doesn't. See `cetana-reality-check.md` for the full capability honesty.

### Herald — Pluggable MCP Tool

**English name (signals "plugs in").**
**Status: independently developed; not a core ecosystem product.**

Herald is a forensic CV-to-job-description match tool that exposes itself via MCP. It plugs into Vitakka or any MCP-compatible host. Atta does not own Herald's roadmap.

Per the naming rule: Herald has no Pāli name, therefore it's not Atta-built. It plugs in.

---

## How the products compose

Each product stands alone. Used together, they create more than the sum.

```
                 Atta Ecosystem (attalabs.dev)
                          │
  ┌──────────┬────────────┼────────────┬───────────────┐
  │          │            │            │               │
 Vāda     Vitakka       Sati         Cetana         Herald
deliberation  focus    memory   exec-guided     CV/JD match
                       layer   deliberation     (plugs in)
                          │
                          ↑
                 Memory substrate read by
                 Vitakka, Vāda, Cetana
```

**Vitakka calls Vāda** when a sub-question deserves adversarial synthesis.
**Vāda's Conclusions persist into Sati** when the user accepts them.
**Vitakka loads Sati** to bring relevant prior thinking into the current focus.
**Cetana calls Vāda** for planning and review; **calls executors** for action; **persists state to Sati** so long-running work stays coherent.
**Connected tools (Herald, Google Maps, image models, GitHub, anything MCP)** plug into Vitakka, Vāda, or Cetana. They are not Atta products — they extend the ecosystem.

The shape is:

- Atta = the ecosystem; the brand; the philosophy that intelligence is yours
- Sati = the persistent layer beneath the working products
- Vitakka = where you think
- Vāda = where ideas are pressure-tested
- Cetana = where conclusions are put to work

---

## A user journey, told end-to-end

Imagine a decision about your business.

You open Vitakka. You say what you're thinking about. Vitakka loads everything you've concluded before on this subject from Sati — across every AI, every session, every tool. You think with Claude, with Gemini, with whatever intelligence the question deserves.

The question gets complex. You want adversarial pressure on a specific claim. Vitakka invokes Vāda — a structured deliberation with agents assigned to different perspectives. Three rounds. Blind critique. The conclusion that survives is one you can trust.

During the session, you need job market data. Herald is connected; Vitakka calls it automatically. You need to check a location. Google Maps is connected. You need a visual. An image model is connected. You never leave.

Eventually, the work moves from thinking to executing. You hand the conclusion to Cetana. Cetana plans the implementation steps via Vāda, dispatches each step to Claude Code, reviews the results adversarially, and loops until done. You stay in approval loops on each major decision.

You close the work. Vitakka proposes what you reached. You accept what's right. The conclusion is saved into Sati — available in every future session, across every AI, for as long as you need it.

**Vitakka is where you think. Vāda is where ideas are pressure-tested. Sati is what remembers. Cetana is where conclusions are put to work. Herald and other connected tools extend the ecosystem.**

Atta is the house that holds it all — and the belief that your intelligence is yours.

---

## Why this composition is defensible

### Not reinventing, composing

What exists elsewhere:
- Plan-and-execute agents (LangChain, AutoGen, CrewAI)
- Multi-agent frameworks (CrewAI crews, AutoGen groups)
- Persistent memory layers (vector stores, long-context models)
- Project/chat organization (Claude, ChatGPT, Gemini projects)
- Executor agents (Claude Code, Cursor)

What doesn't exist as a cohesive ecosystem:
- Multi-agent **adversarial** deliberation as a planning primitive (Vāda's posture discipline)
- Containment-disciplined typed Conclusions (Vāda's output structure)
- Model-agnostic focus layer with Vāda callable mid-conversation (Vitakka)
- **Cross-AI** memory substrate owned by the user (Sati)
- Executor-agnostic deliberation-guided execution (Cetana)
- All four bound by a single identity and naming philosophy (Atta)

The synthesis is the product. Each layer has precedents; the specific composition is new.

### Defensibility timeline

- **12-18 months:** the synthesis is defensible. No direct competitor.
- **18-36 months:** frameworks catch up or adjacent products emerge. Need execution-quality moat.
- **36+ months:** the category exists. Atta is one of several. Brand, user base, and architectural lead determine outcome.

Speed-to-market matters. Execution quality matters more. The products that dominate this space will be the ones that get multi-agent dynamics right, not the ones that ship first with hand-wavy deliberation.

---

## Strategic positioning

### One sentence

*Atta is the personal AI substrate for people who want to think carefully — composable products covering deliberation, focus, memory, and deliberation-guided work.*

### Per-product marketing

- **Vāda:** *Think deeper on questions that matter. Multi-agent deliberation for high-stakes questions.*
- **Vitakka:** *Focus without lock-in. A project with every model, with Vāda's brain on call.*
- **Sati:** *Your thinking, remembered. Persistent memory across every focus, every model, every conclusion.*
- **Cetana:** *Deliberation-guided execution. Your best thinking, applied to real work.*

### Positioning relative to existing categories

- **Not competing with ChatGPT/Claude.ai** for general chat — those are for simple questions
- **Not competing with Cursor/Claude Code** for pure execution — those are for when you know what to build
- **Not competing with LangChain/CrewAI** for agent frameworks — those are developer tools, not end-user products
- **Competing with the absence of a category** — careful thinkers don't have a unified tool
- **Adjacent to** Notion, Obsidian, Roam (memory systems), but AI-native from the ground up

---

## Sequencing — what ships when

**Now (April 2026):** Vāda V1 in active development. Phase 7.3 complete; Phase 8 (synthesizer) next. Vāda is the active product; everything else is direction.

**Next (mid-2026):** Vāda V1 ships. The ecosystem story is told publicly. `attalabs.dev` becomes the ecosystem hub with engine tools (YAML visualizer, cost calculator) exposed at the parent domain.

**After Vāda revenue milestone:** Vitakka V2 enters active development. Builds on Vāda's deliberation primitive. Sati's RAG infrastructure begins.

**Then:** Sati V1 ships as a standalone product and as the memory substrate for Vitakka and Vāda.

**Late 2026 / early 2027:** Cetana V1 if validation signals emerge (see `cetana-reality-check.md`). Otherwise: held as long-horizon vision, not built speculatively.

**`atta.ai` watch:** if the domain becomes available in 2027 (current owner is Japanese individual; possibly releasing then), the ecosystem migrates from `attalabs.dev` to `atta.ai`. Migration is straightforward — DNS, Clerk cookie domain, 301 redirects from `*.attalabs.dev` to `*.atta.ai`. The brand stays Atta either way; only the URL changes.

---

## How to use this document

### Now
Use as the canonical ecosystem narrative. When telling the Atta story to investors, advisors, or new collaborators, this is the source. When scope creep threatens any single product, this is the "is this product's job or another's?" test.

### When Vāda V1 ships
Use to differentiate from single-product deliberation engines. Use to justify why V1 is intentionally scoped — it's part of something bigger.

### When Vitakka is being specified
Revisit to ensure Vitakka's design supports Vāda callability, Sati persistence, and eventual Cetana integration.

### When Sati is being built
Revisit to ensure Sati is positioned as the substrate the other products share, not as a feature embedded in Vitakka.

### When Cetana is being specified
Read alongside `cetana-reality-check.md`. Check the validation signals. Build only if they emerged.

### As a strategic compass
When competitive pressure emerges, this document is the "what makes us different?" reminder. When tempted to add features that blur product boundaries, return here to preserve scope discipline. When the bigger story needs to be told under uncertainty, the architecture is here.

---

## The meta-observation

The way you build the products reveals what the next product should be.

Vāda was built using a manual workflow — Principal (Dani) + Critic (deliberation review) + Builder (Claude Code or similar). That workflow is itself the product Cetana will externalize. The Atta ecosystem is being built using its own architecture in a manual form, which is validation data for what to automate next.

When external users arrive on Vāda, watch whether they exhibit the same patterns. If they do, the roadmap is already half-designed by observation of yourself and early users.

Your own workflow is the beta test for products you haven't built yet. Document it religiously.

---

## Related documents

- `atta-naming-decision.md` — the rename of Atta-the-product to Sati and the AttaLabs domain decision (April 26, 2026)
- `atta-current-state.md` — concrete state across products and infrastructure as of April 2026
- `atta-roadmap.md` — phased forward plan for ecosystem-level work (auth migration, new apps, DNS, etc.)
- `atta-finetuning-research.md` — technical research for Sati's eventual fine-tuning layer (originally written about "Attā v2" — references should be read as Sati v2 throughout)
- `cetana-reality-check.md` — capability honesty for the Cetana product. Read before specifying Cetana V1.
- `vada-state.md`, `vada-product-spec.md`, `vada-decisions.md` — Vāda's internal documentation

---

*This document is the strategic compass for the Atta ecosystem. It exists to preserve a coherent vision under conditions of execution pressure. When scope decisions get hard, return here.*
