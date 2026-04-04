import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { updateUserLibrary } from '@/db/queries'

const VALID_LIBRARIES = ['basic', 'retro', 'animate', 'brutal']

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { library } = body

  if (!library || !VALID_LIBRARIES.includes(library)) {
    return NextResponse.json({ error: 'Invalid library' }, { status: 400 })
  }

  await updateUserLibrary(userId, library)

  return NextResponse.json({ ok: true })
}
