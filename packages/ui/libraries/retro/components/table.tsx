// Wraps retro's own installed Table in the shared scrollable-table wrapper
// (`lib/scrollable-table.tsx`) — responsive horizontal scroll + the `stickyHeader`
// prop (container-query gated). The installed file stays verbatim; TableHeader/Body/Row/etc.
// still come straight from `../installed/table` via `components/index.ts`.
//
// STICKY_HEADER is this library's literal (Tailwind-scannable) pinned-header
// class. Sticky `<th>` cells detach from the row border (border-collapse), so the
// pinned header carries its own — `border-b-2` matches retro's `[&_tr]:border-b-2`
// rows, so the pinned header keeps retro's thick separator (not a thin line).
import type { ComponentProps } from 'react'
import { cn } from '../../../lib/utils'
import { Table as InstalledTable, TableCell as InstalledTableCell } from '../installed/table'
import { makeScrollableTable } from '../../../lib/scrollable-table'

const STICKY_HEADER =
  '@min-[780px]/tbl:[&_thead_th]:sticky @min-[780px]/tbl:[&_thead_th]:top-0 @min-[780px]/tbl:[&_thead_th]:z-10 @min-[780px]/tbl:[&_thead_th]:bg-muted @min-[780px]/tbl:[&_thead_th]:shadow-[inset_0_-2px_0_0_currentColor]'

export const Table = makeScrollableTable(InstalledTable, STICKY_HEADER)
export type { ScrollableTableProps as TableProps } from '../../../lib/scrollable-table'

// retro's installed TableCell forces `whitespace-nowrap` (its neobrutalist grid
// look) — the only library that does. That silently truncates long cell content
// instead of wrapping it, unlike basic/animate/brutal. Default retro cells to
// `whitespace-normal` so cell text wraps to multiple lines by default in EVERY
// library (`installed/` stays verbatim; a caller can still pass `whitespace-nowrap`
// to opt a specific cell back out). TableHead keeps its nowrap — header LABELS
// staying on one line is the right default.
export function TableCell({ className, ...props }: ComponentProps<'td'>) {
  return <InstalledTableCell className={cn('whitespace-normal', className)} {...props} />
}
