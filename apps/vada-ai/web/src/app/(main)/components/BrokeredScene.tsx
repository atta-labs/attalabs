'use client'

import { AIASphere } from '@atta/ui/canvas'
import { ModelIcon } from '@atta/ui'
import { VadaAgent } from '@/components/agents'
import { useBrokeredScene } from './useBrokeredScene'

// LLM brand colors — explicit HSL values required for canvas particle visibility.
// CSS variables like --accent resolve to near-black in Vāda dark theme and are invisible.
const LLM_SPHERES = [
  {
    id: 'brokered-claude' as const,
    model: 'claude-3-5-sonnet-20241022',
    color: 'hsl(265 89% 78%)',
    label: 'Claude',
    top: '28vh'
  },
  {
    id: 'brokered-chatgpt' as const,
    model: 'gpt-4o',
    color: 'hsl(152 69% 54%)',
    label: 'ChatGPT',
    top: '41vh'
  },
  {
    id: 'brokered-gemini' as const,
    model: 'gemini-pro',
    color: 'hsl(210 100% 60%)',
    label: 'Gemini',
    top: '59vh'
  },
  {
    id: 'brokered-grok' as const,
    model: 'grok-1',
    color: 'hsl(0 0% 85%)',
    label: 'Grok',
    top: '72vh'
  }
]

export function BrokeredScene() {
  const { llmStates } = useBrokeredScene()

  return (
    <div className='pointer-events-none fixed inset-0'>
      {/* Strategist — center of left half */}
      <div className='absolute -translate-x-1/2 -translate-y-1/2' style={{ left: '25vw', top: '50vh' }}>
        <VadaAgent id='brokered-strategist' name='Strategist' size='md' state='speaking' showMatrix noLabel />
      </div>

      {/* LLM spheres — stacked vertically at left edge */}
      {LLM_SPHERES.map(({ id, model, color, label, top }) => (
        <div key={id} className='absolute -translate-x-1/2 -translate-y-1/2' style={{ left: '8vw', top }}>
          <AIASphere
            id={id}
            size='sm'
            color={color}
            state={llmStates[id] ?? 'idle'}
            showMatrix={llmStates[id] === 'speaking'}
            label={label}
            labelPosition='right'
          >
            <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
              <ModelIcon model={model} size={24} type='avatar' />
            </div>
          </AIASphere>
        </div>
      ))}
    </div>
  )
}
