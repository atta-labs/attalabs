# Attā Ecosystem — Full Vision

Written: April 20, 2026
Captured mid-Step-5 Mastra migration, after Dani observed that the session's own workflow (plan → execute → review → deliberate → execute → review) revealed a missing layer in the Attā ecosystem.

**Status: Strategic direction document. Not a build specification. Revisit at product milestones.**

---

## The trigger moment

During an extended Mastra migration session on April 20, 2026, Dani observed that the collaboration pattern being used — Principal (Dani) + Critic (Opus) + Builder (Sonnet via Claude Code) — was itself a Vāda-like deliberation pattern, applied not to a single question but to an extended body of work over 8+ hours.

The session produced four commits across a complex framework migration. At each step: deliberation about approach, execution by the builder, review of results, re-deliberation on observations, iteration.

**The insight:** this pattern is a product direction the ecosystem was missing. The Attā ecosystem as previously scoped (Vāda + Vitakka + Attā) didn't have a layer for deliberation-guided execution. That layer is what Dani has been using manually all session.

---

## The full ecosystem — four layers

### Layer 1 — Vāda (Deliberation)

**Role: The Brain.**

Multi-agent deliberation engine. Takes a question and surrounding context, runs structured deliberation with role-separated agents (Strategist, Critic, Devil's Advocate, Synthesizer, and others), produces a typed Conclusion.

**Core primitive:** the Conclusion. Structured, validated, includes `recommendation`, `key_condition`, `unresolved_points`, `participants`, `review_by`. Machine-readable and human-verifiable.

**Invoked by:** directly by users (V1), by Vitakka focuses (V2+), by the Architect layer (V3+).

**Scope discipline:** Vāda is the deliberation layer only. It does not execute, store long-term memory, or manage focus. It does one thing: produce high-quality deliberated Conclusions.

**Status:** V1 in active development (April 2026). Mastra migration ongoing.

---

### Layer 2 — Vitakka (Focus)

**Role: The Session / The Project / The Conversation.**

Vitakka is the **focus layer**. A session starts with an intent (an idea, a project, a topic of inquiry) and builds a conversation toward a conclusion.

Within a Vitakka focus, the user can:
- Talk to any model at any time (Claude, Gemini, ChatGPT, Grok, local models via Ollama)
- Call Vāda for deep deliberation on specific sub-questions with any team configuration
- Accumulate artifacts (documents, code, files, decisions) as the focus progresses
- Close the focus with a final conclusion, deliverable, or set of artifacts

**Contrast with existing "projects":** Claude projects, ChatGPT projects, Gemini conversations all tie you to one vendor and one model. Vitakka is **model-agnostic from the ground up**. The user owns the focus, not the platform. Moving between models within a single focus is native, not a migration.

**Core primitive:** the Focus. Has a beginning (an intent), a middle (multi-model conversation with Vāda deliberations as needed), and an end (a conclusion or artifact set).

**Invoked by:** users directly. Focuses are the primary surface users interact with in Vitakka.

**Relationship to other layers:**
- Vitakka calls Vāda when deep deliberation is needed mid-focus
- Vitakka persists to Attā when the focus closes (or continuously)
- Vitakka could invoke the Architect layer for execution-guided focuses

**Status:** V2 direction. Not yet in development. Builds on Vāda V1.

---

### Layer 3 — Attā (Memory)

**Role: The Persistent Self.**

Attā is the **memory substrate** underneath Vitakka. All focuses persist. Returning to Attā brings back the last state of a focus, the conclusion from a past focus, or the accumulated context across related focuses.

**What Attā remembers:**
- Closed Vitakka focuses and their artifacts
- Cumulative conclusions from Vāda deliberations across focuses
- User's evolving thinking patterns and preferences
- Connections between focuses (themes that recur, questions that link)

**Technical approach (long-term):**
- RAG over personal corpus first (retrieval, not fine-tuning)
- Potential fine-tuning of a local model (LoRA adapter on Llama 3.1 8B or similar) for personal voice alignment
- Free-context memory growth with indexing as corpus grows
- See separate document: `atta-finetuning-research.md`

**Core primitive:** continuity. The user's past thinking is retrievable and connectable to present work.

**Relationship to other layers:**
- Attā stores Vitakka focuses and their artifacts
- Attā provides context when a new Vitakka focus relates to past work
- Attā's memory could inform Vāda deliberations (past relevant Conclusions surfaced)

**Status:** V3 direction. Depends on Vitakka existing first.

---

### Layer 4 — The Architect (Deliberation-Guided Execution)

**Role: The Brain Applied to Work.**

**This is the newly-identified layer. Named Architect for now; Pali naming candidates below.**

The Architect is **Vāda used as a decision-making authority over a body of work.** Not a single deliberation — a loop where:

1. Vāda (Architect mode) deliberates on a goal or problem
2. Architect produces a structured plan (Conclusion + next-step breakdown)
3. User approves, revises, or rejects
4. Architect dispatches next step to an execution agent (Claude Code, MCP-based agent, custom executor)
5. Execution agent acts and reports results
6. Architect deliberates on the results — are they good? does the plan need revision? is the step complete?
7. If complete: mark step done, proceed to next step. If not: request refinement. If plan needs change: re-deliberate.
8. Loop continues until terminal state (goal achieved, failure, or user-initiated stop)

**Key property: executor-agnostic.** The execution agent could be Claude Code, Cursor, a custom MCP-based agent, eventually a human with the Architect providing structured guidance. The Architect doesn't care who executes — it only cares that execution happened and can be reviewed.

**Core primitive:** the deliberation-execution cycle. Deliberation is primary; execution is subordinate. Most agent frameworks invert this; the Architect inverts the inversion back to human-like engineering practice.

**Who this is for:**
- Engineers doing architecturally dense work (refactors, migrations, system design)
- Architects designing systems iteratively
- Researchers with multi-step experimental plans
- Writers on long-form work where each section informs the next
- Anyone doing extended multi-decision work where errors compound

**Contrast with existing agent frameworks:**
- LangChain Plan-and-Execute: single-voice planner, not adversarial
- CrewAI: multiple agents but specializations, not adversarial postures; locked to CrewAI execution
- AutoGen: multi-agent conversation but general-purpose, not deliberation-discipline-first
- AutoGPT/BabyAGI: planning loop but confidently-wrong-prone
- Claude Code / Cursor: execution-first, planning-as-scaffolding

**The Architect's differentiation:** adversarial deliberation drives planning (not single-voice), containment disciplines output (not trust-by-default), executor-agnostic architecture (not framework-locked), integration with Vitakka/Attā (not standalone).

**Status:** V4+ direction. Requires Vāda V1 validation, Vitakka V2, and significant Attā infrastructure. Earliest realistic: late 2026 / early 2027.

---

## Pali naming for the fourth layer

The layer name "Architect" is descriptive but doesn't fit the ecosystem's Pali naming convention. Candidates:

**Cetanā** (volition) — the mental factor that initiates action. Pairs conceptually with Vāda (deliberation → volition → action). Classical Buddhist term. Pronounceable (chay-tuh-NAH).

**Saṅkhāra** (formation/construction) — the layer where intentions become manifested actions. Structurally deep but philosophically loaded.

**Kamma** (action with consequences) — perfect conceptual fit. Loaded publicly (westernized as "karma") but accurate.

**Kriyā** (action, work) — Sanskrit rather than Pali. Short, clean.

**Payoga** (effort, application) — Pali. The effort of applying plans to reality.

**Uttara** (further, beyond, answer) — the layer that carries deliberation forward into manifestation.

**Dani's call.** The name should come from his own meditation tradition, not external suggestion.

Working recommendation: **Cetanā** — cleanest conceptual pair with Vāda, pronounceable, recognizable to Vipassana audience, less philosophically loaded than Saṅkhāra.

---

## The unified ecosystem

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│                    ATTĀ (Memory / Self)                    │
│                                                            │
│       Persistent substrate beneath all focuses.            │
│       Stores closed Vitakka focuses, conclusions,          │
│       evolving preferences. Eventually fine-tuned.         │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  │              VITAKKA (Focus / Session)               │  │
│  │                                                      │  │
│  │    Model-agnostic conversation with intent.          │  │
│  │    Any model at any time. Produces artifacts.        │  │
│  │                                                      │  │
│  │    ┌──────────────────────┐  ┌─────────────────┐     │  │
│  │    │                      │  │                 │     │  │
│  │    │   VĀDA (Brain)       │  │  CETANĀ         │     │  │
│  │    │                      │  │  (Architect)    │     │  │
│  │    │  Multi-agent         │  │                 │     │  │
│  │    │  deliberation.       │  │  Deliberation-  │     │  │
│  │    │  Produces typed      │  │  guided         │     │  │
│  │    │  Conclusions.        │  │  execution      │     │  │
│  │    │                      │  │  loops.         │     │  │
│  │    │  Callable from       │  │                 │     │  │
│  │    │  within Vitakka.     │  │  Uses Vāda as   │     │  │
│  │    │                      │  │  brain, any     │     │  │
│  │    │                      │  │  executor for   │     │  │
│  │    │                      │  │  action.        │     │  │
│  │    │                      │  │                 │     │  │
│  │    └──────────────────────┘  └─────────────────┘     │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Reading the diagram:**
- Attā is the outermost — the persistent memory substrate
- Vitakka lives within Attā — sessions/focuses that persist
- Vāda and Cetanā live within Vitakka — callable capabilities during a focus
- Vāda is pure deliberation; Cetanā is deliberation-guided execution

**Alternative positioning for Cetanā:** could be peer to Vitakka rather than inside it. A Cetanā session is a work-body, distinct from a Vitakka focus. Both persist to Attā. Open question.

---

## Why this ecosystem composition is defensible

### Not reinventing the wheel, but composing novel synthesis

**What exists elsewhere:**
- Plan-and-execute agents (LangChain, AutoGen, CrewAI)
- Multi-agent frameworks (CrewAI crews, AutoGen groups)
- Persistent memory layers (various vector stores, long-context models)
- Project/chat organization (Claude, ChatGPT, Gemini projects)
- Executor agents (Claude Code, Cursor)

**What doesn't exist as cohesive product:**
- Multi-agent adversarial deliberation as planning primitive (Vāda's posture discipline)
- Containment-disciplined typed output from planner (Vāda's Conclusion structure)
- Executor-agnostic architecture (Cetanā pluggability)
- Model-agnostic focus layer with Vāda callable mid-conversation (Vitakka's design)
- Persistent memory substrate unifying all of above (Attā's role)

**The synthesis is the product.** Each layer has precedents. The specific composition is new.

### Defensibility timeline

- **12-18 months:** synthesis is defensible. No direct competitor.
- **18-36 months:** frameworks catch up or adjacent products emerge. Need execution quality moat.
- **36+ months:** category exists, Attā ecosystem is one of several. Requires brand, user base, differentiation beyond architecture.

Speed-to-market matters. Execution quality matters more. The products that dominate this space will be the ones that get multi-agent dynamics right, not the ones that ship first with hand-wavy deliberation.

---

## Why the Architect/Cetanā layer is not incremental — it's architecturally novel

The deliberation-execution loop pattern is not new. The specific Architect layer is novel because:

1. **The planner is Vāda (multi-agent adversarial), not a single LLM.** Competitors use single-voice planners. Adversarial structure surfaces hidden assumptions and catches confident errors before execution.

2. **The Conclusion format is typed and validated.** Competitors output loose text. Typed Conclusions are contracts the executor can rely on.

3. **Review uses the same adversarial structure on results.** Competitors use simple "did it work?" checks. Adversarial review on execution results catches subtle failures (outputs that look correct but miss intent, outputs that technically succeed but violate key_condition).

4. **Executor agnosticism.** Competitors ship with their own executors. Cetanā treats execution as a swappable layer — any MCP-compliant agent, Claude Code, Cursor, a human in the loop. This architectural choice means Cetanā doesn't compete with executors; it uses them.

5. **Integration with persistent memory (Attā).** Competitors are session-scoped. Cetanā builds on persistent work memory so long-running projects remain coherent across sessions, days, weeks.

---

## When this layer becomes worth building

**Prerequisites:**
1. Vāda V1 shipped with real users
2. Vitakka V2 shipped or near-shipping
3. Attā substrate sufficient to host Cetanā state
4. MCP ecosystem mature enough to be the executor interface standard

**Validation signals that would justify building:**
- Users naturally produce loop patterns with Vāda (asking related sequential questions)
- Users request "can Vāda plan something I then build" explicitly
- Dani's own personal use continues to hit the loop pattern regularly

**Signals to abandon:**
- V1 users don't produce loop patterns (deliberation is single-shot for them)
- Execution agents commoditize so completely that Cetanā's architecture adds no value
- An adjacent product ships and captures the category convincingly before Cetanā is ready

---

## Strategic positioning

### What the ecosystem is, told in one sentence
"Attā is the personal AI substrate for people who want to think carefully — four composable layers covering deliberation, focus, memory, and deliberation-guided work."

### Product marketing for each layer

**Vāda:** *Think deeper on questions that matter. Multi-agent deliberation for high-stakes questions.*

**Vitakka:** *Focus without lock-in. A project with every model, with Vāda's brain on call.*

**Attā:** *Your thinking, remembered. Persistent memory across every focus and conclusion.*

**Cetanā:** *Deliberation-guided execution. Your best thinking, applied to real work.*

### Positioning relative to existing categories

- **Not competing with ChatGPT/Claude.ai for general chat** — those are for simple questions
- **Not competing with Cursor/Claude Code for pure execution** — those are for when you know what to build
- **Not competing with LangChain/CrewAI for general agent frameworks** — those are developer tools, not end-user products
- **Competing with the absence of product category** — careful thinkers don't have a unified tool
- **Adjacent to** Notion, Obsidian, Roam (memory systems), but AI-native from the ground up

---

## The pitch evolution

**Before today (April 20, 2026):**
"We're building Vāda, a multi-agent deliberation engine, plus Vitakka and Attā as supporting products."

**After today:**
"We're building Attā, an AI ecosystem for people who think carefully. Four composable layers: Vāda for deliberation, Vitakka for focused sessions, Attā for persistent memory, Cetanā for deliberation-guided work. Vāda V1 ships first; Vitakka follows; Attā underneath; Cetanā is the long-horizon vision."

**The shift:** from "a product we're building" to "an ecosystem with a coherent architecture and a multi-year roadmap." The bigger story is tellable today even though only Vāda V1 is being built.

---

## What to do with this document

### Now
- Save it, file it, don't let it get lost
- Don't let V2/V3/V4 scope bleed into V1 development
- Don't announce the full ecosystem publicly yet — V1 positioning stays clean
- Tell trusted advisors the bigger story informally to gauge reaction

### When Vāda V1 ships
- Tell the ecosystem story in pitch materials
- Use it to differentiate from single-product deliberation engines
- Use it to justify why V1 is intentionally scoped — it's part of something bigger

### When Vitakka is being specified
- Revisit this document to ensure Vitakka's design supports Vāda callability, Attā persistence, and eventual Cetanā integration
- Validate with users whether the focus abstraction resonates

### When Cetanā is being specified (late 2026 / 2027)
- Review the validation signals above — did they actually emerge?
- If yes, build. If no, understand why not before proceeding.

### As a strategic compass throughout
- When scope creep threatens any single layer, this document is the "is this layer's job or another's?" test
- When tempted to add features that blur layer boundaries, return here to preserve scope discipline
- When competitive pressure emerges, this document is the "what makes us different?" reminder

---

## The meta-observation

Dani has been building Vāda with a methodology (manual Principal-Critic-Builder deliberation) that is itself a product direction (Cetanā). **The way you're building the product reveals what the next product should be.**

This is a valid and powerful research pattern. Notice every time the pattern appears in your own work — it's validation data for what the ecosystem's next layer should be.

When V1 ships and external users arrive, watch whether they exhibit the same patterns. If they do, the roadmap is already half-designed by observation of yourself and early users.

**Your own workflow is the beta test for products you haven't built yet.** Document it religiously.

---

## Appendix A — The origin conversation

This document was created during Step 5 of Vāda's Mastra migration on April 20, 2026. The conversation that triggered it:

Dani, mid-debugging session, observing that the 8-hour collaboration pattern being used (Principal-Critic-Builder, with structured deliberation at each decision point) was itself a Vāda-like pattern applied to a body of work. He asked whether this was something that should be a product — whether the Attā ecosystem was missing a layer for deliberation-guided execution.

The answer was yes, and this document captures the full shape of that realization.

Key contributors to the realization:
- The 8-hour session where deliberation-execution patterns produced 4 clean commits and caught multiple architectural errors before they landed
- Dani's observation that he doesn't work this way in normal coding, but chose to for this problem because the stakes warranted it
- The recognition that Vāda V1's scope as pure deliberation layer is correct, but leaves room for a deliberation-guided execution layer above it
- The insight that executor-agnosticism is architecturally valuable — Cetanā uses Claude Code, Cursor, or any future executor without being locked to any

---

## Appendix B — Related documents

- `vada-v2-deliberation-execution-cycle.md` — earlier, less complete capture of the same direction. Superseded by this document.
- `atta-finetuning-research.md` — technical research for Attā's eventual fine-tuning layer.
- `apps/vada-ai/specs/v2/workflow-design.md` — Vāda V1 workflow design (Mastra migration).
- `apps/vada-ai/specs/v2/followups.md` — tracked followups from migration work.
- Session transcripts at `/mnt/transcripts/` — raw source material for future reference.

---

*This document is the strategic compass for the Attā ecosystem's future. It exists to preserve a realization made under conditions of clarity, for use under conditions of execution pressure. When scope decisions get hard, return here.*
