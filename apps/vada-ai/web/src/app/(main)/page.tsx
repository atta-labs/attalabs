import Link from 'next/link'
import { NextLink } from '@atta/ui/lib/next-link'
import { Logo } from '@atta/ui/shared'
import { DefaultTopBar } from '@/components/DefaultTopBar'
import { StickyHeaderTopBar } from '@/components/StickyHeaderTopBar'
import { fetchVadaBranding } from '@/lib/branding'
import { SplitChooserCanvas } from './components/SplitChooserCanvas'
import { BrainCardConnector } from './components/BrainCardConnector'

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

      <SplitChooserCanvas />

      {/* Full-height center divider — separate from card layout so it reaches top */}
      <div className='fixed inset-y-0 left-1/2 w-px bg-border/40 z-10 pointer-events-none' />

      {/* Brain → cards connector (electricity animation) */}
      <BrainCardConnector />

      {/* Mode cards — bottom, one per half */}
      <div className='fixed inset-0 z-10 pointer-events-none'>
        {/* Brokered — left half bottom */}
        <div
          className='absolute pointer-events-auto'
          style={{ left: '30vw', top: '86vh', transform: 'translate(-50%, -50%)' }}
        >
          <Link
            href='/brokered'
            className='flex flex-col gap-2 p-6 rounded-lg border border-border bg-card hover:bg-accent transition-colors min-w-[200px]'
          >
            <span className='font-serif text-lg'>Brokered</span>
            <span className='text-muted-foreground text-sm'>Single focused reviewer via MCP</span>
          </Link>
        </div>

        {/* Autonomous — right half bottom */}
        <div
          className='absolute pointer-events-auto'
          style={{ left: '70vw', top: '86vh', transform: 'translate(-50%, -50%)' }}
        >
          <Link
            href='/autonomous'
            className='flex flex-col gap-2 p-6 rounded-lg border border-border bg-card hover:bg-accent transition-colors min-w-[200px]'
          >
            <span className='font-serif text-lg'>Autonomous</span>
            <span className='text-muted-foreground text-sm'>Full multi-agent deliberation with audit trail</span>
          </Link>
        </div>
      </div>
    </>
  )
}
