'use client'

import { Button } from '@atta/ui'
import { useClerk, useUser } from '@clerk/nextjs'
import { LogOut } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const PUBLIC_NAV = [
  { href: '/', label: 'VADA.AI', exact: true },
  { href: '/science', label: 'Science', exact: false }
]

const AUTH_NAV = [
  { href: '/deliberate', label: 'Deliberate', exact: true },
  { href: '/history', label: 'History', exact: true }
]

export function UserTopBar() {
  const { signOut } = useClerk()
  const { user } = useUser()
  const pathname = usePathname()

  const isActive = (href: string, exact: boolean) => (exact ? pathname === href : pathname.startsWith(href))

  const allLinks = user ? [...PUBLIC_NAV, ...AUTH_NAV] : PUBLIC_NAV

  return (
    <nav className='flex h-full w-full items-center justify-between px-4 text-muted-foreground'>
      <div className='flex items-center gap-8'>
        {user?.imageUrl && (
          // biome-ignore lint/performance/noImgElement: Clerk avatar URL is external
          <img src={user.imageUrl} alt='' className='h-6 w-6 rounded-full' />
        )}
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
    </nav>
  )
}
