# API Conventions — Herald

## Route Handlers

- All API routes live under `apps/herald/src/app/api/`
- Use Next.js App Router route handlers (`route.ts`)
- Return proper HTTP status codes and JSON responses
- Always handle errors gracefully — never return raw stack traces

## The Skeptical Auditor

- The system prompt in `apps/herald/src/lib/prompts.ts` is **verbatim** from HERALD-BUILD-SPEC.md Section 08
- Do NOT modify it without explicit instruction from the user
- Zero marketing language in any AI output
- Every claim must reference a detectable signal
- Gaps are always honest, always paired with mitigation

## Match API (`POST /api/match`)

- Input: `{ job_description: string }` — frontend sends ONLY the JD
- Server-side: fetches GitHub signals, merges with DANI_PROFILE, calls Claude
- Model: Claude Sonnet via Vercel AI SDK (`@ai-sdk/anthropic`)
- LLM timeout: 25s with partial report fallback
- Signal fetch: 3s timeout, degrades gracefully to empty signals
- Caching: hash(JD + profile) → in-memory 24h (Upstash in Step 4)
- Parse + retry once on malformed JSON response
- Never show a spinner of death — always degrade gracefully

## Signal API (`GET /api/mcp/signals?username=[handle]`)

- Uses GITHUB_PAT for authentication (personal + org + private repos)
- Identity-filtered: commits by author, PRs by author
- Structural detection: turbo.json, biome.json, sanity, drizzle, docker
- Dependency scanning: Next.js, Zod, Radix, AI SDKs, Web3, Clerk
- Returns `RawSignal[]` with audit tone (Detected/Observed/Confirmed)
- No code leakage, no LLM interpretation — raw facts only

## Rate Limiting (Step 4)

- 5 match reports per IP per hour (Upstash Redis)
- Applied in middleware, not in individual route handlers
- Error message: "You've run several audits recently. Try again in an hour."
