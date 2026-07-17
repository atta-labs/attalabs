/**
 * Studio home (task 11, #571) — a four-card dashboard: Projects, Iterations,
 * Backlog, and Tasks (ready + in-flight). Each card is a window onto a full
 * page — a few preview rows plus a link onward — never the page itself.
 *
 * The `isVercelDeploy()` redirect stays (D-101: Studio is local-only for v1.0;
 * production/preview send the visitor to the `/the-studio` Portal page). Every
 * forge-backed card is honest about failure — a page-level banner renders when
 * the forge is unreachable, and no card renders an empty list produced by that
 * failure (D-087: Studio stores nothing, so it must not lie by omission).
 */

import { Badge } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { resolveGithubToken, resolveRepo } from '@atta/aeg-forge-state'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { isVercelDeploy } from '@/lib/env'
import { listIterations, readRegistry } from '@/lib/repo-state'
import type { ForgeStatus } from '@/lib/repo-state/forge-status'
import { fetchOpenIssuesWithoutIterationLabel, type BacklogIssue } from '@/lib/forge/fetch-open-issues'
import { ForgeBanners, ForgeUnavailableBanner } from '@/app/studio/_components/ForgeUnavailableBanner'
import { DashboardCard } from '@/app/studio/_components/DashboardCard'
import { loadReadyAndInFlightTasks } from '@/app/studio/_lib/load-dashboard-tasks'
import { statusVisual, todoDispatchVisual } from '@/app/studio/projects/[name]/iterations/[slug]/_lib/status-display'

// Forge reads derive live Issue/PR state from GitHub — never serve from cache.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Vinaya Studio'
}

// "A few": a preview that reads as a window, not the page. Live backlog is 5 —
// showing all 5 would be the page, not a preview — so 3, consistent across all
// four cards. The header count always shows the true total behind the card.
const PREVIEW = 3

async function loadBacklog(token: string | null): Promise<{ issues: BacklogIssue[]; forge: ForgeStatus }> {
  const repo = await resolveRepo()
  if (!repo || !token) return { issues: [], forge: { kind: 'unreachable' } }
  return fetchOpenIssuesWithoutIterationLabel(repo.owner, repo.repo, token)
}

export default async function HomePage() {
  if (isVercelDeploy()) {
    redirect('/the-studio')
  }

  // Resolve the forge token ONCE and prime it for this process before the
  // loaders below fan out. Without this, each concurrent loader — the
  // Iterations-card progress reads AND the Tasks-card readiness fan-out, a dozen
  // or more forge calls across every active iteration — independently spawns
  // `gh auth token`. That burst of concurrent 5s-timeout subprocesses starves
  // the sibling backlog query's own token resolution past its timeout, so a
  // reachable backlog renders as a false "unavailable" — the exact lie D-087
  // forbids (observed live: backlog card empty while `/studio/backlog` loads
  // fine). `resolveGithubToken` reads `process.env.GITHUB_TOKEN` on every call,
  // so priming it collapses every downstream resolution (app + package) to this
  // one. Local-only Studio (D-101): one machine, one user, one token — priming
  // the env is safe, and we never overwrite an explicitly-set token.
  const primedToken = await resolveGithubToken()
  if (primedToken && !process.env.GITHUB_TOKEN) process.env.GITHUB_TOKEN = primedToken

  const [registry, iterations, backlog, tasks] = await Promise.all([
    readRegistry(),
    listIterations(),
    loadBacklog(primedToken),
    loadReadyAndInFlightTasks()
  ])

  const active = iterations.active
  // Backlog failed independently only when iterations enumeration itself was
  // fine — otherwise ForgeBanners already surfaces the same outage once.
  const backlogFailedAlone = backlog.forge.kind !== 'ok' && iterations.forge.active.kind === 'ok'

  return (
    <div className='space-y-8'>
      <header className='space-y-2'>
        <h1 className='font-serif text-3xl tracking-tight text-foreground'>Vinaya Studio</h1>
        <p className='font-sans text-base text-muted-foreground'>
          Local governance for Vinaya artifacts — projects, iterations, backlog, and the tasks ready to pick up right
          now.
        </p>
      </header>

      <ForgeBanners forge={iterations.forge} />
      {backlogFailedAlone && (
        <ForgeUnavailableBanner scope='both' status={backlog.forge} detail='The backlog cannot be listed right now.' />
      )}

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {/* Projects — local registry, never forge-backed, always available. */}
        <DashboardCard title='Projects' count={registry.length} href='/studio/projects' viewAllLabel='All projects'>
          {registry.length === 0 ? (
            <p className='font-sans text-xs text-muted-foreground/70'>No projects registered.</p>
          ) : (
            registry.slice(0, PREVIEW).map((project) => (
              <div
                key={project.name}
                className='flex items-baseline justify-between gap-2 font-mono text-xs text-muted-foreground'
              >
                <span className='text-card-foreground'>{project.name}</span>
                <span className='truncate text-muted-foreground/70'>{project.path}</span>
              </div>
            ))
          )}
        </DashboardCard>

        {/* Iterations — active from open Milestones. */}
        <DashboardCard title='Iterations' count={active.length} href='/studio/iterations' viewAllLabel='All iterations'>
          {active.length === 0 ? (
            iterations.forge.active.kind === 'ok' ? (
              <p className='font-sans text-xs text-muted-foreground/70'>No active iterations.</p>
            ) : null
          ) : (
            active.slice(0, PREVIEW).map((it) => (
              <div key={it.fileSlug} className='flex items-baseline justify-between gap-2 font-mono text-xs'>
                <span className='truncate text-card-foreground'>{it.name}</span>
                <span className='shrink-0 text-muted-foreground/70'>
                  {it.taskCounts.forgeAvailable ? `${it.taskCounts.done}/${it.taskCounts.total}` : `${it.taskCount}`}
                </span>
              </div>
            ))
          )}
        </DashboardCard>

        {/* Backlog — open Issues with no iteration label. */}
        <DashboardCard title='Backlog' count={backlog.issues.length} href='/studio/backlog' viewAllLabel='Full backlog'>
          {backlog.issues.length === 0 ? (
            backlog.forge.kind === 'ok' ? (
              <p className='font-sans text-xs text-muted-foreground/70'>Everything is tracked under an iteration.</p>
            ) : null
          ) : (
            backlog.issues.slice(0, PREVIEW).map((issue) => (
              <a
                key={issue.number}
                href={issue.url}
                target='_blank'
                rel='noreferrer'
                className='block truncate font-mono text-xs text-muted-foreground hover:text-accent hover:underline'
              >
                <span className='text-muted-foreground/70'>#{issue.number}</span>{' '}
                <span className='font-sans text-card-foreground'>{issue.title}</span>
              </a>
            ))
          )}
        </DashboardCard>

        {/* Tasks (ready + in-flight) — cross-iteration; no single mirror page,
            so it links to the iteration boards where each row lives. */}
        <DashboardCard title='Tasks' count={tasks.length} href='/studio/iterations' viewAllLabel='Iteration boards'>
          {tasks.length === 0 ? (
            iterations.forge.active.kind === 'ok' ? (
              <p className='font-sans text-xs text-muted-foreground/70'>No tasks ready or in flight.</p>
            ) : null
          ) : (
            tasks.slice(0, PREVIEW).map((task) => {
              // `todo` tasks always carry a passing readiness (the loader only
              // surfaces Ready ones); the `?? statusVisual('todo')` is a pure
              // type guard that never runs.
              const visual =
                task.status === 'in-flight'
                  ? statusVisual('in-flight')
                  : task.readiness
                    ? todoDispatchVisual(task.readiness)
                    : statusVisual('todo')
              const label = (
                <span className='truncate'>
                  <span className='text-muted-foreground/70'>{task.iterationSlug} · </span>
                  <span className='text-card-foreground'>{task.title}</span>
                </span>
              )
              return (
                <div key={`${task.iterationSlug}-${task.taskId}`} className='flex items-center gap-2'>
                  <Badge
                    variant='outline'
                    className={`shrink-0 font-mono text-[0.6rem] ${visual.badgeClass}`}
                    title={'title' in visual ? visual.title : undefined}
                  >
                    {visual.label}
                  </Badge>
                  {task.boardHref ? (
                    <NextLink
                      variant='unstyled'
                      href={task.boardHref}
                      className='flex-1 truncate font-mono text-xs hover:text-accent'
                    >
                      {label}
                    </NextLink>
                  ) : (
                    <span className='flex-1 truncate font-mono text-xs'>{label}</span>
                  )}
                </div>
              )
            })
          )}
        </DashboardCard>
      </div>
    </div>
  )
}
