import { NextLink } from '@atta/ui/lib/next-link'
import { Logo } from '@atta/ui/shared'
import { DefaultTopBar } from '@/components/DefaultTopBar'
import { StickyHeaderTopBar } from '@/components/StickyHeaderTopBar'
import { fetchVadaBranding } from '@/lib/branding'
import { ChooserCanvas } from './components/home/ChooserCanvas'
import { ChooserHero } from './components/home/ChooserHero'

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

      <ChooserCanvas>
        <ChooserHero />
      </ChooserCanvas>
    </>
  )
}
