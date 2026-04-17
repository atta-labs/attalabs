'use client'

import type { ReactNode } from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@atta/ui'
import { ColorSchemeToggle } from '@atta/ui/lib/color-scheme-toggle'
import { useClerk, useUser } from '@clerk/nextjs'
import { LogOut, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface UserTopBarProps {
  logo?: ReactNode
}

const PUBLIC_NAV = [{ href: '/science', label: 'Science', exact: false }]

const AUTH_NAV = [
  { href: '/deliberate', label: 'Deliberate', exact: true },
  { href: '/history', label: 'History', exact: true }
]

export function UserTopBar({ logo }: UserTopBarProps) {
  const { signOut, openSignIn } = useClerk()
  const { user } = useUser()
  const pathname = usePathname()

  const isActive = (href: string, exact: boolean) => (exact ? pathname === href : pathname.startsWith(href))

  const allLinks = user ? [...PUBLIC_NAV, ...AUTH_NAV] : PUBLIC_NAV
  const leftLogo = logo ?? (
    <Link href='/' className='text-xs text-foreground'>
      VADA.AI
    </Link>
  )

  const displayName = user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress
  const email = user?.primaryEmailAddress?.emailAddress
  const initial = (displayName || email || '?').charAt(0).toUpperCase()

  return (
    <nav className='grid h-full w-full grid-cols-3 items-center px-4 text-muted-foreground'>
      {/* Left: logo */}
      <div className='flex items-center justify-self-start'>{leftLogo}</div>
      {/* Center: nav links */}
      <div className='flex items-center gap-8 justify-self-center'>
        {allLinks.map(({ href, label, exact }) => (
          <Link
            key={href}
            href={href}
            className={`text-xs transition-colors hover:text-foreground ${isActive(href, exact) ? 'text-foreground' : ''}`}
          >
            {label}
          </Link>
        ))}
      </div>
      {/* Right: scheme toggle + settings + avatar dropdown (auth) or sign-in (anonymous) */}
      <div className='flex items-center gap-3 justify-self-end'>
        <ColorSchemeToggle />
        {user && (
          <Button variant='ghost' size='icon' asChild aria-label='Settings' title='Settings'>
            <Link href='/settings'>
              <Settings className='h-4 w-4' />
            </Link>
          </Button>
        )}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger className='rounded-full outline-none ring-offset-background transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'>
              {user.imageUrl ? (
                // biome-ignore lint/performance/noImgElement: Clerk avatar URL is external
                <img src={user.imageUrl} alt='' className='h-6 w-6 rounded-full' />
              ) : (
                <span className='flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground'>
                  {initial}
                </span>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-56'>
              {(displayName || email) && (
                <>
                  <DropdownMenuLabel className='font-normal'>
                    <div className='flex flex-col gap-0.5'>
                      {displayName && <span className='text-sm text-foreground'>{displayName}</span>}
                      {email && <span className='text-xs text-muted-foreground'>{email}</span>}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onSelect={() => signOut({ redirectUrl: '/' })} className='cursor-pointer'>
                <LogOut className='h-4 w-4' />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant='outline' size='sm' className='text-xs' onClick={() => openSignIn()}>
            Sign in
          </Button>
        )}
      </div>
    </nav>
  )
}
