/**
 * Backlog view (Studio task 2, #498; redesigned task 11, #571) — every open
 * Issue carrying no `iteration:*` label, grouped by its `project:<name>`
 * label(s). Closes the gap where an Issue like #497 (`project:aeg-core`, no
 * iteration) was invisible on every existing page — `/studio/iterations` and
 * `/studio/projects/[name]` both query iteration-scoped data only.
 *
 * Grouping (task 11 fix): an Issue is listed under EVERY `project:<name>`
 * label it carries, not just the first. A cross-project Issue like #513
 * (`project:aeg` AND `project:aeg-core`) appears under both groups — the old
 * `labels.find(...)` first-label-wins logic silently dropped its second
 * project (D-091: labels are machine truth; showing one is a lie by omission).
 * A `project:<name>` label matching a registry row groups under that project's
 * name; one matching no registry row still gets its own group, keyed by the
 * literal label (not dropped); Issues with no `project:*` label fall into
 * "No project".
 *
 * Forge honesty (task 11): the fetch returns a `ForgeStatus`; when the forge
 * is unreachable the page renders a banner, never a truth-shaped
 * "everything is tracked" empty state (D-087).
 *
 * Label badges are ranked by category, not by value (constraint: no per-label
 * palette) — `project` / `tier` / `status` / `needs` each read as a different
 * kind, one flat semantic-token variant apiece. `needs:*` reads `warning`
 * (attention wanted); there is no `info`/blue token (ui-theme-tokens).
 */

import { Badge, Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components'
import type { Registry } from '@atta/aeg-core'
import { resolveGithubToken, resolveRepo } from '@atta/aeg-forge-state'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isVercelDeploy } from '@/lib/env'
import { readRegistry } from '@/lib/repo-state'
import type { ForgeStatus } from '@/lib/repo-state/forge-status'
import { fetchOpenIssuesWithoutIterationLabel, type BacklogIssue } from '@/lib/forge/fetch-open-issues'
import { ForgeUnavailableBanner } from '@/app/studio/_components/ForgeUnavailableBanner'

// Forge reads derive live Issue state from GitHub — never serve from cache.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Backlog · Vinaya Studio'
}

type Group = { key: string; heading: string; issues: BacklogIssue[] }

const NO_PROJECT_KEY = '__no-project__'

// Category ranking + one flat semantic-token variant per category. Colour is
// keyed to the label's KIND (its prefix), never to its value — the doctrine
// forbids a per-label palette (see the `/how-it-works` leaf panel).
type LabelKind = 'project' | 'tier' | 'status' | 'needs' | 'other'

const KIND_RANK: Record<LabelKind, number> = { project: 0, tier: 1, status: 2, needs: 3, other: 4 }

const KIND_CLASS: Record<LabelKind, string> = {
  project: 'text-accent border-accent/40',
  tier: 'text-foreground border-border',
  status: 'text-primary border-primary/40',
  needs: 'text-warning border-warning/40',
  other: 'text-muted-foreground border-border'
}

function labelKind(label: string): LabelKind {
  if (label.startsWith('project:')) return 'project'
  if (label.startsWith('tier:')) return 'tier'
  if (label.startsWith('status:')) return 'status'
  if (label.startsWith('needs:')) return 'needs'
  return 'other'
}

/** Labels ranked by category so the hierarchy reads left-to-right. */
function rankedLabels(labels: string[]): string[] {
  return [...labels].sort((a, b) => KIND_RANK[labelKind(a)] - KIND_RANK[labelKind(b)])
}

function groupByProject(issues: BacklogIssue[], registry: Registry): Group[] {
  const groups = new Map<string, Group>()

  const ensure = (key: string, heading: string): Group => {
    const existing = groups.get(key)
    if (existing) return existing
    const created = { key, heading, issues: [] as BacklogIssue[] }
    groups.set(key, created)
    return created
  }

  for (const issue of issues) {
    const projectLabels = issue.labels.filter((label) => label.startsWith('project:'))

    if (projectLabels.length === 0) {
      ensure(NO_PROJECT_KEY, 'No project').issues.push(issue)
      continue
    }

    // Every distinct project label gets the Issue — a cross-project Issue is
    // listed under each of its projects (task 11 fix), never just the first.
    for (const projectLabel of new Set(projectLabels)) {
      const projectName = projectLabel.slice('project:'.length)
      const project = registry.find((p) => p.name === projectName)
      const key = project ? project.name : projectLabel
      const heading = project ? project.name : projectLabel
      ensure(key, heading).issues.push(issue)
    }
  }

  // Registry order first, then unmatched project labels, then "No project" last.
  const ordered: Group[] = []
  for (const project of registry) {
    const group = groups.get(project.name)
    if (group) ordered.push(group)
  }
  for (const [key, group] of groups) {
    if (key === NO_PROJECT_KEY || registry.some((p) => p.name === key)) continue
    ordered.push(group)
  }
  const noProject = groups.get(NO_PROJECT_KEY)
  if (noProject) ordered.push(noProject)

  return ordered
}

export default async function BacklogPage() {
  if (isVercelDeploy()) notFound()

  const [repo, token, registry] = await Promise.all([resolveRepo(), resolveGithubToken(), readRegistry()])
  const { issues, forge }: { issues: BacklogIssue[]; forge: ForgeStatus } =
    repo && token
      ? await fetchOpenIssuesWithoutIterationLabel(repo.owner, repo.repo, token)
      : { issues: [], forge: { kind: 'unreachable' } }
  const groups = groupByProject(issues, registry)

  return (
    <div className='space-y-8'>
      <header className='space-y-2'>
        <h1 className='font-serif text-3xl tracking-tight text-foreground'>Backlog</h1>
        <p className='font-sans text-sm text-muted-foreground'>
          Open issues with no <span className='font-mono'>iteration:*</span> label — tracked work outside any iteration.
        </p>
      </header>

      <ForgeUnavailableBanner scope='both' status={forge} detail='The backlog cannot be listed right now.' />

      {groups.length === 0 ? (
        // A forge failure already showed the banner above — only claim an empty
        // backlog when the forge was actually reachable (D-087).
        forge.kind === 'ok' ? (
          <p className='font-sans text-sm text-muted-foreground'>
            No backlog issues — everything is tracked under an iteration.
          </p>
        ) : null
      ) : (
        <div className='space-y-8'>
          {groups.map((group) => (
            <section key={group.key} className='space-y-3'>
              <h2 className='font-serif text-xl tracking-tight text-foreground'>{group.heading}</h2>
              <div className='grid gap-3 sm:grid-cols-2'>
                {group.issues.map((issue) => (
                  <Card key={issue.number} className='border border-border bg-card'>
                    <CardHeader className='pb-2'>
                      <CardTitle className='text-base text-card-foreground'>
                        <a
                          href={issue.url}
                          target='_blank'
                          rel='noreferrer'
                          className='hover:text-accent hover:underline'
                        >
                          <span className='font-mono text-muted-foreground'>#{issue.number}</span>{' '}
                          <span className='font-sans font-normal'>{issue.title}</span>
                        </a>
                      </CardTitle>
                    </CardHeader>
                    {issue.labels.length > 0 && (
                      <CardContent className='pt-0'>
                        <div className='flex flex-wrap gap-1'>
                          {rankedLabels(issue.labels).map((label) => (
                            <Badge
                              key={label}
                              variant='outline'
                              className={`font-mono text-[0.65rem] ${KIND_CLASS[labelKind(label)]}`}
                            >
                              {label}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
