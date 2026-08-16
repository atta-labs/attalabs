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

**MUST NOT** call `generateText()` or a raw provider SDK directly in a route handler. Every LLM call runs through `@atta/engine` (`loadFlow` / `loadYamlFromCatalog` → `compileFlow` → `LangGraphAdapter.execute`) — never a bespoke per-route call. Herald's original `/api/match` called `generateText()` directly, and was migrated onto the engine specifically so Herald inherits the cognitive router, multi-vendor failover, transcript tracing, and cost tracking that a direct SDK call can never get.

Two sanctioned shapes, chosen by whether the agent is reused across routes:

**(a) Packaged agent — preferred for reusable product intelligence.** The engine chain lives inside a self-contained package at `packages/agents/<name>/`, which exports a `run()`. The route just calls it:

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

**Additive failure signal, not a shape swap.** A route can (and should) surface *why* a fallback fired without breaking the "consistent shape" rule above — add an optional field that's absent on success and present on failure, never change the envelope itself. `apps/herald-ai/web/src/app/api/audit/route.ts` is the reference example: `MatchReport.auditFailed?: { reason, category }` is set only when `buildPartialReport()` builds a fallback (execution failed, not just parsed-oddly); every consumer that ignores the field still gets the exact same shape it always did.

---

## File Organization

```
src/app/api/
├── audit/route.ts              # POST — main feature endpoint (engine-backed, see LLM Integration)
├── audit/resolve-input/route.ts  # POST — polymorphic input resolver, see note below
├── admin/
│   └── onboarding-chat/route.ts
├── webhooks/
│   └── clerk/route.ts          # POST — Clerk `user.deleted` → DB cleanup, see note below
└── mcp/
    └── signals/route.ts        # GET — MCP server endpoint
```

**Reference example — vendor webhook, not the standard user-request shape:** `webhooks/clerk/route.ts` (Herald) doesn't follow the `{ success, data }` / `{ success, error }` response envelope described below — it's not a client-facing route, it's Clerk calling us. It verifies the request with `verifyWebhook` from `@clerk/nextjs/webhooks` (reads `CLERK_WEBHOOK_SIGNING_SECRET`), returns a 400 on verification failure, and on `user.deleted` deletes the corresponding rows from `users`, `apiKeys`, and `userProviderKeys` (only `heraldProfiles` has a DB-level `ON DELETE CASCADE`; the other two tables have no FK and need explicit cleanup) so a deleted account's username/GitHub handle can be re-claimed immediately instead of staying blocked by orphaned rows.

**Reference example — resolving polymorphic input by role:** `audit/resolve-input/route.ts` (Herald) is the pattern to copy when a route must resolve more than one input shape into more than one output shape. It dispatches on `content-type` (JSON vs `multipart/form-data`), and within each branch further dispatches on an explicit `role` discriminator (e.g. `'cv' | 'jd'`) read from the body/form data — never inferred from file contents or shape. The multipart branch shares one parsing path (file-type extraction) across roles and branches only the final output-shape construction on `role`. New role values default to the pre-existing behavior so older callers that don't send the field keep working unchanged.

**Reference example — local-tooling GET, not the standard user-request shape:** `api/coherence/route.ts` (Vinaya Studio — canonically `apps/vinaya-studio/web` since the Portal/Studio split (task 3); an identical copy still lives in the legacy `apps/vinaya/web` until that app is deleted, task 4; ported from the now-deprecated AEG Studio, whose copy no longer tracks this one — Vinaya's imports `findAegRoot` from its own `@/lib/repo-state`, renamed from `lib/aeg-fs`) is a local-only, no-input `GET` that shells out to a Bun CLI oracle (`packages/aeg-core/bin/verify-coherence.ts`) via `execFile`/`promisify`, parses its JSON stdout, and returns it unchanged — no LLM call, no auth, no request body to validate. It still follows the graceful-degradation rule: any subprocess/parse failure, or `findAegRoot()` returning `null` (no `.vinaya/projects.md` above cwd — a plain check, not a try/catch, since `findAegRoot` itself never throws), returns the same response shape with `forgeUnavailable: true` and an `oracleError` string instead of a raw stack trace or a different envelope. This is the pattern to copy for any other route whose job is "run a local CLI tool and relay its JSON," not the `{ success, data }` LLM-route shape above. Because it relays the oracle's JSON unchanged, its exported `CheckFailure`/`CheckResult` types are a **mirror of the oracle's output, not an independent contract** — they track `verify-coherence.ts` field-for-field (a failure row is keyed by `tranche`, following the tranche rename), and a route-side type that drifts from the tool it relays is the bug. Its `resolveRepo` call resolves from `@atta/aeg-forge-state` (a forge-sole-state follow-up) — not a local per-app file; that primitive, and its siblings (`resolveGithubToken`, `fetchProvenance`), are shared across every AEG/Vinaya surface from that one package now.

---

## Anti-patterns

- ❌ Raw stack traces in responses — log server-side, return generic message
- ❌ Synchronous external calls without timeout
- ❌ Missing input validation — always validate before processing
- ❌ Inconsistent response shapes across success/error paths
- ❌ Blocking LLM call while waiting for signal fetches — parallelize
- ❌ Using `Response` directly — use `NextResponse.json()`
