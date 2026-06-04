'use client'

import { Button } from '@atta/ui/components/button'
import { ColorSchemeToggle } from '@atta/ui/lib/color-scheme-toggle'
import { NextLink } from '@atta/ui/lib/next-link'
import { Logo } from '@atta/ui/shared'
import { useClerk, useUser } from '@clerk/nextjs'
import { ExternalLink, LogOut } from 'lucide-react'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/admin/ui', label: 'User Interface', icon: '◐' },
  { href: '/admin/settings', label: 'Settings', icon: '⚙' }
]

export function AdminTopBar({ username, logoUrl }: { username: string; logoUrl?: string | null }) {
  const pathname = usePathname()
  const { signOut } = useClerk()
  const { user } = useUser()

  return (
    <nav className='flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-4'>
      {/* Left: Logo + Nav */}
      <div className='flex items-center gap-1'>
        <NextLink variant='unstyled' href='/admin' className='flex items-center gap-2 px-2'>
          {logoUrl ? (
            <Logo dark={logoUrl} alt='Herald' size='h-5' />
          ) : (
            <span className='font-sans text-sm font-bold tracking-tight'>Herald</span>
          )}
        </NextLink>
        <span className='mx-2 text-border'>|</span>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <NextLink
              key={item.href}
              variant='nav'
              active={isActive}
              href={item.href}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs hover:bg-accent/10 ${isActive ? 'bg-accent/10' : ''}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </NextLink>
          )
        })}
      </div>

      {/* Right: Color scheme toggle + Envoy link + Avatar + Sign out */}
      <div className='flex items-center gap-3'>
        <ColorSchemeToggle />
        <NextLink
          variant='subtle'
          href={`/${username}`}
          target='_blank'
          className='inline-flex items-center gap-1 rounded-md px-3 py-1.5 hover:bg-accent/10'
        >
          /{username}
          <ExternalLink className='h-3 w-3' />
        </NextLink>
        {user?.imageUrl && (
          // biome-ignore lint/performance/noImgElement: Clerk avatar URL is external
          <img src={user.imageUrl} alt='' className='h-6 w-6 rounded-full' />
        )}
        <Button
          variant='ghost'
          size='sm'
          onClick={() => signOut({ redirectUrl: '/' })}
          className='gap-1.5 font-mono text-xs text-muted-foreground'
        >
          Sign out
          <LogOut className='h-3.5 w-3.5' />
        </Button>
      </div>
    </nav>
  )
}
