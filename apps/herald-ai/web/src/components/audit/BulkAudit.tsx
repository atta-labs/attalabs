'use client'

import { useState } from 'react'
import { Button, Textarea } from '@atta/ui/components'
import { ReportView } from '@/components/envoy/ReportView'
import type { MatchReport } from '@/lib/types'

interface BatchResult {
  username: string
  report: MatchReport | null
  error?: string
}

export function BulkAudit({ hasKey }: { hasKey: boolean }) {
  const [jd, setJd] = useState('')
  const [candidatesRaw, setCandidatesRaw] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'result' | 'error'>('idle')
  const [results, setResults] = useState<BatchResult[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const labelClass = 'mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'

  async function handleSubmit() {
    const candidates = candidatesRaw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)

    if (!jd.trim() || candidates.length === 0) return

    setState('loading')
    setErrorMsg(null)

    try {
      const res = await fetch('/api/recruiter/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jd, candidates })
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Batch audit failed.')
        setState('error')
        return
      }

      setResults(data.results as BatchResult[])
      setState('result')
    } catch {
      setErrorMsg('Network error. Please try again.')
      setState('error')
    }
  }

  function handleReset() {
    setState('idle')
    setResults([])
    setErrorMsg(null)
  }

  if (!hasKey) {
    return (
      <div className='mx-auto max-w-[680px] px-6 py-12'>
        <header className='mb-8'>
          <p className='font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>Audit</p>
          <h1 className='mt-2 font-serif text-3xl tracking-tight text-foreground'>Bulk Audit</h1>
        </header>
        <div className='rounded border border-border bg-card/50 px-6 py-8'>
          <p className='text-sm text-muted-foreground'>
            Bulk audits run on your Anthropic API key. Add your key in Settings to get started.
          </p>
          <a
            href='/candidate/settings'
            className='mt-4 inline-block font-mono text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground'
          >
            Settings → API Keys
          </a>
        </div>
      </div>
    )
  }

  if (state === 'loading') {
    return (
      <div className='mx-auto max-w-[680px] px-6 py-12'>
        <p className='font-mono text-xs text-muted-foreground'>Running audits…</p>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className='mx-auto max-w-[680px] px-6 py-12'>
        <p className='text-sm text-muted-foreground'>{errorMsg}</p>
        <Button onClick={handleReset} variant='outline' className='mt-4 font-mono text-xs uppercase tracking-[0.2em]'>
          Try Again
        </Button>
      </div>
    )
  }

  if (state === 'result') {
    return (
      <div className='mx-auto max-w-[680px] px-6 py-8'>
        <div className='mb-6 flex items-center justify-between'>
          <p className='font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'>
            {results.length} Audit{results.length !== 1 ? 's' : ''}
          </p>
          <Button onClick={handleReset} variant='outline' className='font-mono text-[10px] uppercase tracking-[0.2em]'>
            New Batch
          </Button>
        </div>
        <div className='space-y-12'>
          {results.map(({ username, report, error }) => (
            <div key={username}>
              {error && !report && (
                <p className='font-mono text-xs text-muted-foreground'>
                  {username}: {error}
                </p>
              )}
              {report && <ReportView report={report} />}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className='mx-auto max-w-[680px] px-6 py-12'>
      <header className='mb-8'>
        <p className='font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>Audit</p>
        <h1 className='mt-2 font-serif text-3xl tracking-tight text-foreground'>Bulk Audit</h1>
        <p className='mt-2 text-sm text-muted-foreground'>
          Match multiple Herald candidates against a single job description.
        </p>
      </header>

      <div className='space-y-6'>
        <div>
          <label className={labelClass} htmlFor='jd'>
            Job Description
          </label>
          <Textarea
            id='jd'
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder='Paste the full job description here…'
            className='min-h-[200px] font-sans text-sm'
          />
        </div>

        <div>
          <label className={labelClass} htmlFor='candidates'>
            Herald Usernames
          </label>
          <Textarea
            id='candidates'
            value={candidatesRaw}
            onChange={(e) => setCandidatesRaw(e.target.value)}
            placeholder={'dani\njane\nmarcus'}
            className='min-h-[100px] font-mono text-sm'
          />
          <p className='mt-1 font-mono text-[10px] text-muted-foreground'>One username per line, max 10</p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!jd.trim() || !candidatesRaw.trim()}
          className='font-mono text-xs uppercase tracking-[0.2em]'
        >
          Run Bulk Audit
        </Button>
      </div>
    </div>
  )
}
