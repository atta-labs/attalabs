'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { MatchReport } from '@/lib/types'
import { JDInput } from './JDInput'
import { LoadingState } from './LoadingState'
import { ReportView } from './ReportView'

type FlowState = 'input' | 'loading' | 'result' | 'error'

function ResultActions({ onNewAudit }: { onNewAudit: () => void }) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href)
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input')
      input.value = window.location.href
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
    setCopied(true)
    timerRef.current = setTimeout(() => setCopied(false), 1500)
  }

  const btnClass =
    'border border-foreground/20 bg-foreground/5 px-6 py-2 font-mono text-xs uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-foreground/10'

  return (
    <div className='mx-auto flex max-w-[680px] gap-3 px-6 pb-8 no-print'>
      <button type='button' onClick={handleCopy} className={btnClass}>
        {copied ? 'Copied!' : 'Copy Link'}
      </button>
      <button type='button' onClick={() => window.print()} className={btnClass}>
        Export PDF
      </button>
      <button type='button' onClick={onNewAudit} className={btnClass}>
        New Audit
      </button>
    </div>
  )
}

const ANIMATION_DURATION = 5000 // 5s deterministic loader
const API_TIMEOUT = 25000

export function EnvoyFlow() {
  const [state, setState] = useState<FlowState>('input')
  const [report, setReport] = useState<MatchReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const resultBuffer = useRef<MatchReport | null>(null)
  const animationDone = useRef(false)

  const tryReveal = useCallback(() => {
    if (resultBuffer.current && animationDone.current) {
      setReport(resultBuffer.current)
      setState('result')
    }
  }, [])

  async function handleSubmit(jd: string) {
    setState('loading')
    setError(null)
    resultBuffer.current = null
    animationDone.current = false

    // Start animation timer — minimum 5s before showing result
    const animationTimer = setTimeout(() => {
      animationDone.current = true
      tryReveal()
    }, ANIMATION_DURATION)

    // Start API call in parallel
    const timeoutController = new AbortController()
    const apiTimer = setTimeout(() => timeoutController.abort(), API_TIMEOUT)

    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_description: jd }),
        signal: timeoutController.signal
      })

      clearTimeout(apiTimer)

      if (!res.ok) throw new Error(`API error: ${res.status}`)

      const data: MatchReport = await res.json()
      resultBuffer.current = data
      tryReveal()
    } catch (err) {
      clearTimeout(animationTimer)
      clearTimeout(apiTimer)

      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('The audit took longer than expected. Please try again.')
      } else {
        setError('Something went wrong. Please try again.')
      }
      setState('error')
    }
  }

  function handleRetry() {
    setState('input')
    setReport(null)
    setError(null)
  }

  if (state === 'input') {
    return <JDInput onSubmit={handleSubmit} />
  }

  if (state === 'loading') {
    return <LoadingState />
  }

  if (state === 'error') {
    return (
      <div className='mx-auto max-w-[680px] px-6 py-12'>
        <header className='mb-8 border-b border-border pb-6'>
          <p className='font-mono text-[10px] uppercase tracking-[0.25em] text-muted'>Forensic Match Audit</p>
          <h1 className='mt-2 font-display text-2xl tracking-tight'>Dani Estevez Martin</h1>
          <p className='mt-0.5 font-mono text-xs text-muted'>Senior Frontend Architect · AI Systems · Web3</p>
        </header>

        <p className='text-sm text-muted'>{error}</p>

        <button
          type='button'
          onClick={handleRetry}
          className='mt-4 border border-foreground/20 bg-foreground/5 px-6 py-2 font-mono text-xs uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-foreground/10'
        >
          Try Again
        </button>
      </div>
    )
  }

  if (state === 'result' && report) {
    return (
      <div>
        <ReportView report={report} />
        <ResultActions onNewAudit={handleRetry} />
      </div>
    )
  }

  return null
}
