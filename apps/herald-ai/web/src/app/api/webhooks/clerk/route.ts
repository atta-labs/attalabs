import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { eq } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { db, schema } from '@/db'

/**
 * Clerk → Herald account-deletion cascade.
 *
 * Deleting a Clerk account only removes the Clerk-side user — it never
 * touches Herald's own Postgres rows, so a "deleted" account's username,
 * profile, and keys sat there forever, silently blocking that username for
 * every future signup (including the person who just deleted it).
 *
 * `users` → `heraldProfiles` already cascades at the DB level
 * (heraldProfiles.clerkId references users.clerkId ON DELETE CASCADE), so
 * deleting the `users` row is enough for that pair. `apiKeys` and
 * `userProviderKeys` have no FK constraint (plain clerkId text columns), so
 * they're deleted explicitly here.
 */
export async function POST(request: NextRequest) {
  let event: Awaited<ReturnType<typeof verifyWebhook>>
  try {
    event = await verifyWebhook(request)
  } catch (err) {
    console.error('[Herald] Clerk webhook verification failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 400 })
  }

  if (event.type === 'user.deleted') {
    const clerkId = event.data.id
    if (clerkId) {
      await Promise.all([
        db.delete(schema.users).where(eq(schema.users.clerkId, clerkId)),
        db.delete(schema.apiKeys).where(eq(schema.apiKeys.clerkId, clerkId)),
        db.delete(schema.userProviderKeys).where(eq(schema.userProviderKeys.clerkId, clerkId))
      ])
      console.info(`[Herald] Cleaned up DB rows for deleted Clerk user ${clerkId}`)
    }
  }

  return NextResponse.json({ received: true })
}
