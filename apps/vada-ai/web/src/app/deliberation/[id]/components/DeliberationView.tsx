'use client'

import { AIACanvas } from '@atta/ui/canvas'
import { useDeliberation } from './useDeliberation'
import { Round } from './Round'
import { ConclusionPanel } from './ConclusionPanel'
import { ChatBubble } from './ChatBubble'

export function DeliberationView({ sessionId, question, agentRoles }: any) {
  const { feed, entries, activeAgent, streamingContent, currentState, terminalState } = useDeliberation(
    sessionId,
    question
  )

  // No forced auto-scroll - let user scroll naturally
  return (
    <AIACanvas particleCount={200} className='fixed inset-0 z-0'>
      <div className='relative z-10 w-full min-h-screen overflow-y-auto px-6 py-24 flex flex-col items-center'>
        <div className='w-full max-w-5xl space-y-24'>
          {feed.map((item) => (
            <div key={item.id} className='w-full'>
              {/* FIXED: User Prompt is now a ChatBubble */}
              {item.type === 'prompt' && (
                <ChatBubble variant='user' label='Inquiry'>
                  {item.content}
                </ChatBubble>
              )}

              {/* Vada System Message */}
              {item.type === 'system' && (
                <ChatBubble variant='vada' label='Vāda Protocol'>
                  {item.content}
                </ChatBubble>
              )}

              {/* The Round (Floating Ring) */}
              {item.type === 'round' && (
                <Round
                  roundNumber={item.roundNumber}
                  agents={agentRoles.map((r: string) => ({
                    role: r,
                    name: r.charAt(0).toUpperCase() + r.slice(1).replace('_', ' ')
                  }))}
                  entries={entries.filter((e: any) => e.round === item.roundNumber)}
                  activeAgent={activeAgent}
                  streamingContent={streamingContent}
                  isLive={currentState === `ROUND_${item.roundNumber}`}
                  currentState={currentState}
                />
              )}

              {/* Final Conclusion */}
              {item.type === 'conclusion' && terminalState && (
                <div className='pt-10'>
                  <ChatBubble variant='vada' label='Final Synthesis'>
                    <ConclusionPanel terminalState={terminalState} conclusion={null} />
                  </ChatBubble>
                </div>
              )}
            </div>
          ))}
          <div className='h-64' /> {/* Bottom breathing room */}
        </div>
      </div>
    </AIACanvas>
  )
}
