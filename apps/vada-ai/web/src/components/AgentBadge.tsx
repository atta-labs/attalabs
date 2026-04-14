import { Badge } from '@atta/ui'
import { AGENT_COLOR_BY_ROLE } from '@/lib/agent-theme'

export function AgentBadge({ agentRole, name }: { agentRole: string; name: string }) {
  const color = AGENT_COLOR_BY_ROLE[agentRole] ?? 'var(--muted-foreground)'
  return (
    <Badge variant='outline' className='inline-flex items-center gap-1.5' style={{ borderColor: color, color }}>
      <span className='h-1.5 w-1.5 rounded-full' style={{ background: color }} />
      {name}
    </Badge>
  )
}
