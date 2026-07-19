'use client'

import { usePathname } from 'next/navigation'
import { NextLink } from '@atta/ui/lib/next-link'
import { Flex } from '@atta/ui/shared'
import type { Project } from '@atta/aeg-core'

export function ProjectsSubBar({ projects }: { projects: Project[] }) {
  const pathname = usePathname()

  const getActiveProjectName = () => {
    const parts = pathname?.split('/') ?? []
    const index = parts.indexOf('projects')
    if (index !== -1 && parts[index + 1]) {
      return parts[index + 1]
    }
    return null
  }

  const activeProjectName = getActiveProjectName()

  // `sticky top-0` pins the bar under the topbar within StudioShell's scroll
  // container. `-mt-8` + `mx-[calc(50%-50vw)]` break it out of StudioShell's
  // centered `max-w-6xl px-8 py-8` inner wrapper so the bar is flush-top and
  // full-bleed — both are DELIBERATELY coupled to that exact `px-8 py-8`
  // padding; if StudioShell's padding changes, revisit these two utilities.
  // `h-10` is the bar's pinned height: sibling sticky headers in this same
  // scroll container (the iteration board's task table) offset by `top-10`.
  return (
    <Flex
      align='center'
      justify='center'
      gap={4}
      className='sticky top-0 z-20 -mt-8 mx-[calc(50%-50vw)] border-b border-border bg-card px-6 py-2.5 h-10 font-mono text-[11px] select-none shrink-0'
    >
      <Flex align='center' gap={2} className='overflow-x-auto no-scrollbar'>
        {projects.map((p, idx) => {
          const isActive = activeProjectName === p.name
          return (
            <Flex key={p.name} as='span' align='center' gap={2}>
              <NextLink
                variant='unstyled'
                href={`/studio/projects/${p.name}`}
                className={`px-3 py-1 rounded-full transition-colors flex items-center gap-1.5 ${
                  isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className='text-xs'>{p.name}</span>
              </NextLink>
              {idx < projects.length - 1 && <span className='text-muted-foreground/30'>·</span>}
            </Flex>
          )
        })}
      </Flex>
    </Flex>
  )
}
