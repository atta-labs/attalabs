import type { CompileParams, Plan } from './types.js'
import { validateTeam, validateWorkflow } from './validate.js'
import { NotImplementedError } from './errors.js'

/**
 * Compile a Team + Question + Model into a Plan.
 *
 * Performs structural validation of the Team and its Workflow,
 * then dispatches to workflow-specific compilation logic (to be
 * implemented in subsequent tasks).
 *
 * Throws InvalidTeamConfigError or InvalidWorkflowConfigError on
 * invalid input.
 *
 * See engine/src/types.ts for CompileParams and Plan shapes.
 */
export function compile(params: CompileParams): Plan {
  const { team } = params

  // Phase 1: structural validation of team + workflow references
  validateTeam(team)

  // Phase 2: workflow-internal validation (rounds >= 1, etc.)
  validateWorkflow(team.workflow, team)

  // Phase 3: workflow-specific compilation (next task)
  throw new NotImplementedError('compile() workflow compilation is not yet implemented', {
    feature: `compile-${team.workflow.type}`
  })
}
