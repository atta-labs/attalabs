import { getProductCms } from '@atta/cms'
import { NextLink } from '@atta/ui/lib/next-link'
import { Logo } from '@atta/ui/shared'
import { TopBar } from '@atta/ui/topbar'
import type { TopBarNavItem } from '@atta/ui/topbar'
import {
  BookOpen,
  GitBranch,
  Home,
  LayoutDashboard,
  Library,
  Map as MapIcon,
  Rocket,
  Settings,
  Terminal,
  Workflow
} from 'lucide-react'
import type { ReactNode } from 'react'
import { ProductSwitch } from '@/app/_components/ProductSwitch'
import { ElectricLabel } from './_components/ElectricLabel'

// Every flat item gets a crackling border that lights up only while its own
// route is active (`ElectricLabel` compares `href` against `usePathname()`
// itself, mirroring TopBar's own `isActive`), so it reads as "you are here,"
// not decoration. This app's only such use.
function flatLink(label: string, href: string, icon: ReactNode, exact?: boolean) {
  return {
    label: (
      <ElectricLabel href={href} exact={exact}>
        {label}
      </ElectricLabel>
    ),
    href,
    exact,
    icon
  }
}

// Group panel items are plain labels — the panel has its own hover
// treatment, so lightning stays reserved for top-level nav (constant cost
// zero on inactive items, per `ElectricLabel`'s own doc comment).
const DOCS_ITEMS = [
  {
    label: 'Harness',
    href: '/docs/harness',
    icon: <Workflow className='size-4' aria-hidden />,
    description: 'Live map of every role, contract, gate, and check.'
  },
  {
    label: 'State Machine',
    href: '/docs/state-machine',
    icon: <GitBranch className='size-4' aria-hidden />,
    description: 'How forge facts and labels derive task status.'
  },
  {
    label: 'CLI',
    href: '/docs/cli',
    icon: <Terminal className='size-4' aria-hidden />,
    description: 'Every vinaya command — flags, behavior, status.'
  },
  {
    label: 'Reference',
    href: '/docs/reference',
    icon: <Library className='size-4' aria-hidden />,
    description: 'The harness, part by part, as one browsable map.'
  }
]

const links: TopBarNavItem[] = [
  flatLink('Home', '/', <Home className='size-4' aria-hidden />, true),
  flatLink('Start', '/start', <Rocket className='size-4' aria-hidden />),
  // No `href` on the group — the trigger opens the panel, only items
  // navigate. `exact` defaults false: a plain `/docs` prefix match, since
  // every group child lives under `/docs/*` (task 3) — a single prefix
  // suffices, no multi-prefix machinery needed.
  {
    label: <ElectricLabel href='/docs'>Docs</ElectricLabel>,
    icon: <BookOpen className='size-4' aria-hidden />,
    items: DOCS_ITEMS
  },
  flatLink('Config', '/config', <Settings className='size-4' aria-hidden />),
  flatLink('Studio', '/the-studio', <LayoutDashboard className='size-4' aria-hidden />),
  flatLink('Roadmap', '/roadmap', <MapIcon className='size-4' aria-hidden />)
]

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const { branding } = await getProductCms('vinaya')
  const logoUrl = branding?.logoSolidDark?.url ?? branding?.logoSolidLight?.url ?? null

  // App-shell height: the shell is a full-viewport flex column — TopBar keeps
  // its own intrinsic height, the content region takes exactly the rest. Pages
  // that want to fill the viewport (docs/harness, docs/reference and its
  // sibling doctrine pages) use `h-full` against this region; long pages
  // (Home, the /docs hub) scroll inside it. No page hardcodes the
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
