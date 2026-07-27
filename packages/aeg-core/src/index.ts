export * from './types'
export type { StateSource } from './state-source'
export type { DoctrineContent, DoctrineSource } from './doctrine-source'
export { ANCHOR_FIELDS, anchoredRegion } from './anchored-region'
export type { AnchorField } from './anchored-region'
export { parseRegistry } from './parse-registry'
export { parseIteration } from './parse-iteration'
export { deriveIteration } from './derive-iteration'
export { parseLedger, rowFromCells } from './parse-ledger'
export { sumLedger } from './sum-ledger'
export { aggregateTaskTokenRows, parseTokenReportEntries, parseTokensLines } from './parse-token-report'
export type { TokenSourcePr } from './parse-token-report'
export { isCodeFile, isDocFile, isSpecFile } from './file-classify'
export { hasStatusBlock } from './status-block'
export {
  classifyDocOwnersManifest,
  DOC_OWNERS_PATH,
  evaluateC5,
  globToRegex,
  isUrlPointer,
  parseDocOwners,
  pointerToPath,
  readDocAcks
} from './doc-owners'
export type { C5Result, DocAck, DocOwnersBinding, DocOwnersManifestState } from './doc-owners'
export { isWaiverLabelActorVerified, PRINCIPAL_ALLOWLIST, WAIVER_LABEL, WAIVER_LABEL_REVIEW } from './waiver-label'
export { deriveSection7, globsOverlap } from './derive-section7'
export type { Section7Match } from './derive-section7'
export { checkManifestValidity, parseNoDocRules } from './manifest-validity'
export type { NoDocRule } from './manifest-validity'
export { deriveTierFromDiff, overrideActive, readTierFromPrBody } from './pr-tier'
export {
  checkAutonomyClause,
  checkBriefSections,
  checkClosesN as checkBriefClosesN,
  checkDocUpdateList,
  checkForField,
  checkForgeTitle,
  checkPlanPrNoCloses,
  checkPremiseCoverage,
  checkPrincipalPlaceholder,
  checkProjectField,
  checkStopConditions,
  checkSurfaceMap,
  checkTestPlan,
  checkTestPlanExclusivity,
  checkTierField,
  checkWorktreeStep0,
  headerRegion,
  inferBranchFromBody,
  isBriefShaped
} from './brief-validation'
export type { BriefSectionResult, BriefSectionsOptions } from './brief-validation'
export {
  checkA1,
  checkA2,
  checkA3,
  checkClosesN,
  checkD1,
  checkL1,
  checkL2,
  checkL3,
  checkL4,
  checkL5,
  checkR1,
  checkT1,
  checkT2,
  checkT3,
  COHERENCE_ENFORCED_FROM,
  extractClosesReferences,
  isGrandfathered,
  R1_GRANDFATHERED_ISSUES,
  scopeT2ToPlanPr
} from './coherence-checks'
export type { CheckFailure, CheckResult, ForgeIssue, IterationFile, TaskEntry } from './coherence-checks'
export {
  buildProvenanceBlock,
  extractIssue,
  hasProvenance,
  isEligibleForProvenance,
  taskRefFromBranch
} from './archive-task'
export type { MergedPrFacts } from './archive-task'
export { extractCodeReviewVerdict, extractSecurityReviewVerdict } from './verdict-extraction'
export type { VerdictExtraction } from './verdict-extraction'
export { checkReviewGate, isReviewGateExemptBranch } from './review-gate'
export type { ReviewGateInput, ReviewGateResult, ReviewGateVerdict } from './review-gate'
export {
  checkBlastRadiusScope,
  checkConflictCompleteness,
  checkIssueRationale,
  checkNoBriefContent,
  checkRationaleNamesDocs,
  declaredProjects,
  isTaskIssueLabelSet
} from './issue-validation'
export type { IssueSectionResult, ProjectPath, TaskIssueFacts } from './issue-validation'
export { findHeadingLine, findTable, rowToRecord } from './markdown-table'
export type { ParsedTable, TableRow } from './markdown-table'
export { deriveDiagramModel } from './diagram-model'
export type {
  DiagramConfig,
  DiagramEdge,
  DiagramFinding,
  DiagramModel,
  DiagramNode,
  DiagramNodeKind,
  RenderState
} from './diagram-model'
export { parseEnforcementRegistry } from './registry-parse'
export type { GateRing, GateRow } from './registry-parse'
export { checkG1, checkG2, checkG3, checkG4, checkG5 } from './registry-checks'
export type { RegistryCheckResult, RegistryCheckStatus, RegistryFinding } from './registry-checks'
export { ACTIONS, CROSSING_KEYWORDS } from './actions'
export type { Action, ActionCrossing } from './actions'
export {
  DERIVABLE_STATUSES,
  DERIVATION_RULES,
  DERIVED_STATUSES,
  deriveStatusFromModel,
  FORGE_FACT_INPUTS
} from './state-machine-model'
export type { DerivationRule, ForgeFactInput } from './state-machine-model'
export { checkPremises, parsePremiseBlock } from './premise-check'
export type { PremiseAssertion, PremiseCheckResult } from './premise-check'
export { classifyLeftover } from './leftover-detection'
export type { LeftoverInput, LeftoverResult, LeftoverVerdict } from './leftover-detection'
export { checkDeadBranchPush } from './dead-branch-push-guard'
export type {
  DeadBranchPushInput,
  DeadBranchPushResult,
  DeadBranchPushVerdict,
  PrStateFact
} from './dead-branch-push-guard'
export { captureBaseline, compareToBaseline } from './baseline-capture'
export type { BaselineComparison, BaselineEntry, BaselineToolComparison } from './baseline-capture'
export { checkDispatchReadiness } from './dispatch-gate'
export type {
  DispatchConflictsWithFact,
  DispatchDependsOnFact,
  DispatchEdgeFact,
  DispatchGateInput,
  DispatchIssueFact,
  DispatchPriorIterationFact,
  DispatchPriorTaskFact,
  DispatchResult
} from './dispatch-gate'
export { checkSinglePlanPr, iterationSlugFromTopologyPath, touchesAnyTopology } from './single-plan-pr'
export type { OpenPrFiles } from './single-plan-pr'
export { isNewDiskStateFile } from './no-disk-state'
export type { DiskStateFileStatus } from './no-disk-state'
export { checkDirectMainPush } from './direct-main-push'
export type { DirectMainPushFact, DirectMainPushResult } from './direct-main-push'
export { findDeadBranchPushes } from './dead-branch-push-audit'
export type { DeadBranchFact, DeadBranchPush } from './dead-branch-push-audit'
export { checkBranchTopology, taskBranchTopologyFields } from './branch-topology-gate'
export type { BranchTopologyInput, BranchTopologyResult, BranchTopologyVerdict } from './branch-topology-gate'
export { checkFirstPushDispatchGate, parseTaskBranch } from './first-push-dispatch-gate'
export type {
  DispatchReadinessFact,
  FirstPushDispatchGateInput,
  FirstPushDispatchGateResult,
  FirstPushDispatchGateVerdict
} from './first-push-dispatch-gate'
export { decideIssueAssignment } from './issue-assignment'
export type { IssueAssignmentDecision, IssueAssignmentInput } from './issue-assignment'
export { locateTestPlanSection } from './test-plan-section'
export type { TestPlanSection } from './test-plan-section'
export { evaluateTestPlanGate } from './test-plan-gate'
export type { TestPlanGateResult, TestPlanGateVerdict } from './test-plan-gate'
export {
  AEG_BLOCKED_LABEL,
  buildBranchName,
  fetchForgeFacts,
  fetchForgeTasksByLabel,
  fetchOpenIssuesByLabel,
  fetchTaskIssueRefs,
  findTrancheSlug,
  hasLabel,
  trancheLabel,
  trancheLabelsToQuery,
  trancheSlugLengthError,
  trancheSlugOf,
  LABEL_MAX_LENGTH,
  LABEL_NAMESPACE,
  LABELS,
  label,
  mapForgeFacts,
  matchesLabel,
  projectsFromBody
} from '@atta/aeg-forge-state'
export type { Label, LabelCategory, LabelForm, LabelKey } from '@atta/aeg-forge-state'
export type {
  FetchForgeFactsInput,
  ForgeFactsSnapshot,
  PrRef,
  RawTaskFacts,
  TaskIssueRef,
  TaskRef
} from '@atta/aeg-types'
