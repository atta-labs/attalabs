import { NextResponse } from 'next/server'
import { auth } from '@atta/auth/hooks'
import { getOrCreateUser } from '@/db/queries'
import { getUserSettings, getUserTeamModels } from '@/db/settings-queries'

export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getOrCreateUser(clerkId, '')
  const [teamModels, settings] = await Promise.all([getUserTeamModels(user.id), getUserSettings(user.id)])

  // apiKeys is always [] — keys live in the browser, not the DB. Kept in the
  // response shape for transitional backward-compat; clients should read keys
  // via useIdentity() instead. See /trust.
  return NextResponse.json({ apiKeys: [], teamModels, faceStyle: settings.faceStyle })
}
