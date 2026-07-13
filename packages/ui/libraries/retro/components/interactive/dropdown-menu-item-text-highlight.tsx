'use client'

import type * as React from 'react'
import { DropdownMenuItem } from '../../installed/dropdown-menu'
import { cn } from '../../../../lib/utils'

/**
 * retro's own twin of basic's `DropdownMenuItemTextHighlight` — wraps retro's
 * OWN `DropdownMenuItem` (Radix flavor) instead of falling back to basic's,
 * so a retro dropdown shows retro's item styling. Same public interface and
 * persistent-fill doctrine as the basic original (see that file's docstring).
 */
export interface DropdownMenuItemTextHighlightProps extends React.ComponentProps<typeof DropdownMenuItem> {
  /** Marks the item as the current selection — renders persistent accent fill. */
  selected?: boolean
}

export function DropdownMenuItemTextHighlight({ className, selected, ...props }: DropdownMenuItemTextHighlightProps) {
  return (
    <DropdownMenuItem className={cn('group', selected && 'bg-accent text-accent-foreground', className)} {...props} />
  )
}
