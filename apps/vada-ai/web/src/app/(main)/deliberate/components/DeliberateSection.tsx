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
import { SmartPromptInput, type SmartPromptComponents } from '@atta/ui/smart-prompt-input'
import { ArrowUp, GitCompare, Loader2 } from 'lucide-react'
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

/**
 * Textarea overrides for the Vāda hero — strips the injected `@atta/ui` Textarea's
 * own chrome so the inner textarea looks like part of the outer `InputGroup`
 * surface, not a nested field.
 *
 * The injected basic/animate `Textarea` ships with `border border-input`,
 * `rounded-lg`, `dark:bg-input/30`, focus ring (`focus-visible:border-ring
 * focus-visible:ring-3 focus-visible:ring-ring/50`), native resize handle, and
 * `min-h-16`. That's the right default when used as a standalone form field, but
 * inside SmartPromptInput it produces a textarea-inside-a-container look with a
 * visible bottom border that doubles as a multi-line "footer divider".
 *
 * tailwind-merge resolves the conflicting classes deterministically (border-0
 * wins over `border`, `rounded-none` over `rounded-lg`, `min-h-0` over
 * `min-h-16`, `focus-visible:ring-0` over `focus-visible:ring-3`). `min-h-0`
 * also defeats the vendor's own `min-h-16` baseline so the textarea collapses
 * to a true single line on first paint and grows via `field-sizing-content`.
 */
const HERO_TEXTAREA_CLASSNAME = [
  'min-h-0',
  'border-0',
  'rounded-none',
  'bg-transparent dark:bg-transparent',
  'focus-visible:border-transparent focus-visible:ring-0',
  'resize-none'
].join(' ')

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
 * The VISUAL is identical in both states — a filled circular icon-only ArrowUp
 * button. Only the click behavior and `aria-label` differ:
 *
 * - `canStart = true`  → real submit button (`type='submit'`). The vendored
 *   textarea keyboard handler finds it via `button[type="submit"]` and fires
 *   `form.requestSubmit()` on Cmd+Enter; the form's `onSubmit` runs normally.
 * - `canStart = false` → button is `type='button'` and clicking it opens the
 *   reviewer config modal. Cmd+Enter still calls `form.requestSubmit()` (the
 *   textarea handler runs regardless of what's in the slot), which routes
 *   through `handleSmartSubmit → handleStartWithText`; that function
 *   re-validates with `validateKeysForConfig` and opens the modal when the
 *   config is missing — so the keyboard path lands in the same place as the
 *   visible button. No silent submission of an invalid form.
 *
 * Why one visual instead of a "Configure" word button: the user always sees
 * the same prominent CTA. They learn that if the form isn't ready, clicking
 * opens the configure modal. Differentiation happens through `aria-label`
 * (screen readers) and the modal that opens — not through morphing copy.
 */
function MorphingSubmitButton({ canStart, onConfigure }: { canStart: boolean; onConfigure: () => void }) {
  return (
    <Button
      type={canStart ? 'submit' : 'button'}
      variant='default'
      size='icon'
      aria-label={canStart ? 'Submit deliberation' : 'Configure team'}
      onClick={canStart ? undefined : onConfigure}
    >
      <ArrowUp className='size-4' />
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

              <div className='text-center'>
                <h1 className='font-serif text-3xl text-foreground'>What are you wrestling with?</h1>
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
                // See HERO_TEXTAREA_CLASSNAME definition above for the full rationale —
                // strips the injected `@atta/ui` Textarea's own border / rounded /
                // focus ring / resize handle / `min-h-16` so the textarea blends
                // seamlessly into the surrounding `InputGroup` chrome.
                textareaClassName={HERO_TEXTAREA_CLASSNAME}
                components={smartPromptComponents}
                actions={
                  <TeamPicker specs={props.specs} value={form.selectedSpecId} onChange={form.setSelectedSpecId} />
                }
                submitSlot={<MorphingSubmitButton canStart={form.canStart} onConfigure={form.openReviewerModal} />}
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
                textareaClassName={HERO_TEXTAREA_CLASSNAME}
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
