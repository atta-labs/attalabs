import { EcosystemSection } from '@/components/home/ecosystem-section'
import { HomeHero } from '@/components/home/HomeHero'
import { HowWeBuild } from '@/components/home/how-we-build'
import { PaliFooter } from '@/components/home/pali-footer'
import { Workshop } from '@/components/home/workshop'

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <div className='relative z-10 bg-background'>
        <EcosystemSection />
        <HowWeBuild />
        <Workshop />
        <PaliFooter />
      </div>
    </>
  )
}
