'use client'

import type { FileUIPart } from 'ai'
import type { Flow } from '@atta/engine'
import { Button } from '@atta/ui/components/button'
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
import { ArrowUp } from 'lucide-react'
import { useDeliberateForm } from './useDeliberateForm'
import { MigrationPrompt } from './MigrationPrompt'
import { ReviewerConfigModal } from './ReviewerConfigModal'
import { TeamPicker } from './TeamPicker'

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
 * `className` applied to the SmartPromptInput wrapper. Two concerns share the
 * same descendant selector:
 *
 * 1. Visible focus indicator. The vendored InputGroup ships
 *    `focus-within:ring-1 focus-within:ring-ring`, but the same component
 *    pairs that ring with `overflow-hidden` (see `prompt-input.tsx` line
 *    `<InputGroup className='overflow-hidden'>`) which clips the ring's
 *    box-shadow on every side — even when the ring color is correct, the
 *    user sees nothing on focus. Prior fix here suppressed the ring entirely
 *    (`focus-within:ring-0`), which removed the purple ring problem but left
 *    the input with no visible focus state at all.
 *
 *    Switch from a ring (box-shadow, clipped) to a border-color change on
 *    focus: the InputGroup already carries a resting `border border-border`,
 *    so swapping the border to `border-ring` on `focus-within` paints
 *    in-box, is not clipped by `overflow-hidden`, and uses the same `--ring`
 *    token the canonical focus indicator points at (theme team is
 *    recalibrating `--ring` to a confident red in a parallel task — when
 *    that lands, the focus state automatically follows).
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
 * elevation styling (rounded-xl + shadow-lg + bg-popover) plus the focus
 * border swap. The fixed bottom bar (active state) carries only the focus
 * border swap — the bar already has `border-t border-border bg-background/95`
 * around it, so the inner input does not need separate elevation there.
 *
 * NB: this is a Vāda-only opt-in — Herald's SmartPromptInput call site does
 * NOT pass this className, so Herald keeps the canonical shadcn focus ring
 * and `bg-card` surface (byte-identical to before).
 */
// The InputGroup ships `overflow-hidden`, which clips any ring/box-shadow on
// the InputGroup itself. We put the focus halo on the OUTER wrapper instead —
// the wrapper has no overflow-hidden, so the ring renders as a visible halo
// around the input. Combined with `border-ring` on the InputGroup for the
// inner border-color change, you get the canonical shadcn focus pattern.
const FOCUS_HALO =
  'rounded-xl focus-within:ring-2 focus-within:ring-ring/60 focus-within:ring-offset-2 focus-within:ring-offset-background [&>form>div]:focus-within:border-ring'
const HERO_WRAPPER_CLASSNAME = `[&>form>div]:rounded-xl [&>form>div]:shadow-lg [&>form>div]:bg-popover ${FOCUS_HALO}`
const FIXED_BAR_WRAPPER_CLASSNAME = FOCUS_HALO

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
      {/* ── Empty state — top-biased hero layout (Fix 7: ~upper third instead of
          vertically centered) — unmounted when active to remove from layout/scroll.

          Why top-biased and not centered: when the textarea wraps into footer
          mode (`isMultiLine` latch in SmartPromptInput) the InputGroup grows
          downward, the dropdown row sits very close to the viewport bottom, and
          the layout reads as cramped at the page edge. Anchoring the content to
          ~20vh from the top leaves plenty of room below for the input to grow
          without colliding with the page edge. The header bar is `h-14`
          (≈3.5rem), and `pt-[20vh]` places the title in the upper third of the
          remaining space — still centered horizontally via `items-center`, but
          not vertically. `items-start` replaces `justify-center` so the
          `pt-[20vh]` controls vertical position deterministically. */}
      <div className='min-h-[calc(100dvh-3.5rem)] flex flex-col items-center pt-[20vh]'>
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
            actions={<TeamPicker specs={props.specs} value={form.selectedSpecId} onChange={form.setSelectedSpecId} />}
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
  )
}
