import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { perIpAuditLimiter } from '@/lib/rate-limit'

const isProtectedRoute = createRouteMatcher(['/bulk-audit(.*)', '/ui', '/settings', '/onboarding'])

export default clerkMiddleware(async (auth, req) => {
  // Per-IP rate limit on POST /api/audit. The per-owner limit (D-033 abuse
  // hole) runs inside the route handler, where the owner's clerkId is
  // resolvable — middleware can't do that lookup.
  if (req.method === 'POST' && req.nextUrl.pathname === '/api/audit') {
    if (perIpAuditLimiter) {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
      try {
        const { success } = await perIpAuditLimiter.limit(ip)
        if (!success) {
          return NextResponse.json(
            { error: "You've run several audits recently. Try again in an hour." },
            { status: 429 }
          )
        }
      } catch {
        console.warn('[Herald] Per-IP rate limit check failed — allowing request')
      }
    } else {
      console.warn('[Herald] Upstash not configured — per-IP rate limiting disabled')
    }
  }

  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)'
  ]
}
