import { getProductCms } from '@atta/cms'
import { NextLink } from '@atta/ui/lib/next-link'
import { Logo } from '@atta/ui/shared'
import { TopBar } from '@atta/ui/topbar'
import type { ReactNode } from 'react'
import { ProductSwitch } from '@/app/_components/ProductSwitch'

const links = [
  { label: 'Home', href: '/', exact: true },
  { label: 'The Harness', href: '/the-harness' },
  // Beside The Harness: both are code-derived reference pages — that one draws
  // the enforcement model, this one renders the state machine's own tables.
  { label: 'State Machine', href: '/state-machine' },
  { label: 'Start', href: '/start' },
  { label: 'CLI', href: '/cli' },
  { label: 'Docs', href: '/docs' },
  { label: 'Studio', href: '/the-studio' },
  { label: 'Roadmap', href: '/roadmap' }
]

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const { branding } = await getProductCms('vinaya')
  const logoUrl = branding?.logoSolidDark?.url ?? branding?.logoSolidLight?.url ?? null

  // App-shell height: the shell is a full-viewport flex column — TopBar keeps
  // its own intrinsic height, the content region takes exactly the rest. Pages
  // that want to fill the viewport (the diagram, docs) use `h-full` against
  // this region; long pages (Home) scroll inside it. No page hardcodes the
  // TopBar's pixel height (the old `calc(100dvh-56px)`), so the shell can never
  // drift a few pixels into a stray window scroll.
  return (
    <div className='flex h-dvh flex-col'>
      {/* z-30 keeps the TopBar above the hero emblem's fixed canvas (z-0). */}
      <div className='relative z-30'>
        <TopBar
          logo={
            <NextLink href='/' variant='unstyled' className='flex items-center gap-2'>
              <Logo dark={logoUrl ?? undefined} alt='Vinaya' size='h-10' text={['Engineering', 'Harness']} />
            </NextLink>
          }
          links={links}
          extraActions={<ProductSwitch current='portal' />}
          withAuth={false}
        />
      </div>
      <div className='min-h-0 flex-1 overflow-y-auto'>{children}</div>
    </div>
  )
}
