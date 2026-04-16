import { Text } from '@atta/ui/shared'
import { TEAM_LIST } from '@atta/agents'
import type { TeamModelEntry } from '@/db/settings-queries'
import { TeamAccordionItem } from './TeamAccordionItem'

interface TeamsSectionProps {
  teamModels: TeamModelEntry[]
  configuredProviders: Set<string>
  onModelChanged: (entry: TeamModelEntry) => void
}

export function TeamsSection({ teamModels, configuredProviders, onModelChanged }: TeamsSectionProps) {
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
        {TEAM_LIST.map((team) => (
          <TeamAccordionItem
            key={team.id}
            team={team}
            teamModels={teamModels}
            configuredProviders={configuredProviders}
            onModelChanged={onModelChanged}
          />
        ))}
      </div>
    </div>
  )
}
