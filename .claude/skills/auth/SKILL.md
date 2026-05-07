---
name: auth
description: Clerk authentication patterns across the Atta ecosystem — single Clerk app, subdomain SSO via cookie scope, shared users table
paths:
  - "packages/auth/**"
---

# Authentication — Atta Ecosystem

## Context

The entire Atta ecosystem uses a **single Clerk application** via the `@atta/auth` wrapper package. Authentication state propagates across all product subdomains via a cookie scoped to the parent domain (`.attalabs.dev`).

Sign in once on any subdomain → signed in everywhere. This is the Google model (`mail.google.com`, `docs.google.com` share one identity).

There is **one shared `users` table** in `@atta/db`, keyed by `clerk_id`. Per-product profile rows reference `clerk_id` as a foreign key. Product-specific data lives in product-specific tables; identity does not.

This replaces an earlier "each product has its own Clerk application" model. Per-product Clerk apps are no longer used.

---

## Package Imports

```ts
// Root layout provider (via NextWebShell — usually you don't need this directly)
import { AuthProvider } from '@atta/auth/provider'

// Middleware
import { clerkMiddleware, createRouteMatcher } from '@atta/auth/middleware'

// Server components / route handlers
import { auth, currentUser } from '@atta/auth/hooks'

// Client components
import { useAuth, useUser, useClerk } from '@atta/auth'

// Buttons
import { SignInButton, SignUpButton } from '@atta/auth'
import { SignUpTrigger } from '@atta/auth'

// Theme integration (used internally by NextWebShell)
import { buildClerkAppearance } from '@atta/auth'
```

---

## Rules

### RULE #1: One Clerk app for the entire ecosystem

There is exactly one Clerk application. Its publishable key and secret key are shared across all products in the monorepo. Never create a new Clerk application per product.

```env
# Same values across all apps in the monorepo
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

### RULE #2: Cookie scope must be the parent domain

Production: `.attalabs.dev`
Local development: `.attalabs.test`

This is configured in the Clerk dashboard under "Domains" — set the satellite/primary domains so that the session cookie is set with `Domain=.attalabs.dev`. All product subdomains (`vada.attalabs.dev`, `vitakka.attalabs.dev`, `sati.attalabs.dev`, `account.attalabs.dev`) inherit the session.

### RULE #3: AuthProvider is provided by NextWebShell — don't add it again

`NextWebShell` wraps children in `AuthProvider`. Never add a second `AuthProvider` inside a product.

```tsx
// ✅ Root layout uses NextWebShell — AuthProvider is included
<NextWebShell config={config} styleId="vada-theme">{children}</NextWebShell>

// ❌ Never add AuthProvider manually when using NextWebShell
<AuthProvider><NextWebShell>...</NextWebShell></AuthProvider>
```

### RULE #4: One shared users table

Users are synced from Clerk into a single `users` table in `@atta/db`, keyed by `clerk_id`. Per-product data lives in product-specific tables that reference `clerk_id` as a foreign key.

```ts
// packages/db/src/schema/users.ts (single shared table)
export const users = pgTable('users', {
  clerkId: varchar('clerk_id', { length: 255 }).primaryKey(),
  email: varchar('email', { length: 320 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // shared fields only — no product-specific fields here
})

// Per-product profile in product-specific schema
export const vadaProfile = pgTable('vada_profile', {
  clerkId: varchar('clerk_id', { length: 255 })
    .primaryKey()
    .references(() => users.clerkId, { onDelete: 'cascade' }),
  // ...vada-specific fields
})

export const sataiProfile = pgTable('sati_profile', {
  clerkId: varchar('clerk_id', { length: 255 })
    .primaryKey()
    .references(() => users.clerkId, { onDelete: 'cascade' }),
  // ...sati-specific fields
})
```

### RULE #5: Settings UI is product-local; share at the component level via `@atta/ui/account`

There is no `account.attalabs.dev` hub. Each product hosts its own `/settings` URL (e.g., `vada.attalabs.dev/settings`, `vitakka.attalabs.dev/settings`). Cross-product sharing of the Settings UI happens via shared components in `@atta/ui/account` — currently `<AttaUserProfile />` (themed Clerk profile wrapper), `ProviderKeysSection`, and `ApiKeysSection`. A future product's Settings page composes these alongside any product-specific sections.

Why: standing up a redirect hub at `account.attalabs.dev` would add a deployment surface and a redirect step for what is fundamentally a presentation-layer share. Components are the right level to share at. SSO via the parent-domain cookie scope (RULE #2) handles cross-product navigation.

This rule was previously written as "`account.attalabs.dev` is the canonical settings/billing surface." That is no longer accurate as of May 5, 2026 (D-030).

---

## Middleware (protecting routes)

Every product that has protected routes needs a `middleware.ts` at the app root:

```ts
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@atta/auth/middleware'

const isProtected = createRouteMatcher([
  '/admin(.*)',
  '/app(.*)',
  '/dashboard(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) await auth.protect()
})

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)']
}
```

---

## Reading Auth State

### Server Components / Route Handlers

```ts
import { auth, currentUser } from '@atta/auth/hooks'

const { userId } = await auth()
if (!userId) redirect('/sign-in')

// Heavier — only when needed
const user = await currentUser()
```

### Client Components

```tsx
'use client'
import { useAuth, useUser } from '@atta/auth'

function MyComponent() {
  const { userId, isSignedIn, isLoaded } = useAuth()
  const { user } = useUser()

  if (!isLoaded) return null
  if (!isSignedIn) return <SignInButton />
}
```

---

## Sign In / Sign Up Pages

Each product hosts its own sign-in/sign-up routes that delegate to Clerk. Because the cookie is scoped to `.attalabs.dev`, signing in on any product's `/sign-in` produces a session valid across all products.

```tsx
// apps/{product}/web/src/app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs'
export default function SignInPage() {
  return <SignIn />
}
```

For ecosystem-level marketing flows, route users to whichever product's `/sign-in` is most contextually relevant; the SSO cookie scope means the resulting session works across the ecosystem.

---

## Local Development

Production uses `.attalabs.dev`. Locally, use **`.attalabs.test`** (IETF-reserved TLD, no HTTPS enforcement).

`/etc/hosts`:
```
127.0.0.1   attalabs.test
127.0.0.1   vada.attalabs.test
127.0.0.1   vitakka.attalabs.test
127.0.0.1   sati.attalabs.test
```

In the Clerk dashboard, configure a development instance with cookie domain `.attalabs.test`. Use the development Clerk keys in local `.env` files.

Do **not** use `.attalabs.dev` locally — Chrome forces HTTPS on the `.dev` TLD, which makes self-signed certs painful.

---

## Clerk Appearance (Theme Integration)

Clerk's UI is automatically themed to match the active product's CMS theme via `buildClerkAppearance` inside `NextWebShell`. No manual configuration needed.

If Clerk appearance is needed outside `NextWebShell`:

```ts
import { buildClerkAppearance } from '@atta/auth'

const appearance = buildClerkAppearance({
  background: 'oklch(...)',
  foreground: 'oklch(...)',
  card: 'oklch(...)',
  border: 'oklch(...)',
  primary: 'oklch(...)',
  primaryForeground: 'oklch(...)',
  muted: 'oklch(...)',
  mutedForeground: 'oklch(...)',
  destructive: 'oklch(...)',
})
```

---

## Anti-patterns

- ❌ Creating a separate Clerk application per product
- ❌ Adding `AuthProvider` inside `NextWebShell` children
- ❌ Setting cookie scope to a product subdomain (`vada.attalabs.dev`) instead of the parent (`.attalabs.dev`) — breaks SSO
- ❌ Creating a per-product `users` table — there is one shared table; per-product data lives in per-product profile tables referencing `clerk_id`
- ❌ Storing Clerk's full user object in the database — store only `clerk_id` as FK
- ❌ Using `useAuth` in a Server Component — use `auth()` from `@atta/auth/hooks`
- ❌ Checking `isSignedIn` before `isLoaded` — always gate on `isLoaded` first
- ❌ Building Settings UI fully from scratch in a new product — compose `@atta/ui/account` shared components first (`<AttaUserProfile />`, `ProviderKeysSection`, `ApiKeysSection`), add product-specific sections only where the shared components don't fit
- ❌ Standing up a redirect hub at `account.attalabs.dev` — sharing happens at the component level, not via redirects
- ❌ Using `.attalabs.dev` for local development — use `.attalabs.test`
