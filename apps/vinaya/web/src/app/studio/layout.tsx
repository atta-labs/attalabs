import { TopBar } from '@atta/ui/topbar'
import { Text } from '@atta/ui/shared'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { StudioShell } from './_components/StudioShell'

export const metadata: Metadata = {
  title: 'Vinaya Studio',
  description: 'Local governance studio for Vinaya artifacts.'
}

const links = [
  { label: 'Projects', href: '/studio/projects' },
  { label: 'Iterations', href: '/studio/iterations' },
  { label: 'Backlog', href: '/studio/backlog' },
  { label: 'Docs', href: '/studio/docs' }
]

export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TopBar
        logo={
          <Text as='span' className='font-serif text-lg tracking-tight'>
            Vinaya Studio
          </Text>
        }
        links={links}
        withAuth={false}
      />
      <StudioShell>{children}</StudioShell>
    </>
  )
}
