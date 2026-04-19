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

Compare the two responses on: decisiveness, depth, accuracy, usefulness. Identify where the deliberation added genuine value and where it added noise or repetition. Be specific — quote short passages when making a point. Conclude with a one-line verdict: which response would you recommend the Principal act on, and why. Keep your full response to about 100 lines of markdown.

After your markdown response, on a final separate line, output exactly: \`DIAGNOSIS: <CATEGORY> — <one-sentence reason>\` where CATEGORY is one of:
- VADA_WON (deliberation produced a meaningfully better answer than the single-shot)
- BASELINE_WON (the single-shot answer was better)
- TIE (both answers were roughly equivalent)
- NEGLIGIBLE_DIFFERENCE (both answers converged on the same conclusion with no meaningful difference in quality)
- PIPELINE_FAILURE (the deliberation output was corrupted, truncated, or contained code/claims not supported by the deliberation itself)`

function buildJudgeUserPrompt(question: string, responseA: string, responseB: string): string {
  return `## Question\n\n${question.trim()}\n\n## Response A (single-shot, no deliberation)\n\n${responseA.trim()}\n\n## Response B (Vāda deliberation, synthesized from multi-agent rounds)\n\n${responseB.trim()}`
}

// Parse the trailing `DIAGNOSIS: <CATEGORY> — <reason>` line out of the
// judge's markdown. Stored as a separate column so benchmark history is
// tally-able (how often does Vāda win vs pipeline-fail across runs?).
// Tolerant of casing, spacing, and both em-dash and hyphen separators.
const DIAGNOSIS_PATTERN = /DIAGNOSIS:\s*(VADA_WON|BASELINE_WON|TIE|NEGLIGIBLE_DIFFERENCE|PIPELINE_FAILURE)\b/i

function parseDiagnosis(text: string): string | null {
  const match = DIAGNOSIS_PATTERN.exec(text)
  return match?.[1]?.toUpperCase() ?? null
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

    // Judge tier separation: if env-configured judge provider/model is set AND
    // the user has a key for that provider, use it instead of the participant
    // model. A stronger judge catches cases the participant-tier model can't
    // (e.g. "deliberation recommendation contains code that isn't in the
    // transcript"). Falls back to participant model when no override is
    // configured or the user lacks a key for the override provider.
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
          provider: judgeProvider,
          modelId: judgeModelId,
          apiKey: judgeApiKey,
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
            provider: judgeProvider,
            modelId: judgeModelId,
            diagnosis: parseDiagnosis(text),
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
