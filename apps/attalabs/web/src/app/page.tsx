import { AttaEngineSection } from '@/components/home/atta-engine-section'
import { BreadthStrip } from '@/components/home/breadth-strip'
import { EcosystemSection } from '@/components/home/ecosystem-section'
import { HomeHero } from '@/components/home/HomeHero'
import { PaliFooter } from '@/components/home/pali-footer'
import { VadaTeamsBlurb } from '@/components/home/vada-teams-blurb'
import { Workshop } from '@/components/home/workshop'

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <div className='relative z-10 bg-background'>
        <VadaTeamsBlurb />
        <AttaEngineSection />
        <BreadthStrip />
        <EcosystemSection />
        <Workshop />
        <PaliFooter />
      </div>
    </>
  )
}
