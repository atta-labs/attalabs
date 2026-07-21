import { Badge, Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@atta/ui/components'
import { sumLedger, type DerivedStatus, type DispatchResult, type LedgerRow } from '@atta/aeg-core'
import { AlertTriangle, UserRound } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { readIteration, readProject } from '@/lib/repo-state'
import { loadDispatchReadiness } from '@/lib/forge/dispatch-readiness'
import { fetchIterationTokenLedger } from '@/lib/forge/fetch-token-ledger'
import { loadIterationSnapshot } from '@/lib/forge/load-snapshot'
import { CoherencePanel } from './_components/CoherencePanel'
import { IterationTabs } from './_components/IterationTabs'
import { statusVisual, todoDispatchVisual } from './_lib/status-display'
import { TaskTitleCell } from './_components/TaskTitleCell'

// Forge reads derive live Issue/PR state from GitHub — never serve from cache.
export const dynamic = 'force-dynamic'

type Params = { name: string; slug: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { name, slug } = await params
  return { title: `${slug} · ${name} · Vinaya Studio` }
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

  // Dispatch-readiness sub-state for `todo` rows (#372 bundled finding):
  // `checkDispatchReadiness` computed server-side, display-only — DerivedStatus
  // is untouched. Archived iterations have no dispatchable work; skip.
  const readinessMap = archived
    ? new Map<string, DispatchResult>()
    : await loadDispatchReadiness(iteration, slug, snapshot)

  // Dispatch-visibility signal only — `assigned` is not part of `DerivedStatus`
  // (D-059 excludes it from derivation). Rendered as a subordinate chip on
  // `todo` rows so a dispatched-but-not-yet-pushed task is visibly distinct.
  const taskAssignedMap = new Map<string, boolean>()
  for (const [taskId, facts] of snapshot.facts) {
    taskAssignedMap.set(taskId, facts.assigned)
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

  // Forge Issue links ride the snapshot's already-resolved repo — when absent
  // (no remote, AEG_REPO unset) the numbers render as plain text, the same
  // graceful-degrade contract as the rest of the forge adapter.
  const issueUrl = (n: number): string | null =>
    snapshot.repo ? `https://github.com/${snapshot.repo.owner}/${snapshot.repo.repo}/issues/${n}` : null

  // Live-fetched off merged PRs + verdict comments (D-071 / task 4b, #445) —
  // no longer the `<slug>.tokens.md` file read. `.tokens.md` itself is not
  // deleted here (task 7's job, once this is proven).
  const tokenLedger = snapshot.repo
    ? await fetchIterationTokenLedger({
        owner: snapshot.repo.owner,
        repo: snapshot.repo.repo,
        iteration: slug,
        tasks: iteration.tasks.map((task) => ({ id: String(task.id), issue: task.issue }))
      })
    : {
        ledgers: new Map<string, LedgerRow[]>(),
        unavailable: true,
        reason: 'Could not resolve repository (no git remote found and AEG_REPO unset).'
      }
  const ledgerRows = Array.from(tokenLedger.ledgers.values()).flat()
  const ledgerTotals = ledgerRows.length > 0 ? sumLedger(ledgerRows) : null

  return (
    <div className='space-y-8'>
      <header className='space-y-3'>
        <div className='flex items-center gap-3'>
          <p className='font-mono text-xs uppercase tracking-widest text-muted-foreground'>Iteration</p>
          {archived ? (
            <Badge className='bg-muted/40 text-muted-foreground'>Archived</Badge>
          ) : (
            <Badge className='bg-success/10 text-success'>Active</Badge>
          )}
        </div>
        <h1 className='font-serif text-3xl tracking-tight text-foreground'>{iteration.name || slug}</h1>
        {iteration.goal ? (
          <p className='font-sans text-base text-muted-foreground'>{iteration.goal}</p>
        ) : (
          <p className='font-sans text-sm text-muted-foreground/70'>No goal recorded.</p>
        )}
      </header>

      <IterationTabs
        tasks={
          <>
            <section className='space-y-3'>
              {snapshot.unavailable ? (
                <div className='flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-warning'>
                  <AlertTriangle className='size-4 shrink-0 translate-y-0.5' aria-hidden />
                  <p className='font-sans text-xs leading-relaxed'>
                    Live status unavailable — task statuses shown as <span className='font-mono'>todo</span>. Set{' '}
                    <span className='font-mono'>GITHUB_TOKEN</span>, run{' '}
                    <span className='font-mono'>gh auth login</span>, or set <span className='font-mono'>AEG_REPO</span>{' '}
                    to enable forge-derived status.
                  </p>
                </div>
              ) : null}

              {iteration.tasks.length === 0 ? (
                <p className='font-sans text-sm text-muted-foreground/70'>
                  No tasks declared in this iteration's topology table.
                </p>
              ) : (
                // The `@atta/ui` Table owns all table behavior. `stickyHeader` (opt-in —
                // off by default on the shared primitive) pins the header on scroll
                // (page-scroll sticky, no fixed height); `containerClassName` shifts the
                // pin down past the sticky ProjectsSubBar (`top-10`).
                // `table-fixed` + percentage widths fit the columns on a laptop (no
                // horizontal scroll) while the bounded Task column wraps long titles to
                // two lines; `min-w-[760px]` keeps labels readable and lets the Studio
                // shell scroll horizontally on a narrow viewport. Card has NO
                // `overflow-hidden`: the pinned header must be free to escape it to stick
                // to the shell, and horizontal overflow must reach the shell to scroll.
                <div>
                  <Table
                    stickyHeader
                    className='min-w-[760px] table-fixed'
                    containerClassName='@min-[780px]/tbl:[&_thead_th]:top-10'
                  >
                    <TableHeader className='[&_th]:whitespace-nowrap'>
                      <TableRow>
                        <TableHead className='w-[4%] text-center font-semibold text-foreground'>#</TableHead>
                        <TableHead className='font-semibold text-foreground'>Task</TableHead>
                        <TableHead className='w-[11%] text-center font-semibold text-foreground'>Issue</TableHead>
                        <TableHead className='w-[16%] text-center font-semibold text-foreground'>Project(s)</TableHead>
                        <TableHead className='w-[9%] text-center font-semibold text-foreground'>Deps</TableHead>
                        <TableHead className='w-[16%] text-center font-semibold text-foreground'>Conflicts</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {iteration.tasks.map((task) => {
                        const status = taskStatusMap.get(String(task.id))
                        const visual = status ? statusVisual(status) : null
                        const readiness = status === 'todo' ? readinessMap.get(String(task.id)) : undefined
                        const todoVisual = readiness ? todoDispatchVisual(readiness) : null
                        // The blocked detail ('Blocked · needs #N') renders under the
                        // title — the wide Task column keeps it on one line, where the
                        // narrow Issue column wrapped it over three. The Issue column
                        // falls back to the plain status badge for blocked rows.
                        const blockedVisual = readiness && !readiness.ready ? todoVisual : null
                        const issueVisual = blockedVisual ? visual : (todoVisual ?? visual)
                        // In-review rows link their badge to the PR under review.
                        const reviewPr = status === 'in-review' ? snapshot.prRefs.get(String(task.id)) : undefined
                        const showAssignedChip = status === 'todo' && taskAssignedMap.get(String(task.id)) === true
                        return (
                          <TableRow key={task.id}>
                            <TableCell className='align-middle text-center font-mono text-sm font-semibold text-foreground'>
                              {task.id}
                            </TableCell>
                            <TableCell className='align-middle'>
                              <div className='space-y-1'>
                                <TaskTitleCell title={task.title} />
                                {blockedVisual && (
                                  <div>
                                    <Badge
                                      variant='outline'
                                      className={`${blockedVisual.badgeClass} whitespace-nowrap font-mono p-1 text-[0.6rem]`}
                                      title={blockedVisual.title}
                                    >
                                      {blockedVisual.label}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className='align-middle text-center'>
                              <div className='space-y-1'>
                                <p className='font-mono text-xs text-muted-foreground'>
                                  {task.issue === null ? (
                                    '—'
                                  ) : issueUrl(task.issue) ? (
                                    <a
                                      href={issueUrl(task.issue) as string}
                                      target='_blank'
                                      rel='noreferrer'
                                      className='hover:text-primary hover:underline'
                                    >
                                      #{task.issue}
                                    </a>
                                  ) : (
                                    `#${task.issue}`
                                  )}
                                </p>
                                {issueVisual && (
                                  <div>
                                    {reviewPr ? (
                                      <div className='space-y-1'>
                                        <div>
                                          <Badge
                                            variant='outline'
                                            className={`${issueVisual.badgeClass} whitespace-nowrap font-mono p-1 text-[0.6rem]`}
                                          >
                                            Review
                                          </Badge>
                                        </div>
                                        <a
                                          href={reviewPr.url}
                                          target='_blank'
                                          rel='noreferrer'
                                          className='block font-mono text-xs text-muted-foreground hover:text-primary hover:underline'
                                        >
                                          PR #{reviewPr.number}
                                        </a>
                                      </div>
                                    ) : (
                                      <Badge
                                        variant='outline'
                                        className={`${issueVisual.badgeClass} font-mono p-1 text-[0.6rem]`}
                                        title={blockedVisual ? undefined : todoVisual?.title}
                                      >
                                        {issueVisual.label}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                                {showAssignedChip && (
                                  <div>
                                    <Badge
                                      variant='outline'
                                      className='gap-1 border-muted-foreground/40 p-1 font-mono text-[0.6rem] text-muted-foreground'
                                    >
                                      <UserRound className='size-2.5' aria-hidden />
                                      Assigned
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className='align-middle text-center'>
                              <EdgeList items={task.projects} />
                            </TableCell>
                            <TableCell className='align-middle text-center'>
                              <DepList items={task.dependsOn} resolve={resolveDepLabel} />
                            </TableCell>
                            <TableCell className='align-middle text-center'>
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
              <h2 className='font-mono text-xs uppercase tracking-widest text-muted-foreground'>Coherence</h2>
              <CoherencePanel />
            </section>
          </>
        }
        ledger={
          tokenLedger.unavailable ? (
            <div className='flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-warning'>
              <AlertTriangle className='size-4 shrink-0 translate-y-0.5' aria-hidden />
              <p className='font-sans text-xs leading-relaxed'>
                Live token ledger unavailable — set <span className='font-mono'>GITHUB_TOKEN</span>, run{' '}
                <span className='font-mono'>gh auth login</span>, or set <span className='font-mono'>AEG_REPO</span> to
                enable it.
              </p>
            </div>
          ) : ledgerRows.length === 0 ? (
            <p className='font-sans text-sm text-muted-foreground/70'>No ledger data yet.</p>
          ) : (
            // Header pins on scroll by default; `top-10` clears the ProjectsSubBar.
            // No card `overflow-hidden` so the pinned header can stick to the shell.
            <div>
              <Table stickyHeader className='min-w-[720px]' containerClassName='@min-[780px]/tbl:[&_thead_th]:top-10'>
                <TableHeader>
                  <TableRow>
                    <TableHead className='font-semibold text-foreground'>Phase</TableHead>
                    <TableHead className='font-semibold text-foreground'>Role</TableHead>
                    <TableHead className='font-semibold text-foreground'>Agent / Model</TableHead>
                    <TableHead className='w-28 text-right font-semibold text-foreground'>Tokens in</TableHead>
                    <TableHead className='w-28 text-right font-semibold text-foreground'>Tokens out</TableHead>
                    <TableHead className='w-24 text-right font-semibold text-foreground'>Cost</TableHead>
                    <TableHead className='w-28 font-semibold text-foreground'>Date</TableHead>
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
          )
        }
      />
    </div>
  )
}

function DepList({ items, resolve }: { items: string[]; resolve: (id: string) => string | null }) {
  // Dedupe defensively — Studio renders forge-derived edges verbatim, and a
  // duplicate raw id (e.g. a parser re-mention bug, since fixed upstream in
  // `parseRationaleDeps`) would otherwise collide as a React key (#569).
  const uniqueItems = Array.from(new Set(items))
  const resolved = uniqueItems.map((id) => ({ id, label: resolve(id) })).filter((x) => x.label !== null)
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
