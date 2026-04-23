'use client'

import Link from 'next/link'
import { BenchTable, type ColumnDef } from '../components/BenchTable'
import { DiagnosisBadge } from '../components/DiagnosisBadge'
import { TerminalStateBadge } from '../components/TerminalStateBadge'
import { StaticCostCell } from '../components/CostCell'
import { QuestionCell } from '../components/QuestionCell'
import type { V1BenchRow } from '../lib/queries'

const COLUMNS: ColumnDef<V1BenchRow>[] = [
  {
    key: 'createdAt',
    header: 'Date',
    render: (r) => (
      <span className='font-mono text-xs text-muted-foreground whitespace-nowrap'>
        {new Date(r.createdAt).toLocaleDateString()}
      </span>
    ),
    sortValue: (r) => new Date(r.createdAt).getTime(),
    csvValue: (r) => new Date(r.createdAt).toISOString()
  },
  {
    key: 'question',
    header: 'Question',
    render: (r) => <QuestionCell text={r.question} maxLen={60} />,
    sortValue: (r) => r.question,
    csvValue: (r) => r.question
  },
  {
    key: 'terminalState',
    header: 'Terminal',
    render: (r) => <TerminalStateBadge state={r.terminalState} />,
    sortValue: (r) => r.terminalState ?? '',
    csvValue: (r) => r.terminalState ?? ''
  },
  {
    key: 'judgeDiagnosis',
    header: 'Diagnosis',
    render: (r) => <DiagnosisBadge diagnosis={r.judgeDiagnosis} />,
    sortValue: (r) => r.judgeDiagnosis ?? '',
    csvValue: (r) => r.judgeDiagnosis ?? ''
  },
  {
    key: 'baselineAnswer',
    header: 'Baseline snippet',
    render: (r) =>
      r.baselineAnswer ? (
        <span className='text-xs text-muted-foreground line-clamp-2 max-w-xs'>{r.baselineAnswer.slice(0, 150)}</span>
      ) : (
        <span className='text-xs text-muted-foreground'>—</span>
      ),
    csvValue: (r) => r.baselineAnswer?.slice(0, 300) ?? ''
  },
  {
    key: 'delibTokens',
    header: 'Delib tokens in/out',
    render: (r) => (
      <span className='font-mono text-xs text-muted-foreground'>
        {r.deliberationTokensInput.toLocaleString()} / {r.deliberationTokensOutput.toLocaleString()}
      </span>
    ),
    sortValue: (r) => r.deliberationTokensInput + r.deliberationTokensOutput,
    csvValue: (r) => `${r.deliberationTokensInput}/${r.deliberationTokensOutput}`
  },
  {
    key: 'delibTime',
    header: 'Delib time',
    render: (r) => (
      <span className='font-mono text-xs text-muted-foreground'>{(r.deliberationSumElapsedMs / 1000).toFixed(1)}s</span>
    ),
    sortValue: (r) => r.deliberationSumElapsedMs,
    csvValue: (r) => r.deliberationSumElapsedMs
  },
  {
    key: 'baselineTokens',
    header: 'Baseline tokens in/out',
    render: (r) => (
      <span className='font-mono text-xs text-muted-foreground'>
        {r.baselineTokensInput?.toLocaleString() ?? '—'} / {r.baselineTokensOutput?.toLocaleString() ?? '—'}
      </span>
    ),
    csvValue: (r) => `${r.baselineTokensInput ?? ''}/${r.baselineTokensOutput ?? ''}`
  },
  {
    key: 'judgeTokens',
    header: 'Judge tokens in/out',
    render: (r) => (
      <span className='font-mono text-xs text-muted-foreground'>
        {r.judgeTokensInput?.toLocaleString() ?? '—'} / {r.judgeTokensOutput?.toLocaleString() ?? '—'}
      </span>
    ),
    csvValue: (r) => `${r.judgeTokensInput ?? ''}/${r.judgeTokensOutput ?? ''}`
  },
  {
    key: 'totalCost',
    header: 'Cost',
    render: (r) => <StaticCostCell cost={r.totalCost} />,
    sortValue: (r) => r.totalCost,
    csvValue: (r) => r.totalCost.toFixed(6)
  },
  {
    key: 'sessionId',
    header: 'Session',
    render: (r) => (
      <Link href={`/autonomous/deliberation/${r.sessionId}`} className='font-mono text-xs text-primary hover:underline'>
        {r.sessionId.slice(0, 8)}…
      </Link>
    ),
    csvValue: (r) => r.sessionId
  }
]

export function V1BenchTableClient({ rows }: { rows: V1BenchRow[] }) {
  return (
    <BenchTable
      rows={rows}
      columns={COLUMNS}
      searchKeys={['question', 'judgeDiagnosis', 'terminalState']}
      filename='v1-bench.csv'
      defaultSortKey='createdAt'
    />
  )
}
