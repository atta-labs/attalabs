import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { stripLeadingH1 } from '../parse-doc'
import type { Doc } from '../types'

import { StickyDocHeader } from './StickyDocHeader'

export type DocPageProps = {
  doc: Doc
  body: string
  next?: Doc
  prev?: Doc
  basePath?: string
}

const markdownComponents = {
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className='mt-10 mb-4 font-serif text-3xl font-light leading-tight text-foreground' {...props} />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className='mt-10 mb-3 font-serif text-2xl font-light leading-tight text-foreground' {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className='mt-8 mb-2 font-serif text-xl font-medium leading-snug text-foreground' {...props} />
  ),
  h4: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h4
      className='mt-6 mb-2 font-sans text-base font-semibold uppercase tracking-wide text-muted-foreground'
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
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a className='text-accent underline-offset-4 hover:underline' {...props} />
  ),
  hr: (props: React.HTMLAttributes<HTMLHRElement>) => <hr className='my-8 border-border opacity-50' {...props} />,
  table: (props: React.TableHTMLAttributes<HTMLTableElement>) => (
    <div className='my-6 overflow-x-auto'>
      <table className='w-full border-collapse text-sm' {...props} />
    </div>
  ),
  th: (props: React.ThHTMLAttributes<HTMLTableCellElement>) => (
    <th className='border-b border-border px-3 py-2 text-left font-sans font-semibold text-foreground' {...props} />
  ),
  td: (props: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td className='border-b border-border/60 px-3 py-2 align-top text-foreground' {...props} />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => <strong className='font-semibold text-foreground' {...props} />,
  em: (props: React.HTMLAttributes<HTMLElement>) => <em className='italic' {...props} />
}

export function DocPage({ doc, body, next, prev, basePath = '/docs' }: DocPageProps) {
  const content = stripLeadingH1(body)

  return (
    <>
      <StickyDocHeader title={doc.title} section={doc.section} />
      <article className='space-y-8 pt-10'>
        <header className='space-y-3'>
          <span className='font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground'>{doc.section}</span>
          <h1 className='font-serif text-4xl font-light leading-tight text-foreground'>{doc.title}</h1>
          {doc.description && <p className='text-lg leading-relaxed text-muted-foreground'>{doc.description}</p>}
        </header>

        <hr className='border-border opacity-60' />

        <div className='text-base doc-page-content'>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {content}
          </ReactMarkdown>
        </div>

        {(prev || next) && (
          <>
            <hr className='border-border opacity-60' />
            <footer className='flex items-center justify-between gap-4 pt-2'>
              {prev ? (
                <Link
                  href={`${basePath}/${prev.slug}`}
                  className='group flex items-center gap-2 font-serif text-base text-foreground transition-colors hover:text-accent'
                >
                  <ArrowLeft className='size-4 transition-transform group-hover:-translate-x-0.5' />
                  <span>{prev.title}</span>
                </Link>
              ) : (
                <span />
              )}
              {next ? (
                <Link
                  href={`${basePath}/${next.slug}`}
                  className='group flex items-center gap-2 font-serif text-base text-foreground transition-colors hover:text-accent'
                >
                  <span>{next.title}</span>
                  <ArrowRight className='size-4 transition-transform group-hover:translate-x-0.5' />
                </Link>
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
