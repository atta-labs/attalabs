import type { ReactNode } from 'react'
import { readRegistry } from '@/lib/aeg-fs'
import { ProjectsSubBar } from './ProjectsSubBar'

export default async function ProjectsLayout({ children }: { children: ReactNode }) {
  const projects = await readRegistry()
  return (
    <div className='flex flex-col h-full overflow-hidden'>
      <ProjectsSubBar projects={projects} />
      <div className='flex-1 overflow-y-auto px-8 py-8'>
        <div className='mx-auto max-w-4xl'>{children}</div>
      </div>
    </div>
  )
}
