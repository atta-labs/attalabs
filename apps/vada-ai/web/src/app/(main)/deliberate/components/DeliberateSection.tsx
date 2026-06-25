'use client'

import type { FileUIPart } from 'ai'
import type { Flow } from '@atta/engine'
import { Button } from '@atta/ui/components/button'
import { Checkbox } from '@atta/ui/components/checkbox'
import { NextLink } from '@atta/ui/lib/next-link'
import { SmartPromptInput } from '@atta/ui/smart-prompt-input'
import { ArrowUpRight, GitCompare, Loader2 } from 'lucide-react'
import { useDeliberateForm } from './useDeliberateForm'
import { MigrationPrompt } from './MigrationPrompt'
import { ReviewerConfigModal } from './ReviewerConfigModal'
import { TeamPicker } from './TeamPicker'
import { TeamSummary } from './TeamSummary'

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
        <>
          <div className='min-h-[calc(100dvh-3.5rem)] flex flex-col items-center justify-center'>
            <div className='w-full max-w-2xl px-6 flex flex-col gap-6'>
              <MigrationPrompt configuredProviders={props.configuredProviders} />

              <div className='text-center space-y-2'>
                <h1 className='font-serif text-3xl text-foreground'>What are you wrestling with?</h1>
                <p className='font-sans text-sm text-muted-foreground'>
                  Pose a decision, question, or problem. A team of AI agents will deliberate on it and return a
                  convergent view.
                </p>
              </div>

              <SmartPromptInput
                onSubmit={handleSmartSubmit}
                placeholder='What decision are you wrestling with?'
                submitOn='cmdenter'
                status={form.loading ? 'loading' : 'idle'}
                actionsPosition='left'
                actions={
                  <>
                    <TeamPicker specs={props.specs} value={form.selectedSpecId} onChange={form.setSelectedSpecId} />
                    {selectedSpec?.agents.some((a) => a.editable) && (
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={form.openReviewerModal}
                        className='font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-accent-foreground'
                      >
                        Configure
                      </Button>
                    )}
                  </>
                }
              />

              {selectedSpec && (
                <div className='flex justify-center'>
                  <NextLink
                    href={`/teams/${selectedSpec.id}`}
                    variant='prose'
                    className='flex items-center gap-1 text-xs text-muted-foreground'
                  >
                    View team
                    <ArrowUpRight className='size-3' />
                  </NextLink>
                </div>
              )}
            </div>
          </div>

          {form.showReviewerModal && selectedSpec && (
            <ReviewerConfigModal
              spec={selectedSpec}
              onSave={form.handleModalSave}
              onClose={form.closeReviewerModal}
              configuredProviders={props.configuredProviders}
            />
          )}
        </>
      )}

      {/* ── Active state — team summary scrolls, input is fixed at bottom ── */}
      {isActive && (
        <div>
          {/* Scrollable content area — padded at the bottom to clear the fixed input bar */}
          <div className='pb-[200px]'>
            <div className='mx-auto w-full max-w-5xl px-6 pt-8'>
              <MigrationPrompt configuredProviders={props.configuredProviders} />
              {selectedSpec && (
                <div className='mt-4 flex flex-col gap-4'>
                  <TeamSummary
                    spec={selectedSpec}
                    onConfigure={form.openReviewerModal}
                    actions={
                      <div className='flex items-center justify-between gap-4'>
                        <label
                          htmlFor='active-benchmark-checkbox'
                          className='flex items-center gap-2 text-[13px] text-muted-foreground hover:text-accent cursor-pointer'
                        >
                          <Checkbox
                            id='active-benchmark-checkbox'
                            checked={form.benchmarkEnabled}
                            onCheckedChange={(v) => form.setBenchmarkEnabled(v === true)}
                          />
                          <GitCompare className='size-3.5' />
                          Run benchmark comparison
                        </label>
                        <Button
                          variant='default'
                          size='sm'
                          onClick={form.handleStart}
                          disabled={!form.canStart}
                          className='flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest'
                        >
                          {form.loading && <Loader2 className='size-3 animate-spin' />}
                          {form.loading ? 'Starting…' : form.needsUnlock ? 'Unlock & Deliberate' : 'Deliberate'}
                        </Button>
                      </div>
                    }
                  />
                </div>
              )}
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

          {form.showReviewerModal && selectedSpec && (
            <ReviewerConfigModal
              spec={selectedSpec}
              onSave={form.handleModalSave}
              onClose={form.closeReviewerModal}
              configuredProviders={props.configuredProviders}
            />
          )}
        </div>
      )}
    </>
  )
}
