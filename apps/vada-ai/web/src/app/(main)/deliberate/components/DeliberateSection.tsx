'use client'

import { Button } from '@atta/ui'
import { Check, GitCompare } from 'lucide-react'
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
      {/* Toggle-button pattern (no Checkbox primitive in @atta/ui). Off by
          default — extra API calls cost tokens/time so opt-in matches the
          BYOK ethos of not spending without intent. When on: browser fires
          a single-shot baseline in parallel with the deliberation, then an
          AI-judge compare after terminal. Results at /deliberation/[id]/benchmark. */}
      <Button
        type='button'
        size='sm'
        variant={form.benchmarkEnabled ? 'default' : 'outline'}
        onClick={() => form.setBenchmarkEnabled(!form.benchmarkEnabled)}
        className='self-start'
      >
        {form.benchmarkEnabled ? <Check className='mr-1.5 size-3.5' /> : <GitCompare className='mr-1.5 size-3.5' />}
        Run benchmark comparison (single-shot + AI judge)
      </Button>
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
