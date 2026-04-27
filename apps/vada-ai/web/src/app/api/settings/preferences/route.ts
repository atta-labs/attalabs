import { NextResponse } from 'next/server'
import { auth } from '@atta/auth/hooks'
import { z } from 'zod'
import { getOrCreateUser } from '@/db/queries'
import { upsertUserSettings } from '@/db/settings-queries'

const PutSchema = z.object({
  faceStyle: z.enum(['reductive', 'emblematic'])
})

export async function PUT(request: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = PutSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  await getOrCreateUser(clerkId, '')
  await upsertUserSettings(clerkId, { faceStyle: parsed.data.faceStyle })

  return NextResponse.json({ ok: true })
}
