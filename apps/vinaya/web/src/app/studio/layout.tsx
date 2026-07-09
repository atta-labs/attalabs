import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { StudioShell } from './_components/StudioShell'

export const metadata: Metadata = {
  title: 'Vinaya Studio',
  description: 'Local governance studio for Vinaya artifacts.'
}

export default function StudioLayout({ children }: { children: ReactNode }) {
  return <StudioShell>{children}</StudioShell>
}
