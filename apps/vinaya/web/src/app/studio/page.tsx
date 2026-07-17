/**
 * Studio home (task 11, #571) — a dashboard: two preview cards (Projects,
 * Iterations) on the first row, then a full-width Backlog card and a full-width
 * Tasks (ready + in-flight) card, each on its own row listing every entry.
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
import { listIterations, readRegistry, type IterationSummary } from '@/lib/repo-state'
import type { ForgeStatus } from '@/lib/repo-state/forge-status'
import { fetchOpenIssuesWithoutIterationLabel, type BacklogIssue } from '@/lib/forge/fetch-open-issues'
import { ForgeBanners, ForgeUnavailableBanner } from '@/app/studio/_components/ForgeUnavailableBanner'
import { DashboardCard } from '@/app/studio/_components/DashboardCard'
import { LabelBadge, rankedLabels } from '@/app/studio/_components/LabelBadge'
import { loadReadyAndInFlightTasks, type DashboardTask } from '@/app/studio/_lib/load-dashboard-tasks'
import { statusVisual, todoDispatchVisual } from '@/app/studio/projects/[name]/iterations/[slug]/_lib/status-display'

// Forge reads derive live Issue/PR state from GitHub — never serve from cache.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Vinaya Studio'
}

// Preview rows shown on the two preview cards (Projects, Iterations) — a
// window, not the page. The header count shows the true total behind the card.
const PREVIEW = 4

async function loadBacklog(token: string | null): Promise<{ issues: BacklogIssue[]; forge: ForgeStatus }> {
  const repo = await resolveRepo()
  if (!repo || !token) return { issues: [], forge: { kind: 'unreachable' } }
  return fetchOpenIssuesWithoutIterationLabel(repo.owner, repo.repo, token)
}

/** An iteration's board href — its first project's detail route, or null. */
function iterationHref(it: IterationSummary): string | null {
  const project = it.projects[0]
  return project ? `/studio/projects/${project}/iterations/${it.fileSlug}` : null
}

function taskVisual(task: DashboardTask): { label: string; badgeClass: string; title?: string } {
  if (task.status === 'in-flight') return statusVisual('in-flight')
  // A `todo` task always carries a passing readiness (the loader only surfaces
  // Ready ones); the fallback is a pure type guard that never runs.
  return task.readiness ? todoDispatchVisual(task.readiness) : statusVisual('todo')
}

export default async function HomePage() {
  if (isVercelDeploy()) {
    redirect('/the-studio')
  }

  // Resolve the forge token ONCE and prime it for this process before the
  // loaders below fan out. Without this, each concurrent loader spawns its own
  // `gh auth token`; a burst of 5s-timeout subprocesses starved the sibling
  // backlog query's token resolution past its timeout, rendering a reachable
  // backlog as a false "unavailable" (D-087). `resolveGithubToken` reads
  // `process.env.GITHUB_TOKEN` on every call, so priming collapses every
  // downstream resolution to this one. Local-only Studio (D-101): one machine,
  // one token — priming is safe, and we never overwrite an explicit token.
  const primedToken = await resolveGithubToken()
  if (primedToken && !process.env.GITHUB_TOKEN) process.env.GITHUB_TOKEN = primedToken

  const [registry, iterations, backlog, tasks] = await Promise.all([
    readRegistry(),
    listIterations(),
    loadBacklog(primedToken),
    loadReadyAndInFlightTasks()
  ])

  const active = iterations.active
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

      <div className='grid gap-4 sm:grid-cols-2'>
        {/* Projects — local registry, never forge-backed, always available. */}
        <DashboardCard title='Projects' count={registry.length} href='/studio/projects' viewAllLabel='All projects'>
          {registry.length === 0 ? (
            <p className='font-sans text-xs text-muted-foreground/70'>No projects registered.</p>
          ) : (
            registry.slice(0, PREVIEW).map((project) => (
              <NextLink
                key={project.name}
                variant='unstyled'
                href={`/studio/projects/${project.name}`}
                className='group flex items-baseline justify-between gap-2 font-mono text-xs text-muted-foreground'
              >
                <span className='text-card-foreground group-hover:text-accent'>{project.name}</span>
                <span className='truncate text-muted-foreground/70'>{project.path}</span>
              </NextLink>
            ))
          )}
        </DashboardCard>

        {/* Iterations — active from open Milestones; row links to its board. */}
        <DashboardCard title='Iterations' count={active.length} href='/studio/iterations' viewAllLabel='All iterations'>
          {active.length === 0 ? (
            iterations.forge.active.kind === 'ok' ? (
              <p className='font-sans text-xs text-muted-foreground/70'>No active iterations.</p>
            ) : null
          ) : (
            active.slice(0, PREVIEW).map((it) => {
              const href = iterationHref(it)
              const row = (
                <>
                  <span className='truncate text-card-foreground group-hover:text-accent'>{it.name}</span>
                  <span className='shrink-0 text-muted-foreground/70'>
                    {it.taskCounts.forgeAvailable ? `${it.taskCounts.done}/${it.taskCounts.total}` : `${it.taskCount}`}
                  </span>
                </>
              )
              const rowClass = 'group flex items-baseline justify-between gap-2 font-mono text-xs'
              return href ? (
                <NextLink key={it.fileSlug} variant='unstyled' href={href} className={rowClass}>
                  {row}
                </NextLink>
              ) : (
                <div key={it.fileSlug} className={rowClass}>
                  {row}
                </div>
              )
            })
          )}
        </DashboardCard>
      </div>

      {/* Backlog — its own full-width row; every open no-iteration Issue, each
          linking to its GitHub Issue. */}
      <DashboardCard title='Backlog' count={backlog.issues.length} href='/studio/backlog' viewAllLabel='Full backlog'>
        {backlog.issues.length === 0 ? (
          backlog.forge.kind === 'ok' ? (
            <p className='font-sans text-xs text-muted-foreground/70'>Everything is tracked under an iteration.</p>
          ) : null
        ) : (
          backlog.issues.map((issue) => (
            <a
              key={issue.number}
              href={issue.url}
              target='_blank'
              rel='noreferrer'
              className='group flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-xs'
            >
              <span className='shrink-0 text-muted-foreground/70'>#{issue.number}</span>
              <span className='font-sans text-card-foreground group-hover:text-accent'>{issue.title}</span>
              <span className='flex flex-wrap gap-1'>
                {rankedLabels(issue.labels).map((label) => (
                  <LabelBadge key={label} label={label} />
                ))}
              </span>
            </a>
          ))
        )}
      </DashboardCard>

      {/* Tasks (ready + in-flight) — its own full-width row; ALL such tasks in
          one column so titles read in full, each linking to its GitHub Issue. */}
      <DashboardCard title='Tasks' count={tasks.length}>
        {tasks.length === 0 ? (
          iterations.forge.active.kind === 'ok' ? (
            <p className='font-sans text-xs text-muted-foreground/70'>No tasks ready or in flight.</p>
          ) : null
        ) : (
          tasks.map((task) => {
            const visual = taskVisual(task)
            const label = (
              <span className='font-mono text-xs'>
                <span className='text-card-foreground group-hover:text-accent'>{task.title}</span>
                <span className='text-muted-foreground/70'> · {task.iterationSlug}</span>
              </span>
            )
            const badge = (
              <Badge
                variant='outline'
                className={`shrink-0 font-mono text-xs ${visual.badgeClass}`}
                title={visual.title}
              >
                {visual.label}
              </Badge>
            )
            const key = `${task.iterationSlug}-${task.taskId}`
            return task.issueUrl ? (
              <a
                key={key}
                href={task.issueUrl}
                target='_blank'
                rel='noreferrer'
                className='group flex items-center gap-2'
              >
                {badge}
                {label}
              </a>
            ) : (
              <div key={key} className='group flex items-center gap-2'>
                {badge}
                {label}
              </div>
            )
          })
        )}
      </DashboardCard>
    </div>
  )
}
