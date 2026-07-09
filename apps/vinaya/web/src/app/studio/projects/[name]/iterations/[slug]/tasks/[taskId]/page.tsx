import { Badge } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import type { DerivedTask } from '@atta/aeg-core'
import { CircleDot, ExternalLink, FileText, GitPullRequest, MessageSquareWarning } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { readIteration, readProject } from '@/lib/aeg-fs'
import { fetchPullRequestBriefs, type PullRequestBrief } from '@/lib/forge/fetch-pull-request-brief'
import { loadIterationSnapshot } from '@/lib/forge/load-snapshot'
import { statusVisual } from '../../_lib/status-display'

// Forge reads derive live Issue/PR state from GitHub — never serve from cache.
export const dynamic = 'force-dynamic'

type Params = { name: string; slug: string; taskId: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { name, slug, taskId } = await params
  return { title: `${taskId} · ${slug} · ${name} · Vinaya Studio` }
}

const markdownComponents = {
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className='mt-8 mb-3 font-serif text-2xl font-light leading-tight text-foreground' {...props} />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className='mt-8 mb-3 font-serif text-xl font-light leading-tight text-foreground' {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className='mt-6 mb-2 font-serif text-lg font-medium leading-snug text-foreground' {...props} />
  ),
  h4: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h4
      className='mt-5 mb-2 font-sans text-sm font-semibold uppercase tracking-wide text-muted-foreground'
      {...props}
    />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className='my-3 leading-relaxed text-foreground' {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className='my-3 list-disc space-y-1 pl-6 text-foreground' {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className='my-3 list-decimal space-y-1 pl-6 text-foreground' {...props} />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => <li className='leading-relaxed' {...props} />,
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className='my-4 border-l-2 border-accent/60 pl-4 text-muted-foreground italic' {...props} />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code className='rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground' {...props} />
  ),
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
    <pre className='my-4 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs text-foreground' {...props} />
  ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a className='text-accent underline-offset-4 hover:underline' rel='noreferrer' {...props} />
  ),
  hr: (props: React.HTMLAttributes<HTMLHRElement>) => <hr className='my-6 border-border opacity-50' {...props} />,
  table: (props: React.TableHTMLAttributes<HTMLTableElement>) => (
    <div className='my-4 overflow-x-auto'>
      <table className='w-full border-collapse text-sm' {...props} />
    </div>
  ),
  th: (props: React.ThHTMLAttributes<HTMLTableCellElement>) => (
    <th className='border-b border-border px-3 py-2 text-left font-sans font-semibold text-foreground' {...props} />
  ),
  td: (props: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td className='border-b border-border/60 px-3 py-2 align-top text-foreground' {...props} />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => <strong className='font-semibold text-foreground' {...props} />,
  em: (props: React.HTMLAttributes<HTMLElement>) => <em className='italic' {...props} />
}

export default async function TaskDetailPage({ params }: { params: Promise<Params> }) {
  const { name, slug, taskId } = await params
  const [project, detail] = await Promise.all([readProject(name), readIteration(slug)])
  if (!project) notFound()
  if (!detail) notFound()

  const { iteration, archived } = detail
  const taskRow = iteration.tasks.find((t) => t.id === taskId)
  if (!taskRow) notFound()

  const snapshot = await loadIterationSnapshot(iteration, slug)
  const derived: DerivedTask | undefined = snapshot.derived.tasks.find((dt) => dt.task.id === taskId)
  if (!derived) notFound()

  const brief = await loadBrief({ snapshot, slug, taskId })
  const visual = statusVisual(derived.status)
  const iterationHref = `/studio/projects/${project.name}/iterations/${slug}`
  const issueUrl =
    taskRow.issue !== null && snapshot.repo
      ? `https://github.com/${snapshot.repo.owner}/${snapshot.repo.repo}/issues/${taskRow.issue}`
      : null

  return (
    <div className='space-y-8'>
      <nav className='font-mono text-xs text-muted-foreground'>
        <NextLink variant='unstyled' href='/studio/projects' className='hover:text-accent'>
          projects
        </NextLink>
        <span className='px-1.5 text-muted-foreground/60'>/</span>
        <NextLink variant='unstyled' href={`/studio/projects/${project.name}`} className='hover:text-accent'>
          {project.name}
        </NextLink>
        <span className='px-1.5 text-muted-foreground/60'>/</span>
        <NextLink variant='unstyled' href={iterationHref} className='hover:text-accent'>
          {iteration.name || slug}
        </NextLink>
        <span className='px-1.5 text-muted-foreground/60'>/</span>
        <span className='text-foreground/80'>{taskRow.id}</span>
      </nav>

      <header className='space-y-3'>
        <div className='flex flex-wrap items-center gap-3'>
          <p className='font-mono text-xs uppercase tracking-widest text-muted-foreground'>Task</p>
          <Badge className={`${visual.badgeClass} font-mono text-[0.65rem] uppercase tracking-wider`}>
            {visual.label}
          </Badge>
          {archived ? (
            <Badge className='bg-muted/40 text-muted-foreground border-border'>Archived iteration</Badge>
          ) : null}
        </div>
        <h1 className='font-serif text-3xl tracking-tight text-foreground'>
          <span className='font-mono text-2xl text-muted-foreground'>{taskRow.id}</span>
          <span className='px-3 text-muted-foreground/40'>·</span>
          <span>{taskRow.title}</span>
        </h1>
        <p className='font-sans text-sm text-muted-foreground/80'>{visual.description}</p>
      </header>

      <section className='grid gap-4 md:grid-cols-2'>
        <MetaPanel
          taskRow={taskRow}
          dependsOnNotMerged={derived.blockers.dependsOnNotMerged}
          conflictsWithOpen={derived.blockers.conflictsWithOpenOrInFlight}
          projectName={project.name}
          iterationSlug={slug}
        />
        <LinksPanel issueUrl={issueUrl} brief={brief} />
      </section>

      <section className='space-y-3'>
        <div className='flex items-center justify-between gap-3'>
          <h2 className='flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground'>
            <FileText className='size-4' aria-hidden />
            <span>Brief</span>
          </h2>
          <p className='font-mono text-[0.65rem] text-muted-foreground/70'>from the PR body</p>
        </div>
        <BriefBody brief={brief} status={derived.status} unavailable={snapshot.unavailable} taskId={taskRow.id} />
      </section>
    </div>
  )
}

type LoadBriefArgs = {
  snapshot: Awaited<ReturnType<typeof loadIterationSnapshot>>
  slug: string
  taskId: string
}

async function loadBrief({ snapshot, slug, taskId }: LoadBriefArgs): Promise<PullRequestBrief | null> {
  if (!snapshot.repo) return null
  const { briefs } = await fetchPullRequestBriefs({
    owner: snapshot.repo.owner,
    repo: snapshot.repo.repo,
    iteration: slug,
    taskIds: [taskId]
  })
  return briefs.get(taskId) ?? null
}

function MetaPanel({
  taskRow,
  dependsOnNotMerged,
  conflictsWithOpen,
  projectName,
  iterationSlug
}: {
  taskRow: { id: string; issue: number | null; projects: string[]; dependsOn: string[]; conflictsWith: string[] }
  dependsOnNotMerged: string[]
  conflictsWithOpen: string[]
  projectName: string
  iterationSlug: string
}) {
  return (
    <div className='rounded-lg border border-border bg-card p-4'>
      <h3 className='mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground'>Identity</h3>
      <dl className='grid gap-2 font-mono text-xs text-muted-foreground sm:grid-cols-[10ch_1fr]'>
        <dt>task</dt>
        <dd className='font-semibold text-foreground'>{taskRow.id}</dd>
        <dt>issue</dt>
        <dd>{taskRow.issue !== null ? `#${taskRow.issue}` : '—'}</dd>
        <dt>projects</dt>
        <dd className='flex flex-wrap gap-1'>
          {taskRow.projects.map((p) => (
            <Badge
              key={p}
              className='bg-muted/40 text-muted-foreground border-border font-mono text-[0.6rem] uppercase tracking-wider'
            >
              {p}
            </Badge>
          ))}
          {taskRow.projects.length === 0 ? <span className='text-muted-foreground/60'>—</span> : null}
        </dd>
        <dt>depends-on</dt>
        <dd>
          <EdgeList
            items={taskRow.dependsOn}
            blockers={dependsOnNotMerged}
            projectName={projectName}
            iterationSlug={iterationSlug}
          />
        </dd>
        <dt>conflicts-with</dt>
        <dd>
          <EdgeList
            items={taskRow.conflictsWith}
            blockers={conflictsWithOpen}
            projectName={projectName}
            iterationSlug={iterationSlug}
          />
        </dd>
      </dl>
    </div>
  )
}

function EdgeList({
  items,
  blockers,
  projectName,
  iterationSlug
}: {
  items: string[]
  blockers: string[]
  projectName: string
  iterationSlug: string
}) {
  if (items.length === 0) return <span className='text-muted-foreground/60'>—</span>
  const blockerSet = new Set(blockers)
  return (
    <span className='flex flex-wrap gap-1'>
      {items.map((id) => {
        const blocking = blockerSet.has(id)
        return (
          <NextLink
            key={id}
            variant='unstyled'
            href={`/studio/projects/${projectName}/iterations/${iterationSlug}/tasks/${id}`}
            className={
              blocking
                ? 'rounded border border-warning/40 bg-warning/10 px-1.5 py-px font-mono text-[0.65rem] text-warning hover:border-warning'
                : 'rounded border border-border bg-muted/30 px-1.5 py-px font-mono text-[0.65rem] text-muted-foreground hover:border-accent hover:text-accent'
            }
          >
            {id}
          </NextLink>
        )
      })}
    </span>
  )
}

function LinksPanel({ issueUrl, brief }: { issueUrl: string | null; brief: PullRequestBrief | null }) {
  return (
    <div className='rounded-lg border border-border bg-card p-4'>
      <h3 className='mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground'>Forge</h3>
      <ul className='space-y-2 font-sans text-sm'>
        <li>
          {issueUrl ? (
            <a
              href={issueUrl}
              target='_blank'
              rel='noreferrer'
              className='inline-flex items-center gap-2 text-foreground hover:text-accent'
            >
              <CircleDot className='size-4 text-muted-foreground' aria-hidden />
              <span>Issue</span>
              <ExternalLink className='size-3 text-muted-foreground' aria-hidden />
            </a>
          ) : (
            <span className='inline-flex items-center gap-2 text-muted-foreground/60'>
              <CircleDot className='size-4' aria-hidden />
              <span>No Issue</span>
            </span>
          )}
        </li>
        <li>
          {brief ? (
            <a
              href={brief.url}
              target='_blank'
              rel='noreferrer'
              className='inline-flex items-center gap-2 text-foreground hover:text-accent'
            >
              <GitPullRequest className='size-4 text-muted-foreground' aria-hidden />
              <span>Pull request #{brief.number}</span>
              <span className='font-mono text-[0.65rem] text-muted-foreground'>{brief.state}</span>
              <ExternalLink className='size-3 text-muted-foreground' aria-hidden />
            </a>
          ) : (
            <span className='inline-flex items-center gap-2 text-muted-foreground/60'>
              <GitPullRequest className='size-4' aria-hidden />
              <span>No PR yet</span>
            </span>
          )}
        </li>
      </ul>
    </div>
  )
}

function BriefBody({
  brief,
  status,
  unavailable,
  taskId
}: {
  brief: PullRequestBrief | null
  status: DerivedTask['status']
  unavailable: boolean
  taskId: string
}) {
  if (brief && brief.body.trim().length > 0) {
    return (
      <article className='rounded-lg border border-border bg-card p-5 text-sm text-card-foreground'>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {brief.body}
        </ReactMarkdown>
      </article>
    )
  }

  if (unavailable) {
    return (
      <div className='flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-warning'>
        <MessageSquareWarning className='size-4 shrink-0 translate-y-0.5' aria-hidden />
        <p className='font-sans text-xs leading-relaxed'>
          Live brief unavailable — could not reach the forge. The brief lives in the PR body; once the PR is opened and
          a GitHub token is available it will render here.
        </p>
      </div>
    )
  }

  if (status === 'backlog' || status === 'todo') {
    return (
      <p className='font-sans text-sm text-muted-foreground/70'>
        Task <span className='font-mono text-foreground'>{taskId}</span> is not yet dispatched. Briefs are written when
        the task is picked up and pasted into the PR body — there is no brief to show yet.
      </p>
    )
  }

  return (
    <p className='font-sans text-sm text-muted-foreground/70'>
      No PR body found for this task. If a PR exists for branch{' '}
      <span className='font-mono text-foreground'>task/{taskId}</span> but isn't showing, the head-ref may not match the
      Vinaya convention <span className='font-mono'>task/&lt;iteration&gt;/&lt;id&gt;</span>.
    </p>
  )
}
