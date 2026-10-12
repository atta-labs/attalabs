/**
 * Single source of truth for route access control and navigation.
 * Middleware, the topbar and the footer all consume this to stay in sync.
 */

export interface NavLink {
  href: string
  label: string
  exact: boolean
}

const TEAMS: NavLink = { href: '/teams', label: 'Teams', exact: false }
const MCP: NavLink = { href: '/mcp', label: 'MCP', exact: false }
const TRUST: NavLink = { href: '/trust', label: 'Trust', exact: false }
const DELIBERATE: NavLink = { href: '/deliberate', label: 'Deliberate', exact: true }
const SESSIONS: NavLink = { href: '/sessions', label: 'Sessions', exact: true }

/** Topbar for a signed-out visitor: what they check before signing up. */
export const SIGNED_OUT_NAV: NavLink[] = [TEAMS, MCP, TRUST]

/** Topbar once signed in: what they use, Deliberate first. Trust moves to the footer. */
export const SIGNED_IN_NAV: NavLink[] = [DELIBERATE, SESSIONS, TEAMS, MCP]

/** Footer link row. Sessions only once signed in — for a visitor it would only bounce to sign-in. */
export const SIGNED_OUT_FOOTER_NAV: NavLink[] = [TEAMS, MCP, TRUST]
export const SIGNED_IN_FOOTER_NAV: NavLink[] = [TEAMS, MCP, TRUST, SESSIONS]

/** Route patterns that require authentication (for middleware) */
export const PROTECTED_ROUTE_PATTERNS = [
  '/deliberate(.*)',
  '/deliberation(.*)',
  '/sessions(.*)',
  '/settings(.*)',
  '/bench(.*)'
]
