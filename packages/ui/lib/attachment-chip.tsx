'use client'

import { X } from 'lucide-react'
import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from './utils'

function getExt(filename: string): string {
  return (filename.split('.').pop() ?? '').toUpperCase()
}

export type AttachmentChipStatus = 'resolving' | 'ready' | 'error'

export interface AttachmentChipProps {
  filename: string
  /** Visual state — 'resolving' pulses, 'error' tints destructive. Defaults to 'ready'. */
  status?: AttachmentChipStatus
  /** Pre-formatted meta line shown in the tooltip (e.g. "1,234 chars" or "45.2 KB"). */
  meta: string
  /** Text preview snippet shown in the tooltip, if available. */
  preview?: string
  /** Error message shown in the tooltip when status === 'error'. */
  error?: string
  onRemove: () => void
}

/**
 * Minimal claude.ai-style attachment chip: just the file extension, with the
 * filename/meta/preview surfaced in a hover tooltip. Shared by `DocCollector`
 * and `SmartPromptInput` — the only piece of tile UI the two composites have
 * in common; everything else about how each collects/resolves/orders
 * attachments stays separate. Deliberately domain-agnostic: it takes a
 * pre-formatted `meta` string rather than a size/char-count pair, so it
 * doesn't need to know either composite's own item shape.
 *
 * The tooltip is portaled to `document.body` and positioned via
 * `getBoundingClientRect()` (fixed-position inline style — the documented
 * RULE 3 exception for a genuine runtime measurement) rather than absolutely
 * positioned inside the chip. Both composites render their chip row with
 * `overflow-x-auto` for horizontal scroll, and setting `overflow-x` forces
 * the browser to compute `overflow-y: auto` too — an in-place
 * absolutely-positioned tooltip would get clipped by that computed vertical
 * overflow. Portaling escapes it entirely.
 */
export function AttachmentChip({ filename, status = 'ready', meta, preview, error, onRemove }: AttachmentChipProps) {
  const chipRef = useRef<HTMLDivElement>(null)
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null)

  const showTooltip = () => {
    const rect = chipRef.current?.getBoundingClientRect()
    if (!rect) return
    setTooltipPos({ top: rect.top, left: rect.left + rect.width / 2 })
  }
  const hideTooltip = () => setTooltipPos(null)

  const ext = getExt(filename)

  return (
    <div className='group relative shrink-0' onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
      <div
        ref={chipRef}
        className={cn(
          'flex h-16 w-12 items-center justify-center rounded-md border border-border bg-muted font-mono text-xs font-bold uppercase text-muted-foreground transition-colors',
          status === 'resolving' && 'animate-pulse opacity-60',
          status === 'error' && 'border-destructive/40 text-destructive'
        )}
      >
        {ext || '?'}
      </div>

      <button
        type='button'
        aria-label={`Remove ${filename}`}
        onClick={onRemove}
        onMouseDown={(e) => e.preventDefault()}
        className='absolute -right-1.5 -top-1.5 z-10 hidden h-4 w-4 items-center justify-center rounded-full bg-foreground text-background shadow ring-1 ring-background/40 transition hover:bg-foreground/80 group-hover:flex'
      >
        <X className='h-2.5 w-2.5' />
      </button>

      {tooltipPos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role='tooltip'
            style={{ top: tooltipPos.top, left: tooltipPos.left }}
            className='pointer-events-none fixed z-50 w-56 -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-md border border-border bg-popover p-2 shadow-lg'
          >
            <p className='truncate font-mono text-[10px] text-foreground'>{filename}</p>
            <p className='font-mono text-[9px] text-muted-foreground'>{meta}</p>
            {preview && (
              <p className='mt-1 line-clamp-4 break-words font-mono text-[9px] leading-snug text-muted-foreground'>
                {preview}
              </p>
            )}
            {status === 'error' && error && <p className='mt-1 font-mono text-[9px] text-destructive'>{error}</p>}
          </div>,
          document.body
        )}
    </div>
  )
}
