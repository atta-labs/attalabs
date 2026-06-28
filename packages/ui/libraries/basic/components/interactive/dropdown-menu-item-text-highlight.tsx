'use client'

import type * as React from 'react'
import { DropdownMenuItem } from '../../installed/dropdown-menu'
import { cn } from '../../../../lib/utils'

/**
 * `DropdownMenuItemTextHighlight` — a `DropdownMenuItem` with an additional
 * `selected` prop. Selected state renders the canonical accent fill as a
 * PERSISTENT commitment (not a transient highlight). Non-selected items use
 * the canonical `DropdownMenuItem` hover (`focus:bg-accent
 * focus:text-accent-foreground` + `data-[highlighted]:bg-accent
 * data-[highlighted]:text-accent-foreground`) — same accent-bg + accent-foreground
 * doctrine the Button `ghost` / `outline` variants use, so a dropdown item
 * and a hovered button feel identical under the pointer.
 *
 * Earlier this wrapper neutralized BOTH the `focus:bg-accent` and
 * `data-[highlighted]:bg-accent` rules to swap in a text-only highlight
 * (text shifted to `text-accent` on hover, no bg change). That gave us
 * text-on-text-color readability problems whenever the accent text shade
 * sat close to the popover background, AND it diverged from the rest of
 * the hover doctrine in `@atta/ui`. Reverted to canonical.
 *
 * The `group` class is preserved so consumer code can opt into matching
 * shifts via `group-focus:` / `group-data-[highlighted]:` for nested
 * spans (e.g. subtitles in `TeamPicker` items).
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
