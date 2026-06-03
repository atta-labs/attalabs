'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown, Check } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@atta/ui/basic/components'
import { PROJECT_CONFIG, PROJECT_KEYS, isValidProject } from '@/lib/project-config'
import type { ProjectKey } from '@/lib/project-config'

interface ProjectSwitcherProps {
  logos: Record<ProjectKey, string | null>
}

function ProjectLogo({ url, fallback }: { url: string | null; fallback: string }) {
  if (url)
    return (
      // biome-ignore lint/performance/noImgElement: need CSS filter for SVG contrast; next/image blocks filter
      <img src={url} alt='' className='h-3.5 w-auto shrink-0 brightness-0 invert' />
    )
  return (
    <span className='flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm bg-foreground/20 font-mono text-[8px] font-bold text-foreground'>
      {fallback}
    </span>
  )
}

export function ProjectSwitcher({ logos }: ProjectSwitcherProps) {
  const pathname = usePathname()
  const router = useRouter()

  const segments = pathname.split('/').filter(Boolean)
  const firstSegment = segments[0] ?? ''
  const currentProject: ProjectKey = isValidProject(firstSegment) ? firstSegment : 'vada'

  function handleSelect(next: string) {
    if (!isValidProject(next)) return
    // biome-ignore lint/suspicious/noDocumentCookie: dev tool — no CookieStore polyfill needed
    document.cookie = `atta-admin-project=${next};path=/;max-age=31536000`
    const subPath = segments.slice(1).join('/')
    router.push(subPath ? `/${next}/${subPath}` : `/${next}/themes`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className='flex h-7 items-center gap-1.5 rounded border border-border bg-background px-2 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring'>
        <ProjectLogo
          url={logos[currentProject]}
          fallback={PROJECT_CONFIG[currentProject].displayName[0]?.toUpperCase() ?? '?'}
        />
        {PROJECT_CONFIG[currentProject].displayName}
        <ChevronDown className='h-3 w-3 text-muted-foreground' />
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start'>
        {PROJECT_KEYS.map((key) => (
          <DropdownMenuItem
            key={key}
            onSelect={() => handleSelect(key)}
            className='flex items-center gap-2 font-mono text-xs'
          >
            <ProjectLogo url={logos[key]} fallback={PROJECT_CONFIG[key].displayName[0]?.toUpperCase() ?? '?'} />
            {PROJECT_CONFIG[key].displayName}
            <Check className={`ml-auto h-3 w-3 ${key === currentProject ? 'opacity-100' : 'opacity-0'}`} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
