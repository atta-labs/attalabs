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
   * fixed height. **OFF by default — opt in per call site.**
   *
   * Default-off is deliberate: this is a shared `@atta/ui` primitive used by every
   * product (Vāda, Herald, Atta, Vinaya), and pinning is only correct where the
   * table sits inside a scrolling ancestor to pin against. A consumer that has
   * browser-verified the behavior opts in explicitly (`<Table stickyHeader>`);
   * everyone else gets the responsive horizontal-scroll wrapper with no behavior
   * change. Vinaya's tables pass `stickyHeader` at every call site.
   *
   * How it works when on: the wrapper does NOT trap the sticky in a
   * horizontal-scroll box (that would pin the header to the box, not the page). It
   * leaves the installed container `overflow-visible` (gated on `@min-[780px]/tbl:`
   * so it only engages once the container is wide enough to fit the table), so the
   * header sticks to whatever ancestor actually scrolls — a page shell (e.g.
   * Studio's `overflow-y-auto` region) or the page itself. The per-library
   * sticky-header rule (matching each library's own row-border width and color) is
   * applied so the pinned header keeps a matching separator after sticky detaches
   * it from the row.
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
 * `stickyHeader` (opt-in) is why this is a factory: sticky `<th>` cells detach from
 * the row border (a `border-collapse` quirk), so the pinned header must carry its
 * own bottom rule as a box-shadow — and that rule must match each library's REAL
 * row border, which differs by both width AND color: retro/brutal rows are
 * `border-b-2`, basic/animate `border-b`; retro/animate rows use `currentColor`
 * (no color class), basic uses `border-border/60`, brutal uses `border-border`. So
 * each library passes its own literal, Tailwind-scannable sticky-header class as
 * the second arg (retro/animate → `currentColor`, basic → `--border`/60, brutal →
 * `--border`), and `stickyHeader` renders per-library-correct in all four with
 * zero sticky/border classes at the call site.
 */
export function makeScrollableTable(InstalledTable: ComponentType<ComponentProps<'table'>>, stickyHeaderClass: string) {
  function Table({ className, containerClassName, stickyHeader = false, ...props }: ScrollableTableProps) {
    // Sticky mode switches on the table's own CONTAINER width, not the viewport
    // (`@container/tbl` + `@min-[780px]/tbl:` on the inner). Only when the
    // container is wide enough to actually FIT the table (≥ 780px, past the
    // 720–760 min-widths) does the header pin: the installed container is left
    // non-scrolling so the header sticks to the page/shell and the shell absorbs
    // any overflow. Below that width — including the awkward intermediate range
    // where a viewport breakpoint would have said "wide" while the table still
    // didn't fit — the installed container keeps its OWN horizontal scroll, so the
    // table scrolls inside its own box (contained, never overflowing the card) and
    // the header is not pinned. `stickyHeaderClass` is authored with the same
    // `@min-[780px]/tbl:` prefix.
    return (
      <div className='@container/tbl w-full min-w-0 max-w-full'>
        <div
          className={cn(
            stickyHeader && '@min-[780px]/tbl:[&>div]:overflow-visible',
            stickyHeader && stickyHeaderClass,
            containerClassName
          )}
        >
          <InstalledTable className={className} {...props} />
        </div>
      </div>
    )
  }
  Table.displayName = 'Table'
  return Table
}
