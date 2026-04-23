---
name: ui-api-routes
description: Patterns for Next.js App Router API routes in the Atta AI monorepo — validation, errors, timeouts, LLM calls
---

# API Routes — Atta AI

## Context

All API routes use Next.js App Router (`route.ts`). Routes must handle errors gracefully, validate input, and never expose internals to clients.

---

## Rules

### Structure
- **MUST** live under `src/app/api/{feature}/route.ts`
- **MUST** return `NextResponse.json()` — never raw `Response`
- **MUST** validate input before any processing
- **MUST** check required env vars at top of handler
- **MUST** catch all errors with a graceful fallback — never return raw stack traces

### Input Validation
```ts
export async function POST(request: Request) {
  const body = await request.json()

  if (!body.jobDescription || typeof body.jobDescription !== 'string') {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }
  // ...
}
```

### Env Var Check
```ts
const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) {
  return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
}
```

### Error Handling
```ts
try {
  const result = await processRequest(data)
  return NextResponse.json(result)
} catch (err) {
  console.error('Route error:', err)
  return NextResponse.json(buildFallbackResponse(), { status: 200 })
  // Note: return 200 with fallback for LLM failures — partial data is better than hard error
}
```

### Timeouts on External Calls
- **MUST** wrap signal/external fetches in `Promise.race` with timeout
- Signal fetches: 3 second timeout — proceed with empty signals on failure
- LLM calls: 25 second timeout — return fallback report on failure

```ts
// Signals (non-critical)
const signals = await Promise.race([
  fetchGithubSignals(handle),
  new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))
])

// LLM (critical path)
const result = await Promise.race([
  generateText({ model, system, prompt }),
  new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('LLM timeout')), 25000)
  )
])
```

### LLM Integration
```ts
import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const { text } = await generateText({
  model: anthropic('claude-sonnet-4-20250514'),
  system: SYSTEM_PROMPT,
  prompt: userPrompt,
  maxOutputTokens: 2000,
  temperature: 0.3
})
```

### Response Shape
- **MUST** be consistent — same shape on success and fallback
- **MUST NOT** return different shapes based on error type

```ts
// ✅ consistent shape
return NextResponse.json({ grade: 'B', score: 72, signals: [] })      // success
return NextResponse.json({ grade: 'N/A', score: 0, signals: [] })     // fallback

// ❌ inconsistent
return NextResponse.json({ error: 'failed' })    // different shape on error
```

---

## File Organization

```
src/app/api/
├── match/route.ts              # POST — main feature endpoint
├── admin/
│   └── onboarding-chat/route.ts
└── mcp/
    └── signals/route.ts        # GET — MCP server endpoint
```

---

## Anti-patterns

- ❌ Raw stack traces in responses — log server-side, return generic message
- ❌ Synchronous external calls without timeout
- ❌ Missing input validation — always validate before processing
- ❌ Inconsistent response shapes across success/error paths
- ❌ Blocking LLM call while waiting for signal fetches — parallelize
- ❌ Using `Response` directly — use `NextResponse.json()`
