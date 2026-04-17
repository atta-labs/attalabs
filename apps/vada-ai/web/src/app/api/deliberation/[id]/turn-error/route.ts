import { z } from 'zod'
import { auth } from '@atta/auth/hooks'
import { getOrCreateUser, getSessionForUser } from '@/db/queries'
import { recordTurnError } from '@/engine/turn'

const ErrSchema = z.object({ turnId: z.string(), error: z.string() })

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getOrCreateUser(clerkId, '')
  const { id } = await params
  const session = await getSessionForUser(id, user.id)
  if (!session) return Response.json({ error: 'Session not found' }, { status: 404 })

  const body = await req.json()
  const parsed = ErrSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 })

  await recordTurnError(id, user.id, parsed.data)
  return Response.json({ ok: true })
}
