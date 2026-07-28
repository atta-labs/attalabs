import { Text } from '@atta/ui/shared'
import type { Metadata } from 'next'
import { GateRefusalDemo } from '../_components/GateRefusalDemo'
import { renderProse } from '../_components/prose'
import { StagePage } from '../_components/StagePage'

export const metadata: Metadata = {
  title: 'Develop · Vinaya'
}

export default function StartDevelopPage() {
  return (
    <StagePage
      title='Do the work'
      intro={[
        'This is the one stage where the tool actually matters. Planning and briefing are conversation; this is code, so you need something that can read and write your repo — a local agent, not a browser chat.'
      ]}
      qa={{
        tool: 'A local coding agent with access to your filesystem — Claude Code, Codex, Antigravity, or whichever you already use.',
        say: 'Hand it the brief. Tell it to work in its own worktree, on its own branch, and to run `vinaya check --all` before it opens a pull request.',
        result:
          'A pull request carrying the brief in its own body, with `vinaya check --all` already green against it.',
        studio: 'The task moves from Ready to In Review the moment the pull request opens.'
      }}
      docsHref='/docs/roles/developer'
      docsLabel='Developer'
      extra={
        <div className='flex flex-col gap-3'>
          <Text as='p' className='text-sm text-muted-foreground'>
            {renderProse(
              "Here's what `vinaya check --all` actually looks like — first on a clean tree, then when it refuses something."
            )}
          </Text>
          <GateRefusalDemo />
        </div>
      }
    />
  )
}
