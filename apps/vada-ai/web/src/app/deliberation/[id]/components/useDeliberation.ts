import { useState, useEffect } from 'react'
import type { SSEEvent } from '@/schemas'

export function useDeliberation(sessionId: string, initialQuestion: string) {
  const [feed, setFeed] = useState<any[]>([{ id: 'p1', type: 'prompt', content: initialQuestion }])
  const [entries, setEntries] = useState<any[]>([])
  const [activeAgent, setActiveAgent] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const [currentState, setCurrentState] = useState('PENDING')
  const [terminalState, setTerminalState] = useState<string | null>(null)

  useEffect(() => {
    const eventSource = new EventSource(`/api/deliberation/${sessionId}/stream`)

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data) as SSEEvent

      switch (data.type) {
        case 'state_change': {
          setCurrentState(data.state)
          const roundNum = data.state.split('_')[1]
          if (roundNum) {
            setFeed((prev) => [
              ...prev,
              { id: `sys-${data.state}`, type: 'system', content: `Vāda Protocol: Round ${roundNum} Initiated` },
              { id: `round-${roundNum}`, type: 'round', roundNumber: Number.parseInt(roundNum, 10) }
            ])
          }
          break
        }

        case 'agent_start':
          setActiveAgent(data.agent)
          setStreamingContent('')
          break

        case 'agent_token':
          setStreamingContent((prev) => prev + data.token)
          break

        case 'agent_complete':
          setEntries((prev) => [...prev, { agent: data.agent, content: data.content, round: data.round }])
          setActiveAgent(null)
          break

        case 'conclusion_complete':
          setTerminalState(data.terminal_state)
          setFeed((prev) => [...prev, { id: 'final', type: 'conclusion', terminalState: data.terminal_state }])
          break

        case 'done':
          eventSource.close()
          break
      }
    }

    eventSource.onerror = () => eventSource.close()
    return () => eventSource.close()
  }, [sessionId])

  return { feed, entries, activeAgent, streamingContent, currentState, terminalState }
}
