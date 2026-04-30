import { EcosystemSection } from './sections/EcosystemSection'
import { MechanismSection } from './sections/MechanismSection'
import { NegationsSection } from './sections/NegationsSection'
import { PositioningSection } from './sections/PositioningSection'
import { SeeItWorkSection } from './sections/SeeItWorkSection'

interface SectionsWithCanvasProps {
  brandings: {
    atta: any
    vada: any
    vitakka: any
  }
}

export function SectionsWithCanvas({ brandings }: SectionsWithCanvasProps) {
  return (
    <div className='relative z-10'>
      <PositioningSection />
      <SeeItWorkSection />
      <MechanismSection />
      <NegationsSection />
      <EcosystemSection brandings={brandings} />
    </div>
  )
}
