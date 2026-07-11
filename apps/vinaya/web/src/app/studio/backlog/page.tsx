/**
 * Backlog view (Studio task 2, #498) — every open Issue carrying no
 * `iteration:*` label, grouped by its `project:<name>` label. Closes the gap
 * where an Issue like #497 (`project:aeg-core`, no iteration) was invisible
 * on every existing page — `/studio/iterations` and `/studio/projects/[name]`
 * both query iteration-scoped data only.
 *
 * Grouping: a `project:<name>` label matching a registry row groups under
 * that project's name; a `project:<name>` label matching no registry row
 * still gets its own group, keyed by the literal label (not dropped); issues
 * with no `project:*` label at all fall into "No project".
 */

import { Badge } from '@atta/ui/components'
import type { Registry } from '@atta/aeg-core'
import { resolveGithubToken, resolveRepo } from '@atta/aeg-forge-state'
import type { Metadata } from 'next'
import { readRegistry } from '@/lib/aeg-fs'
import { fetchOpenIssuesWithoutIterationLabel, type BacklogIssue } from '@/lib/forge/fetch-open-issues'

// Forge reads derive live Issue state from GitHub — never serve from cache.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Backlog · Vinaya Studio'
}

type Group = { key: string; heading: string; issues: BacklogIssue[] }

const NO_PROJECT_KEY = '__no-project__'

function groupByProject(issues: BacklogIssue[], registry: Registry): Group[] {
  const groups = new Map<string, Group>()

  for (const issue of issues) {
    const projectLabel = issue.labels.find((label) => label.startsWith('project:'))
    let key: string
    let heading: string

    if (!projectLabel) {
      key = NO_PROJECT_KEY
      heading = 'No project'
    } else {
      const projectName = projectLabel.slice('project:'.length)
      const project = registry.find((p) => p.name === projectName)
      key = project ? project.name : projectLabel
      heading = project ? project.name : projectLabel
    }

    const group = groups.get(key) ?? { key, heading, issues: [] }
    group.issues.push(issue)
    groups.set(key, group)
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
  const [repo, token, registry] = await Promise.all([resolveRepo(), resolveGithubToken(), readRegistry()])
  const issues = repo && token ? await fetchOpenIssuesWithoutIterationLabel(repo.owner, repo.repo, token) : []
  const groups = groupByProject(issues, registry)

  return (
    <div className='space-y-8'>
      <header className='space-y-2'>
        <h1 className='font-serif text-3xl tracking-tight text-foreground'>Backlog</h1>
        <p className='font-sans text-sm text-muted-foreground'>
          Open issues with no <span className='font-mono'>iteration:*</span> label — tracked work outside any iteration.
        </p>
      </header>

      {groups.length === 0 ? (
        <p className='font-sans text-sm text-muted-foreground'>
          No backlog issues — everything is tracked under an iteration.
        </p>
      ) : (
        <div className='space-y-8'>
          {groups.map((group) => (
            <section key={group.key} className='space-y-3'>
              <h2 className='font-serif text-xl tracking-tight text-foreground'>{group.heading}</h2>
              <ul className='space-y-3'>
                {group.issues.map((issue) => {
                  const badgeLabels = issue.labels.filter((label) => !label.startsWith('project:'))
                  return (
                    <li key={issue.number} className='space-y-1 border-b border-border pb-3'>
                      <p className='font-mono text-sm text-foreground'>
                        <a
                          href={issue.url}
                          target='_blank'
                          rel='noreferrer'
                          className='hover:text-accent hover:underline'
                        >
                          #{issue.number} {issue.title}
                        </a>
                      </p>
                      {badgeLabels.length > 0 && (
                        <div className='flex flex-wrap gap-1'>
                          {badgeLabels.map((label) => (
                            <Badge
                              key={label}
                              variant='outline'
                              className='font-mono text-[0.65rem] text-muted-foreground border-border'
                            >
                              {label}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
