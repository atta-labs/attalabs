'use client'

import ReactMarkdown from 'react-markdown'
import { MARKDOWN_COMPONENTS } from '@/app/(main)/autonomous/deliberation/[id]/components/markdown-components'

export function ResponseBody({ response }: { response: string }) {
  return (
    <div className='prose-sm max-w-none text-sm leading-relaxed text-foreground'>
      <ReactMarkdown components={MARKDOWN_COMPONENTS}>{response}</ReactMarkdown>
    </div>
  )
}
