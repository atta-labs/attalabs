import type { ReactNode } from 'react'
import { DEFAULT_BOARD_SLUG, listProjectViews } from '@/lib/repo-state'
import { forgeProjectSegment } from '@/app/studio/_lib/tranche-href'
import { ProjectsSubBar, type SubBarProject } from './ProjectsSubBar'

export default async function ProjectsLayout({ children }: { children: ReactNode }) {
  const listing = await listProjectViews()
  const subBarProjects: SubBarProject[] = listing.registryPresent
    ? listing.projects.map((p) => ({ segment: p.name, href: `/studio/projects/${p.name}` }))
    : [
        ...listing.projects.map((p) => ({
          segment: forgeProjectSegment(p.name),
          href: `/studio/projects/${forgeProjectSegment(p.name)}`
        })),
        { segment: DEFAULT_BOARD_SLUG, href: `/studio/projects/${DEFAULT_BOARD_SLUG}`, label: 'All tranches' }
      ]
  // StudioShell owns the scroll container (`studio/layout.tsx`); this layout adds
  // no overflow/height of its own. The sub-bar is `sticky top-0` so it pins under
  // the topbar as StudioShell scrolls, instead of scrolling away with the content.
  return (
    <>
      <ProjectsSubBar projects={subBarProjects} />
      {/* max-w-4xl keeps prose pages (task-detail briefs) at a readable measure. A
          wide board table that doesn't fit this width scrolls inside its own
          container (the responsive Table wrapper), so the column width no longer
          needs the page widened to accommodate it.

          No `px-8`: StudioShell already applies it, and re-applying it here put
          the gutter at 4rem and cut the measure to 52rem (vs 56rem elsewhere).
          `pt-8` IS load-bearing and must stay — `ProjectsSubBar` cancels the
          shell's top padding with `-mt-8` so it can pin flush, so without this
          the first heading would butt against the sub-bar. It is the sub-bar's
          counterweight, not a duplicate of the shell's padding. */}
      <div className='mx-auto max-w-4xl pt-8'>{children}</div>
    </>
  )
}
