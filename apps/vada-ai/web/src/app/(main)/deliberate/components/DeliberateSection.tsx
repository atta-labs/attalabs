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
  Textarea,
  TextReveal
} from '@atta/ui'
import { Heading } from '@atta/ui/shared'
import { SmartPromptInput, type SmartPromptComponents } from '@atta/ui/smart-prompt-input'
import { ArrowUp } from 'lucide-react'
import { useState } from 'react'
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

/*
 * Hero input chrome is owned by SmartPromptInput itself via `surface='popover'`
 * and `textareaVariant='bare'`. No call-site appearance overrides — the
 * component knows its own DOM.
 *
 * - `surface='popover'` elevates the InputGroup to `bg-popover` with
 *   `rounded-xl shadow-lg` and moves the focus halo to the outer wrapper
 *   (where overflow-hidden does not clip it).
 * - `textareaVariant='bare'` strips the injected Textarea's own chrome
 *   (border, rounded, focus-ring, resize handle, `min-h-16` baseline) so the
 *   textarea blends seamlessly into the surrounding InputGroup.
 *
 * Herald is unaffected — it passes neither prop, so its SmartPromptInput
 * renders byte-identical to before (surface defaults to 'card', textareaVariant
 * defaults to undefined → library Textarea variant default).
 */

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
  hasContent,
  isConfigValid,
  onConfigure
}: {
  hasContent: boolean
  isConfigValid: boolean
  onConfigure: () => void
}) {
  if (!hasContent) return null
  return (
    <Button
      type={isConfigValid ? 'submit' : 'button'}
      variant='default'
      size='icon-sm'
      aria-label={isConfigValid ? 'Submit deliberation' : 'Configure team'}
      onClick={isConfigValid ? undefined : onConfigure}
      // Mount-only entrance animation: when the user types the first character
      // the button materializes via fade + slight zoom (Gemini/ChatGPT-style).
      // Per-instance enter animation is a call-site concern (consumer decides
      // HOW this instance enters), not chrome — the Button's visual identity
      // (variant, size, color tokens) stays library-owned.
      className='animate-in fade-in zoom-in-95 duration-300'
    >
      <ArrowUp className='size-4' />
    </Button>
  )
}

export function DeliberateSection(props: DeliberateSectionProps) {
  const form = useDeliberateForm(props)
  const selectedSpec = props.specs.find((s) => s.id === form.selectedSpecId) ?? props.specs[0]
  // The Settings gear next to the team picker only makes sense for specs that
  // actually have user-configurable agents (Reviewers / Reviewers + Synthesis).
  // Non-editable specs (Council, Council + Synthesis) source their models from
  // YAML — there is nothing for the user to swap. `hasEditableAgents` gates
  // the gear's render so Council teams don't show an affordance that opens
  // an empty modal.
  const hasEditableAgents = selectedSpec?.agents.some((a) => a.editable) ?? false
  // Tracks attachment presence so the submit button stays visible when the
  // user has pasted long text that became a file (textarea empty but content
  // exists). SmartPromptInput owns the canonical count; we mirror it here.
  const [attachmentCount, setAttachmentCount] = useState(0)

  // SmartPromptInput's onSubmit provides text + files. Vāda has no file
  // ingestion backend — when the user pastes long text it's converted to a
  // `text/plain` file via `pasteToFileChars`; we decode it back to text here
  // so the deliberation receives the full content. Non-text files are ignored
  // (no multimodal backend yet — see vada-backlog.md).
  function handleSmartSubmit(text: string, files: FileUIPart[]) {
    let question = text.trim()
    if (!question && files.length > 0) {
      const textFile = files.find((f) => f.mediaType?.startsWith('text/'))
      if (textFile?.url.startsWith('data:')) {
        const comma = textFile.url.indexOf(',')
        if (comma !== -1) {
          const header = textFile.url.slice(0, comma)
          const data = textFile.url.slice(comma + 1)
          try {
            question = header.includes(';base64') ? atob(data) : decodeURIComponent(data)
          } catch {
            // ignore decode failure — falls through to the empty-check below
          }
        }
      }
    }
    if (!question) return
    form.setQuestion(question)
    void form.handleStartWithText(question)
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
            {/* `Heading` from `@atta/ui/shared` is the component equivalent of
                the raw `<h1>` per RULE 1. The `weight='normal'` prop replaces
                the prior call-site `font-normal` (which fought the component's
                baked `font-bold`); semantic font family stays at `font-serif`
                because Heading defaults to the canvas body font. Color is
                inherited (canvas body is `text-foreground`). */}
            <Heading level={1} size='3xl' weight='normal' className='font-serif'>
              <TextReveal text='What are you wrestling with?' />
            </Heading>
          </div>

          {/* Frontier-chat layout: TeamPicker as a small pill on the right of the
                  textarea (drops to footer when the textarea wraps). Surface and
                  textarea chrome are owned by `SmartPromptInput` itself via the
                  `surface` and `textareaVariant` props — no call-site appearance
                  overrides.

                  The `submitSlot` is the morphing Configure ↔ Submit element. When the
                  form is invalid the slot renders CONFIGURE (opens the reviewer modal);
                  when valid it renders a real submit. The form never shows both a
                  disabled submit AND a Configure button — the single visible control
                  communicates validity directly. */}
          <SmartPromptInput
            onSubmit={handleSmartSubmit}
            onTextChange={form.setQuestion}
            onAttachmentsChange={setAttachmentCount}
            submitOn='cmdenter'
            status={form.loading ? 'loading' : 'idle'}
            actionsPosition='right'
            surface='popover'
            textareaVariant='bare'
            pasteToFileChars={1000}
            components={smartPromptComponents}
            actions={
              <TeamPicker
                specs={props.specs}
                value={form.selectedSpecId}
                onChange={form.setSelectedSpecId}
                onConfigure={hasEditableAgents ? form.openReviewerModal : undefined}
              />
            }
            submitSlot={
              <MorphingSubmitButton
                hasContent={form.hasQuestion || attachmentCount > 0}
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
          configRequired={!form.isConfigValid}
        />
      )}
    </>
  )
}
