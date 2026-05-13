'use client'

import type { Flow } from '@atta/engine'
import { QuestionInputArea } from './QuestionInputArea'
import { DeliberatePanel } from './DeliberatePanel'
import { useDeliberateForm } from './useDeliberateForm'
import { MigrationPrompt } from './MigrationPrompt'

interface DeliberateSectionProps {
  remainingToday: number
  dailyLimit: number
  initialError?: string
  configuredProviders: string[]
  specs: Flow[]
  initialTeamId?: string
}

export function DeliberateSection(props: DeliberateSectionProps) {
  const form = useDeliberateForm(props)

  return (
    <div className='flex flex-col gap-4'>
      <MigrationPrompt configuredProviders={props.configuredProviders} />
      <QuestionInputArea question={form.question} onQuestionChange={form.setQuestion} />
      <DeliberatePanel
        specs={props.specs}
        configuredProviders={props.configuredProviders}
        selectedSpecId={form.selectedSpecId}
        onSelectSpec={form.setSelectedSpecId}
        globalModel={form.globalModel}
        onGlobalModelChange={form.setGlobalModel}
        benchmarkEnabled={form.benchmarkEnabled}
        onBenchmarkChange={form.setBenchmarkEnabled}
        onStart={form.handleStart}
        loading={form.loading}
        canStart={form.canStart}
        needsUnlock={form.needsUnlock}
        showReviewerModal={form.showReviewerModal}
        onConfigure={form.openReviewerModal}
        onModalSave={form.handleModalSave}
        onModalClose={form.closeReviewerModal}
      />
    </div>
  )
}
