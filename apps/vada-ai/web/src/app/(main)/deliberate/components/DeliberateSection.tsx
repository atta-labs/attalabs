'use client'

import { useDeliberateForm } from './useDeliberateForm'
import { QuestionInputArea } from './QuestionInputArea'
import { RoomRoster } from './RoomRoster'

interface DeliberateSectionProps {
  remainingToday: number
  initialError?: string
  configuredProviders: string[]
  initialTeamModels: Array<{ teamId: string; agentRole: string; provider: string; modelId: string }>
}

export function DeliberateSection(props: DeliberateSectionProps) {
  const form = useDeliberateForm(props)
  return (
    <div className='flex flex-col gap-6'>
      <QuestionInputArea
        question={form.question}
        onQuestionChange={form.setQuestion}
        selectedPreset={form.selectedPreset}
        onPresetChange={form.setSelectedPreset}
        globalModel={form.globalModel}
        onModelChange={form.setGlobalModel}
        loading={form.loading}
        canStart={form.canStart}
        onStart={form.handleStart}
        configuredProviders={props.configuredProviders}
        initialTeamModels={props.initialTeamModels}
      />
      <RoomRoster selectedPresetId={form.selectedPreset.id} faceStyle={form.faceStyle} />
    </div>
  )
}
