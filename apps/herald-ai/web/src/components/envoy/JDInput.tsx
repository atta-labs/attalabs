'use client'

import type { FileUIPart } from 'ai'
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
        h1: ({ children }) => <h1 className='font-sans text-lg font-semibold text-foreground'>{children}</h1>,
        h2: ({ children }) => <h2 className='font-sans text-base font-semibold text-foreground'>{children}</h2>,
        h3: ({ children }) => <h3 className='font-sans text-sm font-semibold text-foreground'>{children}</h3>,
        p: ({ children }) => <p className='font-sans text-sm leading-relaxed text-foreground'>{children}</p>,
        ul: ({ children }) => (
          <ul className='list-disc pl-4 font-sans text-sm text-foreground marker:text-muted-foreground'>{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className='list-decimal pl-4 font-sans text-sm text-foreground marker:text-muted-foreground'>
            {children}
          </ol>
        ),
        li: ({ children }) => <li className='leading-relaxed'>{children}</li>,
        code: ({ children }) => (
          <code className='rounded bg-muted px-1 font-mono text-xs text-foreground'>{children}</code>
        ),
        strong: ({ children }) => <strong className='font-semibold'>{children}</strong>
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
            <div className='flex shrink-0 flex-col items-end gap-1.5 pt-1'>
              <a
                href={candidateCvUrl}
                download
                className='font-mono text-[10px] text-muted-foreground transition-colors hover:text-primary'
              >
                ↓ Download CV
              </a>
              <a
                href={candidateCvUrl}
                target='_blank'
                rel='noreferrer'
                className='font-mono text-[10px] text-muted-foreground transition-colors hover:text-primary'
              >
                ↗ Open CV
              </a>
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
                  <dt className='self-baseline font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'>
                    STACK
                  </dt>
                  <dd className='font-mono text-[10px] text-foreground'>{topStack.join(' · ')}</dd>
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
