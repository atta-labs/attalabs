'use client'

import { useState } from 'react'
import { Button } from '@atta/ui'
import { cn } from '@atta/ui/lib/utils'
import type { TeamModelEntry } from '@/db/settings-queries'
import type { FaceStyle } from '@atta/ui/canvas'
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
}

export function SettingsClientPage({ initialApiKeys, initialTeamModels, initialFaceStyle }: SettingsClientPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>('api-keys')
  const [apiKeys, setApiKeys] = useState(initialApiKeys)
  const [teamModels, setTeamModels] = useState(initialTeamModels)
  const [faceStyle, setFaceStyle] = useState<FaceStyle>(initialFaceStyle)

  const configuredProviders = new Set(apiKeys.map((k) => k.provider))

  return (
    <div className='space-y-8'>
      {/* Tab bar */}
      <div className='flex items-center gap-0 border-b border-border/20'>
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            variant='ghost'
            size='sm'
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'h-auto rounded-none px-4 pb-3 pt-0 font-mono text-[10px] uppercase tracking-widest transition-colors hover:bg-transparent',
              activeTab === tab.id
                ? 'border-b-2 border-foreground text-foreground'
                : 'text-foreground/40 hover:text-foreground/70'
            )}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab panels */}
      {activeTab === 'api-keys' && (
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
      )}

      {activeTab === 'teams' && (
        <TeamsSection
          teamModels={teamModels}
          configuredProviders={configuredProviders}
          onModelChanged={(entry) => {
            setTeamModels((prev) => {
              const next = prev.filter((m) => !(m.teamId === entry.teamId && m.agentRole === entry.agentRole))
              return [...next, entry]
            })
          }}
        />
      )}

      {activeTab === 'agent-style' && <AgentStyleSection faceStyle={faceStyle} onFaceStyleChanged={setFaceStyle} />}
    </div>
  )
}
