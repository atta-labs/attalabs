'use client'

import { useState } from 'react'

export function JDInput({
  onSubmit,
  candidateName = 'Dani Estevez Martin',
  candidateTitle = 'Senior Frontend Architect · AI Systems · Web3'
}: {
  onSubmit: (jd: string) => void
  candidateName?: string
  candidateTitle?: string
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
      {/* ── Candidate Context ── */}
      <header className='mb-8 border-b border-border pb-6'>
        <p className='font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>Forensic Match Audit</p>
        <h1 className='mt-2 font-display text-2xl tracking-tight'>{candidateName}</h1>
        <p className='mt-0.5 font-mono text-xs text-muted-foreground'>{candidateTitle}</p>
      </header>

      {/* ── Input ── */}
      <div>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder='Paste the job description here. I&#39;ll show you exactly how I fit — and why.'
          rows={10}
          disabled={pending}
          className='w-full resize-none border border-border bg-card px-4 py-3 font-sans text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none disabled:opacity-50'
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.metaKey) handleSubmit()
          }}
        />

        <button
          type='button'
          onClick={handleSubmit}
          disabled={!canSubmit}
          className='mt-3 w-full border border-foreground/20 bg-foreground/5 py-3 font-mono text-xs uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-foreground/10 disabled:cursor-not-allowed disabled:opacity-30'
        >
          {pending ? 'Generating...' : 'Generate Audit'}
        </button>

        <p className='mt-2 font-mono text-[10px] text-muted-foreground'>Cmd+Enter to submit</p>
      </div>
    </div>
  )
}
