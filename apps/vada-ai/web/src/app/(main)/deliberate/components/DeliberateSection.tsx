'use client'

import { Checkbox } from '@atta/ui'
import { GitCompare } from 'lucide-react'
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
      <div className='flex items-center justify-between gap-3'>
        <label
          htmlFor='vada-benchmark-checkbox'
          className='flex shrink-0 items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground'
        >
          <Checkbox
            id='vada-benchmark-checkbox'
            checked={form.benchmarkEnabled}
            onCheckedChange={(v) => form.setBenchmarkEnabled(v === true)}
          />
          <GitCompare className='size-3.5' />
          Run benchmark comparison (single-shot + AI judge)
        </label>
        <IdentityBanner />
      </div>
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
        needsUnlock={form.needsUnlock}
        globalModel={form.globalModel}
      />
    </div>
  )
}
