'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { ProjectSwitcher } from './project-switcher'
import { isValidProject } from '@/lib/project-config'
import type { ProjectKey } from '@/lib/project-config'

const SEGMENT_LABELS: Record<string, string> = {
  themes: 'Themes',
  edit: 'Edit'
}

interface Crumb {
  label: string
  href: string | null
}

function buildCrumbs(project: string, segments: string[]): Crumb[] {
  const crumbs: Crumb[] = []
  let hrefAcc = `/${project}`

  for (const seg of segments) {
    const label = SEGMENT_LABELS[seg]
    if (!label) {
      hrefAcc += `/${seg}`
      continue
    }
    hrefAcc += `/${seg}`
    crumbs.push({ label, href: hrefAcc })
  }

  if (crumbs.length > 0) {
    const last = crumbs[crumbs.length - 1]!
    crumbs[crumbs.length - 1] = { label: last.label, href: null }
  }

  return crumbs
}

interface AdminShellProps {
  children: ReactNode
  logos: Record<ProjectKey, string | null>
}

export function AdminShell({ children, logos }: AdminShellProps) {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)
  const currentProject = segments[0] && isValidProject(segments[0]) ? segments[0] : 'vada'
  const crumbs = buildCrumbs(currentProject, segments.slice(1))

  return (
    <div className='flex h-screen flex-col'>
      <header className='flex h-12 shrink-0 items-center gap-3 border-b border-border bg-card px-4'>
        <ProjectSwitcher logos={logos} />
        <span className='font-mono text-sm text-muted-foreground'>tools/admin</span>
        {crumbs.length > 0 && (
          <nav aria-label='breadcrumb' className='flex items-center gap-1'>
            {crumbs.map((crumb, i) => (
              <span key={crumb.label} className='flex items-center gap-1'>
                {i > 0 && <ChevronRight className='h-3 w-3 text-border' />}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className='font-mono text-xs text-muted-foreground transition-colors hover:text-foreground'
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className='font-mono text-xs text-foreground'>{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <div id='admin-header-slot' className='ml-auto flex items-center gap-3' />
      </header>
      <main className='flex-1 overflow-hidden'>{children}</main>
    </div>
  )
}
