'use client'

import type { FileUIPart } from 'ai'
import { Download, ExternalLink } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import { SmartPromptInput } from '@atta/ui/smart-prompt-input'
import { AvatarFrame } from '@/components/avatar-frame'

const ACCEPTED_DOC_TYPES = '.pdf,.md,.txt,application/pdf,text/markdown,text/plain'

function SummaryMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      components={{
        h1: ({ children }) => (
          <h1 className='mt-6 mb-1 font-mono text-xs uppercase tracking-widest text-muted-foreground first:mt-0'>
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className='mt-6 mb-1 font-mono text-xs uppercase tracking-widest text-muted-foreground first:mt-0'>
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className='mt-4 mb-1 font-mono text-xs uppercase tracking-widest text-muted-foreground first:mt-0'>
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className='mt-4 font-sans text-[15px] leading-relaxed text-foreground first:mt-0'>{children}</p>
        ),
        ul: ({ children }) => (
          <ul className='mt-3 list-disc pl-4 font-sans text-[15px] text-foreground marker:text-muted-foreground'>
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className='mt-3 list-decimal pl-4 font-sans text-[15px] text-foreground marker:text-muted-foreground'>
            {children}
          </ol>
        ),
        li: ({ children }) => <li className='leading-relaxed'>{children}</li>,
        code: ({ children }) => (
          <code className='rounded bg-muted px-1 font-mono text-xs text-foreground'>{children}</code>
        ),
        strong: ({ children }) => <strong className='text-base font-medium text-foreground'>{children}</strong>
      }}
    >
      {text}
    </ReactMarkdown>
  )
}

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
    <div className='mx-auto max-w-[680px] px-6 py-12'>
      <header className='mb-8 border-b border-border pb-8'>
        <p className='font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>Forensic Match Audit</p>

        <div className='mt-4 flex items-start justify-between gap-4'>
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
            <div className='flex shrink-0 flex-col items-center gap-2 rounded-lg border border-border px-4 py-3'>
              <span className='font-mono text-xs uppercase tracking-widest text-muted-foreground'>CV</span>
              <div className='flex items-center gap-2'>
                <a
                  href={candidateCvUrl}
                  download
                  aria-label='Download CV'
                  title='Download CV'
                  className='flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary'
                >
                  <Download className='h-4 w-4' />
                </a>
                <a
                  href={candidateCvUrl}
                  target='_blank'
                  rel='noreferrer'
                  aria-label='Open CV'
                  title='Open CV'
                  className='flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary'
                >
                  <ExternalLink className='h-4 w-4' />
                </a>
              </div>
            </div>
          )}
        </div>

        <div className='mt-6'>
          {candidateSummary && (
            <div className='max-w-[65ch] space-y-3'>
              <SummaryMarkdown text={candidateSummary} />
            </div>
          )}

          {(candidateTitle || topStack.length > 0 || locationLine) && (
            <dl className='mt-3 grid grid-cols-[96px_1fr] gap-y-1.5'>
              {candidateTitle && (
                <>
                  <dt className='self-baseline font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'>
                    ROLE
                  </dt>
                  <dd className='font-mono text-[10px] text-foreground'>{candidateTitle}</dd>
                </>
              )}
              {topStack.length > 0 && (
                <>
                  <dt className='self-start pt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'>
                    STACK
                  </dt>
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
                  <dt className='self-baseline font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'>
                    LOCATION
                  </dt>
                  <dd className='font-mono text-[10px] text-foreground'>{locationLine}</dd>
                </>
              )}
            </dl>
          )}
        </div>
      </header>

      <SmartPromptInput
        onSubmit={handleSubmit}
        placeholder="Paste the job description here. I'll show you exactly how I fit — and why."
        submitOn='cmdenter'
        ctaLabel='GENERATE AUDIT'
        hint='Cmd+Enter to submit'
        accept={ACCEPTED_DOC_TYPES}
        pasteToFileChars={1000}
      />
    </div>
  )
}
