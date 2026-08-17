/**
 * Studio home (task 11, #571) — a three-card dashboard: two preview cards
 * (Projects, Tranches) on the first row, then a single full-width **Tasks**
 * card. The Tasks card is the one work surface — every Ready / active / blocked
 * tranche task PLUS the backlog, in one status-filterable list (the backlog
 * was folded in here rather than shown as its own card; consolidated from the
 * brief's original four-card layout during the design pass, Principal-directed).
 * Rows are minimal: `#issue` (→ GitHub), a status badge, the plain title, and
 * the tranche slug (→ its board; backlog rows carry no tranche).
 *
 * No production/preview gate here (task 3 of the Portal/Studio split): this
 * app is local-only structurally — it is never deployed to Vercel — so the
 * `isVercelDeploy()` redirect that used to send a deployed visitor to
 * `/the-studio` has no reason to exist in this app. Forge honesty: a
 * page-level banner renders when the forge is unreachable, and no card
 * renders an empty list produced by that failure — the Projects card, local
 * registry only, still renders.
 */

import { NextLink } from '@atta/ui/lib/next-link'
import { resolveGithubToken, resolveRepo } from '@atta/aeg-forge-state'
import type { Metadata } from 'next'
import { listTranches, readRegistry, type TrancheSummary } from '@/lib/repo-state'
import { trancheHref, NO_BOARD_REASON } from '@/app/studio/_lib/tranche-href'
import type { ForgeStatus } from '@/lib/repo-state/forge-status'
import { fetchOpenIssuesWithoutTrancheLabel, type BacklogIssue } from '@/lib/forge/fetch-open-issues'
import { ForgeBanners, ForgeUnavailableBanner } from '@/app/studio/_components/ForgeUnavailableBanner'
import { DashboardCard } from '@/app/studio/_components/DashboardCard'
import { TasksPanel } from '@/app/studio/_components/TasksPanel'
import { backlogToTasks, loadDashboardTasks } from '@/app/studio/_lib/load-dashboard-tasks'

// Forge reads derive live Issue/PR state from GitHub — never serve from cache.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Vinaya Studio'
}

// Preview rows shown on the two preview cards (Projects, Tranches) — a
// window, not the page. The header count shows the true total behind the card.
const PREVIEW = 4

/**
 * The Tranches preview row's progress cell. Counts the forge could not be read
 * degrade to the plain task count — the one case where this cell is not a
 * ratio at all, so it must not look like one.
 */
function previewRatio(tranche: TrancheSummary): string {
  const { total, done, dropped, forgeAvailable } = tranche.taskCounts
  if (!forgeAvailable) return `${tranche.taskCount}`

  const shippable = total - dropped
  // Every task dropped: there is no ratio to state (`0/0` reads as a bug, not
  // as a fact), so the disposition is the whole answer.
  if (shippable === 0) return `${dropped} dropped`
  return dropped > 0 ? `${done}/${shippable} · ${dropped} dropped` : `${done}/${shippable}`
}

async function loadBacklog(token: string | null): Promise<{ issues: BacklogIssue[]; forge: ForgeStatus }> {
  const repo = await resolveRepo()
  if (!repo || !token) return { issues: [], forge: { kind: 'unreachable' } }
  return fetchOpenIssuesWithoutTrancheLabel(repo.owner, repo.repo, token)
}

export default async function HomePage() {
  // Resolve the forge token ONCE and prime it for this process before the
  // loaders below fan out. Without this, each concurrent loader spawns its own
  // `gh auth token`; a burst of 5s-timeout subprocesses starved the sibling
  // backlog query's token resolution past its timeout, rendering a reachable
  // backlog as a false "unavailable". `resolveGithubToken` reads
  // `process.env.GITHUB_TOKEN` on every call, so priming collapses every
  // downstream resolution to this one. Local-only Studio: one machine,
  // one token — priming is safe, and we never overwrite an explicit token.
  const primedToken = await resolveGithubToken()
  if (primedToken && !process.env.GITHUB_TOKEN) process.env.GITHUB_TOKEN = primedToken

  const [registry, tranches, backlog, tasks] = await Promise.all([
    readRegistry(),
    listTranches(),
    loadBacklog(primedToken),
    loadDashboardTasks()
  ])

  const active = tranches.active
  // Only a registered project has a board route (`readProject` 404s otherwise);
  // pass the registered set so a retired-project tranche renders board-less
  // instead of linking to a dead `/studio/projects/<retired>` page.
  const registered = new Set(registry.map((p) => p.name))
  // The Tasks card is the single work surface: tranche tasks (Ready / active /
  // blocked) plus the backlog, filterable by status.
  const allTasks = [...tasks, ...backlogToTasks(backlog.issues)]
  const backlogFailedAlone = backlog.forge.kind !== 'ok' && tranches.forge.active.kind === 'ok'

  return (
    <div className='space-y-8'>
      <header className='space-y-2'>
        <h1 className='font-serif text-3xl tracking-tight text-foreground'>Vinaya Studio</h1>
        <p className='font-sans text-base text-muted-foreground'>
          Local governance for Vinaya artifacts — projects, tranches, backlog, and the tasks ready to pick up or already
          moving.
        </p>
      </header>

      <ForgeBanners forge={tranches.forge} />
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
                <span className='text-card-foreground group-hover:text-primary'>{project.name}</span>
                <span className='truncate text-muted-foreground/70'>{project.path}</span>
              </NextLink>
            ))
          )}
        </DashboardCard>

        {/* Tranches — active from open Milestones; row links to its board. */}
        <DashboardCard title='Tranches' count={active.length} href='/studio/tranches' viewAllLabel='All tranches'>
          {active.length === 0 ? (
            tranches.forge.active.kind === 'ok' ? (
              <p className='font-sans text-xs text-muted-foreground/70'>No active tranches.</p>
            ) : null
          ) : (
            active.slice(0, PREVIEW).map((it) => {
              const href = trancheHref(it, registered)
              const row = (
                <>
                  <span className='truncate text-card-foreground group-hover:text-primary'>{it.name}</span>
                  {/* done-over-shippable, the same ratio the card's bar shows:
                      a dropped task leaves the denominator rather than sitting
                      in it forever as work that will never be done. The
                      denominator therefore stops matching the tranche's task
                      count, so the row says why in the same breath rather than
                      shrinking silently — `17/17 · 1 dropped`, never a bare
                      `17/17` beside a board that lists 18. */}
                  <span className='shrink-0 text-muted-foreground/70'>{previewRatio(it)}</span>
                </>
              )
              const rowClass = 'group flex items-baseline justify-between gap-2 font-mono text-xs'
              return href ? (
                <NextLink key={it.fileSlug} variant='unstyled' href={href} className={rowClass}>
                  {row}
                </NextLink>
              ) : (
                // No project → no board route exists. Say so instead of
                // rendering a silently non-clickable row.
                <div key={it.fileSlug} className={`${rowClass} cursor-help`} title={NO_BOARD_REASON}>
                  {row}
                </div>
              )
            })
          )}
        </DashboardCard>
      </div>

      {/* Tasks — the single full-width work surface: every Ready / active /
          blocked tranche task plus the backlog, filterable by status. Each row
          is just its status badge, title, and tranche (backlog rows have
          none); each links to its GitHub Issue. */}
      <DashboardCard title='Tasks' count={allTasks.length}>
        {allTasks.length === 0 ? (
          backlog.forge.kind === 'ok' && tranches.forge.active.kind === 'ok' ? (
            <p className='font-sans text-xs text-muted-foreground/70'>No tasks or backlog Issues.</p>
          ) : null
        ) : (
          <TasksPanel tasks={allTasks} />
        )}
      </DashboardCard>
    </div>
  )
}
