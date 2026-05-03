'use client'

import type { DeliberationSpec } from '@atta/engine'
import { Button, Checkbox } from '@atta/ui'
import { GitCompare, Loader2 } from 'lucide-react'
import { IdentityBanner } from '@/components/IdentityBanner'
import { QuestionInputArea } from './QuestionInputArea'
import { TeamPicker } from './TeamPicker'
import { TeamSummary } from './TeamSummary'
import { useDeliberateForm } from './useDeliberateForm'

interface DeliberateSectionProps {
  remainingToday: number
  dailyLimit: number
  initialError?: string
  configuredProviders: string[]
  initialTeamModels: Array<{ teamId: string; agentRole: string; provider: string; modelId: string }>
  specs: DeliberationSpec[]
  initialTeamId?: string
}

export function DeliberateSection(props: DeliberateSectionProps) {
  const form = useDeliberateForm(props)

  const selectedSpec = props.specs.find((s) => s.id === form.selectedSpecId) ?? props.specs[0]

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
      <TeamPicker specs={props.specs} value={form.selectedSpecId} onChange={form.setSelectedSpecId} />
      {selectedSpec && <TeamSummary spec={selectedSpec} />}
      <div className='flex items-center justify-between gap-3'>
        <label
          htmlFor='vada-benchmark-checkbox'
          className='flex shrink-0 items-center gap-2 text-[13px] text-muted-foreground hover:text-accent'
        >
          <Checkbox
            id='vada-benchmark-checkbox'
            checked={form.benchmarkEnabled}
            onCheckedChange={(v) => form.setBenchmarkEnabled(v === true)}
          />
          <GitCompare className='size-3.5' />
          Run benchmark comparison (single-shot + AI judge)
        </label>
        <Button onClick={form.handleStart} disabled={!form.canStart} className='flex items-center gap-2'>
          {form.loading && <Loader2 className='size-3.5 animate-spin' />}
          {form.loading ? 'STARTING…' : form.needsUnlock ? 'UNLOCK & DELIBERATE' : 'DELIBERATE'}
        </Button>
      </div>
    </div>
  )
}
