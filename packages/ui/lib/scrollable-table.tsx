import type { ComponentProps, ComponentType } from 'react'
import { cn } from './utils'

export type ScrollableTableProps = ComponentProps<'table'> & {
  /**
   * Extends/overrides the wrapper div (merged LAST, so a consumer's class wins).
   * Common use: shift the pinned header down past a fixed bar above the table
   * with `'[&_thead_th]:top-10'` (defaults to `top-0`).
   */
  containerClassName?: string
  /**
   * Pin the header row while you scroll PAST the table — it sticks at the top of
   * the nearest scrolling ancestor and leaves when the table scrolls out. No
   * fixed height. **On by default.**
   *
   * How it works: the wrapper does NOT trap the sticky in a horizontal-scroll box
   * (that would pin the header to the box, not the page). Instead it leaves the
   * installed container `overflow-visible`, so the header sticks to whatever
   * ancestor actually scrolls — a page shell (e.g. Studio's `overflow-y-auto`
   * region) or the page itself — and that same ancestor absorbs horizontal
   * overflow on narrow viewports (no page-body sideways scroll where a shell
   * contains it). The per-library sticky-header border (its own row border
   * width + `--border` color) is applied so the pinned header keeps a matching
   * rule after sticky detaches it from the row.
   *
   * Set `false` for the alternative: a self-contained horizontal-scroll box with
   * NO sticky header (the installed container scrolls x itself). Use that when a
   * table sits in a context with no scrolling ancestor to pin against and must
   * not push the page sideways.
   */
  stickyHeader?: boolean
}

/**
 * Wraps a library's installed `Table` so the table is responsive (never bleeds
 * past its parent) and its header pins on scroll — both correct in every library.
 *
 * `min-w-0 max-w-full` caps the wrapper at its parent and lets it shrink below
 * the table's intrinsic width, the constraint the installed container needs so a
 * `min-w` table clips/scrolls instead of overflowing the page.
 *
 * `stickyHeader` (default on) is why this is a factory: sticky `<th>` cells detach
 * from the row border (a `border-collapse` quirk), so the pinned header must carry
 * its own bottom border — and that border differs per library (retro/brutal rows
 * are `border-b-2`, the rest `border-b`; all use the `--border` token). Each
 * library passes its own literal, Tailwind-scannable sticky-header class as the
 * second arg, so `stickyHeader` renders identically-contracted and correct in all
 * four, with zero sticky/border classes at the call site.
 */
export function makeScrollableTable(InstalledTable: ComponentType<ComponentProps<'table'>>, stickyHeaderClass: string) {
  function Table({ className, containerClassName, stickyHeader = true, ...props }: ScrollableTableProps) {
    return (
      <div
        className={cn(
          'w-full min-w-0 max-w-full',
          // Sticky mode: keep the installed container non-scrolling so the header
          // pins to the page/shell (not a trapping box), and apply the per-library
          // pinned-header styling.
          stickyHeader && '[&>div]:overflow-visible',
          stickyHeader && stickyHeaderClass,
          containerClassName
        )}
      >
        <InstalledTable className={className} {...props} />
      </div>
    )
  }
  Table.displayName = 'Table'
  return Table
}
