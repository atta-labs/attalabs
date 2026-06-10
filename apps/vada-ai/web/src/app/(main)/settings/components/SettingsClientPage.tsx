'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger, Card, CardContent } from '@atta/ui/components'
import { AttaUserProfile, ProviderKeysSection, ApiKeysSection } from '@atta/ui/account'
import type { FaceStyle } from '@/components/agents'
import { AgentStyleSection } from './agent-style/AgentStyleSection'

type Tab = 'account' | 'vada-api-keys' | 'provider-keys' | 'agent-style'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'account', label: 'Account' },
  { id: 'vada-api-keys', label: 'Vāda API Keys' },
  { id: 'provider-keys', label: 'Provider API Keys' },
  { id: 'agent-style', label: 'Agent Style' }
]

interface SettingsClientPageProps {
  initialFaceStyle: FaceStyle
}

export function SettingsClientPage({ initialFaceStyle }: SettingsClientPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>('account')
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

      <TabsContent value='vada-api-keys'>
        <Card>
          <CardContent>
            <ApiKeysSection productLabel='Vāda' />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value='provider-keys'>
        <Card>
          <CardContent>
            <ProviderKeysSection />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value='agent-style'>
        <AgentStyleSection faceStyle={faceStyle} onFaceStyleChanged={setFaceStyle} />
      </TabsContent>
    </Tabs>
  )
}
