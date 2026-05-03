'use client'

import type { DeliberationSpec } from '@atta/engine'
import { Button } from '@atta/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@atta/ui/components/dropdown-menu'
import { ChevronDown } from 'lucide-react'

function getAgentCount(spec: DeliberationSpec): number {
  if (spec.flow?.rounds) return spec.flow.rounds.agents.length
  if (spec.reviewers) {
    const hasSynth = spec.flow?.synthesis != null
    return spec.reviewers.length + (hasSynth ? 1 : 0)
  }
  return 1
}

function getShapeLabel(spec: DeliberationSpec): string {
  if (spec.flow?.rounds) {
    return `${spec.flow.rounds.count} rounds`
  }
  if (spec.reviewers) {
    const hasSynth = spec.flow?.synthesis != null
    return hasSynth ? 'reviewers + synthesis' : 'parallel reviewers'
  }
  return 'single shot'
}

interface TeamPickerProps {
  specs: DeliberationSpec[]
  value: string
  onChange: (specId: string) => void
}

export function TeamPicker({ specs, value, onChange }: TeamPickerProps) {
  const selected = specs.find((s) => s.id === value) ?? specs[0]

  return (
    <div className='flex items-center gap-2'>
      <span className='font-mono text-xs uppercase tracking-widest text-muted-foreground shrink-0'>Team</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='outline' size='sm' className='gap-2 font-sans text-sm min-w-[200px] justify-between'>
            <span className='truncate'>{selected?.displayName ?? 'Select team'}</span>
            <ChevronDown className='size-3.5 shrink-0' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start' className='w-[280px]'>
          {specs.map((spec) => {
            const count = getAgentCount(spec)
            const shape = getShapeLabel(spec)
            return (
              <DropdownMenuItem
                key={spec.id}
                onSelect={() => onChange(spec.id)}
                className={spec.id === value ? 'bg-accent' : ''}
              >
                <div className='flex flex-col gap-0.5 py-0.5'>
                  <span className='text-sm font-sans'>{spec.displayName}</span>
                  <span className='font-mono text-[10px] uppercase tracking-widest text-muted-foreground'>
                    {count} agents · {shape}
                  </span>
                </div>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
