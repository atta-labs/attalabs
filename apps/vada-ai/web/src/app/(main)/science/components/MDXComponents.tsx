import type { MDXComponents } from 'mdx/types'
import { Card, Separator, Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@atta/ui'
import { NextLink } from '@atta/ui/lib/next-link'
import { Heading, Text } from '@atta/ui/shared'

function isInternalHref(href: string | undefined): boolean {
  if (!href) return false
  return href.startsWith('/') || href.startsWith('#')
}

export const scienceMdxComponents: MDXComponents = {
  h1: ({ children, ...props }) => (
    <Heading level={1} className='mb-4 font-serif text-4xl font-light leading-tight' {...props}>
      {children}
    </Heading>
  ),
  h2: ({ children, ...props }) => (
    <Heading level={2} className='mt-10 mb-3 font-serif text-2xl font-light leading-snug' {...props}>
      {children}
    </Heading>
  ),
  h3: ({ children, ...props }) => (
    <Heading level={3} className='mt-8 mb-2 font-serif text-xl font-normal leading-snug' {...props}>
      {children}
    </Heading>
  ),
  h4: ({ children, ...props }) => (
    <Heading level={4} className='mt-6 mb-2 font-serif text-lg font-medium leading-snug' {...props}>
      {children}
    </Heading>
  ),
  p: ({ children, ...props }) => (
    <Text as='p' className='my-4 leading-relaxed text-foreground/90' {...props}>
      {children}
    </Text>
  ),
  ul: ({ children, ...props }) => (
    <ul className='my-4 ml-6 list-disc space-y-2 leading-relaxed marker:text-muted-foreground' {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className='my-4 ml-6 list-decimal space-y-2 leading-relaxed marker:text-muted-foreground' {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className='pl-1 text-foreground/90' {...props}>
      {children}
    </li>
  ),
  a: ({ href, children, ...props }) => {
    if (isInternalHref(href)) {
      return <NextLink href={href ?? '#'}>{children}</NextLink>
    }
    return (
      <a
        href={href}
        target='_blank'
        rel='noreferrer noopener'
        className='text-primary underline underline-offset-2 decoration-primary/40 hover:decoration-primary transition-colors'
        {...props}
      >
        {children}
      </a>
    )
  },
  strong: ({ children, ...props }) => (
    <strong className='font-semibold text-foreground' {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className='italic text-foreground/90' {...props}>
      {children}
    </em>
  ),
  blockquote: ({ children }) => (
    <Card className='my-6 border-l-4 border-l-primary bg-card/50 px-6 py-4 text-muted-foreground italic [&_p]:my-2'>
      {children}
    </Card>
  ),
  code: ({ children, ...props }) => (
    <code
      className='rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground/90 before:content-none after:content-none'
      {...props}
    >
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className='my-6 overflow-x-auto rounded-lg border border-border/60 bg-card p-4 font-mono text-sm text-foreground/90 [&>code]:bg-transparent [&>code]:p-0'>
      {children}
    </pre>
  ),
  hr: () => <Separator className='my-8 opacity-30' />,
  table: ({ children, ...props }) => (
    <div className='my-6'>
      <Table {...props}>{children}</Table>
    </div>
  ),
  thead: ({ children, ...props }) => <TableHeader {...props}>{children}</TableHeader>,
  tbody: ({ children, ...props }) => <TableBody {...props}>{children}</TableBody>,
  tr: ({ children, ...props }) => <TableRow {...props}>{children}</TableRow>,
  th: ({ children, ...props }) => <TableHead {...props}>{children}</TableHead>,
  td: ({ children, ...props }) => <TableCell {...props}>{children}</TableCell>,
  caption: ({ children, ...props }) => <TableCaption {...props}>{children}</TableCaption>
}
