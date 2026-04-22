import Link from 'next/link'
import { getV2Task2Data } from '../../lib/queries'
import { Task2TablesClient } from './Task2TablesClient'
import { AggregationCard, StatRow } from '../../components/AggregationCard'

export default async function Task2Page() {
  const { baselineRuns, judgeResults } = await getV2Task2Data()

  const a0Runs = baselineRuns.filter((r) => r.variant === 'A0')
  const a1Runs = baselineRuns.filter((r) => r.variant === 'A1')

  // Aggregations
  const diagCounts: Record<string, number> = {}
  for (const j of judgeResults) {
    const d = j.diagnosis ?? 'UNJUDGED'
    diagCounts[d] = (diagCounts[d] ?? 0) + 1
  }

  const a0WinCount = judgeResults.filter((j) => {
    const sysA = j.systemADescription.toLowerCase()
    return (sysA.includes('a0') && j.diagnosis === 'A') || (!sysA.includes('a0') && j.diagnosis === 'B')
  }).length

  const total = judgeResults.length
  const a0WinRate = total > 0 ? (a0WinCount / total) * 100 : 0

  const a0ParseRate = a0Runs.length > 0 ? (a0Runs.filter((r) => r.schemaValid).length / a0Runs.length) * 100 : null
  const a1ParseRate = a1Runs.length > 0 ? (a1Runs.filter((r) => r.schemaValid).length / a1Runs.length) * 100 : null

  return (
    <div className='space-y-6 max-w-7xl'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='font-serif text-2xl font-semibold'>Task 2 — A0 vs A1 Baseline Ceiling</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Haiku 4.5 · 15 questions · N=3 · Does rich prompting raise the baseline?
          </p>
        </div>
        <Link href='/bench' className='text-sm text-muted-foreground hover:text-foreground'>
          ← Overview
        </Link>
      </div>

      <div className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
        <AggregationCard title='A0 runs'>
          <p className='font-mono text-2xl'>{a0Runs.length}</p>
        </AggregationCard>
        <AggregationCard title='A1 runs'>
          <p className='font-mono text-2xl'>{a1Runs.length}</p>
        </AggregationCard>
        <AggregationCard title='Judge comparisons'>
          <p className='font-mono text-2xl'>{judgeResults.length}</p>
        </AggregationCard>
        <AggregationCard title='A0 win rate'>
          <p className='font-mono text-2xl'>{total > 0 ? `${a0WinRate.toFixed(1)}%` : '—'}</p>
        </AggregationCard>
      </div>

      <div className='grid grid-cols-2 gap-4 sm:grid-cols-3'>
        <AggregationCard title='Judge verdicts'>
          {Object.entries(diagCounts).map(([d, n]) => (
            <StatRow key={d} label={d} value={`${n} (${total > 0 ? ((n / total) * 100).toFixed(0) : 0}%)`} />
          ))}
        </AggregationCard>
        {(a0ParseRate !== null || a1ParseRate !== null) && (
          <AggregationCard title='Schema valid rate'>
            {a0ParseRate !== null && <StatRow label='A0' value={`${a0ParseRate.toFixed(1)}%`} />}
            {a1ParseRate !== null && <StatRow label='A1' value={`${a1ParseRate.toFixed(1)}%`} />}
          </AggregationCard>
        )}
      </div>

      <Task2TablesClient baselineRuns={baselineRuns} judgeResults={judgeResults} />
    </div>
  )
}
