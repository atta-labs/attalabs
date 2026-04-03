import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { updateUserTheme } from '@/db/queries'

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { themeId, colorScheme } = body

  if (!themeId || typeof themeId !== 'string') {
    return NextResponse.json({ error: 'themeId is required' }, { status: 400 })
  }

  await updateUserTheme(userId, themeId, colorScheme ?? 'dark')

  return NextResponse.json({ ok: true })
}
