'use client'

import { ChevronDown, ChevronUp, Loader2, Plus, X } from 'lucide-react'
import { Fragment, useState } from 'react'
import { Badge } from '@atta/ui/components/badge'
import { Button, Card, CardContent } from '@atta/ui/components'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'

import { auditFailureMessage, ReportView } from '@/components/envoy/ReportView'
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

// Wire every CV kind through the unified batch shape — both profile lookups
// and ad-hoc text CVs run under the logged-in user's BYOK key resolved
// server-side in handleBatch. (Previously, non-profile kinds detoured through
// the single-shape _test_profile_override hatch which spent the server env
// key — flagged in PR #123 review, fixed here.)
type BatchCandidatePayload = { kind: 'username'; value: string } | { kind: 'text'; label: string; text: string }

function payloadForCv(cv: ResolvedCv): BatchCandidatePayload {
  if (cv.kind === 'profile' && cv.username) {
    return { kind: 'username', value: cv.username }
  }
  return { kind: 'text', label: cv.candidateLabel, text: cv.text }
}

interface AuditBatchResult {
  username: string
  report: MatchReport | null
  error?: string
}

async function runCellForResolved(jd: ResolvedJd, cv: ResolvedCv): Promise<CellStatus> {
  try {
    const res = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jd: jd.text, candidates: [payloadForCv(cv)] })
    })
    const data = (await res.json()) as { results?: AuditBatchResult[]; error?: string }
    if (!res.ok) return { status: 'error', message: data.error ?? 'Audit failed.' }
    const first = data.results?.[0]
    if (!first) return { status: 'error', message: 'No result returned.' }
    if (!first.report) return { status: 'error', message: first.error ?? 'Audit failed.' }
    return { status: 'loaded', report: first.report }
  } catch {
    return { status: 'error', message: 'Network error.' }
  }
}

function gradeColorClass(grade: MatchReport['grade']): string {
  if (grade === 'NO FIT') return 'text-destructive'
  if (grade === 'STRETCH') return 'text-warning'
  if (grade === 'A' || grade === 'A-') return 'text-success'
  return 'text-foreground'
}

function gradeBadgeClass(grade: MatchReport['grade']): string {
  if (grade === 'NO FIT') return 'bg-destructive/10 text-destructive border-destructive/40'
  if (grade === 'STRETCH') return 'bg-warning/10 text-warning border-warning/40'
  if (grade === 'A' || grade === 'A-') return 'bg-success/10 text-success border-success/40'
  return 'bg-muted text-muted-foreground border-border'
}

export function BulkAudit({ hasKey, settingsHref }: { hasKey: boolean; settingsHref: string }) {
  const [jds, setJds] = useState<JdSlot[]>(() => [newJdSlot()])
  const [cvs, setCvs] = useState<CvSlot[]>(() => [newCvSlot()])
  const [state, setState] = useState<'idle' | 'resolving' | 'running' | 'done'>('idle')
  const [cells, setCells] = useState<Cells>({})
  const [submittedJds, setSubmittedJds] = useState<ResolvedJd[]>([])
  const [submittedCvs, setSubmittedCvs] = useState<ResolvedCv[]>([])
  const [resolveError, setResolveError] = useState<string | null>(null)

  const labelClass = 'mb-1.5 block font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground'

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
          <p className='font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground'>Audit</p>
          <h1 className='mt-2 font-serif text-3xl tracking-tight text-foreground'>Bulk Audit</h1>
        </header>
        <Card className='bg-card/50'>
          <CardContent className='px-6 py-8'>
            <p className='text-sm text-muted-foreground'>
              Bulk audits run on your Anthropic API key. Add your key in Settings to get started.
            </p>
            <NextLink href={settingsHref} variant='subtle' className='mt-4 inline-block underline underline-offset-2'>
              Settings → API Keys
            </NextLink>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state === 'running' || state === 'done') {
    const cvCount = submittedCvs.length
    const jdCount = submittedJds.length
    const totalCells = cvCount * jdCount
    const completedCells = Object.values(cells).filter((c) => c.status !== 'loading').length
    const errorCells = Object.values(cells).filter((c) => c.status === 'error').length
    const isRunning = state === 'running'

    return (
      <div className='px-6 py-8'>
        {/* Matrix header bar */}
        <div className='mx-auto mb-6 max-w-[1440px]'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground'>
                {cvCount} candidate{cvCount !== 1 ? 's' : ''} × {jdCount} JD{jdCount !== 1 ? 's' : ''} — {totalCells}{' '}
                audit{totalCells !== 1 ? 's' : ''}
              </p>
              {isRunning ? (
                <p className='mt-0.5 flex items-center gap-1.5 font-mono text-xs text-muted-foreground'>
                  <Loader2 className='h-3 w-3 animate-spin' />
                  {completedCells}/{totalCells} complete
                </p>
              ) : (
                <p className='mt-0.5 font-mono text-xs text-muted-foreground'>
                  {errorCells > 0 ? (
                    <span>
                      {completedCells - errorCells} done · <span className='text-destructive'>{errorCells} failed</span>
                    </span>
                  ) : (
                    <span className='text-success'>All audits complete</span>
                  )}
                </p>
              )}
            </div>
            <Button
              onClick={handleReset}
              variant='outline'
              className='font-mono text-xs uppercase tracking-[0.2em]'
              disabled={isRunning}
            >
              New Matrix
            </Button>
          </div>
        </div>

        {/* Matrix grid */}
        <div className='mx-auto max-w-[1440px] overflow-x-auto pb-4'>
          <div
            className='grid gap-x-4 gap-y-6'
            style={{ gridTemplateColumns: `160px repeat(${jdCount}, minmax(480px, 1fr))` }}
          >
            {/* Header row: blank corner + JD column headers */}
            <div className='border-b border-border pb-3' />
            {submittedJds.map((jd, jdIdx) => (
              <div key={`jd-header-${jdIdx}`} className='border-b border-border pb-3'>
                <p className='font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground'>JD {jdIdx + 1}</p>
                <p className='mt-0.5 truncate font-mono text-xs text-foreground/70'>
                  {jd.kind === 'url' ? jd.sourceLabel : jd.sourceLabel}
                </p>
              </div>
            ))}

            {/* Data rows: candidate label + cells */}
            {submittedCvs.map((cv, cvIdx) => (
              <Fragment key={`cv-row-${cvIdx}`}>
                {/* Row label */}
                <div className='flex items-start pt-4'>
                  <div>
                    <p className='font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground'>
                      Candidate {cvIdx + 1}
                    </p>
                    <p className='mt-0.5 font-mono text-xs text-foreground'>{cv.candidateLabel}</p>
                  </div>
                </div>

                {/* Result cells for this candidate */}
                {submittedJds.map((_jd, jdIdx) => {
                  const cell = cells[cellKey(cvIdx, jdIdx)]
                  return (
                    <AuditCell
                      key={cellKey(cvIdx, jdIdx)}
                      cell={cell}
                      candidateLabel={cv.candidateLabel}
                      jdLabel={`JD ${jdIdx + 1}`}
                    />
                  )
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const resolving = state === 'resolving'

  return (
    <div className='mx-auto max-w-[680px] px-6 py-12'>
      <header className='mb-8'>
        <p className='font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground'>Audit</p>
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
            <span className='font-mono text-xs text-muted-foreground'>
              {jds.length}/{MAX_JDS}
            </span>
          </div>

          {jds.map((slot, index) => (
            <div key={slot.id} className='space-y-1.5 rounded-md border border-border p-4'>
              <div className='flex items-baseline justify-between'>
                <span className='font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground'>
                  JD {index + 1}
                </span>
                {jds.length > 1 && (
                  <Button
                    onClick={() => removeJd(slot.id)}
                    variant='ghost'
                    size='sm'
                    className='h-6 px-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground'
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
              className='font-mono text-xs uppercase tracking-[0.2em]'
            >
              <Plus className='mr-1 h-3 w-3' />
              Add Job Description
            </Button>
          )}
        </div>

        <div className='space-y-4'>
          <div className='flex items-baseline justify-between'>
            <span className={labelClass}>Candidates</span>
            <span className='font-mono text-xs text-muted-foreground'>
              {cvs.length}/{MAX_CANDIDATES}
            </span>
          </div>

          {cvs.map((slot, index) => (
            <div key={slot.id} className='space-y-1.5 rounded-md border border-border p-4'>
              <div className='flex items-baseline justify-between'>
                <span className='font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground'>
                  Candidate {index + 1}
                </span>
                {cvs.length > 1 && (
                  <Button
                    onClick={() => removeCv(slot.id)}
                    variant='ghost'
                    size='sm'
                    className='h-6 px-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground'
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
              className='font-mono text-xs uppercase tracking-[0.2em]'
            >
              <Plus className='mr-1 h-3 w-3' />
              Add Candidate
            </Button>
          )}
        </div>

        {resolveError && <p className='font-mono text-xs text-destructive'>Couldn't resolve inputs — {resolveError}</p>}

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

interface AuditCellProps {
  cell: CellStatus | undefined
  candidateLabel: string
  jdLabel: string
}

function AuditCell({ cell, candidateLabel, jdLabel }: AuditCellProps) {
  const [expanded, setExpanded] = useState(false)

  if (!cell || cell.status === 'loading') {
    return (
      <Card className='overflow-hidden'>
        <CardContent className='flex h-[160px] flex-col items-center justify-center gap-3 p-6'>
          <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
          <p className='font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground'>
            Auditing {candidateLabel}…
          </p>
        </CardContent>
      </Card>
    )
  }

  if (cell.status === 'error') {
    return (
      <Card className='overflow-hidden border-destructive/30'>
        <CardContent className='flex h-[160px] flex-col items-center justify-center gap-2 p-6'>
          <Badge className='bg-destructive/10 text-destructive border-destructive/40 font-mono text-xs uppercase tracking-[0.2em]'>
            Failed
          </Badge>
          <p className='text-center font-mono text-xs text-muted-foreground'>{cell.message}</p>
        </CardContent>
      </Card>
    )
  }

  const { report } = cell

  if (report.auditFailed) {
    return (
      <Card className='overflow-hidden border-destructive/30'>
        <CardContent className='flex h-[160px] flex-col items-center justify-center gap-2 p-6'>
          <Badge className='bg-destructive/10 text-destructive border-destructive/40 font-mono text-xs uppercase tracking-[0.2em]'>
            Failed
          </Badge>
          <p className='text-center font-mono text-xs text-muted-foreground'>
            {auditFailureMessage(report.auditFailed)}
          </p>
        </CardContent>
      </Card>
    )
  }

  const signalCount = report.signal.length
  const hardCount = report.hard_requirements?.filter((r) => r.kind === 'hard').length ?? 0
  const hardMetCount = report.hard_requirements?.filter((r) => r.kind === 'hard' && r.met).length ?? 0

  return (
    <Card className='overflow-hidden'>
      {/* Compact summary header */}
      <div className='border-b border-border bg-muted/20 px-4 py-3'>
        <div className='flex items-center justify-between gap-3'>
          <div className='flex items-center gap-2.5'>
            <span
              className={`font-serif text-xl font-bold leading-none tracking-tight ${gradeColorClass(report.grade)}`}
            >
              {report.grade}
            </span>
            <Badge
              variant='outline'
              className={`font-mono text-xs uppercase tracking-[0.15em] ${gradeBadgeClass(report.grade)}`}
            >
              {report.confidence}
            </Badge>
          </div>
          <div className='flex items-center gap-3'>
            {hardCount > 0 && (
              <span className='font-mono text-xs text-muted-foreground'>
                <span className={hardMetCount === hardCount ? 'text-success' : 'text-destructive'}>
                  {hardMetCount}/{hardCount}
                </span>{' '}
                hard req
              </span>
            )}
            <span className='font-mono text-xs text-muted-foreground'>
              {signalCount} signal{signalCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <p className='mt-1.5 line-clamp-2 text-xs leading-relaxed text-foreground/80'>{report.recommendation}</p>
      </div>

      {/* Expand / collapse toggle */}
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger
          render={
            <Button
              variant='ghost'
              className='flex w-full items-center justify-between rounded-none border-0 px-4 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground hover:bg-accent/10 hover:text-foreground'
            />
          }
        >
          <span>
            {jdLabel} · {candidateLabel}
          </span>
          {expanded ? <ChevronUp className='h-3 w-3' /> : <ChevronDown className='h-3 w-3' />}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className='border-t border-border'>
            <ReportView report={report} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
