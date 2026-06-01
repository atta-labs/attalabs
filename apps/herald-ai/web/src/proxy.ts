import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher(['/admin(.*)'])

// Upstash rate limiter: 5 match audits per IP per hour
// Falls back to allowing all requests if env vars are missing (local dev)
const ratelimit =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis: new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN
        }),
        limiter: Ratelimit.slidingWindow(5, '1 h'),
        prefix: 'herald:match'
      })
    : null

export default clerkMiddleware(async (auth, req) => {
  // Rate limit POST /api/match
  if (req.method === 'POST' && req.nextUrl.pathname === '/api/match') {
    if (ratelimit) {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
      try {
        const { success } = await ratelimit.limit(ip)
        if (!success) {
          return NextResponse.json(
            { error: "You've run several audits recently. Try again in an hour." },
            { status: 429 }
          )
        }
      } catch {
        console.warn('[Herald] Rate limit check failed — allowing request')
      }
    } else {
      console.warn('[Herald] Upstash not configured — rate limiting disabled')
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
