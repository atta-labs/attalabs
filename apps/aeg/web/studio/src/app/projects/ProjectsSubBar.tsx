'use client'

import { usePathname } from 'next/navigation'
import { NextLink } from '@atta/ui/lib/next-link'
import { Flex, Text } from '@atta/ui/shared'
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

  const getBulletColorClass = (name: string) => {
    switch (name) {
      case 'vada':
        return 'bg-project-vada'
      case 'cetana':
        return 'bg-project-cetana'
      case 'herald':
        return 'bg-project-herald'
      case 'aeg':
        return 'bg-project-aeg'
      case 'aeg-core':
        return 'bg-project-aeg-core'
      case 'atta':
        return 'bg-project-atta'
      case 'desktop':
        return 'bg-project-desktop'
      default:
        return 'bg-project-desktop'
    }
  }

  return (
    <Flex
      align='center'
      justify='start'
      gap={4}
      className='border-b border-border bg-card px-6 py-2.5 h-10 font-mono text-[11px] select-none shrink-0'
    >
      <Flex align='center' gap={2} className='overflow-x-auto no-scrollbar'>
        {projects.map((p, idx) => {
          const isActive = activeProjectName === p.name
          return (
            <Flex key={p.name} as='span' align='center' gap={2}>
              <NextLink
                variant='unstyled'
                href={`/projects/${p.name}`}
                className={`px-3 py-1 rounded-full transition-colors flex items-center gap-1.5 ${
                  isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className={`size-1.5 rounded-full shrink-0 ${getBulletColorClass(p.name)}`} />
                <Text as='span'>{p.name}</Text>
              </NextLink>
              {idx < projects.length - 1 && (
                <Text as='span' className='text-muted-foreground/30'>
                  ·
                </Text>
              )}
            </Flex>
          )
        })}
      </Flex>
    </Flex>
  )
}
