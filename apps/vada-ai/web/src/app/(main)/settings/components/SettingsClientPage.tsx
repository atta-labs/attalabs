'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@atta/ui'
import type { TeamModelEntry } from '@/db/settings-queries'
import type { FaceStyle } from '@/components/agents'
import type { TeamId } from '@/lib/teams-metadata'
import { ApiKeysSection } from './api-keys/ApiKeysSection'
import { AgentStyleSection } from './agent-style/AgentStyleSection'
import { TeamsSection } from './teams/TeamsSection'

type Tab = 'api-keys' | 'teams' | 'agent-style'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'api-keys', label: 'API Keys' },
  { id: 'teams', label: 'Teams' },
  { id: 'agent-style', label: 'Agent Style' }
]

interface SettingsClientPageProps {
  initialApiKeys: Array<{ provider: string; keyHint: string }>
  initialTeamModels: TeamModelEntry[]
  initialFaceStyle: FaceStyle
  teams: Array<{ id: TeamId; name: string; agents: string[] }>
}

export function SettingsClientPage({
  initialApiKeys,
  initialTeamModels,
  initialFaceStyle,
  teams
}: SettingsClientPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>('api-keys')
  const [apiKeys, setApiKeys] = useState(initialApiKeys)
  const [teamModels, setTeamModels] = useState(initialTeamModels)
  const [faceStyle, setFaceStyle] = useState<FaceStyle>(initialFaceStyle)

  const configuredProviders = new Set(apiKeys.map((k) => k.provider))

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as Tab)}>
      <TabsList>
        {TABS.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value='api-keys'>
        <ApiKeysSection
          apiKeys={apiKeys}
          onKeyAdded={(provider, keyHint) => {
            setApiKeys((prev) => {
              const next = prev.filter((k) => k.provider !== provider)
              return [...next, { provider, keyHint }]
            })
          }}
          onKeyRemoved={(provider) => {
            setApiKeys((prev) => prev.filter((k) => k.provider !== provider))
          }}
        />
      </TabsContent>

      <TabsContent value='teams'>
        <TeamsSection
          teams={teams}
          teamModels={teamModels}
          configuredProviders={configuredProviders}
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
