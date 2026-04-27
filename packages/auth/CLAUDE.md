# @atta/auth — Shared Authentication

Shared Clerk authentication utilities for the Atta AI ecosystem. The entire ecosystem uses a **single Clerk application** with subdomain SSO via cookie scoping to `.attalabs.dev` (prod) or `.attalabs.test` (dev).

Sign in once on any product subdomain → signed in everywhere.

## Usage

### Root Layout
```tsx
import { AuthProvider } from '@atta/auth/provider'

export default function RootLayout({ children }) {
  return <AuthProvider>{children}</AuthProvider>
}
```

Usually wrapped by `NextWebShell` — do not add `AuthProvider` again if using `NextWebShell`.

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
import { auth, currentUser } from '@atta/auth/hooks'
const { userId } = await auth()
```

### Client Components
```tsx
'use client'
import { useAuth, useUser } from '@atta/auth'

function MyComponent() {
  const { userId, isSignedIn, isLoaded } = useAuth()
}
```

## Key Rules

- **One Clerk application** for the entire ecosystem (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY shared across all products)
- **One shared `users` table** in `@atta/db`, keyed by `clerk_id`
- **Per-product profile tables** reference `users.clerk_id` as FK
- Cookie domain set in Clerk dashboard: `.attalabs.dev` (prod), `.attalabs.test` (dev)
- No per-product Clerk applications
