'use client'

import type * as React from 'react'
import { DropdownMenuItem } from '../../installed/dropdown-menu'
import { cn } from '../../../../lib/utils'

/**
 * `DropdownMenuItemTextHighlight` — a `DropdownMenuItem` whose hover/highlight
 * shifts the TEXT to `accent`, not the BACKGROUND. The selected state still
 * uses the canonical accent fill (a persistent commitment, not a transient
 * highlight — see `.claude/skills/ui-theme-tokens/SKILL.md` "Hover and active
 * state patterns" for the doctrine).
 *
 * Why a wrapper, not a `className` override at the call site:
 *
 * The canonical `DropdownMenuItem` ships TWO highlight rules at once:
 *
 *     focus:bg-accent focus:text-accent-foreground
 *     data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground
 *
 * Radix sets BOTH `focus` AND `data-[highlighted]` on the active item depending
 * on whether the user reaches it via pointer or keyboard. Older call-site
 * overrides neutralized only `focus:bg-accent` and not `data-[highlighted]:`,
 * which is why a `!important` prefix kept creeping in — the unhandled rule
 * fought the override. Addressing BOTH families here lets `tailwind-merge`
 * resolve the conflict cleanly with no `!important`.
 *
 * Selected-state escape hatch: pass `selected` to render the canonical
 * accent fill (the prior `bg-accent text-accent-foreground` pattern).
 */
export interface DropdownMenuItemTextHighlightProps extends React.ComponentProps<typeof DropdownMenuItem> {
  /** Marks the item as the current selection — renders accent fill instead of text-only highlight. */
  selected?: boolean
}

export function DropdownMenuItemTextHighlight({ className, selected, ...props }: DropdownMenuItemTextHighlightProps) {
  return (
    <DropdownMenuItem
      className={cn(
        // `group` so child spans can opt into the same highlight state via
        // `group-focus:`/`group-data-[highlighted]:`.
        'group',
        selected
          ? 'bg-accent text-accent-foreground'
          : // Neutralize BOTH the canonical `focus:bg-accent` AND
            // `data-[highlighted]:bg-accent`, then re-route the highlight to
            // text-only.
            'focus:bg-transparent focus:text-accent data-[highlighted]:bg-transparent data-[highlighted]:text-accent',
        className
      )}
      {...props}
    />
  )
}
