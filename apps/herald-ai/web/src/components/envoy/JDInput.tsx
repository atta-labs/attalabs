'use client'

import { useState } from 'react'
import { Button, Textarea } from '@atta/ui'
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
      <header className='mb-8 border-b border-border pb-10'>
        <p className='font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>
          Forensic Match Audit
        </p>
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
              <h1 className='mt-1 font-display text-4xl tracking-tight text-foreground'>
                {candidateName}
              </h1>
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
          <div className='mt-6 rounded-lg border border-border bg-card px-5 py-4'>
            <p className='line-clamp-3 font-sans text-sm leading-relaxed text-foreground/80'>
              {candidateSummary}
            </p>
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
