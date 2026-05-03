/**
 * TypeScript types mirroring the YAML deliberation spec schema v1.0.
 * These are the in-memory types produced by loadSpec() after parsing + validation.
 */

export type ClassifierMode = 'auto' | 'skip' | 'always_tools'
export type ResponseMode = 'synthesize' | 'concatenate'
export type RevisionTriggerType = 'contains' | 'json-field-equals' | 'json-field-truthy'

export interface SpecAgent {
  name: string
  description: string
  systemPrompt: string
  model?: string
  editable?: boolean
  maxTokens?: number
  tools?: string[]
  outputFormat?: 'text' | 'structured'
  outputSchema?: Record<string, unknown>
  classifier?: {
    mode: ClassifierMode
    budget?: number
  }
  role?: string
}

export interface RoundsSpec {
  count: number
  agents: string[]
  messageTemplate: string
}

export interface SynthesisSpec {
  agent: string
  messageTemplate: string
}

export interface RevisionTrigger {
  type: RevisionTriggerType
  value?: string
  path?: string
  caseSensitive?: boolean
}

export interface AuditSpec {
  agents: string[]
  messageTemplate: string
  revision: {
    max: number
    trigger: RevisionTrigger
    logic?: 'any' | 'all'
  }
}

export interface ResponseSpec {
  mode: ResponseMode
  format?: string
}

export interface FlowSpec {
  rounds?: RoundsSpec
  synthesis?: SynthesisSpec
  audit?: AuditSpec
  response?: ResponseSpec
}

export interface ReviewerSpec {
  agent: string
  messageTemplate: string
}

export interface DeliberationSpec {
  schemaVersion: '1.0'
  id: string
  displayName: string
  description: string
  experimental: boolean
  benchmarked: boolean
  defaults: {
    model: string
    maxTokens?: number
  }
  agents: SpecAgent[]
  flow?: FlowSpec
  reviewers?: ReviewerSpec[]
  response?: ResponseSpec
}
