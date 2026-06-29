import type { Flow } from '@atta/engine'

export type FlowShape = 'solo' | 'rounds-audit' | 'brokered-synth' | 'brokered-no-synth'

export function detectShape(flow: Flow): FlowShape {
  if (flow.rounds.some((r) => r.onFailure?.action === 'revise')) return 'rounds-audit'
  const first = flow.rounds[0]!
  if (flow.rounds.length === 1 && first.agents.length === 1) return 'solo'
  const last = flow.rounds[flow.rounds.length - 1]!
  if (flow.rounds.length > 1 && last.agents.length === 1) return 'brokered-synth'
  return 'brokered-no-synth'
}

export function getDisplayAgentNames(flow: Flow): string[] {
  const shape = detectShape(flow)
  const first = flow.rounds[0]!
  if (shape === 'brokered-synth') {
    const last = flow.rounds[flow.rounds.length - 1]!
    return [...first.agents.map((a) => a.name), last.agents[0]!.name]
  }
  if (shape === 'solo') return flow.agents.slice(0, 1).map((a) => a.name)
  return first.agents.map((a) => a.name)
}

export function getFlowAgentCount(flow: Flow): number {
  const shape = detectShape(flow)
  const first = flow.rounds[0]!
  if (shape === 'solo') return 1
  if (shape === 'brokered-synth') return first.agents.length + 1
  if (shape === 'rounds-audit') {
    const unique = new Set(flow.rounds.flatMap((r) => r.agents.map((a) => a.name)))
    return unique.size
  }
  return first.agents.length
}

export function getFlowShapeLabel(flow: Flow): string {
  const shape = detectShape(flow)
  if (shape === 'solo') return 'single shot'
  if (shape === 'rounds-audit') return `${flow.rounds[0]!.repeats ?? 1} rounds`
  if (shape === 'brokered-synth') return 'reviewers + synthesis'
  return 'parallel reviewers'
}

/**
 * Compact UI labels for each Vāda spec — used by the TeamPicker trigger pill
 * (`short`) and dropdown rows (`short` + `subtitle`). Presentation-only:
 * team identity stays in the YAML's `display_name` / `description`. Generic
 * specs fall back to the YAML display_name with no subtitle.
 *
 * Why this exists here and not in the engine schema: `getFlowShapeLabel`
 * incorrectly returned "parallel reviewers" for ALL brokered specs, so Council
 * (an answer-a-question shape, not a critique-a-draft shape) was misnamed in
 * the dropdown subtitle. Treating labels as Vāda-local presentation lets us
 * fix the copy without churning the engine type. TODO: if other consumers
 * grow, promote a `short_name` field onto Flow itself.
 */
type SpecLabel = { short: string; subtitle: string }

const SPEC_LABELS: Record<string, SpecLabel> = {
  'vada-council': { short: 'Council', subtitle: '3 models · parallel' },
  'vada-council-synthesis': { short: 'Council +S', subtitle: '3 models + synthesis' },
  'vada-reviewers': { short: 'Reviewers', subtitle: '3 reviewers · parallel' },
  'vada-reviewers-synthesis': { short: 'Reviewers +S', subtitle: '3 reviewers + synthesis' }
}

export function getSpecLabel(specId: string, fallback: { displayName: string }): SpecLabel {
  const explicit = SPEC_LABELS[specId]
  if (explicit) return explicit
  return { short: fallback.displayName, subtitle: '' }
}
