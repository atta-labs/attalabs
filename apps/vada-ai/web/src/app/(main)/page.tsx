import Link from 'next/link'
import { NextLink } from '@atta/ui/lib/next-link'
import { Logo } from '@atta/ui/shared'
import { DefaultTopBar } from '@/components/DefaultTopBar'
import { StickyHeaderTopBar } from '@/components/StickyHeaderTopBar'
import { fetchVadaBranding } from '@/lib/branding'

export default async function VadaChooserPage() {
  const branding = await fetchVadaBranding()
  const lightUrl = branding?.logoLockupSolidLight?.url ?? branding?.logoSolidLight?.url
  const darkUrl = branding?.logoLockupSolidDark?.url ?? branding?.logoSolidDark?.url
  const logo =
    lightUrl || darkUrl ? (
      <NextLink variant='unstyled' href='/'>
        <Logo light={lightUrl} dark={darkUrl} alt={branding?.productName ?? 'Vada AI'} size='h-10' />
      </NextLink>
    ) : null

  return (
    <>
      <StickyHeaderTopBar isBlurred={true} className='z-40 border-b border-border/40'>
        <DefaultTopBar logo={logo} />
      </StickyHeaderTopBar>
      <main className='flex flex-col items-center justify-center min-h-[60vh] gap-10 p-8'>
        <div className='flex flex-col items-center gap-3'>
          <h1 className='font-serif text-4xl'>Vāda</h1>
          <p className='text-muted-foreground text-center max-w-sm'>
            Structured multi-agent deliberation. Choose your mode.
          </p>
        </div>
        <div className='flex flex-col sm:flex-row gap-4'>
          <Link
            href='/autonomous'
            className='flex flex-col gap-2 p-6 rounded-lg border border-border bg-card hover:bg-accent transition-colors min-w-[200px]'
          >
            <span className='font-serif text-lg'>Autonomous</span>
            <span className='text-muted-foreground text-sm'>Full multi-agent deliberation with audit trail</span>
          </Link>
          <Link
            href='/brokered'
            className='flex flex-col gap-2 p-6 rounded-lg border border-border bg-card hover:bg-accent transition-colors min-w-[200px]'
          >
            <span className='font-serif text-lg'>Brokered</span>
            <span className='text-muted-foreground text-sm'>Single focused reviewer via MCP</span>
          </Link>
        </div>
      </main>
    </>
  )
}
