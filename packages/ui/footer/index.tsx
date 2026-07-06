import type * as React from 'react'
import Link from 'next/link'
import { AttaMark } from './marks/atta-mark'
import { AttalabsMark } from './marks/attalabs-mark'
import { HeraldMark } from './marks/herald-mark'
import { VadaMark } from './marks/vada-mark'
import { VitakkaMark } from './marks/vitakka-mark'

export type ProductId = 'attalabs' | 'atta' | 'vada' | 'vitakka' | 'herald'

export interface FooterLink {
  label: string
  href: string
  external?: boolean
}

export interface FooterProps {
  product: ProductId
  tagline: string
  links?: FooterLink[]
}

const PRODUCT_NAMES: Record<ProductId, string> = {
  attalabs: 'AttaLabs',
  atta: 'Atta',
  vada: 'Vāda',
  vitakka: 'Vitakka',
  herald: 'Herald'
}

type MarkComponent = React.ComponentType<{ className?: string }>
const MARKS: Record<ProductId, MarkComponent> = {
  attalabs: AttalabsMark,
  atta: AttaMark,
  vada: VadaMark,
  vitakka: VitakkaMark,
  herald: HeraldMark
}

export function Footer({ product, tagline, links = [] }: FooterProps) {
  const Mark = MARKS[product]
  const currentYear = new Date().getFullYear()

  return (
    <footer className='border-t border-border px-6 py-12'>
      <div className='mx-auto flex max-w-4xl flex-col gap-8'>
        {/* Row 2 — Mark + product name + tagline | links */}
        <div className='flex flex-col gap-6 md:flex-row md:items-start md:justify-between'>
          <div>
            <div className='flex items-center gap-2'>
              <Mark className='h-8 w-8 text-foreground' />
              <p className='font-serif text-lg text-foreground'>{PRODUCT_NAMES[product]}</p>
            </div>
            <p className='text-sm text-muted-foreground'>{tagline}</p>
          </div>
          {links.length > 0 && (
            <nav className='flex flex-wrap items-center gap-y-1'>
              {links.map((link, i) => (
                <span key={link.href} className='flex items-center'>
                  {i > 0 && (
                    <span className='mx-2 font-mono text-xs text-muted-foreground' aria-hidden='true'>
                      ·
                    </span>
                  )}
                  {link.external ? (
                    <a
                      href={link.href}
                      target='_blank'
                      rel='noreferrer'
                      className='font-mono text-xs uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground'
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className='font-mono text-xs uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground'
                    >
                      {link.label}
                    </Link>
                  )}
                </span>
              ))}
            </nav>
          )}
        </div>

        {/* Row 3 — Attribution + copyright */}
        <div className='flex items-center justify-between'>
          <span className='text-xs italic text-muted-foreground/60'>An AttaLabs product</span>
          <span className='text-xs text-muted-foreground/60'>
            © {currentYear} AttaLabs ·{' '}
            <a href='https://attalabs.dev' className='transition-colors hover:text-muted-foreground'>
              attalabs.dev
            </a>
          </span>
        </div>
      </div>
    </footer>
  )
}
