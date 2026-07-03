# Vitakka — Technical Specification

Status: draft

**Pāli: vitakka — directed thought, applied thought.**
**Version:** 1.0 · May 2026
**Status:** Specification ready for Phase 0. Build begins after Vāda V1 validates publicly.

This is the technical specification for Vitakka — the situated-cognition layer of the Atta ecosystem. The narrative description lives in `vitakka-human.md`. The ecosystem context lives in `atta-ecosystem-vision.md`. The build sequencing lives in `atta-build-strategy.md`.

This document describes only what Vitakka itself owns. Cross-Focus memory, LoRA fine-tuning, indexation, and personal-corpus distillation are Sati's concerns. The composed Atta consumer product is Vitakka + Sati working together — described elsewhere.

---

## Scope

### In scope for Vitakka V1

- The Focus model — Open Thinking and Project Thinking modes, three moments (open / think / close), smart close mechanic
- Single-Focus context — within-Focus history, artifacts, MCP grounding, accumulated conclusions
- Vāda invocation inside a Focus — invisible when stakes warrant, explicit when user requests
- Multi-model orchestration inside a Focus — Claude, Gemini, DeepSeek, image models, any model
- Progressive extraction — waypoint-based conclusion identification during the Focus
- Compaction — preserving reasoning lineage when conversation exceeds context window
- Three routing patterns — to LLMs, to connected MCPs, to external tools that cannot be connected
- The eight UI states — visible system behavior, named agents, never-silent UX
- Close-time synthesis — Claude reviews waypoints, proposes 2-4 conclusions, user accepts
- Single user, single device — multi-user collaboration is not in V1

### Out of scope for Vitakka V1

These belong to other layers and are explicitly **not** part of Vitakka V1:

- **Cross-Focus memory and retrieval** — Sati's job. Vitakka knows about its own Focus; it does not load context from other Focuses. (Within the composed Atta product, Vitakka receives cross-Focus context from Sati at Focus-open time. That integration is part of Atta V1, not Vitakka V1.)
- **Indexation across many Focuses** — Sati's job.
- **LoRA fine-tuning on personal corpus** — Sati's eventual maturity. Vitakka uses base models inside the Focus.
- **Behavioral pattern distillation** — Sati's eventual maturity.
- **Multi-Focus knowledge graph** — Sati's job. Vitakka does not relate Focuses to each other.
- **Execution outside Vitakka** — Cetana's eventual job. Vitakka routes to external tools but does not orchestrate execution.
- **Document editing** — Notion via MCP, not Vitakka.

If a feature would require knowing about multiple Focuses simultaneously, it is Sati's territory, not Vitakka's. This boundary is the design discipline that keeps Vitakka shippable as a standalone milestone.

---

## Core architecture

### The Focus is the unit of work

Everything in Vitakka happens inside a Focus. A Focus has:

- An **intention** — the one-line answer to *"What are you thinking about?"*
- A **mode** — Open Thinking or Project Thinking (declared at open)
- **Messages** — the full conversation history within this Focus
- **Artifacts** — documents, code, images, data brought in as grounding context
- **Connected MCPs** — tools the user has wired up that this Focus can reach
- **Waypoints** — invisible intermediate conclusions extracted progressively
- **Accepted conclusions** — what the user accepted at close (2-4 per Focus typically)
- **State** — open, thinking, routing, tool_running, debating, synthesizing, responding, error

A Focus does not have sub-tasks. It does not have status columns. It does not have deadlines. The Focus itself is the structure.

### The opening question

The single entry point is one question:

> *"What are you thinking about — or which project are you working on?"*

The user types one line. The system parses the answer to determine mode:

- If the user names a recognized subject (matches an artifact, a known project name, a previously-named focus title) → **Project Thinking** mode
- If the user provides a free-form thought without a named anchor → **Open Thinking** mode

The user can also be prompted with their recent Focuses for continuation, but this is opt-in and disabled by default to avoid anchoring bias (open question for V1 calibration).

### The three moments

**Moment 1 — Open.** Mode is determined. If Project Thinking, the system loads relevant artifacts the user has explicitly attached to this Focus. (Cross-Focus memory loading is Sati's job and happens at this moment in the composed Atta product, but is **not** part of Vitakka V1.) The Focus is ready.

**Moment 2 — Think.** Free conversation. The system does extensive work in the background — routing decisions, MCP context pulling, waypoint extraction, optional Vāda invocation — without interrupting the user. State transitions are visible (eight UI states, see below) but never blocking.

**Moment 3 — Close.** The user clicks close. Claude is called once with the waypoints (or full conversation if waypoints are sparse). Two to four proposed conclusions are presented. User accepts, edits, rejects, or adds. Only what the user accepts is saved. The Focus is archived.

### The smart close mechanic

The close behavior depends on what actually happened during the Focus, not just on the declared mode.

For a **Project Thinking** Focus, the system always proposes conclusions. The mode declared this is work worth saving.

For an **Open Thinking** Focus, the system evaluates conversation density first. If the conversation was shallow (few exchanges, no clear resolutions, no waypoints extracted), the close screen shows: *"Nothing to save. Close?"* — zero friction, the conversation is archived.

If the Open Thinking Focus produced something — waypoints were extracted, a clear resolution emerged, the conversation was substantive — the system asks: *"Something real surfaced here. Would you like to save this as something to come back to?"* The user can name it and convert it to a Project Thinking subject, or decline. Nothing is forced.

This is the calibration that makes Vitakka work for both casual exploration and serious work without modes the user has to choose between.

---

## Progressive extraction — how waypoints work

A two-hour Focus can produce 50,000-100,000 tokens. Processing this as a single blob at close time would be too slow, too expensive, and would miss conclusions buried in the middle of tangents. Vitakka extracts conclusions throughout the Focus.

### The overlapping window pattern

Every 10 new exchanges in a Focus, the system runs an extraction on the last 15 exchanges — overlapping 5 with the previous window:

- Window 1: exchanges 1-15
- Window 2: exchanges 11-25 (overlap: 11-15)
- Window 3: exchanges 21-35 (overlap: 21-25)

The 5-exchange overlap ensures that conclusions which begin forming at the end of one window and resolve at the start of the next are never missed by a hard boundary.

### What the extraction does

A small fast model (default: Llama 3.2 8B running locally via Ollama, but the architecture is model-agnostic) reads each window with a simple task:

> *"Was something decided or resolved in this segment? If yes: one sentence starting with a verb. If no: return null."*

Output is one sentence or null. Runs asynchronously — the user never waits.

If the extraction returns a non-null result, it is saved as a **waypoint** — an intermediate conclusion candidate, invisible to the user, persisted in the `waypoints` table for this Focus.

### Why a small local model

The extraction task is high-frequency, repetitive, and well-bounded. Sending every window to Claude or Gemini would be expensive and add latency. A local Llama runs in milliseconds with zero token cost and is more than capable of "did something resolve in this segment" classification.

This is purely a performance and cost optimization for the extraction task. It is **not** the same as Sati's eventual LoRA fine-tuning (which is about behavioral pattern distillation across many Focuses). Vitakka V1 uses base Llama for extraction. No fine-tuning is involved.

### Four layers of safety — nothing is lost

| Layer | What it does | When it fires |
|---|---|---|
| Progressive extraction | Catches most resolutions as they form | Every 10 exchanges throughout the Focus |
| Raw messages in DB | Catches what extraction missed; full text always available | Throughout the Focus until archival |
| Close-time synthesis (Claude) | Reviews waypoints; falls back to full scan if sparse | When the user closes the Focus |
| User review screen | Catches what everything else missed; user can add | When the user reviews the close screen |

### Close-time synthesis

When the user closes the Focus:

1. The system gathers all waypoints from this Focus (typically 3-8)
2. Claude is called once with the waypoints and the Focus's declared intention
3. Claude's task: *"Given these waypoints, what are the 2-4 most important conclusions tied to the intention? Remove duplicates. Filter against the declared intention. Each must start with a verb."*
4. Cost: ~$0.01 per Focus (single call, ~2K tokens output)
5. Time: ~3 seconds

If the waypoints are sparse (fewer than 2 useful ones), Claude is given the full conversation (or a compacted version, see below) and asked to extract conclusions directly. This is the safety net for cases where progressive extraction missed too much.

The proposed conclusions appear on the close screen. The user accepts, edits, removes, or adds.

---

## Compaction — preserving reasoning lineage

A Focus can run for weeks. Its message history can grow beyond the practical context window of any LLM. The system compacts.

### What compaction is not

Compaction is not summarization. A summary loses information by default — it tells you *what was said* in fewer words. Compaction tells you *what was concluded and why* — preserving the structured cognitive state.

### What compaction preserves

When a Focus is compacted:

**Preserved:**
- The intention (always)
- All accepted conclusions (these are the building, not scaffolding)
- The reasoning chains that produced each accepted conclusion (which model said what, what evidence mattered)
- Alternatives considered and rejected (with the reasoning for rejection)
- Open questions still unresolved
- Artifacts attached to the Focus (always, by reference)
- Waypoints from the most recent N exchanges (default: last 30 exchanges) so progressive extraction can continue

**Discarded:**
- Verbatim chat exchanges older than the recent-N window
- Redundant artifacts (if the same artifact was discussed multiple times, the discussion compacts to "this artifact's relevance was: [conclusion]")
- Exhausted threads (if a tangent went nowhere and was abandoned, it compacts to a one-line note: "considered X — abandoned because Y")
- Tool call traces (the tool's response is preserved if it was used; the call mechanics are not)

### When compaction triggers

Compaction is automatic, not user-initiated. Triggers:

- Total token count exceeds 70% of the active model's context window
- Focus has been open for more than 30 days (regardless of size — long-running Focuses compact preventively)
- User opens a long-dormant Focus and the system needs to load context for the next message

Compaction runs in the background. The user sees: *"Tightening up the focus..."* — never blocks the conversation. The pre-compaction state is preserved as a snapshot for 7 days in case anything important was lost (debugging window).

### Compaction implementation

A dedicated Claude call with a prompt template that takes the structured Focus state (intention, conclusions, message history) and produces a compacted version following the preserve/discard rules above. The prompt is in `/packages/vitakka/prompts/compaction.md`.

This is one of the hardest pieces of the build. It is also the difference between Vitakka feeling like a thinking partner over weeks and feeling like a chat that gets dumber the longer you use it.

---

## Three routing patterns

Vitakka's job inside a Focus is to think with you and route to wherever the work needs to happen. Three patterns cover all cases.

### Pattern 1 — Routing to an LLM

The thinking is the work. The user's message is processed by:

1. The system loads relevant in-Focus context (artifacts, recent messages, accumulated conclusions)
2. A routing decision determines which LLM to use:
   - **Stakes detection** — does this question warrant adversarial pressure? If yes, invoke Vāda
   - **Domain match** — is this a reasoning question (Claude default), research question (Gemini default), creative question (could be any), code question (Claude default for now)
   - **User override** — if the user explicitly named a model ("ask Gemini..."), use that model
3. The selected model (or Vāda's reviewer chain) processes the question with full context
4. Response streams back to the user

Vāda is invoked invisibly — the user sees *"Thinking carefully — running a structured check on this..."* not "running 3-agent adversarial deliberation." A small icon next to the response indicates *"3 perspectives reviewed"* — clickable to drill down.

### Pattern 2 — Routing to a connected MCP

A specialised tool is connected via MCP. Vitakka selects it semantically per-message based on the question's content matched against tool descriptions. The tool executes inside the Focus.

- The user does not invoke the tool by name (though they can)
- Tool selection is bounded: top-3 candidates ranked by semantic similarity, never more than 6 active in a Focus
- The tool's response is fed back through Claude or Gemini to integrate with the conversation
- Tool calls and responses are logged in the Focus history (for waypoint extraction)

Connected tools include Herald, Google Maps, GitHub, Notion (read), image models, web search, anything with an MCP. The user manages connections in Settings → Connected Tools.

### Pattern 3 — Routing to an external tool that cannot be connected

The right tool has no MCP. It is private, paid, proprietary, or not integrated. Vitakka cannot call it. This is not a failure.

The flow:

1. The system thinks through the problem with the user inside the Focus
2. Vitakka identifies the right destination tool (NotebookLM for deep document analysis, a paid research database, a domain-specific app)
3. Vitakka prepares the user with the right questions, context, and order to use the destination tool well
4. The user goes to the destination tool. Executes. The execution lives there.
5. The user may or may not return. Both are fine.

If the user returns with findings, Vitakka helps make sense of them — reasoning over results with full Focus context, extracting conclusions. If the user does not return, the Focus record still exists. The intention is preserved. The routing is preserved. The context that made the routing possible is preserved.

> *Fragmentation happens when you go to the destination tool without having thought about what you needed first. It does not happen when Vitakka sent you there with a clear intention, five specific questions, and a record of why.*

---

## The eight UI states

The thinking partner is never silent. State transitions are visible. Every motion explains what the system is doing.

| State | When it occurs | What the user sees |
|---|---|---|
| `idle` | No active Focus | Recent Focuses panel, opening question ready |
| `thinking` | Loading context, evaluating routing | *"Reading what we have on this..."* — sentence, not spinner |
| `routing` | Tool/model selected, brief being assembled | *"Routing to Claude — architecture question"* — named, reasoned |
| `tool_running` | MCP tool executing | *"Asking Herald to analyse the job description..."* — named, with progress |
| `debating` | Vāda invoked, multi-agent debate in progress | Two or three named agent cards, round indicator (1/3, 2/3), each contribution streams live |
| `synthesizing` | Assembling final answer from debate | *"Synthesizing..."* — brief, then answer streams |
| `responding` | Streaming the final answer | Clean, readable, arrives progressively |
| `error` | Something failed | *"Could not reach Herald. Thinking with Claude instead."* — never silent, always shows the recovery |

### State management rules

- All transitions go through a single `setVitakkaState()` function — no scattered state mutations
- Every transition shows visible progress within 300-500ms
- The system never goes silent for more than 2 seconds without showing what it's doing
- Errors always show the recovery path, never just *"something went wrong"*

---

## Vitakka system architecture

### The flow

```
USER opens a Focus
    "What are you thinking about?"
        ↓
INTERFACE + MCPs (the entry point)
        ↓
CONTEXT LOADING + ROUTING DECISION
    Load: artifacts, recent messages, accumulated conclusions
    Route: stakes detection, domain match, user override
    [Cross-Focus memory loading is Sati's job, NOT Vitakka V1]
        ↓
THINKING (the work)
    Claude reasons. Gemini researches. Vāda debates if invoked.
    Connected MCPs called when relevant.
    All tool inputs and outputs validated by Zod.
        ↓
PROGRESSIVE EXTRACTION (background)
    Every 10 exchanges: waypoint extraction over last 15
    Llama (local) outputs: one sentence or null
    Waypoints saved invisibly
        ↓
USER closes the Focus
        ↓
CLOSE-TIME SYNTHESIS
    Claude given waypoints + intention
    Proposes 2-4 conclusions
    User accepts, edits, removes, adds
        ↓
ARCHIVAL
    Accepted conclusions saved
    Messages archived (hidden from UI but preserved)
    Focus closed
    [Sati would persist conclusions for cross-Focus retrieval —
     not part of Vitakka V1]
```

### Layer responsibilities

| Layer | Role | Owns |
|---|---|---|
| **Interface** (Next.js) | The Focus surface, the eight UI states, MCP integration UX | All visual and interaction concerns |
| **Routing brain** | Stakes detection, model/tool selection, Vāda invocation decision | The "what should happen next" question |
| **Vāda invocation** | Calling the existing Vāda MCP server when stakes warrant | The deliberation primitive (Vāda V1, already built) |
| **Multi-vendor LLM client** | Calls Claude / Gemini / DeepSeek / GPT / Grok with consistent interface | Model-agnostic LLM access |
| **MCP orchestration** | Tool discovery, semantic ranking, dynamic per-message selection | All connected-tool logic |
| **Progressive extraction** | Waypoint extraction during the Focus | Local Llama-based background extraction |
| **Compaction** | Reasoning lineage preservation when context overflows | Long-running Focus survival |
| **Close-time synthesis** | Claude proposes conclusions from waypoints | The close screen |
| **Persistence (Drizzle/Postgres)** | Focuses, messages, artifacts, waypoints, accepted conclusions | All state |

---

## Technical stack

| Layer | Tool | Role | Cost |
|---|---|---|---|
| Frontend | Next.js 16 + React 19 + Tailwind v4 + shadcn/ui | The interface | Free |
| Hosting | Vercel | Serverless, global | Free tier |
| Monorepo | Turborepo + Bun (existing Atta monorepo) | Code organization | Free |
| Auth | Clerk (existing Atta single-app) | Multi-user sessions | Free (10K MAU) |
| Database | Neon Postgres + pgvector | All Vitakka tables | Free tier |
| ORM | Drizzle | TypeScript DB queries | Free |
| Rate Limiting | Upstash Redis (existing) | Protect runaway calls | Free tier |
| Schema validation | Zod | All tool inputs/outputs | Free |
| Multi-vendor LLM | `@atta/adapter-langgraph` (existing) | Routes by model prefix to Anthropic/Google/OpenAI/xAI | Free, user pays providers |
| Vāda invocation | `@atta/engine` (existing) via MCP | Deliberation when stakes warrant | Free, user pays providers |
| Local extraction model | Llama 3.2 8B Instruct via Ollama | Waypoint extraction | Free, runs locally |
| Agent framework | Mastra | Multi-agent + MCP orchestration inside a Focus | Free (Apache 2.0) |
| MCP discovery | registry.modelcontextprotocol.io + glama.ai | Marketplace browsing | Free |
| Artifact storage | Notion MCP (or generic file storage MCP) | Artifact content | Free, user's choice |
| Observability | Existing Atta logging | All routing decisions logged | Free |

The stack reuses existing Atta infrastructure aggressively. New for Vitakka V1: the Focus model, progressive extraction, compaction logic, the eight UI states, MCP orchestration inside a Focus.

### Database schema (Vitakka-specific tables)

```
focuses
  id, user_id, intention, mode (open|project), created_at,
  closed_at (nullable), state, last_active_at

messages
  id, focus_id, role (user|assistant|tool), content, model_used,
  tool_call_data (jsonb, nullable), created_at

artifacts
  id, focus_id, type (doc|code|image|data|link),
  storage_ref (Notion page id, R2 key, etc), metadata (jsonb),
  added_at

waypoints
  id, focus_id, text, source_window_start, source_window_end,
  extracted_at, used_in_close (boolean default false)

accepted_conclusions
  id, focus_id, text, accepted_at, edited_from_proposal (boolean)

connected_mcps_per_focus
  focus_id, mcp_server_id, attached_at
```

### Cross-Focus tables that are NOT in Vitakka V1

These belong to Sati when it ships:
- Cross-Focus conclusion retrieval index
- Conclusion vector embeddings table
- Pattern distillation training queue
- LoRA adapter version tracking
- Cross-Focus relationship graph

Do not build these in Vitakka V1. They expand the scope past what Vitakka should validate alone.

---

## Production requirements (from Dr. Miradi's audit, scoped to Vitakka)

The original v7 spec captured 15 production requirements identified by Dr. Maryam Miradi. Below they are scoped to Vitakka V1 only — items that belonged to cross-Focus or LoRA territory have been moved to Sati's eventual spec.

| # | Requirement | Phase |
|---|---|---|
| R1 | Formal eval suite for routing decisions: 50-100 routing test cases. Score >= previous - 5% to promote any routing change. | Before V1 ship |
| R2 | Two explicit flow types in Mastra: agentic (open-ended) and deterministic (fixed steps). Used appropriately per pattern. | V1 |
| R3 | Thumbs up/down on every routing decision. Feeds quality data for future Sati training. | V1 |
| R4 | Deployment checklist: CI/CD, rollback, schema migration, key rotation, error monitoring. | V1 |
| R5 | Prompt audit: remove any sentence in any prompt that does not change behavior. | V1 |
| R6 | Each MCP must pass standalone tests before registration. Fail = not available. | V1 |
| R7 | Routing < 500ms. First response token < 2s. Vāda invocation visible within 1s. | V1 |
| R8 | Explicit routing rules documented and testable: Claude for X, Gemini for Y, Vāda for Z. | V1 |
| R9 | All scoring, counting, ranking in TypeScript. Models interpret, never calculate. | V1 |
| R10 | Jest suite: all Zod schemas, routing logic, Focus lifecycle, compaction, MCP integration. 80%+ coverage. | V1 |
| R11 | 6 flow diagrams before any code: Focus open, routing, MCP call, Vāda invocation, compaction, close. | Before V1 |
| R12 | Define what the local extraction model does NOT know. Test with fresh Llama instance. | V1 |
| R13 | Structured document extraction before any document reaches a tool. | V1 |
| R14 | Vāda invocation: max 3 rounds, kill switch, Reflexion-style self-correction. (Inherited from Vāda V1.) | V1 |

Items removed from the Vitakka V1 list because they belong to Sati:
- LoRA training data quality eval
- Cross-Focus retrieval accuracy benchmark
- Pattern pruning audit
- Multi-month distillation eval gates

---

## Development plan

### Phase 0 — Before any code (Week 0)

Highest-leverage work in the entire build. Nothing is coded until everything here exists.

- Six flow diagrams in `/docs/flows/`: Focus open, single routing, MCP call, Vāda invocation, compaction, close
- `/docs/routing-matrix.md`: Claude for X, Gemini for Y, Vāda for Z, MCP for W — explicit and testable
- `/docs/ui-states.md`: all 8 states with transitions and what the user sees in each
- All Zod schemas for tool inputs/outputs before any MCP code
- Compaction prompt drafted and tested standalone with sample long conversations
- Test the Official MCP Registry API: confirm `curl https://registry.modelcontextprotocol.io/v0/servers?limit=3` works
- UX spec: Focus opening screen, close screen, agent visualization, debate UI, artifact panel, onboarding
- The eval suite (R1): 50 routing test cases with expected outcomes

### Phase 1 — Core Focus + extraction (Weeks 1-3)

**Goal:** Single Focus works end-to-end. User opens, thinks with Claude, closes with conclusions.

**Week 1 — Infrastructure**
- New Vitakka package in monorepo: `apps/vitakka/`, `packages/vitakka-routing/`, `packages/vitakka-extraction/`
- Drizzle schema for Vitakka tables
- Existing `@atta/auth`, `@atta/db`, `@atta/ui` reused

**Week 2 — Core Focus**
- Next.js interface: opening question, Focus surface, message streaming
- Vercel AI SDK with Vitakka system prompt
- Single-model routing (Claude default) working
- Close screen with manual conclusion entry (no extraction yet)

**Week 3 — Progressive extraction + close synthesis**
- Local Llama setup via Ollama for waypoint extraction
- Overlapping window extraction logic (every 10 exchanges, last 15)
- Waypoint persistence
- Claude-based close-time synthesis from waypoints
- The eight UI states wired up

### Phase 2 — Multi-model + MCPs + Vāda invocation (Weeks 4-6)

**Goal:** Vitakka can route to any model, call MCPs, invoke Vāda when stakes warrant.

**Week 4 — Multi-vendor**
- Reuse `@atta/adapter-langgraph` for multi-vendor routing
- Routing decision logic: stakes detection, domain match, user override
- Routing thumbs up/down (R3)

**Week 5 — MCP orchestration**
- MCP registry UI (manual URL + health check + browsable from Official Registry)
- Per-message tool selection (semantic ranking)
- Herald connected end-to-end as the proof case
- Notion MCP for artifacts

**Week 6 — Vāda invocation**
- Stakes detection heuristic (V1: question complexity + Focus mode + user signal)
- Vāda invocation via existing MCP (`vada__deliberate` or `vada__consult`)
- The `debating` UI state with named agent cards
- Drill-down view of the debate (collapsed by default)

### Phase 3 — Compaction + production hardening (Weeks 7-8)

**Goal:** Vitakka survives long Focuses. All production requirements met.

**Week 7 — Compaction**
- Compaction prompt finalized
- Compaction triggers wired (token threshold, time threshold, dormant-Focus open)
- Pre-compaction snapshot for 7-day debugging window
- Test with synthetic long Focuses

**Week 8 — Production hardening**
- All R1-R14 requirements verified
- Error states for every routing pattern
- Rate limiting, timeouts, fallbacks
- First non-Dani user testing

### Phase 4 — First-user validation (Weeks 9-10)

**Goal:** Vitakka V1 ships to AttaLabs. Validation begins.

- Public deployment to `vitakka.attalabs.dev`
- AttaLabs landing page integration ("This is the lab. Vitakka is the situated cognition layer.")
- Recruit 5-10 first users (founders, researchers — the wedge persona)
- Track usage: do users return to the same Focus? Do they accept proposed conclusions? Do they invoke Vāda explicitly or rely on automatic invocation?

The first-user test for Vitakka V1 is in `atta-build-strategy.md`. Pass criteria: a founder uses Vitakka for a real problem over a week, returns to the same Focus voluntarily, reports that "I didn't have to re-explain everything." Fail criteria: users start a new Focus each session.

---

## Open questions (to resolve before or during build)

### The Focus model

- **Maximum Focus duration before suggesting a close?** A 4-hour session with 200 exchanges may be better served as two Focuses. V1 default: no maximum, but suggest close after 4 hours of inactive cumulative time.
- **Suggested continuations from recent Focuses on the opening screen?** Pro: useful for picking up. Con: anchoring bias. V1: disabled by default, opt-in setting.

### Routing and Vāda invocation

- **Stakes detection heuristic — what triggers automatic Vāda invocation?** V1 candidates: question complexity (long, multi-part, decision-shaped) + Focus mode (Project Thinking weights toward invocation) + explicit user signal ("I want a strong answer," "what do you all think"). Calibrate against the routing eval suite.
- **What happens when the user explicitly disagrees with the routing?** *"Don't use Vāda — just give me Claude's view."* V1: respect explicit user override always; log the disagreement for routing improvement.

### Compaction

- **What's the right token threshold for compaction trigger?** V1 default: 70% of active model's context window. May tune based on real Focus sizes.
- **How does the user know compaction happened?** V1: a small indicator in the Focus header showing "compacted N times" — clickable to see what was preserved. Defaults invisible.
- **Can the user veto compaction or restore from snapshot?** V1: no veto (compaction is automatic). Snapshot restoration available for 7 days via debug command.

### Smart close

- **How does the system evaluate "conversation density" for the smart close?** V1 candidates: number of waypoints extracted, conversation length, presence of decision-shaped content (verb-led conclusions in the messages). Simple heuristic for V1, refine with usage.
- **The Open Thinking → Project Thinking conversion at close — what does the saved Project Thinking look like?** V1: the user names it, accepts or edits proposed conclusions, and it becomes a Project Thinking subject for future Focuses.

### Single-Focus boundaries

- **What happens when a user has multiple Focuses running simultaneously?** V1: support, but only one is active at a time. Switching is explicit. No cross-Focus contamination.
- **Can a Focus be reopened after close?** V1: yes, with a "Reopen this Focus" button. The accepted conclusions persist; the Focus moves back to active state.

### Non-Focus interactions (open from v7)

The original v7 spec asked: *"How do quick questions work without forcing the user into a full Focus?"* This remains open.

V1 candidates:
- **Lightweight query mode** — for "What did I decide about X?" style retrieval, no Focus required, returns a card of relevant accepted conclusions across Focuses. **(Note: this requires Sati's cross-Focus retrieval. Not in Vitakka V1.)**
- **Very short Focus** — opens a Focus with the question, runs through routing, returns one answer, auto-closes if no further interaction within 2 minutes. Conclusion may or may not be saved depending on smart close.

V1 decision: defer the lightweight query mode (Sati territory). Implement very short Focus as the V1 answer to quick questions. Revisit when Sati ships.

---

## What this spec does not include

To stay disciplined about scope:

- **Sati's responsibilities** — cross-Focus memory, indexation, LoRA fine-tuning, behavioral pattern distillation, the 5-month accumulated cognition story. These are in Sati's eventual spec.
- **Atta consumer product UX** — the composed product (Vitakka + Sati) lives at its own domain when ready. AttaLabs hosts Vitakka the lab component.
- **Cetana's deliberation-guided execution** — V4+ direction, not in Vitakka's scope.
- **Multi-user collaboration** — not in V1. Vitakka is single-user. Multi-user shared Focuses are post-V1.
- **Mobile** — V1 is desktop-first web. Mobile-friendly responsive layout is in V1; native mobile app is post-V1.
- **Pricing and business model** — open across the ecosystem. Vitakka V1 ships with BYOK like Vāda. Pricing decisions activate at Atta consumer product, not at Vitakka V1.

---

## What is decided (to lock before build)

- **Tagline:** *Where the thinking lives.* (For Vitakka specifically. Atta has its own tagline.)
- **Unit of work:** Focus — two modes (Open Thinking, Project Thinking), three moments (open, think, close), smart close
- **In-Focus capabilities:** artifacts, MCPs (read-from), conversation history, accumulated conclusions, three routing patterns
- **Extraction:** progressive waypoints via local Llama, every 10 exchanges over last 15, four layers of safety
- **Synthesis:** Claude reviews waypoints at close, proposes 2-4 conclusions, user accepts
- **Compaction:** preserves reasoning lineage; automatic; snapshot for 7 days
- **Vāda invocation:** invisible when stakes warrant, explicit when user requests, max 3 rounds, drill-down available
- **UI states:** 8 explicit states, never silent, sentences not spinners
- **Stack:** Next.js + Tailwind + shadcn/ui + Mastra + Drizzle + Neon + Clerk (reusing Atta monorepo infrastructure)
- **Scope discipline:** Vitakka knows about its own Focus only. Cross-Focus is Sati's job.
- **Public surface:** `vitakka.attalabs.dev` on AttaLabs

---

## What is open (to resolve as build progresses)

- Stakes detection heuristic for automatic Vāda invocation — calibrate against routing eval suite
- Maximum Focus duration before suggesting a close — V1 has no max, may add
- Suggested continuations on the opening screen — V1 off, may add as opt-in
- Conversation density evaluation for smart close — simple heuristic V1, refine with usage
- Open Thinking → Project Thinking conversion UX
- Multiple simultaneous Focuses (only one active at a time in V1)
- Mobile native app — post V1
- Pricing — defer to ecosystem-level decision

---

## Related documents

- `vitakka-human.md` — narrative version of this document (the human counterpart)
- `atta-ecosystem-vision.md` — where Vitakka sits in the Atta ecosystem
- `atta-build-strategy.md` — sequencing, hide-the-work discipline, first-user tests
- `atta-market-research.md` — competitive landscape
- `vada-state.md` — current state of Vāda V1, the deliberation engine Vitakka invokes
- `vada-product-spec.md` — Vāda's own technical specification

This spec is the canonical technical authority for Vitakka V1. When implementation diverges from this spec, the spec gets updated to match reality, then the code gets reviewed against the updated spec.

**Vitakka · Specification v1.0 · May 2026**
