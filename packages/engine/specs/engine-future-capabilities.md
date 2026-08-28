# Atta Engine — Future Capabilities and Schema Evolution

**Date captured:** April 26, 2026
**Status:** Forward-looking architecture document. Updated as capabilities are added.
**Companion documents:** `mastra-vs-langgraph.md` (executor choice)

---

> **Version note (added 2026-08-25).** The body below was written in April 2026, when the shipped schema was `1.0` and `2.0` was an unclaimed version number this document speculatively assigned to memory, sub-graphs, and interrupts. That is no longer what happened: `2.0` shipped in May 2026 as the universal round-based schema (`generic-flow-refactor.md`), and none of the capabilities sketched below landed in it. Read every "Schema 2.0 introduces …" heading below as "a future schema version introduces …" — the capability analysis and the runtime-support findings remain accurate; only the version numbers were overtaken. Capability 7 at the end of this document is the first of these capabilities to acquire a real, committed consumer.

## Why this document exists

The engine schema supports the deliberation patterns Vāda uses. As Vinaya, Vitakka, future Atta products, and external consumers come online, the schema needs to grow to express new capabilities.

This document captures **what capabilities are coming, what runtime support already exists, and how the schema evolves to expose them.**

It is not a roadmap with dates. It is a capability inventory with a sequencing principle: schema evolution follows actual product need, not speculative addition.

---

## The principle

The engine schema grows when a real consumer needs to express something the schema can't currently express. Not before.

Every speculative addition is a maintenance burden, a backward-compatibility concern, and a way for the schema to drift from real use. Schema growth must be earned by use cases, not anticipated by architecture.

That said, knowing what's coming is useful — it helps shape current decisions so the schema evolution is smooth rather than disruptive.

---

## Today: schema 1.0 (Vāda)

What schema 1.0 expresses (post Phase 7.2):

- Agent definitions: name, system prompt, model, tools, classifier mode, output format
- Rounds-based flows: round count, agents per round, message templates, synthesis, audit, revision
- Reviewers-based flows: parallel independent reviewers, response concatenation
- Defaults: model, max_tokens
- Metadata: id, display_name, description, experimental flag, benchmarked flag

What schema 1.0 does NOT express:

- Memory access (any kind)
- Sub-graph invocation
- Human-in-the-loop pauses
- Custom tool definitions (only tool name references)
- State sharing across deliberations
- Async background work / scheduling

The next sections describe each missing capability, the runtime support that exists for it, and how it would be introduced into the schema.

---

## Capability 1: Memory (relevant for Vitakka)

### What it is

Two memory layers used in patterns LangGraph supports natively:

- **Short-term (thread-scoped):** state automatically persisted per conversation/session, recallable at any point in the same thread. Survives crashes, supports time-travel.
- **Long-term (cross-thread):** namespaced stores (typically scoped per user) holding facts, preferences, and learned context. Queryable, searchable, persistent across all threads for a user.

### Runtime support

Already in LangGraph:
- `MemorySaver` for short-term in-memory development
- `PostgresSaver`, `RedisSaver`, `SqliteSaver` for production short-term
- `Store` interface for long-term with namespacing
- Custom backends supported (e.g., AgentCoreMemoryStore for AWS Bedrock)
- `pre_model_hook` and `post_model_hook` patterns for memory read/write

Adapter would need: pluggable memory backends, namespace passing from the spec to the runtime.

### What this looks like in the schema

Schema 2.0 introduces `memory:` blocks at multiple levels:

```yaml
schema_version: "2.0"
id: vitakka-conversation-v1

memory:
  short_term:
    backend: postgres                # or "redis", "sqlite", "memory-saver"
    thread_id: "{{userId}}-{{conversationId}}"
  long_term:
    backend: postgres
    namespace: "user-{{userId}}"

agents:
  - name: ConversationPartner
    memory_access:
      reads_long_term: true          # this agent reads from the long-term store
      writes_long_term: true         # and writes to it
      retrieval_query: "{{userMessage}}"
    system_prompt: |
      Your long-term memories about this user:
      {{longTermMemories}}
      
      Current conversation:
      {{thread}}
```

Two design questions to resolve when this gets built:

**Q: Where does memory configuration live in the YAML hierarchy — top-level or per-agent?**
Top-level for backend / store identity (one Postgres connection per spec). Per-agent for read/write access patterns and retrieval queries (different agents may have different memory needs). Both, with sensible defaults.

**Q: Are memories typed in the schema?**
For long-term memory, yes — the schema should support a memory type system (`facts`, `preferences`, `summaries`) so retrieval can be scoped by type. This is what AgentCoreMemory does natively.

### Open questions for memory

- How does memory interact with the immutability principle? A YAML that uses memory produces different output for different users at different times. Benchmark history per YAML must factor in memory state. Either mark such YAMLs as non-benchmarkable, or capture memory state hashes per benchmark run.
- How does memory interact with BYOK? If memory contents include user secrets or PII, they must remain on the user's infrastructure. Cross-thread Store backed by user-controlled storage may be required for some use cases. The architecture supports this via custom backends.

---

## Capability 2: Sub-graph invocation (relevant for ecosystem composition)

### What it is

A complete graph from one spec can be invoked as a single node within another spec's graph. The pattern: "Vitakka's conversation graph includes a node that runs a Vāda deliberation when the user asks for one."

The sub-graph runs in its own context, returns its result to the parent, and the parent continues. Sub-graphs can have their own state, their own checkpointing, their own memory.

### Runtime support

Already in LangGraph:
- Sub-graph composition is first-class
- A compiled graph can be passed as a node to a parent StateGraph
- State can be passed between parent and sub-graph via state schema mapping

### What this looks like in the schema

Schema 2.0 introduces `subgraph:` node references in flow definitions:

```yaml
schema_version: "2.0"
id: vitakka-with-deliberation-v1

agents:
  - name: ConversationPartner
    # ... normal agent config

flow:
  rounds:
    count: 1
    agents: [ConversationPartner]
  
  # When the conversation calls for it, invoke a Vāda deliberation sub-graph
  conditional_subgraph:
    trigger: "{{conversationPartner.requestsDeliberation}}"
    spec: brokered-trio-v1                  # references another YAML by id
    inputs:
      question: "{{conversationPartner.deliberationQuestion}}"
    outputs:
      deliberation_result: "{{conclusion}}"
    after: ConversationPartner
```

### Open questions for sub-graphs

- How does the engine resolve sub-graph references at compile time vs runtime? Compile-time (eager loading) is cleaner but rejects YAMLs whose sub-graphs aren't yet registered. Runtime (lazy loading) is more flexible but defers errors. Probably compile-time for known sub-graphs, runtime for full-content invocations (matching the existing pattern for top-level YAMLs).
- Can sub-graphs invoke sub-graphs? Yes — recursive composition is supported in LangGraph. Schema needs to express depth limits to prevent runaway recursion.
- How is cost calculated for a spec containing sub-graphs? The cost calculator (Atta Labs Phase 2) walks the parent graph and recursively calculates sub-graph costs. Total is the sum.

---

## Capability 3: Human-in-the-loop / Principal-terminated loops (relevant for Vāda Phase 9)

### What it is

A graph node that pauses execution and waits for external input before continuing. Useful for:
- Principal-terminated deliberation loops (Phase 9 / OQ-C in `vada-state.md`)
- User approval gates in Vitakka conversations
- Manual review steps in compliance-heavy workflows

### Runtime support

Already in LangGraph: `interrupt()` primitive. The graph pauses, the state is checkpointed, and execution resumes when the external system provides the input.

### What this looks like in the schema

Schema 2.0 introduces interrupt nodes within flows:

```yaml
schema_version: "2.0"
id: brokered-real-case-v1

flow:
  rounds:
    count: "principal_terminated"          # not a fixed number
    max: 10                                # safety cap
    agents: [Strategist, Critic, "Devil's Advocate"]
    after_each_round:
      type: interrupt
      prompt_principal: "Continue deliberation? (y/n) Provide additional guidance if useful."
      principal_response_var: principalDirective
      terminate_when: "{{principalDirective}} == 'n'"
```

### Open questions for interrupts

- How does the consuming application surface the interrupt to the user? This is a UX concern, not an engine concern. The engine signals "we're interrupted, here's the prompt." The Caller (Claude Desktop, Vitakka UI, etc.) handles presentation.
- How does the interrupt interact with MCP? MCP is fundamentally request-response; an interrupt mid-execution doesn't fit the protocol naturally. Either: (a) the MCP server returns control on interrupt, the caller invokes again with the principal's response (multiple round trips), or (b) MCP gets streaming/long-lived support. Option (a) works today; option (b) requires MCP protocol evolution.

---

## Capability 4: Custom tool definitions (relevant for any tool-heavy product)

### What it is

Today the schema references tools by name (`web_search`, `web_fetch`). The actual implementations are hardcoded in the adapter's tool registry. Tools that are useful for one consumer (e.g., a custom database query tool for Vitakka) can't be expressed in YAML — they require adapter changes.

### Runtime support

LangGraph's ToolNode handles arbitrary tools defined as functions with input schemas. The runtime is unaware of the tool's identity; it just calls the function and integrates the result.

### What this looks like in the schema

Schema 2.0 introduces tool definitions inline or by external reference:

```yaml
schema_version: "2.0"
id: vitakka-with-custom-tools-v1

tools:
  - name: query_personal_journal
    description: Query the user's personal journal for entries matching a search term
    input_schema:
      type: object
      properties:
        query: { type: string }
        date_range: { type: string }
      required: [query]
    implementation:
      type: external                       # or "inline" for engine-provided
      handler_module: "@vitakka/tools/journal"
      handler_function: queryJournal

agents:
  - name: ReflectivePartner
    tools: [web_search, query_personal_journal]
    # ...
```

External tool implementations live in modules registered with the adapter. The engine validates the schema; the adapter resolves and invokes the implementation.

### Open questions for custom tools

- Can YAMLs from one consumer reference tools defined in another consumer's namespace? Probably not by default — tools are scoped to the consumer that registers them. Cross-consumer tools would require an explicit shared registry.
- How does this interact with BYOK? Tool implementations may need user credentials (e.g., journal access tokens). Tool implementations have access to per-call context where credentials can be passed; the schema doesn't need to encode them.

---

## Capability 5: Async background work (relevant for long-running flows)

### What it is

A deliberation or conversation step that initiates background work, returns immediately, and continues when the work completes. Useful for:
- Long-running research tasks ("the agent is investigating, check back in 10 minutes")
- Scheduled actions ("send this summary daily at 9am")
- External API calls with high latency

### Runtime support

LangGraph's checkpointing + interrupt pattern can express this, but it's not as ergonomic as some specialized workflow engines. May require the adapter to provide additional primitives.

### What this might look like in the schema

This is more speculative — no concrete consumer demand yet. Likely schema 3.0+:

```yaml
schema_version: "3.0"
flow:
  steps:
    - type: async_task
      agent: Researcher
      timeout: 30m
      on_completion: continue_with[Synthesizer]
      on_timeout: fallback_to[FastSynthesizer]
```

### Open questions for async work

- Is this an engine concern or a consumer-orchestration concern? Vitakka may handle "schedule this for later" at the application layer rather than expressing it in the spec. The engine's role is to support what fits naturally; "spec describes a single execution, scheduling is external" is a defensible boundary.

---

## Capability 6: Cognitive routing in YAML (relevant for adapter consolidation)

### What it is

The classifier (`auto`/`skip`/`always_tools`) controls when an agent gets tools at runtime. Today's classifier is built into the adapter as a Haiku-call before each round. Future: more sophisticated routing logic — multiple classifiers chained, role-based routing, cost-aware routing.

### Runtime support

Adapter-side. LangGraph supports this via classifier nodes that route to different downstream paths.

### What this might look like in the schema

Schema 2.0 might extend `classifier:` to support more modes and parameters:

```yaml
agents:
  - name: AdaptiveStrategist
    classifier:
      mode: chain                          # not just auto/skip/always_tools
      stages:
        - intent: "is this a research question?"
          if_yes: tools_on_with_budget[5]
        - intent: "is this a math question?"
          if_yes: tools_off
        - default: tools_on_with_budget[2]
```

### Open questions for cognitive routing

- This may be over-engineering. The current `auto` mode (Haiku-driven decision per turn) is already adaptive. Adding chained classifiers should wait for empirical evidence that single-classifier routing is insufficient.

---

## Capability 7: Lifecycle execution — tool-use steps and an event surface (in flight)

### What it is

Every node the engine compiles today calls a model with a rendered prompt and returns text. That is the only node shape. A consumer that wants the engine to *run an engineering lifecycle* — provision a worktree, edit files, commit, open a PR, merge — cannot express any of it.

This is the first capability in this document with a committed consumer rather than a speculative one. Vinaya's roles (Brief Author, Coder, Reviewer, Archivist) are prose that separate CLI sessions interpret one turn at a time; the target is that they become a YAML flow the engine runs. A task flow file *is* the Developer role. A tranche flow embeds task flows; a milestone flow embeds tranche flows — one mechanism, three altitudes. Mission Control is the second consumer, and it needs the event half specifically.

### Runtime support

More exists than is obvious, which is why this capability is smaller than it first appears:

- **Tool loops already run.** `custom-tool-loop.ts` implements client-side tool execution for Anthropic and OpenAI-compat vendors, and `adapter.customTools` accepts a `CustomToolHandlerMap`. `webSearchHandler` is the shipped example. What is missing is a way to bind a *YAML-declared* tool to a handler — `CustomToolSpecSchema` carries `{name, description, parameters}` with no implementation field, so handlers must be hand-registered in TypeScript by the caller.
- **An event contract already exists.** `packages/ui/engine-flow/events.ts` declares a `FlowEvent` union and a `FlowEventSource` interface, and `FlowGraph.tsx` subscribes to it. The only implementation is `mockEventDriver.ts`, which fabricates a plausible sequence from a static Plan. There is a producer-shaped hole, not a missing design.
- **Real execution events do flow today**, but only inside Vāda's web route handler, in the v1 SSE vocabulary (`agent_completed`, `state_changed`, `synthesis_complete`). The generic flow refactor's PR 3 designed a replacement vocabulary (`round_started`, `round_completed`, `revision_started`) and was deferred; it was never built. Any work here must join the existing producer and consumer rather than adding a fourth vocabulary.

### What this looks like in the schema

A Flow carries `rounds` **XOR** `steps` — never both. This is the load-bearing design choice: `compileFlow` detects shape from `rounds` topology and emits node ids that the adapter, `resolveAuditChain`, the route handler, and `flow-helpers.ts` all depend on. Replacing `rounds` would force the OQ-I generic-walker refactor and break every existing consumer; adding `steps` alongside it does not.

```yaml
schema_version: "3.0"
id: vinaya-task

inputs:                       # flows are parameterized; doubles as event correlation
  issue: { type: number, required: true }
  tranche: { type: string, required: true }

tools:                        # bindings to real implementations, not names in a fixed registry
  - { name: shell, kind: shell, cwd: "{{worktree}}" }
  - { name: gh, kind: shell, command: gh }
  - { name: check, kind: function, module: "@attalabs/vinaya", export: runCheck }

steps:                        # ordered and heterogeneous, unlike rounds[] of agents
  - { id: brief, type: agent, agent: BriefAuthor }
  - { id: code, type: agent, agent: Coder, memory: persistent }
  - id: review
    type: parallel
    steps:
      - { id: code-review, type: agent, agent: Reviewer }
      - { id: security, type: agent, agent: Security }
    gate:                     # branches on a structured verdict field
      when: "code-review.verdict != APPROVE || security.verdict != PASS"
      action: revise
      target: code
      max_revisions: 3
  - { id: verify-principal, type: halt, resume_on: human }
  - { id: merge, type: step, tool: gh, args: [pr, merge, "{{pr}}", --squash] }
```

Six schema changes are forced by that file:

1. **`steps[]`** — ordered, heterogeneous, alongside `rounds[]` rather than replacing it. **A first, narrower cut of this shipped**, still under `schema_version: "2.0"`, not the `"3.0"` sketched here: `steps[]` as an XOR alternative to `rounds[]` (never both), each step an `AgentStep` (launch config — role, permission, working directory, turn ceiling, resume — no prompt binding beyond a template) or a `MechanicalStep` (below). No `inputs`, no `tools` bindings, no `type: parallel`/`type: halt`/`gate` yet — those remain exactly as speculative as the rest of this document.
2. **`inputs`** — a flow is parameterized by what it operates on, and those keys are what correlate its events.
3. **`tools` with real bindings** — shell, `gh`, or an exported function, closing the `CustomToolSpecSchema` gap above.
4. **`type: step`** — a mechanical node with no LLM turn. Merge, tag, and `npm publish` are `gh`/shell calls with no model in them, and today every node requires an agent with a `system_prompt`. **Shipped as `MechanicalStep` (`type: 'mechanical'`, an `action` string)** alongside the `steps[]` cut above — narrower than the tool-binding vision in point 3: an action name, not yet a real shell/function binding.
5. **`type: halt`** — a fourth action beside `abort | continue | revise`, so an escalation can queue for a human instead of ending the run.
6. **Deterministic gates and durable step state** — `on_failure.signal` today is `contains | equals | matches` against an agent's own prose, and `buildRevisionCondition` ships only `contains`. A review verdict should branch on a structured field, not a substring. Separately, the revision loop re-enters its target cold, so a Coder loses everything it learned in the prior round.

Composition is the same file shape one altitude up: a tranche flow whose `steps` include `{ type: subflow, flow: vinaya-task, for_each: "{{ready_tasks}}" }`, and a milestone flow that does the same over tranche flows.

### Relationship to the capabilities above

This capability overlaps three that were speculative when this document was written, and supersedes their framing rather than duplicating it. Capability 2 (sub-graph invocation) is the `type: subflow` step. Capability 3 (human-in-the-loop) is `type: halt`. Capability 4 (custom tool definitions) is the `tools` binding. Each was described above as awaiting a consumer; Vinaya's lifecycle is that consumer, and the shapes sketched here are the ones a real use case produced.

### Open questions for lifecycle execution

- `PlanNodeKind` and `PlanNodeRole` are read by **different consumers, for different purposes**, and a new node type has to satisfy both. The adapter routes *execution* on `role` (`adapter.ts` branches on `terminal`/`audit`), so a kind alone runs nothing. But `kind` is not inert: `packages/ui/engine-flow/planToVisualNodes.ts` reads it at roughly a dozen sites — filtering non-renderable nodes (`system-sentinel`, `revision-terminal`), inferring the workflow shape, and selecting the renderer (`synthesizer` → `synthesisNode`, `auditor` → `auditNode`) — and that path is reached from Vāda's live `/teams/[slug]` route through `FlowTab`/`FlowVisualizer`. So a new kind the renderer does not know falls through those filters and selectors silently. Land the role for execution, the kind for rendering, and update the renderer in the same breath. **The `agent-spawn`/`mechanical` node types landed both members together for exactly this reason** — but the renderer half is a compile-safety exclusion only (a one-line filter so the union typechecks), not the "update the renderer in the same breath" this bullet calls for: neither kind renders as anything yet, that's a separate, later piece of work. `PlanNode` itself also had to become a discriminated union rather than gain more optional fields, since an agent-spawn/mechanical node has no `Plan.agents` entry to resolve — the same shape-vs-optional-fields choice this document's `rounds`/`steps` XOR already made at the `Flow` level, now made again at the `PlanNode` level.
- How far does the scheduler's awareness reach? A tranche's conflict rule binds across sub-flow boundaries — two concurrent tranches touching the same collision domain must still serialize — so a scheduler that only sees inside its own sub-flow is insufficient.
- Does a release step warrant a mandatory confirmation gate even in a fully automated run? Cutting a release is irreversible in a way a merge is not.
- **Command injection is a real surface here, and the sketch above does not address it.** `cwd: "{{worktree}}"` and `args: [pr, merge, "{{pr}}", --squash]` interpolate flow state into something that will be executed. Much of that state originates in model output or in forge fields an outside contributor can write (a branch name, an Issue title). Whatever ships must decide, explicitly: whether bindings execute through a shell at all or only via argv arrays with no shell involved; how a templated value is escaped or refused; and whether a binding may name a command the flow author did not declare up front. Deciding this at implementation time, per binding, is how an injection lands.

---

## Schema versioning strategy

When schema 2.0 lands:

1. The Zod validator accepts both `schema_version: "1.0"` and `schema_version: "2.0"` YAMLs.
2. Old YAMLs (1.0) continue to compile and run unchanged. They're explicitly versioned.
3. New capabilities (memory, subgraphs, interrupts) require `schema_version: "2.0"`.
4. The engine's compilers branch on schema version when needed. Most code paths are version-agnostic; only new features require new compiler logic.
5. Schema migration tools (likely in Atta Labs) help authors upgrade their YAMLs to a newer schema if they want new features.
6. There is no auto-upgrade. Existing YAMLs stay at their schema version unless the author chooses to fork to a new version.

This is consistent with the immutability principle: schema upgrades are forks, not in-place mutations.

---

## What this document does NOT promise

- A timeline. Capabilities ship when consumers need them. No speculative implementation.
- That all capabilities listed will be implemented. Some (async background work, cognitive routing chains) may turn out to be unnecessary.
- That the schema designs sketched here are final. They're informed guesses based on runtime support and likely consumer needs. Real schema designs require working with concrete YAMLs and use cases.

---

## How to update this document

This is a living architectural document. Update when:

- A new capability is identified that's not currently listed
- A capability moves from "speculative" to "in flight" (Vitakka starts using memory, etc.)
- A capability is implemented (move to a "shipped" section)
- A capability is invalidated (consumer demand never materializes; remove or note as deprecated)

Each capability section should answer: what is it, what runtime support exists, what schema shape is plausible, what open questions remain.

The goal is for any future contributor to know what's known about future capabilities without re-deriving the analysis.
