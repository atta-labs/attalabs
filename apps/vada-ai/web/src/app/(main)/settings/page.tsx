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
    // `h-full` fills the parent layout's `flex-1` content slot exactly —
    // no calc against topbar/footer heights, no risk of the page being
    // slightly taller than available space. Inner container is a flex
    // column with `flex-1 min-h-0` so the Provider tab's card can claim
    // remaining height and scroll inside.
    <div className='h-full flex flex-col px-6 py-4'>
      <div className='mx-auto flex w-full min-h-0 max-w-4xl flex-1 flex-col gap-6'>
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
