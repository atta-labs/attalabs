import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { extractSignals } from '@/lib/signals'

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username')
  if (!username) {
    return NextResponse.json({ error: 'Missing username parameter' }, { status: 400 })
  }

  const token = process.env.GITHUB_PAT
  if (!token) {
    return NextResponse.json({ error: 'GITHUB_PAT not configured' }, { status: 500 })
  }

  try {
    const signals = await extractSignals(username, token)
    return NextResponse.json({ username, signals, count: signals.length })
  } catch {
    return NextResponse.json({ error: 'Failed to extract signals' }, { status: 500 })
  }
}
