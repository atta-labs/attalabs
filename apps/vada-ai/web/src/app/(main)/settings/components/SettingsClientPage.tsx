'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@atta/ui'
import { AttaUserProfile } from '@atta/ui/account'
import type { TeamModelEntry } from '@/db/settings-queries'
import type { FaceStyle } from '@/components/agents'
import type { TeamId } from '@/lib/teams-metadata'
import { AgentStyleSection } from './agent-style/AgentStyleSection'
import { TeamsSection } from './teams/TeamsSection'

type Tab = 'account' | 'teams' | 'agent-style'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'account', label: 'Account' },
  { id: 'teams', label: 'Teams' },
  { id: 'agent-style', label: 'Agent Style' }
]

interface SettingsClientPageProps {
  initialTeamModels: TeamModelEntry[]
  initialFaceStyle: FaceStyle
  teams: Array<{ id: TeamId; name: string; agents: string[] }>
}

export function SettingsClientPage({ initialTeamModels, initialFaceStyle, teams }: SettingsClientPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>('account')
  const [teamModels, setTeamModels] = useState(initialTeamModels)
  const [faceStyle, setFaceStyle] = useState<FaceStyle>(initialFaceStyle)

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as Tab)}>
      <TabsList>
        {TABS.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value='account'>
        <AttaUserProfile />
      </TabsContent>

      <TabsContent value='teams'>
        <TeamsSection
          teams={teams}
          teamModels={teamModels}
          onModelChanged={(entry) => {
            setTeamModels((prev) => {
              const next = prev.filter((m) => !(m.teamId === entry.teamId && m.agentRole === entry.agentRole))
              return [...next, entry]
            })
          }}
        />
      </TabsContent>

      <TabsContent value='agent-style'>
        <AgentStyleSection faceStyle={faceStyle} onFaceStyleChanged={setFaceStyle} />
      </TabsContent>
    </Tabs>
  )
}
