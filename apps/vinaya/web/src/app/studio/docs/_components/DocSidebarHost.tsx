'use client'

import { usePathname } from 'next/navigation'
import type { DocNav } from '@atta/aeg-core/docs'
import { DocSidebar } from './DocSidebar'

export function DocSidebarHost({ nav }: { nav: DocNav }) {
  const pathname = usePathname() ?? ''
  return <DocSidebar nav={nav} pathname={pathname} />
}
