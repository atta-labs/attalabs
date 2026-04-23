'use client'

// Benchmark report for one session. Layout:
//   Header       — the Principal's question + session wall-clock
//   Branch diagram — the question forks into two branches (Vāda, single-shot)
//   Metrics table— tokens in/out/total + elapsed ms + call count per branch
//   Two panels   — Vāda synthesis | Single-shot baseline, side-by-side markdown
//   Judge card   — model's comparison verdict (markdown)
//
// All data is server-fetched by the parent page. This is pure presentation.

import { ModelIcon } from '@atta/ui'
import { NextLink } from '@atta/ui/lib/next-link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MARKDOWN_COMPONENTS } from '../../components/markdown-components'

interface BranchMetrics {
  label: string
  callCount: number | null
  tokensInput: number | null
  tokensOutput: number | null
  elapsedMs: number | null
  model: string | null
}

interface BenchmarkReportProps {
  sessionId: string
  question: string
  sessionProvider: string | null
  sessionModelId: string | null
  sessionCreatedAt: string
  sessionUpdatedAt: string
  terminalState: string | null
  vadaRecommendation: string | null
  baseline: {
    answer: string | null
    provider: string | null
    modelId: string | null
    tokensInput: number | null
    tokensOutput: number | null
    elapsedMs: number | null
    createdAt: string | null
  }
  deliberation: {
    tokensInput: number
    tokensOutput: number
    sumElapsedMs: number
    callCount: number
  }
  judge: {
    response: string | null
    provider: string | null
    modelId: string | null
    diagnosis: string | null
    tokensInput: number | null
    tokensOutput: number | null
    elapsedMs: number | null
    createdAt: string | null
  }
}

const DIAGNOSIS_META: Record<string, { label: string; className: string }> = {
  VADA_WON: { label: 'Vāda won', className: 'text-success border-success/40 bg-success/5' },
  BASELINE_WON: { label: 'Baseline won', className: 'text-warning border-warning/40 bg-warning/5' },
  TIE: { label: 'Tie', className: 'text-muted-foreground border-border bg-card/40' },
  NEGLIGIBLE_DIFFERENCE: {
    label: 'No meaningful difference',
    className: 'text-muted-foreground border-border bg-card/40'
  },
  PIPELINE_FAILURE: { label: 'Pipeline failure', className: 'text-destructive border-destructive/40 bg-destructive/5' }
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toLocaleString()
}

function fmtMs(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n < 1000) return `${n} ms`
  return `${(n / 1000).toFixed(1)} s`
}

export function BenchmarkReport(props: BenchmarkReportProps) {
  const wallMs = new Date(props.sessionUpdatedAt).getTime() - new Date(props.sessionCreatedAt).getTime()

  const vada: BranchMetrics = {
    label: 'Vāda deliberation',
    callCount: props.deliberation.callCount,
    tokensInput: props.deliberation.tokensInput || null,
    tokensOutput: props.deliberation.tokensOutput || null,
    elapsedMs: wallMs,
    model: props.sessionModelId
  }
  const baseline: BranchMetrics = {
    label: 'Single-shot baseline',
    callCount: props.baseline.answer ? 1 : 0,
    tokensInput: props.baseline.tokensInput,
    tokensOutput: props.baseline.tokensOutput,
    elapsedMs: props.baseline.elapsedMs,
    model: props.baseline.modelId
  }

  return (
    <div className='mx-auto w-full max-w-[980px] space-y-8 px-5 py-8'>
      {/* Header */}
      <header className='space-y-2'>
        <NextLink variant='prose' href={`/autonomous/deliberation/${props.sessionId}`}>
          ← Back to deliberation
        </NextLink>
        <h1 className='font-serif text-2xl'>Benchmark comparison</h1>
        <div className='rounded-lg border border-border bg-card/40 p-4'>
          <div className='mb-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground'>
            Your Question
          </div>
          <p className='text-[15px] leading-relaxed text-foreground/90'>{props.question}</p>
        </div>
      </header>

      {/* Branch diagram — question forks into two lanes */}
      <div className='rounded-lg border border-border bg-card/20 p-6'>
        <div className='flex flex-col items-center gap-2'>
          <div className='rounded-full border border-border bg-card px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground'>
            Original prompt
          </div>
          <div className='h-6 w-px bg-border' />
          <div className='relative flex w-full items-start justify-around'>
            <div aria-hidden className='absolute top-0 left-1/4 right-1/4 h-px bg-border' />
            <BranchColumn label={vada.label} model={vada.model} badge='Vāda' />
            <BranchColumn label={baseline.label} model={baseline.model} badge='Single-shot' />
          </div>
        </div>
      </div>

      {/* Metrics table */}
      <div className='overflow-hidden rounded-lg border border-border'>
        <table className='w-full border-collapse text-[13px]'>
          <thead className='bg-card/60'>
            <tr>
              <th className='px-4 py-2 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'>
                Metric
              </th>
              <th className='px-4 py-2 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'>
                Vāda
              </th>
              <th className='px-4 py-2 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'>
                Single-shot
              </th>
              <th className='px-4 py-2 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'>
                Ratio
              </th>
            </tr>
          </thead>
          <tbody>
            <MetricRow label='Calls' vada={vada.callCount} baseline={baseline.callCount} format={fmt} />
            <MetricRow label='Input tokens' vada={vada.tokensInput} baseline={baseline.tokensInput} format={fmt} />
            <MetricRow label='Output tokens' vada={vada.tokensOutput} baseline={baseline.tokensOutput} format={fmt} />
            <MetricRow
              label='Total tokens'
              vada={sumOrNull(vada.tokensInput, vada.tokensOutput)}
              baseline={sumOrNull(baseline.tokensInput, baseline.tokensOutput)}
              format={fmt}
            />
            <MetricRow label='Wall clock' vada={vada.elapsedMs} baseline={baseline.elapsedMs} format={fmtMs} />
          </tbody>
        </table>
      </div>

      {/* Side-by-side responses */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <ResponsePanel
          label='Vāda synthesis'
          subtitle={props.terminalState ? `Terminal · ${props.terminalState}` : '—'}
          content={props.vadaRecommendation}
          emptyMessage={
            props.terminalState === 'ERROR'
              ? "Synthesis failed — the model's output could not be parsed into a valid conclusion."
              : undefined
          }
        />
        <ResponsePanel label='Single-shot baseline' subtitle='Raw single call' content={props.baseline.answer} />
      </div>

      {/* Judge verdict */}
      <section className='space-y-3'>
        <div className='flex items-center justify-between gap-3'>
          <div className='flex items-center gap-3'>
            <h2 className='font-serif text-lg'>Judge verdict</h2>
            {props.judge.diagnosis && DIAGNOSIS_META[props.judge.diagnosis] && (
              <span
                className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${DIAGNOSIS_META[props.judge.diagnosis]?.className}`}
              >
                {DIAGNOSIS_META[props.judge.diagnosis]?.label}
              </span>
            )}
            {props.judge.modelId && (
              <span className='font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'>
                judged by {props.judge.modelId}
              </span>
            )}
          </div>
          {props.judge.elapsedMs != null && (
            <span className='font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'>
              {fmtMs(props.judge.elapsedMs)} · {fmt(props.judge.tokensInput)} in · {fmt(props.judge.tokensOutput)} out
            </span>
          )}
        </div>
        {props.judge.response ? (
          <div className='rounded-lg border border-border bg-card/60 p-5 text-[14px] leading-relaxed text-foreground/90'>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
              {props.judge.response}
            </ReactMarkdown>
          </div>
        ) : (
          <div className='rounded-lg border border-dashed border-border p-5 text-sm italic text-muted-foreground'>
            Judge verdict not yet generated. It fires automatically after the deliberation completes AND the baseline
            lands AND your key is in memory. Return to the deliberation page to trigger it, or refresh if the judge is
            already mid-flight.
          </div>
        )}
      </section>
    </div>
  )
}

function BranchColumn({ label, model, badge }: { label: string; model: string | null; badge: string }) {
  return (
    <div className='relative flex flex-col items-center gap-2'>
      <div className='h-6 w-px bg-border' />
      <div className='rounded-md border border-border bg-card px-3 py-2 text-center'>
        <div className='font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground'>{badge}</div>
        <div className='text-[12px] font-medium'>{label}</div>
        {model && (
          <div className='mt-1 inline-flex items-center gap-1 rounded border border-border bg-card/40 px-1.5 py-0.5'>
            <ModelIcon model={model} size={12} type='avatar' />
            <span className='font-mono text-[9px] text-foreground/80'>{model}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function MetricRow({
  label,
  vada,
  baseline,
  format
}: {
  label: string
  vada: number | null | undefined
  baseline: number | null | undefined
  format: (n: number | null | undefined) => string
}) {
  const ratio = vada != null && baseline && baseline !== 0 ? `${(vada / baseline).toFixed(1)}×` : '—'
  return (
    <tr className='border-t border-border'>
      <td className='px-4 py-2 text-muted-foreground'>{label}</td>
      <td className='px-4 py-2 text-right font-mono'>{format(vada)}</td>
      <td className='px-4 py-2 text-right font-mono'>{format(baseline)}</td>
      <td className='px-4 py-2 text-right font-mono text-muted-foreground'>{ratio}</td>
    </tr>
  )
}

function ResponsePanel({
  label,
  subtitle,
  content,
  emptyMessage
}: {
  label: string
  subtitle: string
  content: string | null
  emptyMessage?: string
}) {
  return (
    <div className='flex flex-col rounded-lg border border-border bg-card/40'>
      <div className='flex items-center justify-between border-b border-border px-4 py-2'>
        <span className='font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground'>{label}</span>
        <span className='font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground'>{subtitle}</span>
      </div>
      <div className='max-h-[420px] overflow-y-auto px-4 py-3 text-[13px] leading-relaxed text-foreground/90'>
        {content ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
            {content}
          </ReactMarkdown>
        ) : (
          <span className='italic text-muted-foreground'>{emptyMessage ?? 'Not available yet.'}</span>
        )}
      </div>
    </div>
  )
}

function sumOrNull(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null && b == null) return null
  return (a ?? 0) + (b ?? 0)
}
