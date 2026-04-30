import { AgentCard, type AgentCardData } from './AgentCard'

interface AgentGridProps {
  agents: AgentCardData[]
}

export function AgentGrid({ agents }: AgentGridProps) {
  return (
    <div className='grid gap-4 sm:grid-cols-2'>
      {agents.map((a) => (
        <AgentCard key={a.agent} {...a} />
      ))}
    </div>
  )
}
