import type { ReactNode } from 'react'
import { cmsClient, getHeraldBranding } from '@atta/cms'
import { TopBar } from '@atta/ui/topbar'
import { Footer } from '@atta/ui/footer'
import { HeraldUserButton } from '@/components/herald-user-button'

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const branding = await getHeraldBranding(cmsClient).catch(() => null)
  const logoUrl = branding?.logoSolidDark?.url ?? branding?.logoSolidLight?.url ?? null

  return (
    <>
      <header>
        <TopBar
          logoText='Herald'
          logoUrl={logoUrl}
          logoTagline={['Forensic hiring', 'audits']}
          signedInLinks={[]}
          accountMenu={<HeraldUserButton />}
        />
      </header>
      <main className='flex-1 min-h-0'>{children}</main>
      <Footer
        product='herald'
        tagline='Forensic hiring audits'
        links={[
          { label: 'Terms', href: '/terms' },
          { label: 'Privacy', href: '/privacy' },
          { label: 'Contact', href: 'mailto:hello@attalabs.dev', external: true }
        ]}
        showProductNav={true}
      />
    </>
  )
}
