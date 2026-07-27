import { CodeBlock } from '@atta/ui/components'
import { Text } from '@atta/ui/shared'

// Verbatim content from Issue #682's supplied step-3 transcript — not
// transcribed by hand from a live run. Three blocks in the order the reader
// needs them: the clean pass, the refusal a human reads, then the same
// refusal in the machine form a coding agent actually consumes
// (`agent_recovery_prompt` is the reason that third block exists at all).
const CLEAN_PASS = `✓ brief-shape: pass (336ms)
✓ doc-coverage: pass (668ms)
✓ coherence: pass (838ms)
✓ dispatch-readiness: pass (1192ms)`

const REFUSAL = `✗ brief-shape: fail (51ms)
    error: brief-validation Test Plan: no Test Plan section found — expected
    \`Test Plan: unit-tests-only\`, or at least one \`**[agent]**\`/\`**[principal]**\`-tagged
    checklist item.`

const REFUSAL_CONTRACT = {
  schema: 1,
  check: 'brief-shape',
  severity: 'error',
  message:
    'brief-validation Test Plan: no Test Plan section found — expected `Test Plan: unit-tests-only`, or at least one `**[agent]**`/`**[principal]**`-tagged checklist item.',
  agent_recovery_prompt:
    'Open the PR body and add or fix the section named above, following the canonical PR-body template. Commit the corrected PR body, then re-run `vinaya check brief-shape`.'
}

export function GateRefusalDemo() {
  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-2'>
        <Text as='span' size='xs' muted className='font-mono uppercase tracking-widest'>
          A clean tree — <code>vinaya check --all</code>
        </Text>
        <CodeBlock className='my-0'>{CLEAN_PASS}</CodeBlock>
      </div>

      <div className='flex flex-col gap-2'>
        <Text as='span' size='xs' muted className='font-mono uppercase tracking-widest'>
          A refusal
        </Text>
        <CodeBlock className='my-0'>{REFUSAL}</CodeBlock>
      </div>

      <div className='flex flex-col gap-2'>
        <Text as='span' size='xs' muted className='font-mono uppercase tracking-widest'>
          The same refusal, in its machine form
        </Text>
        <CodeBlock className='my-0'>{JSON.stringify(REFUSAL_CONTRACT, null, 2)}</CodeBlock>
      </div>
    </div>
  )
}
