'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/admin', label: 'Preview', icon: '◎' },
  { href: '/admin/theme', label: 'Themes', icon: '◐' },
  { href: '/admin/libraries', label: 'Libraries', icon: '❖', comingSoon: true },
  { href: '/admin/settings', label: 'Settings', icon: '⚙' }
]

export function AdminSidebar({ username }: { username: string }) {
  const pathname = usePathname()

  return (
    <div className='flex h-full w-56 flex-shrink-0 flex-col border-r border-border bg-card'>
      {/* Header */}
      <div className='border-b border-border px-4 py-4'>
        <p className='font-display text-sm tracking-tight'>Herald</p>
        <p className='mt-0.5 font-mono text-[10px] text-muted-foreground'>{username}.heyherald.com</p>
      </div>

      {/* Navigation */}
      <nav className='flex-1 overflow-y-auto px-2 py-3'>
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.comingSoon ? '#' : item.href}
              className={`mb-0.5 flex items-center gap-2.5 rounded-md px-3 py-2 font-mono text-xs transition-colors ${
                item.comingSoon
                  ? 'cursor-not-allowed text-muted/50'
                  : isActive
                    ? 'bg-foreground/10 font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
              }`}
              onClick={item.comingSoon ? (e) => e.preventDefault() : undefined}
            >
              <span className='text-sm'>{item.icon}</span>
              <span>{item.label}</span>
              {item.comingSoon && (
                <span className='ml-auto rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground'>
                  Soon
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className='border-t border-border px-4 py-3'>
        <a
          href={`/${username}`}
          target='_blank'
          rel='noreferrer'
          className='font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground'
        >
          View live page ↗
        </a>
      </div>
    </div>
  )
}
