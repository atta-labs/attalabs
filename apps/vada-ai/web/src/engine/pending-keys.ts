// Server-only — not imported by any client component.

interface KeyEntry {
  apiKey: string
  expiresAt: number
}

const store = new Map<string, KeyEntry>()

export function storeEphemeralKey(sessionId: string, apiKey: string): void {
  store.set(sessionId, { apiKey, expiresAt: Date.now() + 10 * 60 * 1000 })
}

export function consumeEphemeralKey(sessionId: string): string | null {
  const entry = store.get(sessionId)
  if (!entry) return null
  store.delete(sessionId) // consume once regardless of expiry
  if (Date.now() > entry.expiresAt) return null
  return entry.apiKey
}
