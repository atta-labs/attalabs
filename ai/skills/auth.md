---
name: auth
description: Clerk authentication patterns across all Atta AI products — root layout, middleware, server components, per-product isolation
triggers:
  - Adding or editing authentication in any product
  - Creating middleware.ts files
  - Protecting routes
  - Accessing current user in server or client components
---

# Authentication — Atta AI

## Context

All Atta AI products use Clerk via the `@atta/auth` wrapper package. Each product has its own Clerk application and its own local users table. No auth state or user data crosses product boundaries.

---

## Package Imports

```ts
// Root layout provider (via NextWebShell — you usually don't need this directly)
import { AuthProvider } from '@atta/auth/provider'

// Middleware
import { clerkMiddleware, createRouteMatcher } from '@atta/auth/middleware'

// Server components / route handlers
import { auth, currentUser } from '@atta/auth/hooks'   // Clerk's auth() and currentUser()

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

### RULE #1: AuthProvider is provided by NextWebShell — don't add it again

`NextWebShell` wraps children in `AuthProvider`. Never add a second `AuthProvider` inside a product.

```tsx
// ✅ Root layout uses NextWebShell — AuthProvider is included
<NextWebShell config={config} styleId="herald-theme">{children}</NextWebShell>

// ❌ Never add AuthProvider manually when using NextWebShell
<AuthProvider><NextWebShell>...</NextWebShell></AuthProvider>
```

### RULE #2: Each product has its own Clerk keys

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=   # Product-specific
CLERK_SECRET_KEY=                    # Product-specific
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

**Never share Clerk keys between products.** Each product is a separate Clerk application.

### RULE #3: Each product has its own local users table

Users are synced from Clerk into a local `users` table keyed by `clerk_id`. No cross-product user table sharing.

```ts
// Per-product pattern in src/db/schema.ts
export const users = pgTable('users', {
  clerkId: varchar('clerk_id', { length: 255 }).primaryKey(),
  // ...product-specific fields
})
```

---

## Middleware (protecting routes)

Every product that has protected routes needs a `middleware.ts` at the app root (`src/middleware.ts` or root `middleware.ts`):

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
import { auth } from '@atta/auth/hooks'

// In an async server component or route handler
const { userId } = await auth()
if (!userId) redirect('/sign-in')

// Get full user object (heavier — use only when needed)
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

Use Clerk's hosted components at the configured paths:

```
/sign-in  →  Clerk SignIn component
/sign-up  →  Clerk SignUp component
```

```tsx
// apps/{product}/web/src/app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs'
export default function SignInPage() {
  return <SignIn />
}
```

---

## Clerk Appearance (Theme Integration)

Clerk's UI is automatically themed to match the product's CMS theme via `buildClerkAppearance` inside `NextWebShell`. You never need to configure this manually.

If you need Clerk appearance outside of `NextWebShell`:

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

- ❌ Adding `AuthProvider` inside `NextWebShell` children — it's already provided
- ❌ Sharing `CLERK_SECRET_KEY` across products
- ❌ Reading user data from another product's Clerk application
- ❌ Storing Clerk's full user object in the database — store only `clerk_id` as FK
- ❌ Using `useAuth` in a Server Component — use `auth()` from `@atta/auth/hooks`
- ❌ Checking `isSignedIn` before `isLoaded` — always gate on `isLoaded` first
