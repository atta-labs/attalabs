'use client'

import { IdentityBanner } from '@/components/IdentityBanner'
import { QuestionInputArea } from './QuestionInputArea'
import { TeamCardGrid } from './TeamCardGrid'
import { useDeliberateForm } from './useDeliberateForm'

interface DeliberateSectionProps {
  remainingToday: number
  dailyLimit: number
  initialError?: string
  configuredProviders: string[]
  initialTeamModels: Array<{ teamId: string; agentRole: string; provider: string; modelId: string }>
}

export function DeliberateSection(props: DeliberateSectionProps) {
  const form = useDeliberateForm(props)
  return (
    <div className='flex flex-col gap-4'>
      <IdentityBanner />
      <QuestionInputArea
        question={form.question}
        onQuestionChange={form.setQuestion}
        selectedPresetId={form.selectedPreset.id}
        globalModel={form.globalModel}
        onModelChange={form.setGlobalModel}
        configuredProviders={props.configuredProviders}
        initialTeamModels={props.initialTeamModels}
      />
      <TeamCardGrid
        selectedPreset={form.selectedPreset}
        onSelectPreset={form.setSelectedPreset}
        onStart={form.handleStart}
        canStart={form.canStart}
        loading={form.loading}
        globalModel={form.globalModel}
      />
    </div>
  )
}
