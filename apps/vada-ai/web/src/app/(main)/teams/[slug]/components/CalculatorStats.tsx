'use client'

import { useState } from 'react'
import type { Flow } from '@atta/engine'
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@atta/ui/components'
import { ChevronDown } from 'lucide-react'
import { calculateCost, CALCULATOR_MODELS, MODEL_PRICES } from '@/lib/calculator'

function fmt(n: number): string {
  return n.toLocaleString()
}

function fmtCost(n: number): string {
  return `$${n.toFixed(2)}`
}

export function CalculatorStats({ spec }: { spec: Flow }) {
  const defaultModelId = Object.keys(MODEL_PRICES).includes(spec.defaults.model)
    ? spec.defaults.model
    : 'claude-sonnet-4-6'

  const [modelId, setModelId] = useState(defaultModelId)

  const result = calculateCost(spec, modelId)
  const selectedModel = CALCULATOR_MODELS.find((m) => m.id === modelId) ?? CALCULATOR_MODELS[0]!

  return (
    <div className='rounded-lg border border-border/40 bg-card p-6 space-y-5 max-w-lg'>
      <div className='flex items-center justify-between'>
        <span className='font-mono text-xs uppercase tracking-widest text-muted-foreground'>Model</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' size='sm' className='gap-1.5 font-mono text-xs h-7'>
              {selectedModel.label}
              <ChevronDown className='size-3' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='font-mono text-xs'>
            {CALCULATOR_MODELS.map((m) => (
              <DropdownMenuItem
                key={m.id}
                onSelect={() => setModelId(m.id)}
                className={m.id === modelId ? 'bg-accent' : ''}
              >
                {m.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className='grid grid-cols-2 gap-x-8 gap-y-3'>
        <span className='font-mono text-xs text-muted-foreground'>Agents</span>
        <span className='font-mono text-xs text-foreground text-right'>{result.agentCount}</span>

        <span className='font-mono text-xs text-muted-foreground'>Steps</span>
        <span className='font-mono text-xs text-foreground text-right'>{result.stepCount}</span>

        <span className='font-mono text-xs text-muted-foreground'>Input tokens</span>
        <span className='font-mono text-xs text-foreground text-right'>
          {fmt(result.inputTokens.low)} – {fmt(result.inputTokens.high)}
        </span>

        <span className='font-mono text-xs text-muted-foreground'>Output tokens</span>
        <span className='font-mono text-xs text-foreground text-right'>
          {fmt(result.outputTokens.low)} – {fmt(result.outputTokens.high)}
        </span>

        <span className='font-mono text-xs text-muted-foreground'>Cost estimate</span>
        <span className='font-mono text-xs font-medium text-foreground text-right'>
          {fmtCost(result.cost.low)} – {fmtCost(result.cost.high)}
        </span>
      </div>

      <p className='font-mono text-[10px] text-muted-foreground/60 leading-relaxed'>
        Assumes ~800 token brief and 500 token system prompts per agent. Actual cost varies with input length and
        response variability.
      </p>
    </div>
  )
}
