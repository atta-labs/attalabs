import type { ReactNode } from 'react'
import { readRegistry } from '@/lib/aeg-fs'
import type { AegNavGroup } from './StudioSidebar'
import { StudioSidebar } from './StudioSidebar'

export async function StudioShell({ children }: { children: ReactNode }) {
  const projects = await readRegistry().catch(() => [])
  const groups: AegNavGroup[] = [
    {
      id: 'projects',
      label: 'Projects',
      items: [
        { slug: 'all-projects', href: '/projects', title: 'All projects' },
        ...projects.map((p) => ({
          slug: `project-${p.name}`,
          href: `/projects/${p.name}`,
          title: p.name,
          indent: true as const,
          matchPrefix: true as const
        }))
      ]
    },
    {
      id: 'iterations',
      label: 'Iterations',
      items: [{ slug: 'all-iterations', href: '/iterations', title: 'All iterations' }]
    },
    {
      id: 'explore',
      label: 'Explore',
      items: [
        { slug: 'graph', href: '/graph', title: 'Dependency graph' },
        { slug: 'docs', href: '/docs', title: 'Docs' }
      ]
    }
  ]
  return (
    <div className='flex h-[calc(100dvh-3.5rem)] overflow-hidden'>
      <aside className='h-full shrink-0 overflow-hidden'>
        <StudioSidebar groups={groups} />
      </aside>
      <div className='flex-1 min-w-0 overflow-y-auto'>
        <div className='mx-auto max-w-3xl px-8 py-8'>{children}</div>
      </div>
    </div>
  )
}
