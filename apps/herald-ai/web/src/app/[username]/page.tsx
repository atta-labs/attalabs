export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { cmsClient, generateThemeCSS, getThemeById } from '@atta/cms'
import { notFound } from 'next/navigation'
import { EnvoyFlow } from '@/components/envoy/EnvoyFlow'
import type { UILibrary } from '@atta/ui/lib/library-loader'
import { LibraryProvider } from '@atta/ui/lib/library-provider'
import { PreviewThemeListener } from '@atta/ui/lib/preview-theme-listener'
import { getUserByUsername } from '@/db/queries'
import { getGoogleFontsUrl } from '@atta/cms'

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

  // Gate unpublished profiles — owner can preview, everyone else gets 404
  if (!user.isPublished) {
    const { userId } = await auth()
    if (userId !== user.clerkId) notFound()
  }

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

  // Fetch theme from Sanity if user has one selected
  let themeCSS: string | null = null
  let fontsUrl: string | null = null
  if (user.themeId) {
    const theme = await getThemeById(cmsClient, user.themeId)
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

  const userLibrary = (user.library ?? 'basic') as UILibrary

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
      <PreviewThemeListener />
      <LibraryProvider library={userLibrary}>
        <EnvoyFlow profile={profile} username={username} previewMode={previewMode} />
      </LibraryProvider>
    </>
  )
}
