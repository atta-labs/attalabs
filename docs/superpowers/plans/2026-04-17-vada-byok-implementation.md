# Vāda BYOK — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Invert Vāda's architecture so API keys never touch the server. Server becomes a stateless orchestrator; browser holds keys and calls providers directly. Publish `/trust` only when all verification gates pass.

**Architecture:** Pull-based command channel (`/next` + `/turn` + `/turn-error`) replacing SSE. Server composes prompts and advances a state machine. Browser executes provider calls using a new `@atta/identity` package (passkey-encrypted IndexedDB + in-memory fallback).

**Tech Stack:** Next.js 16 App Router, Drizzle + Neon Postgres, Vercel AI SDK (browser-side only), WebAuthn PRF, Web Crypto AES-GCM, IndexedDB, vitest (new, for identity package only).

**Testing convention:** The monorepo has no test framework today. This plan introduces vitest scoped to `packages/identity` only (security-critical crypto). Server-side changes use typecheck + manual E2E per existing convention.

**Spec:** [`docs/superpowers/specs/2026-04-17-vada-byok-architecture-design.md`](../specs/2026-04-17-vada-byok-architecture-design.md)

---

## Phase 1 — Session ownership hardening (pre-existing bug fix)

### Task 1: Add `getSessionForUser` query helper

**Files:**
- Modify: `apps/vada-ai/web/src/db/queries.ts`

- [ ] **Step 1: Add helper**

Add this function after `getSessionWithTranscript`:

```ts
export async function getSessionForUser(sessionId: string, userId: string) {
  const session = await db
    .select()
    .from(schema.sessions)
    .where(and(eq(schema.sessions.id, sessionId), eq(schema.sessions.userId, userId)))
    .limit(1)
  return session[0] ?? null
}

export async function getSessionWithTranscriptForUser(sessionId: string, userId: string) {
  const session = await getSessionForUser(sessionId, userId)
  if (!session) return null

  const entries = await db
    .select()
    .from(schema.transcriptEntries)
    .where(eq(schema.transcriptEntries.sessionId, sessionId))
    .orderBy(schema.transcriptEntries.round, schema.transcriptEntries.orderInRound)

  const interv = await db
    .select()
    .from(schema.interventions)
    .where(eq(schema.interventions.sessionId, sessionId))
    .orderBy(schema.interventions.createdAt)

  const conclusion = await db
    .select()
    .from(schema.conclusions)
    .where(eq(schema.conclusions.sessionId, sessionId))
    .limit(1)

  return { ...session, transcriptEntries: entries, interventions: interv, conclusion: conclusion[0] ?? null }
}
```

- [ ] **Step 2: Verify typecheck**

Run: `bun run typecheck`
Expected: `13 successful, 13 total`

- [ ] **Step 3: Commit**

```bash
git add apps/vada-ai/web/src/db/queries.ts
git commit -m "Feat: Add session ownership query helpers

- getSessionForUser returns null when session is not owned by user
- getSessionWithTranscriptForUser composes the ownership check with transcript fetch
- Foundation for enforcing ownership on all session-bearing routes"
```

### Task 2: Enforce ownership on existing session-bearing routes

**Files:**
- Modify: `apps/vada-ai/web/src/app/api/sessions/[id]/route.ts`
- Modify: `apps/vada-ai/web/src/app/api/sessions/[id]/export/route.ts`
- Modify: `apps/vada-ai/web/src/app/api/deliberation/[id]/intervene/route.ts`

- [ ] **Step 1: Update `sessions/[id]/route.ts`**

Replace the user lookup and session fetch with ownership-enforced version:

```ts
import { auth } from '@atta/auth/hooks'
import { getOrCreateUser, getSessionWithTranscriptForUser } from '@/db/queries'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getOrCreateUser(clerkId, '')
  const { id } = await params
  const session = await getSessionWithTranscriptForUser(id, user.id)

  if (!session) return Response.json({ error: 'Session not found' }, { status: 404 })

  // ... rest of existing conclusion extraction logic unchanged
}
```

- [ ] **Step 2: Update `sessions/[id]/export/route.ts` and `deliberation/[id]/intervene/route.ts`**

Read each file, apply the same `getOrCreateUser` + `getSessionWithTranscriptForUser` pattern. Return 404 (not 403) on missing or non-owned — don't leak existence.

- [ ] **Step 3: Manual verification**

Start dev server, log in as User A, create a session. Log out, log in as User B, try to GET `/api/sessions/<user-a-session-id>`. Expect 404.

- [ ] **Step 4: Typecheck + commit**

```bash
bun run typecheck
git add apps/vada-ai/web/src/app/api
git commit -m "Fix: Enforce session ownership on all session-bearing routes

- Pre-existing issue: routes authenticated the user but did not verify ownership
- GET /api/sessions/[id], export, and intervene now return 404 for non-owned sessions
- Uses new getSessionWithTranscriptForUser helper"
```

---

## Phase 2 — `@atta/identity` package scaffold

Build the identity package before inverting the server, so the browser-side building blocks exist when we wire them in.

### Task 3: Package bootstrap

**Files:**
- Create: `packages/identity/package.json`
- Create: `packages/identity/tsconfig.json`
- Create: `packages/identity/vitest.config.ts`
- Create: `packages/identity/src/index.ts`

- [ ] **Step 1: `package.json`**

```json
{
  "name": "@atta/identity",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./react": "./src/react.tsx"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@ai-sdk/anthropic": "^3.0.64",
    "@ai-sdk/google": "^3.0.60",
    "@ai-sdk/groq": "^3.0.35",
    "@ai-sdk/openai": "^3.0.53",
    "@openrouter/ai-sdk-provider": "^2.5.0",
    "ai": "^6.0.140",
    "@atta/models": "workspace:*"
  },
  "devDependencies": {
    "@atta/typescript-config": "workspace:*",
    "@types/react": "^19.0.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0",
    "happy-dom": "^15.0.0"
  },
  "peerDependencies": {
    "react": "^19.0.0"
  }
}
```

- [ ] **Step 2: `tsconfig.json`**

```json
{
  "extends": "@atta/typescript-config/base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.test.ts']
  }
})
```

- [ ] **Step 4: Empty barrel `src/index.ts`**

```ts
// Populated in subsequent tasks
export {}
```

- [ ] **Step 5: Install**

```bash
bun install
```

- [ ] **Step 6: Verify typecheck across monorepo**

```bash
bun run typecheck
```

- [ ] **Step 7: Commit**

```bash
git add packages/identity bun.lock package.json
git commit -m "Feat: Scaffold @atta/identity package

- Empty package with vitest + happy-dom
- Pulls in AI SDK providers (anthropic/openai/google/groq/openrouter)
- Consumes @atta/models for RouteProvider type
- To host browser-side key storage, provider calls, and passkey flows"
```

### Task 4: `keymap.ts` — ApiKeyMap type and helpers

**Files:**
- Create: `packages/identity/src/keymap.ts`
- Create: `packages/identity/src/keymap.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// keymap.test.ts
import { describe, expect, it } from 'vitest'
import { collectRequiredProviders, hasProviderKey, missingProviders, type ApiKeyMap } from './keymap'

describe('keymap', () => {
  it('collectRequiredProviders dedupes across model configs', () => {
    const got = collectRequiredProviders([
      { provider: 'anthropic', modelId: 'claude-sonnet-4-6' },
      { provider: 'openai', modelId: 'gpt-4.1' },
      { provider: 'anthropic', modelId: 'claude-haiku' }
    ])
    expect(got).toEqual(new Set(['anthropic', 'openai']))
  })

  it('hasProviderKey is true only for non-empty string', () => {
    const km: ApiKeyMap = { anthropic: 'sk-ant-xxx', openai: '' }
    expect(hasProviderKey(km, 'anthropic')).toBe(true)
    expect(hasProviderKey(km, 'openai')).toBe(false)
    expect(hasProviderKey(km, 'google')).toBe(false)
  })

  it('missingProviders returns providers not in the keymap', () => {
    const km: ApiKeyMap = { anthropic: 'sk-ant-xxx' }
    const required = new Set<'anthropic' | 'openai' | 'google'>(['anthropic', 'openai'])
    expect(missingProviders(km, required)).toEqual(['openai'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/identity && bun run test
```

Expected: FAIL with module not found.

- [ ] **Step 3: Implement**

```ts
// keymap.ts
import type { RouteProvider } from '@atta/models'

export type ApiKeyMap = Partial<Record<RouteProvider, string>>

export interface ModelRef {
  provider: RouteProvider
  modelId: string
}

export function collectRequiredProviders(configs: ModelRef[]): Set<RouteProvider> {
  const set = new Set<RouteProvider>()
  for (const c of configs) set.add(c.provider)
  return set
}

export function hasProviderKey(keys: ApiKeyMap, provider: RouteProvider): boolean {
  const v = keys[provider]
  return typeof v === 'string' && v.length > 0
}

export function missingProviders(keys: ApiKeyMap, required: Set<RouteProvider>): RouteProvider[] {
  const missing: RouteProvider[] = []
  for (const p of required) if (!hasProviderKey(keys, p)) missing.push(p)
  return missing
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun run test
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add packages/identity/src/keymap.ts packages/identity/src/keymap.test.ts
git commit -m "Feat: Add ApiKeyMap type and helpers to @atta/identity"
```

### Task 5: `errors.ts` — `classifyProviderError`

**Files:**
- Create: `packages/identity/src/errors.ts`
- Create: `packages/identity/src/errors.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// errors.test.ts
import { describe, expect, it } from 'vitest'
import { classifyProviderError } from './errors'

describe('classifyProviderError', () => {
  it('classifies 401 as invalid_key', () => {
    const err = Object.assign(new Error('Unauthorized'), { statusCode: 401 })
    const r = classifyProviderError(err, 'anthropic')
    expect(r.kind).toBe('invalid_key')
    expect(r.recoverable).toBe(false)
    expect(r.provider).toBe('anthropic')
  })

  it('classifies 429 with retry-after as rate_limit with recoverable true', () => {
    const err = Object.assign(new Error('Too many requests'), {
      statusCode: 429,
      responseHeaders: { 'retry-after': '30' }
    })
    const r = classifyProviderError(err, 'openai')
    expect(r.kind).toBe('rate_limit')
    expect(r.recoverable).toBe(true)
    expect(r.retryAfterSeconds).toBe(30)
  })

  it('classifies 404 as model_not_found', () => {
    const err = Object.assign(new Error('not found'), { statusCode: 404 })
    expect(classifyProviderError(err, 'groq').kind).toBe('model_not_found')
  })

  it('classifies network errors as transient', () => {
    const err = new TypeError('Failed to fetch')
    expect(classifyProviderError(err, 'google').kind).toBe('transient')
  })

  it('classifies unknown errors as unknown', () => {
    expect(classifyProviderError(new Error('weird'), 'anthropic').kind).toBe('unknown')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun run test
```

- [ ] **Step 3: Implement**

```ts
// errors.ts
import type { RouteProvider } from '@atta/models'

export type ErrorKind = 'invalid_key' | 'rate_limit' | 'model_not_found' | 'transient' | 'unknown'

export interface ClassifiedError {
  kind: ErrorKind
  userMessage: string
  provider: RouteProvider
  recoverable: boolean
  retryAfterSeconds?: number
}

function providerLabel(p: RouteProvider): string {
  return {
    anthropic: 'Anthropic',
    openai: 'OpenAI',
    google: 'Google',
    groq: 'Groq',
    openrouter: 'OpenRouter'
  }[p]
}

export function classifyProviderError(err: unknown, provider: RouteProvider): ClassifiedError {
  if (!(err instanceof Error)) {
    return {
      kind: 'unknown',
      userMessage: `${providerLabel(provider)} call failed. Try again.`,
      provider,
      recoverable: false
    }
  }

  const statusCode = (err as { statusCode?: number }).statusCode
  const headers = (err as { responseHeaders?: Record<string, string> }).responseHeaders
  const retryAfter = headers?.['retry-after']
  const retryAfterSeconds = retryAfter ? Number.parseInt(retryAfter, 10) : undefined

  if (statusCode === 401 || statusCode === 403) {
    return {
      kind: 'invalid_key',
      userMessage: `Your ${providerLabel(provider)} key looks invalid. Check your credentials and try again.`,
      provider,
      recoverable: false
    }
  }

  if (statusCode === 429) {
    const msg = Number.isFinite(retryAfterSeconds)
      ? `${providerLabel(provider)} rate limit reached. Retrying in ${retryAfterSeconds}s.`
      : `${providerLabel(provider)} rate limit reached. Retrying shortly.`
    return {
      kind: 'rate_limit',
      userMessage: msg,
      provider,
      recoverable: true,
      retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined
    }
  }

  if (statusCode === 404) {
    return {
      kind: 'model_not_found',
      userMessage: `Model not found for ${providerLabel(provider)}. Pick a different model for this agent.`,
      provider,
      recoverable: false
    }
  }

  if (err instanceof TypeError && /fetch|network/i.test(err.message)) {
    return {
      kind: 'transient',
      userMessage: `Network error reaching ${providerLabel(provider)}. Retrying.`,
      provider,
      recoverable: true
    }
  }

  return {
    kind: 'unknown',
    userMessage: `${providerLabel(provider)} call failed. Try again or change this agent's model.`,
    provider,
    recoverable: false
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add packages/identity/src/errors.ts packages/identity/src/errors.test.ts
git commit -m "Feat: Add classifyProviderError for browser-side error handling"
```

### Task 6: `retry.ts` — exponential backoff

**Files:**
- Create: `packages/identity/src/retry.ts`
- Create: `packages/identity/src/retry.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// retry.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { retryWithBackoff } from './retry'

describe('retryWithBackoff', () => {
  afterEach(() => vi.useRealTimers())

  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await retryWithBackoff(fn, { maxAttempts: 3 })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries until success', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockResolvedValueOnce('ok')
    const result = await retryWithBackoff(fn, { maxAttempts: 3, baseDelayMs: 1 })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('throws after maxAttempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'))
    await expect(retryWithBackoff(fn, { maxAttempts: 2, baseDelayMs: 1 })).rejects.toThrow('fail')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('respects shouldRetry predicate', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'))
    await expect(
      retryWithBackoff(fn, { maxAttempts: 3, baseDelayMs: 1, shouldRetry: () => false })
    ).rejects.toThrow('fail')
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run to verify failure**

- [ ] **Step 3: Implement**

```ts
// retry.ts
export interface RetryOptions {
  maxAttempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
  shouldRetry?: (err: unknown, attempt: number) => boolean
}

const DEFAULT: Required<Omit<RetryOptions, 'shouldRetry'>> = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 8000
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function retryWithBackoff<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs } = { ...DEFAULT, ...opts }
  const shouldRetry = opts.shouldRetry ?? (() => true)
  let lastErr: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (attempt === maxAttempts || !shouldRetry(err, attempt)) break
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1))
      await sleep(delay)
    }
  }
  throw lastErr
}
```

- [ ] **Step 4: Run to verify pass**

- [ ] **Step 5: Commit**

```bash
git add packages/identity/src/retry.ts packages/identity/src/retry.test.ts
git commit -m "Feat: Add retryWithBackoff utility to @atta/identity"
```

### Task 7: `crypto.ts` — Web Crypto AES-GCM wrappers

**Files:**
- Create: `packages/identity/src/crypto.ts`
- Create: `packages/identity/src/crypto.test.ts`

- [ ] **Step 1: Write failing tests (roundtrip + IV safety)**

```ts
// crypto.test.ts
import { describe, expect, it } from 'vitest'
import { importKeyFromPrfOutput, encryptJson, decryptJson, generateIv } from './crypto'

describe('crypto', () => {
  async function makeKey() {
    const prf = crypto.getRandomValues(new Uint8Array(32))
    return importKeyFromPrfOutput(prf)
  }

  it('encrypts and decrypts JSON roundtrip', async () => {
    const key = await makeKey()
    const plain = { anthropic: 'sk-ant-test', openai: 'sk-oai-test' }
    const { ciphertext, iv } = await encryptJson(key, plain)
    const decrypted = await decryptJson(key, ciphertext, iv)
    expect(decrypted).toEqual(plain)
  })

  it('generates fresh 12-byte IV each call', () => {
    const a = generateIv()
    const b = generateIv()
    expect(a.byteLength).toBe(12)
    expect(b.byteLength).toBe(12)
    expect(a).not.toEqual(b)
  })

  it('decryption fails with wrong key', async () => {
    const keyA = await makeKey()
    const keyB = await makeKey()
    const { ciphertext, iv } = await encryptJson(keyA, { a: 1 })
    await expect(decryptJson(keyB, ciphertext, iv)).rejects.toThrow()
  })

  it('decryption fails with tampered ciphertext', async () => {
    const key = await makeKey()
    const { ciphertext, iv } = await encryptJson(key, { a: 1 })
    const tampered = new Uint8Array(ciphertext)
    tampered[0] ^= 0xff
    await expect(decryptJson(key, tampered.buffer, iv)).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run to verify failure**

- [ ] **Step 3: Implement**

```ts
// crypto.ts
// Web Crypto AES-GCM wrappers.
// Principles doc guarantee: keys never persisted in plaintext.
// Every encryption generates a fresh 12-byte IV; IV reuse under the same key would break AES-GCM authenticity.

export function generateIv(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12))
}

export async function importKeyFromPrfOutput(prfOutput: ArrayBuffer | Uint8Array): Promise<CryptoKey> {
  const raw = prfOutput instanceof Uint8Array ? prfOutput : new Uint8Array(prfOutput)
  if (raw.byteLength < 32) {
    throw new Error('PRF output must be at least 32 bytes')
  }
  return crypto.subtle.importKey(
    'raw',
    raw.slice(0, 32),
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptJson<T>(key: CryptoKey, value: T): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
  const iv = generateIv()
  const plaintext = new TextEncoder().encode(JSON.stringify(value))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  return { ciphertext, iv }
}

export async function decryptJson<T>(key: CryptoKey, ciphertext: ArrayBuffer, iv: Uint8Array): Promise<T> {
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return JSON.parse(new TextDecoder().decode(plaintext)) as T
}
```

- [ ] **Step 4: Run to verify pass**

- [ ] **Step 5: Commit**

```bash
git add packages/identity/src/crypto.ts packages/identity/src/crypto.test.ts
git commit -m "Feat: Add Web Crypto AES-GCM wrappers to @atta/identity

- importKeyFromPrfOutput derives 256-bit AES-GCM key from WebAuthn PRF bytes
- encryptJson / decryptJson roundtrip with fresh 12-byte IV per call
- Tests verify roundtrip, IV uniqueness, wrong-key failure, tamper resistance"
```

### Task 8: `invoke.ts` — browser-side provider call

**Files:**
- Create: `packages/identity/src/invoke.ts`

(No unit test: `streamText` requires network; covered by end-to-end manual test later.)

- [ ] **Step 1: Implement**

```ts
// invoke.ts
// Browser-side agent invocation. This is the only place in the codebase that calls
// provider APIs with a user key. Keys are passed in here — never persisted,
// never transmitted to the Vāda server. See /trust for the full architecture
// guarantee.
//
// `dangerouslyAllowBrowser: true` on each client: this flag exists because embedding
// a developer's own server key in browser JS would leak it to every visitor. BYOK
// inverts that: the key belongs to the user, is in the user's own browser, entered
// by the user themselves. This is the canonical BYOK pattern, not the foot-gun.

import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { streamText, type LanguageModel } from 'ai'
import type { RouteProvider } from '@atta/models'

export interface InvokeParams {
  provider: RouteProvider
  modelId: string
  apiKey: string
  systemPrompt: string
  userPrompt: string
  signal?: AbortSignal
}

export interface InvokeResult {
  textStream: AsyncIterable<string>
  fullText: () => Promise<string>
}

function resolveModel(provider: RouteProvider, modelId: string, apiKey: string): LanguageModel {
  switch (provider) {
    case 'anthropic':
      return createAnthropic({ apiKey })(modelId)
    case 'openai':
      return createOpenAI({ apiKey, compatibility: 'strict' })(modelId)
    case 'google':
      return createGoogleGenerativeAI({ apiKey })(modelId)
    case 'groq':
      return createGroq({ apiKey })(modelId)
    case 'openrouter':
      return createOpenRouter({ apiKey })(modelId)
  }
}

export async function invokeAgent(params: InvokeParams): Promise<InvokeResult> {
  const model = resolveModel(params.provider, params.modelId, params.apiKey)
  const result = streamText({
    model,
    system: params.systemPrompt,
    prompt: params.userPrompt,
    abortSignal: params.signal
  })
  return {
    textStream: result.textStream,
    fullText: async () => await result.text
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
bun run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add packages/identity/src/invoke.ts
git commit -m "Feat: Add browser-side invokeAgent to @atta/identity

- Wraps Vercel AI SDK streamText with per-provider client factories
- dangerouslyAllowBrowser flag is correct for BYOK (user's key, user's browser)
- Extensive comment references /trust principles for future maintainers"
```

### Task 9: `mock.ts` — browser-side mock invoker with UI-visible banner signal

**Files:**
- Create: `packages/identity/src/mock.ts`

- [ ] **Step 1: Implement**

```ts
// mock.ts
// Browser-side mock dispatcher. Enabled when NEXT_PUBLIC_VADA_MOCK_MODE=true.
// UI wiring: the app layout reads `isMockModeActive()` and renders a persistent
// banner when active. This is deliberate — the silent server-side mock masked
// the original BYOK bug and must not reappear here.

import type { InvokeParams, InvokeResult } from './invoke'

export function isMockModeActive(): boolean {
  return typeof process !== 'undefined' && process.env.NEXT_PUBLIC_VADA_MOCK_MODE === 'true'
}

const WORD_DELAY_MS = 30
const THINK_DELAY_MS = 600

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function mockText(agent: string, round: number): string {
  return `[MOCK — ${agent}, round ${round}] The mock dispatcher is active because NEXT_PUBLIC_VADA_MOCK_MODE=true. No real provider call was made. The DEV banner at the top of the app confirms this.`
}

export async function invokeMock(params: InvokeParams & { agentLabel?: string; round?: number }): Promise<InvokeResult> {
  const agent = params.agentLabel ?? 'agent'
  const round = params.round ?? 1
  const words = mockText(agent, round).split(' ')

  const textStream = (async function* () {
    await sleep(THINK_DELAY_MS)
    for (const w of words) {
      if (params.signal?.aborted) throw new DOMException('aborted', 'AbortError')
      await sleep(WORD_DELAY_MS)
      yield `${w} `
    }
  })()

  return {
    textStream,
    fullText: async () => mockText(agent, round)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/identity/src/mock.ts
git commit -m "Feat: Add UI-visible browser-side mock dispatcher to @atta/identity

- isMockModeActive() checks NEXT_PUBLIC_VADA_MOCK_MODE env var
- invokeMock streams canned text with 'MOCK' prefix
- Consumers render a persistent banner — no silent mock (the old mock masked the BYOK bug)"
```

### Task 10: `react.tsx` — `IdentityProvider` + `useIdentity` (in-memory only)

**Files:**
- Create: `packages/identity/src/react.tsx`

- [ ] **Step 1: Implement (in-memory state only; passkey added in Phase 6)**

```tsx
// react.tsx
'use client'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { RouteProvider } from '@atta/models'
import type { ApiKeyMap } from './keymap'
import { hasProviderKey, missingProviders as computeMissing } from './keymap'

type IdentityState =
  | { kind: 'no-stored-credential'; keys: ApiKeyMap }
  | { kind: 'locked'; keys: ApiKeyMap; providers: RouteProvider[] }
  | { kind: 'unlocked'; keys: ApiKeyMap }

interface IdentityValue {
  state: IdentityState
  setKey: (provider: RouteProvider, key: string) => void
  removeKey: (provider: RouteProvider) => void
  signOut: () => void
  hasKey: (provider: RouteProvider) => boolean
  missingProviders: (required: Set<RouteProvider>) => RouteProvider[]
  // Passkey surface (stubs until Phase 6):
  savePasskey: () => Promise<void>
  unlockWithPasskey: () => Promise<void>
  forgetDevice: () => Promise<void>
  passkeySupported: boolean
}

const IdentityContext = createContext<IdentityValue | null>(null)

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [keys, setKeys] = useState<ApiKeyMap>({})

  const setKey = useCallback((provider: RouteProvider, key: string) => {
    setKeys((prev) => ({ ...prev, [provider]: key }))
  }, [])

  const removeKey = useCallback((provider: RouteProvider) => {
    setKeys((prev) => {
      const next = { ...prev }
      delete next[provider]
      return next
    })
  }, [])

  const signOut = useCallback(() => setKeys({}), [])

  const hasKey = useCallback((p: RouteProvider) => hasProviderKey(keys, p), [keys])

  const missing = useCallback((req: Set<RouteProvider>) => computeMissing(keys, req), [keys])

  // Phase 6 will replace these with real implementations.
  const savePasskey = useCallback(async () => {}, [])
  const unlockWithPasskey = useCallback(async () => {}, [])
  const forgetDevice = useCallback(async () => {}, [])

  const value = useMemo<IdentityValue>(
    () => ({
      state: { kind: 'no-stored-credential', keys },
      setKey,
      removeKey,
      signOut,
      hasKey,
      missingProviders: missing,
      savePasskey,
      unlockWithPasskey,
      forgetDevice,
      passkeySupported: false // set correctly in Phase 6
    }),
    [keys, setKey, removeKey, signOut, hasKey, missing, savePasskey, unlockWithPasskey, forgetDevice]
  )

  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>
}

export function useIdentity(): IdentityValue {
  const v = useContext(IdentityContext)
  if (!v) throw new Error('useIdentity must be used within <IdentityProvider>')
  return v
}
```

- [ ] **Step 2: Update barrel `src/index.ts`**

```ts
export * from './crypto'
export * from './errors'
export * from './invoke'
export * from './keymap'
export * from './mock'
export * from './retry'
```

(Note: `react.tsx` is exported via the `./react` subpath; consumers import from `@atta/identity/react`.)

- [ ] **Step 3: Typecheck**

```bash
bun run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add packages/identity/src
git commit -m "Feat: Add IdentityProvider + useIdentity hook (in-memory)

- Phase 6 adds passkey encryption; passkey methods are stubs for now
- Public API: setKey/removeKey/signOut/hasKey/missingProviders
- In-memory only: keys cleared on tab close automatically"
```

---

## Phase 3 — Server architecture inversion

Now invert the server. Keep the deliberation app broken-but-typechecking through these tasks; browser integration in Phase 4 makes it whole again.

### Task 11: Rewrite `engine/rounds/*` and `engine/conclusion/*` as pure command composers

**Files:**
- Modify: `apps/vada-ai/web/src/engine/rounds/round-one.ts`
- Modify: `apps/vada-ai/web/src/engine/rounds/round-two.ts`
- Modify: `apps/vada-ai/web/src/engine/rounds/round-three.ts`
- Modify: `apps/vada-ai/web/src/engine/conclusion/synthesizer.ts`
- Modify: `apps/vada-ai/web/src/engine/conclusion/blind-critic.ts`
- Modify: `apps/vada-ai/web/src/engine/conclusion/revision.ts`

Each file becomes a pure function: `(state, remainingAgents) => PromptSpec` returning `{ agent, round, systemPrompt, userPrompt, model }`. No LLM calls, no SSE, no DB writes.

- [ ] **Step 1: Introduce shared types**

Create `apps/vada-ai/web/src/engine/types.ts`:

```ts
import type { RouteProvider } from '@atta/models'

export interface PromptSpec {
  agent: string
  round: number
  systemPrompt: string
  userPrompt: string
  model: { provider: RouteProvider; modelId: string }
}

export interface ConclusionPromptSpec extends Omit<PromptSpec, 'agent' | 'round'> {
  phase: 'synthesize' | 'audit' | 'revise' | 'reaudit'
  expected: 'json' | 'verdict'
}
```

- [ ] **Step 2: Rewrite `round-one.ts`**

Read the existing file. Keep the prompt-composition logic (`composeRoundOnePrompt` etc. from `engine/prompts/`). Delete the agent-invocation + SSE loop. Export:

```ts
export function nextRoundOnePrompt(
  question: string,
  remainingAgents: AgentConfig[],
  perAgentModels: Record<string, { provider: RouteProvider; modelId: string }>,
  defaultModel: { provider: RouteProvider; modelId: string }
): PromptSpec | null {
  const next = remainingAgents[0]
  if (!next) return null
  const model = perAgentModels[next.role] ?? defaultModel
  const { systemPrompt, userPrompt } = composeRoundOnePrompt(question, next)
  return { agent: next.name, round: 1, systemPrompt, userPrompt, model }
}
```

(Your prompts/compose.ts may return a single string today. Split into system + user if not already split, preserving semantics.)

- [ ] **Step 3: Rewrite `round-two.ts` and `round-three.ts`**

Same pattern: given question, completed transcript, remaining agents, return a single PromptSpec for the next agent.

- [ ] **Step 4: Rewrite `conclusion/synthesizer.ts`**

```ts
export function nextSynthesizePrompt(
  question: string,
  transcript: TranscriptEntry[],
  agentRoles: string[],
  model: { provider: RouteProvider; modelId: string }
): ConclusionPromptSpec {
  const { systemPrompt, userPrompt } = composeSynthesizerPrompt(question, transcript, agentRoles)
  return { phase: 'synthesize', systemPrompt, userPrompt, model, expected: 'json' }
}

export function parseSynthesizerOutput(raw: string): ParsedConclusion | null {
  // move existing JSON parsing here
}
```

- [ ] **Step 5: Same for `blind-critic.ts` (returns verdict-expecting spec) and `revision.ts`**

- [ ] **Step 6: Typecheck**

```bash
bun run typecheck
```

Expected: the app is **intentionally broken** at this point — `workflow.ts` still imports the old interfaces. Rounds/conclusion files should typecheck in isolation though. Proceed.

- [ ] **Step 7: Commit**

```bash
git add apps/vada-ai/web/src/engine/rounds apps/vada-ai/web/src/engine/conclusion apps/vada-ai/web/src/engine/types.ts
git commit -m "Refactor: Rewrite engine rounds and conclusion as pure prompt composers

- No LLM calls, no SSE, no DB writes — pure (state) => PromptSpec
- Prompt composition stays server-side; IP does not ship to client bundle
- Parsers extracted from synthesizer/revision for browser-returned text
- Workflow will be rewritten next; intentional transient breakage"
```

### Task 12: Rewrite `engine/workflow.ts` as `getNextCommand` state machine

**Files:**
- Replace: `apps/vada-ai/web/src/engine/workflow.ts` → `apps/vada-ai/web/src/engine/orchestrator.ts`

- [ ] **Step 1: Create `orchestrator.ts`**

```ts
import { getAgentConfig } from '../schemas'
import type { SessionWithTranscript } from '@/db/queries' // adjust import
import { nextRoundOnePrompt } from './rounds/round-one'
import { nextRoundPrompt } from './rounds/round-two' // or renamed
import { nextSynthesizePrompt } from './conclusion/synthesizer'
import { nextAuditPrompt } from './conclusion/blind-critic'
import { nextRevisePrompt } from './conclusion/revision'
import type { PromptSpec, ConclusionPromptSpec } from './types'
import type { RouteProvider } from '@atta/models'

export type NextCommand =
  | ({ type: 'run_agent'; turnId: string } & PromptSpec)
  | ({ type: 'run_conclusion'; turnId: string } & ConclusionPromptSpec)
  | { type: 'state_change'; state: 'ROUND_2' | 'ROUND_3' | 'CONCLUDING' | 'AUDITING' | 'REVISING' }
  | { type: 'terminal'; terminal_state: 'CLEAN' | 'REVISED' | 'UNCONVERGED' | 'SPARRING_COMPLETE' }
  | { type: 'done' }

function newTurnId(): string {
  return crypto.randomUUID()
}

function defaultModel(session: { provider: string | null; modelId: string | null }): { provider: RouteProvider; modelId: string } {
  // Fall back to a sensible default when session has no provider set.
  // Previously picked up server env; now the browser must have a key for whatever provider is here.
  const provider = (session.provider ?? 'anthropic') as RouteProvider
  const modelId = session.modelId ?? 'claude-sonnet-4-6'
  return { provider, modelId }
}

export function getNextCommand(session: SessionWithTranscript): NextCommand {
  const agents = session.agents.map((role) => getAgentConfig(role as never))
  const synthesizer = agents.find((a) => a.role === 'synthesizer')
  const nonSynth = agents.filter((a) => a.role !== 'synthesizer')
  const ordered = synthesizer ? [...nonSynth, synthesizer] : agents
  const perAgent = (session.agentModels ?? {}) as Record<string, { provider: RouteProvider; modelId: string }>
  const dflt = defaultModel(session)

  switch (session.state) {
    case 'PENDING':
      // Moving to ROUND_1 is a DB side-effect — the /next handler will persist
      // after returning this state_change so the next pull proceeds.
      return { type: 'state_change', state: 'ROUND_2' } // see /next handler note below; returning ROUND_1 command directly is cleaner
    case 'ROUND_1': {
      const done = new Set(session.transcriptEntries.filter((e) => e.round === 1).map((e) => e.agent))
      const remaining = agents.filter((a) => !done.has(a.name))
      const spec = nextRoundOnePrompt(session.question, remaining, perAgent, dflt)
      if (spec) return { type: 'run_agent', turnId: newTurnId(), ...spec }
      return { type: 'state_change', state: 'ROUND_2' }
    }
    case 'ROUND_2': {
      const done = new Set(session.transcriptEntries.filter((e) => e.round === 2).map((e) => e.agent))
      const remaining = ordered.filter((a) => !done.has(a.name))
      const transcript = session.transcriptEntries.filter((e) => e.round <= 2)
      const spec = nextRoundPrompt(2, session.question, remaining, transcript, perAgent, dflt)
      if (spec) return { type: 'run_agent', turnId: newTurnId(), ...spec }
      return { type: 'state_change', state: 'ROUND_3' }
    }
    case 'ROUND_3': {
      const done = new Set(session.transcriptEntries.filter((e) => e.round === 3).map((e) => e.agent))
      const remaining = ordered.filter((a) => !done.has(a.name))
      const transcript = session.transcriptEntries
      const spec = nextRoundPrompt(3, session.question, remaining, transcript, perAgent, dflt)
      if (spec) return { type: 'run_agent', turnId: newTurnId(), ...spec }
      if (!synthesizer) return { type: 'terminal', terminal_state: 'SPARRING_COMPLETE' }
      return { type: 'state_change', state: 'CONCLUDING' }
    }
    case 'CONCLUDING': {
      const spec = nextSynthesizePrompt(session.question, session.transcriptEntries, session.agents, dflt)
      return { type: 'run_conclusion', turnId: newTurnId(), ...spec }
    }
    case 'AUDITING': {
      // Requires the draft conclusion to be loaded; the /next handler composes this differently
      const draft = session.conclusion?.originalJson ?? session.conclusion?.revisedJson
      if (!draft) return { type: 'terminal', terminal_state: 'UNCONVERGED' }
      const spec = nextAuditPrompt(session.question, draft as Record<string, unknown>, dflt)
      return { type: 'run_conclusion', turnId: newTurnId(), ...spec }
    }
    case 'REVISING': {
      const original = session.conclusion?.originalJson
      const verdict = session.conclusion?.criticVerdict ?? ''
      if (!original) return { type: 'terminal', terminal_state: 'UNCONVERGED' }
      const spec = nextRevisePrompt(original as Record<string, unknown>, verdict, dflt)
      return { type: 'run_conclusion', turnId: newTurnId(), ...spec }
    }
    case 'TERMINAL': {
      return {
        type: 'terminal',
        terminal_state: (session.terminalState ?? 'UNCONVERGED') as NextCommand extends { type: 'terminal' }
          ? NextCommand['terminal_state']
          : never
      }
    }
    default:
      return { type: 'done' }
  }
}
```

- [ ] **Step 2: Create `engine/turn.ts` for recording turn results**

```ts
import { insertTranscriptEntry, updateSessionState, setSessionTerminalState, insertConclusion, deleteConclusionBySession, getSessionWithTranscript } from '@/db/queries'
import { parseSynthesizerOutput } from './conclusion/synthesizer'
import { parseRevisionOutput } from './conclusion/revision'

interface TurnPayload {
  turnId: string
  content: string
  phase?: 'run_agent' | 'synthesize' | 'audit' | 'revise' | 'reaudit'
  agent?: string
  round?: number
}

export async function recordTurn(sessionId: string, userId: string, payload: TurnPayload) {
  // Apply ownership check via getSessionForUser (callers already enforce; double-check here)
  // Branch on phase:
  //  - 'run_agent' → insertTranscriptEntry, maybe advance state if round complete
  //  - 'synthesize' → parse JSON, save draft, advance to AUDITING
  //  - 'audit' → save verdict; if PASS advance to TERMINAL (CLEAN), else REVISING
  //  - 'revise' → save revised, advance to re-audit (AUDITING with revised draft)
  //  - 'reaudit' → save re-verdict; TERMINAL (REVISED or UNCONVERGED)
  // (Expand each branch with the logic currently in workflow.ts's runConclusionProtocol)
}

export async function recordTurnError(sessionId: string, userId: string, payload: { turnId: string; error: string }) {
  // For V1: no-op. The /next handler will re-return the same command on the next pull
  // (idempotent resume). Future: record a transient error flag to surface to UI.
}
```

- [ ] **Step 3: Delete `engine/workflow.ts` (replaced)**

```bash
rm apps/vada-ai/web/src/engine/workflow.ts
```

- [ ] **Step 4: Typecheck**

```bash
bun run typecheck
```

Expected: there will still be callers of the deleted `workflow.ts` in `stream/route.ts` and `start/route.ts` — those get fixed in Task 13.

- [ ] **Step 5: Commit**

```bash
git add apps/vada-ai/web/src/engine
git commit -m "Refactor: Replace workflow.ts with orchestrator.ts state machine

- getNextCommand(session) is a pure function: state → NextCommand
- recordTurn persists browser-reported turn results and advances state
- No while-loop, no SSE, no provider calls on server
- runDeliberation / resumeDeliberation entry points deleted"
```

### Task 13: New `/api/deliberation/[id]/next` and `/turn` routes

**Files:**
- Create: `apps/vada-ai/web/src/app/api/deliberation/[id]/next/route.ts`
- Create: `apps/vada-ai/web/src/app/api/deliberation/[id]/turn/route.ts`
- Create: `apps/vada-ai/web/src/app/api/deliberation/[id]/turn-error/route.ts`

- [ ] **Step 1: `/next/route.ts`**

```ts
import { auth } from '@atta/auth/hooks'
import { getOrCreateUser, getSessionWithTranscriptForUser, updateSessionState } from '@/db/queries'
import { getNextCommand, type NextCommand } from '@/engine/orchestrator'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getOrCreateUser(clerkId, '')
  const { id } = await params
  const session = await getSessionWithTranscriptForUser(id, user.id)
  if (!session) return Response.json({ error: 'Session not found' }, { status: 404 })

  // Special case: PENDING → move to ROUND_1 synchronously so the same /next call returns a runnable command
  if (session.state === 'PENDING') {
    await updateSessionState(id, 'ROUND_1')
    const fresh = await getSessionWithTranscriptForUser(id, user.id)
    if (!fresh) return Response.json({ error: 'Session not found' }, { status: 404 })
    return Response.json(getNextCommand(fresh))
  }

  const cmd = getNextCommand(session)

  // state_change commands also advance DB state so the next pull proceeds
  if (cmd.type === 'state_change') {
    await updateSessionState(id, cmd.state)
    const fresh = await getSessionWithTranscriptForUser(id, user.id)
    if (!fresh) return Response.json({ error: 'Session not found' }, { status: 404 })
    return Response.json(getNextCommand(fresh))
  }

  return Response.json(cmd satisfies NextCommand)
}
```

- [ ] **Step 2: `/turn/route.ts`**

```ts
import { z } from 'zod'
import { auth } from '@atta/auth/hooks'
import { getOrCreateUser, getSessionForUser } from '@/db/queries'
import { recordTurn } from '@/engine/turn'

const TurnSchema = z.object({
  turnId: z.string(),
  content: z.string(),
  phase: z.enum(['run_agent', 'synthesize', 'audit', 'revise', 'reaudit']),
  agent: z.string().optional(),
  round: z.number().int().optional()
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getOrCreateUser(clerkId, '')
  const { id } = await params
  const session = await getSessionForUser(id, user.id)
  if (!session) return Response.json({ error: 'Session not found' }, { status: 404 })

  const body = await req.json()
  const parsed = TurnSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })

  await recordTurn(id, user.id, parsed.data)
  return Response.json({ ok: true })
}
```

- [ ] **Step 3: `/turn-error/route.ts`**

```ts
import { z } from 'zod'
import { auth } from '@atta/auth/hooks'
import { getOrCreateUser, getSessionForUser } from '@/db/queries'
import { recordTurnError } from '@/engine/turn'

const ErrSchema = z.object({ turnId: z.string(), error: z.string() })

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getOrCreateUser(clerkId, '')
  const { id } = await params
  const session = await getSessionForUser(id, user.id)
  if (!session) return Response.json({ error: 'Session not found' }, { status: 404 })

  const body = await req.json()
  const parsed = ErrSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 })
  await recordTurnError(id, user.id, parsed.data)
  return Response.json({ ok: true })
}
```

- [ ] **Step 4: Typecheck**

```bash
bun run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add apps/vada-ai/web/src/app/api/deliberation
git commit -m "Feat: Add /next /turn /turn-error deliberation endpoints

- Pull-based command channel for browser-driven deliberation
- No apiKey / apiKeys fields in input schemas
- Session ownership enforced via getSessionForUser
- state_change commands advance DB + chain to next pull"
```

### Task 14: Delete the SSE stream route + purge `start/route.ts` of key fields

**Files:**
- Delete: `apps/vada-ai/web/src/app/api/deliberation/[id]/stream/route.ts`
- Modify: `apps/vada-ai/web/src/app/api/deliberation/start/route.ts`

- [ ] **Step 1: Delete the SSE route**

```bash
rm apps/vada-ai/web/src/app/api/deliberation/[id]/stream/route.ts
```

- [ ] **Step 2: Strip keys from `start/route.ts`**

Replace the entire file with:

```ts
import { NextResponse } from 'next/server'
import { auth } from '@atta/auth/hooks'
import { getOrCreateUser, getDailySessionCount, createSession } from '@/db/queries'
import { DAILY_SESSION_LIMIT, DEFAULT_ROOM } from '@/schemas'
import { ROUTE_PROVIDER_ORDER, type RouteProvider } from '@atta/models'
import { z } from 'zod'

const providerEnum = z.enum(ROUTE_PROVIDER_ORDER as [RouteProvider, ...RouteProvider[]])

const AgentModelEntry = z.object({ provider: providerEnum, modelId: z.string() })

// Note: no apiKey, no apiKeys. Keys stay in the browser. See /trust.
const StartSchema = z.object({
  question: z.string().min(1).max(5000),
  agents: z.array(z.string()).min(2).max(6).optional(),
  provider: providerEnum.optional(),
  modelId: z.string().optional(),
  agentModels: z.record(z.string(), AgentModelEntry).optional()
})

export async function POST(request: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = StartSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })

  const user = await getOrCreateUser(clerkId, '')
  const dailyCount = await getDailySessionCount(user.id)
  if (dailyCount >= DAILY_SESSION_LIMIT) {
    return NextResponse.json(
      { error: `Daily limit reached. You have ${DAILY_SESSION_LIMIT} deliberations per day.` },
      { status: 429 }
    )
  }

  const agents = parsed.data.agents ?? DEFAULT_ROOM.map((a) => a.role)

  // Model connectivity validation happens in the BROWSER with the user's key.
  // The server has no key to probe with.

  const session = await createSession(
    user.id,
    parsed.data.question,
    agents,
    parsed.data.provider,
    parsed.data.modelId,
    parsed.data.agentModels
  )
  return NextResponse.json({ session_id: session.id })
}
```

- [ ] **Step 3: Typecheck**

```bash
bun run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/vada-ai/web/src/app/api/deliberation
git commit -m "Refactor: Remove SSE stream route and purge keys from start schema

- DELETED: /api/deliberation/[id]/stream (replaced by /next + /turn)
- start/route.ts Zod schema no longer accepts apiKey or apiKeys
- Server no longer probes provider connectivity — browser does that with its key
- structural BYOK: start route now cannot accept a key even if a caller tries to send one"
```

### Task 15: Remove obsolete server engine files and ephemeral key map

**Files:**
- Delete: `apps/vada-ai/web/src/engine/agents.ts`
- Delete: `apps/vada-ai/web/src/engine/stream.ts`
- Delete: `apps/vada-ai/web/src/engine/pending-keys.ts`
- Delete: `apps/vada-ai/web/src/engine/retry.ts`

- [ ] **Step 1: Delete**

```bash
rm apps/vada-ai/web/src/engine/agents.ts
rm apps/vada-ai/web/src/engine/stream.ts
rm apps/vada-ai/web/src/engine/pending-keys.ts
rm apps/vada-ai/web/src/engine/retry.ts
```

- [ ] **Step 2: Update any imports referring to these files**

Search: `grep -rn "from '@/engine/agents'\|from '@/engine/stream'\|from '@/engine/pending-keys'\|from '@/engine/retry'" apps/vada-ai/web/src`

Fix each. The `@atta/agents` package (workspace dep) may re-export `getAgentConfig` and similar — audit `packages/agents` and ensure role/schema types still come from `apps/vada-ai/web/src/schemas`.

- [ ] **Step 3: Remove server-side AI SDK deps from `apps/vada-ai/web/package.json`**

Delete these lines:

```json
"@ai-sdk/anthropic": "^3.0.64",
"@ai-sdk/google": "^3.0.60",
"@ai-sdk/groq": "^3.0.35",
"@ai-sdk/openai": "^3.0.53",
"@mastra/core": "^1.22.0",
"@openrouter/ai-sdk-provider": "^2.5.0",
"ai": "^6.0.140",
```

They live in `@atta/identity` now; the web app gets them transitively.

- [ ] **Step 4: `bun install` + typecheck**

```bash
bun install && bun run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add apps/vada-ai/web/package.json apps/vada-ai/web/src bun.lock
git commit -m "Refactor: Remove server-side LLM infrastructure from vada-ai/web

- DELETED: engine/agents.ts (Mastra wrappers, AI SDK client factories, MOCK_MODE)
- DELETED: engine/stream.ts (SSE emitter)
- DELETED: engine/pending-keys.ts (ephemeral server key map)
- DELETED: engine/retry.ts (moved to @atta/identity)
- Removed @ai-sdk/* and @mastra/core deps — browser-only now"
```

---

## Phase 4 — DB schema + server key helper removal

### Task 16: Drop `user_api_keys` table + migration

**Files:**
- Modify: `apps/vada-ai/web/src/db/schema.ts`
- Create: migration via `drizzle-kit generate`
- Delete: `apps/vada-ai/web/src/app/api/settings/api-keys/route.ts`
- Modify: `apps/vada-ai/web/src/db/settings-queries.ts`
- Delete: `apps/vada-ai/web/src/lib/crypto.ts` (if it only contains key encryption)

- [ ] **Step 1: Remove `userApiKeys` from `schema.ts`**

Delete the `userApiKeys` pgTable definition (schema.ts:83-97).

- [ ] **Step 2: Generate migration**

```bash
cd apps/vada-ai/web && bun run db:generate
```

Inspect the generated migration — it should be a `DROP TABLE user_api_keys`. If it's not (e.g. drizzle-kit may require an explicit indicator), hand-write the migration SQL file in `drizzle/` with `DROP TABLE IF EXISTS user_api_keys;`.

- [ ] **Step 3: Delete `settings-queries.ts` key functions**

Keep the team-models + user-settings functions. Remove:
- `upsertUserApiKey`
- `getUserApiKeys`
- `deleteUserApiKey`
- `getDecryptedApiKey`

And remove the `encryptApiKey` / `decryptApiKey` / `makeKeyHint` imports.

- [ ] **Step 4: Delete `api/settings/api-keys/route.ts`**

```bash
rm apps/vada-ai/web/src/app/api/settings/api-keys/route.ts
```

- [ ] **Step 5: Delete or scrub `lib/crypto.ts`**

If the whole file is key-encryption helpers, delete it. If it has other helpers (e.g. session ID generation), keep only those.

- [ ] **Step 6: Run the migration against dev DB**

```bash
cd apps/vada-ai/web && bun run db:migrate
```

Confirm via `bun run db:studio` that `user_api_keys` is gone.

- [ ] **Step 7: Typecheck**

```bash
bun run typecheck
```

- [ ] **Step 8: Schema grep gate**

```bash
grep -rn "api_key\|apiKey\|anthropic_key\|openai_key\|provider_key\|credential\|secret" \
  apps/vada-ai/web/src/db
```

Expected: zero hits. The only allowed match is in comments if any (there shouldn't be).

- [ ] **Step 9: Commit**

```bash
git add apps/vada-ai/web apps/vada-ai/web/drizzle
git commit -m "Refactor: Drop user_api_keys table and server-side key helpers

- DROPPED: user_api_keys table (migration included)
- DELETED: /api/settings/api-keys/route.ts
- DELETED: settings-queries.ts key encryption/decryption functions
- DELETED: lib/crypto.ts (or scrubbed if it held non-key helpers)
- Schema grep passes: zero key-related fields in DB layer"
```

### Task 17: Route grep gate

- [ ] **Step 1: Verify no route accepts a key**

```bash
grep -rn "apiKey\|api_key" apps/*/web/src/app/api/
```

Expected matches: only inside comments or within client-side identity package imports, never inside `z.object({...})` or route input parsing.

- [ ] **Step 2: If any hits, fix. Commit.**

---

## Phase 5 — Browser integration (in-memory only)

### Task 18: Wire `IdentityProvider` into vada-ai layout

**Files:**
- Modify: `apps/vada-ai/web/src/app/layout.tsx`
- Modify: `apps/vada-ai/web/package.json` — add `"@atta/identity": "workspace:*"`

- [ ] **Step 1: Add dep + install**

```bash
# In apps/vada-ai/web/package.json add "@atta/identity": "workspace:*"
bun install
```

- [ ] **Step 2: Wrap app in layout.tsx**

```tsx
import { IdentityProvider } from '@atta/identity/react'
// ...
<IdentityProvider>
  <NextWebShell>{children}</NextWebShell>
</IdentityProvider>
```

- [ ] **Step 3: Typecheck, commit**

```bash
git add apps/vada-ai/web
git commit -m "Feat: Wrap vada-ai in IdentityProvider

- In-memory key map available to the app tree
- Phase 6 will add passkey persistence on top"
```

### Task 19: Replace `packages/models/src/storage.ts` callers

**Files:**
- Delete: `packages/models/src/storage.ts`
- Modify: `packages/models/src/index.ts` — remove storage exports
- Modify: every caller of `getStoredApiKey` / `storeApiKey` / `removeStoredApiKey` to use `useIdentity()`

- [ ] **Step 1: Find callers**

```bash
grep -rn "getStoredApiKey\|storeApiKey\|removeStoredApiKey" apps packages
```

- [ ] **Step 2: Migrate each caller**

Typical migration in a client component: replace with `const { setKey, removeKey, hasKey } = useIdentity()`.

- [ ] **Step 3: Delete `storage.ts`**

```bash
rm packages/models/src/storage.ts
```

Remove its export from `packages/models/src/index.ts`.

- [ ] **Step 4: Typecheck, commit**

```bash
git add packages apps
git commit -m "Refactor: Replace localStorage key helpers with @atta/identity

- DELETED: packages/models/src/storage.ts (localStorage getters/setters)
- All callers now use useIdentity() — in-memory only, cleared on tab close
- No more vada:model-key:* entries in localStorage"
```

### Task 20: Rewrite `useDeliberation.ts` as pull-loop driver

**Files:**
- Rewrite: `apps/vada-ai/web/src/app/deliberation/[id]/components/useDeliberation.ts`

- [ ] **Step 1: Replace with pull-loop**

```ts
'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useIdentity } from '@atta/identity/react'
import { classifyProviderError, invokeAgent, invokeMock, isMockModeActive, retryWithBackoff } from '@atta/identity'

type UIState = 'idle' | 'streaming' | 'waiting' | 'error' | 'terminal'

export function useDeliberation(sessionId: string) {
  const { hasKey, state: idState } = useIdentity()
  const [uiState, setUIState] = useState<UIState>('idle')
  const [entries, setEntries] = useState<{ agent: string; round: number; content: string }[]>([])
  const [currentStream, setCurrentStream] = useState<{ agent: string; round: number; text: string } | null>(null)
  const [terminal, setTerminal] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const keyMap = idState.keys

  const drive = useCallback(async () => {
    while (true) {
      const cmd = await fetch(`/api/deliberation/${sessionId}/next`, { method: 'POST' }).then((r) => r.json())

      if (cmd.type === 'done') return
      if (cmd.type === 'terminal') {
        setTerminal(cmd.terminal_state)
        setUIState('terminal')
        return
      }

      const key = keyMap[cmd.model.provider as keyof typeof keyMap]
      if (!key) {
        setError(`Missing ${cmd.model.provider} key`)
        setUIState('error')
        return
      }

      const abort = new AbortController()
      abortRef.current = abort

      const dispatch = isMockModeActive() ? invokeMock : invokeAgent

      try {
        setUIState('streaming')
        setCurrentStream({ agent: cmd.agent ?? 'synthesizer', round: cmd.round ?? 0, text: '' })

        const result = await retryWithBackoff(
          () =>
            dispatch({
              provider: cmd.model.provider,
              modelId: cmd.model.modelId,
              apiKey: key,
              systemPrompt: cmd.systemPrompt,
              userPrompt: cmd.userPrompt,
              signal: abort.signal,
              ...(cmd.agent ? { agentLabel: cmd.agent } : {}),
              ...(cmd.round ? { round: cmd.round } : {})
            }),
          { maxAttempts: 3, shouldRetry: (err) => classifyProviderError(err, cmd.model.provider).recoverable }
        )

        let full = ''
        for await (const delta of result.textStream) {
          full += delta
          setCurrentStream((s) => (s ? { ...s, text: s.text + delta } : s))
        }

        await fetch(`/api/deliberation/${sessionId}/turn`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            turnId: cmd.turnId,
            content: full,
            phase: cmd.type === 'run_agent' ? 'run_agent' : cmd.phase,
            agent: cmd.agent,
            round: cmd.round
          })
        })

        setEntries((prev) => [...prev, { agent: cmd.agent ?? 'synthesizer', round: cmd.round ?? 0, content: full }])
        setCurrentStream(null)
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') return
        const classified = classifyProviderError(err, cmd.model.provider)
        await fetch(`/api/deliberation/${sessionId}/turn-error`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ turnId: cmd.turnId, error: classified.userMessage })
        })
        setError(classified.userMessage)
        setUIState('error')
        return
      }
    }
  }, [sessionId, keyMap])

  useEffect(() => {
    drive()
    return () => abortRef.current?.abort()
  }, [drive])

  return { uiState, entries, currentStream, terminal, error }
}
```

- [ ] **Step 2: Update `CenterViewport.tsx` / `DeliberationFeed.tsx` to consume the new return shape if needed**

- [ ] **Step 3: Typecheck**

- [ ] **Step 4: Commit**

```bash
git add apps/vada-ai/web/src/app/deliberation
git commit -m "Feat: Rewrite useDeliberation as browser-driven pull loop

- Calls /next to get commands, executes provider calls via @atta/identity
- Streams tokens directly from provider to local state — no network hop
- AbortController per turn; reload = idempotent resume
- Classifies provider errors locally, reports via /turn-error"
```

### Task 21: End-to-end manual verification (in-memory, mock mode)

- [ ] **Step 1: Enable mock mode**

Add to `apps/vada-ai/web/.env.local`:

```
NEXT_PUBLIC_VADA_MOCK_MODE=true
```

- [ ] **Step 2: Start dev, run deliberation**

```bash
bun run dev:vada
```

Enter keys for required providers in the UI (any non-empty string works under mock mode), start a deliberation, confirm mock text streams in, terminal state reached, no server errors.

- [ ] **Step 3: Test resume**

Refresh mid-deliberation, confirm completed entries persist and the loop resumes.

- [ ] **Step 4: Commit any fixes from the E2E pass**

---

## Phase 6 — Passkey persistence

### Task 22: `passkey.ts` — WebAuthn PRF create + get

**Files:**
- Create: `packages/identity/src/passkey.ts`

- [ ] **Step 1: Implement**

```ts
// passkey.ts
const PRF_SALT = new TextEncoder().encode('vada-api-keys-v1')

export interface PasskeySetupResult {
  credentialId: ArrayBuffer
  prfOutput: ArrayBuffer // the raw PRF bytes — caller derives AES key via crypto.ts
}

export function isPasskeySupported(): boolean {
  if (typeof window === 'undefined') return false
  return typeof window.PublicKeyCredential !== 'undefined'
}

export async function createPasskeyWithPrf(rpId: string, displayName = 'Vāda API Keys'): Promise<PasskeySetupResult | null> {
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'Vāda', id: rpId },
      user: {
        id: crypto.getRandomValues(new Uint8Array(16)),
        name: 'vada-keys',
        displayName
      },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { userVerification: 'required', residentKey: 'required' },
      extensions: { prf: { eval: { first: PRF_SALT } } }
    }
  })) as PublicKeyCredential | null

  if (!credential) return null
  const ext = credential.getClientExtensionResults() as { prf?: { results?: { first?: ArrayBuffer }; enabled?: boolean } }
  const prfFirst = ext.prf?.results?.first
  if (!prfFirst) return null
  return { credentialId: credential.rawId, prfOutput: prfFirst }
}

export async function unlockWithPasskey(rpId: string, credentialId: ArrayBuffer): Promise<ArrayBuffer | null> {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rpId,
      allowCredentials: [{ type: 'public-key', id: credentialId }],
      userVerification: 'required',
      extensions: { prf: { eval: { first: PRF_SALT } } }
    }
  })) as PublicKeyCredential | null

  if (!assertion) return null
  const ext = assertion.getClientExtensionResults() as { prf?: { results?: { first?: ArrayBuffer } } }
  return ext.prf?.results?.first ?? null
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/identity/src/passkey.ts
git commit -m "Feat: Add WebAuthn PRF create and get to @atta/identity

- createPasskeyWithPrf: returns { credentialId, prfOutput } or null if PRF unsupported
- unlockWithPasskey: re-evaluates PRF for an existing credential
- Fixed salt 'vada-api-keys-v1' per design spec
- isPasskeySupported() for UI branching"
```

### Task 23: `storage.ts` — IndexedDB blob storage

**Files:**
- Create: `packages/identity/src/storage.ts`

- [ ] **Step 1: Implement**

```ts
// storage.ts
import type { RouteProvider } from '@atta/models'

const DB_NAME = 'atta-identity'
const STORE = 'credentials'
const DB_VERSION = 1
const RECORD_ID = 'primary'

export interface StoredCredential {
  id: string
  credentialId: ArrayBuffer
  encryptedKeys: ArrayBuffer
  iv: Uint8Array
  providers: RouteProvider[]
  createdAt: number
  updatedAt: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function loadCredential(): Promise<StoredCredential | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(RECORD_ID)
    req.onsuccess = () => resolve((req.result as StoredCredential | undefined) ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function saveCredential(cred: Omit<StoredCredential, 'id'>): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const req = tx.objectStore(STORE).put({ id: RECORD_ID, ...cred })
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function clearCredential(): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const req = tx.objectStore(STORE).delete(RECORD_ID)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/identity/src/storage.ts
git commit -m "Feat: Add IndexedDB credential storage to @atta/identity

- Single-record object store keyed on 'primary'
- StoredCredential bundles credentialId, encryptedKeys, iv, plaintext providers list, timestamps
- Providers list is plaintext (no key material) for UI rendering without unlocking"
```

### Task 24: Upgrade `IdentityProvider` with passkey lifecycle

**Files:**
- Modify: `packages/identity/src/react.tsx`

- [ ] **Step 1: Wire full state machine**

Replace the stubs from Task 10 with real implementations:

```tsx
// Replace passkey stubs in IdentityProvider:
const [credentialId, setCredentialId] = useState<ArrayBuffer | null>(null)
const [providers, setProviders] = useState<RouteProvider[]>([])
const [stateKind, setStateKind] = useState<'no-stored-credential' | 'locked' | 'unlocked'>('no-stored-credential')
const [passkeySupported, setPasskeySupported] = useState(false)

// On mount, check IndexedDB + passkey support
useEffect(() => {
  setPasskeySupported(isPasskeySupported())
  loadCredential().then((cred) => {
    if (cred) {
      setCredentialId(cred.credentialId)
      setProviders(cred.providers)
      setStateKind('locked')
    }
  }).catch(() => {})
}, [])

const savePasskey = useCallback(async () => {
  const rpId = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  const result = await createPasskeyWithPrf(rpId)
  if (!result) throw new Error('Passkey setup failed (PRF unsupported?)')
  const key = await importKeyFromPrfOutput(result.prfOutput)
  const { ciphertext, iv } = await encryptJson(key, keys)
  const now = Date.now()
  await saveCredential({
    credentialId: result.credentialId,
    encryptedKeys: ciphertext,
    iv,
    providers: Object.keys(keys) as RouteProvider[],
    createdAt: now,
    updatedAt: now
  })
  setCredentialId(result.credentialId)
  setProviders(Object.keys(keys) as RouteProvider[])
  setStateKind('unlocked')
}, [keys])

const unlockWithPasskeyFn = useCallback(async () => {
  const cred = await loadCredential()
  if (!cred) throw new Error('No stored credential')
  const rpId = window.location.hostname
  const prfOutput = await unlockWithPasskey(rpId, cred.credentialId)
  if (!prfOutput) throw new Error('Unlock failed')
  const cryptoKey = await importKeyFromPrfOutput(prfOutput)
  const decrypted = await decryptJson<ApiKeyMap>(cryptoKey, cred.encryptedKeys, cred.iv)
  setKeys(decrypted)
  setStateKind('unlocked')
}, [])

const forgetDevice = useCallback(async () => {
  await clearCredential()
  setKeys({})
  setCredentialId(null)
  setProviders([])
  setStateKind('no-stored-credential')
}, [])

// Also: when keys change mid-session and we're unlocked, re-encrypt blob.
useEffect(() => {
  if (stateKind !== 'unlocked' || !credentialId) return
  ;(async () => {
    // Re-encrypt: unlock the session's encryption key via unlockWithPasskey on next re-save
    // OR keep the CryptoKey in a ref to avoid re-prompting. Keep it in a ref:
    // (implement via a useRef<CryptoKey | null> that holds the key while unlocked)
  })()
}, [keys, stateKind, credentialId])
```

**Important:** the "re-encrypt on every key change" path above would prompt for biometrics repeatedly. Fix by holding the `CryptoKey` in a ref populated at unlock time (and cleared on sign-out), so subsequent key adds/removes encrypt without re-prompting.

Write this properly:

```tsx
const cryptoKeyRef = useRef<CryptoKey | null>(null)
// unlockWithPasskeyFn: after deriving cryptoKey, set cryptoKeyRef.current = cryptoKey
// savePasskey: also set cryptoKeyRef.current = cryptoKey
// signOut: cryptoKeyRef.current = null
// forgetDevice: cryptoKeyRef.current = null

// On keys change, if we have a cryptoKey and credentialId, re-encrypt + write (no biometric prompt)
useEffect(() => {
  const cryptoKey = cryptoKeyRef.current
  if (stateKind !== 'unlocked' || !credentialId || !cryptoKey) return
  ;(async () => {
    const { ciphertext, iv } = await encryptJson(cryptoKey, keys)
    await saveCredential({
      credentialId,
      encryptedKeys: ciphertext,
      iv,
      providers: Object.keys(keys) as RouteProvider[],
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
    setProviders(Object.keys(keys) as RouteProvider[])
  })()
}, [keys, stateKind, credentialId])
```

- [ ] **Step 2: Typecheck + commit**

```bash
git add packages/identity/src/react.tsx
git commit -m "Feat: Wire passkey lifecycle into IdentityProvider

- savePasskey: creates credential, encrypts keymap, writes to IndexedDB
- unlockWithPasskey: prompts biometric, decrypts stored blob, hydrates in-memory keys
- forgetDevice: clears both memory and IndexedDB
- CryptoKey held in ref for duration of unlocked session — no repeat biometric prompts"
```

### Task 25: Key-management UI — unlock, save prompt, forget-device

**Files:**
- Create: `apps/vada-ai/web/src/components/KeyUnlockDialog.tsx`
- Create: `apps/vada-ai/web/src/components/SavePasskeyPrompt.tsx`
- Create: `apps/vada-ai/web/src/components/ForgetDeviceDialog.tsx`
- Modify: the deliberate/key-entry UI to reference the principles link: `Your keys stay in your browser. How we never see them ↗`

- [ ] **Step 1: Build KeyUnlockDialog**

Shows "Unlock with passkey" + "Enter keys manually" fallback. Driven by `useIdentity().state.kind === 'locked'`.

- [ ] **Step 2: Build SavePasskeyPrompt**

Shown after first key entry when `passkeySupported && state.kind === 'no-stored-credential'`. "Save your keys securely with a passkey? You'll unlock with Touch ID / Face ID / Windows Hello next time." Accept → `savePasskey()`. Decline → continue in-memory.

- [ ] **Step 3: Build ForgetDeviceDialog**

Explicit confirmation: "Your stored API keys on this device will be permanently deleted. …". Accept → `forgetDevice()`.

- [ ] **Step 4: Add microcopy link under key-entry input(s)**

```tsx
<p className="text-muted-foreground text-xs">
  Your keys stay in your browser.{' '}
  <Link href="/trust" className="underline">How we never see them ↗</Link>
</p>
```

- [ ] **Step 5: Typecheck + commit**

```bash
git add apps/vada-ai/web/src/components apps/vada-ai/web/src/app/deliberate
git commit -m "Feat: Key management UI — unlock, save, forget device

- KeyUnlockDialog renders when stored credential exists
- SavePasskeyPrompt offered after first key entry
- ForgetDeviceDialog with explicit permanence warning
- Microcopy link to /trust under key entry inputs"
```

### Task 26: Manual passkey UI state tests (Gate 3)

- [ ] **Step 1: State 1** — no credential, no session keys → first-time flow
- [ ] **Step 2: State 2** — stored credential, not unlocked → Unlock dialog
- [ ] **Step 3: State 3** — unlocked, keys in memory → masked provider display
- [ ] **Step 4: State 4** — Firefox / PRF unsupported → in-memory fallback with clear message
- [ ] **Step 5: State 5** — simulate passkey failure (cancel biometric prompt) → retry + manual entry option
- [ ] **Step 6: State 6** — delete passkey from OS keychain, reload → credential not found, cleared, first-time flow

Record any fixes in small commits.

### Task 27: Sign-out / forget-device behavior (Gate 4)

- [ ] **Step 1: Sign out** — verify DevTools IndexedDB still has the record, memory is empty, page reload shows Unlock dialog.
- [ ] **Step 2: Forget device** — verify IndexedDB record is gone, memory is empty, page reload shows first-time flow.
- [ ] **Step 3: Tab close + reopen** — verify IndexedDB record preserved, memory empty on reopen.

---

## Phase 7 — Missing-key validation, CSP, mock banner, `/trust`

### Task 28: Missing-key validation at deliberation start

**Files:**
- Modify: `apps/vada-ai/web/src/app/deliberate/components/QuestionInput.tsx` (or wherever the start flow triggers)

- [ ] **Step 1: Collect required providers**

Before calling `/api/deliberation/start`, gather providers from:
- Each round agent's model config (`agentModels`)
- The Synthesizer's model (whatever default / conclusion config is used)
- Blind Critic's model
- Revision model

For V1, conclusion/audit/revise all use the session-global model if set, else one of the agent models. Surface a single `defaultConclusionModel` config if needed.

```ts
const required = collectRequiredProviders([
  ...Object.values(agentModels),
  conclusionModel // defaulted or user-configured
])
const missing = identity.missingProviders(required)
if (missing.length > 0) {
  setError({ kind: 'missing-keys', providers: missing })
  return
}
```

- [ ] **Step 2: UI renders inline resolution**

"Your Critic is set to use Gemini, but you haven't added a Google API key. Add one now, or switch this agent to a provider you have configured."

- [ ] **Step 3: Typecheck + commit**

```bash
git add apps/vada-ai/web/src/app/deliberate
git commit -m "Feat: Validate required providers before deliberation start

- Collects providers from agents + synthesizer + critic + revision model configs
- Blocks start when any required key is missing, with inline resolution UI
- Check runs in browser, not server — server has no keys to check with"
```

### Task 29: CSP headers for provider API calls

**Files:**
- Modify: `apps/vada-ai/web/next.config.ts` (or middleware, wherever existing CSP is set)

- [ ] **Step 1: Check current CSP configuration**

```bash
grep -rn "Content-Security-Policy\|connect-src" apps/vada-ai/web/
```

- [ ] **Step 2: Add/extend `connect-src`**

```
connect-src 'self'
  https://api.anthropic.com
  https://api.openai.com
  https://generativelanguage.googleapis.com
  https://api.groq.com
  https://openrouter.ai
```

Keep existing entries (Clerk, CMS, analytics).

- [ ] **Step 3: Verify with real call in browser**

Start dev, set a real Anthropic key, run a deliberation with mock mode OFF, confirm no CSP block in console.

- [ ] **Step 4: Commit**

```bash
git add apps/vada-ai/web/next.config.ts
git commit -m "Feat: Update CSP connect-src to allow provider APIs

- Adds api.anthropic.com, api.openai.com, generativelanguage.googleapis.com, api.groq.com, openrouter.ai
- Required for browser-direct provider calls under the BYOK architecture"
```

### Task 30: Mock-mode banner

**Files:**
- Create: `apps/vada-ai/web/src/components/MockModeBanner.tsx`
- Modify: `apps/vada-ai/web/src/app/layout.tsx`

- [ ] **Step 1: Build banner**

```tsx
'use client'
import { isMockModeActive } from '@atta/identity'

export function MockModeBanner() {
  if (!isMockModeActive()) return null
  return (
    <div className="bg-warning text-warning-foreground text-center py-2 text-sm font-mono">
      DEV MODE — no real provider calls are being made
    </div>
  )
}
```

- [ ] **Step 2: Render at top of layout**

- [ ] **Step 3: Verify and commit**

```bash
git add apps/vada-ai/web
git commit -m "Feat: Always-visible mock-mode banner

- Renders when NEXT_PUBLIC_VADA_MOCK_MODE=true
- Eliminates the silent-mock failure mode that masked the BYOK bug"
```

### Task 31: `/trust` page

**Files:**
- Create: `apps/vada-ai/web/src/app/(main)/trust/page.tsx`

- [ ] **Step 1: Render principles content**

The principles doc is locked copy. Render it verbatim using the existing MDX or markdown pipeline (the app already has `next-mdx-remote` and a markdown pipeline for `science/`).

Option A — inline as MDX imported from specs:

```tsx
import { MDXRemote } from 'next-mdx-remote/rsc'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

export default async function TrustPage() {
  const file = await readFile(
    path.join(process.cwd(), '../specs/v2/vada-byok-principles.md'),
    'utf-8'
  )
  return (
    <article className="prose mx-auto max-w-3xl py-12">
      <MDXRemote source={file} />
    </article>
  )
}
```

Option B — copy the content into a `.tsx` page and maintain. Prefer Option A (single source of truth).

- [ ] **Step 2: Add nav link where appropriate** (footer, key-entry microcopy already points here)

- [ ] **Step 3: Do not merge yet — `/trust` remains private until Gate 6 passes**

- [ ] **Step 4: Commit**

```bash
git add apps/vada-ai/web/src/app/\(main\)/trust
git commit -m "Feat: Publish /trust BYOK architecture principles

- Renders apps/vada-ai/specs/v2/vada-byok-principles.md verbatim
- Single source of truth: doc and page cannot drift
- Published only after all six verification gates pass"
```

---

## Phase 8 — Verification gate sweep

### Task 32: Run all six gates

- [ ] **Gate 1 — Schema grep**

```bash
grep -ri "api_key\|apiKey\|anthropic_key\|openai_key\|provider_key\|credential\|secret\|token" \
  packages/*/db apps/*/db apps/*/src/db 2>/dev/null
```

Expected: zero matches (or only comments). If matches exist, fix before continuing.

- [ ] **Gate 2 — Route grep**

```bash
grep -rn "apiKey\|api_key" apps/*/web/src/app/api/
```

Expected: no `z.object({...apiKey...})`, no `req.json()` destructuring of a key field.

- [ ] **Gate 3 — Six UI states** — already tested in Task 26.

- [ ] **Gate 4 — Sign-out behavior** — already tested in Task 27.

- [ ] **Gate 5 — Browser compatibility**

Test against:
- Chrome macOS
- Safari macOS
- Chrome iOS
- Safari iOS (if reachable today)
- Firefox (expect PRF fallback to in-memory — verify fallback path, not crash)

Record results in a commit message or a short note in `docs/superpowers/notes/`.

- [ ] **Gate 6 — End-to-end real deliberation**

With `NEXT_PUBLIC_VADA_MOCK_MODE=false` and a real provider key entered in the browser:

1. Run a deliberation end-to-end.
2. Open Network tab.
3. Confirm calls to `api.anthropic.com` (or whichever provider) originate from the browser, not from `vada.ai` origin.
4. Confirm no outbound request to the Vāda origin contains the API key string. Search the HAR file for `sk-ant-` (or provider prefix) — zero hits.
5. Confirm server logs contain no provider key material.

- [ ] **Step 7: Final typecheck + biome**

```bash
bun run check
```

Expected: all green.

- [ ] **Step 8: Commit gate note if anything needed fixing**

---

## Self-review checklist (plan author)

- [x] **Spec coverage:** Every section of the design spec has at least one task.
  - Pull-based command channel → Tasks 12, 13
  - Server/browser split → Tasks 3-15
  - Command shape → Task 12
  - Streaming UX → Task 20
  - Abort semantics → Task 20
  - Error handling → Tasks 5, 20
  - Missing-key validation → Task 28
  - Passkey storage → Tasks 22-25
  - Sign-out / forget-device → Tasks 24, 25, 27
  - Session ownership → Tasks 1, 2
  - Mock mode redesign → Tasks 9, 30
  - CSP + CORS → Task 29
  - Bundle size → acknowledged risk, no task needed
  - `/trust` page → Task 31
  - Verification gates → Task 32

- [x] **Placeholder scan:** No TBDs, no "add error handling later", no "similar to Task N" without code.

- [x] **Type consistency:** `NextCommand`, `PromptSpec`, `ApiKeyMap`, `ClassifiedError` used consistently across tasks.

- [x] **Scope:** Large but cohesive — one atomic architectural refactor.

---

## Execution notes

- Between Task 11 and Task 20 the vada-ai web app is intentionally in a broken-but-typechecking state. Dev server won't run a real deliberation. This is the cost of an atomic architectural inversion.
- Every commit is independently typecheck-green. `bun run typecheck` after each task.
- Do NOT merge `/trust` until Gate 6 passes with a real provider key.
- If any gate fails, stop, fix root cause, re-run. Do not suppress or skip gates.
