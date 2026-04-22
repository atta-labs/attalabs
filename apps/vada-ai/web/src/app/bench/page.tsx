import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components/card'
import { getOverviewStats, getV1BenchSummary, getRecentSessions, getTotalCost } from './lib/queries'
import { DiagnosisBadge } from './components/DiagnosisBadge'
import { TerminalStateBadge } from './components/TerminalStateBadge'
import { AggregationCard } from './components/AggregationCard'
import { formatCost } from './lib/pricing'

export default async function BenchIndexPage() {
  const [overview, v1Summary, recentSessions, totalCost] = await Promise.all([
    getOverviewStats(),
    getV1BenchSummary(),
    getRecentSessions(20),
    getTotalCost(),
  ])

  const v2Tasks = [
    {
      id: 'task-2',
      name: 'Task 2 — A0 vs A1 baseline ceiling',
      description: 'Haiku 4.5, 15 questions, N=3. Does rich prompting raise the baseline?',
      href: '/bench/v2/task-2',
      models: ['claude-haiku-4-5-20251001'],
    },
    {
      id: 'task-3',
      name: 'Task 3 — A0 vs B0 orchestration',
      description: '7 V1-loss questions, N=3, Haiku. Does full Vāda pipeline beat single-shot?',
      href: '/bench/v2/task-3',
      models: ['claude-haiku-4-5-20251001'],
    },
    {
      id: 'task-3-5',
      name: 'Task 3.5 — Sonnet replication',
      description: 'Same 7 questions on Sonnet 4.6. Haiku vs Sonnet side-by-side.',
      href: '/bench/v2/task-3-5',
      models: ['claude-sonnet-4-6'],
    },
  ]

  return (
    <div className='space-y-8 max-w-6xl'>
      <div>
        <h1 className='font-serif text-2xl font-semibold'>Benchmark Dashboard</h1>
        <p className='text-sm text-muted-foreground mt-1'>Dev-only. All V1 + V2 bench data.</p>
      </div>

      {/* Overview card */}
      <section className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
        <AggregationCard title='V1 sessions'>
          <p className='font-mono text-3xl'>{overview.totalV1Sessions}</p>
        </AggregationCard>
        <AggregationCard title='V2 baseline runs'>
          <p className='font-mono text-3xl'>{overview.totalV2BaselineRuns}</p>
        </AggregationCard>
        <AggregationCard title='V2 orchestration runs'>
          <p className='font-mono text-3xl'>{overview.totalV2OrchestrationRuns}</p>
        </AggregationCard>
        <AggregationCard title='Total tracked cost'>
          <p className='font-mono text-3xl'>{formatCost(totalCost)}</p>
        </AggregationCard>
      </section>

      {overview.models.length > 0 && (
        <AggregationCard title='Models tested'>
          <div className='flex flex-wrap gap-2'>
            {overview.models.map((m) => (
              <code key={m} className='rounded bg-muted px-2 py-0.5 text-xs text-foreground'>
                {m}
              </code>
            ))}
          </div>
        </AggregationCard>
      )}

      {/* V1 summary */}
      <section className='space-y-3'>
        <div className='flex items-center justify-between'>
          <h2 className='font-serif text-lg font-semibold'>V1 Benchmark</h2>
          <Link href='/bench/v1' className='text-sm text-primary hover:underline'>
            View details →
          </Link>
        </div>
        <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6'>
          {Object.entries(v1Summary.diagnosisCounts).map(([diagnosis, n]) => (
            <Card key={diagnosis} className='text-center'>
              <CardHeader className='pb-1 pt-3'>
                <DiagnosisBadge diagnosis={diagnosis} />
              </CardHeader>
              <CardContent className='pb-3'>
                <p className='font-mono text-2xl'>{n}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* V2 task list */}
      <section className='space-y-3'>
        <h2 className='font-serif text-lg font-semibold'>V2 Tasks</h2>
        <div className='grid gap-4 sm:grid-cols-3'>
          {v2Tasks.map((task) => (
            <Link key={task.id} href={task.href}>
              <Card className='h-full cursor-pointer hover:border-primary/50 transition-colors'>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-sm'>{task.name}</CardTitle>
                </CardHeader>
                <CardContent className='space-y-2'>
                  <p className='text-xs text-muted-foreground'>{task.description}</p>
                  <div className='flex flex-wrap gap-1'>
                    {task.models.map((m) => (
                      <code key={m} className='rounded bg-muted px-1.5 py-0.5 text-xs'>
                        {m.replace('claude-', '')}
                      </code>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent sessions table */}
      <section className='space-y-3'>
        <h2 className='font-serif text-lg font-semibold'>Recent Activity</h2>
        <div className='overflow-x-auto rounded-md border border-border'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-border bg-muted/40'>
                <th className='px-3 py-2 text-left font-medium text-muted-foreground'>Date</th>
                <th className='px-3 py-2 text-left font-medium text-muted-foreground'>Type</th>
                <th className='px-3 py-2 text-left font-medium text-muted-foreground'>Q ID</th>
                <th className='px-3 py-2 text-left font-medium text-muted-foreground'>Question</th>
                <th className='px-3 py-2 text-left font-medium text-muted-foreground'>Variant</th>
                <th className='px-3 py-2 text-left font-medium text-muted-foreground'>Model</th>
                <th className='px-3 py-2 text-left font-medium text-muted-foreground'>Terminal</th>
                <th className='px-3 py-2 text-left font-medium text-muted-foreground'>Diagnosis</th>
              </tr>
            </thead>
            <tbody>
              {recentSessions.map((s, i) => (
                <tr key={i} className='border-b border-border/50 last:border-0 hover:bg-muted/20'>
                  <td className='px-3 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap'>
                    {s.createdAt.toLocaleDateString()} {s.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className='px-3 py-2'>
                    <code className='rounded bg-muted px-1.5 py-0.5 text-xs'>{s.type}</code>
                  </td>
                  <td className='px-3 py-2 font-mono text-xs'>{s.questionId ?? '—'}</td>
                  <td className='px-3 py-2 max-w-xs'>
                    <span className='line-clamp-2 text-xs'>{s.question}</span>
                  </td>
                  <td className='px-3 py-2 font-mono text-xs'>{s.variant ?? '—'}</td>
                  <td className='px-3 py-2 font-mono text-xs text-muted-foreground'>
                    {s.model ? s.model.replace('claude-', '') : '—'}
                  </td>
                  <td className='px-3 py-2'>
                    <TerminalStateBadge state={s.terminalState} />
                  </td>
                  <td className='px-3 py-2'>
                    {s.diagnosis ? <DiagnosisBadge diagnosis={s.diagnosis} /> : <span className='text-muted-foreground text-xs'>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
