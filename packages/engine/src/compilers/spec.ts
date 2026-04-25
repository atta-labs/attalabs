import type { Agent } from '@atta/agents'
import type { BrokeredWorkflow, Plan, RoundsWorkflow, SoloWorkflow, Team } from '../types'
import type { DeliberationSpec } from '../spec-types'
import { compile } from '../compile'

function specAgentToAgent(sa: DeliberationSpec['agents'][number]): Agent {
  return {
    name: sa.name,
    description: sa.description,
    systemPrompt: sa.systemPrompt,
    tools: sa.tools,
    model: sa.model,
    outputSchema: sa.outputFormat === 'structured' ? sa.outputSchema : undefined
  }
}

function mergeTemplates(roundTemplate: string, synthesisTemplate: string): string {
  return `{{#if isTerminal}}\n${synthesisTemplate}\n{{else}}\n${roundTemplate}\n{{/if}}`
}

export function specToTeam(spec: DeliberationSpec): Team {
  const agents: Agent[] = spec.agents.map(specAgentToAgent)

  if (spec.reviewers) {
    const workflow: BrokeredWorkflow = {
      type: 'brokered',
      reviewers: spec.reviewers.map((r) => ({
        agentName: r.agent,
        messageTemplate: r.messageTemplate
      }))
    }
    return { name: spec.id, description: spec.description, agents, workflow }
  }

  const flow = spec.flow!

  if (!flow.rounds) {
    const synthAgentDef = spec.agents.find((a) => a.name === flow.synthesis!.agent)
    if (!synthAgentDef) {
      throw new Error(`Solo flow synthesis agent '${flow.synthesis!.agent}' not found in spec agents`)
    }
    const synthAgent = specAgentToAgent(synthAgentDef)
    const workflow: SoloWorkflow = { type: 'solo' }
    return { name: spec.id, description: spec.description, agents: [synthAgent], workflow }
  }

  const messageTemplate = mergeTemplates(flow.rounds.messageTemplate, flow.synthesis!.messageTemplate)
  const auditAgentNames = flow.audit?.agents ?? []
  const maxRevisions = flow.audit?.revision.max

  let workflow: RoundsWorkflow
  if (flow.audit) {
    const { trigger } = flow.audit.revision
    workflow = {
      type: 'rounds',
      rounds: flow.rounds.count,
      messageTemplate,
      terminalAgent: flow.synthesis!.agent,
      auditAgent: auditAgentNames.length === 1 ? auditAgentNames[0]! : auditAgentNames,
      auditTemplate: flow.audit.messageTemplate,
      revisionCondition:
        trigger.type === 'contains'
          ? { type: 'contains', value: trigger.value!, caseSensitive: trigger.caseSensitive ?? false }
          : trigger.type === 'json-field-equals'
            ? { type: 'json-field-equals', path: trigger.path!, value: trigger.value }
            : { type: 'json-field-truthy', path: trigger.path! },
      maxRevisions
    }
  } else {
    workflow = {
      type: 'rounds',
      rounds: flow.rounds.count,
      messageTemplate,
      terminalAgent: flow.synthesis!.agent
    }
  }

  return { name: spec.id, description: spec.description, agents, workflow }
}

function findResponseNode(plan: Plan): string | undefined {
  if (plan.graph.nodes.solo) return 'solo'
  if (plan.graph.nodes['terminal-0']) return 'terminal-0'
  return undefined
}

function buildClassifierModes(spec: DeliberationSpec): Record<string, 'auto' | 'skip' | 'always_tools'> | undefined {
  const modes: Record<string, 'auto' | 'skip' | 'always_tools'> = {}
  let hasAny = false
  for (const agent of spec.agents) {
    if (agent.classifier?.mode) {
      modes[agent.name] = agent.classifier.mode
      hasAny = true
    }
  }
  return hasAny ? modes : undefined
}

export function compileSpec(spec: DeliberationSpec, question: string, model?: string): Plan {
  const team = specToTeam(spec)
  const plan = compile({ team, question, model: model ?? spec.defaults.model })

  const responseMode: 'synthesize' | 'concatenate' = spec.reviewers ? 'concatenate' : 'synthesize'
  const responseNode = responseMode === 'synthesize' ? findResponseNode(plan) : undefined
  const maxRevisions = spec.flow?.audit?.revision.max ?? 0
  const classifierModes = buildClassifierModes(spec)

  return {
    ...plan,
    teamName: spec.id,
    specId: spec.id,
    responseMode,
    responseNode,
    maxRevisions,
    ...(classifierModes ? { classifierModes } : {})
  }
}
