import { Text } from '@atta/ui/shared'
import type { TeamId } from '@/lib/teams-metadata'
import type { TeamModelEntry } from '@/db/settings-queries'
import { TeamAccordionItem } from './TeamAccordionItem'

interface TeamsSectionProps {
  teams: Array<{ id: TeamId; name: string; agents: string[] }>
  teamModels: TeamModelEntry[]
  onModelChanged: (entry: TeamModelEntry) => void
}

export function TeamsSection({ teams, teamModels, onModelChanged }: TeamsSectionProps) {
  return (
    <div className='space-y-4'>
      <div className='space-y-1'>
        <Text as='p' className='font-mono text-[10px] uppercase tracking-widest text-foreground/50'>
          Teams
        </Text>
        <Text as='p' size='sm' muted>
          Set which model each agent uses per team. Defaults to the team&apos;s configured provider if unset.
        </Text>
      </div>

      <div>
        {teams.map((team) => (
          <TeamAccordionItem key={team.id} team={team} teamModels={teamModels} onModelChanged={onModelChanged} />
        ))}
      </div>
    </div>
  )
}
