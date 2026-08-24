import { CodeBlock } from '@atta/ui/components'
import { Text } from '@atta/ui/shared'

/** Develop's refusal transcript — reproduced verbatim in both its human and
 * machine forms (Issue #918 §2, binding for wording). The only place on the
 * page a raw check failure and its `CheckError` JSON are shown side by
 * side, since it is the whole point of the section: the refusal is
 * machine-readable, and the agent that hits it gets told how to clear it. */
export function RefusalTranscript() {
  return (
    <div className='flex flex-col gap-6 rounded-lg border border-border bg-card p-6'>
      <div className='flex flex-col gap-2'>
        <Text as='span' size='xs' muted className='font-mono uppercase tracking-widest'>
          Refused — nothing lands
        </Text>
        <CodeBlock className='whitespace-pre-wrap'>
          {`✗ brief-shape: fail (51ms)
    error: brief-validation Test Plan: no Test Plan section
    found — expected \`Test Plan: unit-tests-only\`, or at least
    one \`**[agent]**\`/\`**[principal]**\`-tagged checklist item.`}
        </CodeBlock>
      </div>

      <div className='flex flex-col gap-2'>
        <Text as='span' size='xs' muted className='font-mono uppercase tracking-widest'>
          The same refusal, in its machine form
        </Text>
        <CodeBlock className='whitespace-pre-wrap'>
          {`{
  "schema": 1,
  "check": "brief-shape",
  "severity": "error",
  "message": "brief-validation Test Plan: no Test Plan section found — expected \`Test Plan: unit-tests-only\`, or at least one \`**[agent]**\`/\`**[principal]**\`-tagged checklist item.",
  "agent_recovery_prompt": "Open the PR body and add or fix the section named above, following the canonical PR-body template. Commit the corrected PR body, then re-run \`vinaya check brief-shape\`."
}`}
        </CodeBlock>
      </div>

      <div className='flex flex-col gap-1'>
        <Text as='p' className='font-medium text-foreground'>
          The refusal is machine-readable.
        </Text>
        <Text as='p' size='sm' muted className='leading-relaxed'>
          The agent that hit the gate gets told how to clear it — so a refusal is a correction, not a dead end.
        </Text>
      </div>
    </div>
  )
}
