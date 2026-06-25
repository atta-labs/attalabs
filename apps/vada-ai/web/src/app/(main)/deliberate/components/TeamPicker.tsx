'use client'

import type { Flow } from '@atta/engine'
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@atta/ui/components'
import { Users2, ChevronsUpDown } from 'lucide-react'
import { getFlowAgentCount, getFlowShapeLabel } from '@/lib/flow-helpers'

interface TeamPickerProps {
  specs: Flow[]
  value: string
  onChange: (specId: string) => void
}

export function TeamPicker({ specs, value, onChange }: TeamPickerProps) {
  const selected = specs.find((s) => s.id === value) ?? specs[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='sm'
          className='h-auto gap-1.5 p-0 text-foreground/70 hover:bg-transparent hover:text-foreground'
        >
          <span className='flex items-center gap-1.5'>
            <Users2 className='h-3 w-3' />
            <span className='font-mono text-[10px] uppercase tracking-widest'>
              {selected?.displayName ?? 'Select team'}
            </span>
          </span>
          <ChevronsUpDown className='h-3 w-3' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start' className='w-[280px]'>
        {specs.map((spec) => {
          const count = getFlowAgentCount(spec)
          const shape = getFlowShapeLabel(spec)
          const isSelected = spec.id === value
          return (
            <DropdownMenuItem
              key={spec.id}
              onSelect={() => onChange(spec.id)}
              className={`group ${isSelected ? 'bg-accent text-accent-foreground' : ''}`}
            >
              <div className='flex flex-col gap-0.5 py-0.5'>
                <span className='text-sm font-sans'>{spec.displayName}</span>
                <span
                  className={`font-mono text-[10px] uppercase tracking-widest ${
                    isSelected ? 'text-accent-foreground/80' : 'text-muted-foreground'
                  } group-data-[highlighted]:text-accent-foreground/80`}
                >
                  {count} agents · {shape}
                </span>
              </div>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
