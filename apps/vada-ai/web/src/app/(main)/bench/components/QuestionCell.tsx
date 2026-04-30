'use client'

import { useState } from 'react'

export function QuestionCell({ text, maxLen = 80 }: { text: string; maxLen?: number }) {
  const [expanded, setExpanded] = useState(false)
  const truncated = text.length > maxLen && !expanded

  return (
    <span
      className='cursor-pointer text-sm'
      onClick={() => setExpanded((v) => !v)}
      title={truncated ? text : undefined}
    >
      {truncated ? `${text.slice(0, maxLen)}…` : text}
    </span>
  )
}
