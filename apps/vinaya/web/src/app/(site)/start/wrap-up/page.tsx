import type { Metadata } from 'next'
import { StagePage } from '../_components/StagePage'

export const metadata: Metadata = {
  title: 'Wrap Up · Vinaya'
}

export default function StartWrapUpPage() {
  return (
    <StagePage
      title='Close out the tranche'
      intro={['Once every task in a plan has actually finished, someone — you — says the whole tranche is done.']}
      qa={{
        tool: 'Dispatched once, by you, when you decide the tranche is finished. Nothing here runs on a schedule or on its own.',
        say: 'Tell it the tranche is done and to close it out.',
        result:
          "A retrospective — what shipped, what was dropped, what stalled, what to carry forward — the milestone closed, and every project's state record brought up to date.",
        studio:
          'The tranche moves from active to archived, and the next one is planned against what is actually true now.'
      }}
      docsHref='/docs/roles/tranche-archivist'
      docsLabel='Tranche Archivist'
    />
  )
}
