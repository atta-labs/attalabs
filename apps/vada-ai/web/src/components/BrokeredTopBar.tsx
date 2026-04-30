'use client'

import type { ReactNode } from 'react'
import { ColorSchemeToggle } from '@atta/ui/lib/color-scheme-toggle'
import { NextLink } from '@atta/ui/lib/next-link'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@atta/ui'
import { SignInButton, useClerk, useUser } from '@atta/auth'
import { LogOut, Settings } from 'lucide-react'
import { usePathname } from 'next/navigation'

interface BrokeredTopBarProps {
  logo?: ReactNode
}

const AUTH_NAV = [
  { href: '/sessions/consultations', label: 'Consultations', exact: true },
  { href: '/mcp', label: 'MCP Install', exact: true }
]

export function BrokeredTopBar({ logo }: BrokeredTopBarProps) {
  const { signOut } = useClerk()
  const { user } = useUser()
  const pathname = usePathname()

  const isActive = (href: string, exact: boolean) => (exact ? pathname === href : pathname.startsWith(href))

  const displayName = user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress
  const email = user?.primaryEmailAddress?.emailAddress
  const initial = (displayName || email || '?').charAt(0).toUpperCase()

  return (
    <nav className='grid h-full w-full grid-cols-3 items-center px-4 text-muted-foreground'>
      {/* Left: logo + subtitle */}
      <div className='flex items-center justify-start gap-1'>
        <div>{logo}</div>
        <div className='flex flex-col items-center justify-start text-white'>
          <div>BROKERED</div>
          <div className='text-xs text-muted-foreground'>DELIVERATION ENGINE</div>
        </div>
      </div>
      {/* Center: nav links */}
      <div className='flex items-center gap-8 justify-self-center'>
        {user &&
          AUTH_NAV.map(({ href, label, exact }) => (
            <NextLink key={href} variant='nav' active={isActive(href, exact)} href={href} className='text-xs'>
              {label}
            </NextLink>
          ))}
      </div>
      {/* Right: scheme toggle + settings + avatar dropdown */}
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
