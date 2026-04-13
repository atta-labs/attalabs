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

// Per-provider variant: compound key `${sessionId}::${provider}`
export function storeEphemeralProviderKey(sessionId: string, provider: string, apiKey: string): void {
  store.set(`${sessionId}::${provider}`, { apiKey, expiresAt: Date.now() + 10 * 60 * 1000 })
}

export function consumeEphemeralProviderKey(sessionId: string, provider: string): string | null {
  const key = `${sessionId}::${provider}`
  const entry = store.get(key)
  if (!entry) return null
  store.delete(key)
  if (Date.now() > entry.expiresAt) return null
  return entry.apiKey
}

// Non-consuming reads for resume — key stays available for subsequent attempts
export function peekEphemeralKey(sessionId: string): string | null {
  const entry = store.get(sessionId)
  if (!entry || Date.now() > entry.expiresAt) return null
  return entry.apiKey
}

export function peekEphemeralProviderKey(sessionId: string, provider: string): string | null {
  const entry = store.get(`${sessionId}::${provider}`)
  if (!entry || Date.now() > entry.expiresAt) return null
  return entry.apiKey
}
