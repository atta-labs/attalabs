'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useComponents } from '@/components/providers/LibraryProvider'
import type { MatchReport } from '@/lib/types'
import { JDInput } from './JDInput'
import { LoadingState } from './LoadingState'
import { ReportView } from './ReportView'

interface CandidateProfile {
  name: string
  title: string
  github?: string
  summary: string
  stack: string[]
  projects?: Array<{ title: string; description: string }>
  experience?: Array<{ company: string; role: string; period: string; highlights: string[] }>
  location?: string
  availability?: string
}

type FlowState = 'input' | 'loading' | 'result' | 'error'

function ResultActions({ onNewAudit }: { onNewAudit: () => void }) {
  const { Button } = useComponents()
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

  const fallbackClass =
    'border border-foreground/20 bg-foreground/5 px-6 py-2 font-mono text-xs uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-foreground/10'

  return (
    <div className='sticky bottom-0 mx-auto flex max-w-[680px] gap-3 border-t border-border/50 bg-background/80 px-6 py-4 backdrop-blur-sm no-print'>
      {Button ? (
        <>
          <Button onClick={handleCopy} variant='outline' className='font-mono text-xs uppercase tracking-[0.2em]'>
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
          <Button
            onClick={() => window.print()}
            variant='outline'
            className='font-mono text-xs uppercase tracking-[0.2em]'
          >
            Export PDF
          </Button>
          <Button onClick={onNewAudit} variant='outline' className='font-mono text-xs uppercase tracking-[0.2em]'>
            New Audit
          </Button>
        </>
      ) : (
        <>
          <button type='button' onClick={handleCopy} className={fallbackClass}>
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button type='button' onClick={() => window.print()} className={fallbackClass}>
            Export PDF
          </button>
          <button type='button' onClick={onNewAudit} className={fallbackClass}>
            New Audit
          </button>
        </>
      )}
    </div>
  )
}

const ANIMATION_DURATION = 5000
const API_TIMEOUT = 25000

export function EnvoyFlow({ profile }: { profile: CandidateProfile }) {
  const { Button } = useComponents()
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

    const animationTimer = setTimeout(() => {
      animationDone.current = true
      tryReveal()
    }, ANIMATION_DURATION)

    const timeoutController = new AbortController()
    const apiTimer = setTimeout(() => timeoutController.abort(), API_TIMEOUT)

    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_description: jd,
          _test_profile_override: {
            name: profile.name,
            title: profile.title,
            github: profile.github,
            summary: profile.summary,
            stack: profile.stack,
            projects: profile.projects ?? [],
            experience: profile.experience ?? [],
            github_signal: { patterns: [] }
          }
        }),
        signal: timeoutController.signal
      })

      clearTimeout(apiTimer)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? `API error: ${res.status}`)
      }

      const data: MatchReport = await res.json()
      resultBuffer.current = data
      tryReveal()
    } catch (err) {
      clearTimeout(animationTimer)
      clearTimeout(apiTimer)

      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('The audit took longer than expected. Please try again.')
      } else {
        const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
        setError(message)
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
    return <JDInput onSubmit={handleSubmit} candidateName={profile.name} candidateTitle={profile.title} />
  }

  if (state === 'loading') {
    return <LoadingState candidateName={profile.name} candidateTitle={profile.title} />
  }

  if (state === 'error') {
    return (
      <div className='mx-auto max-w-[680px] px-6 py-12'>
        <header className='mb-8 border-b border-border pb-6'>
          <p className='font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>
            Forensic Match Audit
          </p>
          <h1 className='mt-2 font-display text-2xl tracking-tight'>{profile.name}</h1>
          <p className='mt-0.5 font-mono text-xs text-muted-foreground'>{profile.title}</p>
        </header>

        <p className='text-sm text-muted-foreground'>{error}</p>

        {Button ? (
          <Button onClick={handleRetry} variant='outline' className='mt-4 font-mono text-xs uppercase tracking-[0.2em]'>
            Try Again
          </Button>
        ) : (
          <button
            type='button'
            onClick={handleRetry}
            className='mt-4 border border-foreground/20 bg-foreground/5 px-6 py-2 font-mono text-xs uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-foreground/10'
          >
            Try Again
          </button>
        )}
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
