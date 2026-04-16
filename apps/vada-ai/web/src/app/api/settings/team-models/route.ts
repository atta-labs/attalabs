import { NextResponse } from 'next/server'
import { auth } from '@atta/auth/hooks'
import { z } from 'zod'
import { getOrCreateUser } from '@/db/queries'
import { upsertUserTeamModel } from '@/db/settings-queries'

const PutSchema = z.object({
  teamId: z.string().min(1),
  agentRole: z.string().min(1),
  provider: z.string().min(1),
  modelId: z.string().min(1)
})

export async function PUT(request: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = PutSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const user = await getOrCreateUser(clerkId, '')
  await upsertUserTeamModel(
    user.id,
    parsed.data.teamId,
    parsed.data.agentRole,
    parsed.data.provider,
    parsed.data.modelId
  )

  return NextResponse.json({ ok: true })
}
