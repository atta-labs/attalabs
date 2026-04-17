'use client'

import { Text } from '@atta/ui'
import { KeyRound } from 'lucide-react'
import Link from 'next/link'
import { IdentityBanner } from '@/components/IdentityBanner'
import { QuestionInputArea } from './QuestionInputArea'
import { TeamCardGrid } from './TeamCardGrid'
import { useDeliberateForm } from './useDeliberateForm'

interface DeliberateSectionProps {
  remainingToday: number
  initialError?: string
  configuredProviders: string[]
  initialTeamModels: Array<{ teamId: string; agentRole: string; provider: string; modelId: string }>
}

export function DeliberateSection(props: DeliberateSectionProps) {
  const form = useDeliberateForm(props)
  return (
    <div className='flex flex-col gap-4'>
      <IdentityBanner />
      {!form.hasAnyKey && (
        <div className='flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card/40 px-4 py-3'>
          <div className='flex items-center gap-2.5'>
            <KeyRound className='size-4 shrink-0 text-muted-foreground' aria-hidden />
            <Text as='small' className='text-sm text-muted-foreground'>
              Configure at least one API key to start deliberating.{' '}
              <Link href='/trust' className='underline'>
                Your keys stay in your browser.
              </Link>
            </Text>
          </div>
          <Link href='/settings' className='font-mono text-xs uppercase tracking-widest text-primary hover:underline'>
            Configure API keys →
          </Link>
        </div>
      )}
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
