'use client'

import type { Flow } from '@atta/engine'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItemTextHighlight,
  DropdownMenuTrigger
} from '@atta/ui/components'
import { cn } from '@atta/ui/lib/utils'
import { Users2, ChevronsUpDown, Settings } from 'lucide-react'
import { getSpecLabel } from '@/lib/flow-helpers'

interface TeamPickerProps {
  specs: Flow[]
  value: string
  onChange: (specId: string) => void
  /**
   * Optional handler for reconfiguring the currently selected team. When
   * provided, a small Settings icon button renders to the right of the team
   * pill — clicking it opens the consumer's reviewer config modal for that
   * team. Omit (or pass `undefined`) for teams that don't have user-editable
   * agents and therefore have nothing to reconfigure. Without this, a team
   * configured once is "locked" from the picker — the modal would only open
   * again by trying to submit on an invalid config, which is hostile UX when
   * the user just wants to swap a model.
   */
  onConfigure?: () => void
}

export function TeamPicker({ specs, value, onChange, onConfigure }: TeamPickerProps) {
  const selected = specs.find((s) => s.id === value) ?? specs[0]
  const selectedLabel = selected ? getSpecLabel(selected.id, selected) : { short: 'Select team', subtitle: '' }

  return (
    // Picker + (optional) Settings affordance live in one inline cluster.
    // `gap-1` keeps them visually paired; the gear sits to the RIGHT of the
    // pill so it reads as a follow-up action on the active selection.
    <div className='flex items-center gap-1'>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/*
           * `ghost-pill`: small bordered pill with muted text → accent text on
           * hover. The variant owns its own appearance — call-site className
           * carries only layout (gap, font-mono typography pill chrome).
           */}
          <Button variant='ghost-pill' size='sm' className='gap-1.5 font-mono text-xs uppercase tracking-widest'>
            <span className='flex items-center gap-1.5'>
              <Users2 className='h-3 w-3' />
              <span>{selectedLabel.short}</span>
            </span>
            <ChevronsUpDown className='h-3 w-3' />
          </Button>
        </DropdownMenuTrigger>
        {/*
         * `shadow-lg` keeps the dropdown matching the hero input's elevation;
         * `bg-popover` / `border-border` are canonical on DropdownMenuContent.
         * max-h + overflow-y keeps long catalogs scrollable.
         */}
        <DropdownMenuContent align='start' className='w-[280px] max-h-[60vh] overflow-y-auto shadow-lg'>
          {specs.map((spec) => {
            // Hover treatment lives in `DropdownMenuItemTextHighlight`: shifts
            // TEXT to accent (no background fill) for non-selected items, and
            // renders the canonical accent fill for the selected item. No
            // `!important`, no installed/* edits, no call-site overrides — see
            // `packages/ui/libraries/basic/components/interactive/dropdown-menu-item-text-highlight.tsx`
            // for the design rationale (neutralizes BOTH `focus:` AND
            // `data-[highlighted]:` highlight rules so tailwind-merge resolves
            // the conflicts cleanly).
            const label = getSpecLabel(spec.id, spec)
            const isSelected = spec.id === value
            return (
              <DropdownMenuItemTextHighlight key={spec.id} selected={isSelected} onSelect={() => onChange(spec.id)}>
                <div className='flex flex-col gap-0.5 py-0.5'>
                  <span className='font-sans text-sm'>{spec.displayName}</span>
                  {label.subtitle && (
                    <span
                      className={cn(
                        'font-mono text-xs uppercase tracking-widest',
                        isSelected
                          ? 'text-accent-foreground/80'
                          : 'text-muted-foreground group-focus:text-accent/80 group-data-[highlighted]:text-accent/80'
                      )}
                    >
                      {label.subtitle}
                    </span>
                  )}
                </div>
              </DropdownMenuItemTextHighlight>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {/*
       * Settings affordance — only renders when the consumer supplies
       * `onConfigure`. Uses the same `ghost-pill` chrome as the team trigger
       * so the two read as a paired cluster (selection + its config). The
       * `w-9 px-0` override is layout-only — neutralizes `size='sm'`'s `px-3`
       * to make the button square (h-9 w-9), matching icon-only convention
       * without inventing a new size variant.
       */}
      {onConfigure && (
        <Button
          variant='ghost-pill'
          size='sm'
          className='w-9 px-0'
          aria-label='Configure team models'
          title='Configure team models'
          onClick={onConfigure}
        >
          <Settings className='h-3 w-3' />
        </Button>
      )}
    </div>
  )
}
