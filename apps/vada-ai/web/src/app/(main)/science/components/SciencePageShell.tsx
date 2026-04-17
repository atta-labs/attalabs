import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Heading, Text } from '@atta/ui/shared'
import { Separator } from '@atta/ui'
import { getNextScienceNavItem, getScienceNavItem } from '../nav'

type SciencePageShellProps = {
  slug: string
  summary?: string
}

export function SciencePageShell({ slug, summary }: SciencePageShellProps) {
  const item = getScienceNavItem(slug)
  const next = getNextScienceNavItem(slug)

  if (!item) return null

  return (
    <article className='space-y-10'>
      <header className='space-y-4'>
        {item.eyebrow && <span className='font-mono text-xs text-muted-foreground'>{item.eyebrow}</span>}
        <Heading level={1} className='font-serif text-4xl font-light leading-tight'>
          {item.label}
        </Heading>
        {summary && (
          <Text as='p' muted className='text-lg leading-relaxed'>
            {summary}
          </Text>
        )}
      </header>

      <Separator className='opacity-20' />

      <section className='space-y-4'>
        <Text as='p' muted className='text-sm italic leading-relaxed'>
          Content for this page is coming soon.
        </Text>
      </section>

      {next && (
        <>
          <Separator className='opacity-20' />
          <footer className='flex items-center justify-between'>
            <span className='font-mono text-xs text-muted-foreground uppercase tracking-wider'>Next</span>
            <Link
              href={next.href}
              className='group flex items-center gap-2 font-serif text-base text-foreground hover:text-accent transition-colors'
            >
              <span>{next.label}</span>
              <ArrowRight className='size-4 transition-transform group-hover:translate-x-0.5' />
            </Link>
          </footer>
        </>
      )}
    </article>
  )
}
