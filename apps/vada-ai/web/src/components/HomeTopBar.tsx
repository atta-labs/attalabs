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
import { useClerk, useUser } from '@clerk/nextjs'
import { LogOut, Settings } from 'lucide-react'
import { usePathname } from 'next/navigation'

interface HomeTopBarProps {
  logo?: ReactNode
}

export function HomeTopBar({ logo }: HomeTopBarProps) {
  const { signOut, openSignIn } = useClerk()
  const { user } = useUser()
  const pathname = usePathname()

  const isActive = (href: string) => pathname === href || pathname.startsWith(href)

  const displayName = user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress
  const email = user?.primaryEmailAddress?.emailAddress
  const initial = (displayName || email || '?').charAt(0).toUpperCase()

  return (
    <nav className='grid h-full w-full grid-cols-3 items-center px-4 text-muted-foreground'>
      {/* Left: logo + subtitle */}
      <div className='flex flex-col items-start justify-self-start'>
        <div>{logo}</div>
      </div>

      {/* Center: navigation menu */}
      <div className='flex items-center gap-8 justify-self-center'>
        <NextLink href='/autonomous' variant='nav' active={isActive('/autonomous')} className='text-xs'>
          Autonomous Deliberation
        </NextLink>
        <NextLink href='/brokered' variant='nav' active={isActive('/brokered')} className='text-xs'>
          Brokered Deliberation
        </NextLink>
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
          <Button variant='outline' size='sm' className='text-xs' onClick={() => openSignIn()}>
            Sign in
          </Button>
        )}
      </div>
    </nav>
  )
}
