import type { ReactNode } from 'react'

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  return <main>{children}</main>
}
