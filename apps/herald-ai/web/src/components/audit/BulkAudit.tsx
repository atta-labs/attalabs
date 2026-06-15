'use client'

import { Loader2, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, CardContent, Textarea } from '@atta/ui/components'
import { ReportView } from '@/components/envoy/ReportView'
import type { MatchReport } from '@/lib/types'

const MAX_JDS = 5
const MAX_CANDIDATES = 10

type CellStatus =
  | { status: 'loading' }
  | { status: 'loaded'; report: MatchReport }
  | { status: 'error'; message: string }

type Cells = Record<string, CellStatus>

function cellKey(cvIdx: number, jdIdx: number): string {
  return `${cvIdx}-${jdIdx}`
}

function jdLabel(jd: string, index: number): string {
  const first = jd.trim().replace(/\s+/g, ' ').slice(0, 60)
  return first.length > 0 ? `JD ${index + 1} — ${first}${first.length === 60 ? '…' : ''}` : `JD ${index + 1}`
}

interface AuditBatchResult {
  username: string
  report: MatchReport | null
  error?: string
}

async function runCell(jd: string, username: string): Promise<CellStatus> {
  try {
    const res = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jd, candidates: [username] })
    })
    const data = (await res.json()) as { results?: AuditBatchResult[]; error?: string }

    if (!res.ok) {
      return { status: 'error', message: data.error ?? 'Audit failed.' }
    }
    const first = data.results?.[0]
    if (!first) return { status: 'error', message: 'No result returned.' }
    if (!first.report) return { status: 'error', message: first.error ?? 'Audit failed.' }
    return { status: 'loaded', report: first.report }
  } catch {
    return { status: 'error', message: 'Network error.' }
  }
}

export function BulkAudit({ hasKey }: { hasKey: boolean }) {
  const [jds, setJds] = useState<string[]>([''])
  const [candidatesRaw, setCandidatesRaw] = useState('')
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle')
  const [cells, setCells] = useState<Cells>({})
  const [submittedJds, setSubmittedJds] = useState<string[]>([])
  const [submittedCvs, setSubmittedCvs] = useState<string[]>([])

  const labelClass = 'mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'

  function updateJd(index: number, value: string) {
    setJds((prev) => prev.map((j, i) => (i === index ? value : j)))
  }

  function addJd() {
    setJds((prev) => (prev.length < MAX_JDS ? [...prev, ''] : prev))
  }

  function removeJd(index: number) {
    setJds((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))
  }

  function parseCandidates(): string[] {
    return candidatesRaw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, MAX_CANDIDATES)
  }

  const validJds = jds.map((j) => j.trim()).filter((j) => j.length >= 20)
  const parsedCandidates = parseCandidates()
  const canRun = validJds.length > 0 && parsedCandidates.length > 0

  async function handleRun() {
    if (!canRun) return

    const cvs = parsedCandidates
    const jdList = validJds

    const initial: Cells = {}
    for (let cvIdx = 0; cvIdx < cvs.length; cvIdx++) {
      for (let jdIdx = 0; jdIdx < jdList.length; jdIdx++) {
        initial[cellKey(cvIdx, jdIdx)] = { status: 'loading' }
      }
    }

    setSubmittedCvs(cvs)
    setSubmittedJds(jdList)
    setCells(initial)
    setState('running')

    const tasks: Promise<void>[] = []
    for (let cvIdx = 0; cvIdx < cvs.length; cvIdx++) {
      for (let jdIdx = 0; jdIdx < jdList.length; jdIdx++) {
        const key = cellKey(cvIdx, jdIdx)
        const username = cvs[cvIdx] as string
        const jd = jdList[jdIdx] as string
        tasks.push(
          runCell(jd, username).then((result) => {
            setCells((prev) => ({ ...prev, [key]: result }))
          })
        )
      }
    }

    await Promise.all(tasks)
    setState('done')
  }

  function handleReset() {
    setState('idle')
    setCells({})
    setSubmittedJds([])
    setSubmittedCvs([])
  }

  if (!hasKey) {
    return (
      <div className='mx-auto max-w-[680px] px-6 py-12'>
        <header className='mb-8'>
          <p className='font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>Audit</p>
          <h1 className='mt-2 font-serif text-3xl tracking-tight text-foreground'>Bulk Audit</h1>
        </header>
        <Card className='bg-card/50'>
          <CardContent className='px-6 py-8'>
            <p className='text-sm text-muted-foreground'>
              Bulk audits run on your Anthropic API key. Add your key in Settings to get started.
            </p>
            <a
              href='/settings?tab=api-keys'
              className='mt-4 inline-block font-mono text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground'
            >
              Settings → API Keys
            </a>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state === 'running' || state === 'done') {
    const cvCount = submittedCvs.length
    const jdCount = submittedJds.length

    return (
      <div className='px-6 py-8'>
        <div className='mx-auto mb-6 flex max-w-[1280px] items-center justify-between'>
          <p className='font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'>
            {cvCount} × {jdCount} matrix · {cvCount * jdCount} audit{cvCount * jdCount !== 1 ? 's' : ''}
          </p>
          <Button
            onClick={handleReset}
            variant='outline'
            className='font-mono text-[10px] uppercase tracking-[0.2em]'
            disabled={state === 'running'}
          >
            New Matrix
          </Button>
        </div>

        <div className='overflow-x-auto pb-4'>
          <div className='grid gap-4' style={{ gridTemplateColumns: `repeat(${jdCount}, minmax(620px, 1fr))` }}>
            {submittedJds.map((jd, jdIdx) => (
              <div key={`header-${jdIdx}-${jd.slice(0, 24)}`} className='border-b border-border pb-3'>
                <p className='font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>
                  {jdLabel(jd, jdIdx)}
                </p>
              </div>
            ))}

            {submittedCvs.flatMap((username, cvIdx) =>
              submittedJds.map((_jd, jdIdx) => {
                const cell = cells[cellKey(cvIdx, jdIdx)]
                return (
                  <Card key={cellKey(cvIdx, jdIdx)} className='overflow-hidden'>
                    <CardContent className='p-0'>
                      <div className='border-b border-border bg-muted/30 px-4 py-2'>
                        <p className='font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>
                          @{username} <span className='ml-2 text-foreground/40'>·</span>{' '}
                          <span className='ml-2'>JD {jdIdx + 1}</span>
                        </p>
                      </div>
                      <CellBody cell={cell} username={username} />
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
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
          Match N Herald candidates against M job descriptions — one forensic report per pair.
        </p>
      </header>

      <div className='space-y-8'>
        <div className='space-y-4'>
          <div className='flex items-baseline justify-between'>
            <span className={labelClass}>Job Descriptions</span>
            <span className='font-mono text-[10px] text-muted-foreground'>
              {jds.length}/{MAX_JDS}
            </span>
          </div>

          {jds.map((jd, index) => (
            <div key={`jd-input-${index}`} className='space-y-1.5'>
              <div className='flex items-baseline justify-between'>
                <span className='font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'>
                  JD {index + 1}
                </span>
                {jds.length > 1 && (
                  <Button
                    onClick={() => removeJd(index)}
                    variant='ghost'
                    size='sm'
                    className='h-6 px-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground'
                  >
                    <X className='mr-1 h-3 w-3' />
                    Remove
                  </Button>
                )}
              </div>
              <Textarea
                value={jd}
                onChange={(e) => updateJd(index, e.target.value)}
                placeholder='Paste a job description (min. 20 characters)…'
                className='min-h-[160px] font-sans text-sm'
              />
            </div>
          ))}

          {jds.length < MAX_JDS && (
            <Button
              onClick={addJd}
              variant='outline'
              size='sm'
              className='font-mono text-[10px] uppercase tracking-[0.2em]'
            >
              <Plus className='mr-1 h-3 w-3' />
              Add Job Description
            </Button>
          )}
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
            className='min-h-[120px] font-mono text-sm'
          />
          <p className='mt-1 font-mono text-[10px] text-muted-foreground'>
            One username per line, max {MAX_CANDIDATES}
          </p>
        </div>

        <Button onClick={handleRun} disabled={!canRun} className='font-mono text-xs uppercase tracking-[0.2em]'>
          Run {parsedCandidates.length || 'N'} × {validJds.length || 'M'} Matrix
        </Button>
      </div>
    </div>
  )
}

function CellBody({ cell, username }: { cell: CellStatus | undefined; username: string }) {
  if (!cell || cell.status === 'loading') {
    return (
      <div className='flex h-[200px] flex-col items-center justify-center gap-3 px-6'>
        <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
        <p className='font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>Auditing @{username}…</p>
      </div>
    )
  }

  if (cell.status === 'error') {
    return (
      <div className='flex h-[200px] flex-col items-center justify-center gap-2 px-6'>
        <p className='font-mono text-[10px] uppercase tracking-[0.25em] text-destructive'>Failed</p>
        <p className='text-center text-[13px] text-muted-foreground'>{cell.message}</p>
      </div>
    )
  }

  return <ReportView report={cell.report} />
}
