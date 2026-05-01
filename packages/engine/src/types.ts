/**
 * @file types.ts
 * @description Complete TypeScript API surface for the Vāda deliberation engine.
 *
 * Spec artifact from Phase 0 — validated across 6 reviewer pressure-test rounds.
 * Phase 1 will move this file to packages/engine/src/types.ts and begin implementation.
 *
 * Architectural principles encoded here:
 * - **Zero content injection**: the engine never writes prompts; all templates are user-provided
 * - **Pure data**: all types are JSON-serializable (function and hook declarations are excluded)
 * - **Declarative graphs**: Plan is a compiled DAG with pre-allocated revision nodes, no cycles
 * - **Engine = compiler, Adapter = dumb runtime**: compilation logic lives once in the engine
 * - **deriveTemplateState is the deterministic contract**: adapters MUST use it to build prompts
 * - **Schema versioning**: Plan, Corpus, Experiment, and ExperimentResult carry schemaVersion
 */

// =============================================================================
// Group 1: Agent — defined in @atta/agents, re-exported here for backward compatibility
// =============================================================================

import type { Agent } from '@atta/agents'
export type { Agent, AgentRole } from '@atta/agents'

// =============================================================================
// Group 3: RevisionCondition (declared before Workflow — Workflow depends on it)
// =============================================================================

/**
 * A condition evaluated against an audit agent's output to decide whether to trigger revision.
 *
 * Three types cover V1 needs. AND/OR compound conditions are intentionally excluded —
 * complexity belongs in the audit agent's prompt, not in config.
 * All JSON paths use simple dot-notation (e.g. "result.verdict"), not JSONPath.
 */
export type RevisionCondition =
  | {
      /** Triggers revision if the agent's text output contains the given substring. */
      type: 'contains'
      /** Substring to search for in the agent's content field. */
      value: string
      /** Whether the substring search is case-sensitive. Defaults to true. */
      caseSensitive?: boolean
    }
  | {
      /** Triggers revision if the JSON field at `path` strictly equals `value`. */
      type: 'json-field-equals'
      /** Dot-notation path into the parsed JSON output, e.g. "result.verdict". */
      path: string
      /** The comparison target. Must be a JSON-serializable primitive. */
      value: unknown
    }
  | {
      /** Triggers revision if the JSON field at `path` is truthy. */
      type: 'json-field-truthy'
      /** Dot-notation path into the parsed JSON output, e.g. "result.needsRevision". */
      path: string
    }

// =============================================================================
// Group 2: Workflow union + three variants
// =============================================================================

/**
 * A solo workflow — a single agent runs once and produces the conclusion directly.
 * No rounds, no auditing, no revision loop.
 */
export interface SoloWorkflow {
  type: 'solo'
}

/**
 * Base fields shared by all RoundsWorkflow variants.
 * Not exported directly — use RoundsWorkflow (the union) at call sites.
 */
interface RoundsWorkflowBase {
  type: 'rounds'
  /** Number of pre-allocated round nodes. Each agent in the team runs once per round. */
  rounds: number
  /**
   * Handlebars template for the user message sent to each agent per round.
   * See TemplateState for the full list of available template variables.
   */
  messageTemplate: string
  /** Name of the agent whose final output becomes the Conclusion content. */
  terminalAgent: string
}

/**
 * RoundsWorkflow with audit + optional revision loop enabled.
 * When `auditAgent` is set, `auditTemplate` and `revisionCondition` are both required.
 *
 * Multi-auditor: pass an array to run multiple audit agents sequentially per revision slot.
 * Revision is triggered if ANY auditor's output satisfies the revisionCondition ("logical OR").
 * Single-string form still works unchanged.
 */
export interface RoundsWorkflowWithAudit extends RoundsWorkflowBase {
  /** Name(s) of the agent(s) that evaluate each round. Array = sequential execution; any flag triggers revision. */
  auditAgent: string | string[]
  /** Handlebars template for the audit agent's user message. */
  auditTemplate: string
  /** Condition applied to the audit agent's output to trigger a revision cycle. */
  revisionCondition: RevisionCondition
  /** Maximum revision cycles before forcing termination with MAX_REVISIONS. Defaults to 1. */
  maxRevisions?: number
}

/**
 * RoundsWorkflow without audit — N rounds with no revision loop.
 * All audit fields are compile-time excluded.
 */
export interface RoundsWorkflowNoAudit extends RoundsWorkflowBase {
  auditAgent?: never
  auditTemplate?: never
  revisionCondition?: never
  maxRevisions?: never
}

/**
 * A rounds-based workflow where one or more agents collaborate over N rounds,
 * optionally including an audit+revision loop.
 *
 * Discriminated on the presence of `auditAgent`:
 * - With auditAgent: full revision loop with condition checking
 * - Without auditAgent: N rounds, terminal agent concludes, no revisions
 */
export type RoundsWorkflow = RoundsWorkflowWithAudit | RoundsWorkflowNoAudit

/** Type alias for the audit-enabled rounds variant. Useful in Plan compilation logic. */
export type RoundsAuditConfig = RoundsWorkflowWithAudit
/** Type alias for the shared rounds base fields. Useful in Plan compilation logic. */
export type RoundsConfigBase = RoundsWorkflowBase

/**
 * A single step in a custom workflow.
 * `input` is a Handlebars template with access to question and prior step outputs.
 */
export interface WorkflowStep {
  /** Name of the agent to invoke for this step. Must exist in the Team's agents array. */
  agent: string
  /**
   * Handlebars template for the user message passed to this agent.
   * Available variables: {{question}}, {{step0.output}}, {{step1.output}}, …
   */
  input: string
}

/**
 * A fully custom workflow defined as an ordered sequence of steps.
 * Each step nominates an agent and a Handlebars-templated input.
 */
export interface CustomWorkflow {
  type: 'custom'
  config: {
    steps: WorkflowStep[]
  }
}

/**
 * A single Brokered reviewer — one agent with its messageTemplate.
 */
export interface BrokeredReviewer {
  /** Must match an Agent.name in the Team's agents array. */
  agentName: string
  /** Handlebars template for this reviewer's user message. Available: {{question}}. */
  messageTemplate: string
}

/**
 * Brokered workflow — sequential, independent reviewer consultations.
 * Each reviewer runs once with no cross-reviewer context.
 * No rounds, no audit, no revision.
 *
 * Used by vada__consult (MCP Brokered mode).
 * Compile with compileBrokered → sequential chain of solo-role nodes.
 *
 * When `synthesis` is present, a final synthesis node runs after all reviewers
 * and its output becomes the Conclusion content (responseMode: 'synthesize').
 * Without `synthesis`, all reviewer outputs are concatenated (responseMode: 'concatenate').
 */
export interface BrokeredWorkflow {
  type: 'brokered'
  reviewers: BrokeredReviewer[]
  /** V1 only supports sequential execution. Must be false or omitted. */
  parallel?: false
  /** Optional final synthesis step. When present, this agent runs after all reviewers. */
  synthesis?: {
    /** Must reference an agent in the Team's agents array. */
    agentName: string
    /** Handlebars template for the synthesizer's user message. Available: {{question}}, {{allPreviousOutputs}}. */
    messageTemplate: string
  }
}

/**
 * The Workflow union — the four execution strategies available to a Team.
 * Discriminated on the `type` field.
 */
export type Workflow = SoloWorkflow | RoundsWorkflow | CustomWorkflow | BrokeredWorkflow

// =============================================================================
// Group 4: Team and Baseline
// =============================================================================

/**
 * A named team of agents with a shared workflow strategy.
 * The Team is the primary unit of configuration for the Vāda engine.
 *
 * @example
 * const team: Team = {
 *   name: 'EthicsReview',
 *   description: 'Three-round ethical analysis with skeptical audit',
 *   agents: [philosopher, skeptic, synthesizer],
 *   workflow: { type: 'rounds', rounds: 3, messageTemplate: '...', terminalAgent: 'Synthesizer', auditAgent: 'Skeptic', auditTemplate: '...', revisionCondition: { type: 'contains', value: 'REVISE' } },
 * };
 */
export interface Team {
  /** Display name — PascalCase, function-first, no version suffixes. */
  name: string
  /** Human-readable description of the team's purpose and deliberation strategy. */
  description: string
  /** Inline agent definitions. Agent names must be unique within the team. */
  agents: Agent[]
  /** Execution strategy for this team. */
  workflow: Workflow
}

/**
 * A single-agent baseline for comparison against multi-agent teams in experiments.
 * Baselines can participate in experiments via baselineAsTeam().
 *
 * @example
 * const baseline: Baseline = {
 *   name: 'SingleShot',
 *   description: 'Direct LLM response without deliberation',
 *   agent: { name: 'Baseline', description: 'Direct responder', systemPrompt: 'Answer concisely.' },
 * };
 */
export interface Baseline {
  /** Display name for this baseline configuration. */
  name: string
  /** Human-readable description of the baseline strategy. */
  description: string
  /** The single agent that produces the baseline response. */
  agent: Agent
}

// =============================================================================
// Group 5: AgentOutput
// =============================================================================

/**
 * The output produced by a single agent node execution.
 * Stored in ExecutionState.outputs and used as input to TemplateState projections.
 */
export interface AgentOutput {
  /** Name of the agent that produced this output. Matches Agent.name. */
  agentName: string
  /** Raw text content returned by the LLM completion. */
  content: string
  /** Parsed structured output, present when the agent specifies an outputSchema. */
  structured?: unknown
  /** Token count for the prompt/input sent to the LLM. */
  tokensInput: number
  /** Token count for the completion/output returned by the LLM. */
  tokensOutput: number
  /** Wall-clock duration in milliseconds for this LLM call. */
  elapsedMs: number
  /** Actual model used for this call (may differ from team-level default). */
  model: string
  /** 0-based round index, present for outputs within a RoundsWorkflow. */
  roundIndex?: number
  /** 0-based step index, present for outputs within a CustomWorkflow. */
  stepIndex?: number
  /**
   * When present, indicates this agent's LLM call failed.
   * content and token counts will be empty/zero. The workflow continues;
   * per-agent errors surface here rather than halting execution.
   */
  error?: string
}

// =============================================================================
// Group 6: Conclusion
// =============================================================================

/**
 * The final output of a completed deliberation session.
 * Produced when the terminal node completes. Contains the answer plus full transcript.
 */
export interface Conclusion {
  /** Final answer text from the terminal agent. */
  content: string
  /** Parsed structured output from the terminal agent, if it has an outputSchema. */
  structured?: unknown
  /** Ordered list of all AgentOutputs produced during the deliberation. */
  transcript: AgentOutput[]
  /**
   * How the deliberation terminated.
   * - CLEAN: completed without any revision cycles
   * - REVISED: completed after one or more audit-triggered revisions
   * - MAX_REVISIONS: hit the maxRevisions ceiling; terminal agent's last output used
   * - FAILED: execution error — see Conclusion.error for details
   */
  terminalState: 'CLEAN' | 'REVISED' | 'MAX_REVISIONS' | 'FAILED'
  /** Total input tokens across all LLM calls in this session. */
  totalTokensInput: number
  /** Total output tokens across all LLM calls in this session. */
  totalTokensOutput: number
  /** Total wall-clock duration in milliseconds for the deliberation. */
  totalElapsedMs: number
  /** Error description when terminalState is FAILED. */
  error?: string
}

// =============================================================================
// Group 7: Plan and graph types
// =============================================================================

/** Schema version for Plan. Bump on breaking changes to the Plan structure. */
export type PlanSchemaVersion = '1.0'

/**
 * A compiled execution plan — a fully specified DAG ready for adapter execution.
 *
 * Plans are pure JSON-serializable data. They can be stored, replayed, served via MCP,
 * inspected offline, and diffed across runs. The engine is the only compiler;
 * adapters receive plans and execute them without adding logic.
 *
 * Terminal node resolution is dynamic: the adapter scans executionOrder in reverse
 * for the last node with role='terminal'. This allows revision loops to end at
 * different positions based on how many revisions actually fired.
 */
export interface Plan {
  /** Schema version for forward compatibility checks. */
  schemaVersion: PlanSchemaVersion
  /** The original question this plan was compiled for. */
  question: string
  /** Default model for all agents that don't specify their own model. */
  model: string
  /** All agent definitions used in this plan, keyed by Agent.name. */
  agents: Record<string, Agent>
  /** Name of the source Team this plan was compiled from. */
  teamName: string
  /** The compiled execution graph. */
  graph: PlanGraph
  // Phase 7.2 additions — set by compileSpec(), absent on legacy compile() plans
  /** YAML spec ID this plan was compiled from (e.g. "crucible"). */
  specId?: string
  /** How Conclusion.content is assembled: synthesize = terminal node output; concatenate = all outputs joined. */
  responseMode?: 'synthesize' | 'concatenate'
  /** Node ID whose output becomes Conclusion.content. Used instead of last-transcript-entry scan. */
  responseNode?: string
  /** Maximum audit revision cycles from the spec. 0 = no audit. */
  maxRevisions?: number
  /** Per-agent classifier mode overrides, keyed by Agent.name. */
  classifierModes?: Record<string, 'auto' | 'skip' | 'always_tools'>
}

/**
 * The compiled DAG of nodes and edges that the adapter executes.
 *
 * Design: there is intentionally NO terminalNode field. The terminal node is
 * resolved dynamically at the end of execution by scanning executionOrder in
 * reverse for the last node with role='terminal'. This supports variable-length
 * revision loops where the same terminal agent runs at different DAG positions.
 */
export interface PlanGraph {
  /** All nodes in the plan, keyed by node ID. */
  nodes: Record<string, PlanNode>
  /** Unconditional edges — traversed automatically when the source node completes. */
  edges: PlanEdge[]
  /** Conditional edges — traversed based on a check against a node's output. */
  conditionalEdges: PlanConditionalEdge[]
  /** ID of the first node to execute. */
  entryNode: string
}

/**
 * A single node in the execution graph. Each node corresponds to one agent invocation.
 */
export interface PlanNode {
  /** Unique node identifier within the plan, e.g. "round-0-philosopher", "audit-0". */
  id: string
  /** Name of the agent to invoke. Must exist in Plan.agents. */
  agentName: string
  /**
   * Handlebars template for the user message passed to this agent.
   * Rendered by the adapter using deriveTemplateState(executionState, node).
   */
  inputTemplate: string
  /** Structural role of this node in the workflow. */
  role: PlanNodeRole
  /** Categorical classification for visualization and Plan consumers. */
  kind: PlanNodeKind
  /** Runtime metadata for TemplateState derivation and execution bookkeeping. */
  metadata: PlanNodeMetadata
}

/**
 * Structural role of a node in the plan graph.
 * - solo: single-agent workflow node — produces the conclusion directly
 * - round: one agent's turn within a rounds workflow
 * - terminal: the concluding agent whose output becomes the Conclusion content
 * - audit: the audit agent that evaluates round output and decides whether to revise
 * - custom-step: one step in a custom sequential workflow
 */
export type PlanNodeRole = 'solo' | 'round' | 'terminal' | 'audit' | 'custom-step'

/**
 * Categorical classification of a node for visualization and Plan consumers.
 * Additive — does not replace PlanNodeRole, which the adapter uses for execution routing.
 *
 * - solo-agent: single-agent baselines (A0/A1) — no peers, no synthesis
 * - parallel-peer: deliberation agent within a parallel group (round agents, brokered reviewers)
 * - synthesizer: conclusion synthesizer (post-rounds) or brokered synthesis node
 * - auditor: audit/verification agent
 * - custom-step: explicit step in a custom sequential workflow
 * - revision-terminal: pre-allocated conditional revision slot (may never execute)
 * - system-sentinel: LangGraph routing sentinel (__END__); filter before rendering
 */
export type PlanNodeKind =
  | 'solo-agent'
  | 'parallel-peer'
  | 'synthesizer'
  | 'auditor'
  | 'custom-step'
  | 'revision-terminal'
  | 'system-sentinel'

/**
 * Categorical classification of an edge for visualization.
 * Additive — does not affect adapter execution.
 *
 * - flow: semantic data dependency (brief → agent, agent → synthesizer)
 * - ordering: LangGraph wiring artifact with no semantic dependency
 *   (e.g. sequential chaining within a parallel group)
 */
export type PlanEdgeKind = 'flow' | 'ordering'

/**
 * Optional metadata attached to a PlanNode.
 * Used during TemplateState derivation; fields depend on the node's role.
 */
export interface PlanNodeMetadata {
  /** 0-based round index for nodes in a RoundsWorkflow. */
  roundIndex?: number
  /** Total configured rounds, for round/terminal/audit nodes. */
  totalRounds?: number
  /** 0-based revision index — how many revision cycles have occurred at this position. */
  revisionIndex?: number
  /** 0-based step index for custom-step nodes. */
  customStepIndex?: number
}

/**
 * An unconditional directed edge. Traversed automatically when `from` completes.
 */
export type PlanEdge = {
  from: string
  to: string
  /** Categorical classification for visualization. Absent = 'flow'. */
  kind?: PlanEdgeKind
}

/**
 * A conditional edge that routes execution based on a check against a node's output.
 *
 * Note: maxVisits is intentionally absent. Pre-allocation ensures the graph is a DAG
 * with no cycles — each revision path is a distinct pre-allocated node sequence.
 */
export interface PlanConditionalEdge {
  /** Source node ID — the node whose completion triggers this edge evaluation. */
  from: string
  /** Target node ID when the condition is satisfied (revision triggered). */
  ifTrue: string
  /** Target node ID when the condition is not satisfied (continue normally). */
  ifFalse: string
  /** The condition to evaluate. */
  condition: StateCondition
}

/**
 * A condition that checks node output(s) to determine edge traversal.
 *
 * Two forms:
 * - `targetNode`: check a single node's output (original form, backward compatible)
 * - `anyOf`: check multiple nodes' outputs — edge fires if ANY satisfies the condition
 */
export type StateCondition =
  | {
      /** ID of the node whose output to evaluate against check. */
      targetNode: string
      /** The check to apply to that node's output. */
      check: RevisionCondition
    }
  | {
      /** IDs of nodes to evaluate — condition is satisfied if ANY node's output matches check. */
      anyOf: string[]
      /** The check to apply to each node's output. */
      check: RevisionCondition
    }

// =============================================================================
// Group 8: ExecutionState + TemplateState
// =============================================================================

/**
 * Lifecycle status of an execution in progress.
 * - RUNNING: currently executing nodes
 * - COMPLETED: finished successfully with a Conclusion
 * - MAX_REVISIONS: terminated after hitting the maxRevisions ceiling
 * - ERROR: terminated due to an unrecoverable error
 */
export type ExecutionStatus = 'RUNNING' | 'COMPLETED' | 'MAX_REVISIONS' | 'ERROR'

/**
 * The normalized mutable state tracked throughout plan execution.
 * This is the single source of truth. TemplateState is always derived from it —
 * adapters must never construct TemplateState manually.
 */
export interface ExecutionState {
  /** The original question being deliberated. */
  question: string
  /** The compiled plan being executed. */
  plan: Plan
  /** Runtime variables passed by the caller. Injected into templates as {{customVars.X}}. */
  customVars: Record<string, unknown>
  /** Current execution lifecycle status. */
  status: ExecutionStatus
  /** Map from node ID to its AgentOutput, populated as each node completes. */
  outputs: Record<string, AgentOutput>
  /** Ordered list of completed node IDs, in execution order. */
  executionOrder: string[]
  /** Epoch ms when execution started. */
  startedAt: number
  /** Error description and node context if status is ERROR. */
  error?: { message: string; nodeId?: string }
}

/**
 * Derived read-only template context for a specific node, projected from ExecutionState.
 *
 * This is the Handlebars context object — everything a template can reference.
 * Produced deterministically by deriveTemplateState(). Adapters MUST use that
 * function rather than constructing this object themselves.
 *
 * ## Available Handlebars template variables
 *
 * **Scalars**
 * - `{{question}}` — the original question string
 * - `{{roundIndex}}` — 0-based current round index (rounds workflow only)
 * - `{{totalRounds}}` — total configured rounds (rounds workflow only)
 * - `{{revisionIndex}}` — 0-based revision count for this node position (0 = first execution)
 * - `{{isRevision}}` — true if this is a re-execution triggered by audit rejection
 * - `{{isTerminal}}` — true if this node has role='terminal'
 *
 * **Agent fields**
 * - `{{agent.name}}`, `{{agent.description}}`, `{{agent.systemPrompt}}`
 *
 * **Output collections** (all AgentOutput fields accessible via dot-notation)
 * - `{{allPreviousOutputs}}` — array of all AgentOutputs completed before this node
 * - `{{outputsByAgent.AgentName}}` — all outputs from a named agent (array)
 * - `{{lastOutputByAgent.AgentName}}` — most recent output from a named agent (single)
 * - `{{outputsByRound.[0]}}` — all outputs from a specific round (bracket syntax for numeric keys)
 * - `{{currentRoundOutputs}}` — outputs completed in the current round before this node
 * - `{{auditOutputs}}` — all outputs produced by the configured audit agent
 * - `{{previousRevisions}}` — outputs from prior revision cycles at this node's position
 *
 * **Conclusion** (available on re-executed terminal nodes)
 * - `{{conclusion.content}}`, `{{conclusion.terminalState}}`, etc.
 *
 * **Custom variables** (passed via ExecuteParams.customVars)
 * - `{{customVars.myKey}}` — any caller-supplied runtime variable
 */
export interface TemplateState {
  question: string
  agent: Agent
  roundIndex?: number
  totalRounds?: number
  revisionIndex?: number
  isRevision: boolean
  isTerminal: boolean
  /** All AgentOutputs completed before this node, in execution order. */
  allPreviousOutputs: AgentOutput[]
  /** All outputs grouped by agent name: { AgentName: AgentOutput[] }. */
  outputsByAgent: Record<string, AgentOutput[]>
  /** Most recent output per agent name: { AgentName: AgentOutput }. */
  lastOutputByAgent: Record<string, AgentOutput>
  /** Outputs grouped by round index. Use bracket syntax in templates: {{outputsByRound.[0]}}. */
  outputsByRound: Record<number, AgentOutput[]>
  /** Outputs completed in the current round, before this node. */
  currentRoundOutputs: AgentOutput[]
  /** All outputs produced by the audit agent across all rounds and revisions. */
  auditOutputs: AgentOutput[]
  /** The content of the most recent terminal output, available on audit templates as {{conclusion}}. */
  conclusion?: string
  /** Outputs from prior revision cycles at this node's position. */
  previousRevisions?: AgentOutput[]
  customVars: Record<string, unknown>
  /** Comma-separated list of round agent names in turn order (e.g. "Strategist, Critic, Devil's Advocate, Synthesizer"). */
  participants: string
  /** Name of the current agent being invoked (same as agent.name). */
  agentName: string
}

// =============================================================================
// Group 9: Adapter interface + callbacks
// =============================================================================

/**
 * The result of a single LLM call, returned by LlmCallFn or the adapter's default implementation.
 */
export interface LlmCallResult {
  /** Raw text content from the LLM completion. */
  content: string
  /** Parsed structured output when the agent specifies an outputSchema. */
  structured?: unknown
  /** Input token count for this call. */
  tokensInput: number
  /** Output token count for this call. */
  tokensOutput: number
  /** Wall-clock duration in milliseconds. */
  elapsedMs: number
  /** Actual model used (may differ from requested if the adapter substituted). */
  model: string
}

/**
 * Injectable LLM call function — overrides the adapter's default implementation.
 * Use for testing, provider substitution, custom retry logic, or cost capping.
 */
export type LlmCallFn = (params: {
  model: string
  agent: Agent
  systemPrompt: string
  userPrompt: string
}) => Promise<LlmCallResult>

/**
 * Lifecycle hooks for observing plan execution.
 * All hooks are optional. Use for logging, telemetry, SSE streaming, or progress UIs.
 */
export interface ExecutionHooks {
  /** Called once when execution begins, before entryNode executes. */
  onStart?: (state: ExecutionState) => void | Promise<void>

  /**
   * Called before each node's LLM call. templateState is what
   * deriveTemplateState produced; renderedPrompt is the
   * post-Handlebars text about to go to the LLM.
   */
  onNodeStart?: (params: {
    state: ExecutionState
    node: PlanNode
    templateState: TemplateState
    renderedPrompt: string
  }) => void | Promise<void>

  /** Called after each node's LLM call completes and output is recorded. */
  onNodeComplete?: (params: { state: ExecutionState; node: PlanNode; output: AgentOutput }) => void | Promise<void>

  /**
   * Called when a conditional edge is evaluated. evaluatedValue
   * is the condition result (true/false); nextNode is the target
   * taken based on that value.
   */
  onConditionalEdge?: (params: {
    state: ExecutionState
    edge: PlanConditionalEdge
    evaluatedValue: boolean
    nextNode: string
  }) => void | Promise<void>

  /** Called when execution completes (normally or with error). */
  onComplete?: (params: { state: ExecutionState; conclusion: Conclusion }) => void | Promise<void>
}

/**
 * Parameters passed to Adapter.execute.
 */
export interface ExecuteParams {
  plan: Plan
  /** Runtime variables injected into all templates as {{customVars.X}}. Not stored in Plan. */
  customVars?: Record<string, unknown>
  /** Overrides the adapter's default LLM call implementation for this execution. */
  llmCall?: LlmCallFn
  /** Lifecycle observer hooks. */
  hooks?: ExecutionHooks
  /** Abort execution after this many milliseconds. Adapter should honor this. */
  timeoutMs?: number
}

/**
 * The Adapter interface — the dumb runtime that executes a compiled Plan node-by-node.
 *
 * Adapters contain zero compilation logic. They receive a fully specified Plan,
 * call deriveTemplateState() for each node to build the Handlebars context,
 * invoke the LLM, and populate ExecutionState. This keeps adapter implementations
 * thin and swappable (Mastra, test harness, edge runtime, etc.).
 */
export interface Adapter {
  /** Unique identifier for this adapter implementation. */
  readonly name: string
  /** Execute a compiled Plan end-to-end and return the Conclusion. */
  execute(params: ExecuteParams): Promise<Conclusion>
  /**
   * Validate a compiled Plan for adapter-specific runtime constraints.
   * Throws if the plan cannot be executed by this adapter.
   */
  validatePlan(plan: Plan): void
}

// =============================================================================
// Group 10: Engine interface
// =============================================================================

/**
 * Parameters for Engine.compile — converts a Team + question into a serializable Plan.
 */
export interface CompileParams {
  team: Team
  question: string
  model: string
}

// =============================================================================
// Group 11: Corpus
// =============================================================================

/** Schema version for Corpus. Bump on breaking changes to the corpus structure. */
export type CorpusSchemaVersion = '1.0'

/** Optional provenance metadata for a Corpus. */
export interface CorpusMetadata {
  createdAt?: string
  author?: string
  /** Original source dataset or reference, if applicable. */
  source?: string
  notes?: string
}

/**
 * A single evaluation question within a corpus.
 */
export interface CorpusQuestion {
  /** Unique identifier within the corpus. Used in ExperimentRun and verdict records. */
  id: string
  /** The question text passed as {{question}} to all agents. */
  text: string
  /** Optional tags for subsetting, filtering, and analysis. */
  tags?: string[]
  /**
   * Subjective difficulty rating.
   * 1 = trivial, 5 = expert-level. Used for stratified analysis.
   */
  difficulty?: 1 | 2 | 3 | 4 | 5
  /** Optional reference answer for future automated scoring (not used by V1 judge). */
  reference?: {
    answer?: string
    rubricPoints?: string[]
  }
  metadata?: Record<string, unknown>
}

/**
 * A named, versioned collection of evaluation questions.
 * Shared across experiments to enable reproducible benchmarking over time.
 *
 * @example
 * const corpus: Corpus = {
 *   name: 'EthicsHard-50',
 *   description: '50 high-difficulty ethical dilemma questions',
 *   schemaVersion: '1.0',
 *   questions: [...],
 * };
 */
export interface Corpus {
  name: string
  description: string
  schemaVersion: CorpusSchemaVersion
  questions: CorpusQuestion[]
  metadata?: CorpusMetadata
}

// =============================================================================
// Group 12: Experiment
// =============================================================================

/** Schema version for Experiment. Bump on breaking changes to the experiment structure. */
export type ExperimentSchemaVersion = '1.0'

/**
 * One variant in an N-way experiment.
 * Experiments support 2+ variants for ablation studies and multi-team comparisons.
 */
export interface ExperimentVariant {
  /** Programmatic name used in result records, e.g. "baseline" or "vada-3-round". */
  name: string
  /** Human-readable label for display in dashboards. */
  label: string
  /** The team that represents this variant. Use baselineAsTeam() for Baseline variants. */
  team: Team
  /** Override the experiment-level model for this variant only. */
  modelOverride?: string
}

/**
 * Configuration for the pairwise LLM judge.
 *
 * V1 supports only 'pairwise-llm'. The discriminated union type is designed for
 * extension: future types (rubric-based, embedding cosine, human) can be added
 * without breaking existing JudgeConfig values.
 */
export interface JudgeConfig {
  /** Judge strategy. Currently only 'pairwise-llm' is supported. */
  type: 'pairwise-llm'
  /** Model to use for the judge. Typically the strongest available model. */
  model: string
  /** System prompt given to the judge. Should describe the evaluation criteria. */
  systemPrompt: string
  /**
   * Expected format for the judge's verdict output.
   * - 'a-or-b': plain text "A" or "B"
   * - 'json-verdict': JSON object with a `winner` field
   */
  verdictFormat: 'a-or-b' | 'json-verdict'
  /** Randomize which variant is labeled A vs B to reduce position bias in the judge. */
  randomizePositions?: boolean
}

/**
 * A complete, self-contained experiment definition.
 * Everything needed to run a reproducible benchmark: variants, corpus, judge, and settings.
 *
 * @example
 * const experiment: Experiment = {
 *   name: 'VadaVsBaseline-EthicsHard',
 *   description: 'Compare 3-round Vāda deliberation against single-shot baseline',
 *   schemaVersion: '1.0',
 *   variants: [baselineVariant, vadaVariant],
 *   corpus: ethicsCorpus,
 *   judge: judgeConfig,
 *   repetitions: 3,
 *   model: 'claude-opus-4-7',
 * };
 */
export interface Experiment {
  name: string
  description: string
  schemaVersion: ExperimentSchemaVersion
  /** 2 or more variants to compare. All pairs are compared pairwise. */
  variants: ExperimentVariant[]
  corpus: Corpus
  judge: JudgeConfig
  /** Number of independent runs per variant per question (for averaging out LLM randomness). */
  repetitions: number
  /** Default model for all variants that don't specify modelOverride. */
  model: string
  customVars?: Record<string, unknown>
  /**
   * Optional subset of question ids to run. If undefined, all questions
   * in the corpus are used. Enables focused experiments on failure
   * subsets without building derivative corpora.
   *
   * Strings reference CorpusQuestion.id values. Unknown ids raise
   * InvalidExperimentError at runtime.
   */
  questionFilter?: string[]
  metadata?: Record<string, unknown>
}

// =============================================================================
// Group 13: ExperimentResult
// =============================================================================

/** Schema version for ExperimentResult. Bump on breaking changes. */
export type ExperimentResultSchemaVersion = '1.0'

/**
 * A single run of one variant on one corpus question at one repetition index.
 */
export interface ExperimentRun {
  /** Unique run identifier (e.g. UUID). */
  id: string
  variantName: string
  questionId: string
  /** 0-based repetition index. */
  repetition: number
  /** The Conclusion produced by this run. */
  conclusion: Conclusion
}

/**
 * The judge's verdict for a single pairwise comparison between two variant runs.
 */
export interface JudgeVerdict {
  /** Unique verdict identifier. */
  id: string
  questionId: string
  repetition: number
  variantAName: string
  variantBName: string
  /**
   * The judge's decision.
   * - A: variant A's response was better
   * - B: variant B's response was better
   * - TIE: judge considered them equivalent
   * - INVALID: judge output could not be parsed into a valid verdict
   */
  winner: 'A' | 'B' | 'TIE' | 'INVALID'
  /** Judge's reasoning or explanation (useful for audit and debugging). */
  reason?: string
  /** Raw judge LLM output before parsing, retained for debugging. */
  rawJudgeOutput?: string
  tokensInput: number
  tokensOutput: number
  elapsedMs: number
}

/**
 * Aggregated performance statistics for a single experiment variant.
 */
export interface VariantSummary {
  variantName: string
  totalRuns: number
  /** Runs that completed with terminalState='CLEAN'. */
  cleanRuns: number
  /** Runs that completed after audit-triggered revision (terminalState='REVISED'). */
  revisedRuns: number
  /** Runs that hit the revision ceiling (terminalState='MAX_REVISIONS'). */
  maxRevisionsRuns: number
  /** Runs that failed with terminalState='FAILED'. */
  failedRuns: number
  meanTokensInput: number
  meanTokensOutput: number
  meanElapsedMs: number
  totalTokensInput: number
  totalTokensOutput: number
}

/**
 * Question-level win breakdown for a single pairwise comparison.
 * Used to detect whether one variant dominates on specific question types.
 */
export interface QuestionLevelComparison {
  questionId: string
  aWins: number
  bWins: number
  ties: number
  invalid: number
}

/**
 * Head-to-head statistics for one pair of variants.
 * Win rates use Wilson score confidence intervals for robustness at extreme win rates
 * (e.g. 95%+ or 5%- where normal approximation CI breaks down).
 */
export interface PairwiseComparison {
  variantAName: string
  variantBName: string
  aWins: number
  bWins: number
  ties: number
  invalid: number
  /** A's win rate among non-tie, non-invalid verdicts. */
  aWinRate: number
  /** B's win rate among non-tie, non-invalid verdicts. */
  bWinRate: number
  /** Fraction of all verdicts that were ties. */
  tieRate: number
  /** 95% Wilson score confidence interval for aWinRate: [lower, upper]. */
  aWinRateCI95: [number, number]
  /** Per-question win breakdown for this pair. */
  byQuestion: QuestionLevelComparison[]
}

/**
 * The complete result of an experiment run.
 * Includes all raw data (individual runs and verdicts) alongside aggregated statistics.
 * Raw data is retained for downstream analysis and reproducibility audits.
 */
export interface ExperimentResult {
  schemaVersion: ExperimentResultSchemaVersion
  /** The Experiment definition that produced these results. */
  experiment: Experiment
  /** Epoch ms when the experiment started. */
  startedAt: number
  /** Epoch ms when the experiment completed. */
  completedAt: number
  /** All individual variant runs, in execution order. */
  runs: ExperimentRun[]
  /** All pairwise judge verdicts. */
  verdicts: JudgeVerdict[]
  /** Per-variant aggregated statistics. */
  variantSummaries: VariantSummary[]
  /** All pairwise head-to-head comparisons between variants. */
  pairwiseComparisons: PairwiseComparison[]
}
