'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button, Textarea } from '@atta/ui'

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
  const [value, setValue] = useState('')
  const [pending, setPending] = useState(false)

  const canSubmit = value.trim().length >= 20 && !pending

  function handleSubmit() {
    if (!canSubmit) return
    setPending(true)
    onSubmit(value.trim())
  }

  return (
    <div className='mx-auto max-w-[680px] px-6 py-12'>
      <header className='mb-8 border-b border-border pb-6'>
        <p className='font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>Forensic Match Audit</p>
        <div className='mt-2 flex items-start justify-between gap-4'>
          <div className='flex items-center gap-4'>
            {candidateAvatarUrl && (
              // biome-ignore lint/performance/noImgElement: Blob URL, not optimisable via next/image
              <img src={candidateAvatarUrl} alt='' className='h-16 w-16 shrink-0 rounded-full object-cover' />
            )}
            <div>
              <h1 className='font-display text-2xl tracking-tight'>{candidateName}</h1>
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
          <div className='prose prose-sm mt-4 max-w-none font-sans text-sm leading-relaxed text-foreground/80 [&_h1]:font-serif [&_h2]:font-serif [&_h3]:font-serif [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_p]:text-foreground/80 [&_strong]:text-foreground [&_a]:text-foreground [&_a]:underline [&_ul]:pl-4 [&_ol]:pl-4 [&_li]:text-foreground/80 [&_code]:font-mono [&_code]:text-xs [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground'>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{candidateSummary}</ReactMarkdown>
          </div>
        )}
      </header>

      <div>
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste the job description here. I'll show you exactly how I fit — and why."
          rows={10}
          disabled={pending}
          className='w-full resize-none bg-card font-sans text-sm leading-relaxed'
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.metaKey) handleSubmit()
          }}
        />

        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className='mt-3 w-full py-3 font-mono text-xs uppercase tracking-[0.2em]'
        >
          {pending ? 'Generating...' : 'Generate Audit'}
        </Button>

        <p className='mt-2 font-mono text-[10px] text-muted-foreground'>Cmd+Enter to submit</p>
      </div>
    </div>
  )
}
