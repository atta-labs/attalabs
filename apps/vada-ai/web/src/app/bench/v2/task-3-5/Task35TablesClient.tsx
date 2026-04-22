'use client'

import Link from 'next/link'
import { BenchTable, type ColumnDef } from '../../components/BenchTable'
import { DiagnosisBadge } from '../../components/DiagnosisBadge'
import { TerminalStateBadge } from '../../components/TerminalStateBadge'
import { CostCell } from '../../components/CostCell'
import { QuestionCell } from '../../components/QuestionCell'
import type { V2OrchestrationRow, V2JudgeRow, V2BaselineRow } from '../../lib/queries'

const ORCH_COLUMNS: ColumnDef<V2OrchestrationRow>[] = [
  {
    key: 'questionId',
    header: 'Q ID',
    render: (r) => <span className='font-mono text-xs'>{r.questionId}</span>,
    sortValue: (r) => r.questionId,
    csvValue: (r) => r.questionId,
  },
  {
    key: 'runIndex',
    header: 'Run',
    render: (r) => <span className='font-mono text-xs'>{r.runIndex}</span>,
    sortValue: (r) => r.runIndex,
    csvValue: (r) => r.runIndex,
  },
  {
    key: 'terminalState',
    header: 'Terminal',
    render: (r) => <TerminalStateBadge state={r.terminalState} />,
    sortValue: (r) => r.terminalState ?? '',
    csvValue: (r) => r.terminalState ?? '',
  },
  {
    key: 'elapsedMs',
    header: 'Elapsed',
    render: (r) => <span className='font-mono text-xs text-muted-foreground'>{(r.elapsedMs / 1000).toFixed(1)}s</span>,
    sortValue: (r) => r.elapsedMs,
    csvValue: (r) => r.elapsedMs,
  },
  {
    key: 'sessionId',
    header: 'Session',
    render: (r) =>
      r.sessionId ? (
        <Link href={`/deliberation/${r.sessionId}`} className='font-mono text-xs text-primary hover:underline'>
          {r.sessionId.slice(0, 8)}…
        </Link>
      ) : (
        <span className='text-muted-foreground text-xs'>—</span>
      ),
    csvValue: (r) => r.sessionId ?? '',
  },
]

const JUDGE_COLUMNS: ColumnDef<V2JudgeRow>[] = [
  {
    key: 'question',
    header: 'Question',
    render: (r) => <QuestionCell text={r.question} maxLen={50} />,
    sortValue: (r) => r.question,
    csvValue: (r) => r.question,
  },
  {
    key: 'runIndex',
    header: 'Run',
    render: (r) => <span className='font-mono text-xs'>{r.runIndex ?? '—'}</span>,
    sortValue: (r) => r.runIndex ?? -1,
    csvValue: (r) => r.runIndex ?? '',
  },
  {
    key: 'diagnosis',
    header: 'Verdict',
    render: (r) => <DiagnosisBadge diagnosis={r.diagnosis} />,
    sortValue: (r) => r.diagnosis ?? '',
    csvValue: (r) => r.diagnosis ?? '',
  },
  {
    key: 'cost',
    header: 'Cost',
    render: (r) => <CostCell modelId={r.modelId} tokensInput={r.tokensInput} tokensOutput={r.tokensOutput} />,
    csvValue: (r) => r.modelId,
  },
]

const BASELINE_COLUMNS: ColumnDef<V2BaselineRow>[] = [
  {
    key: 'questionId',
    header: 'Q ID',
    render: (r) => <span className='font-mono text-xs'>{r.questionId}</span>,
    sortValue: (r) => r.questionId,
    csvValue: (r) => r.questionId,
  },
  {
    key: 'variant',
    header: 'Variant',
    render: (r) => <span className='font-mono text-xs'>{r.variant}</span>,
    sortValue: (r) => r.variant,
    csvValue: (r) => r.variant,
  },
  {
    key: 'runIndex',
    header: 'Run',
    render: (r) => <span className='font-mono text-xs'>{r.runIndex}</span>,
    sortValue: (r) => r.runIndex,
    csvValue: (r) => r.runIndex,
  },
  {
    key: 'schemaValid',
    header: 'Valid',
    render: (r) =>
      r.schemaValid == null ? (
        <span className='text-muted-foreground text-xs'>—</span>
      ) : r.schemaValid ? (
        <span className='text-success text-xs font-mono'>Y</span>
      ) : (
        <span className='text-destructive text-xs font-mono'>N</span>
      ),
    sortValue: (r) => (r.schemaValid ? 1 : 0),
    csvValue: (r) => (r.schemaValid == null ? '' : r.schemaValid ? 'Y' : 'N'),
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
    csvValue: (r) => `${r.tokensInput ?? ''}/${r.tokensOutput ?? ''}`,
  },
  {
    key: 'cost',
    header: 'Cost',
    render: (r) => <CostCell modelId={r.modelId} tokensInput={r.tokensInput} tokensOutput={r.tokensOutput} />,
    csvValue: (r) => r.modelId,
  },
]

export function Task35TablesClient({
  haikuOrcRuns,
  sonnetOrcRuns,
  haikuJudge,
  sonnetJudge,
  sonnetBaselineRuns,
  sonnetBaselineJudge,
}: {
  haikuOrcRuns: V2OrchestrationRow[]
  sonnetOrcRuns: V2OrchestrationRow[]
  haikuJudge: V2JudgeRow[]
  sonnetJudge: V2JudgeRow[]
  sonnetBaselineRuns: V2BaselineRow[]
  sonnetBaselineJudge: V2JudgeRow[]
}) {
  return (
    <div className='space-y-10'>
      {/* Orchestration side by side */}
      <div className='grid grid-cols-1 gap-8 lg:grid-cols-2'>
        <section className='space-y-3'>
          <h2 className='font-serif text-lg font-semibold'>Haiku B0 Runs</h2>
          <BenchTable
            rows={haikuOrcRuns}
            columns={ORCH_COLUMNS}
            searchKeys={['questionId', 'terminalState']}
            filename='task-3-5-haiku-orch.csv'
            defaultSortKey='questionId'
          />
        </section>

        <section className='space-y-3'>
          <h2 className='font-serif text-lg font-semibold'>Sonnet B0 Runs</h2>
          <BenchTable
            rows={sonnetOrcRuns}
            columns={ORCH_COLUMNS}
            searchKeys={['questionId', 'terminalState']}
            filename='task-3-5-sonnet-orch.csv'
            defaultSortKey='questionId'
          />
        </section>
      </div>

      {/* Judge verdicts side by side */}
      <div className='grid grid-cols-1 gap-8 lg:grid-cols-2'>
        <section className='space-y-3'>
          <h2 className='font-serif text-lg font-semibold'>Haiku Judge Verdicts</h2>
          <BenchTable
            rows={haikuJudge}
            columns={JUDGE_COLUMNS}
            searchKeys={['question', 'diagnosis']}
            filename='task-3-5-haiku-judge.csv'
            defaultSortKey='question'
          />
        </section>

        <section className='space-y-3'>
          <h2 className='font-serif text-lg font-semibold'>Sonnet Judge Verdicts</h2>
          <BenchTable
            rows={sonnetJudge}
            columns={JUDGE_COLUMNS}
            searchKeys={['question', 'diagnosis']}
            filename='task-3-5-sonnet-judge.csv'
            defaultSortKey='question'
          />
        </section>
      </div>

      {/* Sonnet baseline (A0S vs A1S) */}
      {sonnetBaselineRuns.length > 0 && (
        <section className='space-y-3'>
          <h2 className='font-serif text-lg font-semibold'>Sonnet Baseline Runs (A0S + A1S)</h2>
          <BenchTable
            rows={sonnetBaselineRuns}
            columns={BASELINE_COLUMNS}
            searchKeys={['questionId', 'variant']}
            filename='task-3-5-sonnet-baseline.csv'
            defaultSortKey='questionId'
          />
        </section>
      )}

      {sonnetBaselineJudge.length > 0 && (
        <section className='space-y-3'>
          <h2 className='font-serif text-lg font-semibold'>Sonnet Baseline Judge (A0S vs A1S)</h2>
          <BenchTable
            rows={sonnetBaselineJudge}
            columns={JUDGE_COLUMNS}
            searchKeys={['question', 'diagnosis']}
            filename='task-3-5-sonnet-baseline-judge.csv'
            defaultSortKey='question'
          />
        </section>
      )}
    </div>
  )
}
