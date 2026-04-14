'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Badge } from '@atta/ui'
import { Text } from '@atta/ui/shared'
import { cn } from '@atta/ui/lib/utils'

const SCIENCE_NAV = [
  { href: '/science/overview', label: 'Overview' },
  { href: '/science/frameworks', label: 'Frameworks' },
  { href: '/science/agents', label: 'Agents' },
  { href: '/science/mechanics', label: 'Mechanics' }
]

export function ScienceSidebar() {
  const pathname = usePathname()

  return (
    <aside className='w-56 shrink-0 sticky top-16 h-fit py-16 pl-8 pr-4'>
      <div className='mb-6 space-y-1'>
        <Text as='p' className='font-mono text-[10px] uppercase tracking-widest text-muted-foreground'>
          Vāda Manuscript
        </Text>
        <Badge variant='outline' className='font-mono text-[10px]'>
          v1.0
        </Badge>
      </div>

      <nav className='flex flex-col gap-1'>
        {SCIENCE_NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'rounded-md px-3 py-2 font-sans text-sm transition-colors hover:text-foreground',
              pathname === href ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
