'use client'

import { AIASphere } from '@atta/ui/canvas'
import { ModelIcon } from '@atta/ui'
import { VadaAgent } from '@/components/agents'
import { PrincipalBrain } from './PrincipalBrain'

import { useBrokeredScene } from './useBrokeredScene'

// Vertical column: all aligned at same x, evenly spaced top-to-bottom
const LLM_SPHERES = [
  {
    id: 'brokered-claude' as const,
    model: 'claude-3-5-sonnet-20241022',
    color: 'hsl(28 90% 60%)',
    label: 'Claude',
    left: '14vw',
    top: '11vh'
  },
  {
    id: 'brokered-chatgpt' as const,
    model: 'gpt-4o',
    color: 'hsl(264 70% 65%)',
    label: 'ChatGPT',
    left: '14vw',
    top: '23vh'
  },
  {
    id: 'brokered-gemini' as const,
    model: 'gemini-pro',
    color: 'hsl(210 100% 60%)',
    label: 'Gemini',
    left: '14vw',
    top: '35vh'
  },
  { id: 'brokered-grok' as const, model: 'grok-1', color: 'hsl(0 0% 85%)', label: 'Grok', left: '14vw', top: '47vh' },
  {
    id: 'brokered-mistral' as const,
    model: 'mistral-7b-instruct',
    color: 'hsl(32 95% 58%)',
    label: 'Mistral',
    left: '14vw',
    top: '59vh'
  },
  {
    id: 'brokered-deepseek' as const,
    model: 'deepseek-chat',
    color: 'hsl(200 85% 58%)',
    label: 'DeepSeek',
    left: '14vw',
    top: '71vh'
  },
  {
    id: 'brokered-llama' as const,
    model: 'meta-llama-3.1-70b-instruct',
    color: 'hsl(217 89% 62%)',
    label: 'Llama',
    left: '14vw',
    top: '83vh'
  }
]

export function BrokeredScene() {
  const { llmStates, strategistState, brainActive } = useBrokeredScene()

  return (
    <div className='pointer-events-none fixed inset-0'>
      {/* Principal brain — center divider */}
      <div className='absolute -translate-x-1/2 -translate-y-1/2' style={{ left: '50vw', top: '50vh' }}>
        <PrincipalBrain leftActive={brainActive} />
      </div>
      {/* Brain routing sphere — sits at interior-left node (SVG x=-78); particles depart from and arrive here */}
      <div className='absolute -translate-x-1/2 -translate-y-1/2' style={{ left: 'calc(50vw - 78px)', top: '50vh' }}>
        <AIASphere
          id='principal-brain'
          size='xs'
          color='hsl(185 85% 65%)'
          state='idle'
          showMatrix={false}
          visible={false}
        />
      </div>

      {/* Strategist — activates only when brain particle arrives */}
      <div className='absolute -translate-x-1/2 -translate-y-1/2' style={{ left: '35vw', top: '50vh' }}>
        <VadaAgent
          id='brokered-strategist'
          name='Strategist'
          size={72}
          state={strategistState}
          showMatrix={strategistState === 'speaking'}
          noLabel
        />
      </div>

      {/* LLM spheres — activate only when their particle arrives */}
      {LLM_SPHERES.map(({ id, model, color, label, left, top }, idx) => (
        <div key={id} className='absolute -translate-x-1/2 -translate-y-1/2' style={{ left, top }}>
          <AIASphere
            id={id}
            size={90}
            color={color}
            state={llmStates[id]}
            showMatrix={idx === LLM_SPHERES.length - 1 && llmStates[id] !== 'idle'}
            label={label}
            labelPlacement='absolute'
            labelPosition='bottom'
          >
            <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
              <ModelIcon model={model} size={62} type='avatar' />
            </div>
          </AIASphere>
        </div>
      ))}
    </div>
  )
}
