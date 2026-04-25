import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@atta/ui/components/badge'
import { Separator } from '@atta/ui'
import ReactMarkdown from 'react-markdown'
import { getBenchmarkRun } from '@/db/bench-queries'

function VerdictBadge({ verdict }: { verdict: string }) {
  if (verdict === 'vada_wins')
    return (
      <Badge variant='outline' className='text-success border-success/40 font-mono'>
        vada wins
      </Badge>
    )
  if (verdict === 'baseline_wins')
    return (
      <Badge variant='outline' className='text-destructive border-destructive/40 font-mono'>
        baseline wins
      </Badge>
    )
  return (
    <Badge variant='outline' className='text-muted-foreground font-mono'>
      tie
    </Badge>
  )
}

function CriterionRow({ label, score }: { label: string; score: number }) {
  const pct = Math.min(100, Math.round((score / 5) * 100))
  return (
    <div className='flex items-center justify-between gap-4 py-1.5'>
      <span className='text-xs text-muted-foreground'>{label}</span>
      <div className='flex items-center gap-2'>
        <div className='h-1.5 w-20 rounded-full bg-muted overflow-hidden'>
          <div className='h-full rounded-full bg-primary/60' style={{ width: `${pct}%` }} />
        </div>
        <span className='font-mono text-xs text-foreground w-4 text-right'>{score}</span>
      </div>
    </div>
  )
}

interface ReviewerScores {
  alternativesConsidered?: number
  assumptionsSurfaced?: number
  actionableSpecificity?: number
  confidenceCalibration?: number
  reviewerDivergence?: number
  aggregate?: number
}

export default async function BenchRunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const run = await getBenchmarkRun(id)
  if (!run) notFound()

  const scores = run.reviewerScores as ReviewerScores | null
  const dateFormatted = run.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  return (
    <div className='space-y-8 max-w-5xl'>
      <div className='space-y-2'>
        <Link href='/brokered/bench' className='text-xs text-muted-foreground hover:text-foreground'>
          ← Brokered Benchmark
        </Link>
        <h1 className='font-serif text-2xl font-semibold leading-snug'>{run.sessionTitle ?? run.prompt ?? id}</h1>
        <div className='flex items-center gap-3'>
          <VerdictBadge verdict={run.judgeVerdict} />
          <span className='font-mono text-sm text-muted-foreground'>
            {run.judgeModel} · {dateFormatted}
          </span>
          {run.runLabel && <code className='rounded bg-muted px-1.5 py-0.5 text-xs'>{run.runLabel}</code>}
        </div>
      </div>

      <div className='grid gap-8 lg:grid-cols-[1fr_220px]'>
        <div className='space-y-8 min-w-0'>
          {/* Judge reasoning */}
          <section className='space-y-3'>
            <h2 className='font-serif text-base font-semibold'>Judge Reasoning</h2>
            <div className='prose prose-sm max-w-none text-foreground [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded'>
              <ReactMarkdown>{run.judgeReasoning ?? ''}</ReactMarkdown>
            </div>
          </section>

          <Separator className='opacity-20' />

          {/* Two-column: brokered response vs baseline */}
          <section className='space-y-3'>
            <h2 className='font-serif text-base font-semibold'>Responses</h2>
            <div className='grid gap-6 md:grid-cols-2'>
              <div className='space-y-2'>
                <p className='font-mono text-xs text-muted-foreground uppercase tracking-wide'>Vāda Brokered</p>
                <div className='rounded-md border border-border p-4 text-xs leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap font-mono text-foreground'>
                  {run.response ?? '—'}
                </div>
              </div>
              <div className='space-y-2'>
                <p className='font-mono text-xs text-muted-foreground uppercase tracking-wide'>
                  Baseline ({run.baselineLabel ?? 'single-shot'})
                </p>
                <div className='rounded-md border border-border/50 bg-muted/20 p-4 text-xs leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap font-mono text-muted-foreground'>
                  {run.baselineResponse ?? '—'}
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className='space-y-6'>
          {/* Scores */}
          {scores && (
            <div className='space-y-1'>
              <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2'>Criteria scores</p>
              <Separator className='opacity-20' />
              {scores.alternativesConsidered != null && (
                <CriterionRow label='Alternatives considered' score={scores.alternativesConsidered} />
              )}
              {scores.assumptionsSurfaced != null && (
                <CriterionRow label='Assumptions surfaced' score={scores.assumptionsSurfaced} />
              )}
              {scores.actionableSpecificity != null && (
                <CriterionRow label='Actionable specificity' score={scores.actionableSpecificity} />
              )}
              {scores.confidenceCalibration != null && (
                <CriterionRow label='Confidence calibration' score={scores.confidenceCalibration} />
              )}
              {scores.reviewerDivergence != null && (
                <CriterionRow label='Reviewer divergence' score={scores.reviewerDivergence} />
              )}
              {scores.aggregate != null && (
                <>
                  <Separator className='opacity-20 my-1' />
                  <div className='flex items-center justify-between py-1'>
                    <span className='text-xs font-medium'>Aggregate</span>
                    <span className='font-mono text-sm font-semibold'>{scores.aggregate.toFixed(1)}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Session metadata */}
          <div className='space-y-1'>
            <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2'>Session</p>
            <Separator className='opacity-20' />
            {run.reviewerProfile && (
              <div className='flex items-baseline justify-between gap-2 py-1'>
                <span className='text-xs text-muted-foreground'>Reviewers</span>
                <span className='font-mono text-xs'>{run.reviewerProfile}</span>
              </div>
            )}
            {run.durationMs != null && (
              <div className='flex items-baseline justify-between gap-2 py-1'>
                <span className='text-xs text-muted-foreground'>Duration</span>
                <span className='font-mono text-xs'>{(run.durationMs / 1000).toFixed(1)}s</span>
              </div>
            )}
            {run.costUsd && (
              <div className='flex items-baseline justify-between gap-2 py-1'>
                <span className='text-xs text-muted-foreground'>Cost</span>
                <span className='font-mono text-xs'>${Number(run.costUsd).toFixed(4)}</span>
              </div>
            )}
            <div className='flex items-baseline justify-between gap-2 py-1'>
              <span className='text-xs text-muted-foreground'>Hash</span>
              <span className='font-mono text-xs text-muted-foreground truncate max-w-[120px]'>
                {run.questionHash.slice(0, 12)}…
              </span>
            </div>
            <Link
              href={`/brokered/consultations/${run.sessionId}`}
              className='text-xs text-primary hover:underline block pt-1'
            >
              View full session →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
