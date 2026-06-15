'use client'

import { usePathname } from 'next/navigation'
import { DocSidebar } from '@atta/aeg-core/docs'
import type { DocNav } from '@atta/aeg-core/docs'

export function DocSidebarHost({ nav, basePath }: { nav: DocNav; basePath: string }) {
  const pathname = usePathname() ?? basePath
  return <DocSidebar nav={nav} pathname={pathname} basePath={basePath} />
}
