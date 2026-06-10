import { Text } from '@atta/ui/components'

export type AgentKey = 'strategist' | 'critic' | 'devils_advocate' | 'synthesizer'

export interface AgentCardData {
  agent: AgentKey
  name: string
  role: string
  voice?: string
}

export function AgentCard({ agent, name, role, voice }: AgentCardData) {
  return (
    <div
      data-agent={agent}
      className='flex flex-col gap-2 rounded-md border border-border border-l-4 bg-card/40 p-5 [border-left-color:var(--agent-color)]'
    >
      <Text as='small' className='font-mono uppercase tracking-widest text-xs text-foreground'>
        {name}
      </Text>
      <Text as='p' className='text-sm text-muted-foreground'>
        {role}
      </Text>
      {voice && (
        <Text as='p' className='italic text-xs text-muted-foreground/80'>
          &ldquo;{voice}&rdquo;
        </Text>
      )}
    </div>
  )
}
