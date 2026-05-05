import { NextResponse } from 'next/server'
import { auth } from '@atta/auth/hooks'
import { revokeApiKey } from '@atta/db/queries'
import { db } from '@/db'

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const found = await revokeApiKey(db, id, clerkId)
  if (!found) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
