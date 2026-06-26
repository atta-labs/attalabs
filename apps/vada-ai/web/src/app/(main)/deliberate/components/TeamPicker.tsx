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
          //
          // Hover treatment (per user feedback): switch the TEXT color, not
          // the BACKGROUND. The installed `DropdownMenuItem`
          // (`packages/ui/libraries/basic/installed/dropdown-menu.tsx` line 59)
          // ships `focus:bg-accent focus:text-accent-foreground` — Radix sets
          // `focus` on the highlighted item, which produces a strong
          // background fill on hover. We do NOT modify the installed component
          // (that would change every dropdown in every product). Instead we
          // neutralize at the call site: `focus:bg-transparent` cancels the
          // background fill (tailwind-merge lets this win because both
          // utilities live in the `background-color` family), and we re-route
          // the highlight to text-only via `focus:text-accent`. The result is
          // a quiet, text-shift hover that does not flash an accent fill.
          //
          // Selected state still uses `bg-accent text-accent-foreground` —
          // that is a persistent commitment, not a transient highlight, so
          // the fill is appropriate per the theme-tokens doctrine
          // (`primary`/`accent` fills for "this is selected", text-only
          // accent for "this is being hovered").
          const label = getSpecLabel(spec.id, spec)
          const isSelected = spec.id === value
          return (
            <DropdownMenuItem
              key={spec.id}
              onSelect={() => onChange(spec.id)}
              className={
                isSelected ? 'group bg-accent text-accent-foreground' : 'group focus:bg-transparent focus:text-accent'
              }
            >
              <div className='flex flex-col gap-0.5 py-0.5'>
                <span className='text-sm font-sans'>{spec.displayName}</span>
                {label.subtitle && (
                  <span
                    className={`font-mono text-[10px] uppercase tracking-widest ${
                      isSelected ? 'text-accent-foreground/80' : 'text-muted-foreground group-focus:text-accent/80'
                    }`}
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
