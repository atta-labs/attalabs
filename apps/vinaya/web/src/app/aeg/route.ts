import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * `/aeg` is now `/how-it-works` — a genuine HTTP 301, not Next's
 * `redirects()` config (`permanent: true` there emits 308, not 301) or
 * `redirect()`/`permanentRedirect()` from `next/navigation` (307/308). A
 * plain Route Handler returning `NextResponse.redirect(url, 301)` is the
 * only mechanism that produces the literal status this route promises.
 */
export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/how-it-works', request.url), 301)
}
