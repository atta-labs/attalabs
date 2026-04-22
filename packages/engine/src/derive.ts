import type { AgentOutput, ExecutionState, PlanNode, TemplateState } from './types.js'

/**
 * Derives the TemplateState from the current ExecutionState and the
 * target PlanNode about to be rendered.
 *
 * DETERMINISTIC CONTRACT: All adapters MUST use this function for
 * template state derivation. Re-implementing elsewhere would break
 * reproducibility across runtimes.
 *
 * Pure function. No mutations. No side effects.
 *
 * See types.ts (TemplateState, ExecutionState) for field semantics.
 */
export function deriveTemplateState(state: ExecutionState, node: PlanNode): TemplateState {
  const agent = state.plan.agents[node.agentName]
  if (!agent) {
    // Should be impossible — compile guarantees node.agentName exists in plan.agents
    throw new Error(`Internal error: node '${node.id}' references unknown agent '${node.agentName}'`)
  }

  // Materialize chronological outputs
  const allPreviousOutputs: AgentOutput[] = []
  for (const nodeId of state.executionOrder) {
    const output = state.outputs[nodeId]
    if (output !== undefined) {
      allPreviousOutputs.push(output)
    }
  }

  // outputsByAgent
  const outputsByAgent: Record<string, AgentOutput[]> = {}
  for (const output of allPreviousOutputs) {
    if (!outputsByAgent[output.agentName]) {
      outputsByAgent[output.agentName] = []
    }
    outputsByAgent[output.agentName]!.push(output)
  }

  // lastOutputByAgent
  const lastOutputByAgent: Record<string, AgentOutput> = {}
  for (const [agentName, outputs] of Object.entries(outputsByAgent)) {
    lastOutputByAgent[agentName] = outputs[outputs.length - 1]!
  }

  // outputsByRound
  const outputsByRound: AgentOutput[][] = []
  for (const output of allPreviousOutputs) {
    if (output.roundIndex !== undefined) {
      const r = output.roundIndex
      while (outputsByRound.length <= r) {
        outputsByRound.push([])
      }
      outputsByRound[r]!.push(output)
    }
  }

  // currentRoundOutputs
  const currentRoundOutputs: AgentOutput[] =
    node.role === 'round' && node.metadata.roundIndex !== undefined
      ? (outputsByRound[node.metadata.roundIndex] ?? [])
      : []

  // auditOutputs
  const auditOutputs: AgentOutput[] = []
  for (const nodeId of state.executionOrder) {
    const executedNode = state.plan.graph.nodes[nodeId]
    if (executedNode?.role === 'audit') {
      const output = state.outputs[nodeId]
      if (output) {
        auditOutputs.push(output)
      }
    }
  }

  // conclusion (only for audit role)
  let conclusion: string | undefined
  if (node.role === 'audit') {
    for (let i = state.executionOrder.length - 1; i >= 0; i--) {
      const executedNodeId = state.executionOrder[i]!
      const executedNode = state.plan.graph.nodes[executedNodeId]
      if (executedNode?.role === 'terminal') {
        const output = state.outputs[executedNodeId]
        if (output) {
          conclusion = output.content
          break
        }
      }
    }
  }

  // previousRevisions (only for audit role)
  let previousRevisions: AgentOutput[] | undefined
  if (node.role === 'audit') {
    const currentRevisionIndex = node.metadata.revisionIndex ?? 0
    previousRevisions = []
    for (const nodeId of state.executionOrder) {
      const executedNode = state.plan.graph.nodes[nodeId]
      if (
        executedNode?.role === 'terminal' &&
        executedNode.metadata.revisionIndex !== undefined &&
        executedNode.metadata.revisionIndex < currentRevisionIndex
      ) {
        const output = state.outputs[nodeId]
        if (output) {
          previousRevisions.push(output)
        }
      }
    }
  }

  return {
    question: state.question,
    agent,
    roundIndex: node.metadata.roundIndex,
    totalRounds: node.metadata.totalRounds,
    revisionIndex: node.metadata.revisionIndex,
    isRevision: node.metadata.isRevision === true,
    isTerminal: node.role === 'terminal',
    allPreviousOutputs,
    outputsByAgent,
    lastOutputByAgent,
    outputsByRound,
    currentRoundOutputs,
    auditOutputs,
    conclusion,
    previousRevisions,
    customVars: state.customVars
  }
}
