import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { cmsClient, getHeraldBranding } from '@atta/cms'
import { ConditionalEnvoyNav } from './ConditionalEnvoyFooter'

export default async function EnvoyLayout({ children }: { children: ReactNode }) {
  const branding = await getHeraldBranding(cmsClient).catch(() => null)
  const logoUrl = branding?.logoSolidDark?.url ?? branding?.logoSolidLight?.url ?? null

  return (
    <div className='flex min-h-screen flex-col'>
      <Suspense>
        <ConditionalEnvoyNav logoUrl={logoUrl} />
      </Suspense>
      <main className='flex-1'>{children}</main>
    </div>
  )
}
