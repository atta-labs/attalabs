'use client'

// SSE consumer for server-side deliberation via Mastra workflow.
// The browser POSTs the apiKey to /workflow/run?stream=true; the server runs
// the full deliberation and emits SSE events as each agent turn completes.
// Keys transit server memory only for the duration of that request — never
// persisted. See /trust for the updated BYOK architecture description.

import { useIdentity } from '@atta/identity/react'
import type { RouteProvider } from '@atta/models'
import { useEffect, useRef, useState } from 'react'
import { getAgentConfigByName } from '@/schemas'

// ── Exported types (unchanged from pull-loop era API) ─────────────────────────

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

// Filter self-replies: a model that emits [TARGET: Strategist] on its own
// Strategist message is mis-following the instruction. Drop it so the UI
// doesn't show "replying to Strategist" on a Strategist card.
function parseContent(raw: string, selfName?: string): { text: string; replyTarget: string | null } {
  let replyTarget: string | null = null
  const text = raw.replace(TARGET_RE, (_match, name: string) => {
    replyTarget = name.trim()
    return ''
  })
  const target = replyTarget as string | null
  if (selfName && target && target.toLowerCase() === selfName.toLowerCase()) {
    replyTarget = null
  }
  return { text: text.trim(), replyTarget }
}

interface InitialEntry {
  agent: string
  content: string
  round: number
}

// Loading messages keyed by session state. AUDITING covers both audit and
// reaudit passes — the state name is the same for both.
const LOADING_BY_STATE: Record<string, string> = {
  PENDING: 'Starting deliberation...',
  CONCLUDING: 'Synthesizer is drafting the conclusion...',
  AUDITING: 'Blind Critic is reviewing the conclusion...',
  REVISING: 'Synthesizer is revising...'
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDeliberation(
  sessionId: string,
  _initialQuestion: string,
  initialEntries: InitialEntry[] = [],
  initialConclusion: Record<string, unknown> | null = null,
  initialState = 'PENDING',
  initialTerminalState: string | null = null,
  defaultProvider: string | null = null
) {
  const identity = useIdentity()
  const identityRef = useRef(identity)
  identityRef.current = identity

  const isComplete = initialState === 'TERMINAL'

  const [messages, setMessages] = useState<DeliberationMessage[]>(() =>
    initialEntries.map((e) => {
      const { text, replyTarget } = parseContent(e.content, e.agent)
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

  // streamingMessage is always null in Step 6 — SSE provides step-completion
  // granularity, not token-by-token streaming. See followups.md (V2 streaming).
  const [streamingMessage] = useState<StreamingMessage | null>(null)

  // Seed loadingMessage from initialState so reconnects to mid-conclusion
  // sessions show the spinner immediately without waiting for a state_changed event.
  const [loadingMessage, setLoadingMessage] = useState<string | null>(() => LOADING_BY_STATE[initialState] ?? null)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [currentState, setCurrentState] = useState(initialState)
  const [terminalState, setTerminalState] = useState<string | null>(initialTerminalState)
  const [conclusion, setConclusion] = useState<Record<string, unknown> | null>(initialConclusion)
  const [completedRounds] = useState<Set<number>>(() => {
    if (isComplete) return new Set(initialEntries.map((e) => e.round))
    return new Set()
  })

  useEffect(() => {
    if (isComplete) return

    let cancelled = false
    const abort = new AbortController()

    const drive = async () => {
      // Resolve apiKey before opening the stream so we can show a useful error
      // rather than letting the server return 200 with no key and fail silently.
      const id = identityRef.current
      const keyMap = id.state.keys as Record<string, string>
      let apiKey: string | undefined

      if (defaultProvider === 'ollama') {
        apiKey = 'ollama-local'
      } else if (defaultProvider) {
        apiKey = keyMap[defaultProvider]

        if (!apiKey && id.state.kind === 'locked' && id.state.providers.includes(defaultProvider as RouteProvider)) {
          try {
            const freshKeys = await id.unlockWithPasskey()
            if (cancelled) return
            apiKey = (freshKeys as Record<string, string>)[defaultProvider]
          } catch (e) {
            if (cancelled) return
            setStreamError(
              `Could not unlock ${defaultProvider} key: ${e instanceof Error ? e.message : 'passkey cancelled'}. Reload and try again.`
            )
            return
          }
        }

        if (!apiKey) {
          setStreamError(
            `Missing ${defaultProvider} API key. Add one in settings and reload to continue this deliberation.`
          )
          return
        }
      }

      let res: Response
      try {
        res = await fetch(`/api/deliberation/${sessionId}/workflow/run?stream=true`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey }),
          signal: abort.signal
        })
        if (cancelled) return
        if (!res.ok) {
          const text = await res.text()
          setStreamError(`Failed to start deliberation: ${res.status} ${text}`)
          return
        }
      } catch (err) {
        if (cancelled || (err as DOMException)?.name === 'AbortError') return
        setStreamError(err instanceof Error ? err.message : 'Failed to connect to deliberation stream')
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        if (cancelled) return
        setStreamError('No response stream available')
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          if (cancelled) {
            reader.cancel()
            return
          }
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          // SSE wire format: "data: {json}\n\n" — split on double newline
          const parts = buffer.split('\n\n')
          buffer = parts.pop() ?? ''

          for (const part of parts) {
            const line = part.trim()
            if (!line.startsWith('data: ')) continue
            let event: Record<string, unknown>
            try {
              event = JSON.parse(line.slice(6)) as Record<string, unknown>
            } catch {
              continue
            }
            if (cancelled) return

            if (event.type === 'keepalive') continue

            if (event.type === 'state_changed') {
              const state = event.state as string
              setCurrentState(state)
              setLoadingMessage(LOADING_BY_STATE[state] ?? null)
              continue
            }

            if (event.type === 'agent_completed') {
              const agent = event.agent as string
              const round = event.round as number
              const content = event.content as string
              const id = event.id as string
              const config = getAgentConfigByName(agent)
              const { text, replyTarget } = parseContent(content, agent)
              setMessages((prev) => [
                ...prev,
                {
                  id,
                  agent,
                  agentRole: config.role,
                  round,
                  content: text,
                  state: 'complete' as const,
                  replyTarget
                }
              ])
              setLoadingMessage(null)
              continue
            }

            if (event.type === 'terminal') {
              const ts = event.terminalState as string
              setTerminalState(ts)
              setCurrentState('TERMINAL')
              setLoadingMessage(null)
              try {
                const sr = await fetch(`/api/sessions/${sessionId}`)
                if (!cancelled && sr.ok) {
                  const sess = (await sr.json()) as { conclusion?: Record<string, unknown> | null }
                  if (!cancelled && sess.conclusion) setConclusion(sess.conclusion)
                }
              } catch {
                // Conclusion fetch is cosmetic — terminal state is already set
              }
              return
            }

            if (event.type === 'error') {
              setStreamError(event.message as string)
              return
            }
          }
        }
      } catch (err) {
        if (cancelled || (err as DOMException)?.name === 'AbortError') return
        setStreamError(err instanceof Error ? err.message : 'Stream read error')
      } finally {
        reader.releaseLock()
      }
    }

    drive()
    return () => {
      cancelled = true
      abort.abort()
    }
  }, [sessionId, isComplete, defaultProvider])

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
