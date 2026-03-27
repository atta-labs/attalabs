import { notFound } from 'next/navigation'

import { EnvoyFlow } from '@/components/envoy/EnvoyFlow'
import { getUserByUsername } from '@/db/queries'
import { DANI_PROFILE } from '@/lib/profile'

export default async function EnvoyPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params

  // Try DB first
  const user = await getUserByUsername(username)

  if (user) {
    const profile = {
      name: user.name,
      title: user.title,
      github: user.githubHandle ?? undefined,
      summary: user.summary,
      stack: JSON.parse(user.stack) as string[],
      location: user.location ?? undefined,
      availability: user.availability ?? undefined
    }
    return <EnvoyFlow profile={profile} />
  }

  // Fallback: hardcoded "dani" profile
  if (username === 'dani') {
    return <EnvoyFlow profile={DANI_PROFILE} />
  }

  notFound()
}
