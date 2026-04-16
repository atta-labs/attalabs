import type { ColorScheme } from '@atta/cms'
import { cmsClient, generateThemeCSSForScheme, getThemeById } from '@atta/cms'
import { notFound } from 'next/navigation'
import { EnvoyFlow } from '@/components/envoy/EnvoyFlow'
import { EnvoyFooter } from '@/components/envoy/EnvoyFooter'
import type { UILibrary } from '@atta/ui/lib/library-loader'
import { LibraryProvider } from '@atta/ui/lib/library-provider'
import { PreviewThemeListener } from '@/components/theme/PreviewThemeListener'
import { getUserByUsername } from '@/db/queries'
import { getGoogleFontsUrl } from '@atta/cms'

export default async function EnvoyPage({
  params,
  searchParams
}: {
  params: Promise<{ username: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { username } = await params
  const { preview } = await searchParams
  const isPreview = preview === 'true'

  const user = await getUserByUsername(username)
  if (!user) notFound()

  const profile = {
    name: user.name,
    title: user.title,
    github: user.githubHandle ?? undefined,
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
    availability: user.availability ?? undefined
  }

  // Fetch theme from Sanity if user has one selected
  let themeCSS: string | null = null
  let fontsUrl: string | null = null
  if (user.themeId) {
    const theme = await getThemeById(cmsClient, user.themeId)
    if (theme) {
      // Apply per-user font override if set
      const themeWithOverrides = {
        ...theme,
        typography: user.fontSans ? { ...theme.typography, fontSans: user.fontSans } : theme.typography
      }
      const colorScheme = (user.colorScheme as ColorScheme) ?? 'dark'
      themeCSS = generateThemeCSSForScheme(themeWithOverrides, colorScheme)
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
        <main className='flex-1'>
          <EnvoyFlow profile={profile} />
        </main>
        {!isPreview && <EnvoyFooter />}
      </LibraryProvider>
    </>
  )
}
