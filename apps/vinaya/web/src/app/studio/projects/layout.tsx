import { Flex } from '@atta/ui/shared'
import type { ReactNode } from 'react'
import { readRegistry } from '@/lib/aeg-fs'
import { ProjectsSubBar } from './ProjectsSubBar'

export default async function ProjectsLayout({ children }: { children: ReactNode }) {
  const projects = await readRegistry()
  return (
    <Flex direction='column' className='h-full overflow-hidden'>
      <ProjectsSubBar projects={projects} />
      {/* Padding lives on the inner wrapper, NOT the scroll container — sticky
          descendants (the tasks-table header) pin to the scrollport edge, and
          scrollport padding offsets them below the visible top with rows
          bleeding through the gap. */}
      <div className='flex-1 overflow-y-auto'>
        <div className='mx-auto max-w-4xl px-8 py-8'>{children}</div>
      </div>
    </Flex>
  )
}
