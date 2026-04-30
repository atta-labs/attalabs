import type { ReactNode } from 'react'

export default function DeliberationLayout({ children }: { children: ReactNode }) {
  return <main className='min-h-0 flex-1'>{children}</main>
}
