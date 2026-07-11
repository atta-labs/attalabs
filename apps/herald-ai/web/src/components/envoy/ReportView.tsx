'use client'

import { Check, X } from 'lucide-react'
import { useComponents } from '@atta/ui/lib/library-provider'
import type { MatchReport } from '@/lib/types'

function gradeColorClass(grade: MatchReport['grade']): string {
  if (grade === 'NO FIT') return 'text-destructive'
  if (grade === 'STRETCH') return 'text-warning'
  return ''
}

/** Plain-language copy for each auditFailed category — shared by the
 *  single-audit report view, its toast, and the bulk-audit cell so the
 *  three surfaces never drift into inconsistent wording. */
export function auditFailureMessage(auditFailed: NonNullable<MatchReport['auditFailed']>): string {
  switch (auditFailed.category) {
    case 'quota':
      return "The audit couldn't complete — the selected model's usage quota is exhausted. Switch models in Settings → Herald Model, or try again shortly."
    case 'timeout':
      return "The audit couldn't complete — the selected model took too long to respond. Try again, or switch to a faster model in Settings → Herald Model."
    case 'auth':
      return "The audit couldn't complete — the selected model's API key was rejected. Check your key in Settings → API Keys."
    default:
      return "The audit couldn't complete due to an unexpected error. Try again shortly."
  }
}

export function ReportView({ report }: { report: MatchReport }) {
  const { Card, CardContent, Badge } = useComponents()

  if (report.auditFailed) {
    return (
      <article className='mx-auto max-w-[680px] px-6 py-12 print:max-w-none print:px-0 print:py-0'>
        <header className='mb-8 border-b border-border pb-6'>
          <p className='font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground'>Forensic Match Audit</p>
          <h1 className='mt-2 font-display text-2xl tracking-tight'>{report.candidate.name}</h1>
          <p className='mt-0.5 font-mono text-xs text-muted-foreground'>{report.candidate.title}</p>
        </header>

        <section className='mb-8'>
          {Badge ? (
            <Badge className='border-destructive/40 bg-destructive/10 font-mono text-xs uppercase tracking-[0.2em] text-destructive'>
              Audit Failed
            </Badge>
          ) : (
            <p className='font-mono text-xs uppercase tracking-[0.2em] text-destructive'>Audit Failed</p>
          )}
          <p className='mt-4 text-sm leading-relaxed text-foreground'>{auditFailureMessage(report.auditFailed)}</p>
        </section>

        <footer className='border-t border-border pt-4 print:mt-6'>
          <p className='font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground'>
            Herald · Forensic Match Audit · heyherald.com
          </p>
        </footer>
      </article>
    )
  }

  const hardReqs = report.hard_requirements ?? []
  const hardOnly = hardReqs.filter((r) => r.kind === 'hard')

  return (
    <article className='mx-auto max-w-[680px] px-6 py-12 print:max-w-none print:px-0 print:py-0'>
      {/* ── Header ── */}
      <header className='mb-8 border-b border-border pb-6'>
        <p className='font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground'>Forensic Match Audit</p>
        <h1 className='mt-2 font-display text-2xl tracking-tight'>{report.candidate.name}</h1>
        <p className='mt-0.5 font-mono text-sm text-muted-foreground'>{report.candidate.title}</p>
        {report.estimatedCostUsd !== undefined && (
          <p className='mt-0.5 font-mono text-xs text-warning'>Estimated cost: ${report.estimatedCostUsd.toFixed(4)}</p>
        )}
      </header>

      {/* ── Decision Anchor ── */}
      <section className='mb-8 border-b border-border pb-8'>
        <div className={`font-display text-[80px] leading-none tracking-tight ${gradeColorClass(report.grade)}`}>
          {report.grade}
        </div>
        <div className='mt-2'>
          {report.grade === 'NO FIT' ? (
            Badge ? (
              <Badge className='border-destructive/40 bg-destructive/10 font-mono text-xs uppercase tracking-[0.2em] text-destructive'>
                Disqualified — Hard Requirement Not Met
              </Badge>
            ) : (
              <p className='font-mono text-xs uppercase tracking-[0.2em] text-destructive'>
                Disqualified — Hard Requirement Not Met
              </p>
            )
          ) : (
            <p className='font-mono text-sm font-medium uppercase tracking-wider'>{report.recommendation}</p>
          )}
          {Badge ? (
            <Badge variant='outline' className='mt-1 font-mono text-xs uppercase tracking-[0.2em]'>
              Confidence: {report.confidence}
            </Badge>
          ) : (
            <p className='font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground'>
              Confidence: {report.confidence}
            </p>
          )}
        </div>

        <ul className='mt-6 space-y-1'>
          {report.confidence_reasoning.map((reason) => (
            <li key={reason} className='text-sm leading-relaxed text-muted-foreground'>
              <span className='mr-2 text-foreground/40'>—</span>
              {reason}
            </li>
          ))}
        </ul>
      </section>

      {/* ── Hard Requirements ── */}
      {hardOnly.length > 0 && (
        <section className='mb-8 border-b border-border pb-8'>
          <h2 className='mb-4 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground'>
            Hard Requirements
          </h2>

          <div className='space-y-2'>
            {hardOnly.map((req) =>
              Card && CardContent ? (
                <Card key={req.requirement}>
                  <CardContent className='flex items-start gap-3 p-3'>
                    <span className='mt-0.5 shrink-0'>
                      {req.met ? (
                        <Check className='h-3.5 w-3.5 text-success' />
                      ) : (
                        <X className='h-3.5 w-3.5 text-destructive' />
                      )}
                    </span>
                    <div>
                      <p className={`text-sm font-medium ${req.met ? '' : 'text-destructive'}`}>{req.requirement}</p>
                      <p className='mt-0.5 text-xs leading-relaxed text-muted-foreground'>{req.evidence}</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div key={req.requirement} className='flex items-start gap-3'>
                  <span className='mt-0.5 shrink-0'>
                    {req.met ? (
                      <Check className='h-3.5 w-3.5 text-success' />
                    ) : (
                      <X className='h-3.5 w-3.5 text-destructive' />
                    )}
                  </span>
                  <div>
                    <p className={`text-sm font-medium ${req.met ? '' : 'text-destructive'}`}>{req.requirement}</p>
                    <p className='mt-0.5 text-xs leading-relaxed text-muted-foreground'>{req.evidence}</p>
                  </div>
                </div>
              )
            )}
          </div>
        </section>
      )}

      {/* ── Detected Signals ── */}
      <section className='mb-8 border-b border-border pb-8'>
        <h2 className='mb-4 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground'>Detected Signals</h2>

        <div className='space-y-4'>
          {report.signal.map((signal) =>
            Card && CardContent ? (
              <Card key={signal.title}>
                <CardContent className='p-3'>
                  <div className='flex items-baseline justify-between gap-3'>
                    <h3 className='font-mono text-sm font-medium'>{signal.title}</h3>
                    {Badge ? (
                      <Badge variant='outline' className='shrink-0 font-mono text-xs uppercase tracking-[0.2em]'>
                        {signal.confidence}
                      </Badge>
                    ) : (
                      <span className='shrink-0 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground'>
                        {signal.confidence}
                      </span>
                    )}
                  </div>
                  <p className='mt-0.5 text-xs leading-relaxed text-muted-foreground'>{signal.observation}</p>
                  <p className='mt-0.5 text-sm leading-relaxed'>{signal.interpretation}</p>
                </CardContent>
              </Card>
            ) : (
              <div key={signal.title} className='border-l border-foreground/10 pl-3'>
                <div className='flex items-baseline justify-between gap-3'>
                  <h3 className='font-mono text-sm font-medium'>{signal.title}</h3>
                  <span className='shrink-0 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground'>
                    {signal.confidence}
                  </span>
                </div>
                <p className='mt-0.5 text-xs leading-relaxed text-muted-foreground'>{signal.observation}</p>
                <p className='mt-0.5 text-sm leading-relaxed'>{signal.interpretation}</p>
              </div>
            )
          )}
        </div>
      </section>

      {/* ── GitHub Evidence ── */}
      {report.githubSignals && report.githubSignals.length > 0 && (
        <section className='mb-8 border-b border-border pb-8'>
          <h2 className='mb-4 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground'>GitHub Evidence</h2>

          <div className='space-y-4'>
            {report.githubSignals.map((signal, i) =>
              Card && CardContent ? (
                <Card key={`${signal.source.repo}-${i}`}>
                  <CardContent className='p-3'>
                    <div className='flex items-baseline justify-between gap-3'>
                      <h3 className='font-mono text-sm font-medium'>{signal.source.repo}</h3>
                      {Badge ? (
                        <Badge variant='outline' className='shrink-0 font-mono text-xs uppercase tracking-[0.2em]'>
                          {signal.confidence}
                        </Badge>
                      ) : (
                        <span className='shrink-0 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground'>
                          {signal.confidence}
                        </span>
                      )}
                    </div>
                    <p className='mt-0.5 text-sm leading-relaxed text-muted-foreground'>{signal.evidence}</p>
                  </CardContent>
                </Card>
              ) : (
                <div key={`${signal.source.repo}-${i}`} className='border-l border-foreground/10 pl-3'>
                  <div className='flex items-baseline justify-between gap-3'>
                    <h3 className='font-mono text-sm font-medium'>{signal.source.repo}</h3>
                    <span className='shrink-0 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground'>
                      {signal.confidence}
                    </span>
                  </div>
                  <p className='mt-0.5 text-sm leading-relaxed text-muted-foreground'>{signal.evidence}</p>
                </div>
              )
            )}
          </div>
        </section>
      )}

      {/* ── Gaps ── */}
      <section className='mb-8 border-b border-border pb-8'>
        <h2 className='mb-4 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground'>Identified Gaps</h2>

        <div className='space-y-3'>
          {report.gaps.map((item) =>
            Card && CardContent ? (
              <Card key={item.gap}>
                <CardContent className='p-3'>
                  <p className={`text-sm font-medium ${item.severity === 'disqualifying' ? 'text-destructive' : ''}`}>
                    {item.gap}
                  </p>
                  {item.severity === 'minor' && item.mitigation && (
                    <p className='mt-0.5 text-xs leading-relaxed text-muted-foreground'>
                      Mitigation: {item.mitigation}
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div key={item.gap} className='border-l border-foreground/10 pl-3'>
                <p className={`text-sm font-medium ${item.severity === 'disqualifying' ? 'text-destructive' : ''}`}>
                  {item.gap}
                </p>
                {item.severity === 'minor' && item.mitigation && (
                  <p className='mt-0.5 text-xs leading-relaxed text-muted-foreground'>Mitigation: {item.mitigation}</p>
                )}
              </div>
            )
          )}
        </div>
      </section>

      {/* ── Interview Hooks ── */}
      {report.interview_hooks.length > 0 && (
        <section className='mb-8'>
          <h2 className='mb-4 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground'>
            Recommended Interview Questions
          </h2>

          <ol className='space-y-2'>
            {report.interview_hooks.map((hook, i) => (
              <li key={hook} className='flex gap-3 text-sm leading-relaxed'>
                <span className='shrink-0 font-mono text-xs text-muted-foreground'>
                  {String(i + 1).padStart(2, '0')}
                </span>
                {hook}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ── Footer ── */}
      <footer className='border-t border-border pt-4 print:mt-6'>
        <p className='font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground'>
          Herald · Forensic Match Audit · heyherald.com
        </p>
      </footer>
    </article>
  )
}
