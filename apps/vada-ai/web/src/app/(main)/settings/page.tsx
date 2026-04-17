import { auth } from '@atta/auth/hooks'
import { CatalogProvider, getCatalog } from '@atta/models'
import { Heading, Text } from '@atta/ui/shared'
import { redirect } from 'next/navigation'
import { getOrCreateUser } from '@/db/queries'
import { getUserSettings, getUserTeamModels } from '@/db/settings-queries'
import { SettingsClientPage } from './components/SettingsClientPage'

export default async function SettingsPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/?signin=1')

  const user = await getOrCreateUser(clerkId, '')
  const [teamModels, settings, catalog] = await Promise.all([
    getUserTeamModels(user.id),
    getUserSettings(user.id),
    getCatalog()
  ])

  // API keys live in the browser (passkey-encrypted IndexedDB or in-memory).
  // SettingsClientPage reads them via useIdentity(); initialApiKeys stays [].
  return (
    <CatalogProvider catalog={catalog}>
      <div className='px-6 py-4'>
        <div className='mx-auto w-full max-w-2xl space-y-6'>
          <div className='space-y-2'>
            <span className='font-mono text-xs text-muted-foreground'>Configuration</span>
            <Heading level={1} className='font-serif text-4xl font-light leading-tight'>
              Settings
            </Heading>
            <Text as='p' muted className='leading-relaxed'>
              Configure your intelligence layer — API keys, model assignments per team, and agent aesthetics.
            </Text>
          </div>

          <SettingsClientPage
            initialApiKeys={[]}
            initialTeamModels={teamModels}
            initialFaceStyle={settings.faceStyle}
          />
        </div>
      </div>
    </CatalogProvider>
  )
}
