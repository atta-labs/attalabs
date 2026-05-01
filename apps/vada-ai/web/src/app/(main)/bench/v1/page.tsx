import Link from 'next/link'
import { getV1BenchRows } from '../lib/queries'
import { V1BenchTableClient } from './V1BenchTableClient'
import { AggregationCard, StatRow } from '../components/AggregationCard'
import { formatCost } from '../lib/pricing'

export default async function V1BenchPage() {
  const rows = await getV1BenchRows()

  // Server-side aggregations
  const totalCost = rows.reduce((s, r) => s + r.totalCost, 0)
  const diagnosisCounts: Record<string, number> = {}
  for (const r of rows) {
    const d = r.judgeDiagnosis ?? 'UNJUDGED'
    diagnosisCounts[d] = (diagnosisCounts[d] ?? 0) + 1
  }
  const revRate = rows.filter((r) => r.terminalState === 'REVISED').length
  const avgDelibMs =
    rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.deliberationSumElapsedMs, 0) / rows.length) : 0

  return (
    <div className='space-y-6 max-w-7xl'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='font-serif text-2xl font-semibold'>V1 Benchmark</h1>
          <p className='text-sm text-muted-foreground mt-1'>{rows.length} sessions</p>
        </div>
        <Link href='/bench' className='text-sm text-muted-foreground hover:text-accent'>
          ← Overview
        </Link>
      </div>

      <div className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
        <AggregationCard title='Total sessions'>
          <p className='font-mono text-2xl'>{rows.length}</p>
        </AggregationCard>
        <AggregationCard title='REVISED rate'>
          <p className='font-mono text-2xl'>
            {rows.length > 0 ? `${((revRate / rows.length) * 100).toFixed(0)}%` : '—'}
          </p>
        </AggregationCard>
        <AggregationCard title='Avg deliberation time'>
          <p className='font-mono text-2xl'>{(avgDelibMs / 1000).toFixed(1)}s</p>
        </AggregationCard>
        <AggregationCard title='Total cost'>
          <p className='font-mono text-2xl'>{formatCost(totalCost)}</p>
        </AggregationCard>
      </div>

      <div className='grid grid-cols-2 gap-4 sm:grid-cols-3'>
        <AggregationCard title='Diagnosis breakdown'>
          {Object.entries(diagnosisCounts).map(([d, n]) => (
            <StatRow
              key={d}
              label={d}
              value={`${n} (${rows.length > 0 ? ((n / rows.length) * 100).toFixed(0) : 0}%)`}
            />
          ))}
        </AggregationCard>
      </div>

      <V1BenchTableClient rows={rows} />
    </div>
  )
}
