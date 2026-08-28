import type { Agent } from '@atta/agents'
import type { AnyFlow, Flow, Round, StepsFlow } from './flow-types'
import type { Plan, PlanNode, PlanEdge, PlanConditionalEdge, RevisionCondition } from './types'
import { validateFlow, validateStepsFlow } from './validate-flow'

type Shape = 'solo' | 'brokered-no-synth' | 'brokered-synth' | 'rounds-audit' | 'agent-lifecycle'

// The XOR from task 1 (Flow.steps?: never / StepsFlow.rounds?: never) guarantees
// exactly one of the two is present — this is the one-line steps/rounds split.
function isStepsFlow(flow: AnyFlow): flow is StepsFlow {
  return Array.isArray((flow as StepsFlow).steps)
}

function detectShape(flow: AnyFlow): Shape {
  if (isStepsFlow(flow)) return 'agent-lifecycle'
  const hasRevision = flow.rounds.some((r) => r.onFailure?.action === 'revise')
  if (hasRevision) return 'rounds-audit'
  if (flow.rounds.length === 1 && flow.rounds[0]!.agents.length === 1) return 'solo'
  const hasSynthesizer = flow.rounds.length > 1 && flow.rounds[flow.rounds.length - 1]!.agents.length === 1
  if (hasSynthesizer) return 'brokered-synth'
  return 'brokered-no-synth'
}

function renderVars(text: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((t, [k, v]) => t.replaceAll(`{{${k}}}`, v), text)
}

function buildAgents(flow: Flow, model: string, customVars: Record<string, string>): Record<string, Agent> {
  const agents: Record<string, Agent> = {}
  const defaultMaxTokens = flow.defaults.maxTokens
  for (const fa of flow.agents) {
    const maxTokens = fa.maxTokens ?? defaultMaxTokens
    agents[fa.name] = {
      name: fa.name,
      description: fa.description ?? '',
      systemPrompt: renderVars(fa.systemPrompt, customVars),
      tools: fa.tools,
      customTools: fa.customTools,
      model: fa.model ?? model,
      ...(maxTokens !== undefined ? { maxTokens } : {}),
      outputSchema: fa.outputSchema
    }
  }
  return agents
}

function buildClassifierModes(flow: Flow): Record<string, 'auto' | 'skip' | 'always_tools'> | undefined {
  const modes: Record<string, 'auto' | 'skip' | 'always_tools'> = {}
  let hasAny = false
  for (const fa of flow.agents) {
    if (fa.classifier) {
      modes[fa.name] = fa.classifier.mode
      hasAny = true
    }
  }
  return hasAny ? modes : undefined
}

function resolveTemplate(round: Round, agentName: string): string {
  const agent = round.agents.find((a) => a.name === agentName)
  return agent?.messageTemplate ?? round.messageTemplate ?? '{{question}}'
}

// ─── Solo ──────────────────────────────────────────────────────────────────────

function compileSolo(flow: Flow, base: Omit<Plan, 'graph' | 'maxRevisions' | 'responseMode' | 'responseNode'>): Plan {
  const round = flow.rounds[0]!
  const agent = round.agents[0]!
  const template = resolveTemplate(round, agent.name)

  const node: PlanNode = {
    id: 'solo',
    agentName: agent.name,
    inputTemplate: template,
    role: 'solo',
    kind: 'solo-agent',
    metadata: {}
  }

  return {
    ...base,
    maxRevisions: 0,
    responseMode: 'synthesize',
    responseNode: 'solo',
    graph: {
      nodes: { solo: node },
      edges: [],
      conditionalEdges: [],
      entryNode: 'solo'
    }
  }
}

// ─── Brokered-no-synth ─────────────────────────────────────────────────────────

function compileBrokeredNoSynth(
  flow: Flow,
  base: Omit<Plan, 'graph' | 'maxRevisions' | 'responseMode' | 'responseNode'>
): Plan {
  const reviewRound = flow.rounds[0]!
  const nodes: Record<string, PlanNode> = {}
  const edges: PlanEdge[] = []

  for (const agentInRound of reviewRound.agents) {
    const id = `reviewer-${agentInRound.name}`
    nodes[id] = {
      id,
      agentName: agentInRound.name,
      inputTemplate: resolveTemplate(reviewRound, agentInRound.name),
      role: 'solo',
      kind: 'parallel-peer',
      metadata: {}
    }
  }

  for (let i = 0; i < reviewRound.agents.length - 1; i++) {
    edges.push({
      from: `reviewer-${reviewRound.agents[i]!.name}`,
      to: `reviewer-${reviewRound.agents[i + 1]!.name}`,
      kind: 'ordering'
    })
  }

  const entryNode = `reviewer-${reviewRound.agents[0]!.name}`

  return {
    ...base,
    maxRevisions: 0,
    responseMode: 'concatenate',
    graph: {
      nodes,
      edges,
      conditionalEdges: [],
      entryNode
    }
  }
}

// ─── Brokered-synth ────────────────────────────────────────────────────────────

function compileBrokeredSynth(
  flow: Flow,
  base: Omit<Plan, 'graph' | 'maxRevisions' | 'responseMode' | 'responseNode'>
): Plan {
  const reviewRound = flow.rounds[0]!
  const synthRound = flow.rounds[flow.rounds.length - 1]!
  const synthAgent = synthRound.agents[0]!

  const nodes: Record<string, PlanNode> = {}
  const edges: PlanEdge[] = []

  for (const agentInRound of reviewRound.agents) {
    const id = `reviewer-${agentInRound.name}`
    nodes[id] = {
      id,
      agentName: agentInRound.name,
      inputTemplate: resolveTemplate(reviewRound, agentInRound.name),
      role: 'solo',
      kind: 'parallel-peer',
      metadata: {}
    }
  }

  // Ordering edges between reviewers
  for (let i = 0; i < reviewRound.agents.length - 1; i++) {
    edges.push({
      from: `reviewer-${reviewRound.agents[i]!.name}`,
      to: `reviewer-${reviewRound.agents[i + 1]!.name}`,
      kind: 'ordering'
    })
  }

  // Flow edge from last reviewer to synthesis
  edges.push({
    from: `reviewer-${reviewRound.agents[reviewRound.agents.length - 1]!.name}`,
    to: 'brokered-synthesis',
    kind: 'flow'
  })

  nodes['brokered-synthesis'] = {
    id: 'brokered-synthesis',
    agentName: synthAgent.name,
    inputTemplate: resolveTemplate(synthRound, synthAgent.name),
    role: 'terminal',
    kind: 'synthesizer',
    metadata: {}
  }

  const entryNode = `reviewer-${reviewRound.agents[0]!.name}`

  return {
    ...base,
    maxRevisions: 0,
    responseMode: 'synthesize',
    responseNode: 'brokered-synthesis',
    graph: {
      nodes,
      edges,
      conditionalEdges: [],
      entryNode
    }
  }
}

// ─── Rounds-audit ──────────────────────────────────────────────────────────────

function compileRoundsAudit(
  flow: Flow,
  base: Omit<Plan, 'graph' | 'maxRevisions' | 'responseMode' | 'responseNode'>
): Plan {
  // Identify rounds by role
  const auditRound = flow.rounds.find((r) => r.onFailure?.action === 'revise')!
  const synthRoundId = auditRound.onFailure!.target!
  const synthesisRound = flow.rounds.find((r) => r.id === synthRoundId)!
  const debateRound = flow.rounds.find((r) => r !== auditRound && r !== synthesisRound)!

  const repeats = debateRound.repeats ?? 1
  const maxRevisions = auditRound.onFailure!.maxRevisions ?? 1
  const auditAgents = auditRound.agents.map((a) => a.name)
  const synthAgent = synthesisRound.agents[0]!
  const revisionCondition = buildRevisionCondition(auditRound.onFailure!.signal)

  const totalRounds = repeats

  const nodes: Record<string, PlanNode> = {}
  const edges: PlanEdge[] = []
  const conditionalEdges: PlanConditionalEdge[] = []

  // ── Debate nodes ──────────────────────────────────────────────────────────
  for (let r = 0; r < repeats; r++) {
    for (const agentInRound of debateRound.agents) {
      const id = `round-${r}-${agentInRound.name}`
      nodes[id] = {
        id,
        agentName: agentInRound.name,
        inputTemplate: resolveTemplate(debateRound, agentInRound.name),
        role: 'round',
        kind: 'parallel-peer',
        metadata: { roundIndex: r, totalRounds }
      }
    }
  }

  // Ordering edges within each repeat, and between repeats
  for (let r = 0; r < repeats; r++) {
    for (let i = 0; i < debateRound.agents.length - 1; i++) {
      edges.push({
        from: `round-${r}-${debateRound.agents[i]!.name}`,
        to: `round-${r}-${debateRound.agents[i + 1]!.name}`,
        kind: 'ordering'
      })
    }
    // Bridge from last agent of repeat r to first agent of repeat r+1
    if (r < repeats - 1) {
      edges.push({
        from: `round-${r}-${debateRound.agents[debateRound.agents.length - 1]!.name}`,
        to: `round-${r + 1}-${debateRound.agents[0]!.name}`,
        kind: 'ordering'
      })
    }
  }

  // ── Terminal (synthesis) nodes: one per slot (0..maxRevisions) ────────────
  for (let k = 0; k <= maxRevisions; k++) {
    const id = `terminal-${k}`
    nodes[id] = {
      id,
      agentName: synthAgent.name,
      inputTemplate: resolveTemplate(synthesisRound, synthAgent.name),
      role: 'terminal',
      kind: k === 0 ? 'synthesizer' : 'revision-terminal',
      metadata: { totalRounds, revisionIndex: k }
    }
  }

  // Flow edge: last debate agent → terminal-0
  edges.push({
    from: `round-${repeats - 1}-${debateRound.agents[debateRound.agents.length - 1]!.name}`,
    to: 'terminal-0',
    kind: 'flow'
  })

  // ── Sentinel ──────────────────────────────────────────────────────────────
  nodes.__END__ = {
    id: '__END__',
    agentName: '__END__',
    inputTemplate: '',
    role: 'solo',
    kind: 'system-sentinel',
    metadata: {}
  }

  // ── Audit nodes and revision wiring ───────────────────────────────────────
  for (let k = 0; k <= maxRevisions; k++) {
    // Emit one audit slot per revision slot
    for (let i = 0; i < auditAgents.length; i++) {
      const id = `audit-${auditAgents[i]!}-${k}`
      nodes[id] = {
        id,
        agentName: auditAgents[i]!,
        inputTemplate: resolveTemplate(auditRound, auditAgents[i]!),
        role: 'audit',
        kind: 'auditor',
        metadata: { revisionIndex: k }
      }
    }

    // Ordering edges within audit slot k
    for (let i = 0; i < auditAgents.length - 1; i++) {
      edges.push({
        from: `audit-${auditAgents[i]!}-${k}`,
        to: `audit-${auditAgents[i + 1]!}-${k}`,
        kind: 'ordering'
      })
    }

    // Flow edge: terminal-k → first audit agent in slot k
    edges.push({
      from: `terminal-${k}`,
      to: `audit-${auditAgents[0]!}-${k}`,
      kind: 'flow'
    })

    // Conditional edge from last auditor in slot k (only for k < maxRevisions)
    if (k < maxRevisions) {
      const allAuditNodesInSlot = auditAgents.map((name) => `audit-${name}-${k}`)
      conditionalEdges.push({
        from: `audit-${auditAgents[auditAgents.length - 1]!}-${k}`,
        ifTrue: `terminal-${k + 1}`,
        ifFalse: '__END__',
        condition: { anyOf: allAuditNodesInSlot, check: revisionCondition }
      })
    }
  }

  const entryNode = `round-0-${debateRound.agents[0]!.name}`

  return {
    ...base,
    maxRevisions,
    responseMode: 'synthesize',
    responseNode: 'terminal-0',
    graph: {
      nodes,
      edges,
      conditionalEdges,
      entryNode
    }
  }
}

// ─── Agent-lifecycle (steps) ─────────────────────────────────────────────────

/**
 * Compiles a steps-shaped Flow into a Plan: one PlanAgentSpawnNode per
 * AgentStep, one PlanMechanicalNode per MechanicalStep, node id = the
 * step's own declared id (verbatim, no synthetic numbering — task 1's
 * validateStepsFlow already guarantees uniqueness), and a sequential 'flow'
 * edge between each consecutive pair of steps in declaration order.
 *
 * No executor exists yet to run these nodes (engine-agent-spawn-v1 tasks
 * 3/4) — this only makes the Plan describe what will run.
 */
function compileSteps(
  flow: StepsFlow,
  base: Omit<Plan, 'graph' | 'maxRevisions' | 'responseMode' | 'responseNode'>
): Plan {
  const nodes: Record<string, PlanNode> = {}

  for (const step of flow.steps) {
    if (step.type === 'agent') {
      nodes[step.id] = {
        id: step.id,
        role: 'agent-spawn',
        kind: 'agent-spawn',
        promptTemplate: step.promptTemplate,
        agentRole: step.role,
        permission: step.permission,
        workingDirectory: step.workingDirectory,
        maxTurns: step.maxTurns,
        ...(step.resume !== undefined ? { resume: step.resume } : {}),
        metadata: {}
      }
    } else {
      nodes[step.id] = {
        id: step.id,
        role: 'mechanical',
        kind: 'mechanical',
        action: step.action,
        metadata: {}
      }
    }
  }

  const edges: PlanEdge[] = []
  for (let i = 0; i < flow.steps.length - 1; i++) {
    edges.push({
      from: flow.steps[i]!.id,
      to: flow.steps[i + 1]!.id,
      kind: 'flow'
    })
  }

  const entryNode = flow.steps[0]!.id

  return {
    ...base,
    // A steps-shaped Flow has no rounds/onFailure at all (the XOR forbids
    // it) — 0 is a true structural fact for this shape, not a placeholder.
    maxRevisions: 0,
    // responseMode/responseNode are left unset: no task in this tranche
    // defines what "the conclusion" of a steps flow is (see PR body).
    graph: {
      nodes,
      edges,
      conditionalEdges: [],
      entryNode
    }
  }
}

function buildRevisionCondition(signal: {
  type: 'contains' | 'equals' | 'matches'
  value: string
  caseSensitive?: boolean
}): RevisionCondition {
  if (signal.type !== 'contains') {
    throw new Error(
      `Unsupported signal type '${signal.type}'. v2 engine supports only 'contains'. ` +
        `Update the flow YAML to use signal.type: 'contains', or extend compileFlow to handle '${signal.type}'.`
    )
  }
  return { type: 'contains', value: signal.value, caseSensitive: signal.caseSensitive ?? false }
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Compile a Flow (v2, rounds-shaped or steps-shaped) into a Plan ready for
 * adapter execution. Shape is detected automatically from the flow structure.
 */
export function compileFlow(
  flow: AnyFlow,
  question: string,
  model?: string,
  customVars?: Record<string, string>
): Plan {
  if (isStepsFlow(flow)) {
    validateStepsFlow(flow)

    const effectiveModel = model ?? flow.defaults.model
    const base = {
      schemaVersion: '1.0' as const,
      question,
      model: effectiveModel,
      specId: flow.id,
      teamName: flow.id,
      // No Plan.agents entry for this shape: AgentRole ({role: string}) carries
      // no systemPrompt, so there is no real Agent record to build (see PR body —
      // #996's own rationale confirms the executor resolves role→binary from its
      // own caller-supplied config, never from Plan.agents).
      agents: {} as Record<string, Agent>,
      classifierModes: undefined
    }

    return compileSteps(flow, base)
  }

  validateFlow(flow)

  const effectiveModel = model ?? flow.defaults.model
  const vars = customVars ?? {}

  const base = {
    schemaVersion: '1.0' as const,
    question,
    model: effectiveModel,
    specId: flow.id,
    teamName: flow.id,
    agents: buildAgents(flow, effectiveModel, vars),
    classifierModes: buildClassifierModes(flow)
  }

  const shape = detectShape(flow)
  switch (shape) {
    case 'solo':
      return compileSolo(flow, base)
    case 'brokered-no-synth':
      return compileBrokeredNoSynth(flow, base)
    case 'brokered-synth':
      return compileBrokeredSynth(flow, base)
    case 'rounds-audit':
      return compileRoundsAudit(flow, base)
    case 'agent-lifecycle':
      // Unreachable: isStepsFlow(flow) above already returned for the only
      // flow shape detectShape can classify as 'agent-lifecycle'.
      throw new Error('unreachable: agent-lifecycle shape handled by the isStepsFlow branch above')
  }
}
