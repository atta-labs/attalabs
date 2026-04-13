'use client'

import { Button } from '@atta/ui/components/button'
import { useClerk, useUser } from '@clerk/nextjs'
import { LogOut } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/', label: 'VADA.AI' },
  { href: '/deliberate', label: 'Deliberate' },
  { href: '/history', label: 'History' }
]

export function UserTopBar() {
  const { signOut } = useClerk()
  const { user } = useUser()
  const pathname = usePathname()

  if (!user) return null

  return (
    <nav className='flex h-full w-full items-center justify-between px-4 text-muted-foreground'>
      <div className='flex items-center gap-8'>
        {user.imageUrl && (
          // biome-ignore lint/performance/noImgElement: Clerk avatar URL is external
          <img src={user.imageUrl} alt='' className='h-6 w-6 rounded-full' />
        )}
        <div className='flex items-center gap-8'>
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-xs transition-colors hover:text-foreground ${pathname === href ? 'text-foreground' : ''}`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
      <Button variant='outline' size='sm' onClick={() => signOut({ redirectUrl: '/' })} className='gap-1.5 text-xs '>
        Sign out
        <LogOut className='h-3.5 w-3.5' />
      </Button>
    </nav>
  )
}
