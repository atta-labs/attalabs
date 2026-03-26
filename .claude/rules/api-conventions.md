# API Conventions — Herald

## Route Handlers

- All API routes live under `apps/herald/src/app/api/`
- Use Next.js App Router route handlers (`route.ts`)
- Return proper HTTP status codes and JSON responses
- Always handle errors gracefully — never return raw stack traces

## The Skeptical Auditor

- The system prompt in HERALD-BUILD-SPEC.md Section 05 is **verbatim**
- Do NOT modify it without explicit instruction from the user
- Zero marketing language in any AI output
- Every claim must reference a detectable signal
- Gaps are always honest, always paired with mitigation

## Match API (`POST /api/match`)

- Latency target: <6 seconds
- Hard timeout: 10 seconds → return partial report
- Caching: hash(JD + profile) → 24h cache
- Never show a spinner of death — always degrade gracefully

## MCP Tool Handlers

- v1 uses Vercel AI SDK tool handlers, NOT true MCP transport
- Structured for future extraction to standalone MCP server
- Tool definitions should be clean, typed, and independently testable

## Rate Limiting

- 5 match reports per IP per hour (Upstash Redis)
- Applied in middleware, not in individual route handlers
- Error message: "You've run several audits recently. Try again in an hour."
