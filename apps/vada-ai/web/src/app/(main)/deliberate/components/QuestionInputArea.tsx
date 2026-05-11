'use client'

import { Textarea } from '@atta/ui'

interface QuestionInputAreaProps {
  question: string
  onQuestionChange: (q: string) => void
}

export function QuestionInputArea({ question, onQuestionChange }: QuestionInputAreaProps) {
  return (
    <Textarea
      size='lg'
      placeholder='What decision are you wrestling with?'
      value={question}
      onChange={(e) => onQuestionChange(e.target.value)}
      className='h-44 resize-none overflow-y-auto [field-sizing:fixed]'
    />
  )
}
