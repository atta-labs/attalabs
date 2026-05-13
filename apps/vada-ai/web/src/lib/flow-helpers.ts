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
  return first.agents.length
}

export function getFlowShapeLabel(flow: Flow): string {
  const shape = detectShape(flow)
  if (shape === 'solo') return 'single shot'
  if (shape === 'rounds-audit') return `${flow.rounds[0]!.repeats ?? 1} rounds`
  if (shape === 'brokered-synth') return 'reviewers + synthesis'
  return 'parallel reviewers'
}
