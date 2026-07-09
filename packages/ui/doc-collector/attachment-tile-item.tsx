'use client'

import type { FileUIPart } from 'ai'
import { FileText, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../lib/utils'

export interface FileExtra {
  size: number
  charCount?: number
  textPreview?: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getExt(name: string): string {
  return (name.split('.').pop() ?? '').toUpperCase()
}

const TILE_EXIT_DURATION_MS = 200

export function AttachmentTileItem({
  f,
  extra,
  onRemove
}: {
  f: FileUIPart & { id: string }
  extra: FileExtra | undefined
  onRemove: () => void
}) {
  const name = f.filename ?? 'file'
  const ext = getExt(name)
  const isText = f.mediaType.startsWith('text/')
  const textPreview = extra?.textPreview
  const meta =
    isText && extra?.charCount !== undefined
      ? `${extra.charCount.toLocaleString()} chars`
      : extra
        ? formatBytes(extra.size)
        : '—'

  // Local exit-animation state: on click, run the exit animation for
  // TILE_EXIT_DURATION_MS, then call the real `onRemove` to unmount. Calling
  // `onRemove` synchronously gives no animation because React unmounts the
  // element instantly. This pattern is local — the parent state machine still
  // owns the attachment list; we're just delaying the unmount signal.
  const [isLeaving, setIsLeaving] = useState(false)
  const handleRemove = () => {
    if (isLeaving) return
    setIsLeaving(true)
    setTimeout(onRemove, TILE_EXIT_DURATION_MS)
  }

  return (
    <div
      className={cn(
        'relative flex h-36 w-28 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card',
        // Entrance: pop in when the tile first mounts.
        'animate-in fade-in zoom-in-95 duration-200',
        // Exit: when the user clicks the X, the parent keeps the tile mounted
        // for `TILE_EXIT_DURATION_MS` so this animation can play. `fill-mode-forwards`
        // holds the faded/scaled-down end state until React unmounts.
        isLeaving && 'animate-out fade-out-0 zoom-out-95 fill-mode-forwards duration-200'
      )}
    >
      <button
        type='button'
        aria-label={`Remove ${name}`}
        onClick={handleRemove}
        // Prevent the button from stealing focus from the textarea on click.
        // Without this, clicking X moves focus to the button → button unmounts
        // → focus falls to <body>, and the user's typing position is lost even
        // though text remains in the textarea.
        onMouseDown={(e) => e.preventDefault()}
        className='absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background shadow ring-1 ring-background/40 transition hover:bg-foreground/80'
      >
        <X className='h-3.5 w-3.5' />
      </button>

      <div className='flex-1 overflow-hidden p-2'>
        {isText && textPreview ? (
          <p className='line-clamp-5 break-words font-mono text-[8px] leading-snug text-muted-foreground'>
            {textPreview}
          </p>
        ) : (
          <div className='flex h-full items-center justify-center'>
            <span className='rounded bg-primary px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-primary-foreground'>
              {ext}
            </span>
          </div>
        )}
      </div>

      <div className='flex items-center gap-1.5 border-t border-border bg-muted px-2 py-1.5'>
        <FileText className='h-3 w-3 shrink-0 text-muted-foreground' />
        <div className='min-w-0'>
          <p className='truncate font-mono text-[10px] text-foreground'>{name}</p>
          <p className='font-mono text-[8px] text-muted-foreground'>{meta}</p>
        </div>
      </div>
    </div>
  )
}
