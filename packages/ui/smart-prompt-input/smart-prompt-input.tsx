'use client'

import type { ChatStatus, FileUIPart } from 'ai'
import { FileText, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
  const isImage = f.mediaType.startsWith('image/')
  const sizeStr = extra ? formatBytes(extra.size) : '—'
  const footerLabel =
    isText && extra?.charCount !== undefined
      ? `${extra.charCount.toLocaleString()} chars · ${ext || 'TXT'}`
      : `${sizeStr} · ${ext || 'FILE'}`

  return (
    <div className='relative flex h-36 w-28 shrink-0 flex-col overflow-hidden rounded border border-border bg-card'>
      {/* Preview area — fixed height fills remaining space, clips all content types uniformly */}
      <div className='flex flex-1 overflow-hidden'>
        {isImage && f.url ? (
          // biome-ignore lint/performance/noImgElement: blob URL from file attachment
          <img src={f.url} alt={name} className='h-full w-full object-cover' />
        ) : isText && extra?.textPreview ? (
          <p className='w-full overflow-hidden p-2 font-mono text-[7px] leading-snug text-muted-foreground'>
            {extra.textPreview}
          </p>
        ) : (
          <div className='flex h-full w-full items-center justify-center bg-muted/30'>
            <span className='rounded bg-primary px-1.5 py-0.5 font-mono text-[9px] uppercase text-primary-foreground'>
              {ext || 'FILE'}
            </span>
          </div>
        )}
      </div>
      {/* Footer — pinned to bottom, fixed height */}
      <div className='shrink-0 border-t border-border bg-muted px-2 py-1'>
        <div className='flex items-center gap-1'>
          <FileText className='h-2.5 w-2.5 shrink-0 text-muted-foreground' />
          <span className='min-w-0 flex-1 truncate font-mono text-[9px] text-muted-foreground'>{name}</span>
        </div>
        <p className='mt-0.5 font-mono text-[9px] text-muted-foreground'>{footerLabel}</p>
      </div>
      <button
        type='button'
        aria-label={`Remove ${name}`}
        onClick={onRemove}
        className='absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-background/80 text-muted-foreground opacity-70 transition-opacity hover:opacity-100'
      >
        <X className='h-2.5 w-2.5' />
      </button>
    </div>
  )
}

function AttachmentTiles() {
  const { files, remove } = usePromptInputAttachments()
  const [extras, setExtras] = useState<Map<string, FileExtra>>(new Map())
  const loadedIds = useRef<Set<string>>(new Set())

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
  pasteToFileChars
}: SmartPromptInputProps) {
  const chatStatus = statusMap[status]
  const [rejectionError, setRejectionError] = useState<string | null>(null)
  const useFullWidthCta = Boolean(ctaLabel)

  const handleSubmit = (message: PromptInputMessage) => {
    setRejectionError(null)
    onSubmit(message.text, message.files)
  }

  const handleError = ({ code }: { code: string; message: string }) => {
    if (code === 'accept') {
      setRejectionError('Only PDF, Markdown, or text files are accepted.')
      setTimeout(() => setRejectionError(null), 4000)
    }
  }

  const hasFooterContent = !!(accept || hint || !useFullWidthCta)

  return (
    <TooltipProvider>
      <div className={className}>
        <PromptInput accept={accept} onSubmit={handleSubmit} onError={handleError}>
          <AttachmentTiles />
          <PromptInputTextarea
            placeholder={placeholder}
            submitOnCmdEnter={submitOn === 'cmdenter'}
            pasteToFileChars={pasteToFileChars}
          />
          {hasFooterContent && (
            <PromptInputFooter>
              <PromptInputTools>
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
              {!useFullWidthCta && (
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
