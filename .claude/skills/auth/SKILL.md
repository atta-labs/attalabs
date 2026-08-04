---
name: auth
description: Clerk authentication patterns across the Atta ecosystem — shared single Clerk app with subdomain SSO for Atta/Vāda; Herald is a standalone exception with its own Clerk app and DB
---

# Authentication — Atta Ecosystem

## Context

The **Atta family** (Atta, Vāda, and other Atta-composed surfaces) uses a **single Clerk application** via the `@atta/auth` wrapper, with auth state propagating across product subdomains via a cookie scoped to the parent domain (`.attalabs.dev`). Sign in once on any Atta-family subdomain → signed in everywhere (the Google model).

**Herald is a deliberate exception** (D-031) — a standalone identity perimeter with its own Clerk app, DB, and key table. It does **not** share identity or SSO with the Atta family. See "Herald exception" below for the specifics before applying any rule here to Herald.

For the Atta family, identity does not live in product tables — see RULE #4 for the shared `users` table.

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

## Rules (Atta family)

> These rules govern the **Atta family** (Atta, Vāda, future Atta-composed surfaces). Herald follows the "Herald exception" section, not these.

### RULE #1: One Clerk app for the Atta family

The Atta family shares exactly one Clerk application; its keys are shared across those apps in the monorepo. Do not create a new Clerk app for a new *Atta-family* surface. (Standalone sibling products like Herald are separate — see the exception.)

```env
# Same values across Atta-family apps
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

### RULE #2: Cookie scope must be the parent domain

Production: `.attalabs.dev` · Local: `.attalabs.test`. Set in the Clerk dashboard so the session cookie is `Domain=.attalabs.dev`; Atta-family subdomains inherit the session.

### RULE #3: AuthProvider is provided by NextWebShell — don't add it again

`NextWebShell` wraps children in `AuthProvider`. Never add a second `AuthProvider` inside a product.

```tsx
// ✅ Root layout uses NextWebShell — AuthProvider is included
<NextWebShell config={config} styleId="vada-theme">{children}</NextWebShell>

// ❌ Never add AuthProvider manually when using NextWebShell
<AuthProvider><NextWebShell>...</NextWebShell></AuthProvider>
```

### RULE #4: One shared users table (Atta family)

Users sync from Clerk into a single `users` table in `@atta/db`, keyed by `clerk_id`; per-product data lives in product-specific tables referencing `clerk_id`.

```ts
export const users = pgTable('users', {
  clerkId: varchar('clerk_id', { length: 255 }).primaryKey(),
  email: varchar('email', { length: 320 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const vadaProfile = pgTable('vada_profile', {
  clerkId: varchar('clerk_id', { length: 255 })
    .primaryKey()
    .references(() => users.clerkId, { onDelete: 'cascade' }),
})
```

### RULE #5: Settings UI is product-local; share at the component level via `@atta/ui/account`

There is no `account.attalabs.dev` hub. Each product hosts its own `/settings` URL. Cross-product sharing happens via shared components in `@atta/ui/account` — `<AttaUserProfile />`, `ProviderKeysSection`, `ApiKeysSection`. (Previously written as "`account.attalabs.dev` is canonical"; no longer accurate as of May 5, 2026.)

---

## Herald exception (D-031)

Herald does **not** follow Rules #1, #2, #4 above. It is a standalone identity perimeter:

- **Own Clerk app** (`closing-blowfish-4`) — separate publishable/secret keys from the Atta family. This is the one sanctioned per-product Clerk app.
- **Own Neon DB** and **own `user_provider_keys`** table, keyed by Herald Clerk IDs. No shared `users` table with the Atta family.
- **No SSO across the Herald boundary** — a session or key in Vāda does not carry to Herald, and vice versa.
- **Shared at the code level only** — `@atta/ui/account`, `@atta/crypto`, `@atta/db/queries` are shared implementations; identity and data are not.
- Uses the same `MASTER_ENCRYPTION_KEY` value as Vāda, but separate DBs mean no shared ciphertext regardless. `MASTER_ENCRYPTION_KEY` must be present in Herald's env for BYOK decrypt (audits).

What Herald **does** share in spirit: Rule #3 (don't double-wrap `AuthProvider`), Rule #5 (Settings UI is product-local, composed from `@atta/ui/account` — Herald's Account tab wraps `<AttaUserProfile/>` in a full-screen modal via the Herald-local `HeraldAccountTab`), and the server/client auth-reading patterns below.

Reversal (folding Herald into the shared Clerk app) requires migrating Herald identities and re-keying stored data; cheapest while Herald users are few.

### Herald library/chrome note (cross-ref, not auth)

Unrelated to auth but adjacent in Herald's layout: Herald's **app chrome** uses the build-time CMS library; the **user's saved library preference applies only to their public `/[username]` profile** (D-035). Don't wire app-chrome components to a user-library provider. See `apps/herald-ai/specs/herald-app-architecture.md` §4.

### Herald owner-route gate (D-061)

Herald has a per-route ownership gate on top of Clerk auth: routes under `app/[username]/(owner)/*` (currently `/{username}/ui` and `/{username}/settings`) are only accessible to the signed-in user whose own `username` matches the `[username]` URL segment.

`app/[username]/(owner)/layout.tsx` runs the gate in this order:

```ts
const { userId } = await auth()
if (!userId) redirect('/sign-in')                              // anonymous → /sign-in

const user = await getUserByClerkId(userId)
if (!user?.onboardingComplete) redirect('/onboarding')         // half-onboarded → /onboarding

const { username: segment } = await params
if (user.username !== segment) notFound()                      // wrong owner → 404
```

The public profile at `/[username]` (rendered by the sibling `(profile)` route group) stays open and unaffected; only the `(owner)` subtree is gated.

This is *not* middleware-level — `proxy.ts` only protects `/bulk-audit(.*)` and `/onboarding`. The owner segment is matched dynamically (`/:username/ui`, `/:username/settings`) which is more naturally expressed in the layout. The Clerk middleware does its usual `auth.protect()` job for the unauthenticated case via the `redirect('/sign-in')` in the layout; the ownership check is layout-only because it depends on a DB lookup the middleware can't do.

If adding more owner-only routes under `/[username]/`, place them inside `(owner)/` — they will inherit the gate for free. Routes that should stay public (visible to anyone visiting `/[username]/*`) go inside `(profile)/`.

---

## Middleware (protecting routes)

```ts
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@atta/auth/middleware'

const isProtected = createRouteMatcher([
  '/bulk-audit(.*)',
  '/ui(.*)',
  '/settings(.*)',
  '/onboarding(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) await auth.protect()
})

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)']
}
```

> The matcher above shows Herald's flat routes (D-036). Atta-family apps use their own protected prefixes (e.g. `/app`, `/dashboard`).

---

## Reading Auth State

### Server Components / Route Handlers

```ts
import { auth, currentUser } from '@atta/auth/hooks'

const { userId } = await auth()
if (!userId) redirect('/sign-in')
const user = await currentUser() // heavier — only when needed
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

> SSR tip (Herald topbar): a server component that knows `userId` can pass `isSignedIn={!!userId}` into a client topbar to render the correct signed-in/out state on the server and avoid the sign-in→sign-out flash. See `HeraldTopBar`.

---

## Sign In / Sign Up Pages

Each product hosts its own sign-in/sign-up routes that delegate to Clerk. For the Atta family, the `.attalabs.dev` cookie scope means a session from any product's `/sign-in` works across the family. Herald signs in against its own Clerk app; its session is Herald-only.

```tsx
// apps/{product}/web/src/app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs'
export default function SignInPage() {
  return <SignIn />
}
```

---

## Local Development

Atta family: use **`.attalabs.test`** locally (IETF-reserved TLD, no HTTPS enforcement).

```
127.0.0.1   attalabs.test
127.0.0.1   vada.attalabs.test
```

Configure a Clerk development instance with cookie domain `.attalabs.test`. Do **not** use `.attalabs.dev` locally (Chrome forces HTTPS on `.dev`). Herald uses its own Clerk development instance.

---

## Clerk Appearance (Theme Integration)

Clerk's UI is themed to the active product's CMS theme via `buildClerkAppearance` inside `NextWebShell`. If needed outside `NextWebShell`:

```ts
import { buildClerkAppearance } from '@atta/auth'
const appearance = buildClerkAppearance({ background: 'oklch(...)', foreground: 'oklch(...)', card: 'oklch(...)', border: 'oklch(...)', primary: 'oklch(...)', primaryForeground: 'oklch(...)', muted: 'oklch(...)', mutedForeground: 'oklch(...)', destructive: 'oklch(...)' })
```

---

## Anti-patterns

- ❌ Creating a separate Clerk application for a new **Atta-family** surface (Herald's own app is the one sanctioned exception, D-031 — not a precedent for Atta-family products)
- ❌ Sharing a Clerk app or `users` table **between Herald and the Atta family** — Herald's identity perimeter is separate
- ❌ Adding `AuthProvider` inside `NextWebShell` children
- ❌ Setting Atta-family cookie scope to a product subdomain instead of the parent `.attalabs.dev` — breaks SSO
- ❌ Storing Clerk's full user object in the database — store only `clerk_id` as FK
- ❌ Using `useAuth` in a Server Component — use `auth()` from `@atta/auth/hooks`
- ❌ Checking `isSignedIn` before `isLoaded` — always gate on `isLoaded` first
- ❌ Building Settings UI fully from scratch in a new product — compose `@atta/ui/account` first
- ❌ Standing up a redirect hub at `account.attalabs.dev`
- ❌ Using `.attalabs.dev` for local development — use `.attalabs.test`
