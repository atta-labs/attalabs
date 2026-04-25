'use client'

import { AIASphere } from '@atta/ui/canvas'
import { ModelIcon } from '@atta/ui'
import { VadaAgent } from '@/components/agents'
import { PrincipalBrain } from './PrincipalBrain'
import { useBrokeredScene } from './useBrokeredScene'

const LLM_SPHERES = [
  {
    id: 'brokered-claude' as const,
    model: 'claude-3-5-sonnet-20241022',
    color: 'hsl(28 90% 60%)',
    label: 'Claude',
    left: '17vw',
    top: '22vh'
  },
  {
    id: 'brokered-chatgpt' as const,
    model: 'gpt-4o',
    color: 'hsl(264 70% 65%)',
    label: 'ChatGPT',
    left: '23vw',
    top: '32vh'
  },
  {
    id: 'brokered-gemini' as const,
    model: 'gemini-pro',
    color: 'hsl(210 100% 60%)',
    label: 'Gemini',
    left: '15vw',
    top: '42vh'
  },
  { id: 'brokered-grok' as const, model: 'grok-1', color: 'hsl(0 0% 85%)', label: 'Grok', left: '21vw', top: '54vh' },
  {
    id: 'brokered-mistral' as const,
    model: 'mistral-7b-instruct',
    color: 'hsl(32 95% 58%)',
    label: 'Mistral',
    left: '18vw',
    top: '64vh'
  },
  {
    id: 'brokered-deepseek' as const,
    model: 'deepseek-chat',
    color: 'hsl(200 85% 58%)',
    label: 'DeepSeek',
    left: '24vw',
    top: '73vh'
  },
  {
    id: 'brokered-llama' as const,
    model: 'meta-llama-3.1-70b-instruct',
    color: 'hsl(217 89% 62%)',
    label: 'Llama',
    left: '16vw',
    top: '80vh'
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
      {/* Routing sphere at brain center — outgoing particles fire from here */}
      <div className='absolute -translate-x-1/2 -translate-y-1/2' style={{ left: '50vw', top: '50vh' }}>
        <AIASphere
          id='principal-brain'
          size='xs'
          color='hsl(185 85% 65%)'
          state='idle'
          showMatrix={false}
          visible={false}
        />
      </div>
      {/* Brain entry — incoming return particle arrives at left interior node (~x=-78 in SVG) */}
      <div className='absolute -translate-x-1/2 -translate-y-1/2' style={{ left: 'calc(50vw - 78px)', top: '50vh' }}>
        <AIASphere
          id='principal-brain-entry'
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
      {LLM_SPHERES.map(({ id, model, color, label, left, top }) => (
        <div key={id} className='absolute -translate-x-1/2 -translate-y-1/2' style={{ left, top }}>
          <AIASphere
            id={id}
            size={90}
            color={color}
            state={llmStates[id]}
            showMatrix={llmStates[id] !== 'idle'}
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
