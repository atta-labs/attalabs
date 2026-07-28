import type { Metadata } from 'next'
import { StagePage } from '../_components/StagePage'

export const metadata: Metadata = {
  title: 'Review · Vinaya'
}

export default function StartReviewPage() {
  return (
    <StagePage
      title='Get reviewed'
      intro={[
        'Once your pull request is open, a second agent — one that did not write the code — judges it against the brief.'
      ]}
      qa={{
        tool: 'A fresh agent session, deliberately not the one that wrote the code — a new chat or a fresh coding-agent run pointed at the same repo.',
        say: 'Point it at the open pull request and ask it to review it against its brief.',
        result:
          'A verdict posted as a comment on the pull request — an approval, or a list of findings the developer fixes before it can merge.',
        studio: 'The task stays In Review until that verdict is clean.'
      }}
      docsHref='/docs/roles/reviewer'
      docsLabel='Reviewer'
    />
  )
}
