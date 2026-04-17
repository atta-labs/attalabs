import { Text } from '@atta/ui'

type AgentKey = 'strategist' | 'critic' | 'devils_advocate' | 'synthesizer'

interface AgentSpec {
  agent: AgentKey
  name: string
  role: string
  voice: string
}

const AGENTS: AgentSpec[] = [
  {
    agent: 'strategist',
    name: 'Strategist',
    role: 'Maps the landscape.',
    voice: 'Maps the landscape. Here is the map.'
  },
  {
    agent: 'critic',
    name: 'Critic',
    role: 'Finds what is wrong.',
    voice: 'Finds what is wrong. Here is where the map is wrong.'
  },
  {
    agent: 'devils_advocate',
    name: "Devil's Advocate",
    role: 'Rejects the frame.',
    voice: 'Rejects the frame. We should not be making a map at all.'
  },
  {
    agent: 'synthesizer',
    name: 'Synthesizer',
    role: 'Draws threads together.',
    voice: 'Draws threads together. Here is what we know, and here is what we broke.'
  }
]

export function AgentGrid() {
  return (
    <div className='grid gap-4 sm:grid-cols-2'>
      {AGENTS.map(({ agent, name, role, voice }) => (
        <div
          key={agent}
          data-agent={agent}
          className='flex flex-col gap-2 rounded-md border border-border border-l-4 bg-card/40 p-5 [border-left-color:var(--agent-color)]'
        >
          <Text as='small' className='font-mono uppercase tracking-widest text-xs text-foreground'>
            {name}
          </Text>
          <Text as='p' className='text-sm text-muted-foreground'>
            {role}
          </Text>
          <Text as='p' className='italic text-xs text-muted-foreground/80'>
            &ldquo;{voice}&rdquo;
          </Text>
        </div>
      ))}
    </div>
  )
}
