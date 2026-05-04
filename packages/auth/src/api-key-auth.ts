import { createHash } from 'node:crypto'

export type ApiKeyRow = {
  id: string
  clerkId: string
  product: string
  revokedAt: Date | null
}

export type VerifyApiKeyResult =
  | { ok: true; clerkId: string; apiKeyId: string }
  | { ok: false; status: 401; reason: string }

export async function verifyApiKeyBearer(
  authHeader: string | null | undefined,
  product: string,
  lookup: (keyHash: string) => Promise<ApiKeyRow | null>,
  touch: (apiKeyId: string) => Promise<void>
): Promise<VerifyApiKeyResult> {
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, status: 401, reason: 'Missing or malformed Authorization header' }
  }

  const token = authHeader.slice('Bearer '.length).trim()
  if (!token) {
    return { ok: false, status: 401, reason: 'Empty bearer token' }
  }

  const keyHash = createHash('sha256').update(token).digest('hex')
  const row = await lookup(keyHash)

  if (!row) {
    return { ok: false, status: 401, reason: 'Invalid API key' }
  }

  if (row.revokedAt !== null) {
    return { ok: false, status: 401, reason: 'API key has been revoked' }
  }

  if (row.product !== product) {
    return { ok: false, status: 401, reason: 'API key is not valid for this product' }
  }

  // Fire-and-forget — don't block the response on DB write
  touch(row.id).catch(() => undefined)

  return { ok: true, clerkId: row.clerkId, apiKeyId: row.id }
}
