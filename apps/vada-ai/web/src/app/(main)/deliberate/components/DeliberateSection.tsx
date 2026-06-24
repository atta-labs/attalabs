'use client'

import type { FileUIPart } from 'ai'
import type { Flow } from '@atta/engine'
import { NextLink } from '@atta/ui/lib/next-link'
import { SmartPromptInput } from '@atta/ui/smart-prompt-input'
import { ArrowUpRight } from 'lucide-react'
import { DeliberatePanel } from './DeliberatePanel'
import { useDeliberateForm } from './useDeliberateForm'
import { MigrationPrompt } from './MigrationPrompt'
import { TeamPicker } from './TeamPicker'

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

  const isActive = form.question.trim().length > 0
  const selectedSpec = props.specs.find((s) => s.id === form.selectedSpecId) ?? props.specs[0]

  // SmartPromptInput owns its own value; onSubmit provides text + files.
  // Vāda has no file ingestion backend — files are accepted in the UI but
  // not forwarded to any endpoint. Only text is dispatched.
  function handleSmartSubmit(text: string, _files: FileUIPart[]) {
    if (!text.trim()) return
    form.setQuestion(text)
    void form.handleStartWithText(text)
  }

  return (
    <>
      {/* ── Empty state — centered hero layout — unmounted when active to remove from layout/scroll ── */}
      {!isActive && (
        <div className='min-h-[calc(100dvh-3.5rem)] flex flex-col items-center justify-center'>
          <div className='w-full max-w-2xl px-6 flex flex-col gap-6'>
            <MigrationPrompt configuredProviders={props.configuredProviders} />

            <div className='text-center space-y-2'>
              <h1 className='font-serif text-3xl text-foreground'>What are you wrestling with?</h1>
              <p className='font-sans text-sm text-muted-foreground'>
                Pose a decision, question, or problem. A team of AI agents will deliberate on it and return a convergent
                view.
              </p>
            </div>

            <div className='flex items-center justify-center gap-3'>
              <TeamPicker specs={props.specs} value={form.selectedSpecId} onChange={form.setSelectedSpecId} />
              {selectedSpec && (
                <NextLink
                  href={`/teams/${selectedSpec.id}`}
                  variant='prose'
                  className='flex items-center gap-1 text-xs text-muted-foreground'
                >
                  View team
                  <ArrowUpRight className='size-3' />
                </NextLink>
              )}
            </div>

            <SmartPromptInput
              onSubmit={handleSmartSubmit}
              placeholder='What decision are you wrestling with?'
              submitOn='cmdenter'
              hint='Cmd+Enter to deliberate'
              status={form.loading ? 'loading' : 'idle'}
            />
          </div>
        </div>
      )}

      {/* ── Active state — team panel scrolls, input is fixed at bottom ── */}
      {isActive && (
        <div>
          {/* Scrollable content area — padded at the bottom to clear the fixed input bar */}
          <div className='pb-[200px]'>
            <div className='mx-auto w-full max-w-5xl px-6 pt-8'>
              <MigrationPrompt configuredProviders={props.configuredProviders} />
              <div className='mt-4'>
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
            </div>
          </div>

          {/* Fixed input bar — sticky to viewport bottom, same pattern as Herald's JDInput */}
          <div className='fixed inset-x-0 bottom-0 z-30 bg-background/95 backdrop-blur-md border-t border-border'>
            <div className='mx-auto w-full max-w-5xl px-6 py-4'>
              <SmartPromptInput
                onSubmit={handleSmartSubmit}
                placeholder='What decision are you wrestling with?'
                submitOn='cmdenter'
                status={form.loading ? 'loading' : 'idle'}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
