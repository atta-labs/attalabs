import { NextResponse } from 'next/server'
import { auth } from '@atta/auth/hooks'
import { generateApiKey } from '@atta/crypto'
import { createApiKey, listApiKeys } from '@atta/db/queries'
import { db } from '@/db'

export async function POST(request: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null || typeof (body as Record<string, unknown>).name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const { name } = body as { name: string }
  const trimmed = name.trim()

  if (!trimmed) {
    return NextResponse.json({ error: 'name must not be empty' }, { status: 400 })
  }

  if (trimmed.length > 100) {
    return NextResponse.json({ error: 'name must be 100 characters or fewer' }, { status: 400 })
  }

  const { plaintext, hash } = generateApiKey('vada')
  const row = await createApiKey(db, clerkId, trimmed, hash)

  return NextResponse.json({
    key: {
      id: row.id,
      name: row.name,
      createdAt: row.createdAt,
      plaintext
    }
  })
}

export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rows = await listApiKeys(db, clerkId)

  return NextResponse.json({
    keys: rows.map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: row.createdAt,
      lastUsedAt: row.lastUsedAt,
      revokedAt: row.revokedAt
    }))
  })
}
