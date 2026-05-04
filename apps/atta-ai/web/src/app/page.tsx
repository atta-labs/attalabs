import { cmsClient, getAttaBranding } from '@atta/cms'
import { BreadthStrip } from '@/components/home/breadth-strip'
import { Engine } from '@/components/home/engine'
import { Hero } from '@/components/home/hero'
import { PaliFooter } from '@/components/home/pali-footer'
import { ThreeStates } from '@/components/home/three-states'
import { Workshop } from '@/components/home/workshop'
import { HomeCanvas } from '@/components/home-canvas'

export default async function HomePage() {
  const branding = await getAttaBranding(cmsClient).catch(() => null)
  const logoUrl = branding?.logoSolidDark?.url ?? branding?.logoSolidLight?.url ?? null

  return (
    <>
      <HomeCanvas />

      <main className='relative z-10'>
        {/* Hero — transparent, canvas shows through */}
        <Hero logoUrl={logoUrl} />

        {/* Content sections — opaque background */}
        <div className='bg-background'>
          <ThreeStates />
          <BreadthStrip />
          <Engine />
          <Workshop />
          <PaliFooter />
        </div>
      </main>
    </>
  )
}
