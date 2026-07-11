import { TopBar } from '@atta/ui/topbar'
import { Text } from '@atta/ui/shared'
import type { ReactNode } from 'react'

const links = [
  { label: 'Home', href: '/', exact: true },
  { label: 'Known Limits', href: '/known-limits' },
  { label: 'AEG', href: '/aeg' },
  { label: 'Studio', href: '/studio', exact: true }
]

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TopBar
        logo={
          <Text as='span' className='font-serif text-lg tracking-tight'>
            Vinaya
          </Text>
        }
        links={links}
        withAuth={false}
      />
      {children}
    </>
  )
}
