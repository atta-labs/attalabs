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
      {/* Opt-in benchmark. Extra API calls cost tokens/time so opt-in matches
          the BYOK ethos of not spending without intent. When on: the browser
          fires a single-shot baseline in parallel with the deliberation and
          an AI-judge compare after terminal. Results at
          /deliberation/[id]/benchmark. */}
      <label
        htmlFor='vada-benchmark-checkbox'
        className='flex items-center gap-2 self-start text-[13px] text-muted-foreground hover:text-foreground'
      >
        <Checkbox
          id='vada-benchmark-checkbox'
          checked={form.benchmarkEnabled}
          onCheckedChange={(v) => form.setBenchmarkEnabled(v === true)}
        />
        <GitCompare className='size-3.5' />
        Run benchmark comparison (single-shot + AI judge)
      </label>
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
