import Link from 'next/link'
import { getV2Task3_5Data } from '../../lib/queries'
import { Task35TablesClient } from './Task35TablesClient'
import { AggregationCard, StatRow } from '../../components/AggregationCard'

export default async function Task35Page() {
  const { haikuOrcRuns, sonnetOrcRuns, haikuJudge, sonnetJudge, sonnetBaselineRuns, sonnetBaselineJudge } =
    await getV2Task3_5Data()

  function revisedRate(runs: typeof haikuOrcRuns) {
    if (runs.length === 0) return null
    return (runs.filter((r) => r.terminalState === 'REVISED').length / runs.length) * 100
  }

  function vadaWinRate(judgements: typeof haikuJudge) {
    if (judgements.length === 0) return null
    return (judgements.filter((j) => j.diagnosis === 'B').length / judgements.length) * 100
  }

  const haikuRevRate = revisedRate(haikuOrcRuns)
  const sonnetRevRate = revisedRate(sonnetOrcRuns)
  const haikuWinRate = vadaWinRate(haikuJudge)
  const sonnetWinRate = vadaWinRate(sonnetJudge)

  const revDelta = haikuRevRate !== null && sonnetRevRate !== null ? sonnetRevRate - haikuRevRate : null
  const winDelta = haikuWinRate !== null && sonnetWinRate !== null ? sonnetWinRate - haikuWinRate : null

  return (
    <div className='space-y-6 max-w-7xl'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='font-serif text-2xl font-semibold'>Task 3.5 — Sonnet Replication</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Sonnet 4.6 · Same 7 V1-loss questions · N=3 · Haiku vs Sonnet side-by-side.
          </p>
        </div>
        <Link href='/bench' className='text-sm text-muted-foreground hover:text-primary'>
          ← Overview
        </Link>
      </div>

      {/* Side-by-side headline */}
      <div className='grid grid-cols-2 gap-4 sm:grid-cols-5'>
        <AggregationCard title='Haiku B0 runs'>
          <p className='font-mono text-2xl'>{haikuOrcRuns.length}</p>
        </AggregationCard>
        <AggregationCard title='Sonnet B0 runs'>
          <p className='font-mono text-2xl'>{sonnetOrcRuns.length}</p>
        </AggregationCard>
        <AggregationCard title='REVISED Δ (Sonnet − Haiku)'>
          <p className='font-mono text-2xl'>
            {revDelta !== null ? `${revDelta > 0 ? '+' : ''}${revDelta.toFixed(1)}pp` : '—'}
          </p>
        </AggregationCard>
        <AggregationCard title='Vāda win rate Δ'>
          <p className='font-mono text-2xl'>
            {winDelta !== null ? `${winDelta > 0 ? '+' : ''}${winDelta.toFixed(1)}pp` : '—'}
          </p>
        </AggregationCard>
        <AggregationCard title='Sonnet baseline runs'>
          <p className='font-mono text-2xl'>{sonnetBaselineRuns.length}</p>
        </AggregationCard>
      </div>

      <div className='grid grid-cols-2 gap-4'>
        <AggregationCard title='Haiku orchestration'>
          <StatRow label='REVISED rate' value={haikuRevRate !== null ? `${haikuRevRate.toFixed(1)}%` : '—'} />
          <StatRow label='Vāda win rate' value={haikuWinRate !== null ? `${haikuWinRate.toFixed(1)}%` : '—'} />
          <StatRow label='Judge comparisons' value={haikuJudge.length} />
        </AggregationCard>
        <AggregationCard title='Sonnet orchestration'>
          <StatRow label='REVISED rate' value={sonnetRevRate !== null ? `${sonnetRevRate.toFixed(1)}%` : '—'} />
          <StatRow label='Vāda win rate' value={sonnetWinRate !== null ? `${sonnetWinRate.toFixed(1)}%` : '—'} />
          <StatRow label='Judge comparisons' value={sonnetJudge.length} />
        </AggregationCard>
      </div>

      <Task35TablesClient
        haikuOrcRuns={haikuOrcRuns}
        sonnetOrcRuns={sonnetOrcRuns}
        haikuJudge={haikuJudge}
        sonnetJudge={sonnetJudge}
        sonnetBaselineRuns={sonnetBaselineRuns}
        sonnetBaselineJudge={sonnetBaselineJudge}
      />
    </div>
  )
}
