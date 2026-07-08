import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Renders one quoted markdown fragment (a table cell's raw text, a paragraph
 * pulled from a role/contract doc) with the repo's real inline formatting —
 * bold, code spans, links — intact. Never a paraphrase: whatever this
 * receives is exactly what the source file said.
 */
const INLINE_COMPONENTS = {
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => <p className='leading-relaxed' {...props} />,
  strong: (props: React.HTMLAttributes<HTMLElement>) => <strong className='font-semibold' {...props} />,
  em: (props: React.HTMLAttributes<HTMLElement>) => <em className='italic' {...props} />,
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code className='rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground' {...props} />
  ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a className='text-accent underline-offset-4 hover:underline' target='_blank' rel='noreferrer' {...props} />
  )
}

export function MarkdownInline({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={INLINE_COMPONENTS}>
        {text}
      </ReactMarkdown>
    </div>
  )
}
