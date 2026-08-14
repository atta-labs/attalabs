export type StartNavItem = { slug: string; title: string; href: string }
/** `overview` is a section's distinguished lead item, rendered first inside
 * the section but held apart from `items`: the drift test pins Ship with
 * Vinaya's `items` to exactly the stage model's seven ids, and `StagePage`'s
 * prev/next footer maps over `items` as the stage sequence. Folding Overview
 * into `items` would break both, so the section carries it as its own field
 * instead — same single nav source. */
export type StartNavSection = { label: string; overview?: StartNavItem; items: StartNavItem[] }

/** Plain data module, not `'use client'` — both the server layout and the
 * client sidebar host import the same array, so nav content lives in exactly
 * one place. Mirrors `/docs`' `DocNav` shape (`section.label` + `section.docs`)
 * closely enough that `StartSidebar`/`StartSidebarHost` can reuse `/docs`'
 * rail-vs-drawer layout verbatim, but stays a local type — this section has
 * no model to derive from, only two fixed parts. */
export const START_QUICK: StartNavItem = { slug: 'quick', title: 'Quick Start', href: '/start/quick' }

export const START_NAV: StartNavSection[] = [
  {
    label: 'Ship with Vinaya',
    overview: { slug: 'overview', title: 'Overview', href: '/start/overview' },
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
