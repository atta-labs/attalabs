import type { ComponentProps, ComponentType } from 'react'
import { cn } from './utils'

export type ScrollableTableProps = ComponentProps<'table'> & {
  /**
   * Extends/overrides the scroll-container div (merged LAST, so a consumer's
   * class wins). Use it to add a `max-h-*` for a vertically-scrolling body, to
   * relax `overflow-y`, or to drop the horizontal scroll entirely.
   */
  containerClassName?: string
}

/**
 * Wraps a library's installed `Table` in a width-clamp so the table's OWN
 * container scrolls it horizontally in any layout context instead of bleeding
 * past its parent and overflowing the page.
 *
 * Why this is needed: every library's `installed/table.tsx` already renders its
 * own `w-full` horizontal-scroll container (`overflow-x-auto` in basic/retro,
 * `overflow-auto` in animate/brutal — both clip on the x-axis) — but `w-full`
 * has no width floor, so when an ancestor is itself a scroll container (e.g. a
 * page shell with `overflow-y-auto`, which CSS promotes to `overflow-x: auto`)
 * the container's width resolves to the table's `min-w`, nothing clips, and the
 * table pushes the whole page wider than the viewport.
 *
 * The fix is a single transparent wrapper carrying `min-w-0 max-w-full`: that
 * caps the width at the parent (`max-w-full`) and lets it shrink below the
 * table's intrinsic width (`min-w-0`), which is exactly the constraint the
 * installed container needs before its OWN `overflow-x-auto` will clip and
 * scroll. Verified in a real browser (Chrome DevTools box metrics): the installed
 * container clips to the parent width, the table scrolls inside it, and
 * `document.scrollWidth === innerWidth` (no page overflow).
 *
 * Crucially the wrapper adds NO overflow and does NOT neutralize the installed
 * container — the library's own container is still the scroller, so its
 * per-library styling is fully preserved (e.g. retro's `rounded border-2
 * shadow-md` frame stays put while its content scrolls inside it, rather than the
 * frame itself scrolling). `containerClassName` lets a consumer extend/override.
 */
export function makeScrollableTable(InstalledTable: ComponentType<ComponentProps<'table'>>) {
  function Table({ className, containerClassName, ...props }: ScrollableTableProps) {
    return (
      <div className={cn('w-full min-w-0 max-w-full', containerClassName)}>
        <InstalledTable className={className} {...props} />
      </div>
    )
  }
  Table.displayName = 'Table'
  return Table
}
