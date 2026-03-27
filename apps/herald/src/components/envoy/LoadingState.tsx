'use client'

import { useEffect, useState } from 'react'

const STEPS = [
  { label: 'Forensic Analysis of Job Requirements...', duration: 1500 },
  { label: 'Cross-referencing Architecture & Signals...', duration: 2000 },
  { label: 'Generating Decision Artifact...', duration: 1500 }
]

export function LoadingState() {
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    let elapsed = 0
    const timers: ReturnType<typeof setTimeout>[] = []

    for (let i = 1; i < STEPS.length; i++) {
      elapsed += STEPS[i - 1]!.duration
      timers.push(setTimeout(() => setActiveStep(i), elapsed))
    }

    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className='mx-auto max-w-[680px] px-6 py-12'>
      <header className='mb-8 border-b border-border pb-6'>
        <p className='font-mono text-[10px] uppercase tracking-[0.25em] text-muted'>Forensic Match Audit</p>
        <h1 className='mt-2 font-display text-2xl tracking-tight'>Dani Estevez Martin</h1>
        <p className='mt-0.5 font-mono text-xs text-muted'>Senior Frontend Architect · AI Systems · Web3</p>
      </header>

      <div className='space-y-4'>
        {STEPS.map((step, i) => (
          <div key={step.label} className='flex items-center gap-3'>
            <span
              className={`font-mono text-[10px] ${
                i < activeStep ? 'text-foreground' : i === activeStep ? 'text-foreground/60' : 'text-foreground/20'
              }`}
            >
              {i < activeStep ? '✓' : '—'}
            </span>
            <p
              className={`font-mono text-xs transition-opacity duration-500 ${
                i < activeStep ? 'text-muted' : i === activeStep ? 'text-foreground' : 'text-foreground/20'
              }`}
            >
              {step.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
