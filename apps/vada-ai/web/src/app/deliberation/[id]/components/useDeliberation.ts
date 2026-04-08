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
        id: `${e.round}-${config.role}`,
        agent: e.agent,
        agentRole: config.role,
        round: e.round,
        content: text,
        state: 'complete' as const,
        replyTarget
      }
    })
  )

  const [round1Buffer, setRound1Buffer] = useState<DeliberationMessage[]>([])
  const [round1Ready, setRound1Ready] = useState<boolean>(() => initialEntries.some((e) => e.round === 1))

  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null)
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null)
  const [currentState, setCurrentState] = useState(initialState)
  const [terminalState, setTerminalState] = useState<string | null>(null)
  const [conclusion] = useState<Record<string, unknown> | null>(initialConclusion)

  const rawStreamRef = useRef('')

  useEffect(() => {
    if (isComplete) return

    const es = new EventSource(`/api/deliberation/${sessionId}/stream`)

    const flushRound1 = (buf: DeliberationMessage[]) => {
      if (buf.length === 0) return
      setMessages((prev) => [...prev, ...buf])
      setRound1Ready(true)
    }

    es.onmessage = (event) => {
      const data = JSON.parse(event.data as string) as SSEEvent

      switch (data.type) {
        case 'state_change': {
          setCurrentState(data.state)
          setLoadingMessage(null)
          if (data.state !== 'ROUND_1') {
            setRound1Buffer((buf) => {
              flushRound1(buf)
              return []
            })
          }
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
          const { text, replyTarget } = parseContent(data.content)
          const msg: DeliberationMessage = {
            id: `${data.round}-${config.role}`,
            agent: data.agent,
            agentRole: config.role,
            round: data.round,
            content: text,
            state: 'complete',
            replyTarget
          }
          setStreamingMessage(null)
          rawStreamRef.current = ''
          if (data.round === 1) {
            setRound1Buffer((prev) => [...prev, msg])
          } else {
            setMessages((prev) => [...prev, msg])
          }
          break
        }

        case 'round_complete': {
          if (data.round === 1) {
            setRound1Buffer((buf) => {
              flushRound1(buf)
              return []
            })
          }
          break
        }

        case 'loading_state':
          setLoadingMessage(data.message)
          break

        case 'conclusion_complete':
          setTerminalState(data.terminal_state)
          break

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
    round1Buffer,
    round1Ready,
    streamingMessage,
    loadingMessage,
    currentState,
    terminalState,
    conclusion
  }
}
