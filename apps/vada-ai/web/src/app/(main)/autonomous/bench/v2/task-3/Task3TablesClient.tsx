'use client'

import Link from 'next/link'
import { BenchTable, type ColumnDef } from '../../components/BenchTable'
import { DiagnosisBadge } from '../../components/DiagnosisBadge'
import { TerminalStateBadge } from '../../components/TerminalStateBadge'
import { CostCell } from '../../components/CostCell'
import { QuestionCell } from '../../components/QuestionCell'
import type { V2OrchestrationRow, V2JudgeRow } from '../../lib/queries'

const ORCH_COLUMNS: ColumnDef<V2OrchestrationRow>[] = [
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
    key: 'runIndex',
    header: 'Run',
    render: (r) => <span className='font-mono text-xs'>{r.runIndex}</span>,
    sortValue: (r) => r.runIndex,
    csvValue: (r) => r.runIndex
  },
  {
    key: 'terminalState',
    header: 'Terminal',
    render: (r) => <TerminalStateBadge state={r.terminalState} />,
    sortValue: (r) => r.terminalState ?? '',
    csvValue: (r) => r.terminalState ?? ''
  },
  {
    key: 'elapsedMs',
    header: 'Elapsed',
    render: (r) => <span className='font-mono text-xs text-muted-foreground'>{(r.elapsedMs / 1000).toFixed(1)}s</span>,
    sortValue: (r) => r.elapsedMs,
    csvValue: (r) => r.elapsedMs
  },
  {
    key: 'conclusionSnippet',
    header: 'Conclusion snippet',
    render: (r) =>
      r.conclusionText ? (
        <span className='text-xs text-muted-foreground line-clamp-2 max-w-xs'>{r.conclusionText.slice(0, 150)}</span>
      ) : (
        <span className='text-muted-foreground text-xs'>—</span>
      ),
    csvValue: (r) => r.conclusionText?.slice(0, 300) ?? ''
  },
  {
    key: 'sessionId',
    header: 'Session',
    render: (r) =>
      r.sessionId ? (
        <Link
          href={`/autonomous/deliberation/${r.sessionId}`}
          className='font-mono text-xs text-primary hover:underline'
        >
          {r.sessionId.slice(0, 8)}…
        </Link>
      ) : (
        <span className='text-muted-foreground text-xs'>—</span>
      ),
    csvValue: (r) => r.sessionId ?? ''
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

export function Task3TablesClient({
  orchRuns,
  judgeResults
}: {
  orchRuns: V2OrchestrationRow[]
  judgeResults: V2JudgeRow[]
}) {
  return (
    <div className='space-y-8'>
      <section className='space-y-3'>
        <h2 className='font-serif text-lg font-semibold'>B0 Orchestration Runs</h2>
        <BenchTable
          rows={orchRuns}
          columns={ORCH_COLUMNS}
          searchKeys={['questionId', 'questionText', 'terminalState']}
          filename='v2-task-3-orch-runs.csv'
          defaultSortKey='questionId'
        />
      </section>

      <section className='space-y-3'>
        <h2 className='font-serif text-lg font-semibold'>Judge Comparisons (A0 vs B0)</h2>
        <BenchTable
          rows={judgeResults}
          columns={JUDGE_COLUMNS}
          searchKeys={['question', 'diagnosis']}
          filename='v2-task-3-judge-results.csv'
          defaultSortKey='question'
        />
      </section>
    </div>
  )
}
