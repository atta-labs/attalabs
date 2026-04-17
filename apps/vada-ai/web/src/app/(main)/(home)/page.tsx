import { cmsClient, createProductClient, getAttaBranding, getVadaBranding, getVitakkaBranding } from '@atta/cms'
import { HomeHero } from './components/HomeHero'
import { EcosystemSection } from './components/sections/EcosystemSection'
import { MechanismSection } from './components/sections/MechanismSection'
import { NegationsSection } from './components/sections/NegationsSection'
import { PositioningSection } from './components/sections/PositioningSection'
import { SeeItWorkSection } from './components/sections/SeeItWorkSection'

export default async function Home() {
  const [atta, vada, vitakka] = await Promise.all([
    getAttaBranding(createProductClient('atta')).catch(() => null),
    getVadaBranding(cmsClient).catch(() => null),
    getVitakkaBranding(createProductClient('vitakka')).catch(() => null)
  ])

  return (
    <>
      <HomeHero />
      <div className='relative z-10'>
        <PositioningSection />
        <SeeItWorkSection />
        <MechanismSection />
        <NegationsSection />
        <EcosystemSection brandings={{ atta, vada, vitakka }} />
      </div>
    </>
  )
}
