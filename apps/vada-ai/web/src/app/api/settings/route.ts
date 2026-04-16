import { NextResponse } from 'next/server'
import { auth } from '@atta/auth/hooks'
import { getOrCreateUser } from '@/db/queries'
import { getUserApiKeys, getUserTeamModels, getUserSettings } from '@/db/settings-queries'

export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getOrCreateUser(clerkId, '')
  const [apiKeys, teamModels, settings] = await Promise.all([
    getUserApiKeys(user.id),
    getUserTeamModels(user.id),
    getUserSettings(user.id)
  ])

  return NextResponse.json({ apiKeys, teamModels, faceStyle: settings.faceStyle })
}
