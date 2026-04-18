'use client'

// Fires the AI-judge benchmark call exactly once per session, when:
//   1. benchmark is enabled (row exists for this session)
//   2. the deliberation has reached a terminal state
//   3. the baseline single-shot call already landed
//   4. no judge response is stored yet
//   5. the user's key for the session's model is in memory (BYOK)
//
// The judge asks the same model to compare the single-shot baseline against
// Vāda's synthesized recommendation in ~100 lines of markdown. Result + its
// own usage/elapsed are POSTed to /api/sessions/[id]/judge for the report
// page to render.

import { invokeAgent } from '@atta/identity'
import { useIdentity } from '@atta/identity/react'
import type { RouteProvider } from '@atta/models'
import { useEffect, useRef } from 'react'
import type { BenchmarkClientState } from './DeliberationFeed'

const JUDGE_SYSTEM_PROMPT = `You are an impartial judge. You are given:
1. A question from the Principal.
2. Response A, produced by a single call to you (no deliberation).
3. Response B, produced by a multi-round multi-agent deliberation using the same base model.

Compare the two responses on: decisiveness, depth, accuracy, usefulness. Identify where the deliberation added genuine value and where it added noise or repetition. Be specific — quote short passages when making a point. Conclude with a one-line verdict: which response would you recommend the Principal act on, and why. Keep your full response to about 100 lines of markdown.`

function buildJudgeUserPrompt(question: string, responseA: string, responseB: string): string {
  return `## Question\n\n${question.trim()}\n\n## Response A (single-shot, no deliberation)\n\n${responseA.trim()}\n\n## Response B (Vāda deliberation, synthesized from multi-agent rounds)\n\n${responseB.trim()}`
}

interface UseJudgeBenchmarkProps {
  sessionId: string
  question: string
  benchmark: BenchmarkClientState | null
  terminalReached: boolean
  conclusion: Record<string, unknown> | null
  defaultProvider: RouteProvider | null
  defaultModelId: string | null
}

export function useJudgeBenchmark({
  sessionId,
  question,
  benchmark,
  terminalReached,
  conclusion,
  defaultProvider,
  defaultModelId
}: UseJudgeBenchmarkProps) {
  const identity = useIdentity()
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    if (!benchmark) return
    if (benchmark.judgeAvailable) return
    if (!terminalReached) return
    if (!defaultProvider || !defaultModelId) return

    const recommendation = typeof conclusion?.recommendation === 'string' ? (conclusion.recommendation as string) : null
    if (!recommendation) return

    const apiKey =
      defaultProvider === 'ollama' ? 'ollama-local' : (identity.state.keys[defaultProvider] as string | undefined)
    if (!apiKey) return

    // Baseline may have landed AFTER the page SSR'd (the fire-and-forget from
    // /deliberate settles on its own timeline). If the SSR snapshot says
    // baseline isn't available yet, poll the benchmark endpoint until it is —
    // then fire the judge. Cap at 2 minutes; beyond that, assume the baseline
    // failed and stop wasting cycles.
    let cancelled = false
    let pollTimer: ReturnType<typeof setTimeout> | null = null
    const POLL_INTERVAL_MS = 3000
    const MAX_WAIT_MS = 120_000
    const pollStart = Date.now()

    const fireJudge = async (responseA: string) => {
      firedRef.current = true
      const start = performance.now()
      try {
        const result = await invokeAgent({
          provider: defaultProvider,
          modelId: defaultModelId,
          apiKey,
          systemPrompt: JUDGE_SYSTEM_PROMPT,
          userPrompt: buildJudgeUserPrompt(question, responseA, recommendation)
        })
        const text = await result.fullText()
        const usage = await result.usage()
        const elapsedMs = Math.round(performance.now() - start)
        if (cancelled) return
        await fetch(`/api/sessions/${sessionId}/judge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            response: text,
            tokensInput: usage.inputTokens,
            tokensOutput: usage.outputTokens,
            elapsedMs
          })
        })
      } catch (e) {
        // Judge is opt-in and cosmetic — don't toast. User can navigate to
        // /benchmark and see that judge hasn't landed yet.
        console.warn('[benchmark] judge call failed', e)
        firedRef.current = false
      }
    }

    const tryFire = async () => {
      if (cancelled || firedRef.current) return

      // If SSR snapshot already shows baseline, use it directly — no network
      // hop needed.
      if (benchmark.baselineAvailable && benchmark.baselineAnswer) {
        await fireJudge(benchmark.baselineAnswer)
        return
      }

      // Otherwise poll — baseline may still be in flight from /deliberate's
      // fire-and-forget call.
      try {
        const res = await fetch(`/api/sessions/${sessionId}/benchmark`)
        if (!res.ok) throw new Error(`benchmark GET ${res.status}`)
        const data = (await res.json()) as {
          enabled?: boolean
          baselineAvailable?: boolean
          baselineAnswer?: string | null
          judgeAvailable?: boolean
        }
        if (cancelled) return
        if (data.judgeAvailable) {
          firedRef.current = true // already done server-side
          return
        }
        if (data.baselineAvailable && data.baselineAnswer) {
          await fireJudge(data.baselineAnswer)
          return
        }
      } catch (e) {
        console.warn('[benchmark] poll failed', e)
      }

      if (Date.now() - pollStart < MAX_WAIT_MS) {
        pollTimer = setTimeout(tryFire, POLL_INTERVAL_MS)
      }
    }

    void tryFire()

    return () => {
      cancelled = true
      if (pollTimer) clearTimeout(pollTimer)
    }
  }, [
    sessionId,
    question,
    benchmark,
    terminalReached,
    conclusion,
    defaultProvider,
    defaultModelId,
    identity.state.keys
  ])
}
