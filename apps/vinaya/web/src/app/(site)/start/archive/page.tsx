import type { Metadata } from 'next'
import { StagePage } from '../_components/StagePage'

export const metadata: Metadata = {
  title: 'Archive · Vinaya'
}

export default function StartArchivePage() {
  return (
    <StagePage
      title='Close out the task'
      intro={['Once your pull request merges, this stage runs on its own — there is nothing left for you to prompt.']}
      qa={{
        tool: 'Nothing you drive yourself — this stage runs once the merge lands, automatically for its mechanical half, and as a dispatched turn for the rest.',
        say: 'Nothing new. It reads the merged pull request and the brief already inside it.',
        result:
          'The Issue closes, the docs the brief promised are confirmed updated, and a provenance record — what shipped, from what intent — posts to the merged pull request.',
        studio: 'The task drops off the active board; its record lives on the merged pull request from here on.'
      }}
      docsHref='/docs/roles/archivist'
      docsLabel='Archivist'
    />
  )
}
