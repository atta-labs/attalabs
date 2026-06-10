import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { decryptVendorKeys, encryptVendorKeys } from '@atta/crypto'
import { deleteProviderKeys, getProviderKeys, upsertProviderKeys } from '@atta/db/queries'
import { db } from '@/db'

export async function DELETE(_request: Request, { params }: { params: Promise<{ vendor: string }> }) {
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

    const { vendor } = await params

    const existing = await getProviderKeys(db, clerkId)
    if (existing === null) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const keys = decryptVendorKeys(
      existing.encryptedPayload as Parameters<typeof decryptVendorKeys>[0],
      clerkId,
      masterKey
    )

    delete keys[vendor]

    if (Object.keys(keys).length === 0) {
      await deleteProviderKeys(db, clerkId)
    } else {
      const encryptedPayload = encryptVendorKeys(keys, clerkId, masterKey)
      await upsertProviderKeys(db, clerkId, encryptedPayload)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[/api/keys/provider/[vendor]] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }
}
