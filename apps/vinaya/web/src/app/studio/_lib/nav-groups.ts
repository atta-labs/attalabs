import type { AegNavGroup } from '../_components/StudioSidebar'

export const STUDIO_NAV: AegNavGroup[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    items: [
      { slug: 'overview', href: '/studio', title: 'Overview' },
      { slug: 'projects', href: '/studio/projects', title: 'Projects', matchPrefix: true },
      { slug: 'iterations', href: '/studio/iterations', title: 'Iterations', matchPrefix: true },
      { slug: 'backlog', href: '/studio/backlog', title: 'Backlog' },
      { slug: 'docs', href: '/studio/docs', title: 'Docs', matchPrefix: true }
    ]
  }
]
