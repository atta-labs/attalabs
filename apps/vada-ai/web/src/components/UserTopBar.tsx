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
import { useClerk, useUser } from '@clerk/nextjs'
import { LogOut, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface UserTopBarProps {
  logo?: ReactNode
}

const NAV_WITH_WORDMARK = [
  { href: '/', label: 'VADA.AI', exact: true },
  { href: '/science', label: 'Science', exact: false }
]

const NAV_WITHOUT_WORDMARK = [{ href: '/science', label: 'Science', exact: false }]

const AUTH_NAV = [
  { href: '/deliberate', label: 'Deliberate', exact: true },
  { href: '/history', label: 'History', exact: true }
]

export function UserTopBar({ logo }: UserTopBarProps) {
  const { signOut } = useClerk()
  const { user } = useUser()
  const pathname = usePathname()

  const isActive = (href: string, exact: boolean) => (exact ? pathname === href : pathname.startsWith(href))

  const publicNav = logo ? NAV_WITHOUT_WORDMARK : NAV_WITH_WORDMARK
  const allLinks = user ? [...publicNav, ...AUTH_NAV] : publicNav

  const displayName = user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress
  const email = user?.primaryEmailAddress?.emailAddress
  const initial = (displayName || email || '?').charAt(0).toUpperCase()

  return (
    <nav className='flex h-full w-full items-center justify-between px-4 text-muted-foreground'>
      {/* Left: logo + nav links */}
      <div className='flex items-center gap-8'>
        {logo}
        <div className='flex items-center gap-8'>
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
      </div>
      {/* Right: avatar dropdown (auth) or sign-in (anonymous) */}
      <div className='flex items-center gap-3'>
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
              <DropdownMenuItem asChild>
                <Link href='/settings' className='cursor-pointer'>
                  <Settings className='h-4 w-4' />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => signOut({ redirectUrl: '/' })} className='cursor-pointer'>
                <LogOut className='h-4 w-4' />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link href='/sign-in'>
            <Button variant='outline' size='sm' className='text-xs'>
              Sign in
            </Button>
          </Link>
        )}
      </div>
    </nav>
  )
}
