import type {
  Adapter,
  AgentOutput,
  Conclusion,
  ExecuteParams,
  ExecutionHooks,
  ExecutionState,
  Plan
} from '@atta/engine'
import { buildStateGraph } from './graph-builder'

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
  private async runExecution(
    state: ExecutionState,
    _hooks: ExecutionHooks,
    _params: ExecuteParams
  ): Promise<Conclusion> {
    // Build the StateGraph from the Plan
    const _stateGraph = buildStateGraph(state.plan, async (_graphState, _context) => {
      // Phase 2 Task 4: Implement actual node execution
      // For now, return empty updates to allow graph traversal
      return {}
    })

    // TODO (Phase 2 Task 4): Invoke the graph, populate state.outputs
    //                        as nodes execute, call hooks per node
    // TODO (Phase 2 Task 6): Assemble Conclusion from final state

    // Stub for now: return FAILED Conclusion with "not implemented"
    state.status = 'ERROR'
    state.error = { message: 'Graph invocation not yet implemented (Phase 2 Task 4)' }

    return this.buildFailedConclusion('LangGraphAdapter graph invocation not implemented', state)
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
 * Configuration for LangGraphAdapter instances.
 */
export interface LangGraphAdapterConfig {
  /**
   * Anthropic API key. Defaults to process.env.ANTHROPIC_API_KEY.
   */
  apiKey?: string

  /**
   * Default timeout for executions (milliseconds). Can be overridden
   * per-call via ExecuteParams.timeoutMs. Default: 5 minutes.
   */
  defaultTimeoutMs?: number
}
