import type { Metadata } from 'next'
import { AxisSection } from './_components/AxisSection'
import { CapabilityMatrix } from './_components/CapabilityMatrix'
import { CloserSection } from './_components/CloserSection'
import { CompareHero } from './_components/CompareHero'
import { ConfigurabilityCards } from './_components/ConfigurabilityCards'
import { EvidenceSection } from './_components/EvidenceSection'
import { FrameworkOverview } from './_components/FrameworkOverview'
import { NotDoesSection, SourcesSection } from './_components/NotDoesSection'
import { WhereEachWins } from './_components/WhereEachWins'

export const metadata: Metadata = {
  title: 'Compare — Vinaya',
  description:
    'What actually enforces a coding agent’s behavior, evidence-first — Vinaya against the workflow frameworks and the merge gate it ships that they don’t.'
}

export default function ComparePage() {
  return (
    <main>
      <CompareHero />
      <EvidenceSection />
      <AxisSection />
      <FrameworkOverview />
      <CapabilityMatrix />
      <WhereEachWins />
      <ConfigurabilityCards />
      <NotDoesSection />
      <CloserSection />
      <SourcesSection />
    </main>
  )
}
