'use client'

import type { FileUIPart } from 'ai'
import { nanoid } from 'nanoid'
import { type DragEvent, useCallback, useRef, useState } from 'react'
import { AttachmentTileItem, type FileExtra } from './attachment-tile-item'
import { cn } from '../lib/utils'

export type DocCollectorItemStatus = 'resolving' | 'ready' | 'error'

export interface DocCollectorItem {
  id: string
  filename: string
  kind: 'md' | 'pdf' | 'text'
  status: DocCollectorItemStatus
  /** Resolved plain text — present once `status === 'ready'`. */
  text?: string
  /** Present when `status === 'error'`. */
  error?: string
  /** `Date.now()` at commit time — drives newest-first ordering. */
  addedAt: number
}

export interface DocCollectorProps {
  onItemsChange?: (items: DocCollectorItem[]) => void
  /** File-drop accept string. Defaults to `.md,.pdf`. */
  accept?: string
  /** Outer wrapper className. */
  className?: string
}

const DEFAULT_ACCEPT = '.md,.pdf'

/** Maps a filename's extension against `accept` to a supported drop kind, or `null` if rejected. */
export function resolveFileKind(filename: string, accept: string): 'md' | 'pdf' | null {
  const ext = `.${(filename.split('.').pop() ?? '').toLowerCase()}`
  const accepted = accept.split(',').map((s) => s.trim().toLowerCase())
  if (!accepted.includes(ext)) return null
  if (ext === '.md') return 'md'
  if (ext === '.pdf') return 'pdf'
  return null
}

/**
 * Resolves a dropped file's plain text. `.md`/text files go through
 * `file.text()`; `.pdf` files use `unpdf`'s `extractText`, mirroring the
 * exact call shape used server-side in
 * `apps/herald-ai/web/src/app/api/admin/parse-cv/route.ts`. `unpdf` is
 * dynamic-imported here (never a static top-level import) so non-DocCollector
 * consumers of `packages/ui` never pay for PDF.js in their bundle.
 */
export async function resolveFileText(file: File, kind: 'md' | 'pdf'): Promise<string> {
  if (kind === 'pdf') {
    const { extractText } = await import('unpdf')
    const arrayBuffer = await file.arrayBuffer()
    const result = await extractText(new Uint8Array(arrayBuffer))
    return Array.isArray(result.text) ? result.text.join('\n') : result.text
  }
  return file.text()
}

export function insertNewestFirst(items: DocCollectorItem[], item: DocCollectorItem): DocCollectorItem[] {
  return [...items, item].sort((a, b) => b.addedAt - a.addedAt)
}

export function patchItemById(
  items: DocCollectorItem[],
  id: string,
  patch: Partial<DocCollectorItem>
): DocCollectorItem[] {
  return items.map((it) => (it.id === id ? { ...it, ...patch } : it))
}

export function removeItemById(items: DocCollectorItem[], id: string): DocCollectorItem[] {
  return items.filter((it) => it.id !== id)
}

function kindToMediaType(kind: DocCollectorItem['kind']): string {
  if (kind === 'pdf') return 'application/pdf'
  if (kind === 'md') return 'text/markdown'
  return 'text/plain'
}

function toFileUIPart(item: DocCollectorItem): FileUIPart & { id: string } {
  return {
    id: item.id,
    type: 'file',
    mediaType: kindToMediaType(item.kind),
    filename: item.filename,
    url: ''
  }
}

function toFileExtra(item: DocCollectorItem, size: number | undefined): FileExtra | undefined {
  if (item.status !== 'ready' || item.text === undefined) return undefined
  return {
    size: size ?? new Blob([item.text]).size,
    charCount: item.text.length,
    textPreview: item.text.slice(0, 200).trim()
  }
}

export function DocCollector({ onItemsChange, accept = DEFAULT_ACCEPT, className }: DocCollectorProps) {
  const [items, setItems] = useState<DocCollectorItem[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [dropError, setDropError] = useState<string | null>(null)
  // Byte sizes aren't part of the public DocCollectorItem contract (only
  // filename/kind/status/text/error/addedAt are) — tracked separately here
  // purely to feed AttachmentTileItem's `extra.size` display.
  const sizesRef = useRef<Map<string, number>>(new Map())

  const updateItems = useCallback(
    (updater: (prev: DocCollectorItem[]) => DocCollectorItem[]) => {
      setItems((prev) => {
        const next = updater(prev)
        onItemsChange?.(next)
        return next
      })
    },
    [onItemsChange]
  )

  const resolveDroppedFile = useCallback(
    (file: File) => {
      const kind = resolveFileKind(file.name, accept)
      if (!kind) {
        setDropError(`Only ${accept} files are accepted.`)
        setTimeout(() => setDropError(null), 4000)
        return
      }
      const id = nanoid()
      sizesRef.current.set(id, file.size)
      // Instant tile on drop — status starts 'resolving' before any async
      // work begins; resolution patches it to 'ready'/'error' once settled.
      const item: DocCollectorItem = {
        id,
        filename: file.name,
        kind,
        status: 'resolving',
        addedAt: Date.now()
      }
      updateItems((prev) => insertNewestFirst(prev, item))

      void (async () => {
        try {
          const text = await resolveFileText(file, kind)
          updateItems((prev) => patchItemById(prev, id, { status: 'ready', text }))
        } catch (err) {
          updateItems((prev) =>
            patchItemById(prev, id, {
              status: 'error',
              error: err instanceof Error ? err.message : 'Failed to read file.'
            })
          )
        }
      })()
    },
    [accept, updateItems]
  )

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragOver(false)
      for (const file of Array.from(e.dataTransfer.files)) {
        resolveDroppedFile(file)
      }
    },
    [resolveDroppedFile]
  )

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleRemove = useCallback(
    (id: string) => {
      sizesRef.current.delete(id)
      updateItems((prev) => removeItemById(prev, id))
    },
    [updateItems]
  )

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border px-4 py-6 text-center transition-colors',
          isDragOver && 'border-primary bg-accent/40'
        )}
      >
        <p className='font-mono text-xs text-muted-foreground'>Drop {accept} files here</p>
      </div>

      {dropError && <p className='font-mono text-[10px] text-destructive'>{dropError}</p>}

      {items.length > 0 && (
        <div className='flex gap-2 overflow-x-auto'>
          {items.map((item) => (
            <AttachmentTileItem
              key={item.id}
              f={toFileUIPart(item)}
              extra={toFileExtra(item, sizesRef.current.get(item.id))}
              onRemove={() => handleRemove(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
