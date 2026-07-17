/**
 * Backlog view (Studio task 2, #498; table redesign task 11, #571) — every
 * open Issue carrying no `iteration:*` label, as a filterable table. Closes the
 * gap where unscoped Issues (e.g. #497) were invisible on every iteration-scoped
 * Studio page — `/studio/iterations` and `/studio/projects/[name]` both query
 * iteration-scoped data only.
 *
 * One row per Issue (task 11): a cross-project Issue like #513 (`project:aeg` +
 * `project:aeg-core`) is a single row carrying both project badges — the
 * project filter matches it under either — instead of the old first-label-wins
 * grouping that silently dropped its second project (D-091).
 *
 * Filters (project + tier) and their vocabulary live in `BacklogTable`; this
 * server component only fetches, computes the distinct filter options, and
 * stays honest about forge failure. Iteration/state are NOT filters here: the
 * backlog is by definition the open, no-`iteration:*` set (`fetch-open-issues.ts`),
 * so every row is open and iteration-less — nothing to filter on.
 *
 * Forge honesty (task 11): the fetch carries a `ForgeStatus`; when the forge is
 * unreachable the page renders a banner, never a truth-shaped "everything is
 * tracked" empty state (D-087).
 */

import type { Registry } from '@atta/aeg-core'
import { resolveGithubToken, resolveRepo } from '@atta/aeg-forge-state'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isVercelDeploy } from '@/lib/env'
import { readRegistry } from '@/lib/repo-state'
import type { ForgeStatus } from '@/lib/repo-state/forge-status'
import { fetchOpenIssuesWithoutIterationLabel, type BacklogIssue } from '@/lib/forge/fetch-open-issues'
import { ForgeUnavailableBanner } from '@/app/studio/_components/ForgeUnavailableBanner'
import { BacklogTable } from './_components/BacklogTable'

// Forge reads derive live Issue state from GitHub — never serve from cache.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Backlog · Vinaya Studio'
}

/** Distinct `project:*` labels present, registry order first then any extras. */
function projectOptions(issues: BacklogIssue[], registry: Registry): string[] {
  const present = new Set<string>()
  for (const issue of issues) {
    for (const label of issue.labels) if (label.startsWith('project:')) present.add(label)
  }
  const ordered: string[] = []
  for (const project of registry) {
    const label = `project:${project.name}`
    if (present.has(label)) ordered.push(label)
  }
  for (const label of present) if (!ordered.includes(label)) ordered.push(label)
  return ordered
}

/** Distinct `tier:*` labels present, lowest tier first. */
function tierOptions(issues: BacklogIssue[]): string[] {
  const present = new Set<string>()
  for (const issue of issues) {
    for (const label of issue.labels) if (label.startsWith('tier:')) present.add(label)
  }
  return [...present].sort((a, b) => Number(a.slice('tier:'.length)) - Number(b.slice('tier:'.length)))
}

/** Distinct `needs:*`/`status:*` labels present — the Flags family, `needs:*` first. */
function flagOptions(issues: BacklogIssue[]): string[] {
  const present = new Set<string>()
  for (const issue of issues) {
    for (const label of issue.labels) if (label.startsWith('needs:') || label.startsWith('status:')) present.add(label)
  }
  return [...present].sort((a, b) => a.localeCompare(b))
}

export default async function BacklogPage() {
  if (isVercelDeploy()) notFound()

  const [repo, token, registry] = await Promise.all([resolveRepo(), resolveGithubToken(), readRegistry()])
  const { issues, forge }: { issues: BacklogIssue[]; forge: ForgeStatus } =
    repo && token
      ? await fetchOpenIssuesWithoutIterationLabel(repo.owner, repo.repo, token)
      : { issues: [], forge: { kind: 'unreachable' } }

  return (
    <div className='space-y-8'>
      <header className='space-y-2'>
        <h1 className='font-serif text-3xl tracking-tight text-foreground'>Backlog</h1>
        <p className='font-sans text-sm text-muted-foreground'>
          Open issues with no <span className='font-mono'>iteration:*</span> label — tracked work outside any iteration.
        </p>
      </header>

      <ForgeUnavailableBanner scope='both' status={forge} detail='The backlog cannot be listed right now.' />

      {issues.length === 0 ? (
        // A forge failure already showed the banner above — only claim an empty
        // backlog when the forge was actually reachable (D-087).
        forge.kind === 'ok' ? (
          <p className='font-sans text-sm text-muted-foreground'>
            No backlog issues — everything is tracked under an iteration.
          </p>
        ) : null
      ) : (
        <BacklogTable
          issues={issues}
          projectOptions={projectOptions(issues, registry)}
          tierOptions={tierOptions(issues)}
          flagOptions={flagOptions(issues)}
        />
      )}
    </div>
  )
}
