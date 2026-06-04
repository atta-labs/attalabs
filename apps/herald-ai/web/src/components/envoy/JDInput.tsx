'use client'

import type { FileUIPart } from 'ai'
import { Download, ExternalLink } from 'lucide-react'
import { SmartPromptInput } from '@atta/ui/smart-prompt-input'
import { AvatarFrame } from '@/components/avatar-frame'
import { SummaryMarkdown } from '@/components/summary-markdown'

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
  const topStack = candidateStack?.slice(0, 5) ?? []
  const locationLine = [candidateLocation, candidateAvailability].filter(Boolean).join(' · ')

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
      <div className='min-h-0 flex-1 overflow-y-auto'>
        <div className='mx-auto max-w-[680px] px-6 py-12'>
          <header className='mb-8 border-b border-border pb-8'>
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
                  <p className='mt-0.5 font-mono text-xs text-muted-foreground'>{candidateTitle}</p>
                </div>
              </div>

              {candidateCvUrl && (
                <div className='flex shrink-0 flex-col gap-2'>
                  <div className='flex flex-1 items-center justify-center rounded border border-border bg-card px-4'>
                    <span className='font-mono text-[10px] uppercase tracking-widest text-muted-foreground'>CV</span>
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

            <div className='mt-6'>
              {(candidateTitle || topStack.length > 0 || locationLine) && (
                <dl className='grid grid-cols-[80px_1fr] gap-y-2'>
                  {candidateTitle && (
                    <>
                      <dt className='self-baseline font-mono text-xs tracking-wide text-muted-foreground'>ROLE</dt>
                      <dd className='text-sm text-foreground'>{candidateTitle}</dd>
                    </>
                  )}
                  {topStack.length > 0 && (
                    <>
                      <dt className='self-start pt-0.5 font-mono text-xs tracking-wide text-muted-foreground'>STACK</dt>
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
                      <dt className='self-baseline font-mono text-xs tracking-wide text-muted-foreground'>LOCATION</dt>
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
