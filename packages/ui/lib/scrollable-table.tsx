import type { ComponentProps, ComponentType, CSSProperties } from 'react'
import { cn } from './utils'

export type ScrollableTableProps = ComponentProps<'table'> & {
  /**
   * Extends/overrides the scroll-container div (merged LAST, so a consumer's
   * class wins). Escape hatch for one-off container tweaks.
   */
  containerClassName?: string
  /**
   * Cap the table's scroll container height (any CSS length, e.g. `'70vh'`).
   * Turns on vertical scrolling INSIDE the table's own box instead of growing
   * the page. Pair with `stickyHeader` for a pinned header.
   */
  maxHeight?: string
  /**
   * Pin the header row while the body scrolls vertically. Library-correct in
   * every library (the per-library border/background is baked into each
   * library's wrapper — see `makeScrollableTable`'s second arg), so a consumer
   * just writes `<Table stickyHeader maxHeight="70vh">` and never restyles the
   * header at the call site. No effect without a bounded height (`maxHeight`, or
   * a `max-h-*` on `containerClassName`), since there is nothing to scroll under.
   */
  stickyHeader?: boolean
}

/**
 * Wraps a library's installed `Table` in a width-clamp so the table's OWN
 * container scrolls it horizontally in any layout context instead of bleeding
 * past its parent and overflowing the page — and adds the cross-library
 * `stickyHeader` / `maxHeight` behaviors as first-class props.
 *
 * Why the width clamp is needed: every library's `installed/table.tsx` renders
 * its own `w-full` horizontal-scroll container (`overflow-x-auto` in basic/retro,
 * `overflow-auto` in animate/brutal — both clip on x), but `w-full` has no width
 * floor, so when an ancestor is itself a scroll container (a page shell with
 * `overflow-y-auto`, which CSS promotes to `overflow-x: auto`) the container's
 * width resolves to the table's `min-w`, nothing clips, and the table pushes the
 * whole page wider than the viewport. `min-w-0 max-w-full` caps the width at the
 * parent and lets it shrink below the table's intrinsic width — the exact
 * constraint the installed container needs before its OWN overflow will clip and
 * scroll. Verified in a real browser: the installed container clips, the table
 * scrolls inside it, `document.scrollWidth === innerWidth`.
 *
 * The wrapper adds NO overflow of its own and does NOT neutralize the installed
 * container, so each library's per-library table styling is preserved (retro's
 * `rounded border-2 shadow-md` frame stays put, content scrolls inside it).
 *
 * `stickyHeader` is the reason this is a factory rather than a single shared
 * component: sticky `<th>` cells detach from the row's border (a `border-collapse`
 * quirk), so a pinned header must carry its own bottom border — and its width
 * differs per library (retro's rows are `border-b-2`, the rest `border-b`). Each
 * library passes its own literal, Tailwind-scannable sticky-header class as the
 * second arg, so `stickyHeader` renders correctly and identically-contracted in
 * all four. The class targets `thead th` from the wrapper, so the consumer's
 * `TableHeader` needs no sticky/border/background classes at all.
 */
export function makeScrollableTable(InstalledTable: ComponentType<ComponentProps<'table'>>, stickyHeaderClass: string) {
  function Table({ className, containerClassName, maxHeight, stickyHeader = false, ...props }: ScrollableTableProps) {
    return (
      <div
        style={maxHeight ? ({ '--atta-table-max-h': maxHeight } as CSSProperties) : undefined}
        className={cn(
          'w-full min-w-0 max-w-full',
          maxHeight && '[&>div]:max-h-[var(--atta-table-max-h)] [&>div]:overflow-y-auto',
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
