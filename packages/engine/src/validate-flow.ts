import { VadaEngineError } from './errors'
import type { AgentFailurePolicy, Flow, Round } from './flow-types'

export class InvalidFlowConfigError extends VadaEngineError {
  readonly name = 'InvalidFlowConfigError'

  constructor(
    message: string,
    public readonly context: {
      rule: string
      reason: string
    }
  ) {
    super(message)
  }
}

/**
 * Resolves the effective agent_failure policy for a round.
 * Rule 10: parallel defaults to 'continue'; serial defaults to 'abort'.
 * Explicit declaration always wins.
 */
export function resolveAgentFailure(round: Pick<Round, 'layout' | 'agentFailure'>): AgentFailurePolicy {
  if (round.agentFailure !== undefined) return round.agentFailure
  return round.layout === 'parallel' ? 'continue' : 'abort'
}

/**
 * Validates a Flow against the 10 structural and semantic rules from D-033.
 * Throws InvalidFlowConfigError on the first violation found.
 * Rule 10 (agent_failure defaults) is a derivation rule — use resolveAgentFailure instead.
 */
export function validateFlow(flow: Flow): void {
  // Rule 1: rounds.length >= 1
  if (flow.rounds.length === 0) {
    throw new InvalidFlowConfigError('flow must have at least one round', {
      rule: 'rule-1-rounds-non-empty',
      reason: 'rounds array is empty'
    })
  }

  // Rule 2: round ids unique within flow
  const roundIndexMap = new Map<string, number>()
  for (let i = 0; i < flow.rounds.length; i++) {
    const round = flow.rounds[i]!
    if (roundIndexMap.has(round.id)) {
      throw new InvalidFlowConfigError(`duplicate round id '${round.id}'`, {
        rule: 'rule-2-unique-round-ids',
        reason: `round id '${round.id}' appears more than once`
      })
    }
    roundIndexMap.set(round.id, i)
  }

  // Build top-level agent name set for Rule 4
  const agentNames = new Set(flow.agents.map((a) => a.name))

  for (const round of flow.rounds) {
    const roundIdx = roundIndexMap.get(round.id)!

    // Rule 9: rounds with zero agents are rejected
    if (round.agents.length === 0) {
      throw new InvalidFlowConfigError(`round '${round.id}' has no agents`, {
        rule: 'rule-9-round-agents-non-empty',
        reason: `round '${round.id}' agents array is empty`
      })
    }

    // Rule 4: all agent names referenced in rounds exist in flow.agents
    for (const agentInRound of round.agents) {
      if (!agentNames.has(agentInRound.name)) {
        throw new InvalidFlowConfigError(`round '${round.id}' references unknown agent '${agentInRound.name}'`, {
          rule: 'rule-4-agent-refs-exist',
          reason: `agent '${agentInRound.name}' not found in flow.agents`
        })
      }
    }

    // Rule 5: repeats >= 1 when present
    if (round.repeats !== undefined && round.repeats < 1) {
      throw new InvalidFlowConfigError(`round '${round.id}' repeats must be >= 1; got ${round.repeats}`, {
        rule: 'rule-5-repeats-min-1',
        reason: `repeats < 1: ${round.repeats}`
      })
    }

    // Rule 8: round must have message_template OR every agent must have its own
    const hasRoundTemplate = round.messageTemplate !== undefined
    const allAgentsHaveTemplate = round.agents.every((a) => a.messageTemplate !== undefined)
    if (!hasRoundTemplate && !allAgentsHaveTemplate) {
      throw new InvalidFlowConfigError(
        `round '${round.id}' requires a round-level message_template or a message_template on every agent`,
        {
          rule: 'rule-8-template-required',
          reason: 'no message_template on round and at least one agent lacks its own'
        }
      )
    }

    if (round.onFailure) {
      const { action, target, maxRevisions } = round.onFailure

      if (action === 'revise') {
        // Rule 7: action='revise' requires both target and max_revisions
        if (target === undefined) {
          throw new InvalidFlowConfigError(`round '${round.id}' on_failure action='revise' requires target`, {
            rule: 'rule-7-revise-requires-target-and-max',
            reason: "action is 'revise' but target is missing"
          })
        }
        if (maxRevisions === undefined) {
          throw new InvalidFlowConfigError(`round '${round.id}' on_failure action='revise' requires max_revisions`, {
            rule: 'rule-7-revise-requires-target-and-max',
            reason: "action is 'revise' but max_revisions is missing"
          })
        }

        // Rule 6: max_revisions >= 1 when action='revise'
        if (maxRevisions < 1) {
          throw new InvalidFlowConfigError(
            `round '${round.id}' on_failure max_revisions must be >= 1; got ${maxRevisions}`,
            {
              rule: 'rule-6-max-revisions-min-1',
              reason: `max_revisions < 1: ${maxRevisions}`
            }
          )
        }

        // Rule 3: on_failure.target must reference a prior round (no forward refs, no self-refs)
        const targetIdx = roundIndexMap.get(target)
        if (targetIdx === undefined) {
          throw new InvalidFlowConfigError(`round '${round.id}' on_failure.target '${target}' does not exist`, {
            rule: 'rule-3-no-forward-target-refs',
            reason: `target round '${target}' not found in flow.rounds`
          })
        }
        if (targetIdx >= roundIdx) {
          throw new InvalidFlowConfigError(`round '${round.id}' on_failure.target '${target}' is not a prior round`, {
            rule: 'rule-3-no-forward-target-refs',
            reason: `target '${target}' at index ${targetIdx} is not prior to '${round.id}' at index ${roundIdx}`
          })
        }
      }
    }
  }
}
