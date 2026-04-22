'use client'

import { useState, useMemo } from 'react'
import { Button } from '@atta/ui/components/button'
import { Input } from '@atta/ui/components/input'
import { downloadCsv } from '../lib/csv-export'

export type ColumnDef<T> = {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  sortValue?: (row: T) => string | number | null | undefined
  csvValue?: (row: T) => string | number | null | undefined
}

type SortDir = 'asc' | 'desc'

export function BenchTable<T>({
  rows,
  columns,
  searchKeys,
  filename,
  defaultSortKey,
  emptyMessage = 'No data',
}: {
  rows: T[]
  columns: ColumnDef<T>[]
  searchKeys?: (keyof T & string)[]
  filename: string
  defaultSortKey?: string
  emptyMessage?: string
}) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey ?? null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const filtered = useMemo(() => {
    if (!search.trim() || !searchKeys?.length) return rows
    const q = search.toLowerCase()
    return rows.filter((r) =>
      searchKeys.some((k) => {
        const v = r[k]
        return v != null && String(v).toLowerCase().includes(q)
      })
    )
  }, [rows, search, searchKeys])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    const col = columns.find((c) => c.key === sortKey)
    if (!col?.sortValue) return filtered
    return [...filtered].sort((a, b) => {
      const av = col.sortValue!(a) ?? ''
      const bv = col.sortValue!(b) ?? ''
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir, columns])

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function handleExport() {
    const exportRows = sorted.map((r) => {
      const obj: Record<string, unknown> = {}
      for (const col of columns) {
        obj[col.header] = col.csvValue ? col.csvValue(r) : col.sortValue?.(r) ?? ''
      }
      return obj
    })
    downloadCsv(exportRows, filename)
  }

  return (
    <div className='space-y-3'>
      <div className='flex items-center gap-2'>
        {searchKeys && (
          <Input
            placeholder='Search…'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='h-8 w-64 text-sm'
          />
        )}
        <span className='text-xs text-muted-foreground'>{sorted.length} rows</span>
        <div className='ml-auto'>
          <Button variant='outline' size='sm' onClick={handleExport}>
            Download CSV
          </Button>
        </div>
      </div>

      <div className='overflow-x-auto rounded-md border border-border'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-border bg-muted/40'>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-2 text-left font-medium text-muted-foreground${col.sortValue ? ' cursor-pointer select-none' : ''}`}
                  onClick={() => col.sortValue && handleSort(col.key)}
                >
                  {col.header}
                  {sortKey === col.key && (
                    <span className='ml-1 text-xs'>{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className='px-3 py-8 text-center text-muted-foreground'>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sorted.map((row, i) => (
                <tr
                  key={i}
                  className='border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors'
                >
                  {columns.map((col) => (
                    <td key={col.key} className='px-3 py-2 align-top'>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
