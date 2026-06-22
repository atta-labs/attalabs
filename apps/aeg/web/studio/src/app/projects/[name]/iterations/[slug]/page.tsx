import { Badge } from '@atta/ui/components/badge'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@atta/ui/components/table'
import { NextLink } from '@atta/ui/lib/next-link'
import { parseLedger, sumLedger, type DerivedStatus } from '@atta/aeg-core'
import { AlertTriangle, GitBranch, LayoutGrid } from 'lucide-react'
import type { Metadata } from 'next'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { notFound } from 'next/navigation'
import { findAegRoot, readIteration, readProject } from '@/lib/aeg-fs'
import { loadIterationSnapshot } from '@/lib/forge/load-snapshot'
import { statusVisual } from './_lib/status-display'
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

  const snapshot = await loadIterationSnapshot(iteration, slug)
  const taskStatusMap = new Map<string, DerivedStatus>()
  for (const dt of snapshot.derived.tasks) {
    taskStatusMap.set(dt.task.id, dt.status)
  }

  // Map task id → issue number for resolving depends-on / conflicts-with
  const taskIssueMap = new Map<string, number | null>()
  for (const task of iteration.tasks) {
    taskIssueMap.set(String(task.id), task.issue)
  }
  const resolveDepLabel = (id: string): string | null => {
    if (id.includes('/')) return null
    if (!taskIssueMap.has(id)) return id
    const issue = taskIssueMap.get(id)
    return issue !== null ? `#${issue}` : id
  }

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

        {snapshot.unavailable ? (
          <div className='flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-warning'>
            <AlertTriangle className='size-4 shrink-0 translate-y-0.5' aria-hidden />
            <p className='font-sans text-xs leading-relaxed'>
              Live status unavailable — task statuses shown as <span className='font-mono'>backlog</span>. Set{' '}
              <span className='font-mono'>GITHUB_TOKEN</span>, run <span className='font-mono'>gh auth login</span>, or
              set <span className='font-mono'>AEG_REPO</span> to enable forge-derived status.
            </p>
          </div>
        ) : null}

        {iteration.tasks.length === 0 ? (
          <p className='font-sans text-sm text-muted-foreground/70'>
            No tasks declared in this iteration's topology table.
          </p>
        ) : (
          <div className='rounded-lg border border-border bg-card'>
            <Table className='table-fixed'>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[4%] font-sans text-xs uppercase tracking-wider'>#</TableHead>
                  <TableHead className='font-sans text-xs uppercase tracking-wider'>Task</TableHead>
                  <TableHead className='w-[10%] font-sans text-xs uppercase tracking-wider'>Issue</TableHead>
                  <TableHead className='w-[15%] font-sans text-xs uppercase tracking-wider'>Project(s)</TableHead>
                  <TableHead className='w-[10%] font-sans text-xs uppercase tracking-wider'>Deps</TableHead>
                  <TableHead className='w-[12%] font-sans text-xs uppercase tracking-wider'>Conflicts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {iteration.tasks.map((task) => {
                  const status = taskStatusMap.get(String(task.id))
                  const visual = status ? statusVisual(status) : null
                  return (
                    <TableRow key={task.id}>
                      <TableCell className='align-top font-mono text-sm font-semibold text-foreground'>
                        {task.id}
                      </TableCell>
                      <TableCell className='align-top'>
                        <TaskTitleCell title={task.title} />
                      </TableCell>
                      <TableCell className='align-top'>
                        <div className='space-y-1'>
                          <p className='font-mono text-xs text-muted-foreground'>
                            {task.issue !== null ? `#${task.issue}` : '—'}
                          </p>
                          {visual && (
                            <div>
                              <Badge variant='outline' className={`${visual.badgeClass} font-mono p-1 text-[0.6rem]`}>
                                {visual.label}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className='align-top'>
                        <EdgeList items={task.projects} />
                      </TableCell>
                      <TableCell className='align-top'>
                        <DepList items={task.dependsOn} resolve={resolveDepLabel} />
                      </TableCell>
                      <TableCell className='align-top'>
                        <DepList items={task.conflictsWith} resolve={resolveDepLabel} />
                      </TableCell>
                    </TableRow>
                  )
                })}
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

function DepList({ items, resolve }: { items: string[]; resolve: (id: string) => string | null }) {
  const resolved = items.map((id) => ({ id, label: resolve(id) })).filter((x) => x.label !== null)
  if (resolved.length === 0) {
    return <span className='font-mono text-xs text-muted-foreground/60'>—</span>
  }
  return (
    <div className='max-h-24 space-y-1 overflow-y-auto'>
      {resolved.map(({ id, label }) => (
        <span key={id} className='block font-mono text-xs text-muted-foreground'>
          {label}
        </span>
      ))}
    </div>
  )
}

function EdgeList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <span className='font-mono text-xs text-muted-foreground/60'>—</span>
  }
  return (
    <div className='flex flex-col gap-0.5'>
      {items.map((item) => (
        <span key={item} className='font-mono text-xs text-card-foreground'>
          {item}
        </span>
      ))}
    </div>
  )
}
