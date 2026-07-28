import { Code } from '@atta/ui/components'
import type { ReactNode } from 'react'

/** Shared by every page in this section: prose is authored with backtick-
 * delimited spans (this site's doc convention) but these pages render no
 * markdown — plain text would print the backticks literally. Splits on
 * `` ` `` and wraps the odd segments in `Code`, the same chip `DocPage`'s
 * markdown pipeline produces for inline code, without pulling in
 * `react-markdown` for a paragraph or two per page. */
export function renderProse(paragraph: string): ReactNode[] {
  return paragraph.split('`').map((segment, index) =>
    index % 2 === 1 ? (
      <Code key={index} className='mx-0.5'>
        {segment}
      </Code>
    ) : (
      segment
    )
  )
}
