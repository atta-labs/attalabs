'use client'

import { Textarea } from '@atta/ui'

interface QuestionInputAreaProps {
  question: string
  onQuestionChange: (q: string) => void
}

export function QuestionInputArea({ question, onQuestionChange }: QuestionInputAreaProps) {
  return (
    <Textarea
      textareaClassName='text-lg text-left leading-tight placeholder:text-foreground/50 resize-none py-3'
      className='w-full px-4'
      placeholder='What decision are you wrestling with?'
      value={question}
      onChange={(e) => onQuestionChange(e.target.value)}
      rows={3}
      size='default'
    />
  )
}
