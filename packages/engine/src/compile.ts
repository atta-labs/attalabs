import type { CompileParams, Plan } from './types.js'
import { validateTeam, validateWorkflow } from './validate.js'
import { compileSolo } from './compilers/solo.js'
import { compileCustom } from './compilers/custom.js'
import { compileRounds } from './compilers/rounds.js'

/**
 * Compile a Team + Question + Model into a Plan.
 *
 * Throws InvalidTeamConfigError or InvalidWorkflowConfigError on
 * invalid input.
 *
 * See engine/src/types.ts for CompileParams and Plan shapes.
 */
export function compile(params: CompileParams): Plan {
  const { team, question, model } = params

  // Structural validation
  validateTeam(team)
  validateWorkflow(team.workflow, team)

  // Dispatch to workflow-specific compiler
  switch (team.workflow.type) {
    case 'solo':
      return compileSolo({ team, question, model })

    case 'rounds':
      return compileRounds({ team, workflow: team.workflow, question, model })

    case 'custom':
      return compileCustom({ team, workflow: team.workflow, question, model })

    default: {
      const _exhaustive: never = team.workflow
      void _exhaustive
      throw new Error('Unreachable: unknown workflow type')
    }
  }
}
