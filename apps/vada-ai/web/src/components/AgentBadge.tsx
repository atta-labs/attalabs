import { Badge } from '@atta/ui'

const AGENT_COLORS: Record<string, string> = {
  strategist: '#4A9EDB',
  critic: '#DB4A4A',
  devils_advocate: '#9B59B6',
  synthesizer: '#C8A84B',
  researcher: '#2ECC71',
  operator: '#E67E22'
}

export function AgentBadge({ agentRole, name }: { agentRole: string; name: string }) {
  const color = AGENT_COLORS[agentRole] ?? 'var(--muted-foreground)'
  return (
    <Badge variant='outline' className='inline-flex items-center gap-1.5' style={{ borderColor: color, color }}>
      <span className='h-1.5 w-1.5 rounded-full' style={{ background: color }} />
      {name}
    </Badge>
  )
}
