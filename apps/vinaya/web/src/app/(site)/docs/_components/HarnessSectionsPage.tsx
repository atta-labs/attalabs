import { Badge, Separator } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Heading, Text } from '@atta/ui/shared'
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react'
import type { Doc } from '@atta/aeg-core/docs'
import { StickyDocHeader } from './StickyDocHeader'

/**
 * A model-derived `/docs` page: a list of `#`-anchored sections, one per
 * row-sized node (a ring's gates, or the actions). Every section's heading
 * `id` is the shared slug from `@atta/aeg-core`'s `nodeDocRoute`, so a deep
 * link (`/docs/rings/ring-0#git-commit`) lands on the exact section. Content
 * is model-sourced — heading, badges, the question (`summary`), the plain
 * sentence (`detail`), and the guarded action — nothing hand-written.
 */
export type HarnessSection = {
  slug: string
  heading: string
  /** category / crosses / actor chips. */
  badges: string[]
  /** ring-0 only: the action(s) this gate guards. */
  guards?: string[]
  /** who performs it — actions only. */
  performedBy?: string[]
  summary?: string
  detail?: string
  viewSourceHref?: string
}

/** A titled, `#`-anchored group of sections (e.g. the Actions page's "Reaches
 * GitHub" / "Stays local"). When a page needs no grouping (the ring pages), it
 * passes `sections` directly instead. */
export type HarnessSectionGroup = {
  id: string
  label: string
  sections: HarnessSection[]
}

export type HarnessSectionsPageProps = {
  doc: Doc
  /** Flat sections (ring pages). */
  sections?: HarnessSection[]
  /** Grouped sections with anchored group headings (actions page). */
  groups?: HarnessSectionGroup[]
  next?: Doc
  prev?: Doc
  basePath?: string
}

function SectionBlock({ section }: { section: HarnessSection }) {
  return (
    <section id={section.slug} className='scroll-mt-24 space-y-2'>
      <Heading level={3} size='xl' className='font-mono text-card-foreground text-base uppercase tracking-widest'>
        {section.heading}
      </Heading>

      {section.badges.length > 0 && (
        <div className='flex flex-wrap gap-1.5'>
          {section.badges.map((label) => (
            <Badge key={label} className='w-fit font-mono text-xs uppercase'>
              {label}
            </Badge>
          ))}
        </div>
      )}

      {section.summary && (
        <Text size='lg' weight='semibold' className='font-serif text-card-foreground italic leading-snug'>
          {section.summary}
        </Text>
      )}

      {section.detail && (
        <Text size='md' className='font-sans text-card-foreground leading-relaxed'>
          {section.detail}
        </Text>
      )}

      {section.guards && section.guards.length > 0 && (
        <Text size='sm' muted className='font-sans leading-relaxed'>
          Guards: {section.guards.join(', ')}
        </Text>
      )}

      {section.performedBy && section.performedBy.length > 0 && (
        <Text size='sm' muted className='font-sans leading-relaxed'>
          Performed by: {section.performedBy.join(', ')}
        </Text>
      )}

      {section.viewSourceHref && (
        <NextLink
          href={section.viewSourceHref}
          target='_blank'
          rel='noreferrer'
          variant='link'
          className='inline-flex w-fit items-center gap-1 text-muted-foreground text-sm hover:text-primary'
        >
          View source
          <ArrowUpRight className='h-3.5 w-3.5' />
        </NextLink>
      )}
    </section>
  )
}

export function HarnessSectionsPage({
  doc,
  sections,
  groups,
  next,
  prev,
  basePath = '/docs'
}: HarnessSectionsPageProps) {
  return (
    <>
      <StickyDocHeader title={doc.title} section={doc.section} />
      <article className='space-y-4'>
        <header className='space-y-3'>
          <Text as='span' size='xs' muted className='font-mono uppercase tracking-widest'>
            {doc.section}
          </Text>
          <Heading level={1} className='font-serif font-light tracking-normal leading-tight text-foreground'>
            {doc.title}
          </Heading>
          {doc.description && (
            <Text size='lg' muted className='leading-relaxed'>
              {doc.description}
            </Text>
          )}
        </header>

        <Separator className='opacity-60' />

        {groups ? (
          <div className='doc-page-content space-y-12'>
            {groups.map((group) => (
              <div key={group.id} className='space-y-8'>
                <Heading
                  id={group.id}
                  level={2}
                  className='scroll-mt-24 font-serif font-light tracking-normal leading-tight text-foreground'
                >
                  {group.label}
                </Heading>
                {group.sections.map((section) => (
                  <SectionBlock key={section.slug} section={section} />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className='doc-page-content space-y-10'>
            {(sections ?? []).map((section) => (
              <SectionBlock key={section.slug} section={section} />
            ))}
          </div>
        )}

        {(prev || next) && (
          <>
            <Separator className='opacity-60' />
            <footer className='flex items-center justify-between gap-4 pt-2'>
              {prev ? (
                <NextLink
                  href={`${basePath}/${prev.slug}`}
                  variant='nav'
                  className='group flex items-center gap-2 font-serif text-base text-foreground'
                >
                  <ArrowLeft className='size-4 transition-transform group-hover:-translate-x-0.5' />
                  <span>{prev.title}</span>
                </NextLink>
              ) : (
                <span />
              )}
              {next ? (
                <NextLink
                  href={`${basePath}/${next.slug}`}
                  variant='nav'
                  className='group flex items-center gap-2 font-serif text-base text-foreground'
                >
                  <span>{next.title}</span>
                  <ArrowRight className='size-4 transition-transform group-hover:translate-x-0.5' />
                </NextLink>
              ) : (
                <span />
              )}
            </footer>
          </>
        )}
      </article>
    </>
  )
}
