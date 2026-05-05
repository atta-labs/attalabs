'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger, Card, CardContent } from '@atta/ui'
import { AttaUserProfile, ProviderKeysSection, ApiKeysSection } from '@atta/ui/account'
import type { FaceStyle } from '@/components/agents'
import { AgentStyleSection } from './agent-style/AgentStyleSection'

type Tab = 'account' | 'api-keys' | 'agent-style'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'account', label: 'Account' },
  { id: 'api-keys', label: 'API Keys' },
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

      <TabsContent value='api-keys'>
        <Card>
          <CardContent className='pt-6'>
            <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
              <ProviderKeysSection />
              <ApiKeysSection productLabel='Vāda' />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value='agent-style'>
        <AgentStyleSection faceStyle={faceStyle} onFaceStyleChanged={setFaceStyle} />
      </TabsContent>
    </Tabs>
  )
}
