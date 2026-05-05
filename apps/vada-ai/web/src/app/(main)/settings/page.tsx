import { auth } from '@atta/auth/hooks'
import { Heading, Text } from '@atta/ui/shared'
import { getOrCreateUser } from '@/db/queries'
import { getUserSettings } from '@/db/settings-queries'
import { SettingsClientPage } from './components/SettingsClientPage'

export default async function SettingsPage() {
  const { userId: clerkId } = await auth()

  await getOrCreateUser(clerkId!, '')
  const settings = await getUserSettings(clerkId!)

  return (
    <div className='px-6 py-4'>
      <div className='mx-auto w-full max-w-4xl space-y-6'>
        <div className='space-y-2'>
          <span className='font-mono text-xs text-muted-foreground'>Configuration</span>
          <Heading level={1} className='font-serif text-4xl font-light leading-tight'>
            Settings
          </Heading>
          <Text as='p' muted className='leading-relaxed'>
            Manage your account, API keys, and agent aesthetics.
          </Text>
        </div>

        <SettingsClientPage initialFaceStyle={settings.faceStyle} />
      </div>
    </div>
  )
}
