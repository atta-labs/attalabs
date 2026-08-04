/**
 * Audit rate limiters (abuse hole).
 *
 * Two distinct limits run on POST /api/audit:
 *
 *   1. Per-IP — caps a single client (5/h). Enforced in `proxy.ts`
 *      middleware. Stops one spammer from one address.
 *   2. Per-owner — caps the profile owner's BYOK spend (30/h). Enforced in
 *      `app/api/audit/route.ts` handleSingle, keyed on the profile owner's
 *      `clerkId` (the user whose key is being spent). Stops collective
 *      abuse across rotating IPs — without this, the per-IP limit alone
 *      lets distributed callers drain the owner's key.
 *
 * Both limiters share one Redis client. When `UPSTASH_REDIS_REST_URL` /
 * `UPSTASH_REDIS_REST_TOKEN` are missing or invalid, both export `null` and
 * callers fail-open with a logged warning. This is deliberate: today's
 * Upstash creds are expired (backlog item) — the limit mechanism must not
 * break audits when the backbone is down. It activates with creds.
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN
      })
    : null

// 5 audits per IP per hour. Caps a single client. Prefix preserved
// (`herald:match`) so an existing Upstash bucket is not invalidated.
export const perIpAuditLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 h'),
      prefix: 'herald:match'
    })
  : null

// 30 audits per owner per hour. Caps the profile owner's BYOK spend across
// all callers — distinct abuse model from per-IP.
//
// Why 30/h: a launch-day flurry typically brings 5–10 distinct recruiters
// running 2–3 audits each; 30/h covers that with headroom. Worst-case
// owner spend at the cap is ~30 LLM calls/h (≈$3–5/h on Sonnet today),
// bounded and recoverable. Tunable later as we observe real usage.
export const perOwnerAuditLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '1 h'),
      prefix: 'herald:audit:owner'
    })
  : null
