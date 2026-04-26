import { auth } from '@atta/auth/hooks'
import { CatalogProvider, getCatalog } from '@atta/models'
import { listPublicSpecs } from '@atta/engine'
import { Heading, Text } from '@atta/ui/shared'
import { Separator } from '@atta/ui'
import { redirect } from 'next/navigation'
import { getOrCreateUser } from '@/db/queries'
import { getUserSettings, getUserTeamModels } from '@/db/settings-queries'
import { SPEC_ID_TO_TEAM_ID } from '@/lib/teams-metadata'
import { CopyButton } from '@/app/(main)/brokered/mcp/components/CopyButton'
import { SettingsClientPage } from './components/SettingsClientPage'
import { NextLink } from '@atta/ui/lib/next-link'

export default async function SettingsPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/?signin=1')

  const user = await getOrCreateUser(clerkId, '')
  const [teamModels, settings, catalog] = await Promise.all([
    getUserTeamModels(user.id),
    getUserSettings(user.id),
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
            teams={teams}
          />

          <Separator className='opacity-20' />

          <div className='space-y-4'>
            <div className='space-y-1'>
              <Text as='p' className='font-medium'>
                Brokered Dashboard Access
              </Text>
              <Text as='p' muted className='text-sm'>
                Set this as <code className='rounded bg-muted px-1 font-mono text-xs'>VADA_USER_ID</code> in your MCP
                server config to link consultations to your account.
              </Text>
            </div>
            <div className='flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2'>
              <code className='flex-1 font-mono text-xs text-foreground'>{clerkId}</code>
              <CopyButton text={clerkId} />
            </div>
            <NextLink href='/brokered/mcp' variant='prose' className='text-sm'>
              MCP install guide →
            </NextLink>
          </div>
        </div>
      </div>
    </CatalogProvider>
  )
}
