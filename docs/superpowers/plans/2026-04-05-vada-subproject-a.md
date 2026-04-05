# Vada AI Sub-project A: Foundation + Agent Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Vada's foundation (shared packages, DB, auth) and agent engine (Mastra workflow, prompt composition, SSE streaming) with enough UI to run a full deliberation end-to-end.

**Architecture:** Mastra workflow orchestrates 4 AI agents through 3 rounds of deliberation, followed by a conclusion protocol (Synthesizer → Blind Critic → optional Revision). SSE streams events to a React frontend. Shared `@atta/db` and `@atta/auth` packages provide Drizzle and Clerk utilities across all Atta products.

**Tech Stack:** Next.js 16, Mastra (`@mastra/core`), Vercel AI SDK (`@ai-sdk/anthropic`), Drizzle ORM, Neon Postgres, Clerk, Zod, Tailwind v4, `@atta/ui`

**Spec:** `docs/superpowers/specs/2026-04-05-vada-subproject-a-design.md`

---

## File Map

### New shared packages

```
packages/db/
├── src/
│   ├── client.ts          # createDb() factory
│   ├── helpers.ts          # timestamps(), primaryId() column helpers
│   └── index.ts
├── package.json
├── tsconfig.json
├── CLAUDE.md
└── README.md

packages/auth/
├── src/
│   ├── provider.tsx        # ClerkProvider wrapper
│   ├── middleware.ts        # clerkMiddleware + route matcher helper
│   ├── hooks.ts             # Re-exports useUser, useAuth, auth
│   └── index.ts
├── package.json
├── tsconfig.json
├── CLAUDE.md
└── README.md
```

### Vada app files

```
apps/vada-ai/web/
├── src/
│   ├── app/
│   │   ├── page.tsx                              # Landing page
│   │   ├── layout.tsx                            # Root layout (Clerk, fonts)
│   │   ├── deliberation/[id]/page.tsx            # Live + archived deliberation
│   │   ├── history/page.tsx                      # Past sessions list
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   ├── sign-up/[[...sign-up]]/page.tsx
│   │   ├── globals.css
│   │   └── api/
│   │       ├── deliberation/
│   │       │   ├── start/route.ts                # POST — create + start
│   │       │   └── [id]/
│   │       │       ├── stream/route.ts           # GET — SSE stream
│   │       │       └── intervene/route.ts        # POST — stub for Sub-project B
│   │       └── sessions/
│   │           ├── route.ts                      # GET — list sessions
│   │           └── [id]/
│   │               ├── route.ts                  # GET — full session detail
│   │               └── export/route.ts           # GET — conclusion export
│   ├── db/
│   │   ├── schema.ts                             # Drizzle schema (5 tables)
│   │   ├── index.ts                              # DB client instance
│   │   └── queries.ts                            # Query functions
│   ├── schemas/
│   │   ├── conclusion.ts                         # ConclusionSchema (Zod)
│   │   ├── session.ts                            # SessionState, TerminalState, InterventionType
│   │   ├── agent.ts                              # AgentRole, AgentConfig
│   │   ├── events.ts                             # SSE event types
│   │   └── index.ts
│   ├── engine/
│   │   ├── workflow.ts                           # Main Mastra workflow
│   │   ├── rounds/
│   │   │   ├── round-one.ts                      # Parallel, 30s timeout
│   │   │   ├── round-two.ts                      # Sequential, streaming
│   │   │   └── round-three.ts                    # Sequential, streaming
│   │   ├── conclusion/
│   │   │   ├── synthesizer.ts                    # Conclusion Mode
│   │   │   ├── blind-critic.ts                   # Clean context audit
│   │   │   └── revision.ts                       # Targeted fix
│   │   ├── prompts/
│   │   │   ├── postures.ts                       # Verbatim from spec 9.1
│   │   │   ├── task-horizons.ts                  # Spec 9.2
│   │   │   ├── round-modifiers.ts                # Spec 9.3
│   │   │   ├── whisper-modifier.ts               # Spec 9.4
│   │   │   ├── conclusion-prompts.ts             # Spec 9.5
│   │   │   └── compose.ts                        # Prompt assembly
│   │   ├── agents.ts                             # Agent definitions + configs
│   │   └── stream.ts                             # SSE emitter utility
│   ├── components/
│   │   ├── deliberation/
│   │   │   ├── QuestionInput.tsx
│   │   │   ├── Timeline.tsx
│   │   │   ├── AgentCard.tsx
│   │   │   ├── StreamingEntry.tsx
│   │   │   ├── StateIndicator.tsx
│   │   │   └── ConclusionPanel.tsx
│   │   ├── session/
│   │   │   ├── SessionList.tsx
│   │   │   └── SessionCard.tsx
│   │   └── shared/
│   │       └── AgentBadge.tsx
│   └── middleware.ts                             # Clerk middleware
├── drizzle.config.ts
├── next.config.ts
├── postcss.config.js
├── .env.local                                    # (gitignored)
├── package.json
└── tsconfig.json
```

---

## Task 1: Create `@atta/db` shared package

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/src/client.ts`
- Create: `packages/db/src/helpers.ts`
- Create: `packages/db/src/index.ts`
- Create: `packages/db/CLAUDE.md`
- Create: `packages/db/README.md`

- [ ] **Step 1: Create `packages/db/package.json`**

```json
{
  "name": "@atta/db",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./helpers": "./src/helpers.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist .turbo"
  },
  "dependencies": {
    "drizzle-orm": "^0.45.1",
    "@neondatabase/serverless": "^1.0.2"
  },
  "devDependencies": {
    "@atta/typescript-config": "workspace:*",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: Create `packages/db/tsconfig.json`**

```json
{
  "extends": "@atta/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `packages/db/src/helpers.ts`**

```typescript
import { timestamp, uuid } from 'drizzle-orm/pg-core'

export function primaryId() {
  return uuid('id').primaryKey().defaultRandom()
}

export function timestamps() {
  return {
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  }
}

export function createdTimestamp() {
  return {
    createdAt: timestamp('created_at').defaultNow().notNull(),
  }
}
```

- [ ] **Step 4: Create `packages/db/src/client.ts`**

```typescript
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

export function createDb(connectionString: string, schema?: Record<string, unknown>) {
  const sql = neon(connectionString)
  return drizzle(sql, { schema: schema ?? {} })
}
```

- [ ] **Step 5: Create `packages/db/src/index.ts`**

```typescript
export { createDb } from './client'
export { primaryId, timestamps, createdTimestamp } from './helpers'
```

- [ ] **Step 6: Create `packages/db/CLAUDE.md`**

```markdown
# @atta/db — Shared Database Tooling

Shared Drizzle ORM utilities for the Atta AI ecosystem. Each product owns its own schema and migrations — this package provides the connection factory and column helpers only.

## Usage

```typescript
import { createDb } from '@atta/db'
import * as schema from './schema'

export const db = createDb(process.env.DATABASE_URL!, schema)
```

## Column Helpers

```typescript
import { primaryId, timestamps } from '@atta/db/helpers'

export const users = pgTable('users', {
  ...primaryId(),
  email: varchar('email').notNull(),
  ...timestamps(),
})
```

## Key Rules

- Each app has its own Postgres schema (e.g., `vada`, `herald`)
- Drizzle config and migrations stay local to each app
- No shared schema — only shared tooling
```

- [ ] **Step 7: Create `packages/db/README.md`**

```markdown
# @atta/db

Shared database tooling for the Atta AI ecosystem. Provides a Drizzle ORM connection factory and column helpers.

Each product maintains its own database schema and migrations. This package eliminates boilerplate without creating coupling.

## Install

Already available as `@atta/db` workspace dependency.

## API

- `createDb(connectionString, schema?)` — Returns a typed Drizzle client connected to Neon
- `primaryId()` — UUID primary key column with `gen_random_uuid()` default
- `timestamps()` — `created_at` + `updated_at` timestamp columns
- `createdTimestamp()` — `created_at` only
```

- [ ] **Step 8: Run `bun install` and verify typecheck**

```bash
bun install
bun run typecheck
```

Expected: `@atta/db` resolves and typechecks clean.

- [ ] **Step 9: Commit**

```bash
git add packages/db/
git commit -m "Feat: Create @atta/db shared database tooling package

- createDb() factory for Neon + Drizzle
- Column helpers: primaryId(), timestamps(), createdTimestamp()
- Each app owns its schema — this is tooling only"
```

---

## Task 2: Create `@atta/auth` shared package

**Files:**
- Create: `packages/auth/package.json`
- Create: `packages/auth/tsconfig.json`
- Create: `packages/auth/src/provider.tsx`
- Create: `packages/auth/src/middleware.ts`
- Create: `packages/auth/src/hooks.ts`
- Create: `packages/auth/src/index.ts`
- Create: `packages/auth/CLAUDE.md`
- Create: `packages/auth/README.md`

- [ ] **Step 1: Create `packages/auth/package.json`**

```json
{
  "name": "@atta/auth",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./provider": "./src/provider.tsx",
    "./middleware": "./src/middleware.ts",
    "./hooks": "./src/hooks.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist .turbo"
  },
  "dependencies": {
    "@clerk/nextjs": "^7.0.7"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "next": "^16.0.0"
  },
  "devDependencies": {
    "@atta/typescript-config": "workspace:*",
    "@types/react": "^19.0.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: Create `packages/auth/tsconfig.json`**

```json
{
  "extends": "@atta/typescript-config/base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "./dist"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `packages/auth/src/provider.tsx`**

```typescript
'use client'

import { ClerkProvider as BaseClerkProvider } from '@clerk/nextjs'
import type { ReactNode } from 'react'

export function AuthProvider({ children }: { children: ReactNode }) {
  return <BaseClerkProvider>{children}</BaseClerkProvider>
}
```

- [ ] **Step 4: Create `packages/auth/src/middleware.ts`**

```typescript
export { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
```

- [ ] **Step 5: Create `packages/auth/src/hooks.ts`**

```typescript
export { useUser, useAuth, useClerk } from '@clerk/nextjs'
export { auth, currentUser } from '@clerk/nextjs/server'
```

- [ ] **Step 6: Create `packages/auth/src/index.ts`**

```typescript
export { AuthProvider } from './provider'
export { clerkMiddleware, createRouteMatcher } from './middleware'
export { useUser, useAuth, useClerk } from './hooks'
```

- [ ] **Step 7: Create `packages/auth/CLAUDE.md`**

```markdown
# @atta/auth — Shared Authentication

Shared Clerk authentication utilities for the Atta AI ecosystem. Each product provides its own Clerk keys via environment variables.

## Usage

### Root Layout
```tsx
import { AuthProvider } from '@atta/auth/provider'

export default function RootLayout({ children }) {
  return <AuthProvider>{children}</AuthProvider>
}
```

### Middleware
```typescript
import { clerkMiddleware, createRouteMatcher } from '@atta/auth/middleware'

const isProtected = createRouteMatcher(['/app(.*)'])
export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) await auth.protect()
})
```

### Server Components
```typescript
import { auth } from '@atta/auth/hooks'
const { userId } = await auth()
```

## Key Rules

- Each app has its own CLERK_SECRET_KEY and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- No user data crosses products
- Each app maintains its own local users table with clerk_id column
```

- [ ] **Step 8: Create `packages/auth/README.md`**

```markdown
# @atta/auth

Shared Clerk authentication for the Atta AI ecosystem. Provides AuthProvider, middleware helpers, and hook re-exports.

Each product has its own Clerk application and keys. This package shares the implementation, not the identity.
```

- [ ] **Step 9: Run `bun install` and verify typecheck**

```bash
bun install
bun run typecheck
```

- [ ] **Step 10: Commit**

```bash
git add packages/auth/
git commit -m "Feat: Create @atta/auth shared authentication package

- AuthProvider component wrapping ClerkProvider
- Middleware helpers (clerkMiddleware, createRouteMatcher)
- Hook re-exports (useUser, useAuth, auth)"
```

---

## Task 3: Wire up Vada web app

**Files:**
- Modify: `apps/vada-ai/web/package.json`
- Create: `apps/vada-ai/web/src/app/globals.css`
- Modify: `apps/vada-ai/web/src/app/layout.tsx`
- Modify: `apps/vada-ai/web/src/app/page.tsx`
- Create: `apps/vada-ai/web/src/middleware.ts`
- Create: `apps/vada-ai/web/src/app/sign-in/[[...sign-in]]/page.tsx`
- Create: `apps/vada-ai/web/src/app/sign-up/[[...sign-up]]/page.tsx`
- Modify: `apps/vada-ai/web/next.config.ts` (create if needed)
- Create: `apps/vada-ai/web/postcss.config.js`
- Create: `apps/vada-ai/web/.env.local.example`

- [ ] **Step 1: Update `apps/vada-ai/web/package.json`**

Replace the entire file with:

```json
{
  "name": "@atta/vada-ai-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack --port 3003",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "@ai-sdk/anthropic": "^3.0.64",
    "@atta/auth": "workspace:*",
    "@atta/cms": "workspace:*",
    "@atta/db": "workspace:*",
    "@atta/ui": "workspace:*",
    "@mastra/core": "^1.22.0",
    "ai": "^6.0.140",
    "drizzle-orm": "^0.45.1",
    "@neondatabase/serverless": "^1.0.2",
    "lucide-react": "^1.7.0",
    "next": "^16.2.1",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@atta/typescript-config": "workspace:*",
    "@tailwindcss/postcss": "^4.0.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "drizzle-kit": "^0.31.10",
    "postcss": "^8.5.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: Create `apps/vada-ai/web/postcss.config.js`**

```javascript
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

- [ ] **Step 3: Create `apps/vada-ai/web/next.config.ts`**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {}

export default nextConfig
```

- [ ] **Step 4: Create `apps/vada-ai/web/src/app/globals.css`**

```css
@import 'tailwindcss';

:root {
  --background: #0D0B08;
  --foreground: #E8D5B7;
  --accent: #C8A84B;
  --muted: #7A6A50;
  --card: #1A1610;
  --border: #2A2318;
  --destructive: #C85A4B;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: system-ui, sans-serif;
}
```

- [ ] **Step 5: Update `apps/vada-ai/web/src/app/layout.tsx`**

```tsx
import { AuthProvider } from '@atta/auth/provider'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata = {
  title: 'Vada AI',
  description: 'Deliberation engine for structured thinking.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang='en'>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 6: Create `apps/vada-ai/web/src/middleware.ts`**

```typescript
import { clerkMiddleware, createRouteMatcher } from '@atta/auth/middleware'

const isProtectedRoute = createRouteMatcher([
  '/deliberation(.*)',
  '/history(.*)',
  '/api/deliberation(.*)',
  '/api/sessions(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

- [ ] **Step 7: Create sign-in and sign-up pages**

`apps/vada-ai/web/src/app/sign-in/[[...sign-in]]/page.tsx`:
```tsx
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className='flex min-h-dvh items-center justify-center'>
      <SignIn />
    </div>
  )
}
```

`apps/vada-ai/web/src/app/sign-up/[[...sign-up]]/page.tsx`:
```tsx
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className='flex min-h-dvh items-center justify-center'>
      <SignUp />
    </div>
  )
}
```

- [ ] **Step 8: Update landing page placeholder**

`apps/vada-ai/web/src/app/page.tsx`:
```tsx
import Link from 'next/link'

export default function Home() {
  return (
    <main className='flex min-h-dvh flex-col items-center justify-center gap-8 px-6'>
      <h1 className='text-4xl font-light tracking-tight' style={{ color: 'var(--foreground)' }}>
        Vāda
      </h1>
      <p className='text-sm' style={{ color: 'var(--muted)' }}>
        Deliberation engine. Coming soon.
      </p>
      <Link
        href='/sign-in'
        className='text-sm underline'
        style={{ color: 'var(--accent)' }}
      >
        Sign in
      </Link>
    </main>
  )
}
```

- [ ] **Step 9: Create `.env.local.example`**

`apps/vada-ai/web/.env.local.example`:
```env
# Database (Neon Postgres — Vada's own DB or shared instance with vada schema)
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require

# Clerk Auth (Vada's own Clerk application)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Anthropic (for agent LLM calls)
ANTHROPIC_API_KEY=sk-ant-...
```

- [ ] **Step 10: Run `bun install` and verify**

```bash
bun install
bun run dev:vada
```

Expected: Vada starts on port 3003, landing page renders, sign-in link works (will need real Clerk keys to test auth).

- [ ] **Step 11: Commit**

```bash
git add apps/vada-ai/web/
git commit -m "Feat: Wire up Vada web app with auth, Tailwind, and basic routes

- Install all deps (Mastra, Vercel AI SDK, Drizzle, Clerk)
- Root layout with AuthProvider from @atta/auth
- Clerk middleware protecting /deliberation and /api routes
- Sign-in and sign-up pages
- Minimal landing page"
```

---

## Task 4: Database schema and client

**Files:**
- Create: `apps/vada-ai/web/src/db/schema.ts`
- Create: `apps/vada-ai/web/src/db/index.ts`
- Create: `apps/vada-ai/web/src/db/queries.ts`
- Create: `apps/vada-ai/web/drizzle.config.ts`

- [ ] **Step 1: Create `apps/vada-ai/web/drizzle.config.ts`**

```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

- [ ] **Step 2: Create `apps/vada-ai/web/src/db/schema.ts`**

```typescript
import { pgTable, pgEnum, varchar, text, integer, timestamp, date, jsonb, uuid } from 'drizzle-orm/pg-core'

export const sessionStateEnum = pgEnum('session_state', [
  'PENDING', 'ROUND_1', 'ROUND_2', 'ROUND_3',
  'CONCLUDING', 'AUDITING', 'REVISING', 'TERMINAL',
])

export const terminalStateEnum = pgEnum('terminal_state', [
  'CLEAN', 'REVISED', 'UNCONVERGED',
])

export const interventionTypeEnum = pgEnum('intervention_type', [
  'WHISPER', 'DIRECTIVE', 'STOP',
])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: varchar('clerk_id').unique().notNull(),
  email: varchar('email').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  question: text('question').notNull(),
  agents: text('agents').array().notNull(),
  state: sessionStateEnum('state').default('PENDING').notNull(),
  terminalState: terminalStateEnum('terminal_state'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const transcriptEntries = pgTable('transcript_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id).notNull(),
  round: integer('round').notNull(),
  agent: varchar('agent').notNull(),
  content: text('content').notNull(),
  target: varchar('target'),
  orderInRound: integer('order_in_round').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const interventions = pgTable('interventions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id).notNull(),
  type: interventionTypeEnum('type').notNull(),
  target: varchar('target'),
  content: text('content'),
  round: integer('round').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const conclusions = pgTable('conclusions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id).unique().notNull(),
  originalJson: jsonb('original_json').notNull(),
  criticVerdict: varchar('critic_verdict').notNull(),
  revisedJson: jsonb('revised_json'),
  criticReVerdict: varchar('critic_re_verdict'),
  terminalState: terminalStateEnum('terminal_state').notNull(),
  reviewBy: date('review_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

- [ ] **Step 3: Create `apps/vada-ai/web/src/db/index.ts`**

```typescript
import { createDb } from '@atta/db'
import * as schema from './schema'

export const db = createDb(process.env.DATABASE_URL!, schema)
export { schema }
```

- [ ] **Step 4: Create `apps/vada-ai/web/src/db/queries.ts`**

```typescript
import { eq, desc, sql, and, gte } from 'drizzle-orm'
import { db, schema } from './index'

// --- Users ---

export async function getOrCreateUser(clerkId: string, email: string) {
  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.clerkId, clerkId))
    .limit(1)
  if (existing[0]) return existing[0]

  const inserted = await db
    .insert(schema.users)
    .values({ clerkId, email })
    .returning()
  return inserted[0]!
}

export async function getDailySessionCount(userId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.sessions)
    .where(
      and(
        eq(schema.sessions.userId, userId),
        gte(schema.sessions.createdAt, today),
      ),
    )
  return Number(result[0]?.count ?? 0)
}

// --- Sessions ---

export async function createSession(userId: string, question: string, agents: string[]) {
  const inserted = await db
    .insert(schema.sessions)
    .values({ userId, question, agents })
    .returning()
  return inserted[0]!
}

export async function updateSessionState(sessionId: string, state: string) {
  await db
    .update(schema.sessions)
    .set({ state: state as typeof schema.sessions.$inferInsert.state, updatedAt: new Date() })
    .where(eq(schema.sessions.id, sessionId))
}

export async function setSessionTerminalState(sessionId: string, terminalState: string) {
  await db
    .update(schema.sessions)
    .set({
      state: 'TERMINAL' as const,
      terminalState: terminalState as typeof schema.sessions.$inferInsert.terminalState,
      updatedAt: new Date(),
    })
    .where(eq(schema.sessions.id, sessionId))
}

export async function listSessions(userId: string) {
  return db
    .select({
      id: schema.sessions.id,
      question: schema.sessions.question,
      state: schema.sessions.state,
      terminalState: schema.sessions.terminalState,
      createdAt: schema.sessions.createdAt,
    })
    .from(schema.sessions)
    .where(eq(schema.sessions.userId, userId))
    .orderBy(desc(schema.sessions.createdAt))
}

export async function getSessionWithTranscript(sessionId: string) {
  const session = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.id, sessionId))
    .limit(1)
  if (!session[0]) return null

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

  return {
    ...session[0],
    transcriptEntries: entries,
    interventions: interv,
    conclusion: conclusion[0] ?? null,
  }
}

// --- Transcript ---

export async function insertTranscriptEntry(data: {
  sessionId: string
  round: number
  agent: string
  content: string
  target?: string
  orderInRound: number
}) {
  return db.insert(schema.transcriptEntries).values(data).returning()
}

// --- Conclusions ---

export async function insertConclusion(data: {
  sessionId: string
  originalJson: unknown
  criticVerdict: string
  terminalState: string
  reviewBy?: string
  revisedJson?: unknown
  criticReVerdict?: string
}) {
  return db
    .insert(schema.conclusions)
    .values({
      sessionId: data.sessionId,
      originalJson: data.originalJson,
      criticVerdict: data.criticVerdict,
      terminalState: data.terminalState as typeof schema.conclusions.$inferInsert.terminalState,
      reviewBy: data.reviewBy ?? null,
      revisedJson: data.revisedJson ?? null,
      criticReVerdict: data.criticReVerdict ?? null,
    })
    .returning()
}
```

- [ ] **Step 5: Verify typecheck**

```bash
bun run typecheck
```

- [ ] **Step 6: Generate initial migration**

```bash
cd apps/vada-ai/web
bunx drizzle-kit generate
```

Expected: Migration files created in `apps/vada-ai/web/drizzle/`.

- [ ] **Step 7: Commit**

```bash
git add apps/vada-ai/web/src/db/ apps/vada-ai/web/drizzle.config.ts apps/vada-ai/web/drizzle/
git commit -m "Feat: Add Vada database schema and query layer

- 5 tables: users, sessions, transcript_entries, interventions, conclusions
- Drizzle ORM with Neon serverless driver via @atta/db
- Query functions for all CRUD operations
- Daily session count derived from query"
```

---

## Task 5: Zod schemas

**Files:**
- Create: `apps/vada-ai/web/src/schemas/conclusion.ts`
- Create: `apps/vada-ai/web/src/schemas/session.ts`
- Create: `apps/vada-ai/web/src/schemas/agent.ts`
- Create: `apps/vada-ai/web/src/schemas/events.ts`
- Create: `apps/vada-ai/web/src/schemas/index.ts`

- [ ] **Step 1: Create `apps/vada-ai/web/src/schemas/conclusion.ts`**

```typescript
import { z } from 'zod'

export const ConclusionSchema = z.object({
  recommendation: z.string(),
  key_condition: z.string(),
  unresolved_points: z.array(
    z.object({
      point: z.string(),
      agents_involved: z.array(z.string()),
    }),
  ),
  review_by: z.string(),
  participants: z.array(
    z.object({
      agent: z.string(),
      version: z.string(),
    }),
  ),
})

export type Conclusion = z.infer<typeof ConclusionSchema>
```

- [ ] **Step 2: Create `apps/vada-ai/web/src/schemas/session.ts`**

```typescript
import { z } from 'zod'

export const SessionState = z.enum([
  'PENDING', 'ROUND_1', 'ROUND_2', 'ROUND_3',
  'CONCLUDING', 'AUDITING', 'REVISING', 'TERMINAL',
])
export type SessionState = z.infer<typeof SessionState>

export const TerminalState = z.enum(['CLEAN', 'REVISED', 'UNCONVERGED'])
export type TerminalState = z.infer<typeof TerminalState>

export const InterventionType = z.enum(['WHISPER', 'DIRECTIVE', 'STOP'])
export type InterventionType = z.infer<typeof InterventionType>

export const DAILY_SESSION_LIMIT = 10
```

- [ ] **Step 3: Create `apps/vada-ai/web/src/schemas/agent.ts`**

```typescript
import { z } from 'zod'

export const AgentRole = z.enum([
  'strategist', 'critic', 'devils_advocate', 'synthesizer',
  'researcher', 'operator',
])
export type AgentRole = z.infer<typeof AgentRole>

export interface AgentConfig {
  role: AgentRole
  name: string
  temperature: number
}

export const DEFAULT_ROOM: AgentConfig[] = [
  { role: 'strategist', name: 'Strategist', temperature: 0.7 },
  { role: 'critic', name: 'Critic', temperature: 0.7 },
  { role: 'devils_advocate', name: "Devil's Advocate", temperature: 0.7 },
  { role: 'synthesizer', name: 'Synthesizer', temperature: 0.5 },
]

export const OPTIONAL_AGENTS: AgentConfig[] = [
  { role: 'researcher', name: 'Researcher', temperature: 0.7 },
  { role: 'operator', name: 'Operator', temperature: 0.7 },
]

export const ALL_AGENTS: AgentConfig[] = [...DEFAULT_ROOM, ...OPTIONAL_AGENTS]

export function getAgentConfig(role: AgentRole): AgentConfig {
  const config = ALL_AGENTS.find((a) => a.role === role)
  if (!config) throw new Error(`Unknown agent role: ${role}`)
  return config
}
```

- [ ] **Step 4: Create `apps/vada-ai/web/src/schemas/events.ts`**

```typescript
import type { SessionState, TerminalState } from './session'

export type SSEEvent =
  | { type: 'agent_start'; agent: string; round: number }
  | { type: 'agent_token'; agent: string; token: string }
  | { type: 'agent_complete'; agent: string; round: number; content: string }
  | { type: 'agent_error'; agent: string; error: string }
  | { type: 'round_complete'; round: number }
  | { type: 'loading_state'; message: string }
  | { type: 'conclusion_start' }
  | { type: 'conclusion_complete'; terminal_state: TerminalState }
  | { type: 'state_change'; state: SessionState }
  | { type: 'done' }
```

- [ ] **Step 5: Create `apps/vada-ai/web/src/schemas/index.ts`**

```typescript
export { ConclusionSchema, type Conclusion } from './conclusion'
export { SessionState, TerminalState, InterventionType, DAILY_SESSION_LIMIT } from './session'
export { AgentRole, DEFAULT_ROOM, OPTIONAL_AGENTS, ALL_AGENTS, getAgentConfig, type AgentConfig } from './agent'
export type { SSEEvent } from './events'
```

- [ ] **Step 6: Verify typecheck**

```bash
bun run typecheck
```

- [ ] **Step 7: Commit**

```bash
git add apps/vada-ai/web/src/schemas/
git commit -m "Feat: Add Vada Zod schemas and type definitions

- ConclusionSchema with recommendation, key_condition, unresolved_points
- SessionState and TerminalState enums
- Agent configs with temperature settings
- SSE event type definitions"
```

---

## Task 6: Prompt library

**Files:**
- Create: `apps/vada-ai/web/src/engine/prompts/postures.ts`
- Create: `apps/vada-ai/web/src/engine/prompts/task-horizons.ts`
- Create: `apps/vada-ai/web/src/engine/prompts/round-modifiers.ts`
- Create: `apps/vada-ai/web/src/engine/prompts/whisper-modifier.ts`
- Create: `apps/vada-ai/web/src/engine/prompts/conclusion-prompts.ts`
- Create: `apps/vada-ai/web/src/engine/prompts/compose.ts`

- [ ] **Step 1: Create `postures.ts`** — verbatim from tech spec Section 9.1

```typescript
import type { AgentRole } from '../../schemas'

const POSTURES: Record<string, string> = {
  strategist: `You are the Strategist. Your job is to map the landscape. When the Principal asks a question, you identify the opportunity, the risk, and the path forward. Your instinct is to expand and show what is possible.

You are not defensive. If the Critic or Devil's Advocate exposes a fatal flaw in your map during the deliberation, do not blindly defend your original position. Acknowledge the flaw immediately and redraw the map based on the new reality.`,

  critic: `You are the Critic. Your job is to find what is wrong. You attack assumptions, timelines, and logistical leaps. Your instinct is to destroy — not out of malice, but because a plan that survives criticism is a plan worth following.

Your primary goal is destruction, but your ultimate goal is a stronger room. If you destroy a premise and a clearly superior alternative exists in the rubble, you may propose it. Do not merely leave broken ideas; find the structural weakness and point toward a stronger foundation.`,

  devils_advocate: `You are the Devil's Advocate. You challenge whether the question itself is the right question. You ask whether the Principal is solving the wrong problem.

Your contrarianism must be structural and disciplined, not random. If the framing survives your challenge, say so — that is a valuable signal. If the room accepts your reframe, adapt your pushback to the new frame rather than reverting to your old argument.`,

  synthesizer: `You are the Synthesizer. You draw threads together. You do not force consensus. Your job is to map the borders of agreement and irreducible disagreement with equal care.

If the agents cannot agree, do not attempt to smooth over the friction. Name the exact point of divergence. Honest disagreement is a valid outcome.`,

  researcher: `You are the Researcher. Your job is to ground claims in evidence. You look for what is known, what is uncertain, and what is being asserted without support.

If other agents make claims that can be verified or challenged with evidence, do so. Stay factual. Your contribution is the terrain that everyone else is building on.`,

  operator: `You are the Operator. Your job is to stress-test execution. You focus on the physics of moving — timelines, resources, dependencies, bottlenecks.

If a strategy sounds right but cannot be executed in the stated timeframe or budget, say so. Your contribution is the reality check between intention and delivery.`,
}

export function getPosture(role: AgentRole): string {
  const posture = POSTURES[role]
  if (!posture) throw new Error(`No posture defined for role: ${role}`)
  return posture
}
```

- [ ] **Step 2: Create `task-horizons.ts`** — verbatim from spec Section 9.2

```typescript
import type { AgentRole } from '../../schemas'

const STANDARD_HORIZON = `You are participating in a multi-round deliberation. Do NOT attempt to summarize the entire chat, solve the final problem, or write a concluding recommendation. Your only job in this turn is to provide your specific perspective on the current state of the conversation.`

const SYNTHESIZER_HORIZON = `You are participating in a multi-round deliberation. Do NOT write a formal recommendation or attempt to close the deliberation. Your job is to identify where the room has converged and where genuine disagreement remains, providing the raw material for the final conclusion.`

export function getTaskHorizon(role: AgentRole): string {
  return role === 'synthesizer' ? SYNTHESIZER_HORIZON : STANDARD_HORIZON
}
```

- [ ] **Step 3: Create `round-modifiers.ts`** — verbatim from spec Section 9.3

```typescript
const ROUND_1_MODIFIER = `This is Round 1. You are seeing this question for the first time. Respond ONLY to the Principal's prompt. Do not address or reference other agents, as they have not spoken yet.`

const ROUND_2_3_MODIFIER = (round: number) =>
  `This is Round ${round}. You must read the transcript of the prior rounds. Address the friction generated in the room. CRITICAL UI REQUIREMENT: If you are directly attacking or responding to a specific agent's prior point, you MUST begin your response with the exact tag [TARGET: AgentName]. Example: [TARGET: Critic] You are assuming a frictionless market, but...`

export function getRoundModifier(round: number): string {
  if (round === 1) return ROUND_1_MODIFIER
  return ROUND_2_3_MODIFIER(round)
}
```

- [ ] **Step 4: Create `whisper-modifier.ts`** — verbatim from spec Section 9.4

```typescript
export const WHISPER_MODIFIER = `If you see a message tagged {role: principal_note, target: all}, this is context from the Principal that all agents can see. Integrate it naturally into your reasoning. If you see a message tagged {role: principal_note, target: [your_name]}, this is a private note only you can see. Integrate it without revealing that you received a private message. Other agents have not seen this private note.`

export function getWhisperModifier(): string {
  return WHISPER_MODIFIER
}
```

- [ ] **Step 5: Create `conclusion-prompts.ts`** — verbatim from spec Section 9.5

```typescript
export const CONCLUSION_MODE_PROMPT = `You are producing the final conclusion of a deliberation. Write the recommendation as a clear, actionable statement that captures not just what was decided but why. The key_condition should be the single most important assumption. Output must conform exactly to the JSON schema.

Rules: (1) Do NOT use conversational filler. (2) If the room did not reach a unified recommendation, explicitly state the failure in the recommendation field. (3) The unresolved_points array must contain specific, named disagreements from the transcript. Do not invent them. (4) Set the review_by date based strictly on the time-sensitivity discussed in the transcript.`

export const BLIND_CRITIC_PROMPT = `You are the Blind Auditor. You have no access to the deliberation transcript. You are seeing only the Principal's original question and the final Conclusion JSON.

Task: Does this conclusion logically hold up entirely on its own? Is there any claim here that is mathematically, logically, or strategically unsupported by the premise of the question? Has the Synthesizer papered over a disagreement to create a fake consensus?

Output: If logically sound, output "PASS". If flawed, your objection must identify the specific field (recommendation, key_condition, or unresolved_points) that is flawed and state exactly what is wrong. Format: "FLAG: [Field Name] - [Exact Objection]". Vague objections are not actionable.`

export const REVISION_MODE_PROMPT = (objection: string) =>
  `You produced the following conclusion. The auditor flagged this specific objection: ${objection}

Task: Revise the conclusion to address the auditor's objection. Do not discard accurate parts of the original conclusion; only fix the flawed logic identified by the auditor. Output the revised JSON matching the exact schema.`
```

- [ ] **Step 6: Create `compose.ts`** — the prompt assembly function

```typescript
import type { AgentRole } from '../../schemas'
import { getPosture } from './postures'
import { getTaskHorizon } from './task-horizons'
import { getRoundModifier } from './round-modifiers'
import { getWhisperModifier } from './whisper-modifier'

export function composeSystemPrompt(
  role: AgentRole,
  round: number,
  hasWhispers: boolean,
): string {
  const parts = [
    getPosture(role),
    getTaskHorizon(role),
    getRoundModifier(round),
  ]
  if (hasWhispers) {
    parts.push(getWhisperModifier())
  }
  return parts.join('\n\n')
}
```

- [ ] **Step 7: Verify typecheck**

```bash
bun run typecheck
```

- [ ] **Step 8: Commit**

```bash
git add apps/vada-ai/web/src/engine/prompts/
git commit -m "Feat: Add Vada prompt library — verbatim from tech spec

- Base postures with permeability rules (6 agents)
- Task horizon constraints (standard + synthesizer)
- Round modifiers (Round 1 vs Round 2/3 with TARGET tag)
- Whisper modifier for principal_note injection
- Conclusion protocol prompts (conclusion, blind critic, revision)
- compose() assembles final system prompt per spec Section 9.6"
```

---

## Task 7: Agent definitions and Mastra setup

**Files:**
- Create: `apps/vada-ai/web/src/engine/agents.ts`
- Create: `apps/vada-ai/web/src/engine/stream.ts`

- [ ] **Step 1: Create `apps/vada-ai/web/src/engine/agents.ts`**

```typescript
import { Agent } from '@mastra/core/agent'
import type { AgentConfig, AgentRole } from '../schemas'

const MODEL = 'anthropic:claude-sonnet-4-20250514'
const CONCLUSION_MODEL = 'anthropic:claude-sonnet-4-20250514'

export function createDeliberationAgent(
  config: AgentConfig,
  systemPrompt: string,
): Agent {
  return new Agent({
    name: config.name,
    instructions: systemPrompt,
    model: {
      provider: 'ANTHROPIC',
      name: 'claude-sonnet-4-20250514',
      toolChoice: 'none',
    },
  })
}

export function createConclusionAgent(systemPrompt: string): Agent {
  return new Agent({
    name: 'Synthesizer (Conclusion)',
    instructions: systemPrompt,
    model: {
      provider: 'ANTHROPIC',
      name: 'claude-sonnet-4-20250514',
      toolChoice: 'none',
    },
  })
}

export function createBlindCriticAgent(systemPrompt: string): Agent {
  return new Agent({
    name: 'Blind Critic',
    instructions: systemPrompt,
    model: {
      provider: 'ANTHROPIC',
      name: 'claude-sonnet-4-20250514',
      toolChoice: 'none',
    },
  })
}
```

- [ ] **Step 2: Create `apps/vada-ai/web/src/engine/stream.ts`**

```typescript
import type { SSEEvent } from '../schemas'

export class SSEEmitter {
  private encoder = new TextEncoder()
  private controller: ReadableStreamDefaultController | null = null
  private stream: ReadableStream

  constructor() {
    this.stream = new ReadableStream({
      start: (controller) => {
        this.controller = controller
      },
      cancel: () => {
        this.controller = null
      },
    })
  }

  emit(event: SSEEvent): void {
    if (!this.controller) return
    const data = `data: ${JSON.stringify(event)}\n\n`
    this.controller.enqueue(this.encoder.encode(data))
  }

  close(): void {
    this.emit({ type: 'done' })
    this.controller?.close()
    this.controller = null
  }

  toResponse(): Response {
    return new Response(this.stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  }
}
```

- [ ] **Step 3: Verify typecheck**

```bash
bun run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/vada-ai/web/src/engine/agents.ts apps/vada-ai/web/src/engine/stream.ts
git commit -m "Feat: Add Mastra agent factories and SSE emitter

- createDeliberationAgent() for in-room agents (Sonnet, configurable temp)
- createConclusionAgent() and createBlindCriticAgent() for conclusion protocol
- SSEEmitter class for typed server-sent events"
```

---

## Task 8: Deliberation workflow — Round 1

**Files:**
- Create: `apps/vada-ai/web/src/engine/rounds/round-one.ts`

- [ ] **Step 1: Create `apps/vada-ai/web/src/engine/rounds/round-one.ts`**

```typescript
import { createDeliberationAgent } from '../agents'
import { composeSystemPrompt } from '../prompts/compose'
import { insertTranscriptEntry } from '../../db/queries'
import type { AgentConfig } from '../../schemas'
import type { SSEEmitter } from '../stream'

const AGENT_TIMEOUT_MS = 30_000

export async function executeRoundOne(
  sessionId: string,
  question: string,
  agents: AgentConfig[],
  emitter: SSEEmitter,
): Promise<void> {
  emitter.emit({ type: 'state_change', state: 'ROUND_1' })
  emitter.emit({ type: 'loading_state', message: 'Agents are forming their initial positions...' })

  const promises = agents.map(async (config, index) => {
    emitter.emit({ type: 'agent_start', agent: config.role, round: 1 })

    try {
      const systemPrompt = composeSystemPrompt(config.role, 1, false)
      const agent = createDeliberationAgent(config, systemPrompt)

      const result = await Promise.race([
        agent.generate(question, { temperature: config.temperature }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Agent timeout')), AGENT_TIMEOUT_MS),
        ),
      ])

      const content = typeof result === 'string' ? result : result.text

      await insertTranscriptEntry({
        sessionId,
        round: 1,
        agent: config.role,
        content,
        orderInRound: index,
      })

      emitter.emit({
        type: 'agent_complete',
        agent: config.role,
        round: 1,
        content,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      emitter.emit({ type: 'agent_error', agent: config.role, error: message })
    }
  })

  await Promise.allSettled(promises)
  emitter.emit({ type: 'round_complete', round: 1 })
}
```

- [ ] **Step 2: Verify typecheck**

```bash
bun run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/vada-ai/web/src/engine/rounds/round-one.ts
git commit -m "Feat: Implement Round 1 parallel agent execution

- All agents generate simultaneously with 30s timeout
- Progressive reveal: emit agent_complete as each finishes
- Failed agents emit agent_error, don't block others
- Responses persisted incrementally to transcript_entries"
```

---

## Task 9: Deliberation workflow — Rounds 2 and 3

**Files:**
- Create: `apps/vada-ai/web/src/engine/rounds/round-two.ts`
- Create: `apps/vada-ai/web/src/engine/rounds/round-three.ts`

- [ ] **Step 1: Create `apps/vada-ai/web/src/engine/rounds/round-two.ts`**

```typescript
import { createDeliberationAgent } from '../agents'
import { composeSystemPrompt } from '../prompts/compose'
import { insertTranscriptEntry } from '../../db/queries'
import type { AgentConfig } from '../../schemas'
import type { SSEEmitter } from '../stream'

function buildTranscriptContext(
  question: string,
  priorEntries: Array<{ agent: string; content: string; round: number }>,
): string {
  let context = `PRINCIPAL'S QUESTION:\n${question}\n\n`
  context += `TRANSCRIPT:\n`
  for (const entry of priorEntries) {
    context += `[Round ${entry.round} — ${entry.agent}]:\n${entry.content}\n\n`
  }
  return context
}

function parseTarget(content: string): { target: string | null; cleanContent: string } {
  const match = content.match(/^\[TARGET:\s*(\w[\w\s']*?)\]\s*/i)
  if (match) {
    return {
      target: match[1]!.trim(),
      cleanContent: content.slice(match[0].length),
    }
  }
  return { target: null, cleanContent: content }
}

export async function executeSequentialRound(
  sessionId: string,
  question: string,
  round: number,
  agents: AgentConfig[],
  priorEntries: Array<{ agent: string; content: string; round: number }>,
  emitter: SSEEmitter,
): Promise<Array<{ agent: string; content: string; round: number }>> {
  const roundStateName = round === 2 ? 'ROUND_2' : 'ROUND_3'
  emitter.emit({ type: 'state_change', state: roundStateName as 'ROUND_2' | 'ROUND_3' })

  const newEntries: Array<{ agent: string; content: string; round: number }> = []
  const allEntries = [...priorEntries]

  for (let i = 0; i < agents.length; i++) {
    const config = agents[i]!

    // Cognitive loading state
    const prevAgent = i > 0 ? agents[i - 1]!.name : 'the room'
    emitter.emit({
      type: 'loading_state',
      message: `${config.name} is reading ${prevAgent}'s position...`,
    })

    emitter.emit({ type: 'agent_start', agent: config.role, round })

    try {
      const systemPrompt = composeSystemPrompt(config.role, round, false)
      const agent = createDeliberationAgent(config, systemPrompt)
      const context = buildTranscriptContext(question, allEntries)

      const result = await agent.stream(context, { temperature: config.temperature })

      let fullContent = ''
      for await (const chunk of result.textStream) {
        fullContent += chunk
        emitter.emit({ type: 'agent_token', agent: config.role, token: chunk })
      }

      const { target } = parseTarget(fullContent)

      await insertTranscriptEntry({
        sessionId,
        round,
        agent: config.role,
        content: fullContent,
        target: target ?? undefined,
        orderInRound: i,
      })

      const entry = { agent: config.role, content: fullContent, round }
      newEntries.push(entry)
      allEntries.push(entry)

      emitter.emit({
        type: 'agent_complete',
        agent: config.role,
        round,
        content: fullContent,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      emitter.emit({ type: 'agent_error', agent: config.role, error: message })
    }
  }

  emitter.emit({ type: 'round_complete', round })
  return newEntries
}
```

- [ ] **Step 2: Create `apps/vada-ai/web/src/engine/rounds/round-three.ts`**

Round 3 uses the same `executeSequentialRound` function from round-two.ts. No separate file needed — re-export:

```typescript
// Round 3 uses the same executeSequentialRound as Round 2
// with round=3 and Synthesizer speaking last.
// The ordering is handled by the workflow — just re-export.
export { executeSequentialRound } from './round-two'
```

- [ ] **Step 3: Verify typecheck**

```bash
bun run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/vada-ai/web/src/engine/rounds/
git commit -m "Feat: Implement Rounds 2-3 sequential streaming

- Agents generate one at a time with full raw transcript context
- Word-by-word streaming via agent_token SSE events
- [TARGET: AgentName] parsed from output and stored in DB
- Cognitive loading states between agents
- Round 3 reuses same function with round=3"
```

---

## Task 10: Conclusion protocol

**Files:**
- Create: `apps/vada-ai/web/src/engine/conclusion/synthesizer.ts`
- Create: `apps/vada-ai/web/src/engine/conclusion/blind-critic.ts`
- Create: `apps/vada-ai/web/src/engine/conclusion/revision.ts`

- [ ] **Step 1: Create `apps/vada-ai/web/src/engine/conclusion/synthesizer.ts`**

```typescript
import { createConclusionAgent } from '../agents'
import { CONCLUSION_MODE_PROMPT } from '../prompts/conclusion-prompts'
import { ConclusionSchema, type Conclusion } from '../../schemas'

export async function generateConclusion(
  question: string,
  transcript: Array<{ agent: string; content: string; round: number }>,
  agents: string[],
): Promise<{ conclusion: Conclusion | null; raw: string }> {
  let context = `PRINCIPAL'S QUESTION:\n${question}\n\n`
  context += `FULL TRANSCRIPT:\n`
  for (const entry of transcript) {
    context += `[Round ${entry.round} — ${entry.agent}]:\n${entry.content}\n\n`
  }
  context += `\nPARTICIPANTS: ${agents.join(', ')}`
  context += `\n\nProduce the conclusion as valid JSON matching the schema. Output ONLY the JSON, no other text.`

  const agent = createConclusionAgent(CONCLUSION_MODE_PROMPT)
  const result = await agent.generate(context, { temperature: 0.2 })
  const raw = typeof result === 'string' ? result : result.text

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { conclusion: null, raw }
    const parsed = JSON.parse(jsonMatch[0])
    const conclusion = ConclusionSchema.parse(parsed)
    return { conclusion, raw }
  } catch {
    return { conclusion: null, raw }
  }
}
```

- [ ] **Step 2: Create `apps/vada-ai/web/src/engine/conclusion/blind-critic.ts`**

```typescript
import { createBlindCriticAgent } from '../agents'
import { BLIND_CRITIC_PROMPT } from '../prompts/conclusion-prompts'
import type { Conclusion } from '../../schemas'

export async function auditConclusion(
  question: string,
  conclusion: Conclusion,
): Promise<string> {
  const context = `PRINCIPAL'S ORIGINAL QUESTION:\n${question}\n\nCONCLUSION JSON:\n${JSON.stringify(conclusion, null, 2)}\n\nReview this conclusion. Output "PASS" or "FLAG: [Field Name] - [Exact Objection]".`

  const agent = createBlindCriticAgent(BLIND_CRITIC_PROMPT)
  const result = await agent.generate(context, { temperature: 0.2 })
  return (typeof result === 'string' ? result : result.text).trim()
}
```

- [ ] **Step 3: Create `apps/vada-ai/web/src/engine/conclusion/revision.ts`**

```typescript
import { createConclusionAgent } from '../agents'
import { REVISION_MODE_PROMPT } from '../prompts/conclusion-prompts'
import { ConclusionSchema, type Conclusion } from '../../schemas'

export async function reviseConclusion(
  originalConclusion: Conclusion,
  objection: string,
): Promise<{ conclusion: Conclusion | null; raw: string }> {
  const prompt = REVISION_MODE_PROMPT(objection)
  const context = `ORIGINAL CONCLUSION:\n${JSON.stringify(originalConclusion, null, 2)}\n\nRevise the conclusion to address the objection. Output ONLY the revised JSON, no other text.`

  const agent = createConclusionAgent(prompt)
  const result = await agent.generate(context, { temperature: 0.2 })
  const raw = typeof result === 'string' ? result : result.text

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { conclusion: null, raw }
    const parsed = JSON.parse(jsonMatch[0])
    const conclusion = ConclusionSchema.parse(parsed)
    return { conclusion, raw }
  } catch {
    return { conclusion: null, raw }
  }
}
```

- [ ] **Step 4: Verify typecheck**

```bash
bun run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add apps/vada-ai/web/src/engine/conclusion/
git commit -m "Feat: Implement conclusion protocol

- Synthesizer conclusion mode: generates Zod-validated JSON (temp 0.2)
- Blind Critic: clean context audit — sees only question + JSON
- Revision: targeted fix of flagged fields
- Validation failure → null (caller determines UNCONVERGED)"
```

---

## Task 11: Main workflow orchestrator

**Files:**
- Create: `apps/vada-ai/web/src/engine/workflow.ts`

- [ ] **Step 1: Create `apps/vada-ai/web/src/engine/workflow.ts`**

```typescript
import { executeRoundOne } from './rounds/round-one'
import { executeSequentialRound } from './rounds/round-two'
import { generateConclusion } from './conclusion/synthesizer'
import { auditConclusion } from './conclusion/blind-critic'
import { reviseConclusion } from './conclusion/revision'
import {
  updateSessionState,
  setSessionTerminalState,
  insertConclusion,
} from '../db/queries'
import { getAgentConfig, type AgentConfig } from '../schemas'
import type { SSEEmitter } from './stream'
import type { TerminalState } from '../schemas'

export async function runDeliberation(
  sessionId: string,
  question: string,
  agentRoles: string[],
  emitter: SSEEmitter,
): Promise<void> {
  const agents: AgentConfig[] = agentRoles.map((role) => getAgentConfig(role as Parameters<typeof getAgentConfig>[0]))

  // Ensure Synthesizer speaks last in rounds 2-3
  const synthesizer = agents.find((a) => a.role === 'synthesizer')
  const nonSynthesizer = agents.filter((a) => a.role !== 'synthesizer')
  const orderedAgents = synthesizer
    ? [...nonSynthesizer, synthesizer]
    : agents

  try {
    // --- Round 1: Parallel ---
    await updateSessionState(sessionId, 'ROUND_1')
    await executeRoundOne(sessionId, question, agents, emitter)

    // Collect Round 1 entries for context
    const round1Entries = agents
      .map((a) => ({
        agent: a.role,
        content: '', // Will be filled from DB in production; for now, track in workflow
        round: 1,
      }))

    // Re-fetch transcript from DB for accurate context
    const { getSessionWithTranscript } = await import('../db/queries')
    const session = await getSessionWithTranscript(sessionId)
    const allEntries = (session?.transcriptEntries ?? []).map((e) => ({
      agent: e.agent,
      content: e.content,
      round: e.round,
    }))

    // --- Round 2: Sequential ---
    await updateSessionState(sessionId, 'ROUND_2')
    const round2Entries = await executeSequentialRound(
      sessionId, question, 2, orderedAgents, allEntries, emitter,
    )

    // --- Round 3: Sequential ---
    await updateSessionState(sessionId, 'ROUND_3')
    const fullTranscript = [...allEntries, ...round2Entries]
    const round3Entries = await executeSequentialRound(
      sessionId, question, 3, orderedAgents, fullTranscript, emitter,
    )

    // --- Conclusion Protocol ---
    const completeTranscript = [...fullTranscript, ...round3Entries]

    await updateSessionState(sessionId, 'CONCLUDING')
    emitter.emit({ type: 'state_change', state: 'CONCLUDING' })
    emitter.emit({ type: 'conclusion_start' })
    emitter.emit({ type: 'loading_state', message: 'Synthesizer is drafting the conclusion...' })

    const { conclusion: originalConclusion, raw: originalRaw } = await generateConclusion(
      question, completeTranscript, agentRoles,
    )

    if (!originalConclusion) {
      // Zod validation failed — UNCONVERGED
      await insertConclusion({
        sessionId,
        originalJson: { raw: originalRaw, error: 'Schema validation failed' },
        criticVerdict: 'Schema validation failed',
        terminalState: 'UNCONVERGED',
      })
      await setSessionTerminalState(sessionId, 'UNCONVERGED')
      emitter.emit({ type: 'conclusion_complete', terminal_state: 'UNCONVERGED' })
      return
    }

    // --- Blind Critic ---
    await updateSessionState(sessionId, 'AUDITING')
    emitter.emit({ type: 'state_change', state: 'AUDITING' })
    emitter.emit({ type: 'loading_state', message: 'Blind Critic is reviewing the conclusion...' })

    const verdict = await auditConclusion(question, originalConclusion)

    if (verdict.startsWith('PASS')) {
      // CLEAN — passed first time
      await insertConclusion({
        sessionId,
        originalJson: originalConclusion,
        criticVerdict: verdict,
        terminalState: 'CLEAN',
        reviewBy: originalConclusion.review_by,
      })
      await setSessionTerminalState(sessionId, 'CLEAN')
      emitter.emit({ type: 'conclusion_complete', terminal_state: 'CLEAN' })
      return
    }

    // --- Revision ---
    await updateSessionState(sessionId, 'REVISING')
    emitter.emit({ type: 'state_change', state: 'REVISING' })
    emitter.emit({ type: 'loading_state', message: 'Synthesizer is revising based on the objection...' })

    const { conclusion: revisedConclusion } = await reviseConclusion(originalConclusion, verdict)

    if (!revisedConclusion) {
      // Revision failed validation — UNCONVERGED
      await insertConclusion({
        sessionId,
        originalJson: originalConclusion,
        criticVerdict: verdict,
        terminalState: 'UNCONVERGED',
      })
      await setSessionTerminalState(sessionId, 'UNCONVERGED')
      emitter.emit({ type: 'conclusion_complete', terminal_state: 'UNCONVERGED' })
      return
    }

    // --- Second Blind Critic review ---
    emitter.emit({ type: 'loading_state', message: 'Blind Critic is reviewing the revision...' })
    const reVerdict = await auditConclusion(question, revisedConclusion)

    if (reVerdict.startsWith('PASS')) {
      // REVISED — flagged, fixed, approved
      await insertConclusion({
        sessionId,
        originalJson: originalConclusion,
        criticVerdict: verdict,
        revisedJson: revisedConclusion,
        criticReVerdict: reVerdict,
        terminalState: 'REVISED',
        reviewBy: revisedConclusion.review_by,
      })
      await setSessionTerminalState(sessionId, 'REVISED')
      emitter.emit({ type: 'conclusion_complete', terminal_state: 'REVISED' })
    } else {
      // UNCONVERGED — rejected twice
      await insertConclusion({
        sessionId,
        originalJson: originalConclusion,
        criticVerdict: verdict,
        revisedJson: revisedConclusion,
        criticReVerdict: reVerdict,
        terminalState: 'UNCONVERGED',
        reviewBy: originalConclusion.review_by,
      })
      await setSessionTerminalState(sessionId, 'UNCONVERGED')
      emitter.emit({ type: 'conclusion_complete', terminal_state: 'UNCONVERGED' })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Workflow error'
    emitter.emit({ type: 'agent_error', agent: 'system', error: message })
    await setSessionTerminalState(sessionId, 'UNCONVERGED')
    emitter.emit({ type: 'conclusion_complete', terminal_state: 'UNCONVERGED' })
  } finally {
    emitter.close()
  }
}
```

- [ ] **Step 2: Verify typecheck**

```bash
bun run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/vada-ai/web/src/engine/workflow.ts
git commit -m "Feat: Implement main deliberation workflow orchestrator

- Round 1 (parallel) → Round 2 (sequential) → Round 3 (sequential)
- Synthesizer speaks last in rounds 2-3
- Conclusion protocol: Synthesizer → Blind Critic → Revision if flagged
- Terminal states: CLEAN / REVISED / UNCONVERGED
- State machine transitions persisted to DB
- Error recovery: system errors → UNCONVERGED"
```

---

## Task 12: API routes

**Files:**
- Create: `apps/vada-ai/web/src/app/api/deliberation/start/route.ts`
- Create: `apps/vada-ai/web/src/app/api/deliberation/[id]/stream/route.ts`
- Create: `apps/vada-ai/web/src/app/api/deliberation/[id]/intervene/route.ts`
- Create: `apps/vada-ai/web/src/app/api/sessions/route.ts`
- Create: `apps/vada-ai/web/src/app/api/sessions/[id]/route.ts`
- Create: `apps/vada-ai/web/src/app/api/sessions/[id]/export/route.ts`

- [ ] **Step 1: Create `start/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@atta/auth/hooks'
import { getOrCreateUser, getDailySessionCount, createSession } from '@/db/queries'
import { DAILY_SESSION_LIMIT, DEFAULT_ROOM } from '@/schemas'
import { z } from 'zod'

const StartSchema = z.object({
  question: z.string().min(1).max(5000),
  agents: z.array(z.string()).min(2).max(6).optional(),
})

export async function POST(request: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = StartSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
  }

  const user = await getOrCreateUser(clerkId, '') // email filled from Clerk
  const dailyCount = await getDailySessionCount(user.id)

  if (dailyCount >= DAILY_SESSION_LIMIT) {
    return NextResponse.json(
      { error: `Daily limit reached. You have ${DAILY_SESSION_LIMIT} deliberations per day.` },
      { status: 429 },
    )
  }

  const agents = parsed.data.agents ?? DEFAULT_ROOM.map((a) => a.role)
  const session = await createSession(user.id, parsed.data.question, agents)

  return NextResponse.json({ session_id: session.id })
}
```

- [ ] **Step 2: Create `stream/route.ts`**

```typescript
import { auth } from '@atta/auth/hooks'
import { getSessionWithTranscript } from '@/db/queries'
import { SSEEmitter } from '@/engine/stream'
import { runDeliberation } from '@/engine/workflow'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { id: sessionId } = await params
  const session = await getSessionWithTranscript(sessionId)

  if (!session) {
    return new Response('Session not found', { status: 404 })
  }

  // If session is already terminal, return transcript as batch events
  if (session.state === 'TERMINAL') {
    const emitter = new SSEEmitter()

    // Replay completed transcript
    for (const entry of session.transcriptEntries) {
      emitter.emit({
        type: 'agent_complete',
        agent: entry.agent,
        round: entry.round,
        content: entry.content,
      })
    }

    if (session.conclusion) {
      emitter.emit({
        type: 'conclusion_complete',
        terminal_state: session.conclusion.terminalState as 'CLEAN' | 'REVISED' | 'UNCONVERGED',
      })
    }

    emitter.close()
    return emitter.toResponse()
  }

  // If session is in progress, replay what exists then start streaming
  const emitter = new SSEEmitter()

  // Replay existing entries
  for (const entry of session.transcriptEntries) {
    emitter.emit({
      type: 'agent_complete',
      agent: entry.agent,
      round: entry.round,
      content: entry.content,
    })
  }

  // Continue deliberation if still PENDING
  if (session.state === 'PENDING') {
    runDeliberation(sessionId, session.question, session.agents, emitter)
  }

  return emitter.toResponse()
}
```

- [ ] **Step 3: Create `intervene/route.ts`** — stub for Sub-project B

```typescript
import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Interventions not yet implemented (Sub-project B)' },
    { status: 501 },
  )
}
```

- [ ] **Step 4: Create `sessions/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@atta/auth/hooks'
import { getOrCreateUser, listSessions } from '@/db/queries'

export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await getOrCreateUser(clerkId, '')
  const sessions = await listSessions(user.id)

  return NextResponse.json({ sessions })
}
```

- [ ] **Step 5: Create `sessions/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@atta/auth/hooks'
import { getSessionWithTranscript } from '@/db/queries'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const session = await getSessionWithTranscript(id)

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  return NextResponse.json(session)
}
```

- [ ] **Step 6: Create `sessions/[id]/export/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@atta/auth/hooks'
import { getSessionWithTranscript } from '@/db/queries'

function formatConclusion(session: {
  question: string
  conclusion: {
    originalJson: unknown
    revisedJson: unknown
    terminalState: string
    criticVerdict: string
  } | null
}): string {
  if (!session.conclusion) return 'No conclusion available.'

  const c = session.conclusion
  const json = (c.terminalState === 'REVISED' && c.revisedJson
    ? c.revisedJson
    : c.originalJson) as Record<string, unknown>

  const lines: string[] = []
  lines.push(`DELIBERATION CONCLUSION`)
  lines.push(`Status: ${c.terminalState}`)
  lines.push(``)
  lines.push(`Question: ${session.question}`)
  lines.push(``)
  lines.push(`Recommendation: ${json.recommendation ?? 'N/A'}`)
  lines.push(``)
  lines.push(`Key Condition: ${json.key_condition ?? 'N/A'}`)
  lines.push(``)

  const unresolved = json.unresolved_points as Array<{ point: string; agents_involved: string[] }> | undefined
  if (unresolved?.length) {
    lines.push(`Unresolved Points:`)
    for (const p of unresolved) {
      lines.push(`  - ${p.point} (${p.agents_involved.join(', ')})`)
    }
    lines.push(``)
  }

  if (json.review_by) {
    lines.push(`Review By: ${json.review_by}`)
  }

  return lines.join('\n')
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const session = await getSessionWithTranscript(id)

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const text = formatConclusion(session)

  return new Response(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
```

- [ ] **Step 7: Update tsconfig for path alias**

Ensure `apps/vada-ai/web/tsconfig.json` has the `@/*` path alias:

```json
{
  "extends": "@atta/typescript-config/nextjs.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 8: Verify typecheck**

```bash
bun run typecheck
```

- [ ] **Step 9: Commit**

```bash
git add apps/vada-ai/web/src/app/api/ apps/vada-ai/web/tsconfig.json
git commit -m "Feat: Add all Vada API routes

- POST /api/deliberation/start — create session with daily limit check
- GET /api/deliberation/[id]/stream — SSE stream with reconnection support
- POST /api/deliberation/[id]/intervene — stub for Sub-project B
- GET /api/sessions — list past sessions
- GET /api/sessions/[id] — full session with transcript
- GET /api/sessions/[id]/export — human-readable conclusion text"
```

---

## Task 13: Frontend — Landing page

**Files:**
- Create: `apps/vada-ai/web/src/components/deliberation/QuestionInput.tsx`
- Create: `apps/vada-ai/web/src/components/shared/AgentBadge.tsx`
- Modify: `apps/vada-ai/web/src/app/page.tsx`

- [ ] **Step 1: Create `AgentBadge.tsx`**

```tsx
const AGENT_COLORS: Record<string, string> = {
  strategist: '#4A9EDB',
  critic: '#DB4A4A',
  devils_advocate: '#9B59B6',
  synthesizer: '#C8A84B',
  researcher: '#2ECC71',
  operator: '#E67E22',
}

export function AgentBadge({ role, name }: { role: string; name: string }) {
  const color = AGENT_COLORS[role] ?? 'var(--muted)'
  return (
    <span
      className='inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs'
      style={{ border: `1px solid ${color}`, color }}
    >
      <span className='h-1.5 w-1.5 rounded-full' style={{ background: color }} />
      {name}
    </span>
  )
}
```

- [ ] **Step 2: Create `QuestionInput.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AgentBadge } from '../shared/AgentBadge'
import { DEFAULT_ROOM, OPTIONAL_AGENTS, type AgentConfig } from '@/schemas'

export function QuestionInput({ remainingToday }: { remainingToday: number }) {
  const [question, setQuestion] = useState('')
  const [selectedAgents, setSelectedAgents] = useState<AgentConfig[]>([...DEFAULT_ROOM])
  const [showCustomize, setShowCustomize] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const toggleAgent = (agent: AgentConfig) => {
    setSelectedAgents((prev) => {
      const exists = prev.find((a) => a.role === agent.role)
      if (exists) return prev.filter((a) => a.role !== agent.role)
      return [...prev, agent]
    })
  }

  const handleStart = async () => {
    if (!question.trim() || loading) return
    setLoading(true)

    const res = await fetch('/api/deliberation/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: question.trim(),
        agents: selectedAgents.map((a) => a.role),
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      alert(data.error ?? 'Failed to start deliberation')
      setLoading(false)
      return
    }

    const { session_id } = await res.json()
    router.push(`/deliberation/${session_id}`)
  }

  return (
    <div className='flex w-full max-w-2xl flex-col gap-6'>
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder='What do you want to figure out?'
        className='min-h-[120px] w-full resize-none rounded-lg border px-4 py-3 text-sm'
        style={{
          background: 'var(--card)',
          borderColor: 'var(--border)',
          color: 'var(--foreground)',
        }}
      />

      <div className='flex flex-wrap gap-2'>
        {selectedAgents.map((a) => (
          <AgentBadge key={a.role} role={a.role} name={a.name} />
        ))}
      </div>

      <button
        type='button'
        onClick={() => setShowCustomize(!showCustomize)}
        className='self-start text-xs underline'
        style={{ color: 'var(--muted)' }}
      >
        {showCustomize ? 'Hide' : 'Customize your room'}
      </button>

      {showCustomize && (
        <div className='flex flex-wrap gap-2'>
          {OPTIONAL_AGENTS.map((a) => (
            <button
              key={a.role}
              type='button'
              onClick={() => toggleAgent(a)}
              className='rounded-full border px-3 py-1 text-xs transition-opacity'
              style={{
                borderColor: selectedAgents.find((s) => s.role === a.role)
                  ? 'var(--accent)'
                  : 'var(--border)',
                color: selectedAgents.find((s) => s.role === a.role)
                  ? 'var(--accent)'
                  : 'var(--muted)',
              }}
            >
              + {a.name}
            </button>
          ))}
        </div>
      )}

      <div className='flex items-center justify-between'>
        <span className='text-xs' style={{ color: 'var(--muted)' }}>
          {remainingToday} deliberation{remainingToday !== 1 ? 's' : ''} remaining today
        </span>
        <button
          type='button'
          onClick={handleStart}
          disabled={!question.trim() || loading || remainingToday <= 0}
          className='rounded-lg px-6 py-2 text-sm font-medium transition-opacity disabled:opacity-40'
          style={{ background: 'var(--accent)', color: 'var(--background)' }}
        >
          {loading ? 'Starting...' : 'Start Deliberation'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update `apps/vada-ai/web/src/app/page.tsx`**

```tsx
import { auth } from '@atta/auth/hooks'
import { redirect } from 'next/navigation'
import { getOrCreateUser, getDailySessionCount } from '@/db/queries'
import { DAILY_SESSION_LIMIT } from '@/schemas'
import { QuestionInput } from '@/components/deliberation/QuestionInput'
import Link from 'next/link'

export default async function Home() {
  const { userId: clerkId } = await auth()

  if (!clerkId) {
    return (
      <main className='flex min-h-dvh flex-col items-center justify-center gap-8 px-6'>
        <h1 className='text-4xl font-light tracking-tight' style={{ color: 'var(--foreground)' }}>
          Vāda
        </h1>
        <p className='text-sm' style={{ color: 'var(--muted)' }}>
          Deliberation engine for structured thinking.
        </p>
        <Link href='/sign-in' className='text-sm underline' style={{ color: 'var(--accent)' }}>
          Sign in to start
        </Link>
      </main>
    )
  }

  const user = await getOrCreateUser(clerkId, '')
  const dailyCount = await getDailySessionCount(user.id)
  const remaining = DAILY_SESSION_LIMIT - dailyCount

  return (
    <main className='flex min-h-dvh flex-col items-center justify-center gap-8 px-6'>
      <h1 className='text-4xl font-light tracking-tight' style={{ color: 'var(--foreground)' }}>
        Vāda
      </h1>
      <p className='text-sm' style={{ color: 'var(--muted)' }}>
        What do you want to figure out?
      </p>
      <QuestionInput remainingToday={remaining} />
      <Link href='/history' className='text-xs underline' style={{ color: 'var(--muted)' }}>
        Past deliberations
      </Link>
    </main>
  )
}
```

- [ ] **Step 4: Verify typecheck**

```bash
bun run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add apps/vada-ai/web/src/components/ apps/vada-ai/web/src/app/page.tsx
git commit -m "Feat: Add Vada landing page with question input

- QuestionInput with agent selection and daily limit display
- Default room pre-assembled, optional agents toggleable
- AgentBadge component with per-role colors
- Auth-aware: shows sign-in link for unauthenticated users"
```

---

## Task 14: Frontend — Deliberation page (dual-mode)

**Files:**
- Create: `apps/vada-ai/web/src/components/deliberation/Timeline.tsx`
- Create: `apps/vada-ai/web/src/components/deliberation/AgentCard.tsx`
- Create: `apps/vada-ai/web/src/components/deliberation/StreamingEntry.tsx`
- Create: `apps/vada-ai/web/src/components/deliberation/StateIndicator.tsx`
- Create: `apps/vada-ai/web/src/components/deliberation/ConclusionPanel.tsx`
- Create: `apps/vada-ai/web/src/app/deliberation/[id]/page.tsx`

- [ ] **Step 1: Create `AgentCard.tsx`**

```tsx
import { AgentBadge } from '../shared/AgentBadge'

export function AgentCard({ role, name, content }: { role: string; name: string; content: string }) {
  return (
    <div className='rounded-lg border p-4' style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className='mb-2'>
        <AgentBadge role={role} name={name} />
      </div>
      <p className='whitespace-pre-wrap text-sm leading-relaxed' style={{ color: 'var(--foreground)' }}>
        {content}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Create `StreamingEntry.tsx`**

```tsx
'use client'

import { AgentBadge } from '../shared/AgentBadge'
import { getAgentConfig } from '@/schemas'

export function StreamingEntry({
  role,
  content,
  isStreaming,
}: {
  role: string
  content: string
  isStreaming: boolean
}) {
  const config = getAgentConfig(role as Parameters<typeof getAgentConfig>[0])

  return (
    <div className='border-l-2 py-3 pl-4' style={{ borderColor: 'var(--border)' }}>
      <div className='mb-1'>
        <AgentBadge role={role} name={config.name} />
      </div>
      <p className='whitespace-pre-wrap text-sm leading-relaxed' style={{ color: 'var(--foreground)' }}>
        {content}
        {isStreaming && <span className='ml-0.5 animate-pulse'>|</span>}
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Create `StateIndicator.tsx`**

```tsx
export function StateIndicator({ state, message }: { state: string; message?: string }) {
  return (
    <div className='py-4 text-center'>
      <span className='rounded-full px-3 py-1 text-xs' style={{ background: 'var(--card)', color: 'var(--muted)' }}>
        {message ?? state}
      </span>
    </div>
  )
}
```

- [ ] **Step 4: Create `ConclusionPanel.tsx`**

```tsx
import type { TerminalState } from '@/schemas'

const STATE_LABELS: Record<string, { label: string; color: string }> = {
  CLEAN: { label: 'Clean', color: '#2ECC71' },
  REVISED: { label: 'Revised', color: '#C8A84B' },
  UNCONVERGED: { label: 'Unconverged', color: '#DB4A4A' },
}

export function ConclusionPanel({
  terminalState,
  conclusion,
  criticVerdict,
}: {
  terminalState: string
  conclusion: Record<string, unknown> | null
  criticVerdict?: string
}) {
  const stateInfo = STATE_LABELS[terminalState] ?? STATE_LABELS.UNCONVERGED!

  return (
    <div className='mt-8 rounded-lg border p-6' style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className='mb-4 flex items-center justify-between'>
        <h2 className='text-lg font-light' style={{ color: 'var(--foreground)' }}>Conclusion</h2>
        <span className='rounded-full px-3 py-1 text-xs font-medium' style={{ background: stateInfo.color, color: 'var(--background)' }}>
          {stateInfo.label}
        </span>
      </div>

      {conclusion ? (
        <div className='space-y-4'>
          <div>
            <h3 className='mb-1 text-xs uppercase tracking-wider' style={{ color: 'var(--muted)' }}>Recommendation</h3>
            <p className='text-sm' style={{ color: 'var(--foreground)' }}>{conclusion.recommendation as string}</p>
          </div>
          <div>
            <h3 className='mb-1 text-xs uppercase tracking-wider' style={{ color: 'var(--muted)' }}>Key Condition</h3>
            <p className='text-sm' style={{ color: 'var(--foreground)' }}>{conclusion.key_condition as string}</p>
          </div>
          {(conclusion.unresolved_points as Array<{ point: string; agents_involved: string[] }>)?.length > 0 && (
            <div>
              <h3 className='mb-1 text-xs uppercase tracking-wider' style={{ color: 'var(--muted)' }}>Unresolved Points</h3>
              <ul className='space-y-1'>
                {(conclusion.unresolved_points as Array<{ point: string; agents_involved: string[] }>).map((p, i) => (
                  <li key={i} className='text-sm' style={{ color: 'var(--foreground)' }}>
                    — {p.point} <span style={{ color: 'var(--muted)' }}>({p.agents_involved.join(', ')})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {conclusion.review_by && (
            <div>
              <h3 className='mb-1 text-xs uppercase tracking-wider' style={{ color: 'var(--muted)' }}>Review By</h3>
              <p className='text-sm' style={{ color: 'var(--foreground)' }}>{conclusion.review_by as string}</p>
            </div>
          )}
        </div>
      ) : (
        <p className='text-sm' style={{ color: 'var(--muted)' }}>
          The agents could not produce a conclusion that survived independent review.
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Create `Timeline.tsx`**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { AgentCard } from './AgentCard'
import { StreamingEntry } from './StreamingEntry'
import { StateIndicator } from './StateIndicator'
import { ConclusionPanel } from './ConclusionPanel'
import { getAgentConfig, type SSEEvent } from '@/schemas'

interface TranscriptEntry {
  agent: string
  content: string
  round: number
}

interface Props {
  sessionId: string
  initialEntries: TranscriptEntry[]
  initialConclusion: { originalJson: unknown; revisedJson: unknown; terminalState: string; criticVerdict: string } | null
  initialState: string
}

export function Timeline({ sessionId, initialEntries, initialConclusion, initialState }: Props) {
  const [entries, setEntries] = useState<TranscriptEntry[]>(initialEntries)
  const [streamingAgent, setStreamingAgent] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null)
  const [currentState, setCurrentState] = useState(initialState)
  const [conclusion, setConclusion] = useState(initialConclusion)
  const [terminalState, setTerminalState] = useState<string | null>(initialConclusion?.terminalState ?? null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (initialState === 'TERMINAL') return // Archived — no SSE needed

    const eventSource = new EventSource(`/api/deliberation/${sessionId}/stream`)

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data) as SSEEvent

      switch (data.type) {
        case 'agent_start':
          setStreamingAgent(data.agent)
          setStreamingContent('')
          setLoadingMessage(null)
          break

        case 'agent_token':
          setStreamingContent((prev) => prev + data.token)
          break

        case 'agent_complete':
          setEntries((prev) => [...prev, { agent: data.agent, content: data.content, round: data.round }])
          setStreamingAgent(null)
          setStreamingContent('')
          break

        case 'agent_error':
          setStreamingAgent(null)
          setStreamingContent('')
          break

        case 'loading_state':
          setLoadingMessage(data.message)
          break

        case 'state_change':
          setCurrentState(data.state)
          break

        case 'conclusion_complete':
          setTerminalState(data.terminal_state)
          setCurrentState('TERMINAL')
          // Fetch full conclusion from API
          fetch(`/api/sessions/${sessionId}`)
            .then((r) => r.json())
            .then((s) => setConclusion(s.conclusion))
          break

        case 'done':
          eventSource.close()
          break
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
    }

    return () => eventSource.close()
  }, [sessionId, initialState])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries, streamingContent, loadingMessage])

  const round1Entries = entries.filter((e) => e.round === 1)
  const laterEntries = entries.filter((e) => e.round > 1)
  const waitingCount = currentState === 'ROUND_1'
    ? Math.max(0, 4 - round1Entries.length)
    : 0

  return (
    <div className='mx-auto max-w-2xl space-y-4 pb-32'>
      {/* Round 1 cards */}
      {round1Entries.length > 0 && (
        <div className='space-y-3'>
          <h3 className='text-xs uppercase tracking-wider' style={{ color: 'var(--muted)' }}>Round 1 — Initial Positions</h3>
          <div className='grid gap-3'>
            {round1Entries.map((e, i) => {
              const config = getAgentConfig(e.agent as Parameters<typeof getAgentConfig>[0])
              return <AgentCard key={i} role={e.agent} name={config.name} content={e.content} />
            })}
          </div>
          {waitingCount > 0 && (
            <p className='text-center text-xs' style={{ color: 'var(--muted)' }}>
              Waiting for {waitingCount} more agent{waitingCount !== 1 ? 's' : ''}...
            </p>
          )}
        </div>
      )}

      {/* Rounds 2-3 streaming entries */}
      {laterEntries.map((e, i) => (
        <StreamingEntry key={`entry-${i}`} role={e.agent} content={e.content} isStreaming={false} />
      ))}

      {/* Currently streaming agent */}
      {streamingAgent && (
        <StreamingEntry role={streamingAgent} content={streamingContent} isStreaming />
      )}

      {/* Loading state */}
      {loadingMessage && !streamingAgent && (
        <StateIndicator state={currentState} message={loadingMessage} />
      )}

      {/* Conclusion */}
      {terminalState && (
        <ConclusionPanel
          terminalState={terminalState}
          conclusion={(conclusion?.terminalState === 'REVISED' && conclusion?.revisedJson
            ? conclusion.revisedJson
            : conclusion?.originalJson) as Record<string, unknown> | null}
          criticVerdict={conclusion?.criticVerdict}
        />
      )}

      <div ref={bottomRef} />
    </div>
  )
}
```

- [ ] **Step 6: Create `apps/vada-ai/web/src/app/deliberation/[id]/page.tsx`**

```tsx
import { auth } from '@atta/auth/hooks'
import { redirect } from 'next/navigation'
import { getSessionWithTranscript } from '@/db/queries'
import { Timeline } from '@/components/deliberation/Timeline'
import Link from 'next/link'

export default async function DeliberationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const { id } = await params
  const session = await getSessionWithTranscript(id)

  if (!session) {
    return (
      <main className='flex min-h-dvh items-center justify-center'>
        <p style={{ color: 'var(--muted)' }}>Session not found.</p>
      </main>
    )
  }

  const initialEntries = session.transcriptEntries.map((e) => ({
    agent: e.agent,
    content: e.content,
    round: e.round,
  }))

  return (
    <main className='min-h-dvh px-6 py-8'>
      <div className='mx-auto max-w-2xl'>
        <div className='mb-8 flex items-center justify-between'>
          <Link href='/' className='text-xs' style={{ color: 'var(--muted)' }}>
            ← Back
          </Link>
          <Link href='/history' className='text-xs' style={{ color: 'var(--muted)' }}>
            History
          </Link>
        </div>

        <h2 className='mb-6 text-lg font-light' style={{ color: 'var(--foreground)' }}>
          {session.question}
        </h2>

        <Timeline
          sessionId={id}
          initialEntries={initialEntries}
          initialConclusion={session.conclusion}
          initialState={session.state}
        />
      </div>
    </main>
  )
}
```

- [ ] **Step 7: Verify typecheck**

```bash
bun run typecheck
```

- [ ] **Step 8: Commit**

```bash
git add apps/vada-ai/web/src/components/deliberation/ apps/vada-ai/web/src/app/deliberation/
git commit -m "Feat: Add deliberation page with dual-mode timeline

- Live mode: SSE stream subscription with progressive Round 1 reveal
- Archived mode: static transcript rendering from DB
- AgentCard for Round 1 positions, StreamingEntry for Rounds 2-3
- ConclusionPanel with terminal state badge (Clean/Revised/Unconverged)
- Auto-scroll and reconnection support"
```

---

## Task 15: Frontend — History page

**Files:**
- Create: `apps/vada-ai/web/src/components/session/SessionCard.tsx`
- Create: `apps/vada-ai/web/src/components/session/SessionList.tsx`
- Create: `apps/vada-ai/web/src/app/history/page.tsx`

- [ ] **Step 1: Create `SessionCard.tsx`**

```tsx
import Link from 'next/link'

const STATE_COLORS: Record<string, string> = {
  CLEAN: '#2ECC71',
  REVISED: '#C8A84B',
  UNCONVERGED: '#DB4A4A',
}

export function SessionCard({
  id,
  question,
  terminalState,
  state,
  createdAt,
}: {
  id: string
  question: string
  terminalState: string | null
  state: string
  createdAt: string
}) {
  const isComplete = state === 'TERMINAL'
  const stateColor = terminalState ? STATE_COLORS[terminalState] : 'var(--muted)'
  const stateLabel = terminalState ?? 'In Progress'

  return (
    <Link
      href={`/deliberation/${id}`}
      className='block rounded-lg border p-4 transition-opacity hover:opacity-80'
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      <div className='flex items-start justify-between gap-4'>
        <p className='line-clamp-2 flex-1 text-sm' style={{ color: 'var(--foreground)' }}>
          {question}
        </p>
        <span
          className='shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider'
          style={{ color: stateColor, border: `1px solid ${stateColor}` }}
        >
          {stateLabel}
        </span>
      </div>
      <p className='mt-2 text-xs' style={{ color: 'var(--muted)' }}>
        {new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </p>
    </Link>
  )
}
```

- [ ] **Step 2: Create `SessionList.tsx`**

```tsx
import { SessionCard } from './SessionCard'

interface Session {
  id: string
  question: string
  terminalState: string | null
  state: string
  createdAt: string
}

export function SessionList({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return (
      <p className='py-12 text-center text-sm' style={{ color: 'var(--muted)' }}>
        No deliberations yet.
      </p>
    )
  }

  return (
    <div className='space-y-3'>
      {sessions.map((s) => (
        <SessionCard
          key={s.id}
          id={s.id}
          question={s.question}
          terminalState={s.terminalState}
          state={s.state}
          createdAt={s.createdAt}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create `apps/vada-ai/web/src/app/history/page.tsx`**

```tsx
import { auth } from '@atta/auth/hooks'
import { redirect } from 'next/navigation'
import { getOrCreateUser, listSessions } from '@/db/queries'
import { SessionList } from '@/components/session/SessionList'
import Link from 'next/link'

export default async function HistoryPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const user = await getOrCreateUser(clerkId, '')
  const sessions = await listSessions(user.id)

  return (
    <main className='min-h-dvh px-6 py-8'>
      <div className='mx-auto max-w-2xl'>
        <div className='mb-8 flex items-center justify-between'>
          <h1 className='text-lg font-light' style={{ color: 'var(--foreground)' }}>Past Deliberations</h1>
          <Link href='/' className='text-xs underline' style={{ color: 'var(--accent)' }}>
            New deliberation
          </Link>
        </div>
        <SessionList
          sessions={sessions.map((s) => ({
            id: s.id,
            question: s.question,
            terminalState: s.terminalState,
            state: s.state,
            createdAt: s.createdAt?.toISOString() ?? new Date().toISOString(),
          }))}
        />
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Verify typecheck**

```bash
bun run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add apps/vada-ai/web/src/components/session/ apps/vada-ai/web/src/app/history/
git commit -m "Feat: Add session history page

- Chronological list of past deliberations
- SessionCard with question, terminal state badge, and date
- Empty state for new users
- Link to new deliberation"
```

---

## Task 16: End-to-end verification

- [ ] **Step 1: Set up environment**

Create `apps/vada-ai/web/.env.local` with real values:
```env
DATABASE_URL=<your-neon-connection-string>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your-clerk-key>
CLERK_SECRET_KEY=<your-clerk-secret>
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
ANTHROPIC_API_KEY=<your-api-key>
```

- [ ] **Step 2: Push database schema**

```bash
cd apps/vada-ai/web
bunx drizzle-kit push
```

Expected: All 5 tables created in the database.

- [ ] **Step 3: Run typecheck across the monorepo**

```bash
bun run typecheck
```

Expected: All packages pass.

- [ ] **Step 4: Start the dev server**

```bash
bun run dev:vada
```

Expected: Vada starts on port 3003.

- [ ] **Step 5: Test the full flow**

1. Visit `http://localhost:3003` — landing page loads
2. Sign in via Clerk
3. Type a question, click "Start Deliberation"
4. Watch Round 1 cards appear progressively
5. Watch Rounds 2-3 stream sequentially
6. See the conclusion panel with terminal state badge
7. Visit `/history` — see the session listed
8. Click it — archived view loads with full transcript
9. Close tab mid-deliberation, reopen — reconnects and shows transcript so far

- [ ] **Step 6: Verify daily limit**

After 10 sessions, the 11th should return a 429 error.

- [ ] **Step 7: Final commit if any fixes needed**

```bash
git add -A
git commit -m "Fix: Address issues found during end-to-end verification"
```
