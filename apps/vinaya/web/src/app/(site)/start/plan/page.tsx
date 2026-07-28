import type { Metadata } from 'next'
import { StagePage } from '../_components/StagePage'

export const metadata: Metadata = {
  title: 'Plan · Vinaya'
}

export default function StartPlanPage() {
  return (
    <StagePage
      title='Plan the work'
      intro={[
        'This is the first thing you do with a governed repo, and the one stage Vinaya cares least about which tool you use for.'
      ]}
      qa={{
        tool: 'Any AI works — a browser chat is fine. claude.ai, Gemini, Grok, whatever you already have open. Nothing here touches your filesystem, so a local coding agent buys you nothing yet.',
        say: "Point it at your repo, tell it to read Vinaya's planner role, then describe what you're actually trying to solve — in as much detail as you can. Discuss it. Argue with it. Keep going until you both agree on the shape of the work.",
        result:
          'Once you agree, it cuts the Issues for you: a milestone for the piece of work, one Issue per task, each carrying its own rationale for why that task is sized the way it is.',
        studio:
          'Open Studio and look at the tranche it made — the milestone, the tasks under it, and how they depend on each other.'
      }}
      docsHref='/docs/roles/planner'
      docsLabel='Planner'
    />
  )
}
