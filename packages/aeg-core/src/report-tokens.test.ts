import { describe, expect, it } from 'vitest'
import { parseTokensLines } from './parse-token-report'
import { formatBreakdown, formatTokensLine, summarizeTranscript } from './report-tokens'

function assistantLine(opts: {
  id: string
  model: string
  input: number
  output: number
  cacheCreation?: number
  cacheRead?: number
}): string {
  return JSON.stringify({
    type: 'assistant',
    message: {
      id: opts.id,
      model: opts.model,
      usage: {
        input_tokens: opts.input,
        output_tokens: opts.output,
        cache_creation_input_tokens: opts.cacheCreation ?? 0,
        cache_read_input_tokens: opts.cacheRead ?? 0
      }
    }
  })
}

describe('summarizeTranscript', () => {
  it('sums usage across unique assistant messages', () => {
    const jsonl = [
      assistantLine({ id: 'msg_1', model: 'claude-sonnet-5', input: 100, output: 50, cacheCreation: 10, cacheRead: 5 }),
      assistantLine({ id: 'msg_2', model: 'claude-sonnet-5', input: 20, output: 30, cacheCreation: 0, cacheRead: 1000 })
    ].join('\n')

    const summary = summarizeTranscript(jsonl)
    expect(summary.messageCount).toBe(2)
    expect(summary.model).toBe('claude-sonnet-5')
    expect(summary.components).toEqual({
      inputTokens: 120,
      outputTokens: 80,
      cacheCreationInputTokens: 10,
      cacheReadInputTokens: 1005
    })
  })

  it('dedups repeated JSONL entries sharing one message.id — a real turn split across content blocks', () => {
    // Mirrors the shape confirmed against this task's own live transcript:
    // one API turn (thinking + tool_use blocks) becomes multiple JSONL
    // lines that all carry an identical copy of that turn's usage.
    const repeatedUsage = {
      id: 'msg_shared',
      model: 'claude-sonnet-5',
      input: 2,
      output: 100,
      cacheCreation: 59671,
      cacheRead: 0
    }
    const jsonl = [assistantLine(repeatedUsage), assistantLine(repeatedUsage), assistantLine(repeatedUsage)].join('\n')

    const summary = summarizeTranscript(jsonl)
    expect(summary.messageCount).toBe(1)
    expect(summary.components).toEqual({
      inputTokens: 2,
      outputTokens: 100,
      cacheCreationInputTokens: 59671,
      cacheReadInputTokens: 0
    })
  })

  it('takes the most recent model id across a session', () => {
    const jsonl = [
      assistantLine({ id: 'msg_1', model: 'claude-haiku-4-5', input: 1, output: 1 }),
      assistantLine({ id: 'msg_2', model: 'claude-sonnet-5', input: 1, output: 1 })
    ].join('\n')

    expect(summarizeTranscript(jsonl).model).toBe('claude-sonnet-5')
  })

  it('skips lines that are not JSON, not assistant-typed, or missing an id/usage', () => {
    const jsonl = [
      'not json at all',
      JSON.stringify({ type: 'user', message: { id: 'msg_1', usage: { input_tokens: 1 } } }),
      JSON.stringify({ type: 'assistant', message: { model: 'claude-sonnet-5' } }), // no id/usage
      assistantLine({ id: 'msg_2', model: 'claude-sonnet-5', input: 5, output: 5 })
    ].join('\n')

    const summary = summarizeTranscript(jsonl)
    expect(summary.messageCount).toBe(1)
    expect(summary.components.inputTokens).toBe(5)
  })

  it('returns a zeroed summary with a null model for an empty transcript', () => {
    const summary = summarizeTranscript('')
    expect(summary.messageCount).toBe(0)
    expect(summary.model).toBeNull()
    expect(summary.components).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0
    })
  })
})

describe('formatTokensLine', () => {
  it('sums the three input-side components into the single `Tokens in` cell, never blending in a guessed cost', () => {
    const summary = summarizeTranscript(
      assistantLine({
        id: 'msg_1',
        model: 'claude-sonnet-5',
        input: 2848,
        output: 25604,
        cacheCreation: 147321,
        cacheRead: 2267330
      })
    )
    const line = formatTokensLine({ phase: '1: develop', role: 'Developer', summary })
    expect(line).toBe('Tokens: 1: develop — Developer — claude-sonnet-5 — 2417499/25604/—')
  })

  it('reports the frozen all-`—` numbers segment when the surface genuinely cannot self-report', () => {
    const line = formatTokensLine({ phase: '1: review', role: 'Reviewer', summary: null })
    expect(line).toBe('Tokens: 1: review — Reviewer — — — —')
  })

  it('honors an explicit model override over the transcript-derived model', () => {
    const summary = summarizeTranscript(assistantLine({ id: 'msg_1', model: 'claude-sonnet-5', input: 1, output: 1 }))
    const line = formatTokensLine({
      phase: '1: develop',
      role: 'Developer',
      summary,
      modelOverride: 'claude-opus-5 (CC)'
    })
    expect(line).toContain('claude-opus-5 (CC)')
  })
})

describe('round-trip through the real parser', () => {
  it('formatTokensLine output parses back through parseTokensLines to matching component values', () => {
    const summary = summarizeTranscript(
      [
        assistantLine({
          id: 'msg_1',
          model: 'claude-sonnet-5',
          input: 100,
          output: 50,
          cacheCreation: 20,
          cacheRead: 30
        }),
        assistantLine({ id: 'msg_2', model: 'claude-sonnet-5', input: 10, output: 5 })
      ].join('\n')
    )
    const line = formatTokensLine({ phase: '1: develop', role: 'Developer', summary })

    const rows = parseTokensLines(line)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      phase: '1: develop',
      role: 'Developer',
      agentModel: 'claude-sonnet-5',
      tokensIn: 160, // 110 fresh input + 20 cache creation + 30 cache read
      tokensOut: 55,
      cost: null
    })
  })

  it('round-trips the all-unknown line too', () => {
    const line = formatTokensLine({ phase: 'planning', role: 'Planner', summary: null })
    const rows = parseTokensLines(line)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ phase: 'planning', role: 'Planner', tokensIn: null, tokensOut: null, cost: null })
  })
})

describe('formatBreakdown', () => {
  it('reports every component separately, never a single conflated figure', () => {
    const summary = summarizeTranscript(
      assistantLine({
        id: 'msg_1',
        model: 'claude-sonnet-5',
        input: 2848,
        output: 25604,
        cacheCreation: 147321,
        cacheRead: 2267330
      })
    )
    const breakdown = formatBreakdown(summary)
    expect(breakdown).toContain('fresh input tokens:    2848')
    expect(breakdown).toContain('cache creation tokens: 147321')
    expect(breakdown).toContain('cache read tokens:     2267330')
    expect(breakdown).toContain('output tokens:         25604')
    expect(breakdown).toContain('messages summed:       1')
  })
})
