// Wraps brutal's own installed Table in the shared scrollable-table wrapper
// (`lib/scrollable-table.tsx`) — robust horizontal scroll + the `stickyHeader` /
// `maxHeight` props. The installed file stays verbatim; TableHeader/Body/Row/etc.
// still come straight from `../installed/table` via `components/index.ts`.
//
// STICKY_HEADER is this library's literal (Tailwind-scannable) pinned-header
// class. Sticky `<th>` cells detach from the row border (border-collapse), so the
// pinned header carries its own — `border-b` matches brutal's `border-b` rows.
import { makeScrollableTable } from '../../../lib/scrollable-table'
import { Table as InstalledTable } from '../installed/table'

const STICKY_HEADER =
  '[&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10 [&_thead_th]:bg-card [&_thead_th]:border-b-2 [&_thead_th]:border-border'

export const Table = makeScrollableTable(InstalledTable, STICKY_HEADER)
export type { ScrollableTableProps as TableProps } from '../../../lib/scrollable-table'
