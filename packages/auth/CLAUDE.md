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
