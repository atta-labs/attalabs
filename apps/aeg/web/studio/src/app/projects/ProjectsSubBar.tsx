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
        return 'bg-emerald-500 dark:bg-emerald-400'
      case 'cetana':
        return 'bg-sky-500 dark:bg-sky-400'
      case 'herald':
        return 'bg-purple-500 dark:bg-purple-400'
      case 'aeg':
        return 'bg-amber-500 dark:bg-amber-400'
      case 'aeg-core':
        return 'bg-orange-500 dark:bg-orange-400'
      case 'atta':
        return 'bg-pink-500 dark:bg-pink-400'
      case 'desktop':
        return 'bg-zinc-400 dark:bg-zinc-500'
      default:
        return 'bg-zinc-400 dark:bg-zinc-500'
    }
  }

  return (
    <Flex
      align='center'
      justify='start'
      gap={4}
      className='border-b border-border bg-card px-6 py-2.5 h-10 font-mono text-[11px] select-none shrink-0'
    >
      <Text
        as='span'
        size='xs'
        weight='bold'
        className='font-sans tracking-widest uppercase text-muted-foreground/80 text-[10px]'
      >
        Projects
      </Text>
      <Text as='span' className='text-muted-foreground/30'>
        ·
      </Text>
      <Flex align='center' gap={2} className='overflow-x-auto no-scrollbar'>
        {projects.map((p, idx) => {
          const isActive = activeProjectName === p.name
          return (
            <Flex key={p.name} as='span' align='center' gap={2}>
              <NextLink
                variant='unstyled'
                href={`/projects/${p.name}`}
                className={`px-3 py-1 rounded-full transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
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
