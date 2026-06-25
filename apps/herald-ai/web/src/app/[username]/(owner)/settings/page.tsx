import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { CatalogProvider, getCatalog } from '@atta/models'
import { ProfileEditor } from '@/components/portal/ProfileEditor'
import { PublishToggle } from '@/components/portal/PublishToggle'
import { getUserByClerkId } from '@/db/queries'
import { loadDecryptedKeys, resolveAuditSelection } from '@/lib/audit-key'

const VALID_TABS = ['profile', 'experience', 'connections', 'api-keys', 'account'] as const
type ValidTab = (typeof VALID_TABS)[number]

export default async function CandidateSettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await getUserByClerkId(userId)
  if (!user?.onboardingComplete) redirect('/onboarding')

  const { tab } = await searchParams
  const defaultTab: ValidTab = VALID_TABS.includes(tab as ValidTab) ? (tab as ValidTab) : 'profile'

  // Task 3b: surface the full vendor-key state to the UI, not just an
  // Anthropic-only boolean. The selector in the API Keys tab needs the
  // configured-vendors list to filter the model picker; the publish gate
  // needs `hasAnyKey` so users with a non-Anthropic key (e.g. only OpenAI)
  // can publish too.
  const decrypted = await loadDecryptedKeys(userId)
  const configuredVendors = decrypted?.configuredVendors ?? []
  const hasAnyKey = configuredVendors.length > 0

  // The user's effective audit-model selection. The dispatch path runs this
  // same resolution at audit time (with auto-fallback), so the UI shows the
  // model the next audit will actually use — not a stale row in the DB.
  const auditSelection = decrypted ? await resolveAuditSelection(userId, decrypted.keys) : null

  // Catalog is fetched at SSR and provided via context to the picker.
  const catalog = await getCatalog()

  const profile = {
    name: user.name,
    title: user.title,
    location: user.location ?? '',
    availability: user.availability ?? '',
    github: user.githubHandle ?? '',
    linkedin: user.linkedinUrl ?? '',
    discord: user.discordHandle ?? '',
    summary: user.summary,
    stack: JSON.parse(user.stack) as string[],
    cvUrl: user.cvUrl ?? null,
    avatarUrl: user.avatarUrl ?? null,
    isPublished: user.isPublished,
    hasAnyKey,
    configuredVendors,
    auditSelection
  }

  return (
    // CatalogProvider renders a wrapping <div className={className}> — without
    // h-full here, the inner overflow-y-auto container had no bounded height,
    // and (app)/layout.tsx's `<main flex-1 overflow-hidden>` clipped content
    // with no scrollable element in between (api-keys tab list got cut off).
    <CatalogProvider catalog={catalog} className='h-full overflow-y-auto'>
      <div className='mx-auto max-w-[700px] px-6 py-8'>
        <div className='mb-8 flex items-center justify-between gap-4'>
          <div>
            <h1 className='font-serif text-xl tracking-tight'>Settings</h1>
            <p className='mt-1 font-mono text-xs text-muted-foreground'>Profile, API keys, and social connections.</p>
          </div>
          <PublishToggle initialIsPublished={profile.isPublished} hasAnyKey={hasAnyKey} />
        </div>
        <ProfileEditor profile={profile} defaultTab={defaultTab} />
      </div>
    </CatalogProvider>
  )
}
