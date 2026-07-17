import { Separator, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Heading, Text } from '@atta/ui/shared'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { stripLeadingH1 } from '@atta/aeg-core/docs'
import type { Doc } from '@atta/aeg-core/docs'

import { StickyDocHeader } from './StickyDocHeader'

export type DocPageProps = {
  doc: Doc
  body: string
  next?: Doc
  prev?: Doc
  basePath?: string
}

const markdownComponents = {
  // Heading forces weight='bold' and tracking-tight by default — doc content
  // wants font-light headings (h3/h4 aside) with normal tracking, which
  // Heading's props can't express (no 'light' weight), so both are
  // overridden via className. size is passed explicitly since doc content
  // doesn't follow Heading's level-to-size default scale (h1 is text-3xl
  // here, not Heading's default text-4xl — the page's own title, not
  // markdown body content, uses the level-1 default untouched below).
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <Heading
      level={1}
      size='3xl'
      className='mt-10 mb-4 font-serif font-light tracking-normal leading-tight text-foreground'
      {...props}
    />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <Heading
      level={2}
      size='2xl'
      className='mt-10 mb-3 font-serif font-light tracking-normal leading-tight text-foreground'
      {...props}
    />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <Heading
      level={3}
      size='xl'
      weight='medium'
      className='mt-8 mb-2 font-serif tracking-normal leading-snug text-foreground'
      {...props}
    />
  ),
  h4: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <Heading
      level={4}
      size='md'
      weight='semibold'
      className='mt-6 mb-2 font-sans uppercase tracking-wide text-muted-foreground'
      {...props}
    />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className='my-4 leading-relaxed text-foreground' {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className='my-4 list-disc space-y-1 pl-6 text-foreground' {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className='my-4 list-decimal space-y-1 pl-6 text-foreground' {...props} />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => <li className='leading-relaxed' {...props} />,
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className='my-6 border-l-2 border-accent/60 pl-4 text-muted-foreground italic' {...props} />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code className='rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[0.92em] text-foreground' {...props} />
  ),
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
    <pre className='my-4 overflow-x-auto rounded-md bg-muted p-4 font-mono text-sm text-foreground' {...props} />
  ),
  a: ({ href, children }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <NextLink href={href ?? '#'} variant='unstyled' className='text-accent underline-offset-4 hover:underline'>
      {children}
    </NextLink>
  ),
  hr: () => <Separator className='my-8 opacity-50' />,
  // Routed through the library-switchable Table set (not a raw <table>) so
  // a product on the retro/animate/brutal library actually gets that
  // library's table look here — a hardcoded <table> can never do that,
  // regardless of className. TableRow already puts a border-b on each row,
  // so per-cell borders (th/td) are dropped as redundant, not reinvented.
  table: (props: React.TableHTMLAttributes<HTMLTableElement>) => <Table className='my-6' {...props} />,
  thead: (props: React.HTMLAttributes<HTMLTableSectionElement>) => <TableHeader {...props} />,
  tbody: (props: React.HTMLAttributes<HTMLTableSectionElement>) => <TableBody {...props} />,
  tr: (props: React.HTMLAttributes<HTMLTableRowElement>) => <TableRow {...props} />,
  th: (props: React.ThHTMLAttributes<HTMLTableCellElement>) => (
    <TableHead className='font-semibold text-foreground' {...props} />
  ),
  td: (props: React.TdHTMLAttributes<HTMLTableCellElement>) => <TableCell className='text-foreground' {...props} />,
  strong: (props: React.HTMLAttributes<HTMLElement>) => <strong className='font-semibold text-foreground' {...props} />,
  em: (props: React.HTMLAttributes<HTMLElement>) => <em className='italic' {...props} />
}

export function DocPage({ doc, body, next, prev, basePath = '/docs' }: DocPageProps) {
  const content = stripLeadingH1(body)

  return (
    <>
      <StickyDocHeader title={doc.title} section={doc.section} />
      <article className='space-y-4 pt-4'>
        <header className='space-y-3'>
          <Text as='span' size='xs' muted className='font-mono uppercase tracking-[0.15em]'>
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

        <div className='text-base doc-page-content'>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {content}
          </ReactMarkdown>
        </div>

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
