import type { BrokeredWorkflow, CustomWorkflow, RoundsWorkflow, Team, Workflow } from './types'
import { InvalidTeamConfigError, InvalidWorkflowConfigError } from './errors'

/**
 * Validates a Team's structural integrity:
 * - agents array is non-empty
 * - no duplicate agent names
 * - workflow's agent references all exist in team.agents
 *
 * Throws InvalidTeamConfigError on failure.
 */
export function validateTeam(team: Team): void {
  // Check: agents array non-empty
  if (team.agents.length === 0) {
    throw new InvalidTeamConfigError(`Team '${team.name}' has no agents`, {
      teamName: team.name,
      reason: 'empty agents array'
    })
  }

  // Check: no duplicate agent names
  const seenNames = new Set<string>()
  for (const agent of team.agents) {
    if (seenNames.has(agent.name)) {
      throw new InvalidTeamConfigError(`Team '${team.name}' has duplicate agent name '${agent.name}'`, {
        teamName: team.name,
        reason: `duplicate agent name: ${agent.name}`
      })
    }
    seenNames.add(agent.name)
  }

  // Check: workflow's agent references all exist
  validateWorkflowReferences(team.workflow, seenNames, team.name)
}

/**
 * Validates a Workflow's internal configuration constraints.
 * - SoloWorkflow team must have exactly 1 agent
 * - RoundsWorkflow rounds must be >= 1
 * - RoundsWorkflow terminalAgent must be in team
 * - RoundsWorkflow auditAgent must be in team and != terminalAgent
 * - RoundsWorkflow maxRevisions must be >= 0 if provided
 * - CustomWorkflow steps must be non-empty
 * - CustomWorkflow each step.agent must be in team
 *
 * Throws InvalidWorkflowConfigError on failure.
 *
 * team parameter used for Solo's 1-agent check.
 */
export function validateWorkflow(workflow: Workflow, team: Team): void {
  switch (workflow.type) {
    case 'solo': {
      if (team.agents.length !== 1) {
        throw new InvalidWorkflowConfigError(
          `SoloWorkflow requires exactly 1 agent; team '${team.name}' has ${team.agents.length}`,
          { workflowType: 'solo', reason: `expected 1 agent, got ${team.agents.length}` }
        )
      }
      return
    }

    case 'rounds': {
      validateRoundsWorkflow(workflow)
      return
    }

    case 'custom': {
      validateCustomWorkflow(workflow)
      return
    }

    case 'brokered': {
      validateBrokeredWorkflow(workflow)
      return
    }

    default: {
      const _exhaustive: never = workflow
      throw new InvalidWorkflowConfigError('Unknown workflow type', {
        workflowType: 'unknown',
        reason: 'unreachable'
      })
    }
  }
}

function validateRoundsWorkflow(workflow: RoundsWorkflow): void {
  // rounds >= 1
  if (workflow.rounds < 1) {
    throw new InvalidWorkflowConfigError(`RoundsWorkflow.rounds must be >= 1; got ${workflow.rounds}`, {
      workflowType: 'rounds',
      reason: `rounds < 1: ${workflow.rounds}`
    })
  }

  // If auditAgent set, check constraints
  if ('auditAgent' in workflow && workflow.auditAgent !== undefined) {
    const auditAgentNames = Array.isArray(workflow.auditAgent) ? workflow.auditAgent : [workflow.auditAgent]
    for (const auditName of auditAgentNames) {
      if (auditName === workflow.terminalAgent) {
        throw new InvalidWorkflowConfigError(
          `RoundsWorkflow.auditAgent '${auditName}' cannot be the same as terminalAgent`,
          { workflowType: 'rounds', reason: `auditAgent '${auditName}' == terminalAgent` }
        )
      }
    }
    if (workflow.maxRevisions !== undefined && workflow.maxRevisions < 0) {
      throw new InvalidWorkflowConfigError(`RoundsWorkflow.maxRevisions must be >= 0; got ${workflow.maxRevisions}`, {
        workflowType: 'rounds',
        reason: `maxRevisions < 0: ${workflow.maxRevisions}`
      })
    }
  }
}

function validateCustomWorkflow(workflow: CustomWorkflow): void {
  if (workflow.config.steps.length === 0) {
    throw new InvalidWorkflowConfigError('CustomWorkflow must have at least 1 step', {
      workflowType: 'custom',
      reason: 'empty steps array'
    })
  }
}

function validateBrokeredWorkflow(workflow: BrokeredWorkflow): void {
  if (workflow.reviewers.length < 2) {
    throw new InvalidWorkflowConfigError(
      `BrokeredWorkflow requires at least 2 reviewers; got ${workflow.reviewers.length}`,
      { workflowType: 'brokered', reason: `reviewers.length < 2: ${workflow.reviewers.length}` }
    )
  }
  if (workflow.reviewers.length > 5) {
    throw new InvalidWorkflowConfigError(
      `BrokeredWorkflow supports at most 5 reviewers; got ${workflow.reviewers.length}`,
      { workflowType: 'brokered', reason: `reviewers.length > 5: ${workflow.reviewers.length}` }
    )
  }
  for (const reviewer of workflow.reviewers) {
    if (!reviewer.messageTemplate || reviewer.messageTemplate.trim() === '') {
      throw new InvalidWorkflowConfigError(
        `BrokeredWorkflow reviewer '${reviewer.agentName}' has an empty messageTemplate`,
        { workflowType: 'brokered', reason: `empty messageTemplate for reviewer '${reviewer.agentName}'` }
      )
    }
  }
}

/**
 * Checks that every agent name referenced by the workflow exists
 * in the agent name set. Called from validateTeam after duplicate
 * check populates the name set.
 */
function validateWorkflowReferences(workflow: Workflow, agentNames: Set<string>, teamName: string): void {
  switch (workflow.type) {
    case 'solo': {
      // Solo uses whatever's in team.agents, no named refs
      return
    }

    case 'rounds': {
      if (!agentNames.has(workflow.terminalAgent)) {
        throw new InvalidTeamConfigError(
          `Team '${teamName}' workflow references unknown terminalAgent '${workflow.terminalAgent}'`,
          { teamName, reason: `unknown terminalAgent: ${workflow.terminalAgent}` }
        )
      }
      if ('auditAgent' in workflow && workflow.auditAgent !== undefined) {
        const auditAgentNames = Array.isArray(workflow.auditAgent) ? workflow.auditAgent : [workflow.auditAgent]
        for (const auditName of auditAgentNames) {
          if (!agentNames.has(auditName)) {
            throw new InvalidTeamConfigError(
              `Team '${teamName}' workflow references unknown auditAgent '${auditName}'`,
              { teamName, reason: `unknown auditAgent: ${auditName}` }
            )
          }
        }
      }
      return
    }

    case 'custom': {
      for (const step of workflow.config.steps) {
        if (!agentNames.has(step.agent)) {
          throw new InvalidTeamConfigError(
            `Team '${teamName}' workflow step references unknown agent '${step.agent}'`,
            { teamName, reason: `unknown step agent: ${step.agent}` }
          )
        }
      }
      return
    }

    case 'brokered': {
      for (const reviewer of workflow.reviewers) {
        if (!agentNames.has(reviewer.agentName)) {
          throw new InvalidTeamConfigError(
            `Team '${teamName}' brokered workflow references unknown reviewer agent '${reviewer.agentName}'`,
            { teamName, reason: `unknown reviewer agent: ${reviewer.agentName}` }
          )
        }
      }
      return
    }

    default: {
      const _exhaustive: never = workflow
      void _exhaustive
    }
  }
}
