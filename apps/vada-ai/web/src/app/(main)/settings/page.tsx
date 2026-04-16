import { auth } from '@atta/auth/hooks'
import { Heading, Text } from '@atta/ui/shared'
import { redirect } from 'next/navigation'
import { getOrCreateUser } from '@/db/queries'
import { getUserApiKeys, getUserSettings, getUserTeamModels } from '@/db/settings-queries'
import { SettingsClientPage } from './components/SettingsClientPage'

export default async function SettingsPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const user = await getOrCreateUser(clerkId, '')
  const [apiKeys, teamModels, settings] = await Promise.all([
    getUserApiKeys(user.id),
    getUserTeamModels(user.id),
    getUserSettings(user.id)
  ])

  return (
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
          initialApiKeys={apiKeys}
          initialTeamModels={teamModels}
          initialFaceStyle={settings.faceStyle}
        />
      </div>
    </div>
  )
}
