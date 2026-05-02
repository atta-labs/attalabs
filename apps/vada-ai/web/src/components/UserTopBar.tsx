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
import { NextLink } from '@atta/ui/lib/next-link'
import { SignInButton, useClerk, useUser } from '@atta/auth'
import { LogOut, Settings } from 'lucide-react'
import { usePathname } from 'next/navigation'

interface UserTopBarProps {
  logo?: ReactNode
}

const PUBLIC_NAV = [
  { href: '/trust', label: 'Trust · Vāda', exact: false },
  { href: '/mcp', label: 'MCP Integration', exact: false },
  { href: '/teams', label: 'Teams', exact: false }
]

const AUTH_NAV = [
  { href: '/deliberate', label: 'Deliberate', exact: true },
  { href: '/sessions', label: 'My Sessions', exact: true }
]

export function UserTopBar({ logo }: UserTopBarProps) {
  const { signOut } = useClerk()
  const { user } = useUser()
  const pathname = usePathname()

  const isActive = (href: string, exact: boolean) => (exact ? pathname === href : pathname.startsWith(href))

  const allLinks = user ? [...PUBLIC_NAV, ...AUTH_NAV] : PUBLIC_NAV
  const leftLogo = logo ?? (
    <NextLink variant='unstyled' href='/' className='text-xs text-foreground'>
      VADA.AI
    </NextLink>
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
          <NextLink key={href} variant='nav' active={isActive(href, exact)} href={href} className='text-xs'>
            {label}
          </NextLink>
        ))}
      </div>
      {/* Right: scheme toggle + settings + avatar dropdown (auth) or sign-in (anonymous) */}
      <div className='flex items-center gap-3 justify-self-end'>
        <ColorSchemeToggle />
        {user && (
          <Button variant='ghost' size='icon' asChild aria-label='Settings' title='Settings'>
            <NextLink variant='unstyled' href='/settings'>
              <Settings className='h-4 w-4' />
            </NextLink>
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
          <SignInButton mode='modal' fallbackRedirectUrl={pathname}>
            <Button variant='outline' size='sm' className='text-xs'>
              Sign in
            </Button>
          </SignInButton>
        )}
      </div>
    </nav>
  )
}
