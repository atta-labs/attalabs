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

// LLM (critical path) — see LLM Integration below for what runs here
const result = await Promise.race([
  run({ profile: userPrompt, modelId, vendor, apiKey, schema }),
  new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('LLM timeout')), 25000)
  )
])
```

### LLM Integration

**MUST NOT** call `generateText()` or a raw provider SDK directly in a route handler. Every LLM call runs through `@atta/engine` (`loadFlow` / `loadYamlFromCatalog` → `compileFlow` → `LangGraphAdapter.execute`) — never a bespoke per-route call. This is D-044/D-045: Herald's original `/api/match` called `generateText()` directly, and was migrated onto the engine specifically so Herald inherits the cognitive router, multi-vendor failover, transcript tracing, and cost tracking that a direct SDK call can never get. Direct `generateText`/SDK calls in a route are a rejected pattern, not a convenience shortcut.

Two sanctioned shapes, chosen by whether the agent is reused across routes:

**(a) Packaged agent — preferred for reusable product intelligence.** The engine chain lives inside a self-contained package at `packages/agents/<name>/` (D-051), which exports a `run()`. The route just calls it:

```ts
// apps/herald-ai/web/src/app/api/audit/route.ts
import { run } from '@atta/forensic-hiring-auditor'

const report = await run({
  profile: userPrompt,
  modelId: creds.modelId,
  vendor: creds.vendor,
  apiKey: creds.apiKey,
  schema: MATCH_REPORT_SCHEMA,
  candidateInfo: { name: profile.name, title: profile.title, github: profile.github }
})
```

Inside `packages/agents/forensic-hiring-auditor/src/index.ts`, `run()` does the actual `loadFlow(yaml) → compileFlow(flow, prompt, modelId, { schema }) → new LangGraphAdapter({ providerKeys, customTools }).execute({ plan })`. The package owns the YAML, the schema/parse contract, and any custom tools; the route owns request validation, auth/key resolution, caching, and retry/timeout.

**(b) Direct engine execution in the route — no package exists yet.** For a route-specific flow not (yet) reused elsewhere, call the engine chain directly in the handler:

```ts
// apps/vada-ai/web/src/app/api/deliberation/[id]/workflow/run/route.ts
import { compileFlow, loadYamlFromCatalog } from '@atta/engine'
import { LangGraphAdapter } from '@atta/adapter-langgraph'

const flow = loadYamlFromCatalog(session.specId)
const plan = compileFlow(flow, session.question, session.modelId ?? 'claude-sonnet-4-6')
const adapter = new LangGraphAdapter({ providerKeys, customTools: VADA_TOOL_HANDLERS })
const conclusion = await adapter.execute({ plan })
```

Once an agent's logic is reused by more than one route, promote it to a `packages/agents/<name>/` package (shape a) instead of duplicating the chain.

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

**Additive failure signal, not a shape swap.** A route can (and, per D-058, should) surface *why* a fallback fired without breaking the "consistent shape" rule above — add an optional field that's absent on success and present on failure, never change the envelope itself. `apps/herald-ai/web/src/app/api/audit/route.ts` is the reference example: `MatchReport.auditFailed?: { reason, category }` is set only when `buildPartialReport()` builds a fallback (execution failed, not just parsed-oddly); every consumer that ignores the field still gets the exact same shape it always did. Prefer this pattern over inventing a second response envelope for the failure case.

---

## File Organization

```
src/app/api/
├── audit/route.ts              # POST — main feature endpoint (engine-backed, see LLM Integration)
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
