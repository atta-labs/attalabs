// Rebuild trigger: forces the Vada preview build on the Vinaya bump PR.
export * from './types'
export * from './errors'
export { deriveTemplateState } from './derive'
export { validateTemplate } from './validate-template'
export { loadYamlFromCatalog, listPublicSpecs } from './catalog-loader'
// Generic flow refactor PR 2: universal round-based schema + compiler
export { loadFlow } from './flow-loader'
export { compileFlow } from './compile-flow'
export type {
  Flow,
  FlowAgent,
  Round,
  AgentInRound,
  OnFailureSpec,
  FailureSignal,
  FlowDefaults,
  RoundLayout,
  AgentFailurePolicy,
  OnFailureAction,
  SignalType,
  FlowClassifierMode
} from './flow-types'
export {
  FlowSchema,
  RoundSchema,
  AgentInRoundSchema,
  OnFailureSpecSchema,
  FailureSignalSchema,
  FlowAgentSchema
} from './flow-schema'
export { validateFlow, resolveAgentFailure, InvalidFlowConfigError } from './validate-flow'
// The steps-shaped (agent-lifecycle) half of the same v2 schema. Exported
// because a Plan for that shape is the only thing `@atta/executor-agent-spawn`
// runs, and a consumer outside this workspace has no other way to produce one:
// `compileFlow` already accepts `AnyFlow`, but without these a caller can
// neither load a steps-shaped YAML nor give an object literal a type.
export { loadStepsFlow } from './flow-loader'
export { validateStepsFlow, resolveStepDependsOn } from './validate-flow'
export type {
  AnyFlow,
  StepsFlow,
  Step,
  AgentStep,
  MechanicalStep,
  AgentRole,
  StepDecision,
  FlowCustomToolSpec
} from './flow-types'
export {
  AgentRoleSchema,
  AgentStepSchema,
  MechanicalStepSchema,
  StepDecisionSchema,
  StepSchema,
  CustomToolSpecSchema
} from './flow-schema'
