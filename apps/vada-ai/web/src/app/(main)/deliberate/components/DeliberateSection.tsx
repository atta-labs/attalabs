'use client'

import type { FileUIPart } from 'ai'
import type { Flow } from '@atta/engine'
import { Button } from '@atta/ui/components/button'
import { Checkbox } from '@atta/ui/components/checkbox'
import {
  Button as LibraryButton,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Textarea
} from '@atta/ui'
import { NextLink } from '@atta/ui/lib/next-link'
import { SmartPromptInput, type SmartPromptComponents } from '@atta/ui/smart-prompt-input'
import { ArrowUp, ArrowUpRight, GitCompare, Loader2 } from 'lucide-react'
import { useDeliberateForm } from './useDeliberateForm'
import { MigrationPrompt } from './MigrationPrompt'
import { ReviewerConfigModal } from './ReviewerConfigModal'
import { TeamPicker } from './TeamPicker'
import { TeamSummary } from './TeamSummary'

/**
 * INJECTION CONTRACT (see ui-library-system SKILL.md): SmartPromptInput
 * resolves NO library — the consumer injects. Vāda's library is build-time
 * (animate), so we import from `@atta/ui` which the build-time generator
 * resolves to the active library.
 */
const smartPromptComponents: SmartPromptComponents = {
  Textarea,
  Button: LibraryButton,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
}

interface DeliberateSectionProps {
  remainingToday: number
  dailyLimit: number
  initialError?: string
  configuredProviders: string[]
  specs: Flow[]
  initialTeamId?: string
}

/**
 * Morphing Configure ↔ Submit element for the hero `SmartPromptInput.submitSlot`.
 *
 * Either-or, never both. The single visible control communicates the form's
 * validity directly — when invalid, the button literally says "Configure" rather
 * than rendering a disabled submit whose disabled reason is opaque.
 *
 * - `canStart = true`  → real submit button (`type='submit'`). The vendored
 *   textarea keyboard handler finds it via `button[type="submit"]` and fires
 *   `form.requestSubmit()` on Cmd+Enter; the form's `onSubmit` runs normally.
 * - `canStart = false` → CONFIGURE button (`type='button'`). Click opens the
 *   reviewer modal. Cmd+Enter still calls `form.requestSubmit()` (the textarea
 *   handler runs regardless of what's in the slot), which routes through
 *   `handleSmartSubmit → handleStartWithText`; that function re-validates with
 *   `validateKeysForConfig` and opens the modal when the config is missing —
 *   so the keyboard path lands in the same place as the visible button. No
 *   silent submission of an invalid form.
 *
 * Hover follows the outline doctrine pair from `.claude/skills/ui-theme-tokens`:
 * `hover:bg-accent/20` comes from the base outline variant; the call site adds
 * `hover:text-accent-foreground` to complete the pair. Never `hover:text-accent`
 * — same hue as the background reads as a solid block in the amber theme.
 */
function MorphingSubmitButton({ canStart, onConfigure }: { canStart: boolean; onConfigure: () => void }) {
  if (canStart) {
    return (
      <Button type='submit' variant='default' size='icon' aria-label='Deliberate'>
        <ArrowUp className='size-4' />
      </Button>
    )
  }
  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      onClick={onConfigure}
      className='font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-accent-foreground'
    >
      Configure
    </Button>
  )
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

              {/* Frontier-chat layout: TeamPicker as a small pill on the right of the
                  textarea (drops to footer when the textarea wraps). The inner InputGroup
                  surface (`>form>div`) is elevated off the page canvas — soft shadow
                  + a touch more rounding for a Grok-like surface. All semantic tokens;
                  no hardcoded colors.

                  The `submitSlot` is the morphing Configure ↔ Submit element. When the
                  form is invalid the slot renders CONFIGURE (opens the reviewer modal);
                  when valid it renders a real submit. The form never shows both a
                  disabled submit AND a Configure button — the single visible control
                  communicates validity directly. */}
              <SmartPromptInput
                onSubmit={handleSmartSubmit}
                placeholder='What decision are you wrestling with?'
                submitOn='cmdenter'
                status={form.loading ? 'loading' : 'idle'}
                actionsPosition='right'
                className='[&>form>div]:rounded-xl [&>form>div]:shadow-lg'
                // The vendored PromptInputTextarea defaults to min-h-16 (=4rem), which
                // forces scrollHeight above singleLineHeight on first paint and pins
                // the layout in multi-line mode forever. min-h-0 lets the textarea
                // collapse to its true single-line height; tailwind-merge resolves the
                // conflict in our favor.
                textareaClassName='min-h-0'
                components={smartPromptComponents}
                actions={
                  <TeamPicker specs={props.specs} value={form.selectedSpecId} onChange={form.setSelectedSpecId} />
                }
                submitSlot={<MorphingSubmitButton canStart={form.canStart} onConfigure={form.openReviewerModal} />}
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
                components={smartPromptComponents}
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
