'use client'

import { usePathname } from 'next/navigation'
import { DocSidebar } from '@atta/aeg-core/docs'
import type { DocNav } from '@atta/aeg-core/docs'

export function DocSidebarHost({ nav }: { nav: DocNav }) {
  const pathname = usePathname() ?? ''
  return <DocSidebar nav={nav} pathname={pathname} />
}
