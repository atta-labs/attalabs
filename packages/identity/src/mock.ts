// Browser-side mock dispatcher. Enabled when NEXT_PUBLIC_VADA_MOCK_MODE=true.
// UI wiring: the app layout reads `isMockModeActive()` and renders a persistent
// banner when active. This is deliberate — the silent server-side mock masked
// the original BYOK bug and must not reappear here.

import type { InvokeParams, InvokeResult } from './invoke'

export function isMockModeActive(): boolean {
  if (typeof process === 'undefined') return false
  return process.env.NEXT_PUBLIC_VADA_MOCK_MODE === 'true'
}

const WORD_DELAY_MS = 30
const THINK_DELAY_MS = 600

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function mockText(agent: string, round: number): string {
  return `[MOCK — ${agent}, round ${round}] The mock dispatcher is active because NEXT_PUBLIC_VADA_MOCK_MODE=true. No real provider call was made. The DEV banner at the top of the app confirms this.`
}

export interface MockInvokeParams extends InvokeParams {
  agentLabel?: string
  round?: number
}

export async function invokeMock(params: MockInvokeParams): Promise<InvokeResult> {
  const agent = params.agentLabel ?? 'agent'
  const round = params.round ?? 1
  const words = mockText(agent, round).split(' ')

  const textStream = (async function* () {
    await sleep(THINK_DELAY_MS)
    for (const w of words) {
      if (params.signal?.aborted) throw new DOMException('aborted', 'AbortError')
      await sleep(WORD_DELAY_MS)
      yield `${w} `
    }
  })()

  return {
    textStream,
    fullText: async () => mockText(agent, round),
    usage: async () => ({ inputTokens: null, outputTokens: null, totalTokens: null })
  }
}
