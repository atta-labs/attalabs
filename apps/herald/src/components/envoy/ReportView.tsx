import type { MatchReport } from '@/lib/types'

export function ReportView({ report }: { report: MatchReport }) {
  return (
    <article className='mx-auto max-w-[680px] px-6 py-12 print:max-w-none print:px-0 print:py-0'>
      {/* ── Header ── */}
      <header className='mb-8 border-b border-border pb-6'>
        <p className='font-mono text-[10px] uppercase tracking-[0.25em] text-muted'>Forensic Engineering Audit</p>
        <h1 className='mt-2 font-display text-2xl tracking-tight'>{report.candidate.name}</h1>
        <p className='mt-0.5 font-mono text-xs text-muted'>{report.candidate.title}</p>
      </header>

      {/* ── Decision Anchor ── */}
      <section className='mb-8 border-b border-border pb-8'>
        <div className='font-display text-[80px] leading-none tracking-tight'>{report.grade}</div>
        <div className='mt-2'>
          <p className='font-mono text-sm font-medium uppercase tracking-wider'>{report.recommendation}</p>
          <p className='font-mono text-[10px] uppercase tracking-[0.2em] text-muted'>Confidence: {report.confidence}</p>
        </div>

        <ul className='mt-6 space-y-1'>
          {report.confidence_reasoning.map((reason) => (
            <li key={reason} className='text-[13px] leading-relaxed text-muted'>
              <span className='mr-2 text-foreground/40'>—</span>
              {reason}
            </li>
          ))}
        </ul>
      </section>

      {/* ── Engineering Signals ── */}
      <section className='mb-8 border-b border-border pb-8'>
        <h2 className='mb-4 font-mono text-[10px] uppercase tracking-[0.25em] text-muted'>Engineering Signals</h2>

        <div className='space-y-4'>
          {report.engineering_signal.map((signal) => (
            <div key={signal.title} className='border-l border-foreground/10 pl-3'>
              <div className='flex items-baseline justify-between gap-3'>
                <h3 className='font-mono text-[13px] font-medium'>{signal.title}</h3>
                <span className='shrink-0 font-mono text-[9px] uppercase tracking-[0.2em] text-muted'>
                  {signal.confidence}
                </span>
              </div>
              <p className='mt-0.5 text-[12px] leading-relaxed text-muted'>{signal.observation}</p>
              <p className='mt-0.5 text-[13px] leading-relaxed'>{signal.interpretation}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Gaps ── */}
      <section className='mb-8 border-b border-border pb-8'>
        <h2 className='mb-4 font-mono text-[10px] uppercase tracking-[0.25em] text-muted'>Identified Gaps</h2>

        <div className='space-y-3'>
          {report.gaps.map((item) => (
            <div key={item.gap} className='border-l border-foreground/10 pl-3'>
              <p className='text-[13px] font-medium'>{item.gap}</p>
              <p className='mt-0.5 text-[12px] leading-relaxed text-muted'>Mitigation: {item.mitigation}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Interview Hooks ── */}
      <section className='mb-8'>
        <h2 className='mb-4 font-mono text-[10px] uppercase tracking-[0.25em] text-muted'>
          Recommended Interview Questions
        </h2>

        <ol className='space-y-2'>
          {report.interview_hooks.map((hook, i) => (
            <li key={hook} className='flex gap-3 text-[13px] leading-relaxed'>
              <span className='shrink-0 font-mono text-[10px] text-muted'>{String(i + 1).padStart(2, '0')}</span>
              {hook}
            </li>
          ))}
        </ol>
      </section>

      {/* ── Footer ── */}
      <footer className='border-t border-border pt-4 print:mt-6'>
        <p className='font-mono text-[9px] uppercase tracking-[0.25em] text-muted'>
          Herald · Forensic Engineering Audit · heyherald.com
        </p>
      </footer>
    </article>
  )
}
