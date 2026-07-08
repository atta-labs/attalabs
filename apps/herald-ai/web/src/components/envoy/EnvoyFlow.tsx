'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button as FallbackButton, useToastContext } from '@atta/ui/components'
import { useComponents } from '@atta/ui/lib/library-provider'
import type { MatchReport } from '@/lib/types'
import { JDInput } from './JDInput'
import { LoadingState } from './LoadingState'
import { auditFailureMessage, ReportView } from './ReportView'

interface CandidateProfile {
  name: string
  title: string
  github?: string
  linkedin?: string
  discord?: string
  summary: string
  stack: string[]
  projects?: Array<{ title: string; description: string }>
  experience?: Array<{ company: string; role: string; period: string; highlights: string[] }>
  location?: string
  availability?: string
  avatarUrl?: string
  cvUrl?: string
}

type FlowState = 'input' | 'loading' | 'result' | 'error'

function ResultActions({ onNewAudit }: { onNewAudit: () => void }) {
  const comps = useComponents()
  const Button = (comps.Button as typeof FallbackButton | undefined) ?? FallbackButton
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

  return (
    <div className='sticky bottom-0 mx-auto flex max-w-[680px] gap-3 border-t border-border/50 bg-background/80 px-6 py-4 backdrop-blur-sm no-print'>
      <Button onClick={handleCopy} variant='outline' className='text-xs uppercase tracking-[0.2em]'>
        {copied ? 'Copied!' : 'Copy Link'}
      </Button>
      <Button onClick={() => window.print()} variant='outline' className='text-xs uppercase tracking-[0.2em]'>
        Export PDF
      </Button>
      <Button onClick={onNewAudit} variant='outline' className='text-xs uppercase tracking-[0.2em]'>
        New Audit
      </Button>
    </div>
  )
}

const ANIMATION_DURATION = 5000
// Client-side fetch timeout. MUST stay strictly larger than the server's
// max wall time so the server always wins the race — otherwise the browser
// aborts before the server can return its real response (the failure mode
// Dani hit in dev on June 17 with API_TIMEOUT = 35 000 vs. server's 90 000-ms
// AUDIT_LLM_TIMEOUT_MS). The server short-circuits on `LLM timeout` (no retry
// after a timeout — see runSingleMatch in app/api/audit/route.ts), so worst-
// case server wall time is one 90 s LLM window + the 3 s GitHub-tool budget +
// a small overhead — well under 120 s. Server is the source of truth for the
// partial-report fallback; the client should never declare "took longer than
// expected" on its own.
const API_TIMEOUT = 120_000

export function EnvoyFlow({
  profile,
  username,
  previewMode = false,
  hasAnyKey = false,
  isOwner = false
}: {
  profile: CandidateProfile
  username: string
  previewMode?: boolean
  /** True when the profile owner has a key for ANY supported vendor.
   *  Replaces the old hasAnthropicKey gate — the audit will resolve which
   *  model + vendor to use at runtime. (Task 3b.) */
  hasAnyKey?: boolean
  isOwner?: boolean
}) {
  const comps = useComponents()
  const Button = (comps.Button as typeof FallbackButton | undefined) ?? FallbackButton
  const { errorToast } = useToastContext()
  const [state, setState] = useState<FlowState>('input')
  const [report, setReport] = useState<MatchReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [localProfile, setLocalProfile] = useState<CandidateProfile>(profile)
  const resultBuffer = useRef<MatchReport | null>(null)
  const animationDone = useRef(false)

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'PREVIEW_PROFILE' && event.data.profile) {
        setLocalProfile((prev) => ({ ...prev, ...(event.data.profile as Partial<CandidateProfile>) }))
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

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
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_description: jd, username }),
        signal: timeoutController.signal
      })

      clearTimeout(apiTimer)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const errMsg = typeof body?.error === 'string' ? body.error : `API error: ${res.status}`
        throw new Error(errMsg)
      }

      const data: MatchReport = await res.json()
      if (data.auditFailed) {
        errorToast('Audit failed', auditFailureMessage(data.auditFailed))
      }
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
    return (
      <JDInput
        onSubmit={handleSubmit}
        candidateName={localProfile.name}
        candidateTitle={localProfile.title}
        candidateAvatarUrl={localProfile.avatarUrl}
        candidateSummary={localProfile.summary}
        candidateStack={localProfile.stack}
        candidateLocation={localProfile.location}
        candidateAvailability={localProfile.availability}
        candidateCvUrl={localProfile.cvUrl}
        candidateGithub={localProfile.github}
        candidateLinkedin={localProfile.linkedin}
        candidateDiscord={localProfile.discord}
        auditAvailable={hasAnyKey}
        isOwner={isOwner}
        ownerSettingsHref={`/${username}/settings?tab=api-keys`}
        preview={previewMode}
      />
    )
  }

  if (state === 'loading') {
    return <LoadingState candidateName={localProfile.name} candidateTitle={localProfile.title} />
  }

  if (state === 'error') {
    return (
      <div className='mx-auto max-w-[680px] px-6 py-12'>
        <header className='mb-8 border-b border-border pb-6'>
          <p className='text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>Forensic Match Audit</p>
          <h1 className='mt-2 font-display text-2xl tracking-tight'>{localProfile.name}</h1>
          <p className='mt-0.5 text-xs text-muted-foreground'>{localProfile.title}</p>
        </header>

        <p className='text-sm text-muted-foreground'>{error}</p>

        <Button onClick={handleRetry} variant='outline' className='mt-4 text-xs uppercase tracking-[0.2em]'>
          Try Again
        </Button>
      </div>
    )
  }

  if (state === 'result' && report) {
    return (
      <div>
        <ReportView report={report} />
        {!report.auditFailed && <ResultActions onNewAudit={handleRetry} />}
      </div>
    )
  }

  return null
}
