'use client'

import Link from 'next/link'
import type { DocNav } from '../types'

export type DocSidebarProps = {
  nav: DocNav
  pathname: string
  basePath?: string
}

export function DocSidebar({ nav, pathname, basePath = '/docs' }: DocSidebarProps) {
  return (
    <nav aria-label='Documentation' className='w-56 shrink-0 self-start border-r border-border px-3 py-2'>
      <ul className='space-y-6'>
        {nav.sections.map((section) => (
          <li key={section.id}>
            <div className='px-2 pb-2 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground'>
              {section.label}
            </div>
            <ul className='space-y-0.5'>
              {section.docs.map((doc) => {
                const href = `${basePath}/${doc.slug}`
                const isActive = pathname === href
                const linkClass = isActive
                  ? 'block rounded-md bg-accent px-2 py-1.5 font-sans text-sm text-accent-foreground'
                  : 'block rounded-md px-2 py-1.5 font-sans text-sm text-foreground hover:bg-accent/20 hover:text-accent-foreground'
                return (
                  <li key={doc.slug}>
                    <Link href={href} className={linkClass}>
                      {doc.title}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  )
}
