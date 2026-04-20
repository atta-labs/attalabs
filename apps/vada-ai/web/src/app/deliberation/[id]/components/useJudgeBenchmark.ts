'use client'

// Fires the AI-judge benchmark call exactly once per session, when:
//   1. benchmark is enabled (row exists for this session)
//   2. the deliberation has reached a terminal state
//   3. the baseline single-shot call already landed
//   4. no judge response is stored yet
//   5. the user's key for the session's model is in memory (BYOK)
//
// Judge runs server-side via POST /api/benchmark/judge (Anthropic blocks
// browser-origin streaming at CORS preflight). apiKey transits server
// memory only, per /trust.

import { useIdentity } from '@atta/identity/react'
import type { RouteProvider } from '@atta/models'
import { useEffect, useRef } from 'react'
import type { BenchmarkClientState } from './DeliberationFeed'

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

    // Judge tier separation: if env-configured judge provider/model is set AND
    // the user has a key for that provider, use it instead of the participant
    // model. Falls back to participant model when no override is configured or
    // the user lacks a key for the override provider.
    const envJudgeProvider = process.env.NEXT_PUBLIC_VADA_JUDGE_PROVIDER as RouteProvider | undefined
    const envJudgeModelId = process.env.NEXT_PUBLIC_VADA_JUDGE_MODEL
    const overrideKey =
      envJudgeProvider && envJudgeModelId
        ? envJudgeProvider === 'ollama'
          ? 'ollama-local'
          : (identity.state.keys[envJudgeProvider] as string | undefined)
        : undefined
    const judgeProvider: RouteProvider =
      envJudgeProvider && envJudgeModelId && overrideKey ? envJudgeProvider : defaultProvider
    const judgeModelId: string = envJudgeProvider && envJudgeModelId && overrideKey ? envJudgeModelId : defaultModelId
    const judgeApiKey =
      judgeProvider === 'ollama' ? 'ollama-local' : (identity.state.keys[judgeProvider] as string | undefined)
    if (!judgeApiKey) return

    let cancelled = false
    let pollTimer: ReturnType<typeof setTimeout> | null = null
    const POLL_INTERVAL_MS = 3000
    const MAX_WAIT_MS = 120_000
    const pollStart = Date.now()

    const fireJudge = async (responseA: string) => {
      firedRef.current = true
      try {
        const res = await fetch('/api/benchmark/judge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            question,
            baselineAnswer: responseA,
            vadaRecommendation: recommendation,
            provider: judgeProvider,
            modelId: judgeModelId,
            apiKey: judgeApiKey
          })
        })
        if (!res.ok && res.status !== 409) {
          console.warn('[benchmark] judge POST failed', res.status)
          firedRef.current = false
        }
      } catch (e) {
        console.warn('[benchmark] judge call failed', e)
        firedRef.current = false
      }
    }

    const tryFire = async () => {
      if (cancelled || firedRef.current) return

      if (benchmark.baselineAvailable && benchmark.baselineAnswer) {
        await fireJudge(benchmark.baselineAnswer)
        return
      }

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
          firedRef.current = true
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
