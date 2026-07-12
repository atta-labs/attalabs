'use client'

import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { Fragment, useState } from 'react'
import { Badge } from '@atta/ui/components/badge'
import { Button, Card, CardContent, Textarea, Input, useToastContext } from '@atta/ui/components'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'

import { auditFailureMessage, ReportView } from '@/components/envoy/ReportView'
import type { ResolvedCv, ResolvedJd, CvInputKind } from '@/lib/audit-input/types'
import type { MatchReport } from '@/lib/types'
import { DocCollector, type DocCollectorItem } from '@atta/ui/doc-collector'
import { resolveCvJsonRequest, resolveJdRequest } from '@/lib/audit-input/client'

const MAX_JDS = 10
const MAX_CANDIDATES = 10

type CellStatus =
  | { status: 'loading' }
  | { status: 'loaded'; report: MatchReport }
  | { status: 'error'; message: string }

type Cells = Record<string, CellStatus>

function cellKey(cvIdx: number, jdIdx: number): string {
  return `${cvIdx}-${jdIdx}`
}

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
  const [jds, setJds] = useState<DocCollectorItem[]>([])
  const [cvs, setCvs] = useState<DocCollectorItem[]>([])
  const [state, setState] = useState<'idle' | 'resolving' | 'running' | 'done'>('idle')
  const [cells, setCells] = useState<Cells>({})
  const [submittedJds, setSubmittedJds] = useState<ResolvedJd[]>([])
  const [submittedCvs, setSubmittedCvs] = useState<ResolvedCv[]>([])
  const [resolveError, setResolveError] = useState<string | null>(null)
  const { errorToast } = useToastContext()

  const labelClass = 'font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground'

  const n = Math.min(cvs.length, MAX_CANDIDATES)
  const m = Math.min(jds.length, MAX_JDS)
  const overCap = cvs.length > MAX_CANDIDATES || jds.length > MAX_JDS
  const canRun = n > 0 && m > 0 && state === 'idle'

  async function handleRun() {
    if (!canRun) return
    setResolveError(null)
    setState('resolving')

    // Only process items that have completed resolution and have text.
    // Also enforce the maximum limits.
    const readyCvs = cvs.filter((cv) => cv.status === 'ready' && cv.text !== undefined)
    const readyJds = jds.filter((jd) => jd.status === 'ready' && jd.text !== undefined)

    if (readyCvs.length === 0) {
      setResolveError('No CVs ready yet. Wait for uploads/resolution to finish or check for errors.')
      setState('idle')
      return
    }
    if (readyJds.length === 0) {
      setResolveError('No JDs ready yet. Wait for uploads/resolution to finish or check for errors.')
      setState('idle')
      return
    }

    const resolvedCvs: ResolvedCv[] = readyCvs.slice(0, MAX_CANDIDATES).map((cv): ResolvedCv => {
      const kind: CvInputKind = cv.kind === 'text' ? 'text' : cv.kind === 'pdf' ? 'pdf' : 'markdown'
      const username = (cv.meta as { username?: string } | undefined)?.username ?? null
      return {
        kind: username ? 'profile' : kind,
        text: cv.text!,
        username,
        candidateLabel: cv.filename
      }
    })

    const resolvedJds: ResolvedJd[] = readyJds.slice(0, MAX_JDS).map(
      (jd): ResolvedJd => ({
        kind: jd.kind === 'text' ? 'text' : jd.kind === 'pdf' ? 'pdf' : 'markdown',
        text: jd.text!,
        sourceLabel: jd.filename
      })
    )

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
    <div className='mx-auto max-w-[1080px] px-6 py-12'>
      <header className='mb-8'>
        <p className='font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground'>Audit</p>
        <h1 className='mt-2 font-serif text-3xl tracking-tight text-foreground'>Bulk Audit</h1>
        <p className='mt-2 text-sm text-muted-foreground max-w-[680px]'>
          Match N candidates against M job descriptions — one forensic report per pair. JDs accept pasted text or a URL;
          CVs accept pasted text, a markdown/PDF upload, or a published Herald profile.
        </p>
      </header>

      <div className='space-y-8 h-full'>
        {/*
          Both DocCollector instances below pin an explicit h-[510px] (via className,
          see DocCollector's `className` prop doc in ui-library-system SKILL.md) so the
          CV/JD columns never reflow relative to each other or to themselves as items are
          added — the drop zone (flex-1 min-h-[64px] inside DocCollector) absorbs the height
          delta instead. 510px is not arbitrary: it's the empirically-verified minimum where
          a populated column's "Add by X"/"Paste The Doc" rows land at the identical Y as an
          empty column's (measured via getBoundingClientRect() against the real running app,
          not estimated) — 500px is the exact convergence point, 510px adds a small margin so
          the drop zone still clears its own 64px floor with room to spare. If DocCollector's
          internal chip-row/label/custom-source-row/paste-box heights ever change, re-derive
          this by adding items in a live browser and checking the two columns' row alignment,
          not by guessing a bigger number.
        */}
        <div className='grid grid-cols-2 gap-8 h-full'>
          {/* Candidates Column */}
          <div className='grid grid-rows-[auto_1fr] grid-cols-1 gap-4 h-full'>
            <div className='flex h-8 items-center justify-between'>
              <span className={labelClass}>
                Candidates
                {cvs.length > 0 && (
                  <Badge variant='secondary' className='ml-2 font-mono'>
                    {cvs.length}
                  </Badge>
                )}
              </span>
              <span className='font-mono text-xs text-muted-foreground'>
                {n}/{MAX_CANDIDATES}
              </span>
            </div>
            <DocCollector
              className='h-[510px] min-h-0 min-w-0'
              accept='.md,.pdf'
              onItemsChange={setCvs}
              components={{ Textarea, Button, Input }}
              customSources={[
                {
                  label: 'Herald Username',
                  placeholder: 'username',
                  resolve: async (value) => {
                    const resolved = await resolveCvJsonRequest({ kind: 'profile', value })
                    return {
                      text: resolved.text,
                      filename: `@${resolved.username}.usr`,
                      meta: { username: resolved.username }
                    }
                  },
                  onError: (message) => errorToast('Could not add candidate', message)
                }
              ]}
            />
          </div>

          {/* Job Descriptions Column */}
          <div className='grid grid-rows-[auto_1fr] grid-cols-1 gap-4 h-full border-l border-border pl-8'>
            <div className='flex h-8 items-center justify-between'>
              <span className={labelClass}>
                Job Descriptions
                {jds.length > 0 && (
                  <Badge variant='secondary' className='ml-2 font-mono'>
                    {jds.length}
                  </Badge>
                )}
              </span>
              <span className='font-mono text-xs text-muted-foreground'>
                {m}/{MAX_JDS}
              </span>
            </div>
            <DocCollector
              className='h-[510px] min-h-0 min-w-0'
              accept='.md,.pdf'
              onItemsChange={setJds}
              components={{ Textarea, Button, Input }}
              customSources={[
                {
                  label: 'URL',
                  placeholder: 'https://...',
                  type: 'url',
                  resolve: async (value) => {
                    const resolved = await resolveJdRequest({ kind: 'url', value })
                    return { text: resolved.text, filename: `${resolved.sourceLabel}.url` }
                  },
                  onError: (message) => errorToast('Could not add job description', message)
                }
              ]}
            />
          </div>
        </div>

        {resolveError && <p className='font-mono text-xs text-destructive text-center'>{resolveError}</p>}
        {overCap && (
          <p className='font-mono text-xs text-warning text-center mt-2'>
            Caps exceeded: Only the first {MAX_CANDIDATES} CVs and {MAX_JDS} JDs will be audited.
          </p>
        )}

        <div className='flex justify-center pt-4'>
          <Button
            onClick={handleRun}
            disabled={!canRun || resolving}
            size='lg'
            className='w-full max-w-md font-mono text-xs uppercase tracking-[0.2em]'
          >
            {resolving ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Preparing Matrix…
              </>
            ) : !canRun ? (
              'Add CVs and job descriptions to start'
            ) : (
              `${n} × ${m} = Generate ${n * m} report${n * m !== 1 ? 's' : ''}`
            )}
          </Button>
        </div>
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
        <CollapsibleTrigger asChild>
          <Button
            variant='ghost'
            className='flex w-full items-center justify-between rounded-none border-0 px-4 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground hover:bg-accent/10 hover:text-foreground'
          >
            <span>
              {jdLabel} · {candidateLabel}
            </span>
            {expanded ? <ChevronUp className='h-3 w-3' /> : <ChevronDown className='h-3 w-3' />}
          </Button>
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
