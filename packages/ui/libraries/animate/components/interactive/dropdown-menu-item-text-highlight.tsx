'use client'

import type * as React from 'react'
import { DropdownMenuItem } from '../../installed/dropdown-menu'
import { cn } from '../../../../lib/utils'

/**
 * Animate-library variant of `DropdownMenuItemTextHighlight`. Adds a
 * `selected` prop on top of the active library's canonical `DropdownMenuItem`.
 * Selected state renders persistent accent fill; non-selected items use the
 * canonical hover (`focus:bg-accent focus:text-accent-foreground` +
 * `data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground`) —
 * same accent-bg + accent-foreground doctrine the Button `ghost` / `ghost-pill`
 * variants use, so a dropdown item and a ghost button feel identical under
 * the pointer.
 *
 * Earlier this wrapper neutralized the canonical highlight rules and swapped
 * in a text-only highlight (`text-accent` on `bg-transparent`). That gave
 * text-on-popover-background readability problems and diverged from the rest
 * of the hover doctrine. Reverted to canonical.
 *
 * The `group` class is preserved so consumer code can opt into matching
 * shifts on nested spans via `group-focus:` / `group-data-[highlighted]:`.
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
