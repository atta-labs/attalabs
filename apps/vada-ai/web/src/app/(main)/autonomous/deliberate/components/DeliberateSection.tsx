'use client'

import type { DeliberationSpec } from '@atta/engine'
import { Button, Checkbox } from '@atta/ui'
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
  specs: DeliberationSpec[]
}

export function DeliberateSection(props: DeliberateSectionProps) {
  const form = useDeliberateForm(props)
  return (
    <div className='flex flex-col gap-4'>
      <IdentityBanner />
      <QuestionInputArea
        question={form.question}
        onQuestionChange={form.setQuestion}
        selectedSpecId={form.selectedSpecId}
        globalModel={form.globalModel}
        onModelChange={form.setGlobalModel}
        configuredProviders={props.configuredProviders}
        initialTeamModels={props.initialTeamModels}
      />
      <TeamCardGrid
        specs={props.specs}
        selectedSpecId={form.selectedSpecId}
        onSelectSpec={form.setSelectedSpecId}
        globalModel={form.globalModel}
      />
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
        <Button onClick={form.handleStart} disabled={!form.canStart}>
          {form.loading ? 'STARTING…' : form.needsUnlock ? 'UNLOCK & DELIBERATE' : 'DELIBERATE'}
        </Button>
      </div>
    </div>
  )
}
