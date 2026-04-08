import { NextResponse } from 'next/server'
import { auth } from '@atta/auth/hooks'
import { getOrCreateUser, listSessions } from '@/db/queries'

export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await getOrCreateUser(clerkId, '')
  const sessions = await listSessions(user.id)

  return NextResponse.json({ sessions })
}
