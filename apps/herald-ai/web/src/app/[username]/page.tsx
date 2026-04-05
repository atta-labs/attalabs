import type { ColorScheme } from '@herald/cms'
import { cmsClient, generateThemeCSSForScheme, getThemeById } from '@herald/cms'
import { notFound } from 'next/navigation'
import { EnvoyFlow } from '@/components/envoy/EnvoyFlow'
import { EnvoyFooter } from '@/components/envoy/EnvoyFooter'
import { LibraryProvider } from '@/components/providers/LibraryProvider'
import { PreviewThemeListener } from '@/components/theme/PreviewThemeListener'
import { getUserByUsername } from '@/db/queries'
import type { UILibrary } from '@/hooks/useLibraryLoader'
import { getGoogleFontsUrl } from '@/lib/font-loader'

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
      const colorScheme = (user.colorScheme as ColorScheme) ?? 'dark'
      themeCSS = generateThemeCSSForScheme(theme, colorScheme)
      if (theme.typography) {
        fontsUrl = getGoogleFontsUrl(theme.typography)
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
        <div className='flex min-h-screen flex-col'>
          <div className='flex-1'>
            <EnvoyFlow profile={profile} />
          </div>
          {!isPreview && <EnvoyFooter />}
        </div>
      </LibraryProvider>
    </>
  )
}
