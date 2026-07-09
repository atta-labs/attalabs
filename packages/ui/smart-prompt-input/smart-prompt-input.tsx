'use client'

import type { ChatStatus, FileUIPart } from 'ai'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
  type PromptInputMessage
} from './vendor/prompt-input'
import { SmartPromptComponentsProvider, type SmartPromptComponents } from './vendor/components-context'
import { AttachmentChip } from '../lib/attachment-chip'
import type { TextareaVariant } from '../types/form/textarea'
import { cn, formatBytes } from '../lib/utils'

export type SmartPromptInputSurface = 'card' | 'popover' | 'bare'

/**
 * Surface presets — see `surface` prop docs.
 *
 * - `card`: backward-compatible default for the `surface` prop. No outer halo;
 *   vendor InputGroup keeps its resting focus ring. (Herald's `JDInput` no
 *   longer uses this default post-PR #207 — it opts in to `'popover'` to
 *   align visually with Vāda's hero. New consumers that omit `surface` still
 *   land here.)
 * - `popover`: outer wrapper carries a soft 2px ring on focus-within (using
 *   the same `--ring` token); InputGroup is elevated to `bg-popover` with
 *   `rounded-xl shadow-lg` and the inner vendor ring is suppressed.
 * - `bare`: no surface chrome at all — the InputGroup drops its border,
 *   background, rounding, and resting focus ring. Use when the consuming
 *   layout supplies its own chrome (e.g. fixed bottom bar with own border).
 */
const SURFACE_WRAPPER_CLASS: Record<SmartPromptInputSurface, string> = {
  card: '',
  popover:
    'rounded-xl focus-within:ring-2 focus-within:ring-ring/60 focus-within:ring-offset-2 focus-within:ring-offset-background',
  bare: ''
}

const SURFACE_INPUT_GROUP_CLASS: Record<SmartPromptInputSurface, string> = {
  card: '',
  // Suppress the inner ring (we move the halo to the wrapper) and elevate.
  popover: 'rounded-xl bg-popover shadow-lg focus-within:ring-0',
  // Strip everything — the parent layout supplies its own chrome.
  bare: 'border-0 bg-transparent rounded-none focus-within:ring-0'
}

export type SmartPromptStatus = 'idle' | 'loading' | 'streaming' | 'error'

export interface SmartPromptInputProps {
  onSubmit: (text: string, files: FileUIPart[]) => void
  placeholder?: string
  /** 'enter' = Enter submits (default) | 'cmdenter' = Cmd/Ctrl+Enter submits, plain Enter = newline | 'button' = no keyboard submit */
  submitOn?: 'enter' | 'cmdenter' | 'button'
  ctaLabel?: string
  hint?: string
  accept?: string
  status?: SmartPromptStatus
  onStop?: () => void
  className?: string
  /** Paste text longer than this char count as a file attachment instead of textarea fill */
  pasteToFileChars?: number
  /**
   * Gemini-style action slot rendered next to the submit button.
   *
   * - When the textarea is at its minimum (single line / unfilled),
   *   `actions` renders inline on the right side of the textarea,
   *   immediately before the submit button (submit stays rightmost).
   * - When the textarea wraps to 2+ lines (or attachments are present),
   *   `actions` drops into the footer row beneath the textarea,
   *   to the right of any existing tools, before the submit button.
   *
   * When `actions` is not provided the input still renders a submit — post-PR
   * #207 the no-actions inline branch surfaces the submit beside the textarea
   * on a single line (previously the submit only appeared once the footer
   * mounted, which left Herald-style consumers without one on first render).
   * The prop default itself is backward-compatible: omitting `actions` keeps
   * the no-actions code path; the surface change is the path's content, not
   * the prop semantics.
   */
  actions?: React.ReactNode
  /**
   * Which side of the input the `actions` slot occupies.
   *
   * - `'right'` (default): actions render to the right of the textarea (inline
   *   mode) or on the right side of the footer (multi-line mode), immediately
   *   before the submit button. This is the original layout the prop preserves
   *   as its default.
   * - `'left'`: actions LEAD the input.
   *   - Inline mode: `[actions] [textarea ........] [submit]`
   *   - Multi-line mode: footer becomes `[actions, tools, hint] ... [submit]`.
   *
   * Has no effect when `actions` is not provided.
   */
  actionsPosition?: 'left' | 'right'
  /**
   * Caller-provided submit element rendered in place of the default
   * `PromptInputSubmit`. The caller is fully responsible for the node — its
   * submit logic, accessibility, and whatever Cmd+Enter handling it wants.
   *
   * Used by Vāda's hero for a morphing Configure ↔ Submit button: when the
   * form is invalid the slot renders a CONFIGURE button that opens the
   * reviewer modal (no submit); when the form is valid it renders a real
   * submit button. Either-or, never both.
   *
   * The slot is honored in BOTH inline mode and footer mode. It replaces the
   * default `PromptInputSubmit` in either location; no other behavior changes.
   *
   * When `submitSlot` is undefined the input renders the default
   * `PromptInputSubmit`. The prop default is backward-compatible (omitting
   * `submitSlot` selects the canonical submit element); the position that
   * canonical submit lands in changed for the no-actions inline branch — see
   * the `actions` prop docs above.
   *
   * Has no effect when `useFullWidthCta` is in effect (`ctaLabel` set), since
   * that path renders a full-width CTA button instead of `PromptInputSubmit`.
   */
  submitSlot?: React.ReactNode
  /**
   * Optional className passed through to the inner `<textarea>`. Lets callers
   * tune textarea-only styling (e.g. `min-h-0` to defeat the vendor default
   * `min-h-16` so the textarea collapses to a true single line) without
   * touching the surrounding container.
   *
   * Merged via `cn`/`tailwind-merge` AFTER the vendor defaults, so any utility
   * class passed here wins for its property family.
   */
  textareaClassName?: string
  /**
   * INJECTION CONTRACT — see `.claude/skills/ui-library-system/SKILL.md`.
   *
   * SmartPromptInput resolves NO library itself. Consuming apps MUST inject
   * their library's primitives via this prop. Vāda passes them at build-time
   * from `@atta/ui`; Herald passes them at runtime via `useComponents()`.
   *
   * Every key is optional so the input degrades gracefully during the
   * first-render window (mirrors `JDInput`'s `Button ? <Button…> : <button>`
   * pattern). When undefined the vendor falls back to a native HTML element
   * with sane styling.
   */
  components?: SmartPromptComponents
  /**
   * Observe-only callback fired with the current textarea text on every
   * input. Lets a consumer mirror the typed value into its own state in real
   * time WITHOUT making the input a fully controlled component (the consumer
   * never has to pass `value` back in). The textarea remains uncontrolled
   * locally; this prop is pure observation.
   *
   * Used by Vāda's hero to drive the `hasQuestion` predicate (which gates the
   * morphing submit button and the hero ↔ active layout switch) directly off
   * the typed text instead of waiting for submit. Consumers that omit
   * `onTextChange` simply receive no callback — the prop is purely additive
   * and backward-compatible.
   *
   * On submit the existing `onSubmit(text, files)` path is unaffected —
   * `onSubmit` receives the explicit text, not the consumer's state, so
   * there is no race between the last `onTextChange` and submit.
   */
  onTextChange?: (text: string) => void
  /**
   * Fires whenever the attachment count changes (a file pasted, a long text
   * paste converted to a file via `pasteToFileChars`, an X-click removal).
   * Lets the consumer gate a submitSlot button on attachment presence — e.g.
   * Vāda's MorphingSubmitButton shows when there is question text OR an
   * attachment, since either is submittable content.
   *
   * Mirrors `onTextChange`: pure observation, the SmartPromptInput still owns
   * its internal `attachmentCount` state.
   */
  onAttachmentsChange?: (count: number) => void
  /**
   * Variant forwarded to the injected `Textarea`. When set the vendor passes
   * `variant={textareaVariant}` to the injected component, giving the consumer
   * a variant-level escape hatch instead of `textareaClassName` overrides.
   *
   * Pair with `surface='popover'` to use `'bare'` — the textarea sheds its own
   * chrome (border, rounded corners, focus ring, resize handle, `min-h-16`
   * baseline) and blends into the surrounding InputGroup.
   *
   * Defaults to `undefined` — backward-compatible at the prop level: consumers
   * that omit `textareaVariant` keep their library-default Textarea variant.
   * Herald's `JDInput` post-PR #207 explicitly sets `'bare'` (paired with
   * `surface='popover'`) and is therefore NOT byte-identical to its pre-PR
   * render — the default still is.
   */
  textareaVariant?: TextareaVariant
  /**
   * Container surface treatment. The component owns its own elevation,
   * focus halo, and surface chrome — call sites should never reach in with
   * descendant selectors.
   *
   * - `'card'` (default) — the vendor's original surface (`bg-card`,
   *   `focus-within:ring-1 focus-within:ring-ring` on the InputGroup itself).
   *   Consumers that omit `surface` land here; the prop default is
   *   backward-compatible. Note: Herald's `JDInput` no longer omits this prop
   *   post-PR #207 — it sets `surface='popover'` and is therefore not the
   *   canonical card-surface render at runtime.
   * - `'popover'` — Vāda hero treatment. Elevates the InputGroup to
   *   `bg-popover` with `rounded-xl shadow-lg`, and moves the focus halo to
   *   the OUTER wrapper (`focus-within:ring-2 ring-ring/60` + offset). The
   *   InputGroup's own `overflow-hidden` is swapped to `overflow-clip` so the
   *   ring is not clipped if you want it back inside; the outer-wrapper ring
   *   sidesteps the clipping problem entirely.
   * - `'bare'` — no surface at all. The InputGroup keeps its layout but drops
   *   its border, background, rounding, and the resting focus ring. Use when
   *   the consuming layout supplies its own chrome (e.g. a fixed bottom bar
   *   already wrapped in `border-t bg-background/95`). The focus halo is
   *   suppressed too.
   */
  surface?: SmartPromptInputSurface
}

const statusMap: Record<SmartPromptStatus, ChatStatus> = {
  idle: 'ready',
  loading: 'submitted',
  streaming: 'streaming',
  error: 'error'
}

interface FileExtra {
  size: number
  charCount?: number
  textPreview?: string
}

function AttachmentTiles({ onCountChange }: { onCountChange?: (count: number) => void }) {
  const { files, remove } = usePromptInputAttachments()
  const [extras, setExtras] = useState<Map<string, FileExtra>>(new Map())
  const loadedIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    onCountChange?.(files.length)
  }, [files.length, onCountChange])

  useEffect(() => {
    for (const f of files) {
      if (loadedIds.current.has(f.id)) continue
      loadedIds.current.add(f.id)

      const url = f.url ?? ''
      void (async () => {
        try {
          let blob: Blob
          if (url.startsWith('blob:')) {
            const res = await fetch(url)
            blob = await res.blob()
          } else if (url.startsWith('data:')) {
            const comma = url.indexOf(',')
            const header = url.slice(0, comma)
            const data = url.slice(comma + 1)
            const bytes = header.includes(';base64')
              ? Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
              : new TextEncoder().encode(decodeURIComponent(data))
            blob = new Blob([bytes])
          } else {
            return
          }

          const size = blob.size
          let charCount: number | undefined
          let textPreview: string | undefined

          if (f.mediaType.startsWith('text/')) {
            const text = await blob.text()
            charCount = text.length
            textPreview = text.slice(0, 200).trim()
          }

          setExtras((prev) => new Map(prev).set(f.id, { size, charCount, textPreview }))
        } catch {
          // non-critical
        }
      })()
    }
  }, [files])

  // PromptInputHeader stays mounted in both states so the `grid-template-rows`
  // 0fr ↔ 1fr trick has a stable wrapper to transition. This is the smoothest
  // pure-CSS way to animate between 0 and intrinsic content height — no JS,
  // no transforms (so the focused textarea isn't affected), no measurement
  // loops. Works in every modern browser.
  const hasFiles = files.length > 0

  return (
    <PromptInputHeader className={cn(!hasFiles && 'p-0')}>
      <div
        className={cn(
          'grid w-full transition-[grid-template-rows] duration-300 ease-out',
          hasFiles ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className='overflow-hidden'>
          <div className='flex gap-2 p-1 overflow-x-auto'>
            {files.map((f) => {
              const extra = extras.get(f.id)
              const isText = f.mediaType.startsWith('text/')
              const meta =
                isText && extra?.charCount !== undefined
                  ? `${extra.charCount.toLocaleString()} chars`
                  : extra
                    ? formatBytes(extra.size)
                    : '—'
              return (
                <AttachmentChip
                  key={f.id}
                  filename={f.filename ?? 'file'}
                  status={extra ? 'ready' : 'resolving'}
                  meta={meta}
                  preview={extra?.textPreview}
                  onRemove={() => remove(f.id)}
                />
              )
            })}
          </div>
        </div>
      </div>
    </PromptInputHeader>
  )
}

export function SmartPromptInput({
  onSubmit,
  placeholder,
  submitOn = 'enter',
  ctaLabel,
  hint,
  accept,
  status = 'idle',
  onStop,
  className,
  pasteToFileChars,
  actions,
  actionsPosition = 'right',
  submitSlot,
  textareaClassName,
  textareaVariant,
  surface = 'card',
  components,
  onTextChange,
  onAttachmentsChange
}: SmartPromptInputProps) {
  const chatStatus = statusMap[status]
  const [rejectionError, setRejectionError] = useState<string | null>(null)
  const useFullWidthCta = Boolean(ctaLabel)
  const hasActions = actions !== undefined && actions !== null && actions !== false
  const actionsOnLeft = hasActions && actionsPosition === 'left'
  // When the caller provides a custom submit element, render it in place of
  // the default `PromptInputSubmit` in every code path below — inline mode AND
  // footer mode. When undefined we fall through to the canonical
  // `PromptInputSubmit` (omitting `submitSlot` is backward-compatible at the
  // prop level; the position the canonical submit lands in for no-actions
  // consumers changed post-PR #207 — see `actions` prop docs).
  const hasSubmitSlot = submitSlot !== undefined && submitSlot !== null && submitSlot !== false
  const renderSubmit = () =>
    hasSubmitSlot ? (
      submitSlot
    ) : (
      <PromptInputSubmit status={chatStatus} onStop={onStop}>
        {ctaLabel}
      </PromptInputSubmit>
    )

  // Track textarea single-line vs multi-line for Gemini-style responsive placement.
  // Detection: measure the textarea's actual content height on input and compare
  // to the line-height baseline. The textarea grows via `field-sizing-content`,
  // so re-measuring on `onInput` (and on mount) catches every height change that
  // matters — no ResizeObserver needed.
  //
  // We resolve the textarea node by querying the wrapper rather than forwarding
  // a ref through the vendored PromptInputTextarea — that component is a plain
  // function component without ref forwarding, and patching the vendor file to
  // add it would cost more than this targeted DOM query. The injected
  // `@atta/ui` Textarea is itself a real `<textarea>` element (no wrapping div),
  // so `querySelector('textarea[name="message"]')` always lands on the right node.
  //
  // Robustness note: shadcn's `<textarea>` ships with no explicit `line-height`,
  // so `getComputedStyle(el).lineHeight` returns the literal string `'normal'` and
  // `parseFloat('normal')` returns `NaN`. The previous implementation early-returned
  // on `NaN` and never flipped `isMultiLine`, freezing the input in inline mode no
  // matter how many lines wrapped. We derive the line height from `font-size * 1.2`
  // when computed style reports `'normal'` (the browser default).
  //
  // ── Bulletproof one-way latch ──
  // The naïve single-threshold approach (enter+exit at the same `lineHeight * 1.5`)
  // caused layout flapping: in inline mode the textarea has NARROWER width (actions
  // + submit take horizontal space on the right), so content can wrap to 2 lines
  // and flip `isMultiLine = true` → footer mode (textarea is now FULL width) →
  // same content fits on 1 line → flip back to inline → wrap again → ... infinite
  // oscillation as the user types.
  //
  // A two-threshold "deadband" (enter at 1.5x, exit at 1.1x) did NOT solve it
  // either — when the layout swaps width on the next remeasure the content height
  // crosses both thresholds at once and the latch trips back. The root problem
  // is that BOTH width conditions can produce contentHeight values inside the
  // deadband as the user types one character at a time.
  //
  // Fix: lock the latch. Once `isMultiLine = true`, only return to inline mode
  // when the textarea is essentially empty (`value.trim().length === 0`). The
  // user has to clear the input to reset the layout. This is invariant under
  // width changes by construction — width swaps don't change whether the user's
  // text is empty. Mental walkthrough:
  //
  //   Empty                          → inline (initial)
  //   Type 1 char                    → contentHeight ~= lineHeight, stays inline
  //   Type until wrap                → contentHeight > lineHeight * 1.5, flips to multi-line (footer)
  //   Footer width fits on 1 line    → DOES NOT flip back (latch locked)
  //   Type more                      → stays multi-line
  //   Delete back to 1 char          → still multi-line (latch locked)
  //   Delete to empty                → flips back to inline
  //   Type again                     → starts inline
  //
  // No oscillation possible: every state transition requires the user to
  // either type past the enter threshold or clear the input completely.
  //
  // Consumers that don't pass `actions` short-circuit the layout effect:
  // `hasActions = false` skips the inline ↔ footer remeasure flow, and
  // `remeasure` is only wired to `onInput` inside the `hasActions` branch.
  // (Herald used to be the canonical such consumer pre-PR #207; its current
  // JDInput still passes no `actions` but DOES set `surface='popover'` and
  // `textareaVariant='bare'`, which affect chrome only — not this latch.)
  const inputRowRef = useRef<HTMLDivElement | null>(null)
  const [isMultiLine, setIsMultiLine] = useState(false)
  const [attachmentCount, setAttachmentCount] = useState(0)

  useEffect(() => {
    onAttachmentsChange?.(attachmentCount)
  }, [attachmentCount, onAttachmentsChange])

  const remeasure = () => {
    const el = inputRowRef.current?.querySelector<HTMLTextAreaElement>('textarea[name="message"]')
    if (!el) return
    const styles = window.getComputedStyle(el)
    const fontSize = Number.parseFloat(styles.fontSize)
    const rawLineHeight = styles.lineHeight
    const lineHeight =
      rawLineHeight === 'normal' || rawLineHeight === '' ? fontSize * 1.2 : Number.parseFloat(rawLineHeight)
    if (!Number.isFinite(lineHeight) || lineHeight <= 0) return
    const paddingTop = Number.parseFloat(styles.paddingTop) || 0
    const paddingBottom = Number.parseFloat(styles.paddingBottom) || 0
    const borderTop = Number.parseFloat(styles.borderTopWidth) || 0
    const borderBottom = Number.parseFloat(styles.borderBottomWidth) || 0
    // Content area = scrollHeight minus padding and border. Independent of
    // Tailwind padding/border overrides on the injected textarea.
    const contentHeight = el.scrollHeight - paddingTop - paddingBottom - borderTop - borderBottom
    const enterThreshold = lineHeight * 1.5
    setIsMultiLine((prev) => {
      // ENTER: from inline, only enter when content meaningfully exceeds one
      // line (≥ 2 visible lines at the narrower inline width).
      if (!prev) return contentHeight > enterThreshold
      // EXIT: once multi-line, stay multi-line until the input is essentially
      // empty. This is the bulletproof rule that defeats width-swap oscillation:
      // emptiness is invariant under the layout's width change, so the latch
      // cannot trip back on the next remeasure.
      return el.value.trim().length > 0
    })
  }

  useLayoutEffect(() => {
    remeasure()
  }, [])

  const handleSubmit = (message: PromptInputMessage) => {
    setRejectionError(null)
    onSubmit(message.text, message.files)
    // Re-measure after submit — clearing the textarea collapses it back to one line.
    requestAnimationFrame(() => remeasure())
  }

  const handleError = ({ code }: { code: string; message: string }) => {
    if (code === 'accept') {
      setRejectionError('Only PDF, Markdown, or text files are accepted.')
      setTimeout(() => setRejectionError(null), 4000)
    }
  }

  // Footer renders whenever we have tools, hint, or the default submit position.
  // When single-line, we lift submit (and actions if present) inline next to the
  // textarea — so the footer is only needed if tools/hint exist or we're in
  // multi-line/attachment mode (where they drop to the footer).
  const inlineMode = !isMultiLine && attachmentCount === 0
  const hasFooterContent = !useFullWidthCta && (!!accept || !!hint || !inlineMode)

  return (
    <SmartPromptComponentsProvider components={components}>
      <div ref={inputRowRef} className={cn(SURFACE_WRAPPER_CLASS[surface], className)}>
        <PromptInput
          accept={accept}
          onSubmit={handleSubmit}
          onError={handleError}
          inputGroupClassName={SURFACE_INPUT_GROUP_CLASS[surface] || undefined}
        >
          <AttachmentTiles onCountChange={setAttachmentCount} />
          {hasActions ? (
            // `items-center` aligns the textarea's first line with the vertical
            // center of the actions cluster (the cluster's intrinsic height is
            // `icon-button + py-1.5` ≈ 48px; a single-line textarea is ≈ 36px).
            // With `items-end` the textarea sat at the bottom of the row and
            // the placeholder/first line floated to the TOP of the textarea
            // while the icon button appeared centered in its taller container —
            // they read as misaligned. With `items-center`, the textarea's
            // single line and the icon share a baseline. Once `isMultiLine`
            // flips, the actions+submit move to the footer row so vertical
            // centering doesn't drift as the textarea grows multi-line.
            <div className='flex flex-row items-center gap-1'>
              {inlineMode && actionsOnLeft && (
                <div className='flex shrink-0 items-center gap-1 px-2 py-1.5'>
                  <div className='flex items-center gap-1'>{actions}</div>
                </div>
              )}
              <PromptInputTextarea
                placeholder={placeholder}
                submitOnCmdEnter={submitOn === 'cmdenter'}
                pasteToFileChars={pasteToFileChars}
                onInput={remeasure}
                onTextChange={onTextChange}
                className={textareaClassName}
                variant={textareaVariant}
              />
              {inlineMode && !actionsOnLeft && (
                <div className='flex shrink-0 items-center gap-1 px-2 py-1.5'>
                  <div className='flex items-center gap-1'>{actions}</div>
                  {!useFullWidthCta && renderSubmit()}
                </div>
              )}
              {inlineMode && actionsOnLeft && !useFullWidthCta && (
                <div className='flex shrink-0 items-center gap-1 px-2 py-1.5'>{renderSubmit()}</div>
              )}
            </div>
          ) : inlineMode && !useFullWidthCta ? (
            // No-actions inline mode: textarea + inline submit (mirrors the
            // hasActions inline branch, just without the actions cluster). Before
            // this branch existed, single-line Herald-style inputs rendered the
            // submit ONLY in the footer, and the footer only appeared when
            // `accept || hint || !inlineMode` was true — so a Herald consumer
            // typing one line of text with no hint/accept saw NO submit anywhere.
            // The default vendor render now always surfaces a submit affordance.
            <div className='flex flex-row items-center gap-1'>
              <PromptInputTextarea
                placeholder={placeholder}
                submitOnCmdEnter={submitOn === 'cmdenter'}
                pasteToFileChars={pasteToFileChars}
                onInput={remeasure}
                onTextChange={onTextChange}
                className={textareaClassName}
                variant={textareaVariant}
              />
              <div className='flex shrink-0 items-center gap-1 px-2 py-1.5'>{renderSubmit()}</div>
            </div>
          ) : (
            <PromptInputTextarea
              placeholder={placeholder}
              submitOnCmdEnter={submitOn === 'cmdenter'}
              pasteToFileChars={pasteToFileChars}
              onInput={remeasure}
              onTextChange={onTextChange}
              className={textareaClassName}
              variant={textareaVariant}
            />
          )}
          {hasFooterContent && (
            <PromptInputFooter>
              <PromptInputTools>
                {hasActions && !inlineMode && actionsOnLeft && <div className='flex items-center gap-1'>{actions}</div>}
                {accept && (
                  <PromptInputActionMenu>
                    <PromptInputActionMenuTrigger />
                    <PromptInputActionMenuContent>
                      <PromptInputActionAddAttachments />
                    </PromptInputActionMenuContent>
                  </PromptInputActionMenu>
                )}
                {hint && <span className='font-mono text-[10px] text-muted-foreground'>{hint}</span>}
              </PromptInputTools>
              {hasActions && !inlineMode && !actionsOnLeft && (
                <div className='flex items-center gap-1'>
                  <div className='flex items-center gap-1'>{actions}</div>
                  {!useFullWidthCta && renderSubmit()}
                </div>
              )}
              {hasActions && !inlineMode && actionsOnLeft && !useFullWidthCta && renderSubmit()}
              {!hasActions && !inlineMode && !useFullWidthCta && renderSubmit()}
            </PromptInputFooter>
          )}
          {useFullWidthCta && (
            <div className='border-t border-border px-2 pb-2 pt-1.5'>
              <button
                type='submit'
                className='w-full rounded-md bg-primary py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50'
              >
                {ctaLabel}
              </button>
            </div>
          )}
        </PromptInput>
        {rejectionError && <p className='mt-1.5 font-mono text-[10px] text-destructive'>{rejectionError}</p>}
      </div>
    </SmartPromptComponentsProvider>
  )
}
