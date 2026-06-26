'use client'

import type { Flow } from '@atta/engine'
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@atta/ui/components'
import { Users2, ChevronsUpDown } from 'lucide-react'
import { getSpecLabel } from '@/lib/flow-helpers'

interface TeamPickerProps {
  specs: Flow[]
  value: string
  onChange: (specId: string) => void
}

export function TeamPicker({ specs, value, onChange }: TeamPickerProps) {
  const selected = specs.find((s) => s.id === value) ?? specs[0]
  const selectedLabel = selected ? getSpecLabel(selected.id, selected) : { short: 'Select team', subtitle: '' }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-accent-foreground'
        >
          <span className='flex items-center gap-1.5'>
            <Users2 className='h-3 w-3' />
            <span>{selectedLabel.short}</span>
          </span>
          <ChevronsUpDown className='h-3 w-3' />
        </Button>
      </DropdownMenuTrigger>
      {/* Lifted off pure black: `bg-popover` is the floating-surface token (see
          theme-tokens skill), with `shadow-lg` for a clear separation from the
          page canvas. max-h + overflow-y keeps long catalogs scrollable as new
          specs land. */}
      <DropdownMenuContent
        align='start'
        className='w-[280px] max-h-[60vh] overflow-y-auto border-border bg-popover shadow-lg'
      >
        {specs.map((spec) => {
          // Dropdown items show the full `display_name` (more context than the
          // trigger's short pill) plus a corrected subtitle from the spec-local
          // label map. `getFlowShapeLabel` returned "parallel reviewers" for
          // every brokered spec — wrong for Council; the label map is the fix.
          const label = getSpecLabel(spec.id, spec)
          const isSelected = spec.id === value
          return (
            <DropdownMenuItem
              key={spec.id}
              onSelect={() => onChange(spec.id)}
              className={`group ${isSelected ? 'bg-accent text-accent-foreground' : ''}`}
            >
              <div className='flex flex-col gap-0.5 py-0.5'>
                <span className='text-sm font-sans'>{spec.displayName}</span>
                {label.subtitle && (
                  <span
                    className={`font-mono text-[10px] uppercase tracking-widest ${
                      isSelected ? 'text-accent-foreground/80' : 'text-muted-foreground'
                    } group-data-[highlighted]:text-accent-foreground/80`}
                  >
                    {label.subtitle}
                  </span>
                )}
              </div>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
