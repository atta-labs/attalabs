'use client'

import type { FileUIPart } from 'ai'
import { useEffect, useRef } from 'react'
import { Download, ExternalLink, FileText } from 'lucide-react'
import { SmartPromptInput } from '@atta/ui/smart-prompt-input'
import { AvatarFrame } from '@/components/avatar-frame'
import { SummaryMarkdown } from '@/components/summary-markdown'
import { useHeroCollapse } from './hero-collapse-context'

const ACCEPTED_DOC_TYPES = '.pdf,.md,.txt,application/pdf,text/markdown,text/plain'

export function JDInput({
  onSubmit,
  candidateName = 'Dani Estevez Martin',
  candidateTitle = 'Senior Frontend Architect · AI Systems · Web3',
  candidateAvatarUrl,
  candidateSummary,
  candidateStack,
  candidateLocation,
  candidateAvailability,
  candidateCvUrl
}: {
  onSubmit: (jd: string) => void
  candidateName?: string
  candidateTitle?: string
  candidateAvatarUrl?: string
  candidateSummary?: string
  candidateStack?: string[]
  candidateLocation?: string
  candidateAvailability?: string
  candidateCvUrl?: string
}) {
  const { setIsCollapsed } = useHeroCollapse()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsCollapsed(false)
    const sentinel = sentinelRef.current
    const scroller = scrollRef.current
    if (!sentinel || !scroller) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) setIsCollapsed(!entry.isIntersecting)
      },
      { root: scroller, rootMargin: '0px', threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [setIsCollapsed])

  const topStack = candidateStack?.slice(0, 5) ?? []
  const locationLine = [candidateLocation, candidateAvailability].filter(Boolean).join(' · ')
  const cvFilename = candidateCvUrl
    ? decodeURIComponent(candidateCvUrl.split('/').pop() ?? '') || `${candidateName ?? 'CV'}.pdf`
    : null
  const cvExt = cvFilename ? (cvFilename.split('.').pop() ?? 'PDF').toUpperCase() : 'PDF'

  function handleSubmit(text: string, files: FileUIPart[]) {
    let jd = text.trim()
    if (!jd && files.length > 0) {
      const textFile = files.find((f) => f.mediaType?.startsWith('text/'))
      if (textFile?.url.startsWith('data:')) {
        const comma = textFile.url.indexOf(',')
        if (comma !== -1) {
          const header = textFile.url.slice(0, comma)
          const data = textFile.url.slice(comma + 1)
          try {
            jd = header.includes(';base64') ? atob(data) : decodeURIComponent(data)
          } catch {
            // ignore decode failure
          }
        }
      }
    }
    if (jd) onSubmit(jd)
  }

  return (
    <div className='flex h-full flex-col'>
      {/* Scrollable candidate info */}
      <div className='min-h-0 flex-1 overflow-y-auto' ref={scrollRef}>
        <div className='mx-auto max-w-[680px] px-6 pt-12 pb-4'>
          <header>
            <div className='flex items-stretch justify-between gap-4'>
              <div className='flex items-start gap-5'>
                {candidateAvatarUrl && (
                  <AvatarFrame
                    src={candidateAvatarUrl}
                    alt={candidateName ?? ''}
                    variant='dossier'
                    pennant
                    pennantAnimated
                  />
                )}
                <div className='min-w-0'>
                  <h1 className='mt-1 font-display text-4xl tracking-tight text-foreground'>{candidateName}</h1>
                  <p className='mt-2 font-mono text-xl text-muted-foreground'>{candidateTitle}</p>
                </div>
              </div>

              {candidateCvUrl && (
                <div className='flex shrink-0 flex-col gap-2'>
                  <div className='flex w-28 flex-col overflow-hidden rounded border border-border bg-card'>
                    <div className='flex flex-1 items-center justify-center p-3'>
                      <span className='rounded bg-primary px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-primary-foreground'>
                        {cvExt}
                      </span>
                    </div>
                    <div className='flex items-center gap-1.5 border-t border-border bg-muted px-2 py-1.5'>
                      <FileText className='h-3 w-3 shrink-0 text-muted-foreground' />
                      <p className='truncate font-mono text-[10px] text-foreground'>{cvFilename}</p>
                    </div>
                  </div>
                  <div className='flex shrink-0 items-center justify-center gap-1.5'>
                    <a
                      href={candidateCvUrl}
                      download
                      aria-label='Download CV'
                      title='Download CV'
                      className='flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary'
                    >
                      <Download className='h-3.5 w-3.5' />
                    </a>
                    <a
                      href={candidateCvUrl}
                      target='_blank'
                      rel='noreferrer'
                      aria-label='Open CV'
                      title='Open CV'
                      className='flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary'
                    >
                      <ExternalLink className='h-3.5 w-3.5' />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Sentinel: collapse triggers when this exits the scroll container's top (= past the header) */}
            <div ref={sentinelRef} aria-hidden='true' />

            <div className='mt-6'>
              {(topStack.length > 0 || locationLine) && (
                <dl className='grid grid-cols-[80px_1fr] items-baseline gap-y-2'>
                  {topStack.length > 0 && (
                    <>
                      <dt className='pt-0.5 font-mono text-xs tracking-wide text-muted-foreground'>STACK</dt>
                      <dd>
                        <div className='flex flex-wrap gap-1.5'>
                          {topStack.map((s) => (
                            <span
                              key={s}
                              className='rounded border border-border px-2 py-0.5 font-mono text-[11px] text-muted-foreground'
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </dd>
                    </>
                  )}
                  {locationLine && (
                    <>
                      <dt className='font-mono text-xs tracking-wide text-muted-foreground'>LOCATION</dt>
                      <dd className='text-sm text-foreground'>{locationLine}</dd>
                    </>
                  )}
                </dl>
              )}

              {candidateSummary && (
                <div className='mt-6 max-w-[65ch]'>
                  <SummaryMarkdown text={candidateSummary} />
                </div>
              )}
            </div>
          </header>
        </div>
      </div>

      {/* Pinned input */}
      <div className='shrink-0 bg-background'>
        <div className='mx-auto max-w-[680px] px-6 py-4'>
          <SmartPromptInput
            onSubmit={handleSubmit}
            placeholder="Paste the job description here. I'll show you exactly how I fit — and why."
            submitOn='cmdenter'
            hint='Cmd+Enter to submit'
            accept={ACCEPTED_DOC_TYPES}
            pasteToFileChars={1000}
          />
        </div>
      </div>
    </div>
  )
}
