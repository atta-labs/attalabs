// Shared ReactMarkdown component overrides used by both RoundStrip slots and
// ConclusionPanel's Recommendation / Key Condition. Kept in one file so
// styling stays consistent between the round card and the conclusion card.
// Tailwind classes only — no inline styles, no palette colors.

import type { ReactNode } from 'react'

export const MARKDOWN_COMPONENTS = {
  p: ({ children }: { children?: ReactNode }) => <p className='my-2 first:mt-0 last:mb-0'>{children}</p>,
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className='font-semibold text-foreground'>{children}</strong>
  ),
  em: ({ children }: { children?: ReactNode }) => <em className='italic'>{children}</em>,
  ul: ({ children }: { children?: ReactNode }) => <ul className='my-2 list-disc pl-5'>{children}</ul>,
  ol: ({ children }: { children?: ReactNode }) => <ol className='my-2 list-decimal pl-5'>{children}</ol>,
  li: ({ children }: { children?: ReactNode }) => <li className='my-0.5'>{children}</li>,
  h1: ({ children }: { children?: ReactNode }) => <h1 className='mt-3 mb-1 text-[14px] font-semibold'>{children}</h1>,
  h2: ({ children }: { children?: ReactNode }) => <h2 className='mt-3 mb-1 text-[13px] font-semibold'>{children}</h2>,
  h3: ({ children }: { children?: ReactNode }) => <h3 className='mt-3 mb-1 text-[13px] font-semibold'>{children}</h3>,
  code: ({ className, children }: { className?: string; children?: ReactNode }) => {
    const isBlock = (className ?? '').startsWith('language-')
    if (isBlock) return <code className={className}>{children}</code>
    return <code className='rounded bg-muted px-1 py-0.5 font-mono text-[12px]'>{children}</code>
  },
  pre: ({ children }: { children?: ReactNode }) => (
    <pre className='my-2 overflow-x-auto rounded bg-muted p-3 font-mono text-[12px]'>{children}</pre>
  ),
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className='my-2 border-l-2 border-border pl-3 text-muted-foreground'>{children}</blockquote>
  ),
  a: ({ href, children }: { href?: string; children?: ReactNode }) => (
    <a href={href} target='_blank' rel='noopener noreferrer' className='underline'>
      {children}
    </a>
  )
}
