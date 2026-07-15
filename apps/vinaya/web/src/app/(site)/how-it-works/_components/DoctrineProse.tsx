import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Renders a doctrine cell's own markdown, clamped.
 *
 * Doctrine prose is authored as markdown — `**bold**` on the load-bearing
 * clause, `` `backticks` `` around every path, CLI name and label. Rendered
 * as a plain string those markers show up literally: `registry-parse.ts`'s
 * `stripBackticks` only strips a pair wrapping a WHOLE cell, which is right
 * for `implementation` (a bare path) and does nothing for inline spans
 * mid-sentence. So they get rendered, not stripped — these strings are dense
 * with identifiers that need to read as identifiers.
 *
 * The clamp is the point, not a detail. These cells run 1.5k–2.7k chars of
 * normative spec; the panel shows the opening as a taste and "Read more"
 * carries the reader to the source line for the rest. The cut lands
 * mid-sentence on plenty of rows — the cells have no clean prefix (#551:
 * "25–600+ words with no consistent short form"), so a fragment + a link is
 * the honest shape here, and the fade makes the cut read as deliberate
 * rather than as a bug.
 *
 * Block-level tags are absent from the override map below on purpose: a
 * doctrine cell is one prose blob, never a document — a table cell holds no
 * headings, lists or fences. `p`/`strong`/`code`/`a` is the whole surface.
 * (Studio's `DocPage.tsx` has the full document map; it renders real `.md`.)
 *
 * `line-clamp-*` sets `display: -webkit-box`, so this wrapper must not be a
 * flex container — a flex parent overrides it and silently renders the clamp
 * inert.
 */
const doctrineComponents = {
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className='my-0 font-sans text-card-foreground leading-relaxed' {...props} />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => <strong className='font-semibold text-foreground' {...props} />,
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code className='rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground' {...props} />
  ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a className='text-card-foreground underline underline-offset-2 hover:text-accent' {...props} />
  )
}

export function DoctrineProse({ children }: { children: string }) {
  return (
    <div className='line-clamp-6 text-base'>
      <ReactMarkdown components={doctrineComponents} remarkPlugins={[remarkGfm]}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
