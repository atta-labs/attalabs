/**
 * Base class for all Vāda engine errors. Provides a discriminator via .name
 * for error handling code.
 */
export abstract class VadaEngineError extends Error {
  abstract readonly name: string
}

/**
 * Thrown when a Team's configuration is structurally invalid:
 * duplicate agent names, empty agents array, workflow references
 * to agents not in the team, etc.
 */
export class InvalidTeamConfigError extends VadaEngineError {
  readonly name = 'InvalidTeamConfigError'

  constructor(
    message: string,
    public readonly context: {
      teamName: string
      reason: string
    }
  ) {
    super(message)
  }
}

/**
 * Thrown when a Workflow's configuration is invalid given its team.
 * E.g., SoloWorkflow with more than 1 agent, RoundsWorkflow with
 * rounds < 1, auditAgent same as terminalAgent, etc.
 */
export class InvalidWorkflowConfigError extends VadaEngineError {
  readonly name = 'InvalidWorkflowConfigError'

  constructor(
    message: string,
    public readonly context: {
      workflowType: string
      reason: string
    }
  ) {
    super(message)
  }
}

/**
 * Thrown when a Handlebars template has invalid syntax OR references
 * variables not available for the given node role. See validateTemplate.
 */
export class TemplateValidationError extends VadaEngineError {
  readonly name = 'TemplateValidationError'

  constructor(
    message: string,
    public readonly context: {
      template: string
      role: string
      reason: string
    }
  ) {
    super(message)
  }
}

/**
 * Placeholder error for unimplemented code paths. Will be replaced
 * with actual compilation logic in subsequent tasks.
 *
 * Intentionally thrown by the compile() skeleton until workflow
 * compilation is wired up.
 */
export class NotImplementedError extends VadaEngineError {
  readonly name = 'NotImplementedError'

  constructor(
    message: string,
    public readonly context: {
      feature: string
    }
  ) {
    super(message)
  }
}
