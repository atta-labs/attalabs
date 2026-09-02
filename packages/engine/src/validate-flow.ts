import { NotImplementedError, VadaEngineError } from './errors'
import type { AgentFailurePolicy, Flow, Round, StepsFlow } from './flow-types'

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
 * Validates a Flow against the 10 structural and semantic rules from the v2 schema.
 * Throws InvalidFlowConfigError on the first violation found.
 * Rule 10 (agent_failure defaults) is a derivation rule — use resolveAgentFailure instead.
 */
export function validateFlow(flow: Flow): void {
  // Rule 0: compileFlow only compiles rounds-shaped Flows. A steps-shaped
  // Flow reaching here (task 2's compiler doesn't exist yet) must fail
  // loudly and by name, not crash inside detectShape's shape-detection scan.
  if (!Array.isArray(flow.rounds)) {
    throw new NotImplementedError(
      'this Flow declares steps, not rounds — compileFlow cannot compile a steps-shaped Flow yet; that is task 2 (#982)',
      { feature: 'steps-flow-compilation' }
    )
  }

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

/**
 * Validates a StepsFlow's structural rules. Distinct from validateFlow
 * (which validates the rounds shape and refuses to compile a steps Flow):
 * this is the steps-shape counterpart, covering step-id uniqueness, agent
 * step role references, and resume references.
 */
export function validateStepsFlow(flow: StepsFlow): void {
  // XOR restated: a StepsFlow constructed by hand (bypassing Zod) must not
  // also carry rounds — defense in depth alongside the FlowSchema superRefine.
  if ((flow as { rounds?: unknown }).rounds !== undefined) {
    throw new InvalidFlowConfigError('Flow must declare exactly one of rounds or steps (XOR) — found both', {
      rule: 'rule-s0-xor-rounds-steps',
      reason: 'flow.rounds is present on a steps-shaped Flow'
    })
  }

  if (flow.steps.length === 0) {
    throw new InvalidFlowConfigError('flow must have at least one step', {
      rule: 'rule-s1-steps-non-empty',
      reason: 'steps array is empty'
    })
  }

  // Step ids unique within flow
  const stepIndexMap = new Map<string, number>()
  for (let i = 0; i < flow.steps.length; i++) {
    const step = flow.steps[i]!
    if (stepIndexMap.has(step.id)) {
      throw new InvalidFlowConfigError(`duplicate step id '${step.id}'`, {
        rule: 'rule-s2-unique-step-ids',
        reason: `step id '${step.id}' appears more than once`
      })
    }
    stepIndexMap.set(step.id, i)
  }

  const roleNames = new Set(flow.agents.map((a) => a.role))

  for (const step of flow.steps) {
    if (step.type !== 'agent') continue

    // Every agent step's role must be declared in the flow's agents
    if (!roleNames.has(step.role)) {
      throw new InvalidFlowConfigError(`step '${step.id}' references unknown role '${step.role}'`, {
        rule: 'rule-s3-role-refs-exist',
        reason: `role '${step.role}' not found in flow.agents`
      })
    }

    // resume references only a prior step
    if (step.resume !== undefined) {
      const stepIdx = stepIndexMap.get(step.id)!
      const resumeIdx = stepIndexMap.get(step.resume)
      if (resumeIdx === undefined) {
        throw new InvalidFlowConfigError(`step '${step.id}' resume '${step.resume}' does not exist`, {
          rule: 'rule-s4-no-forward-resume-refs',
          reason: `resume target '${step.resume}' not found in flow.steps`
        })
      }
      if (resumeIdx >= stepIdx) {
        throw new InvalidFlowConfigError(`step '${step.id}' resume '${step.resume}' is not a prior step`, {
          rule: 'rule-s4-no-forward-resume-refs',
          reason: `resume '${step.resume}' at index ${resumeIdx} is not prior to '${step.id}' at index ${stepIdx}`
        })
      }
    }
  }

  for (const step of flow.steps) {
    if (step.decision === undefined) continue
    const { examine, ifTrue, ifFalse, maxRevisions } = step.decision
    const stepIdx = stepIndexMap.get(step.id)!

    // rule-s5: examine must reference an existing, non-forward step id —
    // mirrors resume's rule-s4 shape (existing + not-forward).
    const examineIdx = stepIndexMap.get(examine)
    if (examineIdx === undefined) {
      throw new InvalidFlowConfigError(`step '${step.id}' decision.examine '${examine}' does not exist`, {
        rule: 'rule-s5-examine-refs-exist',
        reason: `examine target '${examine}' not found in flow.steps`
      })
    }
    if (examineIdx >= stepIdx) {
      throw new InvalidFlowConfigError(`step '${step.id}' decision.examine '${examine}' is not a prior step`, {
        rule: 'rule-s5-examine-refs-exist',
        reason: `examine '${examine}' at index ${examineIdx} is not prior to '${step.id}' at index ${stepIdx}`
      })
    }

    // rule-s6: ifTrue must reference an existing, strictly prior step —
    // mirrors validateFlow's rule-3 on_failure.target rule (no self-ref, no forward-ref).
    const ifTrueIdx = stepIndexMap.get(ifTrue)
    if (ifTrueIdx === undefined) {
      throw new InvalidFlowConfigError(`step '${step.id}' decision.ifTrue '${ifTrue}' does not exist`, {
        rule: 'rule-s6-if-true-prior-step',
        reason: `ifTrue target '${ifTrue}' not found in flow.steps`
      })
    }
    if (ifTrueIdx >= stepIdx) {
      throw new InvalidFlowConfigError(`step '${step.id}' decision.ifTrue '${ifTrue}' is not a prior step`, {
        rule: 'rule-s6-if-true-prior-step',
        reason: `ifTrue '${ifTrue}' at index ${ifTrueIdx} is not prior to '${step.id}' at index ${stepIdx}`
      })
    }

    // rule-s7: ifFalse must reference an existing step — the "continue" path,
    // not necessarily prior (it may be the next step in declaration order).
    if (!stepIndexMap.has(ifFalse)) {
      throw new InvalidFlowConfigError(`step '${step.id}' decision.ifFalse '${ifFalse}' does not exist`, {
        rule: 'rule-s7-if-false-refs-exist',
        reason: `ifFalse target '${ifFalse}' not found in flow.steps`
      })
    }

    // rule-s8: maxRevisions >= 1 — defense-in-depth alongside the Zod
    // schema's own .min(1), for a hand-constructed StepsFlow bypassing Zod.
    if (maxRevisions < 1) {
      throw new InvalidFlowConfigError(`step '${step.id}' decision.maxRevisions must be >= 1; got ${maxRevisions}`, {
        rule: 'rule-s8-max-revisions-min-1',
        reason: `maxRevisions < 1: ${maxRevisions}`
      })
    }
  }
}
