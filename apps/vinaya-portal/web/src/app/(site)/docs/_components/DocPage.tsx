// `@atta/ui/components`, not bare `@atta/ui`: this app's tsconfig aliases only
// the exact string `@atta/ui/components` (→ `generated/vinayaPortal/components`, the
// active-library passthrough). Bare `@atta/ui` has no alias here, so it falls
// back to `packages/ui/package.json`'s `"."` export — hardcoded
// `libraries/basic/components` — which would pin this page to `basic` no matter
// which library the CMS selects. See ui-library-system's "Subpath Import
// Bypass Bug": the aliased flat string is the one that resolves per-library.
import {
  Badge,
  Code,
  CodeBlock,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Heading, Text } from '@atta/ui/shared'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react'
import { stripLeadingH1 } from '@attalabs/aeg-core/docs'
import type { Doc } from '@attalabs/aeg-core/docs'
import { StickyDocHeader } from './StickyDocHeader'

export type DocPageProps = {
  doc: Doc
  body: string
  next?: Doc
  prev?: Doc
  basePath?: string
  /** The model frame for this doc's node: the kind that backs it (`role`,
   * `contract`, `enforcement`) and its `category`/`actorType` badges. Present
   * for the 16 model-backed docs, all doc-model-sourced — the page hand-writes
   * none of it. The raw markdown below is framed as the machine artifact it is. */
  frame?: { kindTag: string; badges: string[] }
  /** A contract's seam in words — the role that fills it, and the role that
   * drains it. Model-derived; absent for roles and for synthetic pages. */
  seam?: { producer?: string; consumer?: string }
  /** The full source file on GitHub. A role/contract page publishes only the
   * binding short version, so the reference it sits on is linked rather than
   * hidden — public, just not the page. */
  sourceHref?: string
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
    <blockquote className='my-6 border-l-2 border-primary/60 pl-4 text-muted-foreground italic' {...props} />
  ),
  // `Code`/`CodeBlock` from the cross-library contract, not local class
  // strings — their values were copied FROM this file when `vinaya-pages-v1`
  // task 9 (#569) added them for the CLI reference (then at `/install`, later
  // `/cli`, today `/docs/cli`), so the chip/block
  // treatments are the same pixels, now from one source instead of two.
  //
  // The `className` branch is not decoration: ReactMarkdown routes BOTH inline
  // code and a fenced block's inner `<code>` through this one entry, and only
  // the fenced-with-a-language case arrives carrying `language-<x>`. `Code`
  // merges (`cn(chip, className)`) where the old local element overwrote
  // (`<code className='chip' {...props}/>` — a later JSX prop wins), so an
  // unconditional `<Code {...props}/>` would newly stamp the chip (muted fill,
  // padding, 0.92em) INSIDE every fenced block that names a language. Keeping
  // the overwrite semantics preserves the byte-identical render the adoption
  // promised: `CodeBlock`'s `<pre>` already owns the block treatment, so the
  // inner element wants no chip.
  code: ({ className, ...props }: React.HTMLAttributes<HTMLElement>) =>
    className ? <code className={className} {...props} /> : <Code {...props} />,
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => <CodeBlock {...props} />,
  a: ({ href, children }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <NextLink href={href ?? '#'} variant='unstyled' className='text-primary underline-offset-4 hover:underline'>
      {children}
    </NextLink>
  ),
  hr: () => <Separator className='my-8 opacity-50' />,
  // Routed through the library-switchable Table set (not a raw <table>) so
  // a product on the retro/animate/brutal library actually gets that
  // library's table look here — a hardcoded <table> can never do that,
  // regardless of className. TableRow already puts a border-b on each row,
  // so per-cell borders (th/td) are dropped as redundant, not reinvented.
  // `@atta/ui` Table owns its own horizontal-scroll container, so a wide markdown
  // table scrolls inside its own box instead of bleeding past the prose column.
  // `containerClassName` puts the block margin on that scroll wrapper.
  // `@min-[780px]/tbl:[&_thead_th]:top-15` shifts the pinned header below the
  // sticky doc breadcrumb (`StickyDocHeader`, `sticky top-2`). `top-15` (60px)
  // clears the RETRO-floated bar (its `top-2` clearance + `px-2 pt-2` gap + `h-11`
  // content); under a flush library the bar is shorter so the header pins a bit
  // lower than it strictly needs, but never overlaps — no-overlap in every
  // library beats a per-library offset here. Coupled to `StickyDocHeader`'s
  // `top-2`: if that clearance changes, move this offset the same amount. The
  // `@min-[780px]/tbl:` container query because the header only pins once the
  // table's container is wide enough to fit the table.
  table: (props: React.TableHTMLAttributes<HTMLTableElement>) => (
    <Table stickyHeader containerClassName='my-6 @min-[780px]/tbl:[&_thead_th]:top-15' {...props} />
  ),
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

export function DocPage({ doc, body, next, prev, basePath = '/docs', frame, seam, sourceHref }: DocPageProps) {
  const content = stripLeadingH1(body)

  return (
    <>
      <StickyDocHeader title={doc.title} section={doc.section} />
      <article className='space-y-4'>
        <header className='space-y-3'>
          {(frame?.kindTag ?? doc.section) !== doc.title && (
            <Text as='span' size='xs' muted className='font-mono uppercase tracking-widest'>
              {frame?.kindTag ?? doc.section}
            </Text>
          )}
          <Heading level={1} className='font-serif font-light tracking-normal leading-tight text-foreground'>
            {doc.title}
          </Heading>
          {doc.description && (
            <Text size='lg' muted className='leading-relaxed'>
              {doc.description}
            </Text>
          )}
          {frame && frame.badges.length > 0 && (
            <div className='flex flex-wrap gap-1.5'>
              {frame.badges.map((label) => (
                <Badge key={label} className='w-fit font-mono text-xs uppercase'>
                  {label}
                </Badge>
              ))}
            </div>
          )}
          {seam && (seam.producer || seam.consumer) && (
            <Text as='p' size='sm' muted className='font-mono'>
              {seam.producer ?? '—'} → {seam.consumer ?? '—'}
            </Text>
          )}
        </header>

        <Separator className='opacity-60' />

        {frame && (
          <Text as='p' size='xs' muted className='font-mono uppercase tracking-widest'>
            Binding — the same words the agents are given
          </Text>
        )}

        <div className='text-base doc-page-content'>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {content}
          </ReactMarkdown>
        </div>

        {sourceHref && (
          <NextLink
            href={sourceHref}
            variant='unstyled'
            className='inline-flex items-center gap-1.5 text-primary text-sm underline-offset-4 hover:underline'
          >
            <span>Read the full reference on GitHub</span>
            <ExternalLink className='size-3.5' />
          </NextLink>
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
