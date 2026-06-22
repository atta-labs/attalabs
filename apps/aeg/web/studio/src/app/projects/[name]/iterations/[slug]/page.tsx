import { Badge } from '@atta/ui/components/badge'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@atta/ui/components/table'
import { NextLink } from '@atta/ui/lib/next-link'
import { parseLedger, sumLedger } from '@atta/aeg-core'
import { GitBranch, LayoutGrid } from 'lucide-react'
import type { Metadata } from 'next'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { notFound } from 'next/navigation'
import { findAegRoot, readIteration, readProject } from '@/lib/aeg-fs'
import { TaskTitleCell } from './_components/TaskTitleCell'

type Params = { name: string; slug: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { name, slug } = await params
  return { title: `${slug} · ${name} · AEG Studio` }
}

function readLedgerFile(slug: string): string | null {
  try {
    const root = findAegRoot()
    const ledgerPath = path.join(root, 'iterations', `${slug}.tokens.md`)
    if (!existsSync(ledgerPath)) return null
    return readFileSync(ledgerPath, 'utf8')
  } catch {
    return null
  }
}

function formatTokens(n: number | null): string {
  if (n === null) return '—'
  return n.toLocaleString('en-US')
}

function formatCost(n: number | null): string {
  if (n === null) return '—'
  return `$${n.toFixed(4)}`
}

export default async function IterationPage({ params }: { params: Promise<Params> }) {
  const { name, slug } = await params
  const [project, detail] = await Promise.all([readProject(name), readIteration(slug)])
  if (!project) notFound()
  if (!detail) notFound()

  const { iteration, archived } = detail

  const ledgerMd = readLedgerFile(slug)
  const ledgerRows = ledgerMd !== null ? parseLedger(ledgerMd) : null
  const ledgerTotals = ledgerRows !== null ? sumLedger(ledgerRows) : null

  return (
    <div className='space-y-8'>
      <nav className='font-mono text-xs text-muted-foreground'>
        <NextLink variant='unstyled' href='/projects' className='hover:text-accent'>
          projects
        </NextLink>
        <span className='px-1.5 text-muted-foreground/60'>/</span>
        <NextLink variant='unstyled' href={`/projects/${project.name}`} className='hover:text-accent'>
          {project.name}
        </NextLink>
        <span className='px-1.5 text-muted-foreground/60'>/</span>
        <span className='text-foreground/80'>{iteration.name || slug}</span>
      </nav>

      <header className='space-y-3'>
        <div className='flex items-center gap-3'>
          <p className='font-mono text-xs uppercase tracking-widest text-muted-foreground'>Iteration</p>
          {archived ? (
            <Badge className='bg-muted/40 text-muted-foreground border-border'>Archived</Badge>
          ) : (
            <Badge className='bg-primary/10 text-primary border-primary/40'>Active</Badge>
          )}
        </div>
        <h1 className='font-serif text-3xl tracking-tight text-foreground'>{iteration.name || slug}</h1>
        {iteration.goal ? (
          <p className='font-sans text-base text-muted-foreground'>{iteration.goal}</p>
        ) : (
          <p className='font-sans text-sm text-muted-foreground/70'>No goal recorded.</p>
        )}
      </header>

      <section className='space-y-3'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h2 className='font-mono text-xs uppercase tracking-widest text-muted-foreground'>Tasks (topology)</h2>
          {iteration.tasks.length > 0 ? (
            <div className='flex flex-wrap items-center gap-2'>
              <NextLink
                variant='unstyled'
                href={`/projects/${project.name}/iterations/${slug}/board`}
                className='inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-accent hover:text-accent'
              >
                <LayoutGrid className='size-3.5' aria-hidden />
                <span>View as board</span>
              </NextLink>
              <NextLink
                variant='unstyled'
                href={`/projects/${project.name}/iterations/${slug}/graph`}
                className='inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-accent hover:text-accent'
              >
                <GitBranch className='size-3.5' aria-hidden />
                <span>View as graph</span>
              </NextLink>
            </div>
          ) : null}
        </div>
        {iteration.tasks.length === 0 ? (
          <p className='font-sans text-sm text-muted-foreground/70'>
            No tasks declared in this iteration's topology table.
          </p>
        ) : (
          <div className='rounded-lg border border-border bg-card'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-16 font-sans text-xs uppercase tracking-wider'>#</TableHead>
                  <TableHead className='w-72 font-sans text-xs uppercase tracking-wider'>Task</TableHead>
                  <TableHead className='w-20 font-sans text-xs uppercase tracking-wider'>Issue</TableHead>
                  <TableHead className='font-sans text-xs uppercase tracking-wider'>Project(s)</TableHead>
                  <TableHead className='font-sans text-xs uppercase tracking-wider'>Depends on</TableHead>
                  <TableHead className='font-sans text-xs uppercase tracking-wider'>Conflicts with</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {iteration.tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className='font-mono text-sm font-semibold text-foreground'>{task.id}</TableCell>
                    <TableCell>
                      <TaskTitleCell title={task.title} />
                    </TableCell>
                    <TableCell className='font-mono text-xs text-muted-foreground'>
                      {task.issue !== null ? `#${task.issue}` : '—'}
                    </TableCell>
                    <TableCell>
                      <EdgeList items={task.projects} variant='project' />
                    </TableCell>
                    <TableCell>
                      <EdgeList items={task.dependsOn} variant='edge' />
                    </TableCell>
                    <TableCell>
                      <EdgeList items={task.conflictsWith} variant='edge' />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {iteration.backlog.length > 0 && (
        <section className='space-y-3'>
          <h2 className='font-mono text-xs uppercase tracking-widest text-muted-foreground'>Backlog</h2>
          <ul className='space-y-1.5 font-sans text-sm text-muted-foreground'>
            {iteration.backlog.map((item) => (
              <li key={item} className='leading-relaxed'>
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className='space-y-3'>
        <h2 className='font-mono text-xs uppercase tracking-widest text-muted-foreground'>Token ledger</h2>
        {ledgerRows === null ? (
          <p className='font-sans text-sm text-muted-foreground/70'>No ledger data yet.</p>
        ) : ledgerRows.length === 0 ? (
          <p className='font-sans text-sm text-muted-foreground/70'>No ledger data yet.</p>
        ) : (
          <div className='rounded-lg border border-border bg-card'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='font-sans text-xs uppercase tracking-wider'>Phase</TableHead>
                  <TableHead className='font-sans text-xs uppercase tracking-wider'>Role</TableHead>
                  <TableHead className='font-sans text-xs uppercase tracking-wider'>Agent / Model</TableHead>
                  <TableHead className='w-28 text-right font-sans text-xs uppercase tracking-wider'>
                    Tokens in
                  </TableHead>
                  <TableHead className='w-28 text-right font-sans text-xs uppercase tracking-wider'>
                    Tokens out
                  </TableHead>
                  <TableHead className='w-24 text-right font-sans text-xs uppercase tracking-wider'>Cost</TableHead>
                  <TableHead className='w-28 font-sans text-xs uppercase tracking-wider'>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerRows.map((row, idx) => (
                  <TableRow key={`${row.phase}-${idx}`}>
                    <TableCell className='font-mono text-xs text-foreground'>{row.phase}</TableCell>
                    <TableCell className='font-sans text-sm text-card-foreground'>{row.role || '—'}</TableCell>
                    <TableCell className='font-mono text-xs text-muted-foreground'>{row.agentModel || '—'}</TableCell>
                    <TableCell className='text-right font-mono text-xs text-card-foreground'>
                      {formatTokens(row.tokensIn)}
                    </TableCell>
                    <TableCell className='text-right font-mono text-xs text-card-foreground'>
                      {formatTokens(row.tokensOut)}
                    </TableCell>
                    <TableCell className='text-right font-mono text-xs text-card-foreground'>
                      {formatCost(row.cost)}
                    </TableCell>
                    <TableCell className='font-mono text-xs text-muted-foreground'>{row.date || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {ledgerTotals !== null && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className='font-mono text-xs font-semibold text-foreground'>
                      Total ({ledgerTotals.rows} {ledgerTotals.rows === 1 ? 'entry' : 'entries'})
                    </TableCell>
                    <TableCell className='text-right font-mono text-xs font-semibold text-foreground'>
                      {ledgerTotals.tokensIn > 0 ? ledgerTotals.tokensIn.toLocaleString('en-US') : '—'}
                    </TableCell>
                    <TableCell className='text-right font-mono text-xs font-semibold text-foreground'>
                      {ledgerTotals.tokensOut > 0 ? ledgerTotals.tokensOut.toLocaleString('en-US') : '—'}
                    </TableCell>
                    <TableCell className='text-right font-mono text-xs font-semibold text-foreground'>
                      {ledgerTotals.cost > 0 ? `$${ledgerTotals.cost.toFixed(4)}` : '—'}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        )}
      </section>
    </div>
  )
}

function EdgeList({ items, variant }: { items: string[]; variant: 'project' | 'edge' }) {
  if (items.length === 0) {
    return <span className='font-mono text-xs text-muted-foreground/60'>—</span>
  }
  return (
    <div className='flex flex-wrap gap-1.5'>
      {items.map((item) => (
        <Badge
          key={item}
          className={
            variant === 'project'
              ? 'bg-muted/40 text-card-foreground border-border font-mono text-xs'
              : 'bg-muted/30 text-muted-foreground border-border font-mono text-xs'
          }
        >
          {item}
        </Badge>
      ))}
    </div>
  )
}
