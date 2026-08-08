/**
 * Session token self-report (misc-hardening-v1 task 1, #675). Retracts
 * `aeg-root/tranche-model.md` §12's claim that a terminal role reports exact
 * tokens "from `/cost`": `/cost` is a Claude Code slash command typed by an
 * operator at the interactive prompt — an unattended agent session has no
 * way to invoke it. The real per-agent source is the session's own
 * transcript (`~/.claude/projects/<slug>/<session-id>.jsonl`), which the
 * harness already writes as the session runs and hands to every hook as
 * `transcript_path`.
 *
 * Pure — no `fs`, no `process.env`. The CLI shim (`bin/report-tokens.ts`)
 * resolves the transcript path and reads the file; these functions take its
 * text content and produce the report.
 */

export type UsageComponents = {
  inputTokens: number
  outputTokens: number
  cacheCreationInputTokens: number
  cacheReadInputTokens: number
}

export type TranscriptSummary = {
  components: UsageComponents
  /** The most recent model id seen on an assistant message, or `null` if none. */
  model: string | null
  /** Count of unique assistant messages summed (post-dedup). */
  messageCount: number
}

/**
 * Sum usage across every unique assistant message in a session transcript
 * (JSONL — one object per line). A single API turn is frequently split
 * across several JSONL entries (a thinking block, a tool_use block, a text
 * block, …) that each carry an identical copy of that turn's `usage` object
 * under the same `message.id` — confirmed against this task's own live
 * transcript, where 59 assistant-typed lines held only 22 unique message
 * ids. Summing every line naively over-counts by as much as 3x. Dedup by
 * `message.id` first; a line missing an id or a usage object is skipped,
 * not guessed at.
 */
export function summarizeTranscript(jsonl: string): TranscriptSummary {
  const seen = new Set<string>()
  const components: UsageComponents = {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0
  }
  let model: string | null = null
  let messageCount = 0

  for (const rawLine of jsonl.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    let entry: unknown
    try {
      entry = JSON.parse(line)
    } catch {
      continue
    }
    if (!entry || typeof entry !== 'object') continue
    const obj = entry as Record<string, unknown>
    if (obj.type !== 'assistant') continue

    const message = obj.message as Record<string, unknown> | undefined
    const id = message?.id
    const usage = message?.usage as Record<string, unknown> | undefined
    if (typeof id !== 'string' || !id || !usage || seen.has(id)) continue
    seen.add(id)
    messageCount++

    components.inputTokens += numberOr(usage.input_tokens, 0)
    components.outputTokens += numberOr(usage.output_tokens, 0)
    components.cacheCreationInputTokens += numberOr(usage.cache_creation_input_tokens, 0)
    components.cacheReadInputTokens += numberOr(usage.cache_read_input_tokens, 0)

    const messageModel = message?.model
    if (typeof messageModel === 'string' && messageModel) model = messageModel
  }

  return { components, model, messageCount }
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export type TokensLineInput = {
  phase: string
  role: string
  /** `null` when the surface genuinely cannot self-report (a claude.ai chat
   * role) — produces the all-`—` numbers segment that the parser already
   * tolerates. */
  summary: TranscriptSummary | null
  /** Overrides the model derived from the transcript, if given. */
  modelOverride?: string
}

/**
 * Format the one-line `Tokens: <phase> — <role> — <model> — <in>/<out>/<cost>`
 * report that `parse-token-report.ts`'s `parseTokensLines` consumes. The
 * grammar is frozen (three parsers depend on it) — this function must never
 * change its shape, only what feeds it.
 *
 * `Tokens in` is the full input-side total (`input_tokens +
 * cache_creation_input_tokens + cache_read_input_tokens`) — genuinely every
 * token that went in, not a partial figure. Cache reads can outweigh fresh
 * input by two orders of magnitude on a long session, so that total is
 * never the whole story on its own; `formatBreakdown` reports the four
 * components separately for anyone reading the reporter's own output,
 * rather than letting the single blended cell stand as if it were.
 *
 * Cost is always reported as `—`: no maintained, accurate $/token pricing
 * table for current models lives in this package (the one in
 * `@atta/adapter-langgraph` is a different product's provider-pricing
 * table, out of this task's surface, and does not cover these model ids) —
 * an unverified guess baked into a PR's permanent history is worse than an
 * honest unknown.
 */
export function formatTokensLine(input: TokensLineInput): string {
  const model = input.modelOverride ?? input.summary?.model ?? '—'
  if (!input.summary) {
    return `Tokens: ${input.phase} — ${input.role} — ${model} — —`
  }
  const { inputTokens, cacheCreationInputTokens, cacheReadInputTokens, outputTokens } = input.summary.components
  const tokensIn = inputTokens + cacheCreationInputTokens + cacheReadInputTokens
  return `Tokens: ${input.phase} — ${input.role} — ${model} — ${tokensIn}/${outputTokens}/—`
}

/**
 * Human-readable component breakdown for the reporter's own console output
 * — never folded silently into the single `Tokens in` cell. Not parsed by
 * anything; informational only.
 */
export function formatBreakdown(summary: TranscriptSummary): string {
  const { inputTokens, cacheCreationInputTokens, cacheReadInputTokens, outputTokens } = summary.components
  return [
    `  fresh input tokens:    ${inputTokens}`,
    `  cache creation tokens: ${cacheCreationInputTokens}`,
    `  cache read tokens:     ${cacheReadInputTokens}`,
    `  output tokens:         ${outputTokens}`,
    `  model:                 ${summary.model ?? '—'}`,
    `  messages summed:       ${summary.messageCount} (deduped by message.id)`
  ].join('\n')
}
