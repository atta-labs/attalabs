'use client'

import type * as React from 'react'
import { DropdownMenuItem } from '../../installed/dropdown-menu'
import { cn } from '../../../../lib/utils'

/**
 * Animate-library variant of `DropdownMenuItemTextHighlight`. See basic's
 * implementation at
 * `packages/ui/libraries/basic/components/interactive/dropdown-menu-item-text-highlight.tsx`
 * for the design rationale (neutralize BOTH `focus:bg-accent` AND
 * `data-[highlighted]:bg-accent` so no `!important` is needed; text-only
 * highlight for transient hover; accent fill reserved for the `selected`
 * persistent-commitment state).
 */
export interface DropdownMenuItemTextHighlightProps extends React.ComponentProps<typeof DropdownMenuItem> {
  /** Marks the item as the current selection — renders accent fill instead of text-only highlight. */
  selected?: boolean
}

export function DropdownMenuItemTextHighlight({ className, selected, ...props }: DropdownMenuItemTextHighlightProps) {
  return (
    <DropdownMenuItem
      className={cn(
        'group',
        selected
          ? 'bg-accent text-accent-foreground'
          : 'focus:bg-transparent focus:text-accent data-[highlighted]:bg-transparent data-[highlighted]:text-accent',
        className
      )}
      {...props}
    />
  )
}
