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
    // `flex-1 min-h-0 flex-col` lets the Tabs root participate in the parent
    // flex stack so the Provider tab content can claim remaining height
    // and the inner provider list (overflow-y-auto) can actually scroll
    // instead of pushing the page.
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as Tab)}
      className='flex min-h-0 flex-1 flex-col'
    >
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

      {/* `p-6` on CardContent gives uniform 24px padding on all four sides —
          the canonical CardContent ships `px-6` only and relies on Card's
          baked `py-6` for the vertical axis, which combined was reading as
          flush-to-top inside the Tabs layout. Explicit `p-6` here removes
          any ambiguity. Card's outer `py-0` neutralizes its own vertical
          padding so we don't double-stack. */}
      <TabsContent value='vada-api-keys'>
        <Card className='py-0'>
          <CardContent className='p-6'>
            <ApiKeysSection productLabel='Vāda' />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Provider keys tab: card fills remaining viewport and scrolls inside
          itself. `h-full overflow-y-auto` on Card is the scroll region — the
          whole card content (title + description + provider list) scrolls
          together when there are more providers than fit. No inner-list
          flex hacks; ProviderKeysSection renders unchanged. */}
      <TabsContent value='provider-keys' className='flex-1 min-h-0'>
        <Card className='h-full overflow-y-auto py-0'>
          <CardContent className='p-6'>
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
