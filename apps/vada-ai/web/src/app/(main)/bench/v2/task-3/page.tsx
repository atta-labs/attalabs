import Link from 'next/link'
import { getV2Task3Data } from '../../lib/queries'
import { Task3TablesClient } from './Task3TablesClient'
import { AggregationCard, StatRow } from '../../components/AggregationCard'

export default async function Task3Page() {
  const { orchRuns, judgeResults } = await getV2Task3Data()

  const total = judgeResults.length
  const diagCounts: Record<string, number> = {}
  for (const j of judgeResults) {
    const d = j.diagnosis ?? 'UNJUDGED'
    diagCounts[d] = (diagCounts[d] ?? 0) + 1
  }

  // Vāda = System B in baseline-vs-vada comparisons
  const vadaWinCount = judgeResults.filter((j) => j.diagnosis === 'B').length
  const vadaWinRate = total > 0 ? (vadaWinCount / total) * 100 : 0

  const revisedCount = orchRuns.filter((r) => r.terminalState === 'REVISED').length
  const revisedRate = orchRuns.length > 0 ? (revisedCount / orchRuns.length) * 100 : 0

  const avgElapsedMs = orchRuns.length > 0 ? orchRuns.reduce((s, r) => s + r.elapsedMs, 0) / orchRuns.length : 0

  return (
    <div className='space-y-6 max-w-7xl'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='font-serif text-2xl font-semibold'>Task 3 — A0 vs B0 Orchestration</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Haiku 4.5 · 7 V1-loss questions · N=3 · Does Vāda pipeline beat single-shot?
          </p>
        </div>
        <Link href='/bench' className='text-sm text-muted-foreground hover:text-foreground'>
          ← Overview
        </Link>
      </div>

      <div className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
        <AggregationCard title='B0 runs'>
          <p className='font-mono text-2xl'>{orchRuns.length}</p>
        </AggregationCard>
        <AggregationCard title='Judge comparisons'>
          <p className='font-mono text-2xl'>{total}</p>
        </AggregationCard>
        <AggregationCard title='Vāda win rate'>
          <p className='font-mono text-2xl'>{total > 0 ? `${vadaWinRate.toFixed(1)}%` : '—'}</p>
        </AggregationCard>
        <AggregationCard title='REVISED rate'>
          <p className='font-mono text-2xl'>{orchRuns.length > 0 ? `${revisedRate.toFixed(1)}%` : '—'}</p>
        </AggregationCard>
      </div>

      <div className='grid grid-cols-2 gap-4 sm:grid-cols-3'>
        <AggregationCard title='Judge verdicts'>
          {Object.entries(diagCounts).map(([d, n]) => (
            <StatRow key={d} label={d} value={`${n} (${total > 0 ? ((n / total) * 100).toFixed(0) : 0}%)`} />
          ))}
        </AggregationCard>
        <AggregationCard title='Orchestration stats'>
          <StatRow label='Avg runtime' value={`${(avgElapsedMs / 1000).toFixed(1)}s`} />
          <StatRow label='CLEAN' value={orchRuns.filter((r) => r.terminalState === 'CLEAN').length} />
          <StatRow label='REVISED' value={revisedCount} />
          <StatRow label='UNCONVERGED' value={orchRuns.filter((r) => r.terminalState === 'UNCONVERGED').length} />
        </AggregationCard>
      </div>

      <Task3TablesClient orchRuns={orchRuns} judgeResults={judgeResults} />
    </div>
  )
}
