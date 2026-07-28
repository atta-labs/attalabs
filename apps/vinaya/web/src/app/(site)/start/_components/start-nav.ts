export type StartNavItem = { slug: string; title: string; href: string }
export type StartNavSection = { label: string; items: StartNavItem[] }

/** Plain data module, not `'use client'` — both the server layout and the
 * client sidebar host import the same array, so nav content lives in exactly
 * one place. Mirrors `/docs`' `DocNav` shape (`section.label` + `section.docs`)
 * closely enough that `StartSidebar`/`StartSidebarHost` can reuse `/docs`'
 * rail-vs-drawer layout verbatim, but stays a local type — this section has
 * no model to derive from, only two fixed parts. */
export const START_OVERVIEW: StartNavItem = { slug: 'overview', title: 'Overview', href: '/start' }

export const START_NAV: StartNavSection[] = [
  {
    label: 'Quick Start',
    items: [{ slug: 'quick', title: 'Quick Start', href: '/start/quick' }]
  },
  {
    label: 'Ship with Vinaya',
    items: [
      { slug: 'plan', title: 'Plan', href: '/start/plan' },
      { slug: 'brief', title: 'Brief', href: '/start/brief' },
      { slug: 'develop', title: 'Develop', href: '/start/develop' },
      { slug: 'review', title: 'Review', href: '/start/review' },
      { slug: 'security', title: 'Security', href: '/start/security' },
      { slug: 'archive', title: 'Archive', href: '/start/archive' },
      { slug: 'wrap-up', title: 'Wrap Up', href: '/start/wrap-up' }
    ]
  }
]
