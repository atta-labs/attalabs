/**
 * POST /api/admin/audit-model — persist the user's chosen audit model.
 *
 * Accepts `{ vendor: string, modelId: string }` to set a selection, or
 * `{ vendor: null, modelId: null }` to clear (audit will fall back to the
 * YAML default).
 *
 * Validates that the user has a key for the chosen vendor BEFORE persisting,
 * so the UI never lets a user "save" a selection that the audit dispatch
 * path would immediately fall back from. (The dispatch path also guards —
 * see `resolveAuditSelection` — so a race between revoking a key and
 * saving cannot break an audit.)
 *
 * Task 3b. Does not change D-033 whose-key logic.
 */

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { VENDORS } from '@atta/models'
import type { VendorId } from '@atta/models'

import { updateAuditModel } from '@/db/queries'
import { loadDecryptedKeys } from '@/lib/audit-key'

const KNOWN_VENDOR_IDS = new Set<string>(Object.keys(VENDORS))

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

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Body must be an object' }, { status: 400 })
  }

  const raw = body as { vendor?: unknown; modelId?: unknown }

  // Clear selection — both null.
  if (raw.vendor === null && raw.modelId === null) {
    await updateAuditModel(clerkId, null, null)
    return NextResponse.json({ ok: true, vendor: null, modelId: null })
  }

  if (typeof raw.vendor !== 'string' || typeof raw.modelId !== 'string') {
    return NextResponse.json({ error: 'vendor and modelId must be strings (or both null to clear)' }, { status: 400 })
  }

  const vendor = raw.vendor.trim()
  const modelId = raw.modelId.trim()

  if (!vendor || !modelId) {
    return NextResponse.json({ error: 'vendor and modelId must not be empty' }, { status: 400 })
  }

  if (!KNOWN_VENDOR_IDS.has(vendor)) {
    return NextResponse.json({ error: 'Unknown vendor' }, { status: 400 })
  }

  // Reject selections for vendors the user has no key for. This is the
  // first line of defense; the dispatch path is the second (see
  // resolveAuditSelection auto-fallback).
  const decrypted = await loadDecryptedKeys(clerkId)
  if (!decrypted?.keys[vendor]) {
    return NextResponse.json({ error: `No key configured for vendor "${vendor}". Add a key first.` }, { status: 400 })
  }

  await updateAuditModel(clerkId, vendor as VendorId, modelId)

  return NextResponse.json({ ok: true, vendor, modelId })
}
