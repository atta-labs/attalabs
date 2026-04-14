'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Brain, FlaskConical, Layers } from 'lucide-react'
import { cn } from '@atta/ui/lib/utils'

const SCIENCE_NAV = [
  { href: '/science/overview', label: 'Overview', icon: BookOpen },
  { href: '/science/frameworks', label: 'Frameworks', icon: Layers },
  { href: '/science/agents', label: 'Agents', icon: Brain },
  { href: '/science/mechanics', label: 'Mechanics', icon: FlaskConical }
]

export function ScienceSidebar() {
  const pathname = usePathname()

  return (
    <aside className='shrink-0 sticky top-14 h-[calc(100dvh-3.5rem)] border-r border-sidebar-border bg-sidebar py-4 pl-6 pr-4'>
      <nav className='flex flex-col gap-0.5'>
        {SCIENCE_NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 font-sans text-sm transition-colors hover:text-foreground',
              pathname === href ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-muted-foreground'
            )}
          >
            <Icon className='h-3.5 w-3.5 shrink-0' />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
