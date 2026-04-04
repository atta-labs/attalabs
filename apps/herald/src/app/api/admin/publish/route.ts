import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { updateUserUI } from '@/db/queries'

const VALID_LIBRARIES = ['basic', 'retro', 'animate', 'brutal']
const VALID_SCHEMES = ['dark', 'light']

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as { themeId?: string; colorScheme?: string; library?: string }

  if (!body.themeId || typeof body.themeId !== 'string') {
    return NextResponse.json({ error: 'themeId required' }, { status: 400 })
  }
  if (!body.colorScheme || !VALID_SCHEMES.includes(body.colorScheme)) {
    return NextResponse.json({ error: 'Invalid colorScheme' }, { status: 400 })
  }
  if (!body.library || !VALID_LIBRARIES.includes(body.library)) {
    return NextResponse.json({ error: 'Invalid library' }, { status: 400 })
  }

  await updateUserUI(userId, {
    themeId: body.themeId,
    colorScheme: body.colorScheme,
    library: body.library
  })

  return NextResponse.json({ ok: true })
}
