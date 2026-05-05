import { auth } from '@atta/auth/hooks'
import { CatalogProvider, getCatalog } from '@atta/models'
import { listPublicSpecs } from '@atta/engine'
import { Heading, Text } from '@atta/ui/shared'
import { getOrCreateUser } from '@/db/queries'
import { getUserSettings, getUserTeamModels } from '@/db/settings-queries'
import { SPEC_ID_TO_TEAM_ID } from '@/lib/teams-metadata'
import { SettingsClientPage } from './components/SettingsClientPage'

export default async function SettingsPage() {
  const { userId: clerkId } = await auth()

  await getOrCreateUser(clerkId!, '')
  const [teamModels, settings, catalog] = await Promise.all([
    getUserTeamModels(clerkId!),
    getUserSettings(clerkId!),
    getCatalog()
  ])
  const specs = listPublicSpecs()
  const teams = specs
    .filter((s) => SPEC_ID_TO_TEAM_ID[s.id] !== undefined)
    .map((s) => ({
      id: SPEC_ID_TO_TEAM_ID[s.id]!,
      name: s.displayName,
      agents: s.flow?.rounds?.agents ?? []
    }))

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
              Manage your account and configure your intelligence layer — API keys, model assignments per team, and
              agent aesthetics.
            </Text>
          </div>

          <SettingsClientPage initialTeamModels={teamModels} initialFaceStyle={settings.faceStyle} teams={teams} />
        </div>
      </div>
    </CatalogProvider>
  )
}
