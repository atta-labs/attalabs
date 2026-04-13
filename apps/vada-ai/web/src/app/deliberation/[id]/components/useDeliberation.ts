'use client'

import { useEffect, useRef, useState } from 'react'
import { getAgentConfigByName } from '@/schemas'
import type { SSEEvent } from '@/schemas'

// ── Exported types ────────────────────────────────────────────────────────────

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

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDeliberation(
  sessionId: string,
  _initialQuestion: string,
  initialEntries: InitialEntry[] = [],
  initialConclusion: Record<string, unknown> | null = null,
  initialState = 'PENDING'
) {
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

  const round1BufferRef = useRef<DeliberationMessage[]>([])
  const [round1HasPending, setRound1HasPending] = useState(false)
  const [round1Ready, setRound1Ready] = useState<boolean>(() => initialEntries.some((e) => e.round === 1))

  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null)
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [currentState, setCurrentState] = useState(initialState)
  const [terminalState, setTerminalState] = useState<string | null>(null)
  const [conclusion, setConclusion] = useState<Record<string, unknown> | null>(initialConclusion)

  const [completedRounds, setCompletedRounds] = useState<Set<number>>(() => {
    if (isComplete) {
      return new Set(initialEntries.map((e) => e.round))
    }
    return new Set()
  })

  const rawStreamRef = useRef('')
  const seenRef = useRef<Set<string>>(
    new Set(initialEntries.map((e) => `${e.round}-${getAgentConfigByName(e.agent).role}`))
  )

  useEffect(() => {
    if (isComplete) return

    const es = new EventSource(`/api/deliberation/${sessionId}/stream`)

    const flushRound1 = () => {
      const buf = round1BufferRef.current
      if (buf.length === 0) return
      round1BufferRef.current = []
      setRound1HasPending(false)
      setMessages((prev) => [...prev, ...buf])
      setRound1Ready(true)
    }

    es.onmessage = (event) => {
      const data = JSON.parse(event.data as string) as SSEEvent

      switch (data.type) {
        case 'state_change': {
          setCurrentState(data.state)
          setLoadingMessage(null)
          if (data.state !== 'ROUND_1') flushRound1()
          break
        }

        case 'agent_start': {
          const config = getAgentConfigByName(data.agent)
          rawStreamRef.current = ''
          setStreamingMessage({
            agent: data.agent,
            agentRole: config.role,
            round: data.round,
            content: '',
            replyTarget: null
          })
          break
        }

        case 'agent_token': {
          rawStreamRef.current += data.token
          const { text, replyTarget } = parseContent(rawStreamRef.current)
          setStreamingMessage((prev) => (prev ? { ...prev, content: text, replyTarget } : prev))
          break
        }

        case 'agent_complete': {
          const config = getAgentConfigByName(data.agent)
          const seenKey = `${data.round}-${config.role}`
          setStreamingMessage(null)
          rawStreamRef.current = ''
          if (seenRef.current.has(seenKey)) break
          seenRef.current.add(seenKey)
          const { text, replyTarget } = parseContent(data.content)
          const msg: DeliberationMessage = {
            id: crypto.randomUUID(),
            agent: data.agent,
            agentRole: config.role,
            round: data.round,
            content: text,
            state: 'complete',
            replyTarget
          }
          if (data.round === 1) {
            round1BufferRef.current = [...round1BufferRef.current, msg]
            setRound1HasPending(true)
          } else {
            setMessages((prev) => [...prev, msg])
          }
          break
        }

        case 'round_complete': {
          if (data.round === 1) flushRound1()
          setCompletedRounds((prev) => new Set([...prev, data.round]))
          break
        }

        case 'agent_error':
          setStreamError(data.error)
          setStreamingMessage(null)
          setLoadingMessage(null)
          es.close()
          break

        case 'loading_state':
          setLoadingMessage(data.message)
          break

        case 'conclusion_complete': {
          setTerminalState(data.terminal_state)
          setLoadingMessage(null)

          // Fetch the conclusion from the API.
          // The API route handles extracting originalJson/revisedJson based on
          // terminal state and returns a flat conclusion object with recommendation,
          // key_condition, unresolved_points, review_by fields.
          fetch(`/api/sessions/${sessionId}`)
            .then((res) => {
              if (!res.ok) throw new Error(`Failed to fetch session: ${res.status}`)
              return res.json()
            })
            .then((session: { conclusion?: Record<string, unknown> | null }) => {
              if (session.conclusion) {
                setConclusion(session.conclusion)
              } else {
                console.warn('⚠️ API returned no conclusion despite terminal state:', data.terminal_state)
              }
            })
            .catch((err) => {
              console.error('❌ Conclusion fetch failed:', err)
            })
          break
        }

        case 'done':
          es.close()
          break
      }
    }

    es.onerror = () => es.close()
    return () => es.close()
  }, [sessionId, isComplete])

  return {
    messages,
    round1HasPending,
    round1Ready,
    streamingMessage,
    loadingMessage,
    streamError,
    currentState,
    terminalState,
    conclusion,
    completedRounds
  }
}
