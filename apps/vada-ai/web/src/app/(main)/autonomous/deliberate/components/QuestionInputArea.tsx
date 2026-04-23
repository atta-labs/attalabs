'use client'

import { Textarea } from '@atta/ui'
import { GlobalModelSelector, type ModelSelection } from './GlobalModelSelector'

interface QuestionInputAreaProps {
  question: string
  onQuestionChange: (q: string) => void
  selectedPresetId: string
  globalModel: ModelSelection | null
  onModelChange: (m: ModelSelection | null) => void
  configuredProviders: string[]
  initialTeamModels: Array<{ teamId: string; agentRole: string; provider: string; modelId: string }>
}

export function QuestionInputArea({
  question,
  onQuestionChange,
  selectedPresetId,
  globalModel,
  onModelChange,
  configuredProviders,
  initialTeamModels
}: QuestionInputAreaProps) {
  return (
    <div className='relative'>
      <Textarea
        textareaClassName='text-lg text-left leading-tight placeholder:text-foreground/50 resize-none'
        className='w-full'
        placeholder='What decision are you wrestling with?'
        value={question}
        onChange={(e) => onQuestionChange(e.target.value)}
        rows={3}
        size='default'
      />
      <div className='absolute bottom-2 right-3'>
        <GlobalModelSelector
          value={globalModel}
          onChange={onModelChange}
          settingsProviders={configuredProviders}
          initialTeamModels={initialTeamModels}
          selectedPresetId={selectedPresetId}
        />
      </div>
    </div>
  )
}
