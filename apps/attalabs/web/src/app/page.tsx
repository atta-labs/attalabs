import { getProductCms } from '@atta/cms'
import { EcosystemHero } from '@/components/home/EcosystemHero'

export default async function HomePage() {
  const { branding } = await getProductCms('attalabs')
  // Same resolution order Herald's topbar uses — solid mark, dark first.
  const logoUrl = branding?.logoSolidDark?.url ?? branding?.logoSolidLight?.url ?? null

  return <EcosystemHero logoUrl={logoUrl} />
}
