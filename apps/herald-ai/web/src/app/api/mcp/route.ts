import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { verifyApiKeyBearer } from '@atta/auth'
import { db, schema } from '@/db'
import { resolveAuditCredentials } from '@/lib/audit-key'
import { MATCH_REPORT_SCHEMA } from '@/lib/prompts'
import { createServer } from '@herald/mcp-server/server'

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
    'herald',
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
    return NextResponse.json({ error: result.reason }, { status: 401 })
  }

  // 2. Rate limit
  if (!checkRateLimit(result.apiKeyId)) {
    return NextResponse.json({ error: 'Rate limit exceeded. Maximum 60 requests per hour.' }, { status: 429 })
  }

  // 3. Resolve BYOK credentials for this user
  const creds = await resolveAuditCredentials(result.clerkId)
  if (!creds) {
    return NextResponse.json(
      { error: 'No provider keys configured. Add a vendor key in Settings → API Keys.' },
      { status: 400 }
    )
  }

  // 4. Create MCP server + transport (stateless — new instance per request)
  const server = createServer({
    vendor: creds.vendor,
    modelId: creds.modelId,
    apiKey: creds.apiKey,
    schema: MATCH_REPORT_SCHEMA
  })
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined })

  await server.connect(transport)

  return transport.handleRequest(request)
}

export { handleMcp as GET, handleMcp as POST, handleMcp as DELETE }
