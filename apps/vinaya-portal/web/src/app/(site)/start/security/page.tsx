import type { Metadata } from 'next'
import { StagePage } from '../_components/StagePage'

export const metadata: Metadata = {
  title: 'Security · Vinaya'
}

export default function StartSecurityPage() {
  return (
    <StagePage
      slug='security'
      title='Get security-reviewed'
      intro={[
        'Alongside the code review, a second check runs — the one built to catch what a correctness review does not.'
      ]}
      qa={{
        tool: 'Another fresh agent session, run alongside the code review, not instead of it.',
        say: 'Ask it to check the same pull request for leaked secrets, unsafe configuration, and exposed surfaces.',
        result:
          'A second verdict — a clean pass, or its own list of findings. Both this and the code review have to be clean before anything merges.',
        studio: 'Same task row — merge stays blocked until both verdicts show clean.'
      }}
      docsHref='/docs/roles/security'
      docsLabel='Security Reviewer'
    />
  )
}
