export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { createProductClient, generateThemeCSS, getThemeById } from '@atta/cms'
import { notFound } from 'next/navigation'
import { EnvoyFlow } from '@/components/envoy/EnvoyFlow'
import { getUserByUsername } from '@/db/queries'
import { getGoogleFontsUrl } from '@atta/cms'
import { loadDecryptedKeys } from '@/lib/audit-key'

export default async function EnvoyPage({
  params,
  searchParams
}: {
  params: Promise<{ username: string }>
  searchParams: Promise<{ preview?: string }>
}) {
  const { username } = await params
  const { preview } = await searchParams
  const previewMode = preview === 'true'

  const user = await getUserByUsername(username)
  if (!user) notFound()

  // Resolve viewer identity once — used for both publish gate and audit gate
  const { userId } = await auth()
  const isOwner = userId !== null && userId === user.clerkId

  // Gate unpublished profiles — owner can preview, everyone else gets 404
  if (!user.isPublished && !isOwner) notFound()

  // Check if owner has a stored vendor key — gates the audit input. Task 3b:
  // ANY vendor key is now enough (was Anthropic-only). The audit dispatch
  // path picks the right model + vendor at runtime with auto-fallback.
  const ownerKeys = await loadDecryptedKeys(user.clerkId)
  const hasAnyKey = (ownerKeys?.configuredVendors.length ?? 0) > 0

  const profile = {
    name: user.name,
    title: user.title,
    github: user.githubHandle ?? undefined,
    linkedin: user.linkedinUrl ?? undefined,
    discord: user.discordHandle ?? undefined,
    summary: user.summary,
    stack: JSON.parse(user.stack) as string[],
    projects: JSON.parse(user.projects) as Array<{ title: string; description: string }>,
    experience: JSON.parse(user.experience) as Array<{
      company: string
      role: string
      period: string
      highlights: string[]
    }>,
    location: user.location ?? undefined,
    availability: user.availability ?? undefined,
    avatarUrl: user.avatarUrl ?? undefined,
    cvUrl: user.cvUrl ?? undefined
  }

  // Fetch theme from Sanity if user has one selected. D-060 moved uiTheme
  // documents out of Herald's own project into the central Attalabs project
  // — must resolve against createProductClient('attalabs'), not Herald's
  // own cmsClient (which no longer has any uiTheme docs to find).
  let themeCSS: string | null = null
  let fontsUrl: string | null = null
  if (user.themeId) {
    const attalabsClient = createProductClient('attalabs')
    const theme = await getThemeById(attalabsClient, user.themeId)
    if (theme) {
      const themeWithOverrides = {
        ...theme,
        typography: user.fontSans ? { ...theme.typography, fontSans: user.fontSans } : theme.typography
      }
      // Use generateThemeCSS (both light+dark with attribute selectors) so the per-user
      // theme wins the specificity battle against the global NextWebShell :root[data-theme="dark"] block.
      themeCSS = generateThemeCSS(themeWithOverrides)
      if (themeWithOverrides.typography) {
        fontsUrl = getGoogleFontsUrl(themeWithOverrides.typography)
      }
    }
  }

  return (
    <>
      {fontsUrl && (
        <>
          <link rel='preconnect' href='https://fonts.googleapis.com' />
          <link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin='anonymous' />
          <link rel='stylesheet' href={fontsUrl} />
        </>
      )}
      {themeCSS && <style dangerouslySetInnerHTML={{ __html: themeCSS }} />}
      <EnvoyFlow
        profile={profile}
        username={username}
        previewMode={previewMode}
        hasAnyKey={hasAnyKey}
        isOwner={isOwner}
        isPublished={user.isPublished}
      />
    </>
  )
}
