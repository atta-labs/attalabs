import { auth } from '@atta/auth/hooks'
import { getOrCreateUser, getSessionWithTranscriptForUser, updateSessionState } from '@/db/queries'
import { getNextCommand } from '@/engine/orchestrator'
import type { NextCommand, StateChangeCommand } from '@/engine/types'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getOrCreateUser(clerkId, '')
  const { id } = await params
  let session = await getSessionWithTranscriptForUser(id, user.id)
  if (!session) return Response.json({ error: 'Session not found' }, { status: 404 })

  // Chase state_change commands synchronously so the same /next call returns
  // a runnable command. A pathological session could loop forever here; cap at 4.
  for (let i = 0; i < 4; i++) {
    const cmd = getNextCommand(session)
    if (cmd.type !== 'state_change') return Response.json(cmd satisfies NextCommand)
    await updateSessionState(id, (cmd as StateChangeCommand).state)
    const fresh = await getSessionWithTranscriptForUser(id, user.id)
    if (!fresh) return Response.json({ error: 'Session not found' }, { status: 404 })
    session = fresh
  }

  return Response.json({ type: 'done' } satisfies NextCommand)
}
