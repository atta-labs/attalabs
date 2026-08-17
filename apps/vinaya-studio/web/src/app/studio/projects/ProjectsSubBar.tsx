'use client'

import { usePathname } from 'next/navigation'
import { ChromeFrame } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Flex } from '@atta/ui/shared'
import type { Project } from '@attalabs/aeg-core'

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

  // Rendered through `ChromeFrame variant='bar'` — the same canonical retro
  // sticky as the docs breadcrumb (`StickyDocHeader`) — so it reads as a
  // floating inset card under retro and a flush strip under the flush libraries.
  // The outer div owns placement; the frame owns the content box (`bg-card` +
  // `border-b` come from the frame, not from here). No full-bleed
  // `mx-[calc(50%-50vw)]`: the bar sits inset to StudioShell's centered
  // `max-w-6xl` column, matching the float. `-mt-6` cancels most of
  // StudioShell's `py-8` (32px) top padding but deliberately leaves an ~8px gap
  // so the retro card's top border/shadow clears the topbar's own floating
  // shadow instead of being sliced against it (the same clearance the docs
  // breadcrumb gets from `top-2`). Coupled to that exact `py-8` and the
  // counterweight to `projects/layout.tsx`'s `pt-8`; if the shell padding
  // changes, revisit.
  // `h-10` is the bar's pinned height: sibling sticky headers in this same
  // scroll container (the tranche board's task table) offset by `top-10`.
  return (
    <div className='sticky top-0 z-20 -mt-6 shrink-0'>
      <ChromeFrame variant='bar' className='h-10 justify-center gap-4 px-6 font-mono text-[11px] select-none'>
        <Flex align='center' gap={2} className='overflow-x-auto no-scrollbar'>
          {projects.map((p, idx) => {
            const isActive = activeProjectName === p.name
            return (
              <Flex key={p.name} as='span' align='center' gap={2}>
                <NextLink
                  variant='unstyled'
                  href={`/studio/projects/${p.name}`}
                  className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className='text-xs'>{p.name}</span>
                </NextLink>
                {idx < projects.length - 1 && <span className='text-muted-foreground/30'>·</span>}
              </Flex>
            )
          })}
        </Flex>
      </ChromeFrame>
    </div>
  )
}
