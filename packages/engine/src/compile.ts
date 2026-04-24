import type { CompileParams, Plan } from './types'
import { validateTeam, validateWorkflow } from './validate'
import { compileSolo } from './compilers/solo'
import { compileCustom } from './compilers/custom'
import { compileRounds } from './compilers/rounds'
import { compileBrokered } from './compilers/brokered'

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

    case 'brokered':
      return compileBrokered({ team, workflow: team.workflow, question, model })

    default: {
      const _exhaustive: never = team.workflow
      void _exhaustive
      throw new Error('Unreachable: unknown workflow type')
    }
  }
}
