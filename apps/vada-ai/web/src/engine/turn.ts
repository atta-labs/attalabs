// Route-handler adapter: verifies session ownership, then delegates to
// persistTurn. Never receives provider API keys (the browser calls providers
// directly; see /trust).

import 'server-only'
import { getSessionForUser } from '@/db/queries'
import type { TurnErrorPayload, TurnPayload } from './types'
import { persistTurn } from './turn-logic'

export async function recordTurn(sessionId: string, userId: string, payload: TurnPayload): Promise<void> {
  const session = await getSessionForUser(sessionId, userId)
  if (!session) return
  await persistTurn(sessionId, payload)
}

export async function recordTurnError(_sessionId: string, _userId: string, _payload: TurnErrorPayload): Promise<void> {
  // V1: no-op. State is unchanged, so /next will return the same command and
  // the browser can retry. Future: record a transient error flag to surface to UI.
}
