import { VinayaHeroEmblem } from '../hero-canvas/VinayaHeroEmblem'
import { AudienceSection } from './AudienceSection'
import { ConfigBoardSection } from './ConfigBoardSection'
import { HarnessDiagramSection } from './HarnessDiagramSection'
import { ScrollToSectionButton } from './LandingInteractions'
import { LifecycleSection } from './LifecycleSection'
import { OwnershipSection } from './OwnershipSection'
import { StudioSection } from './StudioSection'
import { ZeroLockInSection } from './ZeroLockInSection'

interface ReleaseMetrics {
  version: string
  executableLines: number
  doctrineLines: number
}

function HeroSection() {
  return (
    <VinayaHeroEmblem landingActions={<ScrollToSectionButton targetId='tagline'>View more</ScrollToSectionButton>} />
  )
}

// `releaseMetrics` is unused: nothing on Home renders it. Drop this prop together with the
// `getPublishedReleaseMetrics` fetch in `(site)/page.tsx` that supplies it.
export function LandingPage(_props: { releaseMetrics: ReleaseMetrics }) {
  return (
    <main>
      <HeroSection />
      <LifecycleSection />
      <OwnershipSection />
      <HarnessDiagramSection />
      <StudioSection />
      <AudienceSection />
      <ConfigBoardSection />
      <ZeroLockInSection />
    </main>
  )
}
