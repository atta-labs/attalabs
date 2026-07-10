'use client'

import { ChevronDown, ChevronUp, Loader2, X } from 'lucide-react'
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
  const [jdUrls, setJdUrls] = useState<string[]>([])
  const [jdUrlDraft, setJdUrlDraft] = useState('')
  const [cvProfiles, setCvProfiles] = useState<string[]>([])
  const [cvProfileDraft, setCvProfileDraft] = useState('')
  const [isAddingProfile, setIsAddingProfile] = useState(false)
  const { errorToast } = useToastContext()

  const [state, setState] = useState<'idle' | 'resolving' | 'running' | 'done'>('idle')
  const [cells, setCells] = useState<Cells>({})
  const [submittedJds, setSubmittedJds] = useState<ResolvedJd[]>([])
  const [submittedCvs, setSubmittedCvs] = useState<ResolvedCv[]>([])
  const [resolveError, setResolveError] = useState<string | null>(null)

  const labelClass = 'mb-1.5 block font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground'

  const rawCvs = cvs.length + cvProfiles.length
  const rawJds = jds.length + jdUrls.length
  const n = Math.min(rawCvs, MAX_CANDIDATES)
  const m = Math.min(rawJds, MAX_JDS)
  const overCap = rawCvs > MAX_CANDIDATES || rawJds > MAX_JDS
  const canRun = n > 0 && m > 0 && state === 'idle'

  async function handleAddProfile() {
    const val = cvProfileDraft.trim()
    if (!val || cvProfiles.includes(val)) {
      setCvProfileDraft('')
      return
    }
    setIsAddingProfile(true)
    try {
      await resolveCvJsonRequest({ kind: 'profile', value: val })
      setCvProfiles((prev) => [...prev, val])
      setCvProfileDraft('')
    } catch (err: any) {
      errorToast('Invalid Profile', err.message || 'The user does not exist.')
    } finally {
      setIsAddingProfile(false)
    }
  }

  async function handleRun() {
    if (!canRun) return
    setResolveError(null)
    setState('resolving')

    // Only process items that have completed resolution and have text.
    // Also enforce the maximum limits.
    const readyCvs = cvs.filter((cv) => cv.status === 'ready' && cv.text !== undefined)
    const readyJds = jds.filter((jd) => jd.status === 'ready' && jd.text !== undefined)

    if (readyCvs.length === 0 && cvProfiles.length === 0) {
      setResolveError('No CVs found. Wait for uploads to finish or add a profile.')
      setState('idle')
      return
    }
    if (readyJds.length === 0 && jdUrls.length === 0) {
      setResolveError('No JDs found. Wait for uploads to finish or add a URL.')
      setState('idle')
      return
    }

    const resolvedCvProfiles: ResolvedCv[] = []
    const resolvedJdUrls: ResolvedJd[] = []

    const resolveErrors: string[] = []

    const cvResults = await Promise.allSettled(
      cvProfiles.map((username) => resolveCvJsonRequest({ kind: 'profile', value: username }))
    )
    cvResults.forEach((res, i) => {
      if (res.status === 'rejected')
        resolveErrors.push(
          `Profile ${cvProfiles[i]}: ${res.reason instanceof Error ? res.reason.message : String(res.reason)}`
        )
      else resolvedCvProfiles.push(res.value)
    })

    const jdResults = await Promise.allSettled(jdUrls.map((url) => resolveJdRequest({ kind: 'url', value: url })))
    jdResults.forEach((res, i) => {
      if (res.status === 'rejected')
        resolveErrors.push(`URL ${jdUrls[i]}: ${res.reason instanceof Error ? res.reason.message : String(res.reason)}`)
      else resolvedJdUrls.push(res.value)
    })

    if (resolveErrors.length > 0) {
      setResolveError(resolveErrors.join(' | '))
      setState('idle')
      return
    }

    const resolvedCvs: ResolvedCv[] = [
      ...readyCvs.map((cv): ResolvedCv => {
        const kind: CvInputKind = cv.kind === 'text' ? 'text' : cv.kind === 'pdf' ? 'pdf' : 'markdown'
        return {
          kind,
          text: cv.text!,
          username: null,
          candidateLabel: cv.filename
        }
      }),
      ...resolvedCvProfiles
    ].slice(0, MAX_CANDIDATES)

    const resolvedJds: ResolvedJd[] = [
      ...readyJds.map((jd): ResolvedJd => {
        const kind: 'text' | 'pdf' | 'markdown' = jd.kind === 'text' ? 'text' : jd.kind === 'pdf' ? 'pdf' : 'markdown'
        return {
          kind,
          text: jd.text!,
          sourceLabel: jd.filename
        }
      }),
      ...resolvedJdUrls
    ].slice(0, MAX_JDS)

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
    setJdUrls([])
    setJdUrlDraft('')
    setCvProfiles([])
    setCvProfileDraft('')
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

      <div className='space-y-8'>
        <div className='grid grid-cols-2 gap-8'>
          {/* Candidates Column */}
          <div className='space-y-4'>
            <div className='flex items-baseline justify-between'>
              <span className={labelClass}>
                Candidates
                {rawCvs > 0 && (
                  <Badge variant='secondary' className='ml-2 font-mono'>
                    {rawCvs}
                  </Badge>
                )}
              </span>
              <span className='font-mono text-xs text-muted-foreground'>
                {n}/{MAX_CANDIDATES}
              </span>
            </div>
            <DocCollector accept='.md,.pdf' onItemsChange={setCvs} components={{ Textarea, Button }} />
            <div className='rounded-lg border border-border p-3 space-y-3 bg-muted/20 mt-4'>
              <p className='font-mono text-xs text-muted-foreground uppercase tracking-widest'>
                Or add by Herald Profile
              </p>
              <div className='flex items-center gap-2'>
                <Input
                  type='text'
                  placeholder='username'
                  aria-label='Herald Profile username'
                  value={cvProfileDraft}
                  onChange={(e) => setCvProfileDraft(e.target.value)}
                  disabled={isAddingProfile}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void handleAddProfile()
                    }
                  }}
                  className='font-mono text-sm'
                />
                <Button
                  variant='secondary'
                  size='sm'
                  disabled={isAddingProfile}
                  onClick={() => {
                    void handleAddProfile()
                  }}
                >
                  {isAddingProfile ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Add'}
                </Button>
              </div>
              {cvProfiles.length > 0 && (
                <div className='flex flex-wrap gap-2 pt-1'>
                  {cvProfiles.map((p) => (
                    <span
                      key={p}
                      className='flex items-center gap-1 rounded border border-border px-2 py-0.5 font-mono text-xs text-foreground'
                    >
                      @{p}
                      <Button
                        type='button'
                        variant='ghost'
                        onClick={() => setCvProfiles((prev) => prev.filter((x) => x !== p))}
                        aria-label={`Remove profile ${p}`}
                        className='h-auto w-auto p-0 text-muted-foreground hover:bg-transparent hover:text-foreground'
                      >
                        <X className='h-3 w-3' />
                      </Button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Job Descriptions Column */}
          <div className='space-y-4 border-l border-border pl-8'>
            <div className='flex items-baseline justify-between'>
              <span className={labelClass}>
                Job Descriptions
                {rawJds > 0 && (
                  <Badge variant='secondary' className='ml-2 font-mono'>
                    {rawJds}
                  </Badge>
                )}
              </span>
              <span className='font-mono text-xs text-muted-foreground'>
                {m}/{MAX_JDS}
              </span>
            </div>
            <DocCollector accept='.md,.pdf' onItemsChange={setJds} components={{ Textarea, Button }} />
            <div className='rounded-lg border border-border p-3 space-y-3 bg-muted/20 mt-4'>
              <p className='font-mono text-xs text-muted-foreground uppercase tracking-widest'>Or add by URL</p>
              <div className='flex items-center gap-2'>
                <Input
                  type='url'
                  placeholder='https://...'
                  aria-label='Job description URL'
                  value={jdUrlDraft}
                  onChange={(e) => setJdUrlDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const val = jdUrlDraft.trim()
                      if (val && !jdUrls.includes(val)) {
                        setJdUrls((prev) => [...prev, val])
                      }
                      setJdUrlDraft('')
                    }
                  }}
                  className='font-sans text-sm'
                />
                <Button
                  variant='secondary'
                  size='sm'
                  onClick={() => {
                    const val = jdUrlDraft.trim()
                    if (val && !jdUrls.includes(val)) {
                      setJdUrls((prev) => [...prev, val])
                    }
                    setJdUrlDraft('')
                  }}
                >
                  Add
                </Button>
              </div>
              {jdUrls.length > 0 && (
                <div className='flex flex-wrap gap-2 pt-1'>
                  {jdUrls.map((u) => (
                    <span
                      key={u}
                      className='flex items-center gap-1 rounded border border-border px-2 py-0.5 font-mono text-xs text-foreground max-w-full'
                    >
                      <span className='truncate max-w-[200px]'>{u}</span>
                      <Button
                        type='button'
                        variant='ghost'
                        onClick={() => setJdUrls((prev) => prev.filter((x) => x !== u))}
                        aria-label={`Remove URL ${u}`}
                        className='h-auto w-auto p-0 text-muted-foreground hover:bg-transparent hover:text-foreground shrink-0'
                      >
                        <X className='h-3 w-3' />
                      </Button>
                    </span>
                  ))}
                </div>
              )}
            </div>
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
