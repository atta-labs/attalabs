import { NextResponse } from 'next/server'
import { auth } from '@atta/auth/hooks'
import { getSessionWithTranscript } from '@/db/queries'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const session = await getSessionWithTranscript(id)

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  return NextResponse.json(session)
}
