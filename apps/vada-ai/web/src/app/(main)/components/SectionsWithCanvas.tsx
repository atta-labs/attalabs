import { IndependentSection } from './landing/IndependentSection'
import { RecordSection } from './landing/RecordSection'
import { RoomsSection } from './landing/RoomsSection'
import { WhereYouWorkSection } from './landing/WhereYouWorkSection'

// The landing below the hero, in Vinaya's landing language (`components/landing/`): four
// two-column sections whose copy and animation swap sides each time, each on a different
// background from the next.
export function SectionsWithCanvas() {
  return (
    <div className='relative z-10'>
      <IndependentSection />
      <RoomsSection />
      <RecordSection />
      <WhereYouWorkSection />
    </div>
  )
}
