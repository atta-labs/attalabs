// Wraps basic's own installed Table in the shared robust horizontal-scroll
// container (see `lib/scrollable-table.tsx`). The installed file stays verbatim;
// only the scroll behavior is made reliable. TableHeader/Body/Row/Head/Cell etc.
// still come straight from `../installed/table` via `components/index.ts`.
import { makeScrollableTable } from '../../../lib/scrollable-table'
import { Table as InstalledTable } from '../installed/table'

export const Table = makeScrollableTable(InstalledTable)
export type { ScrollableTableProps as TableProps } from '../../../lib/scrollable-table'
