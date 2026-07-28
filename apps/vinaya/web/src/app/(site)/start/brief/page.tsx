import type { Metadata } from 'next'
import { StagePage } from '../_components/StagePage'

export const metadata: Metadata = {
  title: 'Brief · Vinaya'
}

export default function StartBriefPage() {
  return (
    <StagePage
      title='Brief the task'
      intro={[
        'A plan names the work. A brief is what actually gets handed to whoever writes the code — the same conversation can usually keep going.'
      ]}
      qa={{
        tool: 'Still fine in a browser chat — briefing is writing, not filesystem work.',
        say: 'Pick one task from the plan and ask it to turn that task into a brief: the exact boundary, the files it touches, how it gets verified, and when to stop and ask instead of guessing.',
        result: 'A written brief — the durable instructions a coding agent works from, start to finish.',
        studio: 'The task moves from Todo to Ready once its brief exists.'
      }}
      docsHref='/docs/roles/brief-author'
      docsLabel='Brief Author'
    />
  )
}
