'use client'

// Browser-driven pull loop. Replaces the old SSE consumer.
// The server returns commands via /api/deliberation/[id]/next; we execute each
// command locally with the user's API key (held in @atta/identity, never sent
// to the server), stream tokens into UI state, then POST /turn with the final
// text. See /trust for the BYOK architecture guarantee.

import { classifyProviderError, invokeAgent, invokeMock, isMockModeActive, retryWithBackoff } from '@atta/identity'
import { useIdentity } from '@atta/identity/react'
import type { RouteProvider } from '@atta/models'
import { useEffect, useRef, useState } from 'react'
import { getAgentConfigByName } from '@/schemas'

// ── Exported types (unchanged from SSE-era API) ───────────────────────────────

export type MessageDisplayState = 'streaming' | 'complete'

export interface DeliberationMessage {
  id: string
  agent: string
  agentRole: string
  round: number
  content: string
  state: MessageDisplayState
  replyTarget: string | null
}

export interface StreamingMessage {
  agent: string
  agentRole: string
  round: number
  content: string
  replyTarget: string | null
}

// ── Internal helpers ──────────────────────────────────────────────────────────

const TARGET_RE = /\[TARGET:\s*([^\]]+)\]/g

function parseContent(raw: string): { text: string; replyTarget: string | null } {
  let replyTarget: string | null = null
  const text = raw.replace(TARGET_RE, (_match, name: string) => {
    replyTarget = name.trim()
    return ''
  })
  return { text: text.trim(), replyTarget }
}

interface InitialEntry {
  agent: string
  content: string
  round: number
}

// ── Command types (matching server engine/types.ts) ───────────────────────────

interface ModelRef {
  provider: RouteProvider
  modelId: string
}

type ConclusionPhase = 'synthesize' | 'audit' | 'revise' | 'reaudit'

type NextCommand =
  | {
      type: 'run_agent'
      turnId: string
      agent: string
      round: number
      model: ModelRef
      systemPrompt: string
      userPrompt: string
    }
  | {
      type: 'run_conclusion'
      turnId: string
      phase: ConclusionPhase
      model: ModelRef
      systemPrompt: string
      userPrompt: string
      expected: 'json' | 'verdict'
    }
  | { type: 'state_change'; state: string }
  | { type: 'terminal'; terminal_state: string }
  | { type: 'done' }

// ── Loading messages per conclusion phase ─────────────────────────────────────

const CONCLUSION_LOADING: Record<ConclusionPhase, string> = {
  synthesize: 'Synthesizer is drafting the conclusion...',
  audit: 'Blind Critic is reviewing the conclusion...',
  revise: 'Synthesizer is revising...',
  reaudit: 'Blind Critic is reviewing revision...'
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDeliberation(
  sessionId: string,
  _initialQuestion: string,
  initialEntries: InitialEntry[] = [],
  initialConclusion: Record<string, unknown> | null = null,
  initialState = 'PENDING'
) {
  const identity = useIdentity()
  const keyMapRef = useRef(identity.state.keys)
  keyMapRef.current = identity.state.keys

  const isComplete = initialState === 'TERMINAL'

  const [messages, setMessages] = useState<DeliberationMessage[]>(() =>
    initialEntries.map((e) => {
      const { text, replyTarget } = parseContent(e.content)
      const config = getAgentConfigByName(e.agent)
      return {
        id: crypto.randomUUID(),
        agent: e.agent,
        agentRole: config.role,
        round: e.round,
        content: text,
        state: 'complete' as const,
        replyTarget
      }
    })
  )

  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null)
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [currentState, setCurrentState] = useState(initialState)
  const [terminalState, setTerminalState] = useState<string | null>(null)
  const [conclusion, setConclusion] = useState<Record<string, unknown> | null>(initialConclusion)
  const [completedRounds, setCompletedRounds] = useState<Set<number>>(() => {
    if (isComplete) return new Set(initialEntries.map((e) => e.round))
    return new Set()
  })

  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (isComplete) return

    // React 19 StrictMode double-invokes useEffect in dev, which would spawn
    // two concurrent pull loops racing against each other. A closure-scoped
    // `cancelled` variable (not a ref) makes each invocation's cancellation
    // signal unique to its own mount, so the unmount from the first pass only
    // cancels that pass. We also guard every mutation with a `cancelled` check
    // after each await so the first-mount drive can't POST /turn after its
    // cleanup has fired.
    let cancelled = false

    const drive = async () => {
      // Safety cap — a bug in the server orchestrator shouldn't let the browser
      // loop forever. 200 rounds is well beyond any real deliberation.
      for (let iter = 0; iter < 200; iter++) {
        if (cancelled) return

        let cmd: NextCommand
        try {
          const res = await fetch(`/api/deliberation/${sessionId}/next`, { method: 'POST' })
          if (cancelled) return
          if (!res.ok) throw new Error(`next failed: ${res.status}`)
          cmd = (await res.json()) as NextCommand
        } catch (err) {
          if (cancelled) return
          setStreamError(err instanceof Error ? err.message : 'Failed to fetch next command')
          return
        }

        if (cancelled) return

        if (cmd.type === 'done') return

        if (cmd.type === 'terminal') {
          setTerminalState(cmd.terminal_state)
          setCurrentState('TERMINAL')
          setLoadingMessage(null)
          // Fetch the finalized conclusion row for display
          try {
            const res = await fetch(`/api/sessions/${sessionId}`)
            if (cancelled) return
            if (res.ok) {
              const session = (await res.json()) as { conclusion?: Record<string, unknown> | null }
              if (!cancelled && session.conclusion) setConclusion(session.conclusion)
            }
          } catch {
            // Conclusion fetch is cosmetic — terminal state is already set
          }
          return
        }

        if (cmd.type === 'state_change') {
          setCurrentState(cmd.state)
          continue
        }

        // run_agent or run_conclusion — execute the provider call.
        // Ollama is local and auth-free; invokeAgent uses a sentinel key for it.
        let apiKey = cmd.model.provider === 'ollama' ? 'ollama-local' : keyMapRef.current[cmd.model.provider]

        // Resume-case unlock: the user came back to an in-progress deliberation
        // with saved-but-locked credentials. Trigger a passkey unlock instead
        // of bailing with "Missing key" — that's the exact experience the
        // picker gives on /deliberate, and it should work here too.
        if (!apiKey && identity.state.kind === 'locked' && identity.state.providers.includes(cmd.model.provider)) {
          try {
            const freshKeys = await identity.unlockWithPasskey()
            if (cancelled) return
            apiKey = freshKeys[cmd.model.provider]
          } catch (e) {
            if (cancelled) return
            setStreamError(
              `Could not unlock ${cmd.model.provider} key: ${e instanceof Error ? e.message : 'passkey cancelled'}. Reload and try again.`
            )
            return
          }
        }

        if (!apiKey) {
          setStreamError(
            `Missing ${cmd.model.provider} API key. Add one in settings and reload to continue this deliberation.`
          )
          return
        }

        const abort = new AbortController()
        abortRef.current = abort

        const dispatch = isMockModeActive() ? invokeMock : invokeAgent

        try {
          if (cmd.type === 'run_agent') {
            const config = getAgentConfigByName(cmd.agent)
            setCurrentState(`ROUND_${cmd.round}`)
            setStreamingMessage({
              agent: cmd.agent,
              agentRole: config.role,
              round: cmd.round,
              content: '',
              replyTarget: null
            })
          } else {
            setLoadingMessage(CONCLUSION_LOADING[cmd.phase])
            setCurrentState(
              cmd.phase === 'synthesize' ? 'CONCLUDING' : cmd.phase === 'revise' ? 'REVISING' : 'AUDITING'
            )
          }

          const result = await retryWithBackoff(
            () =>
              dispatch({
                provider: cmd.model.provider,
                modelId: cmd.model.modelId,
                apiKey,
                systemPrompt: cmd.systemPrompt,
                userPrompt: cmd.userPrompt,
                signal: abort.signal,
                ...(cmd.type === 'run_agent' ? { agentLabel: cmd.agent, round: cmd.round } : {})
              }),
            {
              maxAttempts: 3,
              shouldRetry: (err) => classifyProviderError(err, cmd.model.provider).recoverable
            }
          )

          if (cancelled) return

          let fullText = ''
          for await (const delta of result.textStream) {
            if (cancelled) return
            fullText += delta
            if (cmd.type === 'run_agent') {
              const { text, replyTarget } = parseContent(fullText)
              setStreamingMessage((prev) => (prev ? { ...prev, content: text, replyTarget } : prev))
            }
          }

          if (cancelled) return

          // Report turn result to server. Must not fire after cancellation —
          // a cancelled drive that still POSTs /turn would double-write when
          // a sibling drive also makes it past its own cancellation check.
          await fetch(`/api/deliberation/${sessionId}/turn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              turnId: cmd.turnId,
              content: fullText,
              phase: cmd.type === 'run_agent' ? 'run_agent' : cmd.phase,
              ...(cmd.type === 'run_agent' ? { agent: cmd.agent, round: cmd.round } : {})
            })
          })

          if (cancelled) return

          if (cmd.type === 'run_agent') {
            const config = getAgentConfigByName(cmd.agent)
            const { text, replyTarget } = parseContent(fullText)
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                agent: cmd.agent,
                agentRole: config.role,
                round: cmd.round,
                content: text,
                state: 'complete',
                replyTarget
              }
            ])
            setStreamingMessage(null)
          } else {
            setLoadingMessage(null)
          }
        } catch (err) {
          if (cancelled || (err as DOMException)?.name === 'AbortError') return
          const classified = classifyProviderError(err, cmd.model.provider)
          // Notify server (V1 no-op but good API hygiene)
          await fetch(`/api/deliberation/${sessionId}/turn-error`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ turnId: cmd.turnId, error: classified.userMessage })
          }).catch(() => {})
          setStreamError(classified.userMessage)
          setStreamingMessage(null)
          setLoadingMessage(null)
          return
        }
      }
    }

    drive()
    return () => {
      cancelled = true
      abortRef.current?.abort()
    }
  }, [sessionId, isComplete])

  return {
    messages,
    streamingMessage,
    loadingMessage,
    streamError,
    currentState,
    terminalState,
    conclusion,
    completedRounds
  }
}
