'use client'

import { useEffect, useState } from 'react'
import { AvatarFrame } from '@/components/avatar-frame'

const STEPS = [
  { label: 'Forensic Analysis of Job Requirements...', duration: 1500 },
  { label: 'Cross-referencing Architecture & Signals...', duration: 2000 },
  { label: 'Generating Decision Artifact...', duration: 1500 }
]

// STEPS above only covers the first 5s of animation. The real audit call
// can take ~70-90s (server's 90s LLM timeout, up to 2 attempts), so these
// rotate after STEPS completes purely to keep the user informed the
// process is still alive — cosmetic only, never coupled to the real
// response, which can arrive at any point.
const EXTENDED_LABELS = [
  'Weighing Evidence Against Requirements...',
  'Verifying Signal Confidence...',
  'Still Working — Complex Audits Can Take Up to 90 Seconds...'
]
const EXTENDED_LABEL_INTERVAL_MS = 6000

export function LoadingState({
  candidateName = 'Dani Estevez Martin',
  candidateTitle = 'Senior Frontend Architect · AI Systems · Web3',
  avatarUrl
}: {
  candidateName?: string
  candidateTitle?: string
  avatarUrl?: string
}) {
  const [activeStep, setActiveStep] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [extendedLabelIndex, setExtendedLabelIndex] = useState(0)

  useEffect(() => {
    let elapsed = 0
    const timers: ReturnType<typeof setTimeout>[] = []

    for (let i = 1; i < STEPS.length; i++) {
      elapsed += STEPS[i - 1]!.duration
      timers.push(setTimeout(() => setActiveStep(i), elapsed))
    }

    return () => timers.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(
      () => setExtendedLabelIndex((i) => (i + 1) % EXTENDED_LABELS.length),
      EXTENDED_LABEL_INTERVAL_MS
    )
    return () => clearInterval(interval)
  }, [])

  const showExtendedLabel = elapsedSeconds >= 5

  return (
    <div className='mx-auto max-w-[680px] px-6 py-12'>
      <header className='mb-8 border-b border-border pb-6'>
        <p className='font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground'>Forensic Match Audit</p>
        <div className='mt-2 flex items-center gap-4'>
          {avatarUrl && (
            <AvatarFrame src={avatarUrl} alt={candidateName} size={80} variant='dossier' pennant pennantAnimated />
          )}
          <div>
            <h1 className='font-display text-2xl tracking-tight'>{candidateName}</h1>
            <p className='mt-0.5 font-mono text-xs text-muted-foreground'>{candidateTitle}</p>
          </div>
        </div>
      </header>

      <div className='space-y-4'>
        {STEPS.map((step, i) => (
          <div key={step.label} className='flex items-center gap-3'>
            <span
              className={`font-mono text-xs ${
                i < activeStep ? 'text-foreground' : i === activeStep ? 'text-foreground/60' : 'text-foreground/20'
              }`}
            >
              {i < activeStep ? '✓' : '—'}
            </span>
            <p
              className={`font-mono text-xs transition-opacity duration-500 ${
                i < activeStep ? 'text-muted-foreground' : i === activeStep ? 'text-foreground' : 'text-foreground/20'
              }`}
            >
              {step.label}
            </p>
          </div>
        ))}

        {showExtendedLabel && (
          <div className='flex items-center gap-3'>
            <span className='font-mono text-xs text-foreground/60'>—</span>
            <p className='font-mono text-xs text-foreground transition-opacity duration-500'>
              {EXTENDED_LABELS[extendedLabelIndex]}
            </p>
          </div>
        )}
      </div>

      <p className='mt-6 font-mono text-xs text-muted-foreground'>{elapsedSeconds}s elapsed</p>
    </div>
  )
}
