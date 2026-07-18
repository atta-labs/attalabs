import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { isVercelDeploy } from '@/lib/env'
import { readRegistry } from '@/lib/repo-state'
import { ProjectsSubBar } from './ProjectsSubBar'

export default async function ProjectsLayout({ children }: { children: ReactNode }) {
  if (isVercelDeploy()) notFound()

  const projects = await readRegistry()
  // StudioShell owns the scroll container (`studio/layout.tsx`); this layout adds
  // no overflow/height of its own. The sub-bar is `sticky top-0` so it pins under
  // the topbar as StudioShell scrolls, instead of scrolling away with the content.
  return (
    <>
      <ProjectsSubBar projects={projects} />
      <div className='mx-auto max-w-4xl px-8 py-8'>{children}</div>
    </>
  )
}
