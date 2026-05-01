/**
 * Single source of truth for route access control and navigation.
 * Both middleware and topbar consume this to stay in sync.
 */

export interface NavLink {
  href: string
  label: string
  exact: boolean
}

/** Routes visible to all users */
export const PUBLIC_ROUTES: NavLink[] = [
  { href: '/trust', label: 'Trust · Vāda', exact: false },
  { href: '/teams', label: 'Teams', exact: false }
]

/** Routes visible only to authenticated users */
export const AUTH_ROUTES: NavLink[] = [
  { href: '/deliberate', label: 'Deliberate', exact: true },
  { href: '/sessions', label: 'My Sessions', exact: true }
]

/** Route patterns that require authentication (for middleware) */
export const PROTECTED_ROUTE_PATTERNS = [
  '/deliberate(.*)',
  '/deliberation(.*)',
  '/sessions(.*)',
  '/settings(.*)',
  '/bench(.*)'
]
