'use client'

import type { ChatStatus, FileUIPart } from 'ai'
import { FileText, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
  type PromptInputMessage
} from './vendor/prompt-input'
import { TooltipProvider } from './vendor/ui/tooltip'

export type SmartPromptStatus = 'idle' | 'loading' | 'streaming' | 'error'

export interface SmartPromptInputProps {
  onSubmit: (text: string, files: FileUIPart[]) => void
  placeholder?: string
  /** 'enter' = Enter submits (default) | 'cmdenter' = Cmd/Ctrl+Enter submits, plain Enter = newline | 'button' = no keyboard submit */
  submitOn?: 'enter' | 'cmdenter' | 'button'
  ctaLabel?: string
  hint?: string
  accept?: string
  status?: SmartPromptStatus
  onStop?: () => void
  className?: string
  /** Paste text longer than this char count as a file attachment instead of textarea fill */
  pasteToFileChars?: number
  /**
   * Gemini-style action slot rendered next to the submit button.
   *
   * - When the textarea is at its minimum (single line / unfilled),
   *   `actions` renders inline on the right side of the textarea,
   *   immediately before the submit button (submit stays rightmost).
   * - When the textarea wraps to 2+ lines (or attachments are present),
   *   `actions` drops into the footer row beneath the textarea,
   *   to the right of any existing tools, before the submit button.
   *
   * When `actions` is not provided, the input renders exactly as before
   * (Herald-compatible default).
   */
  actions?: React.ReactNode
  /**
   * Which side of the input the `actions` slot occupies.
   *
   * - `'right'` (default): actions render to the right of the textarea (inline
   *   mode) or on the right side of the footer (multi-line mode), immediately
   *   before the submit button. This is the original, Herald-compatible layout.
   * - `'left'`: actions LEAD the input.
   *   - Inline mode: `[actions] [textarea ........] [submit]`
   *   - Multi-line mode: footer becomes `[actions, tools, hint] ... [submit]`.
   *
   * Has no effect when `actions` is not provided.
   */
  actionsPosition?: 'left' | 'right'
}

const statusMap: Record<SmartPromptStatus, ChatStatus> = {
  idle: 'ready',
  loading: 'submitted',
  streaming: 'streaming',
  error: 'error'
}

interface FileExtra {
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

function AttachmentTileItem({
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

  return (
    <div className='relative flex h-36 w-28 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card'>
      <button
        type='button'
        aria-label={`Remove ${name}`}
        onClick={onRemove}
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

function AttachmentTiles({ onCountChange }: { onCountChange?: (count: number) => void }) {
  const { files, remove } = usePromptInputAttachments()
  const [extras, setExtras] = useState<Map<string, FileExtra>>(new Map())
  const loadedIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    onCountChange?.(files.length)
  }, [files.length, onCountChange])

  useEffect(() => {
    for (const f of files) {
      if (loadedIds.current.has(f.id)) continue
      loadedIds.current.add(f.id)

      const url = f.url ?? ''
      void (async () => {
        try {
          let blob: Blob
          if (url.startsWith('blob:')) {
            const res = await fetch(url)
            blob = await res.blob()
          } else if (url.startsWith('data:')) {
            const comma = url.indexOf(',')
            const header = url.slice(0, comma)
            const data = url.slice(comma + 1)
            const bytes = header.includes(';base64')
              ? Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
              : new TextEncoder().encode(decodeURIComponent(data))
            blob = new Blob([bytes])
          } else {
            return
          }

          const size = blob.size
          let charCount: number | undefined
          let textPreview: string | undefined

          if (f.mediaType.startsWith('text/')) {
            const text = await blob.text()
            charCount = text.length
            textPreview = text.slice(0, 200).trim()
          }

          setExtras((prev) => new Map(prev).set(f.id, { size, charCount, textPreview }))
        } catch {
          // non-critical
        }
      })()
    }
  }, [files])

  if (files.length === 0) return null

  return (
    <PromptInputHeader>
      <div className='flex flex-wrap gap-2 p-1'>
        {files.map((f) => (
          <AttachmentTileItem key={f.id} f={f} extra={extras.get(f.id)} onRemove={() => remove(f.id)} />
        ))}
      </div>
    </PromptInputHeader>
  )
}

export function SmartPromptInput({
  onSubmit,
  placeholder,
  submitOn = 'enter',
  ctaLabel,
  hint,
  accept,
  status = 'idle',
  onStop,
  className,
  pasteToFileChars,
  actions,
  actionsPosition = 'right'
}: SmartPromptInputProps) {
  const chatStatus = statusMap[status]
  const [rejectionError, setRejectionError] = useState<string | null>(null)
  const useFullWidthCta = Boolean(ctaLabel)
  const hasActions = actions !== undefined && actions !== null && actions !== false
  const actionsOnLeft = hasActions && actionsPosition === 'left'

  // Track textarea single-line vs multi-line for Gemini-style responsive placement.
  // Detection: measure the textarea's scrollHeight on input and compare to the
  // line-height baseline captured on first paint. The textarea grows via
  // `field-sizing-content`, so re-measuring on `onInput` (and on mount) catches
  // every height change that matters — no ResizeObserver needed.
  //
  // We resolve the textarea node by querying the wrapper rather than forwarding
  // a ref through the vendored PromptInputTextarea — that component is a plain
  // function component without ref forwarding, and patching the vendor file to
  // add it would cost more than this targeted DOM query.
  const inputRowRef = useRef<HTMLDivElement | null>(null)
  const [isMultiLine, setIsMultiLine] = useState(false)
  const [attachmentCount, setAttachmentCount] = useState(0)

  const remeasure = () => {
    const el = inputRowRef.current?.querySelector<HTMLTextAreaElement>('textarea[name="message"]')
    if (!el) return
    const styles = window.getComputedStyle(el)
    const lineHeight = Number.parseFloat(styles.lineHeight)
    const paddingTop = Number.parseFloat(styles.paddingTop)
    const paddingBottom = Number.parseFloat(styles.paddingBottom)
    if (!Number.isFinite(lineHeight) || lineHeight <= 0) return
    // Allow ~1px rounding slack so a perfectly single-line textarea never
    // bounces into multi-line on a sub-pixel difference.
    const singleLineHeight = lineHeight + paddingTop + paddingBottom + 1
    setIsMultiLine(el.scrollHeight > singleLineHeight)
  }

  useLayoutEffect(() => {
    if (!hasActions) return
    remeasure()
  }, [hasActions])

  const handleSubmit = (message: PromptInputMessage) => {
    setRejectionError(null)
    onSubmit(message.text, message.files)
    // Re-measure after submit — clearing the textarea collapses it back to one line.
    requestAnimationFrame(() => remeasure())
  }

  const handleError = ({ code }: { code: string; message: string }) => {
    if (code === 'accept') {
      setRejectionError('Only PDF, Markdown, or text files are accepted.')
      setTimeout(() => setRejectionError(null), 4000)
    }
  }

  // Footer renders whenever we have tools, hint, or the default submit position.
  // With `actions`, when single-line we lift actions+submit inline next to the
  // textarea — so the footer is only needed if tools/hint exist or we're in
  // multi-line mode (where actions and submit live in the footer).
  const inlineMode = hasActions && !isMultiLine && attachmentCount === 0
  const hasFooterContent = hasActions
    ? !useFullWidthCta && (!!accept || !!hint || !inlineMode)
    : !!(accept || hint || !useFullWidthCta)

  return (
    <TooltipProvider>
      <div className={className}>
        <PromptInput accept={accept} onSubmit={handleSubmit} onError={handleError}>
          <AttachmentTiles onCountChange={hasActions ? setAttachmentCount : undefined} />
          {hasActions ? (
            <div ref={inputRowRef} className='flex flex-row items-end gap-1'>
              {inlineMode && actionsOnLeft && (
                <div className='flex shrink-0 items-center gap-1 px-2 py-1.5'>
                  <div className='flex items-center gap-1'>{actions}</div>
                </div>
              )}
              <PromptInputTextarea
                placeholder={placeholder}
                submitOnCmdEnter={submitOn === 'cmdenter'}
                pasteToFileChars={pasteToFileChars}
                onInput={remeasure}
              />
              {inlineMode && !actionsOnLeft && (
                <div className='flex shrink-0 items-center gap-1 px-2 py-1.5'>
                  <div className='flex items-center gap-1'>{actions}</div>
                  {!useFullWidthCta && (
                    <PromptInputSubmit status={chatStatus} onStop={onStop}>
                      {ctaLabel}
                    </PromptInputSubmit>
                  )}
                </div>
              )}
              {inlineMode && actionsOnLeft && !useFullWidthCta && (
                <div className='flex shrink-0 items-center gap-1 px-2 py-1.5'>
                  <PromptInputSubmit status={chatStatus} onStop={onStop}>
                    {ctaLabel}
                  </PromptInputSubmit>
                </div>
              )}
            </div>
          ) : (
            <PromptInputTextarea
              placeholder={placeholder}
              submitOnCmdEnter={submitOn === 'cmdenter'}
              pasteToFileChars={pasteToFileChars}
            />
          )}
          {hasFooterContent && (
            <PromptInputFooter>
              <PromptInputTools>
                {hasActions && !inlineMode && actionsOnLeft && <div className='flex items-center gap-1'>{actions}</div>}
                {accept && (
                  <PromptInputActionMenu>
                    <PromptInputActionMenuTrigger />
                    <PromptInputActionMenuContent>
                      <PromptInputActionAddAttachments />
                    </PromptInputActionMenuContent>
                  </PromptInputActionMenu>
                )}
                {hint && <span className='font-mono text-[10px] text-muted-foreground'>{hint}</span>}
              </PromptInputTools>
              {hasActions && !inlineMode && !actionsOnLeft && (
                <div className='flex items-center gap-1'>
                  <div className='flex items-center gap-1'>{actions}</div>
                  {!useFullWidthCta && (
                    <PromptInputSubmit status={chatStatus} onStop={onStop}>
                      {ctaLabel}
                    </PromptInputSubmit>
                  )}
                </div>
              )}
              {hasActions && !inlineMode && actionsOnLeft && !useFullWidthCta && (
                <PromptInputSubmit status={chatStatus} onStop={onStop}>
                  {ctaLabel}
                </PromptInputSubmit>
              )}
              {!hasActions && !useFullWidthCta && (
                <PromptInputSubmit status={chatStatus} onStop={onStop}>
                  {ctaLabel}
                </PromptInputSubmit>
              )}
            </PromptInputFooter>
          )}
          {useFullWidthCta && (
            <div className='border-t border-border px-2 pb-2 pt-1.5'>
              <button
                type='submit'
                className='w-full rounded-md bg-primary py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50'
              >
                {ctaLabel}
              </button>
            </div>
          )}
        </PromptInput>
        {rejectionError && <p className='mt-1.5 font-mono text-[10px] text-destructive'>{rejectionError}</p>}
      </div>
    </TooltipProvider>
  )
}
