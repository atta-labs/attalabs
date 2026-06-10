import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { decryptVendorKeys } from '@atta/crypto'
import { getProviderKeys } from '@atta/db/queries'
import { db } from '@/db'

// Vendors supported in Herald (Anthropic is what the audit uses; others stored for completeness)
const SUPPORTED_VENDORS = ['anthropic', 'google', 'openai', 'xai'] as const

export async function GET() {
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

    const existing = await getProviderKeys(db, clerkId)
    if (existing === null) {
      return NextResponse.json({ status: {} })
    }

    const keys = decryptVendorKeys(
      existing.encryptedPayload as Parameters<typeof decryptVendorKeys>[0],
      clerkId,
      masterKey
    )

    const status: Record<string, true> = {}
    for (const vendor of SUPPORTED_VENDORS) {
      if (keys[vendor]) {
        status[vendor] = true
      }
    }

    return NextResponse.json({ status })
  } catch (err) {
    console.error('[/api/keys/provider/status] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }
}
