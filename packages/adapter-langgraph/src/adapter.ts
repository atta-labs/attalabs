import type {
  Adapter,
  AgentOutput,
  Conclusion,
  ExecuteParams,
  ExecutionHooks,
  ExecutionState,
  Plan,
  RevisionCondition,
  StateCondition
} from '@atta/engine'
import { buildStateGraph } from './graph-builder'
import { createDefaultLlmCall, createMultiVendorLlmCall } from './llm'
import type { ProviderKeys } from './llm'
import { createNodeExecutor } from './node-executor'

/** agentName → model string overrides applied to the Plan before execution. */
export type ReviewerConfig = Record<string, string>

/**
 * LangGraph-based implementation of the Vāda Adapter interface.
 *
 * Translates Plans into LangGraph StateGraph execution. Uses
 * LangChain's @langchain/anthropic for LLM calls, Handlebars for
 * template rendering.
 *
 * The adapter is stateless across calls — multiple execute()
 * invocations can run concurrently against the same adapter
 * instance.
 */
export class LangGraphAdapter implements Adapter {
  readonly name = 'langgraph-v1'

  private readonly config: LangGraphAdapterConfig

  constructor(config: LangGraphAdapterConfig = {}) {
    this.config = {
      apiKey: config.apiKey ?? process.env.ANTHROPIC_API_KEY,
      defaultTimeoutMs: config.defaultTimeoutMs ?? 300_000, // 5 min
      ...config
    }
  }

  /**
   * Validates that this adapter can execute the given Plan.
   * Called by the engine before execute().
   */
  validatePlan(plan: Plan): void {
    // Schema version check
    if (plan.schemaVersion !== '1.0') {
      throw new Error(`LangGraphAdapter does not support Plan schemaVersion '${plan.schemaVersion}'. Supported: '1.0'.`)
    }

    // V1 constraint: each node has at most one outgoing regular edge
    const outgoingCounts = new Map<string, number>()
    for (const edge of plan.graph.edges) {
      outgoingCounts.set(edge.from, (outgoingCounts.get(edge.from) ?? 0) + 1)
    }
    for (const [nodeId, count] of outgoingCounts) {
      if (count > 1) {
        throw new Error(
          `Node '${nodeId}' has ${count} outgoing regular edges; V1 adapter supports at most 1 (parallel execution not implemented).`
        )
      }
    }

    // Every agent referenced by a node must be in plan.agents
    for (const nodeId of Object.keys(plan.graph.nodes)) {
      const node = plan.graph.nodes[nodeId]!
      // Skip sentinel nodes
      if (nodeId === '__END__') continue
      if (!plan.agents[node.agentName]) {
        throw new Error(`Node '${nodeId}' references agent '${node.agentName}' not in plan.agents.`)
      }
    }

    // entryNode must exist in nodes
    if (!plan.graph.nodes[plan.graph.entryNode]) {
      throw new Error(`Plan's entryNode '${plan.graph.entryNode}' not found in graph.nodes.`)
    }
  }

  /**
   * Executes a Plan and returns a Conclusion.
   *
   * Never throws for LLM failures or execution errors — those
   * produce a Conclusion with terminalState='FAILED'. Only throws
   * for programming errors (invalid plan, null deref, etc.).
   */
  async execute(params: ExecuteParams): Promise<Conclusion> {
    const { plan } = params
    const customVars = params.customVars ?? {}
    const hooks = params.hooks ?? {}
    const timeoutMs = params.timeoutMs ?? this.config.defaultTimeoutMs ?? 300_000

    // Validate the plan before proceeding
    try {
      this.validatePlan(plan)
    } catch (err) {
      return this.buildFailedConclusion(err instanceof Error ? err.message : String(err), undefined)
    }

    // Initialize execution state
    const state = this.initializeState(plan, customVars)

    try {
      await this.callHook(hooks.onStart, state)
    } catch (err) {
      // Hook failures should not halt execution, but we log them
      console.error('[LangGraphAdapter] onStart hook failed:', err)
    }

    // Execute with timeout wrapper
    try {
      const conclusion = await this.runWithTimeout(() => this.runExecution(state, hooks, params), timeoutMs)

      try {
        await this.callHook(hooks.onComplete, { state, conclusion })
      } catch (err) {
        console.error('[LangGraphAdapter] onComplete hook failed:', err)
      }

      return conclusion
    } catch (err) {
      // Timeout or unhandled error
      const errorMessage = err instanceof Error ? err.message : String(err)
      state.status = 'ERROR'
      state.error = { message: errorMessage }

      const conclusion = this.buildFailedConclusion(errorMessage, state)

      try {
        await this.callHook(hooks.onComplete, { state, conclusion })
      } catch (hookErr) {
        console.error('[LangGraphAdapter] onComplete hook failed:', hookErr)
      }

      return conclusion
    }
  }

  /**
   * Initialize a fresh ExecutionState for this execution.
   */
  private initializeState(plan: Plan, customVars: Record<string, unknown>): ExecutionState {
    return {
      question: plan.question,
      plan,
      customVars,
      status: 'RUNNING',
      outputs: {},
      executionOrder: [],
      startedAt: Date.now()
    }
  }

  /**
   * Core execution logic — builds the graph, runs it, assembles
   * the Conclusion. Delegates to methods that will be implemented
   * in subsequent tasks.
   */
  private async runExecution(state: ExecutionState, hooks: ExecutionHooks, params: ExecuteParams): Promise<Conclusion> {
    // Resolve LLM call: user override > multi-vendor keys > single Anthropic key
    const llmCall =
      params.llmCall ??
      (this.config.providerKeys
        ? createMultiVendorLlmCall(this.config.providerKeys)
        : createDefaultLlmCall(this.config.apiKey))

    // Apply per-agent model overrides from reviewerConfig before execution.
    // Walk the plan's agents and swap the model for any agent named in the config.
    // This is done in the adapter (not the engine) to keep the engine pure.
    const plan = applyReviewerConfig(state.plan, this.config.reviewerConfig)

    // Create node executor bound to the LLM function and lifecycle hooks
    const executor = createNodeExecutor(llmCall, hooks)

    // Build the LangGraph StateGraph from the Plan.
    // Passing apiKey enables the cognitive router (classifier nodes injected before
    // each tool-enabled agent node).
    const graph = buildStateGraph(plan, executor, this.config.apiKey)

    // Initial state for the graph run (use the plan-with-overrides)
    state.plan = plan
    const initialState = {
      question: state.question,
      customVars: state.customVars,
      outputs: state.outputs,
      executionOrder: state.executionOrder,
      toolDecisions: {},
      toolUseHistory: [],
      status: state.status,
      error: state.error,
      startedAt: state.startedAt
    }

    // Invoke the graph. recursionLimit counts node executions, not call-stack depth.
    // Cognitive router adds one classifier node per tool-enabled agent turn, so the
    // effective step count ~doubles. 150 gives plenty of headroom for max-revision runs.
    const finalState = await graph.invoke(initialState, { recursionLimit: 150 })

    // Log cognitive router decisions summary
    const decisionEntries = Object.entries(finalState.toolDecisions ?? {})
    if (decisionEntries.length > 0) {
      console.info(`[LangGraphAdapter] Tool decisions (${decisionEntries.length} classifier turns):`)
      for (const [nodeId, decision] of decisionEntries) {
        console.info(
          `  ${nodeId}: [${decision.needs.join(', ') || 'none'}] budget=${decision.budget}${decision.reason ? ` — ${decision.reason}` : ''}`
        )
      }
    }

    // Sync final state back to ExecutionState
    state.outputs = finalState.outputs
    state.executionOrder = finalState.executionOrder
    state.status = finalState.status
    state.error = finalState.error

    // Task 6: Assemble Conclusion from final execution state
    if (state.status === 'ERROR') {
      return this.buildFailedConclusion(state.error?.message ?? 'Execution error', state)
    }

    return this.buildSuccessfulConclusion(state)
  }

  /**
   * Build a successful Conclusion from a completed execution state.
   * Task 6: Determines terminalState by scanning executionOrder for revision indicators.
   */
  private buildSuccessfulConclusion(state: ExecutionState): Conclusion {
    const transcript: AgentOutput[] = state.executionOrder
      .map((id) => state.outputs[id])
      .filter((o): o is AgentOutput => o !== undefined)

    const totalTokensInput = transcript.reduce((sum, o) => sum + o.tokensInput, 0)
    const totalTokensOutput = transcript.reduce((sum, o) => sum + o.tokensOutput, 0)

    const totalElapsedMs = Date.now() - state.startedAt

    // Cost estimate from token counts × per-model pricing (USD per million tokens, May 2026)
    // Unknown models skip cost tracking — returns undefined, not an error.
    const PRICING: Record<string, { input: number; output: number }> = {
      // Anthropic
      'claude-haiku-4-5-20251001': { input: 0.8, output: 4.0 },
      'claude-haiku-4-5': { input: 0.8, output: 4.0 },
      'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
      'claude-opus-4-7': { input: 15.0, output: 75.0 },
      // Google (pricing for ≤200K context window; >200K is higher)
      'gemini-2.5-pro': { input: 1.25, output: 10.0 },
      'gemini-2.0-flash': { input: 0.1, output: 0.4 },
      // OpenAI
      'gpt-4o': { input: 2.5, output: 10.0 },
      'gpt-4o-mini': { input: 0.15, output: 0.6 },
      // xAI (approximate — verify against api.x.ai pricing page)
      'grok-2': { input: 2.0, output: 10.0 },
      'grok-3': { input: 3.0, output: 15.0 }
    }
    const estimatedCostUsd = transcript.reduce((sum, o) => {
      const p = PRICING[o.model]
      if (!p) return sum // Unknown models skip cost tracking
      return sum + (o.tokensInput * p.input + o.tokensOutput * p.output) / 1_000_000
    }, 0)
    console.info(
      `[LangGraphAdapter] Estimated cost: $${estimatedCostUsd.toFixed(4)} | ${transcript.length} agent turns | ${totalTokensInput}in/${totalTokensOutput}out tokens`
    )

    // Concatenate mode: used by brokered/reviewer flows without synthesis.
    const isConcatenate = state.plan.responseMode === 'concatenate'

    if (isConcatenate) {
      const content = transcript
        .map((o) =>
          o.error ? `## ${o.agentName}\n\n⚠ Provider error: ${o.error}` : `## ${o.agentName}\n\n${o.content}`
        )
        .join('\n\n---\n\n')

      // All reviewers errored → FAILED; any success → CLEAN
      const allFailed = transcript.length > 0 && transcript.every((o) => !!o.error)

      return {
        content,
        structured: undefined,
        transcript,
        terminalState: allFailed ? 'FAILED' : 'CLEAN',
        totalTokensInput,
        totalTokensOutput,
        totalElapsedMs,
        ...(allFailed ? { error: 'All reviewer LLM calls failed' } : {})
      }
    }

    // Terminal output: resolved from explicit responseNode set by compileSpec().
    const terminalOutput = state.plan.responseNode ? state.outputs[state.plan.responseNode] : undefined

    // If the terminal/synthesis node itself failed, surface as FAILED conclusion.
    if (terminalOutput?.error) {
      return this.buildFailedConclusion(
        `Terminal node '${state.plan.responseNode}' failed: ${terminalOutput.error}`,
        state
      )
    }

    const content = terminalOutput?.content ?? ''
    const structured = terminalOutput?.structured

    // Task 6: Determine terminalState by scanning for revision indicators
    // - CLEAN: no terminal-k nodes with k>0 executed
    // - REVISED: terminal-k with k>0 executed AND final audit didn't trigger revision
    // - MAX_REVISIONS: final audit WOULD trigger revision but ceiling was hit
    let terminalState: 'CLEAN' | 'REVISED' | 'MAX_REVISIONS' | 'FAILED' = 'CLEAN'

    // Scan executionOrder to find revision history
    let maxRevisionIndex = 0
    let finalConditionalEdge: (typeof state.plan.graph.conditionalEdges)[number] | undefined

    for (const nodeId of state.executionOrder) {
      const node = state.plan.graph.nodes[nodeId]
      const output = state.outputs[nodeId]
      if (!node || !output) continue

      // Track highest revision index in terminal/audit nodes
      if ((node.role === 'terminal' || node.role === 'audit') && node.metadata.revisionIndex !== undefined) {
        maxRevisionIndex = Math.max(maxRevisionIndex, node.metadata.revisionIndex)
      }

      // Track the most recent conditional edge (only audit nodes with k < maxRevisions have one)
      if (node.role === 'audit') {
        const edge = state.plan.graph.conditionalEdges.find((e) => e.from === nodeId)
        if (edge) finalConditionalEdge = edge
      }
    }

    // Determine terminalState based on revision history
    if (maxRevisionIndex > 0) {
      // Revisions occurred. Check if the final audit would have triggered another revision.
      // If so, and we can't do more, it's MAX_REVISIONS. Otherwise it's REVISED.
      if (finalConditionalEdge) {
        const auditWouldTrigger = this.evaluateStateCondition(finalConditionalEdge.condition, state.outputs)

        // maxRevisions is always set by compileSpec().
        const maxPossibleRevisions = state.plan.maxRevisions ?? 0

        // If final audit triggers revision AND we've done all revisions, it's MAX_REVISIONS
        if (auditWouldTrigger && maxRevisionIndex >= maxPossibleRevisions) {
          terminalState = 'MAX_REVISIONS'
        } else {
          terminalState = 'REVISED'
        }
      } else {
        terminalState = 'REVISED'
      }
    } else {
      terminalState = 'CLEAN'
    }

    return {
      content,
      structured,
      transcript,
      terminalState,
      totalTokensInput,
      totalTokensOutput,
      totalElapsedMs
    }
  }

  /**
   * Build a FAILED-state Conclusion for error cases.
   */
  private buildFailedConclusion(errorMessage: string, state: ExecutionState | undefined): Conclusion {
    const transcript: AgentOutput[] = state
      ? state.executionOrder.map((id) => state.outputs[id]).filter((o): o is AgentOutput => o !== undefined)
      : []

    const totalTokensInput = transcript.reduce((sum, o) => sum + o.tokensInput, 0)
    const totalTokensOutput = transcript.reduce((sum, o) => sum + o.tokensOutput, 0)

    const totalElapsedMs = state ? Date.now() - state.startedAt : 0

    return {
      content: '',
      transcript,
      terminalState: 'FAILED',
      totalTokensInput,
      totalTokensOutput,
      totalElapsedMs,
      error: errorMessage
    }
  }

  /**
   * Evaluates a StateCondition against the full outputs map.
   * Handles both single-node (targetNode) and multi-node (anyOf) forms.
   */
  private evaluateStateCondition(condition: StateCondition, outputs: Record<string, AgentOutput>): boolean {
    if ('anyOf' in condition) {
      return condition.anyOf.some((nodeId) => {
        const output = outputs[nodeId]
        if (!output) return false
        return this.evaluateRevisionCondition(condition.check, output)
      })
    }
    const output = outputs[condition.targetNode]
    if (!output) return false
    return this.evaluateRevisionCondition(condition.check, output)
  }

  /**
   * Evaluates a RevisionCondition against an agent's output.
   * Returns true if the condition is satisfied (triggers revision), false otherwise.
   */
  private evaluateRevisionCondition(condition: RevisionCondition, output: AgentOutput): boolean {
    switch (condition.type) {
      case 'contains': {
        const searchStr = condition.value
        const contentStr = output.content
        const caseSensitive = condition.caseSensitive ?? true
        if (caseSensitive) {
          return contentStr.includes(searchStr)
        }
        return contentStr.toLowerCase().includes(searchStr.toLowerCase())
      }

      case 'json-field-equals': {
        if (!output.structured) return false
        const value = this.getJsonField(output.structured, condition.path)
        return value === condition.value
      }

      case 'json-field-truthy': {
        if (!output.structured) return false
        const value = this.getJsonField(output.structured, condition.path)
        return Boolean(value)
      }

      default:
        return false
    }
  }

  /**
   * Extract a value from a JSON object using dot-notation path.
   * Example: getJsonField({ result: { verdict: 'yes' } }, 'result.verdict') => 'yes'
   */
  private getJsonField(obj: unknown, path: string): unknown {
    const parts = path.split('.')
    let current = obj
    for (const part of parts) {
      if (typeof current !== 'object' || current === null) {
        return undefined
      }
      current = (current as Record<string, unknown>)[part]
    }
    return current
  }

  /**
   * Run a promise with a timeout. Rejects with TimeoutError if the
   * promise doesn't resolve within ms.
   */
  private async runWithTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Execution timed out after ${ms}ms`))
      }, ms)

      fn().then(
        (value) => {
          clearTimeout(timer)
          resolve(value)
        },
        (err) => {
          clearTimeout(timer)
          reject(err)
        }
      )
    })
  }

  /**
   * Safely invoke an optional hook. Hooks may be sync or async;
   * we await all of them. Errors are NOT caught here — callers
   * decide how to handle hook failures.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async callHook<T extends (...args: any[]) => any>(
    hook: T | undefined,
    ...args: Parameters<T>
  ): Promise<void> {
    if (hook === undefined) return
    const result = hook(...args)
    if (result instanceof Promise) {
      await result
    }
  }
}

/**
 * Apply per-agent model overrides from reviewerConfig to a Plan.
 * Returns a shallow copy with the agents map updated; the original plan is not mutated.
 */
function applyReviewerConfig(plan: Plan, reviewerConfig: ReviewerConfig | undefined): Plan {
  if (!reviewerConfig || Object.keys(reviewerConfig).length === 0) return plan

  const updatedAgents = { ...plan.agents }
  for (const [agentName, model] of Object.entries(reviewerConfig)) {
    if (updatedAgents[agentName]) {
      updatedAgents[agentName] = { ...updatedAgents[agentName]!, model }
    }
  }
  return { ...plan, agents: updatedAgents }
}

/**
 * Configuration for LangGraphAdapter instances.
 */
export interface LangGraphAdapterConfig {
  /**
   * Anthropic API key. Defaults to process.env.ANTHROPIC_API_KEY.
   * Used as the Anthropic key when providerKeys is not supplied.
   */
  apiKey?: string

  /**
   * Per-vendor API keys for multi-vendor routing.
   * When set, takes precedence over apiKey for all providers.
   */
  providerKeys?: ProviderKeys

  /**
   * Per-agent model overrides applied to the Plan before execution.
   * Keys are agent names; values are model ID strings.
   * Used by the Reviewers teams to let users configure which model
   * fills each reviewer slot.
   */
  reviewerConfig?: ReviewerConfig

  /**
   * Default timeout for executions (milliseconds). Can be overridden
   * per-call via ExecuteParams.timeoutMs. Default: 5 minutes.
   */
  defaultTimeoutMs?: number
}
