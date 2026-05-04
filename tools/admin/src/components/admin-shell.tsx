'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ProjectSwitcher } from './project-switcher'
import { isValidProject } from '@/lib/project-config'

interface AdminShellProps {
  children: ReactNode
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)
  const currentProject = segments[0] && isValidProject(segments[0]) ? segments[0] : 'vada'

  return (
    <div className='flex h-screen flex-col'>
      <header className='flex h-12 shrink-0 items-center gap-6 border-b border-border bg-card px-4'>
        <span className='font-mono text-sm text-muted-foreground'>tools/admin</span>
        <ProjectSwitcher />
        <nav className='flex items-center gap-1'>
          <Link
            href={`/${currentProject}/themes`}
            className={`rounded px-2.5 py-1 font-mono text-xs transition-colors ${
              pathname.includes('/themes')
                ? 'bg-foreground/10 text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Themes
          </Link>
        </nav>
        <div id='admin-header-slot' className='ml-auto flex items-center gap-3' />
      </header>
      <main className='flex-1 overflow-hidden'>{children}</main>
    </div>
  )
}
