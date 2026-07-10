'use client'

import { nanoid } from 'nanoid'
import { type ChangeEvent, type DragEvent, useCallback, useEffect, useRef, useState } from 'react'
import {
  DocCollectorComponentsProvider,
  useDocCollectorComponents,
  type DocCollectorComponents
} from './components-context'
import { AttachmentChip } from '../lib/attachment-chip'
import { cn, formatBytes } from '../lib/utils'

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
  /** Opaque consumer payload — DocCollector never reads or interprets this. */
  meta?: unknown
}

export interface DocCollectorCustomSource {
  /** Short label, e.g. "Herald Profile" or "URL" — shown as "Or add by <label>". */
  label: string
  placeholder: string
  /** Native input type, e.g. 'text' | 'url'. Defaults to 'text'. */
  type?: string
  /** Resolves the typed value into item text + a display filename (+ optional opaque meta). Throw to reject the add; the row shows the error inline and no tile is created. */
  resolve: (value: string) => Promise<{ text: string; filename: string; meta?: unknown }>
}

export interface DocCollectorProps {
  onItemsChange?: (items: DocCollectorItem[]) => void
  customSources?: DocCollectorCustomSource[]
  /** File-drop accept string. Defaults to `.md,.pdf`. */
  accept?: string
  /** Outer wrapper className. */
  className?: string
  /**
   * INJECTION CONTRACT — see `.claude/skills/ui-library-system/SKILL.md`.
   *
   * DocCollector resolves NO library itself. Consuming apps MUST inject
   * their library's primitives (`Textarea`, `Button`) via this prop. Each
   * key is optional so the collector degrades gracefully during the
   * first-render window — undefined falls back to a native HTML element.
   */
  components?: DocCollectorComponents
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

/**
 * Commits typed/pasted textarea text into a ready `DocCollectorItem`. Returns
 * `null` for blank/whitespace-only text (the Add button is then a no-op).
 *
 * This is the ONLY path from typed text to an item — there is no
 * length-based auto-conversion (unlike SmartPromptInput's
 * `pasteToFileChars`). It exists purely so the explicit Add button's
 * `onClick` has something to call; nothing else in this module invokes it.
 */
export function createTextItem(text: string, now: number, ordinal: number): DocCollectorItem | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  return {
    id: nanoid(),
    filename: `Text ${ordinal}.txt`,
    kind: 'text',
    status: 'ready',
    text: trimmed,
    addedAt: now
  }
}

export function DocCollector({
  onItemsChange,
  accept = DEFAULT_ACCEPT,
  className,
  components,
  customSources
}: DocCollectorProps) {
  const [items, setItems] = useState<DocCollectorItem[]>([])
  const [draftText, setDraftText] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [dropError, setDropError] = useState<string | null>(null)
  // Byte sizes aren't part of the public DocCollectorItem contract (only
  // filename/kind/status/text/error/addedAt are) — tracked separately here
  // purely to feed the chip tooltip's byte-size fallback.
  const sizesRef = useRef<Map<string, number>>(new Map())
  const textOrdinalRef = useRef(0)

  // Fired from an effect, not from inside the setItems updater — an updater
  // function can run more than once during React's render phase, and calling
  // a different component's setState from in there is illegal ("Cannot
  // update a component while rendering a different component"). Mirrors
  // SmartPromptInput's AttachmentTiles, which fires onCountChange the same
  // way (packages/ui/smart-prompt-input/smart-prompt-input.tsx).
  useEffect(() => {
    onItemsChange?.(items)
  }, [items, onItemsChange])

  const updateItems = useCallback((updater: (prev: DocCollectorItem[]) => DocCollectorItem[]) => {
    setItems(updater)
  }, [])

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

  // Commit gating (hard trap): pasted/typed text is NEVER auto-converted
  // into a tile on any length threshold — a tile is created only here, on
  // explicit click of the Add button. The textarea's onChange below only
  // ever calls `setDraftText`; it never reaches this function.
  const handleAdd = useCallback(() => {
    textOrdinalRef.current += 1
    const item = createTextItem(draftText, Date.now(), textOrdinalRef.current)
    if (!item) return
    updateItems((prev) => insertNewestFirst(prev, item))
    setDraftText('')
  }, [draftText, updateItems])

  const handleCustomAdd = useCallback(
    async (source: DocCollectorCustomSource, rawValue: string): Promise<string | null> => {
      const value = rawValue.trim()
      if (!value) return null
      try {
        const { text, filename, meta } = await source.resolve(value)
        const item: DocCollectorItem = {
          id: nanoid(),
          filename,
          kind: 'text',
          status: 'ready',
          text,
          meta,
          addedAt: Date.now()
        }
        updateItems((prev) => insertNewestFirst(prev, item))
        return null
      } catch (err) {
        return err instanceof Error ? err.message : 'Failed to resolve.'
      }
    },
    [updateItems]
  )

  return (
    <DocCollectorComponentsProvider components={components}>
      <div className={cn('flex flex-col gap-3 rounded-lg border border-border bg-card p-3', className)}>
        {items.length > 0 && (
          <div className='flex shrink-0 items-center gap-2 overflow-x-auto pt-3 pb-1'>
            {items.map((item) => {
              const meta =
                item.status === 'ready' && item.text !== undefined
                  ? `${item.text.length.toLocaleString()} chars`
                  : sizesRef.current.get(item.id) !== undefined
                    ? formatBytes(sizesRef.current.get(item.id) as number)
                    : '—'
              const preview = item.status === 'ready' ? item.text?.slice(0, 240).trim() : undefined
              return (
                <AttachmentChip
                  key={item.id}
                  filename={item.filename}
                  status={item.status}
                  meta={meta}
                  preview={preview}
                  error={item.error}
                  onRemove={() => handleRemove(item.id)}
                />
              )
            })}
          </div>
        )}

        <p className='shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground'>Drop Docs</p>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            'flex flex-1 min-h-[64px] w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border px-4 py-6 text-center transition-colors',
            isDragOver && 'border-primary bg-accent/40'
          )}
        >
          <p className='font-mono text-xs text-muted-foreground'>Drop {accept} files here</p>
        </div>
        {dropError && <p className='shrink-0 font-mono text-[10px] text-destructive'>{dropError}</p>}

        {customSources?.map((source) => (
          <DocCollectorCustomSourceRow
            key={source.label}
            source={source}
            onSubmit={(value) => handleCustomAdd(source, value)}
          />
        ))}

        <div className='shrink-0'>
          <p className='mb-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground'>Paste The Doc</p>
          <DocCollectorTextInput draftText={draftText} onDraftTextChange={setDraftText} onAdd={handleAdd} />
        </div>
      </div>
    </DocCollectorComponentsProvider>
  )
}

function DocCollectorTextInput({
  draftText,
  onDraftTextChange,
  onAdd
}: {
  draftText: string
  onDraftTextChange: (text: string) => void
  onAdd: () => void
}) {
  const { Textarea, Button } = useDocCollectorComponents()
  // Deliberately NOT field-sizing-content (SmartPromptInput's textarea
  // auto-grows with content) — DocCollector's textarea is a fixed-height,
  // fixed-row box that scrolls internally once content exceeds it, so the
  // rest of the component (drop-zone, tile row) never reflows as the user types.
  const textareaClassName = 'h-20 w-full resize-none overflow-y-auto'

  return (
    <div className='flex flex-col gap-1.5 rounded-md border border-input bg-background p-2 focus-within:ring-1 focus-within:ring-ring'>
      {Textarea ? (
        <Textarea
          placeholder='Paste text here…'
          value={draftText}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onDraftTextChange(e.target.value)}
          variant='bare'
          rows={3}
          className={textareaClassName}
        />
      ) : (
        <textarea
          placeholder='Paste text here…'
          value={draftText}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onDraftTextChange(e.target.value)}
          rows={3}
          className={cn(textareaClassName, 'bg-transparent font-sans text-sm text-foreground outline-none')}
        />
      )}
      <div className='flex justify-end'>
        {Button ? (
          <Button type='button' size='sm' onClick={onAdd}>
            Add
          </Button>
        ) : (
          <button
            type='button'
            onClick={onAdd}
            className='rounded-md bg-primary px-3 py-1 font-mono text-xs uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90'
          >
            Add
          </button>
        )}
      </div>
    </div>
  )
}

function DocCollectorCustomSourceRow({
  source,
  onSubmit
}: {
  source: DocCollectorCustomSource
  onSubmit: (value: string) => Promise<string | null>
}) {
  const { Input, Button } = useDocCollectorComponents()
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    const value = draft.trim()
    if (!value || submitting) return
    setSubmitting(true)
    setError(null)
    const err = await onSubmit(value)
    setSubmitting(false)
    if (err) {
      setError(err)
      setTimeout(() => setError(null), 4000)
      return
    }
    setDraft('')
  }

  return (
    <div className='flex shrink-0 flex-col gap-1.5'>
      <p className='font-mono text-[10px] uppercase tracking-widest text-muted-foreground'>Add by {source.label}</p>
      <div className='flex items-center gap-2'>
        {Input ? (
          <Input
            type={source.type || 'text'}
            placeholder={source.placeholder}
            value={draft}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSubmit()
              }
            }}
            className='font-mono text-sm flex-1'
            disabled={submitting}
            aria-label={source.label}
          />
        ) : (
          <input
            type={source.type || 'text'}
            placeholder={source.placeholder}
            value={draft}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSubmit()
              }
            }}
            className='font-mono text-sm flex-1 bg-transparent text-foreground outline-none border border-input rounded-md px-3 py-2 focus:ring-1 focus:ring-ring'
            disabled={submitting}
            aria-label={source.label}
          />
        )}
        {Button ? (
          <Button type='button' size='sm' onClick={handleSubmit} disabled={submitting || !draft.trim()}>
            Add
          </Button>
        ) : (
          <button
            type='button'
            onClick={handleSubmit}
            className='rounded-md bg-primary px-3 py-1 font-mono text-xs uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50'
            disabled={submitting || !draft.trim()}
          >
            Add
          </button>
        )}
      </div>
      {error && <p className='font-mono text-[10px] text-destructive'>{error}</p>}
    </div>
  )
}
