# Atta Engine — Future Capabilities and Schema Evolution

**Date captured:** April 26, 2026
**Status:** Forward-looking architecture document. Updated as capabilities are added.
**Companion documents:** `engine-layer-rationale.md` (why an engine layer exists), `mastra-vs-langgraph.md` (executor choice)

---

## Why this document exists

The engine schema today is `1.0`. It supports the deliberation patterns Vāda uses. As Vitakka, future Atta products, and external consumers come online, the schema needs to grow to express new capabilities.

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
