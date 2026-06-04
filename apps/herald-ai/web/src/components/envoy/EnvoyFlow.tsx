'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, ExternalLink } from 'lucide-react'
import { useComponents } from '@atta/ui/lib/library-provider'
import type { MatchReport } from '@/lib/types'
import { AvatarFrame } from '@/components/avatar-frame'
import { SummaryMarkdown } from '@/components/summary-markdown'
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
  avatarUrl?: string
  cvUrl?: string
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
    'border border-foreground/20 bg-foreground/5 px-6 py-2 text-xs uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-foreground/10'

  return (
    <div className='sticky bottom-0 mx-auto flex max-w-[680px] gap-3 border-t border-border/50 bg-background/80 px-6 py-4 backdrop-blur-sm no-print'>
      {Button ? (
        <>
          <Button onClick={handleCopy} variant='outline' className='text-xs uppercase tracking-[0.2em]'>
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
          <Button onClick={() => window.print()} variant='outline' className='text-xs uppercase tracking-[0.2em]'>
            Export PDF
          </Button>
          <Button onClick={onNewAudit} variant='outline' className='text-xs uppercase tracking-[0.2em]'>
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
const API_TIMEOUT = 35000

export function EnvoyFlow({
  profile,
  username,
  previewMode = false
}: {
  profile: CandidateProfile
  username: string
  previewMode?: boolean
}) {
  const { Button } = useComponents()
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
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_description: jd, username }),
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
    if (previewMode) {
      const previewTopStack = localProfile.stack ?? []
      const previewLocation = [localProfile.location, localProfile.availability].filter(Boolean).join(' · ')
      const previewCvRawFile = localProfile.cvUrl ? (localProfile.cvUrl.split('/').pop() ?? '') : null
      const previewCvExt = previewCvRawFile ? (previewCvRawFile.split('.').pop() ?? 'pdf') : 'pdf'
      const previewCvFilename = localProfile.cvUrl
        ? `${(localProfile.name ?? 'CV').replace(/\s+/g, '_')}_CV.${previewCvExt}`
        : null

      return (
        <div className='h-full overflow-y-auto'>
          <div className='mx-auto max-w-[680px] px-6 pt-12 pb-4'>
            <header>
              <div className='flex items-start gap-5'>
                {localProfile.avatarUrl && (
                  <AvatarFrame
                    src={localProfile.avatarUrl}
                    alt={localProfile.name ?? ''}
                    variant='dossier'
                    pennant
                    pennantAnimated
                  />
                )}
                <div className='min-w-0'>
                  <h1 className='mt-1 font-display text-4xl tracking-tight text-foreground'>{localProfile.name}</h1>
                  <p className='mt-2 font-mono text-xl text-muted-foreground'>{localProfile.title}</p>
                </div>
              </div>
              <div className='mt-6'>
                {(previewTopStack.length > 0 || previewLocation || (localProfile.cvUrl && previewCvFilename)) && (
                  <dl className='grid grid-cols-[80px_1fr] items-baseline gap-y-2'>
                    {previewTopStack.length > 0 && (
                      <>
                        <dt className='pt-0.5 font-mono text-xs tracking-wide text-muted-foreground'>STACK</dt>
                        <dd>
                          <div className='flex flex-wrap gap-1.5'>
                            {previewTopStack.map((s) => (
                              <span
                                key={s}
                                className='rounded border border-border px-2 py-0.5 font-mono text-[11px] text-muted-foreground'
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </dd>
                      </>
                    )}
                    {previewLocation && (
                      <>
                        <dt className='font-mono text-xs tracking-wide text-muted-foreground'>LOCATION</dt>
                        <dd className='text-sm text-foreground'>{previewLocation}</dd>
                      </>
                    )}
                    {localProfile.cvUrl && previewCvFilename && (
                      <>
                        <dt className='font-mono text-xs tracking-wide text-muted-foreground'>CV</dt>
                        <dd className='flex items-center justify-between gap-2'>
                          <span className='min-w-0 truncate font-mono text-sm text-foreground'>
                            {previewCvFilename}
                          </span>
                          <div className='flex shrink-0 items-center gap-1'>
                            <a
                              href={localProfile.cvUrl}
                              download
                              aria-label='Download CV'
                              title='Download CV'
                              className='flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary'
                            >
                              <Download className='h-3.5 w-3.5' />
                            </a>
                            <a
                              href={localProfile.cvUrl}
                              target='_blank'
                              rel='noreferrer'
                              aria-label='Open CV'
                              title='Open CV'
                              className='flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary'
                            >
                              <ExternalLink className='h-3.5 w-3.5' />
                            </a>
                          </div>
                        </dd>
                      </>
                    )}
                  </dl>
                )}
                {localProfile.summary && (
                  <div className='mt-6 max-w-[65ch]'>
                    <SummaryMarkdown text={localProfile.summary} />
                  </div>
                )}
              </div>
            </header>
            <div className='mt-8 rounded border border-dashed border-border bg-card/50 px-6 py-8 text-center'>
              <p className='font-mono text-xs text-muted-foreground'>Recruiters will paste a job description here</p>
            </div>
          </div>
        </div>
      )
    }
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

        {Button ? (
          <Button onClick={handleRetry} variant='outline' className='mt-4 text-xs uppercase tracking-[0.2em]'>
            Try Again
          </Button>
        ) : (
          <button
            type='button'
            onClick={handleRetry}
            className='mt-4 border border-foreground/20 bg-foreground/5 px-6 py-2 text-xs uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-foreground/10'
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
