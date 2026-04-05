import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { isUsernameTaken } from '@/db/queries'

const RESERVED = new Set(['admin', 'api', 'sign-in', 'sign-up', 'home', 'onboarding', 'settings'])

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username')?.trim().toLowerCase()

  if (!username || username.length < 3 || username.length > 50) {
    return NextResponse.json({ available: false, reason: 'Username must be 3-50 characters' })
  }

  if (!/^[a-z0-9-]+$/.test(username)) {
    return NextResponse.json({ available: false, reason: 'Only lowercase letters, numbers, and hyphens' })
  }

  if (RESERVED.has(username)) {
    return NextResponse.json({ available: false, reason: 'Reserved' })
  }

  const taken = await isUsernameTaken(username)
  return NextResponse.json({ available: !taken })
}
