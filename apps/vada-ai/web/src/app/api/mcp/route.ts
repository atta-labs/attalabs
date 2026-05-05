import { eq } from 'drizzle-orm'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { verifyApiKeyBearer } from '@atta/auth'
import { decryptVendorKeys } from '@atta/crypto'
import type { EncryptedVendorKeys } from '@atta/crypto'
import type { ProviderKeys } from '@atta/adapter-langgraph'
import { getProviderKeys } from '@atta/db/queries'
import { db, schema } from '@/db'
import { createServer } from '@vada/mcp-server/server'

// ── In-process rate limiter ───────────────────────────────────────────────────
// Sliding window: 60 requests per hour per API key ID.
// This is a best-effort guard — it resets on cold starts.

const rateLimits = new Map<string, { count: number; windowStart: number }>()
const RATE_LIMIT_MAX = 60
const RATE_WINDOW_MS = 60 * 60 * 1000

function checkRateLimit(apiKeyId: string): boolean {
  const now = Date.now()
  const entry = rateLimits.get(apiKeyId)

  if (!entry || now - entry.windowStart >= RATE_WINDOW_MS) {
    rateLimits.set(apiKeyId, { count: 1, windowStart: now })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false
  }

  entry.count += 1
  return true
}

// ── Request handler ───────────────────────────────────────────────────────────

async function handleMcp(request: Request): Promise<Response> {
  const authHeader = request.headers.get('Authorization')

  // 1. Verify bearer token
  const result = await verifyApiKeyBearer(
    authHeader,
    'vada',
    async (keyHash) => {
      const rows = await db.select().from(schema.apiKeys).where(eq(schema.apiKeys.keyHash, keyHash)).limit(1)
      const row = rows[0]
      if (!row) return null
      return { id: row.id, clerkId: row.clerkId, product: row.product, revokedAt: row.revokedAt }
    },
    async (apiKeyId) => {
      await db.update(schema.apiKeys).set({ lastUsedAt: new Date() }).where(eq(schema.apiKeys.id, apiKeyId))
    }
  )

  if (!result.ok) {
    return new Response(JSON.stringify({ error: result.reason }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // 2. Rate limit
  if (!checkRateLimit(result.apiKeyId)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded. Maximum 60 requests per hour.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // 3. Load master encryption key
  const masterKeyB64 = process.env.MASTER_ENCRYPTION_KEY
  if (!masterKeyB64) {
    return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  const masterKey = Buffer.from(masterKeyB64, 'base64')

  // 4. Load provider keys for this user
  const providerRow = await getProviderKeys(db, result.clerkId)
  if (!providerRow) {
    return new Response(JSON.stringify({ error: 'No provider keys configured' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // 5. Decrypt vendor keys
  let decrypted: Record<string, string>
  try {
    decrypted = decryptVendorKeys(providerRow.encryptedPayload as EncryptedVendorKeys, result.clerkId, masterKey)
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to decrypt provider keys' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // 6. Build provider keys
  const providerKeys: ProviderKeys = {
    anthropic: decrypted.anthropic,
    google: decrypted.google,
    openai: decrypted.openai,
    xai: decrypted.xai
  }

  // 7. Create MCP server + transport (stateless — new instance per request)
  const server = createServer(providerKeys)
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined })

  await server.connect(transport)

  return transport.handleRequest(request)
}

export { handleMcp as GET, handleMcp as POST, handleMcp as DELETE }
