'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@atta/ui/components/button'
import { cn } from '@atta/ui/lib/utils'

const navItems = [
  { label: 'Themes', href: '/themes', disabled: false },
  { label: 'Branding', href: '#', disabled: true },
  { label: 'Libraries', href: '#', disabled: true }
] as const

interface AdminShellProps {
  children: ReactNode
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname()

  return (
    <div className='flex h-screen flex-col'>
      {/* Top bar */}
      <header className='flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4'>
        <span className='font-mono text-sm text-muted-foreground'>tools/admin</span>
        <Button variant='outline' size='sm' disabled>
          Vada
        </Button>
      </header>

      {/* Body */}
      <div className='flex flex-1 overflow-hidden'>
        {/* Left sidebar */}
        <nav className='flex w-56 shrink-0 flex-col border-r border-border bg-card'>
          {navItems.map((item) => {
            const isActive = !item.disabled && pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(item.disabled && 'pointer-events-none')}
                tabIndex={item.disabled ? -1 : undefined}
                aria-disabled={item.disabled}
              >
                <Button
                  variant='ghost'
                  className={cn(
                    'w-full justify-start rounded-none',
                    isActive && 'bg-accent text-accent-foreground',
                    item.disabled && 'text-muted-foreground'
                  )}
                  disabled={item.disabled}
                >
                  {item.label}
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* Main content */}
        <main className='flex-1 overflow-auto'>{children}</main>
      </div>
    </div>
  )
}
