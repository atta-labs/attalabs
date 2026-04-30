'use client'

import { BenchTable, type ColumnDef } from '../../components/BenchTable'
import { DiagnosisBadge } from '../../components/DiagnosisBadge'
import { CostCell } from '../../components/CostCell'
import { QuestionCell } from '../../components/QuestionCell'
import type { V2BaselineRow, V2JudgeRow } from '../../lib/queries'

const BASELINE_COLUMNS: ColumnDef<V2BaselineRow>[] = [
  {
    key: 'questionId',
    header: 'Q ID',
    render: (r) => <span className='font-mono text-xs'>{r.questionId}</span>,
    sortValue: (r) => r.questionId,
    csvValue: (r) => r.questionId
  },
  {
    key: 'questionText',
    header: 'Question',
    render: (r) => <QuestionCell text={r.questionText} maxLen={60} />,
    sortValue: (r) => r.questionText,
    csvValue: (r) => r.questionText
  },
  {
    key: 'variant',
    header: 'Variant',
    render: (r) => <span className='font-mono text-xs'>{r.variant}</span>,
    sortValue: (r) => r.variant,
    csvValue: (r) => r.variant
  },
  {
    key: 'runIndex',
    header: 'Run',
    render: (r) => <span className='font-mono text-xs'>{r.runIndex}</span>,
    sortValue: (r) => r.runIndex,
    csvValue: (r) => r.runIndex
  },
  {
    key: 'schemaValid',
    header: 'Schema valid',
    render: (r) =>
      r.schemaValid == null ? (
        <span className='text-muted-foreground text-xs'>—</span>
      ) : r.schemaValid ? (
        <span className='text-success text-xs font-mono'>Y</span>
      ) : (
        <span className='text-destructive text-xs font-mono'>N</span>
      ),
    sortValue: (r) => (r.schemaValid ? 1 : 0),
    csvValue: (r) => (r.schemaValid == null ? '' : r.schemaValid ? 'Y' : 'N')
  },
  {
    key: 'tokens',
    header: 'Tokens in/out',
    render: (r) => (
      <span className='font-mono text-xs text-muted-foreground'>
        {r.tokensInput?.toLocaleString() ?? '—'} / {r.tokensOutput?.toLocaleString() ?? '—'}
      </span>
    ),
    sortValue: (r) => (r.tokensInput ?? 0) + (r.tokensOutput ?? 0),
    csvValue: (r) => `${r.tokensInput ?? ''}/${r.tokensOutput ?? ''}`
  },
  {
    key: 'cost',
    header: 'Cost',
    render: (r) => <CostCell modelId={r.modelId} tokensInput={r.tokensInput} tokensOutput={r.tokensOutput} />,
    sortValue: (r) => (r.tokensInput ?? 0) + (r.tokensOutput ?? 0),
    csvValue: (r) => r.modelId
  },
  {
    key: 'elapsedMs',
    header: 'Elapsed',
    render: (r) => <span className='font-mono text-xs text-muted-foreground'>{(r.elapsedMs / 1000).toFixed(1)}s</span>,
    sortValue: (r) => r.elapsedMs,
    csvValue: (r) => r.elapsedMs
  },
  {
    key: 'responseSnippet',
    header: 'Response snippet',
    render: (r) => (
      <span className='text-xs text-muted-foreground line-clamp-2 max-w-xs'>{r.responseText.slice(0, 150)}</span>
    ),
    csvValue: (r) => r.responseText.slice(0, 300)
  }
]

const JUDGE_COLUMNS: ColumnDef<V2JudgeRow>[] = [
  {
    key: 'question',
    header: 'Question',
    render: (r) => <QuestionCell text={r.question} maxLen={50} />,
    sortValue: (r) => r.question,
    csvValue: (r) => r.question
  },
  {
    key: 'runIndex',
    header: 'Run',
    render: (r) => <span className='font-mono text-xs'>{r.runIndex ?? '—'}</span>,
    sortValue: (r) => r.runIndex ?? -1,
    csvValue: (r) => r.runIndex ?? ''
  },
  {
    key: 'systemADescription',
    header: 'System A',
    render: (r) => <span className='font-mono text-xs text-muted-foreground'>{r.systemADescription}</span>,
    csvValue: (r) => r.systemADescription
  },
  {
    key: 'diagnosis',
    header: 'Verdict',
    render: (r) => <DiagnosisBadge diagnosis={r.diagnosis} />,
    sortValue: (r) => r.diagnosis ?? '',
    csvValue: (r) => r.diagnosis ?? ''
  },
  {
    key: 'judgeSnippet',
    header: 'Judge snippet',
    render: (r) => (
      <span className='text-xs text-muted-foreground line-clamp-2 max-w-xs'>{r.judgeResponse.slice(0, 150)}</span>
    ),
    csvValue: (r) => r.judgeResponse.slice(0, 300)
  },
  {
    key: 'tokens',
    header: 'Tokens in/out',
    render: (r) => (
      <span className='font-mono text-xs text-muted-foreground'>
        {r.tokensInput?.toLocaleString() ?? '—'} / {r.tokensOutput?.toLocaleString() ?? '—'}
      </span>
    ),
    sortValue: (r) => (r.tokensInput ?? 0) + (r.tokensOutput ?? 0),
    csvValue: (r) => `${r.tokensInput ?? ''}/${r.tokensOutput ?? ''}`
  },
  {
    key: 'cost',
    header: 'Cost',
    render: (r) => <CostCell modelId={r.modelId} tokensInput={r.tokensInput} tokensOutput={r.tokensOutput} />,
    csvValue: (r) => r.modelId
  }
]

export function Task2TablesClient({
  baselineRuns,
  judgeResults
}: {
  baselineRuns: V2BaselineRow[]
  judgeResults: V2JudgeRow[]
}) {
  return (
    <div className='space-y-8'>
      <section className='space-y-3'>
        <h2 className='font-serif text-lg font-semibold'>Baseline Runs (A0 + A1)</h2>
        <BenchTable
          rows={baselineRuns}
          columns={BASELINE_COLUMNS}
          searchKeys={['questionId', 'questionText', 'variant']}
          filename='v2-task-2-baseline-runs.csv'
          defaultSortKey='questionId'
        />
      </section>

      <section className='space-y-3'>
        <h2 className='font-serif text-lg font-semibold'>Judge Comparisons</h2>
        <BenchTable
          rows={judgeResults}
          columns={JUDGE_COLUMNS}
          searchKeys={['question', 'diagnosis']}
          filename='v2-task-2-judge-results.csv'
          defaultSortKey='question'
        />
      </section>
    </div>
  )
}
