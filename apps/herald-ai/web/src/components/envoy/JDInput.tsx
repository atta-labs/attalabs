'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { SmartPromptInput } from '@atta/ui/smart-prompt-input'
import { AvatarFrame } from '@/components/avatar-frame'

export function JDInput({
  onSubmit,
  candidateName = 'Dani Estevez Martin',
  candidateTitle = 'Senior Frontend Architect · AI Systems · Web3',
  candidateAvatarUrl,
  candidateSummary,
  candidateLocation,
  candidateAvailability,
  candidateCvUrl
}: {
  onSubmit: (jd: string) => void
  candidateName?: string
  candidateTitle?: string
  candidateAvatarUrl?: string
  candidateSummary?: string
  candidateLocation?: string
  candidateAvailability?: string
  candidateCvUrl?: string
}) {
  return (
    <div className='mx-auto max-w-[680px] px-6 py-12'>
      <header className='mb-8 border-b border-border pb-10'>
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
              {(candidateLocation || candidateAvailability) && (
                <p className='mt-1 font-mono text-[10px] text-muted-foreground/70'>
                  {[candidateLocation, candidateAvailability].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>
          {candidateCvUrl && (
            <div className='flex shrink-0 flex-col items-end gap-1.5 pt-1'>
              <a
                href={candidateCvUrl}
                download
                className='font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground'
              >
                ↓ Download CV
              </a>
              <a
                href={candidateCvUrl}
                target='_blank'
                rel='noreferrer'
                className='font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground'
              >
                ↗ Open CV
              </a>
            </div>
          )}
        </div>
        {candidateSummary && (
          <div className='prose prose-sm mt-6 max-w-none rounded-lg border border-border bg-card px-5 py-4 font-sans text-sm leading-relaxed text-foreground/80 [&_a]:text-foreground [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-xs [&_h1]:font-serif [&_h1]:text-base [&_h2]:font-serif [&_h2]:text-sm [&_h3]:font-serif [&_h3]:text-sm [&_li]:text-foreground/80 [&_ol]:pl-4 [&_p]:text-foreground/80 [&_strong]:text-foreground [&_ul]:pl-4'>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{candidateSummary}</ReactMarkdown>
          </div>
        )}
      </header>

      <SmartPromptInput
        onSubmit={(text) => onSubmit(text)}
        placeholder="Paste the job description here. I'll show you exactly how I fit — and why."
        submitOn='button'
        ctaLabel='Generate Audit'
        hint='Shift+Enter for a new line'
      />
    </div>
  )
}
