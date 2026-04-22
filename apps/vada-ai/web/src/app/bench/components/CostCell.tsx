import { computeCost, formatCost } from '../lib/pricing'

export function CostCell({
  modelId,
  tokensInput,
  tokensOutput
}: {
  modelId: string | null | undefined
  tokensInput: number | null | undefined
  tokensOutput: number | null | undefined
}) {
  const cost = computeCost(modelId, tokensInput, tokensOutput)
  return <span className='font-mono text-xs text-muted-foreground'>{formatCost(cost)}</span>
}

export function StaticCostCell({ cost }: { cost: number }) {
  return <span className='font-mono text-xs text-muted-foreground'>{formatCost(cost)}</span>
}
