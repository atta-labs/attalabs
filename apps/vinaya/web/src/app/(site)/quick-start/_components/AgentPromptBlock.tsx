import { CodeBlock } from '@atta/ui/components'

// Verbatim content from Issue #682's supplied step-4 prompt — written as
// instructions to the reader's coding agent, meant to work unmodified when
// pasted. `VINAYA.md` and `vinaya.config.json` are the two artifacts `vinaya
// init` actually writes at the repo root (`apps/vinaya/cli/src/lib/artifacts.ts`),
// so both paths the prompt names resolve in the reader's own repo.
const AGENT_PROMPT = `Read \`VINAYA.md\`, then \`vinaya.config.json\`.

This repo is governed by Vinaya. Before writing code:

1. Plan the work as a tranche — one milestone, one issue per task. Each issue carries why the task is that size, what it touches, and the traps you found reading the code.
2. Brief the task you're starting: exact files, how it gets verified, when to stop and ask.
3. Work in a worktree on its own branch. Open a PR with the brief in the body.
4. Run \`vinaya check --all\` before opening. Fix what it refuses — don't waive it.`

export function AgentPromptBlock() {
  return <CodeBlock className='my-0 whitespace-pre-wrap'>{AGENT_PROMPT}</CodeBlock>
}
