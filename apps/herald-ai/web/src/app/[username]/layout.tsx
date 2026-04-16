import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { ConditionalEnvoyFooter } from './ConditionalEnvoyFooter'

export default function EnvoyLayout({ children }: { children: ReactNode }) {
  return (
    <div className='flex min-h-screen flex-col'>
      <main className='flex-1'>{children}</main>
      <Suspense>
        <ConditionalEnvoyFooter />
      </Suspense>
    </div>
  )
}
