/**
 * Backlog view (Studio task 2, #498; table redesign task 11, #571) — every
 * open Issue carrying no `vinaya/tranche:*` label, as a filterable table. Closes the
 * gap where unscoped Issues (e.g. #497) were invisible on every tranche-scoped
 * Studio page — `/studio/tranches` and `/studio/projects/[name]` both query
 * tranche-scoped data only.
 *
 * One row per Issue (task 11): a cross-project Issue like #513 (`Project: aeg,
 * aeg-core`) is a single row carrying both project badges — the project filter
 * matches it under either — instead of the old first-label-wins grouping that
 * silently dropped its second project. Projects are read from the Issue
 * body's `**Project:**` field, never from a label (#614).
 *
 * Filters (project, tier, type, flags) and their vocabulary live in
 * `BacklogTable`; this server component only fetches, computes the distinct
 * filter options, and
 * stays honest about forge failure. Tranche/state are NOT filters here: the
 * backlog is by definition the open, no-`vinaya/tranche:*` set (`fetch-open-issues.ts`),
 * so every row is open and tranche-less — nothing to filter on.
 *
 * Forge honesty (task 11): the fetch carries a `ForgeStatus`; when the forge is
 * unreachable the page renders a banner, never a truth-shaped "everything is
 * tracked" empty state.
 */

import type { Registry } from '@attalabs/aeg-core'
import { resolveGithubToken, resolveRepo } from '@attalabs/aeg-forge-state'
import type { Metadata } from 'next'
import { readRegistry } from '@/lib/repo-state'
import type { ForgeStatus } from '@/lib/repo-state/forge-status'
import { fetchOpenIssuesWithoutTrancheLabel, type BacklogIssue } from '@/lib/forge/fetch-open-issues'
import { ForgeUnavailableBanner } from '@/app/studio/_components/ForgeUnavailableBanner'
import { labelKind } from '@/app/studio/_components/LabelBadge'
import { BacklogTable } from './_components/BacklogTable'

// Forge reads derive live Issue state from GitHub — never serve from cache.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Backlog · Vinaya Studio'
}

/** Distinct projects declared across the backlog, registry order first then any extras. */
function projectOptions(issues: BacklogIssue[], registry: Registry): string[] {
  const present = new Set<string>()
  for (const issue of issues) for (const project of issue.projects) present.add(project)
  const ordered: string[] = []
  for (const project of registry) if (present.has(project.name)) ordered.push(project.name)
  for (const project of present) if (!ordered.includes(project)) ordered.push(project)
  return ordered
}

/** Distinct tier labels present, lowest tier first. */
function tierOptions(issues: BacklogIssue[]): string[] {
  const present = new Set<string>()
  for (const issue of issues) {
    for (const name of issue.labels) if (labelKind(name) === 'tier') present.add(name)
  }
  return [...present].sort((a, b) => a.localeCompare(b))
}

/** Distinct type labels present. */
function typeOptions(issues: BacklogIssue[]): string[] {
  const present = new Set<string>()
  for (const issue of issues) {
    for (const name of issue.labels) if (labelKind(name) === 'type') present.add(name)
  }
  return [...present].sort((a, b) => a.localeCompare(b))
}

/** Distinct flag labels present — the `needs:*`, blocked, and detection-flag families. */
function flagOptions(issues: BacklogIssue[]): string[] {
  const present = new Set<string>()
  for (const issue of issues) {
    for (const name of issue.labels) {
      const kind = labelKind(name)
      if (kind === 'needs' || kind === 'state' || kind === 'flag') present.add(name)
    }
  }
  return [...present].sort((a, b) => a.localeCompare(b))
}

export default async function BacklogPage() {
  const [repo, token, registry] = await Promise.all([resolveRepo(), resolveGithubToken(), readRegistry()])
  const { issues, forge }: { issues: BacklogIssue[]; forge: ForgeStatus } =
    repo && token
      ? await fetchOpenIssuesWithoutTrancheLabel(repo.owner, repo.repo, token)
      : { issues: [], forge: { kind: 'unreachable' } }

  return (
    <div className='space-y-8'>
      <header className='space-y-2'>
        <h1 className='font-serif text-3xl tracking-tight text-foreground'>Backlog</h1>
        <p className='font-sans text-sm text-muted-foreground'>
          Open issues with no <span className='font-mono'>vinaya/tranche:*</span> label — tracked work outside any
          tranche.
        </p>
      </header>

      <ForgeUnavailableBanner scope='both' status={forge} detail='The backlog cannot be listed right now.' />

      {issues.length === 0 ? (
        // A forge failure already showed the banner above — only claim an empty
        // backlog when the forge was actually reachable.
        forge.kind === 'ok' ? (
          <p className='font-sans text-sm text-muted-foreground'>
            No backlog issues — everything is tracked under a tranche.
          </p>
        ) : null
      ) : (
        <BacklogTable
          issues={issues}
          projectOptions={projectOptions(issues, registry)}
          tierOptions={tierOptions(issues)}
          typeOptions={typeOptions(issues)}
          flagOptions={flagOptions(issues)}
        />
      )}
    </div>
  )
}
