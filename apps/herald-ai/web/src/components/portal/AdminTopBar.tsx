'use client'

import { useClerk, useUser } from '@clerk/nextjs'
import { LogOut } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/admin/ui', label: 'User Interface', icon: '◐' },
  { href: '/admin/settings', label: 'Settings', icon: '⚙' }
]

export function AdminTopBar() {
  const pathname = usePathname()
  const { signOut } = useClerk()
  const { user } = useUser()

  return (
    <nav className='flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-4'>
      {/* Left: Logo + Nav */}
      <div className='flex items-center gap-1'>
        <Link href='/admin' className='flex items-center gap-2 px-2'>
          <span className='text-base'>🎺</span>
          <span className='font-display text-sm font-bold tracking-tight'>Herald</span>
        </Link>
        <span className='mx-2 text-border'>|</span>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs transition-colors ${
                isActive
                  ? 'bg-accent/10 font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
              }`}
            >
              <span className='text-sm'>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </div>

      {/* Right: Sign out + Avatar */}
      <div className='flex items-center gap-3'>
        <button
          type='button'
          onClick={() => signOut({ redirectUrl: '/' })}
          className='flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground'
        >
          <LogOut className='h-3 w-3' />
          Sign out
        </button>
        <div className='flex items-center gap-2'>
          {user?.imageUrl && (
            // biome-ignore lint/performance/noImgElement: Clerk avatar URL is external
            <img src={user.imageUrl} alt='' className='h-6 w-6 rounded-full' />
          )}
          <span className='font-mono text-[10px] text-muted-foreground'>{user?.firstName ?? 'User'}</span>
        </div>
      </div>
    </nav>
  )
}
