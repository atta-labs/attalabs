'use client'

import type { ReactNode } from 'react'
import { Button } from '@atta/ui'
import { useClerk, useUser } from '@clerk/nextjs'
import { LogOut } from 'lucide-react'
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
  { href: '/history', label: 'History', exact: true },
  { href: '/settings', label: 'Settings', exact: true }
]

export function UserTopBar({ logo }: UserTopBarProps) {
  const { signOut } = useClerk()
  const { user } = useUser()
  const pathname = usePathname()

  const isActive = (href: string, exact: boolean) => (exact ? pathname === href : pathname.startsWith(href))

  const publicNav = logo ? NAV_WITHOUT_WORDMARK : NAV_WITH_WORDMARK
  const allLinks = user ? [...publicNav, ...AUTH_NAV] : publicNav

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
      {/* Right: avatar + auth button */}
      <div className='flex items-center gap-3'>
        {user?.imageUrl && (
          // biome-ignore lint/performance/noImgElement: Clerk avatar URL is external
          <img src={user.imageUrl} alt='' className='h-6 w-6 rounded-full' />
        )}
        {user ? (
          <Button variant='outline' size='sm' onClick={() => signOut({ redirectUrl: '/' })} className='gap-1.5 text-xs'>
            Sign out
            <LogOut className='h-3.5 w-3.5' />
          </Button>
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
