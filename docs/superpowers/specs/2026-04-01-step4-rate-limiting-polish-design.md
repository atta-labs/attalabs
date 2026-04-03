# Step 4 — Upstash Rate Limiting & Polish

## Summary

Replace in-memory rate limiting with Upstash Redis, move rate limit check into middleware, and make the report action bar sticky. Copy Link and Export PDF already work — no changes needed.

## 1. Upstash Rate Limiting

### Problem

Current rate limiting uses an in-memory `Map` inside `apps/herald/src/app/api/match/route.ts`. This resets on every deploy and doesn't share state across Vercel serverless function instances. A single user can bypass the limit by hitting different instances.

### Solution

- Install `@upstash/redis` + `@upstash/ratelimit` in `apps/herald`
- Move rate limit check from the match route into middleware (`proxy.ts`)
- Middleware intercepts `POST /api/match` requests only
- Use sliding window algorithm: **5 requests per IP per hour**
- IP extracted from `x-forwarded-for` header
- Remove `rateLimitMap`, `checkRateLimit`, and related constants from `route.ts`

### Error Response

On rate limit exceeded, return a JSON response with status 429:
```json
{ "error": "You've run several audits recently. Try again in an hour." }
```

The frontend already handles error responses from the match API — no client changes needed for the error case.

### Environment Variables

```env
UPSTASH_REDIS_REST_URL=     # Upstash Redis REST endpoint
UPSTASH_REDIS_REST_TOKEN=   # Upstash Redis REST token
```

### Graceful Degradation

If Upstash env vars are missing (local dev), fall back to allowing all requests with a console warning. This keeps local development frictionless.

## 2. Sticky Action Bar

### Problem

`ResultActions` in `EnvoyFlow.tsx` is a static div at the bottom of the report. The spec (Section 10) says it should be a "sticky bottom bar" so actions remain accessible as the recruiter scrolls.

### Solution

- Change `ResultActions` container to `sticky bottom-0`
- Add backdrop blur + subtle top border for visual separation
- Keep `no-print` class so it's hidden during print/PDF export

## 3. Copy Link & Export PDF

Already implemented in `ResultActions`:
- Copy Link: `navigator.clipboard.writeText()` with fallback
- Export PDF: `window.print()` with print-optimized styles

No changes needed. Keeping `window.print()` approach — zero dependencies, print styles already tuned.

## Files Changed

| File | Change |
|------|--------|
| `apps/herald/package.json` | Add `@upstash/redis`, `@upstash/ratelimit` |
| `apps/herald/src/proxy.ts` | Add rate limit check for `POST /api/match` |
| `apps/herald/src/app/api/match/route.ts` | Remove in-memory rate limiting code |
| `apps/herald/src/components/envoy/EnvoyFlow.tsx` | Make `ResultActions` sticky |
| `.env.example` (if exists) | Add Upstash env vars |

## Out of Scope

- True PDF file generation (staying with `window.print()`)
- Rate limiting on other endpoints
- UI changes to report content or layout
