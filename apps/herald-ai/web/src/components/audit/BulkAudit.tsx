'use client'

import { Loader2, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, CardContent } from '@atta/ui/components'

import { ReportView } from '@/components/envoy/ReportView'
import { resolveCvFileRequest, resolveCvJsonRequest, resolveJdRequest } from '@/lib/audit-input/client'
import type { ResolvedCv, ResolvedJd } from '@/lib/audit-input/types'
import type { MatchReport } from '@/lib/types'
import { CvInputControl, type CvInputDraft } from './CvInputControl'
import { JdInputControl } from './JdInputControl'

const MAX_JDS = 5
const MAX_CANDIDATES = 10

type CellStatus =
  | { status: 'loading' }
  | { status: 'loaded'; report: MatchReport }
  | { status: 'error'; message: string }

type JdSlot = {
  id: string
  input: { kind: 'text'; value: string } | { kind: 'url'; value: string }
}
type CvSlot = { id: string; input: CvInputDraft }

type Cells = Record<string, CellStatus>

function cellKey(cvIdx: number, jdIdx: number): string {
  return `${cvIdx}-${jdIdx}`
}

function newJdSlot(): JdSlot {
  return { id: cryptoRandomId(), input: { kind: 'text', value: '' } }
}

function newCvSlot(): CvSlot {
  return { id: cryptoRandomId(), input: { kind: 'profile', value: '' } }
}

function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Math.random().toString(36).slice(2, 10)}`
}

function jdIsFilled(slot: JdSlot): boolean {
  return slot.input.value.trim().length > 0
}

function cvIsFilled(slot: CvSlot): boolean {
  if (slot.input.kind === 'text' || slot.input.kind === 'profile') {
    return slot.input.value.trim().length > 0
  }
  return slot.input.file !== null
}

async function resolveJdSlot(slot: JdSlot): Promise<ResolvedJd> {
  if (slot.input.kind === 'text') {
    return resolveJdRequest({ kind: 'text', value: slot.input.value })
  }
  return resolveJdRequest({ kind: 'url', value: slot.input.value.trim() })
}

async function resolveCvSlot(slot: CvSlot): Promise<ResolvedCv> {
  if (slot.input.kind === 'text') {
    return resolveCvJsonRequest({ kind: 'text', value: slot.input.value })
  }
  if (slot.input.kind === 'profile') {
    return resolveCvJsonRequest({ kind: 'profile', value: slot.input.value })
  }
  if (!slot.input.file) {
    throw new Error('No file selected')
  }
  return resolveCvFileRequest(slot.input.file, slot.input.kind)
}

interface SingleProfileOverride {
  name: string
  title: string
  github: string
  summary: string
  stack: string[]
  projects: Array<{ title: string; description: string }>
  experience: Array<{ company: string; role: string; period: string; highlights: string[] }>
}

function syntheticProfileForResolvedCv(cv: ResolvedCv): SingleProfileOverride {
  return {
    name: cv.candidateLabel,
    title: '',
    github: '',
    summary: cv.text,
    stack: [],
    projects: [],
    experience: []
  }
}

interface AuditBatchResult {
  username: string
  report: MatchReport | null
  error?: string
}

async function runCellForResolved(jd: ResolvedJd, cv: ResolvedCv): Promise<CellStatus> {
  try {
    if (cv.kind === 'profile' && cv.username) {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jd: jd.text, candidates: [cv.username] })
      })
      const data = (await res.json()) as { results?: AuditBatchResult[]; error?: string }
      if (!res.ok) return { status: 'error', message: data.error ?? 'Audit failed.' }
      const first = data.results?.[0]
      if (!first) return { status: 'error', message: 'No result returned.' }
      if (!first.report) return { status: 'error', message: first.error ?? 'Audit failed.' }
      return { status: 'loaded', report: first.report }
    }

    // Text / markdown / pdf CV: send via single-shape with a synthetic profile.
    // The single-shape path with a profile override uses the server's
    // ANTHROPIC_API_KEY env fallback; this is flagged in the PR for follow-up
    // (promoting the seam to user-BYOK once Task 7b lands the new tool path).
    const res = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_description: jd.text,
        _test_profile_override: syntheticProfileForResolvedCv(cv)
      })
    })
    const data = (await res.json()) as MatchReport & { error?: string }
    if (!res.ok) return { status: 'error', message: data.error ?? 'Audit failed.' }
    if (!data.grade) return { status: 'error', message: 'Audit returned no grade.' }
    return { status: 'loaded', report: data as MatchReport }
  } catch {
    return { status: 'error', message: 'Network error.' }
  }
}

export function BulkAudit({ hasKey }: { hasKey: boolean }) {
  const [jds, setJds] = useState<JdSlot[]>(() => [newJdSlot()])
  const [cvs, setCvs] = useState<CvSlot[]>(() => [newCvSlot()])
  const [state, setState] = useState<'idle' | 'resolving' | 'running' | 'done'>('idle')
  const [cells, setCells] = useState<Cells>({})
  const [submittedJds, setSubmittedJds] = useState<ResolvedJd[]>([])
  const [submittedCvs, setSubmittedCvs] = useState<ResolvedCv[]>([])
  const [resolveError, setResolveError] = useState<string | null>(null)

  const labelClass = 'mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'

  function updateJd(id: string, next: JdSlot['input']) {
    setJds((prev) => prev.map((j) => (j.id === id ? { ...j, input: next } : j)))
  }
  function updateCv(id: string, next: CvSlot['input']) {
    setCvs((prev) => prev.map((c) => (c.id === id ? { ...c, input: next } : c)))
  }
  function addJd() {
    setJds((prev) => (prev.length < MAX_JDS ? [...prev, newJdSlot()] : prev))
  }
  function addCv() {
    setCvs((prev) => (prev.length < MAX_CANDIDATES ? [...prev, newCvSlot()] : prev))
  }
  function removeJd(id: string) {
    setJds((prev) => (prev.length > 1 ? prev.filter((j) => j.id !== id) : prev))
  }
  function removeCv(id: string) {
    setCvs((prev) => (prev.length > 1 ? prev.filter((c) => c.id !== id) : prev))
  }

  const filledJds = jds.filter(jdIsFilled)
  const filledCvs = cvs.filter(cvIsFilled)
  const canRun = filledJds.length > 0 && filledCvs.length > 0 && state === 'idle'

  async function handleRun() {
    if (!canRun) return
    setResolveError(null)
    setState('resolving')

    let resolvedJds: ResolvedJd[]
    let resolvedCvs: ResolvedCv[]
    try {
      ;[resolvedJds, resolvedCvs] = await Promise.all([
        Promise.all(
          filledJds.map(async (slot, i) => {
            try {
              return await resolveJdSlot(slot)
            } catch (err) {
              throw new Error(`JD ${i + 1}: ${err instanceof Error ? err.message : 'resolution failed'}`)
            }
          })
        ),
        Promise.all(
          filledCvs.map(async (slot, i) => {
            try {
              return await resolveCvSlot(slot)
            } catch (err) {
              throw new Error(`Candidate ${i + 1}: ${err instanceof Error ? err.message : 'resolution failed'}`)
            }
          })
        )
      ])
    } catch (err) {
      setResolveError(err instanceof Error ? err.message : 'Input resolution failed')
      setState('idle')
      return
    }

    const initial: Cells = {}
    for (let cvIdx = 0; cvIdx < resolvedCvs.length; cvIdx++) {
      for (let jdIdx = 0; jdIdx < resolvedJds.length; jdIdx++) {
        initial[cellKey(cvIdx, jdIdx)] = { status: 'loading' }
      }
    }

    setSubmittedCvs(resolvedCvs)
    setSubmittedJds(resolvedJds)
    setCells(initial)
    setState('running')

    const tasks: Promise<void>[] = []
    for (let cvIdx = 0; cvIdx < resolvedCvs.length; cvIdx++) {
      for (let jdIdx = 0; jdIdx < resolvedJds.length; jdIdx++) {
        const cv = resolvedCvs[cvIdx]
        const jd = resolvedJds[jdIdx]
        if (!cv || !jd) continue
        const key = cellKey(cvIdx, jdIdx)
        tasks.push(
          runCellForResolved(jd, cv).then((result) => {
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
    setResolveError(null)
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
              <div key={`header-${jdIdx}-${jd.sourceLabel}`} className='border-b border-border pb-3'>
                <p className='font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>
                  JD {jdIdx + 1} —{' '}
                  <span className='text-foreground/70'>
                    {jd.kind === 'url' ? `URL · ${jd.sourceLabel}` : jd.sourceLabel}
                  </span>
                </p>
              </div>
            ))}

            {submittedCvs.flatMap((cv, cvIdx) =>
              submittedJds.map((_jd, jdIdx) => {
                const cell = cells[cellKey(cvIdx, jdIdx)]
                return (
                  <Card key={cellKey(cvIdx, jdIdx)} className='overflow-hidden'>
                    <CardContent className='p-0'>
                      <div className='border-b border-border bg-muted/30 px-4 py-2'>
                        <p className='font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>
                          {cv.candidateLabel} <span className='ml-2 text-foreground/40'>·</span>{' '}
                          <span className='ml-2'>JD {jdIdx + 1}</span>
                        </p>
                      </div>
                      <CellBody cell={cell} candidateLabel={cv.candidateLabel} />
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

  const resolving = state === 'resolving'

  return (
    <div className='mx-auto max-w-[680px] px-6 py-12'>
      <header className='mb-8'>
        <p className='font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>Audit</p>
        <h1 className='mt-2 font-serif text-3xl tracking-tight text-foreground'>Bulk Audit</h1>
        <p className='mt-2 text-sm text-muted-foreground'>
          Match N candidates against M job descriptions — one forensic report per pair. JDs accept pasted text or a URL;
          CVs accept pasted text, a markdown/PDF upload, or a published Herald profile.
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

          {jds.map((slot, index) => (
            <div key={slot.id} className='space-y-1.5 rounded-md border border-border p-4'>
              <div className='flex items-baseline justify-between'>
                <span className='font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'>
                  JD {index + 1}
                </span>
                {jds.length > 1 && (
                  <Button
                    onClick={() => removeJd(slot.id)}
                    variant='ghost'
                    size='sm'
                    className='h-6 px-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground'
                  >
                    <X className='mr-1 h-3 w-3' />
                    Remove
                  </Button>
                )}
              </div>
              <JdInputControl value={slot.input} onChange={(next) => updateJd(slot.id, next)} index={index} />
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

        <div className='space-y-4'>
          <div className='flex items-baseline justify-between'>
            <span className={labelClass}>Candidates</span>
            <span className='font-mono text-[10px] text-muted-foreground'>
              {cvs.length}/{MAX_CANDIDATES}
            </span>
          </div>

          {cvs.map((slot, index) => (
            <div key={slot.id} className='space-y-1.5 rounded-md border border-border p-4'>
              <div className='flex items-baseline justify-between'>
                <span className='font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'>
                  Candidate {index + 1}
                </span>
                {cvs.length > 1 && (
                  <Button
                    onClick={() => removeCv(slot.id)}
                    variant='ghost'
                    size='sm'
                    className='h-6 px-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground'
                  >
                    <X className='mr-1 h-3 w-3' />
                    Remove
                  </Button>
                )}
              </div>
              <CvInputControl value={slot.input} onChange={(next) => updateCv(slot.id, next)} index={index} />
            </div>
          ))}

          {cvs.length < MAX_CANDIDATES && (
            <Button
              onClick={addCv}
              variant='outline'
              size='sm'
              className='font-mono text-[10px] uppercase tracking-[0.2em]'
            >
              <Plus className='mr-1 h-3 w-3' />
              Add Candidate
            </Button>
          )}
        </div>

        {resolveError && <p className='font-mono text-xs text-destructive'>Couldn’t resolve inputs — {resolveError}</p>}

        <Button
          onClick={handleRun}
          disabled={!canRun || resolving}
          className='font-mono text-xs uppercase tracking-[0.2em]'
        >
          {resolving ? (
            <>
              <Loader2 className='mr-2 h-3 w-3 animate-spin' />
              Resolving inputs…
            </>
          ) : (
            <>
              Run {filledCvs.length || 'N'} × {filledJds.length || 'M'} Matrix
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

function CellBody({ cell, candidateLabel }: { cell: CellStatus | undefined; candidateLabel: string }) {
  if (!cell || cell.status === 'loading') {
    return (
      <div className='flex h-[200px] flex-col items-center justify-center gap-3 px-6'>
        <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
        <p className='font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>
          Auditing {candidateLabel}…
        </p>
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
