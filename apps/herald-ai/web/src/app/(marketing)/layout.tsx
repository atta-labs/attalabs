import type { ReactNode } from 'react'
import { TopBar } from '@atta/ui/topbar'
import { Footer } from '@atta/ui/footer'

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header>
        <TopBar logoText='Herald' signedInLinks={[{ label: 'Dashboard', href: '/admin' }]} />
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
