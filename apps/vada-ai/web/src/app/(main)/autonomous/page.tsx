import { cmsClient, createProductClient, getAttaBranding, getVadaBranding, getVitakkaBranding } from '@atta/cms'
import { HomeHero } from './components/home/HomeHero'
import { SectionsWithCanvas } from './components/SectionsWithCanvas'

export default async function Home() {
  const [atta, vada, vitakka] = await Promise.all([
    getAttaBranding(createProductClient('atta')).catch(() => null),
    getVadaBranding(cmsClient).catch(() => null),
    getVitakkaBranding(createProductClient('vitakka')).catch(() => null)
  ])

  return (
    <>
      <HomeHero />
      <SectionsWithCanvas brandings={{ atta, vada, vitakka }} />
    </>
  )
}
