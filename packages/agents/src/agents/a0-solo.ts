import type { Agent } from '@atta/engine'

// System prompt verbatim from git history (931c9a6, scripts/bench/runner.ts BASELINE_SYSTEM_PROMPT).
export const a0Solo: Agent = {
  name: 'A0',
  description: 'Naive single-shot baseline — direct answer, no framing',
  systemPrompt: "Answer the user's question directly. No framing, no caveats. If code is useful, include it."
}
