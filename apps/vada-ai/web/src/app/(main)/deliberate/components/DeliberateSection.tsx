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
import { Heading } from '@atta/ui/shared'
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

/**
 * `className` applied to the SmartPromptInput wrapper that strips the
 * vendored `InputGroup`'s `focus-within:ring-1 focus-within:ring-ring` chrome
 * AND elevates the input surface above the page canvas.
 *
 * Two problems we fix together at the call site:
 *
 * 1. Purple focus ring. `packages/ui/smart-prompt-input/vendor/ui/input-group.tsx`
 *    line 10 ships `focus-within:ring-1 focus-within:ring-ring` on its outer
 *    `<div>`. In Vāda's theme `--ring` resolves to a magenta/purple-leaning
 *    value — visually it reads as purple on the input surface. Solved by
 *    `focus-within:ring-0`.
 *
 * 2. "I almost cannot see the input." The InputGroup ships `bg-card` by
 *    default. In Vāda's current theme `--card` is so close to `--background`
 *    that the input does not read as a distinct surface above the page canvas
 *    — there is no visible edge between the input chrome and the page.
 *    Solved by overriding the inner surface to `bg-popover`. Per the
 *    ui-theme-tokens role doctrine, `popover` is the "floating object" token
 *    reserved for transient surfaces (popovers, dropdowns, command palettes)
 *    and themes can give it stronger separation from canvas than `card`.
 *    Using it here is consistent — the hero input is the only interactive
 *    surface on an otherwise empty page; treating it as a floating object
 *    rather than a card matches its visual role and gets stronger
 *    edge-separation for free in every theme.
 *
 *    The dropdown content (`TeamPicker`) is already `bg-popover` (see
 *    `TeamPicker.tsx` line 39), so the trigger surface and the open menu sit
 *    on the same elevation tier — visually coherent.
 *
 * The `[&>form>div]` selector targets the InputGroup which is the direct
 * `<div>` child of the `<form>` rendered by `PromptInput`. The hero adds
 * elevation styling (rounded-xl + shadow-lg + bg-popover) plus ring
 * suppression. The fixed bottom bar (active state) keeps ring suppression
 * only — the bar already has `border-t border-border bg-background/95`
 * around it, so the inner input does not need separate elevation there.
 *
 * NB: this is a Vāda-only opt-in — Herald's SmartPromptInput call site does
 * NOT pass this className, so Herald keeps the canonical shadcn focus ring
 * and `bg-card` surface (byte-identical to before).
 */
const NO_PURPLE_FOCUS_RING = '[&>form>div]:focus-within:ring-0'
const HERO_WRAPPER_CLASSNAME = `[&>form>div]:rounded-xl [&>form>div]:shadow-lg [&>form>div]:bg-popover ${NO_PURPLE_FOCUS_RING}`
const FIXED_BAR_WRAPPER_CLASSNAME = NO_PURPLE_FOCUS_RING

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
 * Gemini-style behavior:
 *
 * - `hasQuestion = false` → the slot renders `null`. The submit area is empty;
 *   there is nothing to click and nothing to mis-submit. The user is invited
 *   by the placeholder to type, not by a hovering CTA. (Decided over a disabled
 *   button because disabled buttons still attract focus and read as "this is
 *   available" — a clean empty state communicates "compose first" more clearly.)
 * - `hasQuestion && isConfigValid` → real submit button (`type='submit'`). The
 *   vendored textarea keyboard handler finds it via `button[type="submit"]` and
 *   fires `form.requestSubmit()` on Cmd+Enter; the form's `onSubmit` runs.
 * - `hasQuestion && !isConfigValid` → button is `type='button'` and clicking it
 *   opens the reviewer config modal. Cmd+Enter still calls `form.requestSubmit()`
 *   (the textarea handler runs regardless of what's in the slot), which routes
 *   through `handleSmartSubmit → handleStartWithText`; for editable specs that
 *   handler now opens the modal too (instead of silent no-op) so the keyboard
 *   path lands in the same place as the visible button.
 *
 * The VISUAL is identical in submit and configure states — a filled circular
 * icon-only ArrowUp. Only `type`, `aria-label`, and `onClick` differ. The user
 * always sees the same prominent CTA when there is text; differentiation
 * happens through the modal that opens (not through morphing copy).
 *
 * The previous bug: this slot rendered the configure variant whenever `canStart`
 * was false. Because `canStart` required BOTH text and a valid config, an empty
 * input on a fully-configured team produced a button that opened the modal —
 * a nonsensical action (config is already valid). Splitting predicates fixes it.
 */
function MorphingSubmitButton({
  hasQuestion,
  isConfigValid,
  onConfigure
}: {
  hasQuestion: boolean
  isConfigValid: boolean
  onConfigure: () => void
}) {
  if (!hasQuestion) return null
  return (
    <Button
      type={isConfigValid ? 'submit' : 'button'}
      variant='default'
      size='icon'
      aria-label={isConfigValid ? 'Submit deliberation' : 'Configure team'}
      onClick={isConfigValid ? undefined : onConfigure}
    >
      <ArrowUp className='size-4' />
    </Button>
  )
}

export function DeliberateSection(props: DeliberateSectionProps) {
  const form = useDeliberateForm(props)

  // `isActive` mirrors `hasQuestion` — keep them as the same signal so the
  // hero-vs-active layout switch and the morphing button's render condition
  // can never disagree.
  const isActive = form.hasQuestion
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
                {/* `Heading` from `@atta/ui/shared` is the component equivalent
                    of the raw `<h1>` per RULE 1. We pass `level={1}` so the
                    rendered tag stays `<h1>` (semantic / SEO unchanged) and a
                    `size` so the font-size class wins over the level default.
                    `font-normal` is required to override the component's baked
                    `font-bold` (the original was unbolded). Family + color
                    applied via className (font-serif + text-foreground —
                    byte-identical visual to the previous raw `<h1>`). */}
                <Heading level={1} size='3xl' className='font-serif font-normal text-foreground'>
                  What are you wrestling with?
                </Heading>
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
                onTextChange={form.setQuestion}
                placeholder='What decision are you wrestling with?'
                submitOn='cmdenter'
                status={form.loading ? 'loading' : 'idle'}
                actionsPosition='right'
                className={HERO_WRAPPER_CLASSNAME}
                // See HERO_TEXTAREA_CLASSNAME definition above for the full rationale —
                // strips the injected `@atta/ui` Textarea's own border / rounded /
                // focus ring / resize handle / `min-h-16` so the textarea blends
                // seamlessly into the surrounding `InputGroup` chrome.
                textareaClassName={HERO_TEXTAREA_CLASSNAME}
                components={smartPromptComponents}
                actions={
                  <TeamPicker specs={props.specs} value={form.selectedSpecId} onChange={form.setSelectedSpecId} />
                }
                submitSlot={
                  <MorphingSubmitButton
                    hasQuestion={form.hasQuestion}
                    isConfigValid={form.isConfigValid}
                    onConfigure={form.openReviewerModal}
                  />
                }
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
                onTextChange={form.setQuestion}
                placeholder='What decision are you wrestling with?'
                submitOn='cmdenter'
                status={form.loading ? 'loading' : 'idle'}
                className={FIXED_BAR_WRAPPER_CLASSNAME}
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
