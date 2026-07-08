'use client'

import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'

export function SummaryMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      components={{
        h1: ({ children }) => (
          <h1 className='mt-6 mb-1 font-mono text-xs uppercase tracking-widest text-muted-foreground first:mt-0'>
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className='mt-6 mb-1 font-mono text-xs uppercase tracking-widest text-muted-foreground first:mt-0'>
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className='mt-4 mb-1 font-mono text-xs uppercase tracking-widest text-muted-foreground first:mt-0'>
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className='mt-4 font-sans text-base leading-relaxed text-foreground first:mt-0'>{children}</p>
        ),
        ul: ({ children }) => (
          <ul className='mt-3 list-disc pl-4 font-sans text-base text-foreground marker:text-muted-foreground'>
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className='mt-3 list-decimal pl-4 font-sans text-base text-foreground marker:text-muted-foreground'>
            {children}
          </ol>
        ),
        li: ({ children }) => <li className='leading-relaxed'>{children}</li>,
        code: ({ children }) => (
          <code className='rounded bg-muted px-1 font-mono text-xs text-foreground'>{children}</code>
        ),
        strong: ({ children }) => <strong className='text-base font-medium text-foreground'>{children}</strong>
      }}
    >
      {text}
    </ReactMarkdown>
  )
}
