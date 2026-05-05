import { NextResponse } from 'next/server'
import { auth } from '@atta/auth/hooks'
import { decryptVendorKeys, encryptVendorKeys } from '@atta/crypto'
import { getProviderKeys, upsertProviderKeys } from '@atta/db/queries'
import { db } from '@/db'

export async function POST(request: Request) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const masterKeyB64 = process.env.MASTER_ENCRYPTION_KEY
    if (!masterKeyB64) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }
    const masterKey = Buffer.from(masterKeyB64, 'base64')

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    if (
      typeof body !== 'object' ||
      body === null ||
      typeof (body as Record<string, unknown>).vendor !== 'string' ||
      typeof (body as Record<string, unknown>).key !== 'string'
    ) {
      return NextResponse.json({ error: 'vendor and key are required strings' }, { status: 400 })
    }

    const { vendor, key } = body as { vendor: string; key: string }

    if (!vendor.trim() || !key.trim()) {
      return NextResponse.json({ error: 'vendor and key must not be empty' }, { status: 400 })
    }

    const existing = await getProviderKeys(db, clerkId)
    const currentKeys: Record<string, string> =
      existing !== null
        ? decryptVendorKeys(existing.encryptedPayload as Parameters<typeof decryptVendorKeys>[0], clerkId, masterKey)
        : {}

    const merged = { ...currentKeys, [vendor]: key }
    const encryptedPayload = encryptVendorKeys(merged, clerkId, masterKey)
    await upsertProviderKeys(db, clerkId, encryptedPayload)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[/api/keys/provider] error:', err instanceof Error ? err.message : err)
    console.error('[/api/keys/provider] stack:', err instanceof Error ? err.stack : 'no stack')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }
}
