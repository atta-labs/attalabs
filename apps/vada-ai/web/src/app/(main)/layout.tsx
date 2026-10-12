import { ToastProvider } from '@atta/ui/components'
import { Button } from '@atta/ui/components'
import { auth } from '@atta/auth/hooks'
import { NextLink } from '@atta/ui/lib/next-link'
import { Logo } from '@atta/ui/shared'
import { TopBar } from '@atta/ui/topbar'
import { History, MessagesSquare, Plug, Settings, ShieldCheck, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { StickyHeaderTopBar } from '@/components/StickyHeaderTopBar'
import { RouteAwareFooter } from '@/components/RouteAwareFooter'
import { UserPreferencesProvider } from '@/lib/user-preferences-context'
import { getOrCreateUser } from '@/db/queries'
import { getUserSettings } from '@/db/settings-queries'
import { fetchVadaBranding } from '@/lib/branding'
import {
  type NavLink,
  SIGNED_IN_FOOTER_NAV,
  SIGNED_IN_NAV,
  SIGNED_OUT_FOOTER_NAV,
  SIGNED_OUT_NAV
} from '@/lib/route-config'
import type { FaceStyle } from '@/components/agents'

// No bottom border anywhere. On the home hero's opening state (`data-bare="true"` on the
// header, see StickyHeaderTopBar) the frame has no surface at all — background, shadow and
// backdrop blur drop, so the fabric paints straight through (Vinaya's TOPBAR_CHROME_CLASS).
const TOPBAR_CHROME_CLASS =
  'border-transparent [[data-bare=true]_&]:bg-transparent [[data-bare=true]_&]:shadow-none [[data-bare=true]_&]:backdrop-blur-none'

// Top-bar links carry an icon in their label, the way Vinaya Portal's do (an icon + text inside the
// one label node, so the shared TopBar renders it in both the desktop nav and the mobile sheet).
// `route-config.ts` stays plain data — the middleware imports it — so icons are attached here.
const NAV_ICONS: Record<string, ReactNode> = {
  '/deliberate': <MessagesSquare className='size-4' aria-hidden />,
  '/sessions': <History className='size-4' aria-hidden />,
  '/teams': <Users className='size-4' aria-hidden />,
  '/mcp': <Plug className='size-4' aria-hidden />,
  '/trust': <ShieldCheck className='size-4' aria-hidden />
}

function withIcons(links: NavLink[]) {
  return links.map(({ href, label, exact }) => ({
    href,
    exact,
    label: (
      <span className='flex items-center gap-1.5'>
        {NAV_ICONS[href]}
        {label}
      </span>
    )
  }))
}

export default async function MainLayout({ children }: { children: ReactNode }) {
  const { userId: clerkId } = await auth()
  let faceStyle: FaceStyle = 'emblematic'
  if (clerkId) {
    await getOrCreateUser(clerkId, '')
    const settings = await getUserSettings(clerkId)
    faceStyle = settings.faceStyle as FaceStyle
  }

  const branding = await fetchVadaBranding()
  const lightUrl = branding?.logoSolidLight?.url ?? branding?.logoSolidDark?.url
  const darkUrl = branding?.logoSolidDark?.url ?? branding?.logoSolidLight?.url
  const logo =
    lightUrl || darkUrl ? (
      <NextLink variant='unstyled' href='/' data-topbar-logo>
        <Logo
          light={lightUrl}
          dark={darkUrl}
          alt={branding?.productName ?? 'Vada AI'}
          size='h-10'
          text={['Deliberation', 'Teams']}
        />
      </NextLink>
    ) : null

  const extraActions = (
    <Button variant='ghost' size='icon' asChild aria-label='Settings' title='Settings'>
      <NextLink variant='unstyled' href='/settings'>
        <Settings className='h-4 w-4' />
      </NextLink>
    </Button>
  )

  return (
    <UserPreferencesProvider faceStyle={faceStyle}>
      <ToastProvider defaultPosition='bottom-right'>
        <div className='flex flex-col min-h-dvh'>
          <StickyHeaderTopBar isBlurred={true} className='z-40 border-border/40'>
            {/* the full list for who is viewing, resolved on the server — the shared TopBar only appends
                signed-in links, and Trust leaves the bar once signed in (it stays in the footer) */}
            <TopBar
              logo={logo}
              links={withIcons(clerkId ? SIGNED_IN_NAV : SIGNED_OUT_NAV)}
              extraActions={extraActions}
              chromeClassName={TOPBAR_CHROME_CLASS}
            />
          </StickyHeaderTopBar>
          <div className='flex-1 flex flex-col'>
            <div className='flex-1'>{children}</div>
            <RouteAwareFooter logo={logo} links={clerkId ? SIGNED_IN_FOOTER_NAV : SIGNED_OUT_FOOTER_NAV} />
          </div>
        </div>
      </ToastProvider>
    </UserPreferencesProvider>
  )
}
