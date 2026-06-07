import Link from 'next/link'
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components'
import { listBenchmarkRuns, getBenchmarkStats } from '@/db/bench-queries'

function VerdictBadge({ verdict }: { verdict: string }) {
  if (verdict === 'vada_wins')
    return (
      <Badge variant='outline' className='text-success border-success/40 font-mono text-xs'>
        vada wins
      </Badge>
    )
  if (verdict === 'baseline_wins')
    return (
      <Badge variant='outline' className='text-destructive border-destructive/40 font-mono text-xs'>
        baseline wins
      </Badge>
    )
  return (
    <Badge variant='outline' className='text-muted-foreground font-mono text-xs'>
      tie
    </Badge>
  )
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.round((score / 50) * 100))
  return (
    <div className='flex items-center gap-2'>
      <div className='h-1.5 w-16 rounded-full bg-muted overflow-hidden'>
        <div className='h-full rounded-full bg-primary/60' style={{ width: `${pct}%` }} />
      </div>
      <span className='font-mono text-xs text-muted-foreground'>{(score / 10).toFixed(1)}</span>
    </div>
  )
}

export default async function BrokeredBenchPage() {
  const [stats, runs] = await Promise.all([getBenchmarkStats(), listBenchmarkRuns(50)])

  return (
    <div className='space-y-8 max-w-6xl'>
      <div>
        <h1 className='font-serif text-2xl font-semibold'>Brokered Benchmark</h1>
        <p className='text-sm text-muted-foreground mt-1'>
          Judge evaluations of brokered consultations vs single-shot Sonnet baseline.
        </p>
      </div>

      <section className='grid grid-cols-2 gap-4 sm:grid-cols-5'>
        <Card>
          <CardHeader className='pb-1 pt-3'>
            <CardTitle className='text-xs text-muted-foreground'>Total runs</CardTitle>
          </CardHeader>
          <CardContent className='pb-3'>
            <p className='font-mono text-3xl'>{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-1 pt-3'>
            <CardTitle className='text-xs text-success'>Vāda wins</CardTitle>
          </CardHeader>
          <CardContent className='pb-3'>
            <p className='font-mono text-3xl text-success'>{stats.vadaWins}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-1 pt-3'>
            <CardTitle className='text-xs text-destructive'>Baseline wins</CardTitle>
          </CardHeader>
          <CardContent className='pb-3'>
            <p className='font-mono text-3xl text-destructive'>{stats.baselineWins}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-1 pt-3'>
            <CardTitle className='text-xs text-muted-foreground'>Ties</CardTitle>
          </CardHeader>
          <CardContent className='pb-3'>
            <p className='font-mono text-3xl'>{stats.ties}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-1 pt-3'>
            <CardTitle className='text-xs text-muted-foreground'>Avg score</CardTitle>
          </CardHeader>
          <CardContent className='pb-3'>
            <p className='font-mono text-3xl'>{stats.avgScore ? (stats.avgScore / 10).toFixed(1) : '—'}</p>
          </CardContent>
        </Card>
      </section>

      {runs.length === 0 ? (
        <div className='rounded-md border border-border p-8 text-center'>
          <p className='text-sm text-muted-foreground'>No benchmark runs yet.</p>
          <p className='text-xs text-muted-foreground mt-1'>
            Run: <code className='font-mono bg-muted px-1 rounded'>bun scripts/bench/judge-brokered.ts --recent 5</code>
          </p>
        </div>
      ) : (
        <section className='space-y-3'>
          <h2 className='font-serif text-lg font-semibold'>Runs</h2>
          <div className='overflow-x-auto rounded-md border border-border'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-border bg-muted/40'>
                  <th className='px-3 py-2 text-left font-medium text-muted-foreground'>Date</th>
                  <th className='px-3 py-2 text-left font-medium text-muted-foreground'>Question</th>
                  <th className='px-3 py-2 text-left font-medium text-muted-foreground'>Reviewers</th>
                  <th className='px-3 py-2 text-left font-medium text-muted-foreground'>Verdict</th>
                  <th className='px-3 py-2 text-left font-medium text-muted-foreground'>Score</th>
                  <th className='px-3 py-2 text-left font-medium text-muted-foreground'>Label</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className='border-b border-border/50 last:border-0 hover:bg-muted/20'>
                    <td className='px-3 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap'>
                      {run.createdAt.toLocaleDateString()}{' '}
                      {run.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className='px-3 py-2 max-w-xs'>
                      <Link href={`/bench/${run.id}`} className='hover:underline'>
                        <span className='line-clamp-2 text-xs'>{run.sessionTitle ?? run.prompt ?? '—'}</span>
                      </Link>
                    </td>
                    <td className='px-3 py-2 font-mono text-xs text-muted-foreground'>{run.reviewerProfile ?? '—'}</td>
                    <td className='px-3 py-2'>
                      <VerdictBadge verdict={run.judgeVerdict} />
                    </td>
                    <td className='px-3 py-2'>
                      <ScoreBar score={run.judgeScore} />
                    </td>
                    <td className='px-3 py-2 font-mono text-xs text-muted-foreground'>{run.runLabel ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
