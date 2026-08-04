**Status:** ratified

## Most recent session — Jun 27, 2026

PR #207 follow-up — deep architectural refactor across the Deliberate page and topbar (Phase 0 / 1 / 2 of the 11-item audit). Branch `task/vada-production-v1/tool-badges`; three additive commits (`7576598e`, `0d25d525`, `8027236b`) on the existing PR. Architecture principle being applied: **classNames at call sites are for LAYOUT ONLY (positioning, sizing, grid, gap). NEVER for component appearance — hover effects, colors, focus rings, borders, backgrounds, typography chrome. Components own their visual identity. Variants and props are the contract. Wrappers are the escape hatch. The library is the single source of truth.**

**Phase 0 — drop restated canonical tokens from call sites (`7576598e`).** Pure call-site cleanup, zero library risk.

- `TeamPicker.tsx`: `DropdownMenuContent` className stripped of `border-border bg-popover` (both already shipped by canonical `DropdownMenuContent`). Final value: `'w-[280px] max-h-[60vh] overflow-y-auto shadow-lg'` — sizing + Vāda-specific elevation only.
- `ReviewerConfigModal.tsx`: `DialogTitle className='font-serif text-lg text-foreground'` deleted entirely. All three are baked into the canonical `DialogTitle` (`font-serif text-lg leading-none font-semibold tracking-tight`).
- `ReviewerConfigModal.tsx`: "View team" `NextLink` switched from `variant='prose'` to `variant='subtle'`. The `subtle` variant already ships `font-mono text-xs text-muted-foreground transition-colors hover:text-accent`. Call-site className reduced to `'inline-flex w-fit items-center gap-1 text-[11px] uppercase tracking-widest'` — layout + Vāda-specific 11px tracking only.

**Phase 1 — additive Button/Textarea/Heading variants (`0d25d525`).** Library improvements, defaults preserved (Herald byte-identical).

- `Button.variant = 'ghost-pill'` added to basic (animate inherits via shared `buttonVariants`). Class set: `'border border-border text-muted-foreground hover:text-accent-foreground hover:bg-accent/10'` — a small bordered pill with muted text and accent hover. Type union expanded in `packages/ui/types/interactive/button.ts`.
- `Textarea.variant = 'bare'` added to basic (animate's textarea re-exports basic's). Class set: `'min-h-0 border-0 rounded-none bg-transparent dark:bg-transparent focus-visible:border-transparent focus-visible:ring-0 resize-none'` — strips every default chrome so the textarea blends into a styled container. Type union expanded.
- `Heading.weight` prop added (`'normal' | 'medium' | 'semibold' | 'bold'`, default `'bold'`). The default preserves the prior baked `font-bold` for every existing consumer. New `HeadingWeight` type registered in `packages/ui/types/index.ts` and `component-contract.mjs`.
- `SmartPromptInput.textareaVariant` prop added, forwarded to the injected `Textarea`. The vendor `PromptInputTextarea` accepts a `variant` prop and conditionally spreads `{ variant }` onto the injected component (so `undefined` is invisible to Herald). `SmartPromptInput.surface` prop type ('card' | 'popover' | 'bare') added; render wiring lands in Phase 2.

**Phase 2 — DropdownMenuItem text highlight + SmartPromptInput surface prop (`8027236b`).** The big architectural moves that remove the four `!important` prefixes and the `HERO_*` constants.

- New `DropdownMenuItemTextHighlight` wrapper. Lives at `packages/ui/libraries/{basic,animate}/components/interactive/dropdown-menu-item-text-highlight.tsx`; retro/brutal fall back to basic. Wraps `DropdownMenuItem` and neutralizes **BOTH** the canonical `focus:bg-accent` AND `data-[highlighted]:bg-accent` rules in a single className, then re-routes the highlight to text-only via `focus:text-accent` + `data-[highlighted]:text-accent`. Because both modifier families are addressed at once, `tailwind-merge` resolves the conflicts deterministically — no `!important` needed. The wrapper accepts `selected?: boolean`; when true it renders the canonical accent fill (persistent commitment, per the theme-tokens doctrine). `group` is added so child spans can opt into the same highlight state via `group-focus:` / `group-data-[highlighted]:`. Registered in `component-contract.mjs` (`DropdownMenuItemTextHighlight` + `DropdownMenuItemTextHighlightProps`).
- New `SmartPromptInput.surface` prop with render wiring. Three presets: `'card'` (default, byte-identical to before), `'popover'` (elevates the InputGroup to `bg-popover rounded-xl shadow-lg`, suppresses its resting ring, and moves a 2px focus halo to the outer wrapper where `overflow-hidden` does not clip it), and `'bare'` (strips border / bg / rounded / ring for parents that supply their own chrome). The component owns its DOM and addresses the InputGroup directly via the vendor's new `inputGroupClassName` prop on `PromptInput` — no `[&>form>div]` descendant selectors at the call site. The vendor's `overflow-hidden` on `InputGroup` is preserved (Herald byte-identity); the popover preset solves the ring-clipping problem by moving the halo OUTSIDE the InputGroup rather than swapping the overflow mode.
- `TeamPicker.tsx`: Button trigger switches from `variant='outline'` to `variant='ghost-pill'`. Call-site className reduces to `'gap-1.5 font-mono text-[10px] uppercase tracking-widest'` — drops the `text-muted-foreground hover:text-accent-foreground` pair that the `ghost-pill` variant now owns. `DropdownMenuItem` replaced by `DropdownMenuItemTextHighlight selected={isSelected}` — all four `!important` prefixes deleted (the previous `focus:!bg-transparent focus:!text-accent` and `group-focus:!text-accent/80`). Subtitle span uses `group-focus:text-accent/80 group-data-[highlighted]:text-accent/80` with no `!` anywhere.
- `DeliberateSection.tsx`: `HERO_TEXTAREA_CLASSNAME`, `HERO_WRAPPER_CLASSNAME`, `FIXED_BAR_WRAPPER_CLASSNAME`, `FOCUS_HALO` constants **deleted entirely**. The hero `SmartPromptInput` now uses `surface='popover' textareaVariant='bare'` and passes no `className` / `textareaClassName` for appearance. The `Heading` uses `weight='normal'` (replacing call-site `font-normal`), drops the redundant `text-foreground` (inherited from the canvas body), keeps `font-serif`.

**Herald byte-identity.** `git diff origin/main...HEAD -- apps/herald-ai/` shows zero changes from the three commits in this session. Herald's `JDInput` passes neither `surface` nor `textareaVariant` and uses `Heading` from the default `bold` weight — every default is preserved.

**Verification.** `bun run typecheck --force && bun run check` pass. `bun run validate:ui-contract` passes (107 components, 53 types, all four libraries). `PR_BODY="$(gh pr view 207 --json body -q .body)" bun scripts/verify-docs.ts --pr` passes.

## Previous session — Jun 27, 2026

PR #207 follow-up — custom-class audit, hero repositioning, dropdown-hover explanation, topbar variant consistency, focus-indicator border swap. Branch `task/vada-production-v1/tool-badges`; no new PR, additive commits on the existing one (plus a pre-existing local admin commit `a8a0f5c6` unrelated to this work).

**Audit — custom (non-Tailwind) classNames introduced by PR #207.**

Audit scope: every `*.tsx` / `*.ts` file PR #207 touched (`git diff --name-only origin/main...HEAD~1`, excluding the local admin commit). Each file's `className=` usages were grep'd and inspected. Allowed: standard Tailwind utilities, arbitrary values (`bg-[var(--popover)]`, `w-[280px]`, `pt-[20vh]`), arbitrary-descendant selectors (`[&>form>div]:focus-within:ring-0`), data-attribute variants, group variants, important-prefix utilities (`!size-2`, `!bg-muted-foreground`). Forbidden: CSS-module names, BEM-style classes, non-Tailwind utility libraries.

Result: **clean across all 34 files.** No custom CSS module classes. No BEM. No non-Tailwind utility names. Every className parses as Tailwind. `font-display` (Herald `JDInput.tsx` line 131) exists pre-PR and is unchanged by PR #207 (PR diff for that file is only the `components={...}` injection and a `const components = useComponents()` extract — no className additions). InputGroup vendor file at `packages/ui/smart-prompt-input/vendor/ui/input-group.tsx` uses semantic tokens (`bg-card`, `text-card-foreground`, `focus-within:ring-ring`) — all Tailwind. No corrective changes needed in this commit.

**Fix 7 — Hero content top-biased (not vertically centered).**

User report: when the textarea wraps into footer mode, the dropdown row sits very close to the viewport bottom and the layout reads as cramped at the page edge. Root cause: `DeliberateSection.tsx` empty-state container used `flex flex-col items-center justify-center`, which centers the title + input vertically in the available `min-h-[calc(100dvh-3.5rem)]` space. As the input grows downward (multi-line latch), the bottom edge of the InputGroup approaches the page edge while the title moves further up — but with the input still anchored to the vertical midpoint, the bottom edge gets visually pinned to the lower half.

Fix in `DeliberateSection.tsx`: replace `justify-center` with `pt-[20vh]` and `items-center` with `items-center` (kept — horizontal centering is unchanged). The vertical position is now deterministic: `pt-[20vh]` places the title in the upper third of the available height, leaving the lower ~80% of the viewport for the input to grow into. `items-start` is not needed because `pt-[20vh]` controls vertical position directly; `items-center` continues to handle horizontal centering. Result: header bar visible at the top, ~20% empty space below it, then title + input, then ample room below before the page edge. The active-state layout (fixed bottom bar) is untouched — only the empty-state hero container changed.

No parent constraint fights the reposition: the route-level `CatalogProvider` on `deliberate/page.tsx` line 53 sets `relative min-h-[calc(100dvh-3.5rem)]` and the `(main)/layout.tsx` body uses `flex flex-col min-h-dvh` with `flex-1` children — both pass available height through to the section without imposing a centered alignment.

**Dropdown hover — canonical pattern + Vāda override confirmation (for future reference).**

User asked: "is the UI implementation to hover the entire element instead of the text?" Answer in two parts.

1. **Canonical shadcn / `@atta/ui` behavior is whole-element highlight.** The installed `DropdownMenuItem` at `packages/ui/libraries/basic/installed/dropdown-menu.tsx` line 58–59 ships `focus:bg-accent focus:text-accent-foreground` as the default highlighted-item treatment. Radix sets the `focus` data-state on the currently-highlighted item (keyboard arrow-key navigation OR pointer hover), so the entire row fills with `--accent` and the text flips to `--accent-foreground`. This is the canonical pattern and is intentionally what every dropdown across every product gets out of the box. We did **not** modify the installed component (doing so would change every dropdown in every product — out of scope and a stop-condition violation).

2. **Vāda's `TeamPicker.tsx` overrides this at the call site, and the override is still in effect** (verified at lines 71–73). Non-selected items get `focus:bg-transparent focus:text-accent` passed via `className`. `tailwind-merge` resolves the conflicts deterministically: `focus:bg-transparent` wins over the installed `focus:bg-accent` (same `background-color` family on the same variant), and `focus:text-accent` wins over `focus:text-accent-foreground` (same `color` family). The subtitle span follows the same rule via `group-focus:text-accent/80`. Selected items keep `bg-accent text-accent-foreground` (a persistent commitment, not a transient highlight — fills are appropriate for selected/active state per the theme-tokens doctrine). Net behavior in Vāda's TeamPicker: **text shifts to accent on hover, background stays `bg-popover`. Selected item is the only item with an accent fill.** Every other dropdown in Vāda (and in every other product) keeps the canonical whole-element highlight.

**Verification.** `bun run typecheck --force && bun run check` pass. `bun scripts/verify-docs.ts --pr` pass. Herald byte-identity: this commit touches only `apps/vada-ai/web/src/app/(main)/deliberate/components/DeliberateSection.tsx` and `apps/vada-ai/specs/vada-state.md` — zero Herald files. The local admin commit `a8a0f5c6` (kept per user instruction) does touch Herald-adjacent files but is unrelated to this PR's tool-badges work.

**Fix 8 — Topbar button variant consistency (`ColorSchemeToggle`).**

User report: the Settings gear in Vāda's `/deliberate` topbar uses `variant='ghost'` (from `apps/vada-ai/web/src/app/(main)/layout.tsx`'s `extraActions`), but the `ColorSchemeToggle` sitting immediately next to it in the same right-cluster used `variant='outline'`. Two icon buttons next to each other in the same toolbar should carry the same variant; the mismatch read as "one button has a chrome it shouldn't". Herald's topbar Settings button is `outline`, so a universal flip of the toggle to `ghost` would only fix Vāda while breaking Herald's match — `outline` is the historical Herald default and stop-condition 2 requires Herald to stay byte-identical. Fix is a per-consumer override on the topbar contract: `TopBar` gains a `colorSchemeVariant?: 'outline' | 'ghost'` prop (default `'outline'`, Herald-compatible), forwarded into `ColorSchemeToggle` (also gains a `variant` prop with the same default). Vāda's `(main)/layout.tsx` passes `colorSchemeVariant='ghost'`. Herald's `HeraldTopBar` and every other consumer pass nothing, so they keep `outline` by default — zero byte change. `ColorSchemeToggle` is owned by `TopBar` (consumers cannot wrap or replace it from outside), so the per-product override has to live on the topbar contract; we centralized the default in `DEFAULT_COLOR_SCHEME_VARIANT` so the with-auth and no-auth code paths agree on the fallback.

**Fix 9 — `SmartPromptInput` focus indicator (border-color, not ring).**

The hero/fixed-bar wrappers previously carried `[&>form>div]:focus-within:ring-0`, which suppressed the InputGroup's canonical `focus-within:ring-1 focus-within:ring-ring` because `--ring` resolved to a magenta/purple value that read wrong on the input surface. Net effect after that suppression: zero visible focus state. Even without the suppression the ring would still be invisible — the same vendored component wraps itself in `overflow-hidden` (`<InputGroup className='overflow-hidden'>` in `prompt-input.tsx`), which clips the ring's `box-shadow` on every side. Switching the focus indicator to a border-color swap on the same `[&>form>div]` selector solves both: the InputGroup already carries a resting `border border-border` (vendor input-group.tsx line 10), so toggling `border-ring` on `focus-within` paints in-box, is not clipped by `overflow-hidden`, and reaches for the same `--ring` token the canonical indicator already references. The theme team is recalibrating `--ring` to a confident red in a parallel task; the focus state follows that recalibration automatically. New constants: `FOCUS_BORDER_SWAP = '[&>form>div]:focus-within:border-ring'`, applied to both `HERO_WRAPPER_CLASSNAME` and `FIXED_BAR_WRAPPER_CLASSNAME`. The hero composition keeps its `rounded-xl`, `shadow-lg`, and `bg-popover` overrides unchanged; the fixed bar still carries only the focus swap. Herald is unaffected — its `JDInput` does not pass these wrapper classNames, so its SmartPromptInput keeps the vanilla `focus-within:ring-ring` chrome (still box-shadow-based, still technically clipped by `overflow-hidden`, but a Herald-side decision out of scope for this commit).

## Previous sub-session — Jun 27, 2026

PR #207 six focused fixes. Branch `task/vada-production-v1/tool-badges`; no new PR, additive commits on the existing one.

**Fix 6 — Morphing submit button never appeared while typing (`onTextChange`).**

User report: typing into the hero input did nothing — no button morphed in, the layout never transitioned to the active state. Root cause traced from the symptom backwards through three layers:

1. `MorphingSubmitButton` returns `null` when `!hasQuestion` (Gemini empty state by design, Fix 12 of the prior session).
2. `hasQuestion = !!form.question.trim()` reads from `useDeliberateForm`'s `question` state.
3. `SmartPromptInput` is uncontrolled — the form's `handleSmartSubmit` calls `form.setQuestion(text)` only on submit. So while the user types, `form.question === ''`, `hasQuestion === false`, the slot stays `null`, and `isActive` (which mirrors `hasQuestion`) stays false. The layout never advances out of the hero.

Fix is additive and minimal: a new optional `onTextChange?: (text: string) => void` prop on `SmartPromptInput`. Wired through to `PromptInputTextarea` in the vendor, where it composes with the existing `onChange` (both the controller branch and the uncontrolled branch) and fires with `e.currentTarget.value` on every change. The textarea stays uncontrolled — we never read `value` back. The consumer mirrors the typed text into its own state purely as an observer.

Vāda passes `onTextChange={form.setQuestion}` at both call sites (hero + fixed bar). Herald passes nothing — its `JDInput` is byte-identical, confirmed with `git diff apps/herald-ai` (empty). `setQuestion` from `useState` is referentially stable so no infinite-render risk.

The existing submit path is preserved by construction: `handleSmartSubmit(text, files)` receives the explicit `text` from the vendor and calls `form.handleStartWithText(text)`, which routes through `handleStartImplRef.current(overrideQuestion)`. The ref-based handler reads `overrideQuestion ?? question` — explicit text wins, no race against the last `onTextChange` flush, and the stale-closure guard (re-reading `getReviewerConfig` + `validateKeysForConfig` from localStorage inside `dispatchRef.current`) is untouched.

Mental walkthrough — every transition:
- Empty: `form.question = ''` → `hasQuestion = false` → button = `null` → `isActive = false` → hero layout.
- Type `'h'`: vendor fires `onChange` → composed handler calls `onTextChange('h')` → `form.setQuestion('h')` → re-render → `hasQuestion = true` → `MorphingSubmitButton` renders → `isActive = true` → unmount hero, mount fixed-bar layout.
- Click button on invalid config: opens `ReviewerConfigModal` (button is `type='button'`, `onClick = openReviewerModal`).
- Cmd+Enter with text + invalid config: vendor textarea handler calls `form.requestSubmit()` → form's `onSubmit` fires `handleSmartSubmit` → `handleStartWithText(text)` → `handleStartImplRef.current` runs the spec check → opens modal. Same end state as the button click.
- Delete back to empty: `onTextChange('')` → `setQuestion('')` → `hasQuestion = false` → `isActive = false` → fixed bar unmounts, hero remounts.

Herald is unaffected: `JDInput.tsx` passes no `onTextChange`, both the vendor's composed `onChange` and the consumer's downstream behavior are no-ops when the callback is undefined. Byte-identical to before — confirmed by `git diff apps/herald-ai` returning empty.



**Fix 1 — Bulletproof multi-line oscillation in `SmartPromptInput`.**

Two prior attempts (lineHeight `'normal'` fallback in `694fd4e2`, then deadband hysteresis at 1.1× / 1.5× in `c63f9050`) failed. The user reported persistent flapping: typing characters flipped 2 lines → 1 line → 2 lines → 1 line continuously. The deadband approach did not work because the layout's textarea width depends on `inlineMode` which depends on `isMultiLine`: inline mode is narrower (actions cluster eats horizontal space), footer mode is full width. So the same text that wraps at narrow width fits on one line at full width — and the contentHeight measurement crosses both the enter and exit thresholds across that swap. A wider deadband would only delay the oscillation.

Fix in `packages/ui/smart-prompt-input/smart-prompt-input.tsx::remeasure`: replace the dual-threshold with a one-way latch.

  ENTER (inline → multi-line): `contentHeight > lineHeight * 1.5` (≥ 2 visible lines)
  EXIT (multi-line → inline): `textarea.value.trim().length === 0` (user cleared the input)

Emptiness is invariant under width changes by construction — the layout's width swap cannot trip the latch back, because the swap does not change whether the user's typed text is empty. The user clears, the latch resets, they type again starting in inline mode. Mental walkthrough verified for every transition (empty → 1 char → wrap → more text → delete back to 1 char → empty → type again); no oscillation path exists.

Herald is unaffected: `hasActions = false` short-circuits the layout effect and `remeasure` is only wired into `onInput` inside the `hasActions` branch, so `JDInput` never measures or latches.

**Fix 2 — Modal layout: selectors as standard form rows, not centered.**

User screenshot showed the Configure modal's model-picker triggers floating visually centered on the column rather than aligned as form rows. Each slot was rendered as a stacked label-above-input pair (`flex flex-col gap-1.5`), and ModelPicker's trigger has its own min-width — at the dialog's `max-w-md` width the trigger sat in the middle of the column. The label sat above on the left; the gap between them read as "the selector is floating" rather than "this is a form".

Fix in `ReviewerConfigModal.tsx`: replace the stacked layout with a two-column CSS grid (`grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3`). Each agent row uses `<div className='contents'>` so its label and selector become direct grid children — the labels' column auto-sizes to the longest label, the selectors' column is `1fr` and stretches to the right edge of the dialog body. Selectors now align consistently down the right side; labels align consistently on the left. Reads as a normal form (label-left, control-right) rather than as floating selectors.

**Fix 3 — Smart-prompt-input wrapper surface elevation.**

User report: "I almost do not see the input." Root cause: the vendored `InputGroup` uses `bg-card` for the input surface, and in Vāda's current theme `--card` is close enough to `--background` that the input does not read as a distinct surface — no visible edge between the input chrome and the page canvas.

Fix in `DeliberateSection.tsx::HERO_WRAPPER_CLASSNAME`: add `[&>form>div]:bg-popover` to the existing wrapper className. Per the `ui-theme-tokens` role doctrine, `popover` is the "floating object" token reserved for transient surfaces — themes can give it stronger separation from canvas than `card` (the doctrine literally says: "Same idea as `card` but reserved for floating/temporary surfaces so themes can give them stronger separation"). The hero input is the only interactive surface on an otherwise empty page; treating it as a floating object rather than a card matches its visual role.

Consistency with the dropdown: `TeamPicker.tsx` line 39 already uses `bg-popover` on its dropdown content. So the trigger surface and the open dropdown sit on the same elevation tier — visually coherent. The fixed bottom bar (active-state input) is NOT elevated to `bg-popover` because it already has its own page-level chrome (`border-t border-border bg-background/95 backdrop-blur-md`) around the SmartPromptInput; no separate inner elevation needed.

Herald is unaffected: only Vāda passes `HERO_WRAPPER_CLASSNAME`.

**Fix 4 — Dropdown hover: text color, not background.**

User feedback: on hover of a team item, the user wants the text color to change instead of the background fill. Investigation: the `bg-accent` on hover comes from the installed `DropdownMenuItem` (`packages/ui/libraries/basic/installed/dropdown-menu.tsx` line 59 ships `focus:bg-accent focus:text-accent-foreground` — Radix sets `focus` on the highlighted item). The installed component is NOT modified (stop condition: would change every dropdown in every product).

Fix at the call site in `TeamPicker.tsx`: neutralize the installed component's hover at the call site by passing `focus:bg-transparent focus:text-accent` for non-selected items. tailwind-merge resolves the conflicts deterministically — `focus:bg-transparent` wins over `focus:bg-accent` (same `background-color` family on the same variant), and `focus:text-accent` wins over `focus:text-accent-foreground` (same `color` family). The subtitle span uses `group-focus:text-accent/80` to follow the same rule. The selected state (commitment, persistent) keeps `bg-accent text-accent-foreground` because the doctrine reserves background fills for selected/active states; text-only accent is for transient hover.

Result: on hover, text shifts to accent color; background stays the dropdown's `bg-popover`. Selected item still reads as `bg-accent` filled. No installed component touched.

**Fix 5 — UI rule violations introduced by PR #207.**

Confirmed `Heading` + `Text` exist in `@atta/ui/shared` (`packages/ui/libraries/shared/components/index.ts` lines 2–3). Confirmed `Card`, `CardContent`, `CardHeader` exist in `@atta/ui/components/card` (line 8 of basic library).

Replaced:

- `DeliberateSection.tsx`: 1 new `<h1>` (line 183) → `<Heading level={1} size='3xl' className='font-serif font-normal text-foreground'>`. `font-normal` overrides Heading's baked `font-bold` so the visual is byte-identical to the previous raw `<h1>` (which had no bold).
- `CouncilFeed.tsx`: 3 hand-rolled card surfaces → `<Card>` + `<CardHeader>` + `<CardContent>`:
  - `AnswerColumn` (was `<article>` with `bg-card/40 p-4`) — Card with `gap-4 bg-card/40 p-4 py-4` override (tailwind-merge drops Card's `py-6` and `bg-card`/`[background:var(--gradient-card),var(--card)]` when explicit `p-4` + `bg-card/40` are passed).
  - `SynthesisPanel` (was `<section>` with `bg-card p-5`) — Card with `gap-5 p-5 py-5` override (keeps default `bg-card` with gradient overlay; the Synthesis panel is the conclusion section, full elevation is the design intent).
  - `Your Question` block (was `<div>` with `bg-card p-4`) — Card with `mb-8 gap-2 p-4 py-4` override.
- `CouncilFeed.tsx`: 3 raw `<p>` tags → `<Text as='p' size='...'>`:
  - "Thinking… / Waiting to answer…" (`AnswerColumn`).
  - "Synthesizing the council… / Waiting for all answers…" (`SynthesisPanel`).
  - The question text inside the "Your Question" card.
  - The `synthesis.bottomLine` `<p>` is also converted to Text.

Out of scope (audit-flagged but not introduced in this PR — left for separate cleanup):

- `tsconfig` library resolution drift across all four apps (Claim 1 in previous session) — system-wide.
- Pre-existing raw HTML in `TeamSummary`, `DeliberationFeed`, `BenchmarkReport`, etc.
- `--warning-foreground` undefined token in `MockModeBanner` + `DeliberationFeed`.

**Verification.** `bun run typecheck` + `bun run check` pass. Herald byte-identity confirmed: `SmartPromptInput` changes are gated on `hasActions` (Herald passes none); `HERO_WRAPPER_CLASSNAME` / `FIXED_BAR_WRAPPER_CLASSNAME` are Vāda-only call-site classNames; `TeamPicker` is Vāda-only.

## Previous session — Jun 27, 2026

PR #207 morphing button bug + external audit verification. Branch `task/vada-production-v1/tool-badges`; no new PR, one additive commit on the existing one.

**Fix 12 — Morphing button rendered Configure on empty input.**

User report: with the team fully configured (Reviewers), clicking the morphing button on an empty input opened the Configure modal — a nonsensical action because the team is already configured.

Root cause: the previous `canStart` predicate (`!!question.trim() && remainingToday > 0 && !loading && (hasEditableAgents ? hasValidReviewerConfig : hasKeysForNonEditableSpec)`) mixed two distinct concepts — "is there text to submit?" and "is the team ready to receive a submission?" The morphing button used `canStart` to choose between Submit (true) and Configure (false). With empty text, `canStart` was false → rendered as Configure → clicking opened the modal even when config was valid.

Fix in `useDeliberateForm.ts`: split the predicates. `hasQuestion = !!question.trim()` is a pure input-state signal; `isConfigValid = hasEditableAgents ? hasValidReviewerConfig : hasKeysForNonEditableSpec` is a pure team/keys signal. `canStart` keeps the composite meaning (`hasQuestion && remainingToday > 0 && !loading && isConfigValid`) so the bottom-bar "Deliberate" CTA and the dispatch handlers are unaffected. The morphing button now consumes `hasQuestion` + `isConfigValid` directly.

Fix in `DeliberateSection.tsx`: `MorphingSubmitButton` returns `null` when `!hasQuestion` (Gemini-style empty state — no button visible, the placeholder invites the user to type). When `hasQuestion`, it always renders, and `type` / `aria-label` / `onClick` flip based on `isConfigValid` (submit vs configure modal). Decided over a disabled button because disabled buttons still attract focus and read as "this is available"; a clean empty submit area communicates "compose first" more clearly. `isActive` (the hero-vs-active-state layout switch) is unified with `hasQuestion` so the two render conditions can never disagree.

Cmd+Enter coherence: the vendored textarea handler in `smart-prompt-input/vendor/prompt-input.tsx` calls `form.requestSubmit()` regardless of what's in the submit slot. With `hasQuestion && !isConfigValid`, the form's `onSubmit` fires `handleStartWithText` which routes through `handleStartImplRef.current`. Previously that function did `if (!effectiveCanStart) return` — silent no-op when config was invalid. Now it short-circuits only on quota/loading/empty input, then runs the spec check that opens the modal for editable specs with missing/invalid config. So Cmd+Enter lands in the same place as the visible button click in every state.

**Audit verification (separate audit reported 4 claims against PR #207).**

Verified each claim against the code and against `.claude/skills/ui-library-system/SKILL.md` + `.claude/skills/ui-components/SKILL.md` + `.claude/skills/ui-theme-tokens/SKILL.md`. Recommendation per claim is in the report; nothing pre-existing was changed in this commit (scope guard: PR #207 is the deliberate UX / Council results PR, not a Vāda code-quality sweep).

- **Claim 1 — `tsconfig.json` path map (`@atta/ui` resolves to basic, not animate).** **TRUE + PRE-EXISTING + system-wide.** `apps/vada-ai/web/tsconfig.json` aliases `@atta/ui/components` only — NOT root `@atta/ui`. So `import { Button } from '@atta/ui'` falls through `packages/ui/package.json` exports `"." → "./libraries/basic/components/index.ts"`. Verified: `libraries/animate/installed/button.tsx` has `motion.button` from framer-motion; `libraries/basic/installed/button.tsx` does not. The intent (as commented in `DeliberateSection.tsx`) is "import from `@atta/ui` which the build-time generator resolves to the active library" — but the generator only writes `generated/vada/components.ts`, which is reached via `@atta/ui/components`, not `@atta/ui` root. The ui-library-system SKILL "Pattern 1" example shows `@atta/ui` (root) being aliased; the actual codebase aliases `@atta/ui/components` instead. This pattern is identical across all four apps (Herald, Atta, Vitakka, Vada) — a system-wide drift. **Stop condition triggered.** A theme/library resolution change has app-wide blast radius (would change which Button/Card/Badge variant renders in every product). Flag prominently for a separate PR with explicit visual review per product; do NOT fix in PR #207.

- **Claim 2 — Raw HTML typography (`<h1>`, `<h2>`, `<p>`) violates UI rules.** **TRUE + MOSTLY PRE-EXISTING.** `Heading` and `Text` exist in `@atta/ui/shared` (verified `packages/ui/libraries/shared/components/index.ts` line 2 + 3). Per `ui-components` SKILL RULE 1, raw `<h1>/<h2>/<p>` are forbidden when a component equivalent exists. Vāda uses them inconsistently: settings/sessions/mcp pages do use `Heading` / `Text` (verified `import { Heading, Text } from '@atta/ui/shared'`), but deliberate/teams/deliberation pages use raw HTML. PR #207 introduces 1 new raw `<h1>` (`DeliberateSection.tsx` line 167 — the hero heading "What are you wrestling with?") and multiple raw `<p>` in the new `CouncilFeed.tsx` (lines 137, 202, 207, 286). The widespread pre-existing raw HTML in `TeamSummary`, `DeliberationFeed`, `BenchmarkReport`, etc. predates PR #207. **Recommendation:** out of scope for PR #207 — flag for a Vāda code-quality cleanup PR that converts the deliberate / teams / deliberation surfaces to `Heading` / `Text` consistently.

- **Claim 3 — Hand-rolled cards / badges.** **TRUE + introduced by PR #207 (CouncilFeed) + widespread pre-existing elsewhere.** `CouncilFeed.tsx` (new file in PR #207) has three hand-rolled card surfaces: `<div className='mb-8 rounded-xl border border-border bg-card p-4'>` (line 282 — Your Question card), `<article className='… rounded-xl border border-border bg-card/40 p-4'>` (line 109), `<section className='… rounded-xl border border-border bg-card p-5'>` (line 159). Should be `<Card>` from `@atta/ui` per `ui-components` SKILL RULE 1. Pre-existing `BenchmarkReport.tsx` already has the same pattern in ~10 places. **Recommendation:** out of scope — the cleanup should hit `BenchmarkReport` + `CouncilFeed` together in a follow-up PR so the visual treatment stays consistent.

- **Claim 4 — `text-warning-foreground` undefined.** **TRUE + PRE-EXISTING.** Verified `packages/ui/styles/globals.css` defines `--color-warning: var(--warning)` (line 32) but NO `--warning-foreground`. The `ui-theme-tokens` SKILL explicitly confirms: "`success-foreground` and `warning-foreground` do not exist." Two consumers exist: `MockModeBanner.tsx` (created in commit `730adec3` "Feat: /trust page, mock-mode banner, CSP doc note" — on main pre-PR) and `DeliberationFeed.tsx` lines 115/116 (blame: `40bb25162` on main — pre-PR). The class falls through to no color. **Recommendation:** out of scope — fix by either adding the token to `globals.css` + theme schema + `NextWebShell` (per the skill's "If a Token Is Missing" procedure) OR replacing both call sites with `text-warning` (text-on-canvas) + `bg-warning/10` patterns per the doctrine's "status as soft fill" pattern. Either approach is one cleanup PR, ~2 lines per file.

**What got fixed in this commit:** Morphing button predicate split + Cmd+Enter coherence + `MorphingSubmitButton` renders `null` on empty input.

**What was flagged for separate work:**
- `tsconfig` library resolution drift across all four apps (Claim 1) — needs system-wide PR with per-product visual review.
- Raw HTML typography in deliberate / teams / deliberation surfaces (Claim 2) — Vāda code-quality cleanup PR.
- Hand-rolled cards in `BenchmarkReport` + `CouncilFeed` (Claim 3) — same cleanup PR as above or its own.
- `text-warning-foreground` undefined token (Claim 4) — one-line cleanup PR (add token OR rewrite call sites).

No stop conditions triggered for the morphing-button fix itself. The `tsconfig` claim DID trigger the "app-wide blast radius" stop — flagged, not fixed. `bun run typecheck` + `bun run check` pass.

## Previous session — Jun 27, 2026

PR #207 polish — five visual / UX fixes on the deliberate hero input + Configure modal. Branch `task/vada-production-v1/tool-badges`; no new PR, additive commits on the existing one.

**Fix 1 — Seamless inner textarea (root cause of the "double border" report).**

After Phase 1's DI refactor (`809970db`), the consuming app injects its `@atta/ui` `Textarea` into `SmartPromptInput`. Vāda uses the `animate` library which re-exports the `basic/installed/textarea.tsx` shadcn variant; that component brings its own `border border-input`, `rounded-lg`, `dark:bg-input/30` tint, `focus-visible:border-ring focus-visible:ring-3`, native resize handle, and `min-h-16` baseline. Inside `SmartPromptInput`'s `InputGroup` chrome those defaults produce a textarea-inside-a-container look and an inner focus ring on top of the outer `focus-within:ring-1`.

Fix is call-site only (no `@atta/ui` Textarea defaults touched — that would propagate to every consumer of `<Textarea>` everywhere). `DeliberateSection.tsx` now defines `HERO_TEXTAREA_CLASSNAME` (`min-h-0 border-0 rounded-none bg-transparent dark:bg-transparent focus-visible:border-transparent focus-visible:ring-0 resize-none`) and passes it via `textareaClassName`. tailwind-merge resolves the conflicts (`border-0` wins over `border`, `rounded-none` over `rounded-lg`, `min-h-0` over both the vendor's `min-h-16` and the injected component's `min-h-16`, `focus-visible:ring-0` over `focus-visible:ring-3`). Applied at both Vāda hero sites (empty-state centered, active-state fixed bottom bar). Herald's `JDInput` does NOT pass `textareaClassName`, so its visible chrome is byte-identical to before.

**Fix 2 — Textarea growth restored (same root, no separate fix).**

The "fixed at one line" symptom and the inner border are the same bug surfaced twice. Both the vendor's wrapper and the injected `Textarea` keep `field-sizing-content max-h-40 overflow-y-auto`. With `min-h-0` overriding the two `min-h-16` baselines, the textarea collapses to 1 line when empty and grows by `field-sizing-content` up to `max-h-40` (~7 lines at `text-sm`), then scrolls. No JS auto-resize fallback was needed — `field-sizing-content` is supported on the injected `<textarea>` element and only required the `min-h-*` baseline to be defeated.

**Fix 3 — Multi-line "divider" is the textarea bottom border (same root again).**

The horizontal line that appeared above the footer row when the textarea wrapped was the bottom edge of the injected Textarea's own `border border-input` — not a footer divider in `SmartPromptInput`. The wrapper's `InputGroupAddon` carries no `border-t` in the current vendor (verified). With Fix 1 stripping the inner textarea border, the divider is gone.

**Fix 4 — Team identity inside `ReviewerConfigModal`.**

Added a team-identity header at the top of the modal: `spec.displayName` (font-serif, lg) + `spec.description` (text-muted-foreground). No prop-shape change — the modal already accepts a full `Flow`. The existing "Configure models" title is now demoted to a sub-section heading (font-serif, base) so the team identity is the visual anchor.

**Fix 5 — "View team" moved into the modal.**

Removed the standalone "View team ↗" link that sat below the empty-state input — pulled `NextLink` + `ArrowUpRight` out of `DeliberateSection.tsx`. Added an equivalent link inside `ReviewerConfigModal.tsx` next to the team identity header, routed to `/teams/${spec.id}`. Single navigation path to the team detail page, anchored to the place where you're already thinking about that specific team.

**Fix 6 — Multi-line detection in `SmartPromptInput` was frozen on `lineHeight: normal`.**

User report: the hero textarea grew correctly when text wrapped, but the actions row (TeamPicker + Configure/Submit) stayed glued to the right of the textarea instead of dropping below into the footer once a second line appeared. The growth itself worked — `field-sizing-content` + the `min-h-0` override from Fix 1 had the textarea expanding line-by-line up to `max-h-40` — but `inlineMode = hasActions && !isMultiLine && attachmentCount === 0` was stuck on `isMultiLine = false`.

Root cause: shadcn's `<textarea>` primitive (`packages/ui/libraries/basic/installed/textarea.tsx`) sets no explicit `line-height`, so `getComputedStyle(el).lineHeight` returns the literal string `'normal'`. The previous `remeasure()` did `Number.parseFloat(styles.lineHeight)` → `NaN`, then `if (!Number.isFinite(lineHeight)) return` — so the function bailed without ever calling `setIsMultiLine(true)`. The growth was real; the detection threshold simply never fired. Suspect #2 from the diagnostic list (lineHeight resolves to `'normal'` instead of a px value), not the padding/border drift suspect #1.

Fix in `packages/ui/smart-prompt-input/smart-prompt-input.tsx`: when computed style reports `'normal'` (or an empty string), fall back to `fontSize * 1.2` — the browser default that the rendered line actually uses. Then compare *content height* (`scrollHeight - paddingTop - paddingBottom - borderTop - borderBottom`) against `lineHeight * 1.5`. 1.5x is the unambiguous "more than 1 line" threshold: a single line lands at ~1.0x with sub-pixel slack; a second visible line lands at ~2.0x. Independent of any padding / border / `min-h-*` override the consuming app passes through `textareaClassName`, so Vāda's `HERO_TEXTAREA_CLASSNAME` (which strips border and forces `min-h-0`) and any future override surface the same way.

Herald's `JDInput` passes no `actions` prop, so `hasActions = false`, the `useLayoutEffect` early-returns, the `inputRowRef` branch never renders, and `remeasure` is never wired to a real `onInput`. The detection function exists but never runs for Herald — zero behavior change there. Verified by reading `apps/herald-ai/web/src/components/envoy/JDInput.tsx`: no `actions=` on either `SmartPromptInput` site.

**Fix 7 — Unify the morphing button visual to a single icon-only ArrowUp.**

Previous shape (commit `56c70a66`) had two visually distinct states for `MorphingSubmitButton`: when `canStart=true` it rendered a filled icon button (`variant='default' size='icon'`, ArrowUp); when `canStart=false` it rendered an outline text button with the word "Configure". That communicates validity by literally morphing copy, but it also makes the inline row's right cluster jump between an icon-shaped pill and a wider word-pill on every render where reviewer config changes — and it makes the affordance for "I clicked but nothing happened" be a small outline pill rather than the prominent CTA the user is used to.

New shape: single visual, identical in both states — `variant='default' size='icon'` filled circular ArrowUp button. Only `type`, `onClick`, and `aria-label` differ. When `canStart=true` the button is `type='submit'` so the vendored textarea handler (`form?.querySelector('button[type="submit"]')`) finds it for Cmd+Enter and the form `onSubmit` fires. When `canStart=false` the button is `type='button'` and clicking it opens the reviewer modal directly. Cmd+Enter still routes through `handleSmartSubmit → handleStartWithText` (no `type='submit'` to find means `form?.querySelector` returns null and the keyboard handler bails before `requestSubmit()` — but `handleStartWithText` re-validates on every entry path anyway and opens the modal when the config is missing, matching the visible button's behavior). `aria-label` flips between `'Submit deliberation'` and `'Configure team'` so screen readers convey intent without the visual changing.

**Fix 8 — Vertical alignment in `SmartPromptInput` inline mode.**

The hero textarea has `py-2` (~36px tall on a single line of `text-sm`), but the actions cluster has `flex … items-center px-2 py-1.5` wrapping a `size='icon'` button (h-9, ≈36px) plus padding — total cluster height ≈ 48px. The inline row used `flex flex-row items-end`, so the cluster's bottom aligned with the textarea's bottom — the icon centered within its 48px container floated above the textarea's text baseline, while the textarea's single line sat at the TOP of the row (because the textarea was the shorter element). Visually: placeholder at top, icon in the middle.

Fix: change the inline row to `items-center`. Centers the textarea's first line with the icon button's geometric center on the same horizontal axis. Once `isMultiLine` flips, the actions+submit drop into the footer row (`inlineMode = false`) so the inline alignment choice only ever applies to the single-line case where centering is the right call. `items-center` does not affect multi-line behavior — by then the textarea isn't even sharing the row with the cluster.

**Fix 9 — Removed the hero subtitle paragraph.**

The empty-state hero rendered `<h1>What are you wrestling with?</h1>` plus a `<p className='font-sans text-sm text-muted-foreground'>` reading "Pose a decision, question, or problem. A team of AI agents will deliberate on it and return a convergent view." The paragraph editorialized the heading without adding new affordance — the input below it is self-explanatory. Removed the `<p>` and dropped the `space-y-2` from the heading wrapper. Hero is now just heading + input.

**Fix 10 — Hysteresis on `isMultiLine` to stop layout oscillation.**

User report: as they typed past the inline-width wrap point, the input flipped 2 lines → 1 line → 2 lines → 1 line continuously. Single-threshold detection (enter+exit both at `lineHeight * 1.5`) creates an unstable feedback loop because the textarea's available width depends on `inlineMode`, which depends on `isMultiLine`:

- Inline mode = textarea width is *narrower* (actions + submit eat horizontal space on the right).
- Content wraps to 2 lines at that narrow width → `isMultiLine = true` → footer mode.
- Footer mode = textarea width is *full* (no inline cluster).
- Same content fits on 1 line at full width → `contentHeight < threshold` → `isMultiLine = false` → inline mode.
- Repeat forever on every `onInput`.

Fix in `packages/ui/smart-prompt-input/smart-prompt-input.tsx::remeasure`: separate ENTER and EXIT thresholds with a deadband, and select which to use based on the previous `isMultiLine` value via the functional-setState form.

```ts
const enterThreshold = lineHeight * 1.5
const exitThreshold  = lineHeight * 1.1
setIsMultiLine((prev) =>
  prev
    ? contentHeight >= exitThreshold   // currently multi-line → stay until content shrinks well below one line
    : contentHeight >  enterThreshold  // currently inline → enter at the 2-line threshold
)
```

Why these numbers: a single visual line at full width is ≈ `lineHeight * 1.0` with sub-pixel rounding slack. A second visible line lands at ≈ `lineHeight * 2.0`. The ENTER threshold at 1.5x cleanly separates 1-line from 2-line. The EXIT threshold at 1.1x means we only flip back to inline when the content has shrunk to a single line WITH room to spare — content that wraps to 2 lines at inline (narrow) width will, at footer (full) width, still come in well above 1.1x because the same characters fit on a single line at the wider measurement but the single line still has some height. Crucially this lets us interpret the *post-flip* measurement: after entering multi-line, the textarea expands to full width; if the user keeps typing the height stays > 1.1x and we stay multi-line; if the user deletes back to a truly short string the height drops below 1.1x and we exit. No oscillation.

Measurement-pattern note: this is the second hysteresis bug we've hit in this input (the first being detection-frozen-on-`'normal'` from Fix 6). Both surface because the input is doing layout-by-measurement *and* the measured value depends on layout state. The invariant for any future remeasure change: if `contentHeight` (or any measured value) depends on `isMultiLine`, the threshold function MUST consume the previous state, not just the new measurement.

Herald's `JDInput` still passes no `actions`, so the `inputRowRef` branch never renders, `remeasure` is never wired to `onInput`, and the new functional-setState form is never reached. Zero behavior change for Herald.

No stop condition hit. Herald `JDInput` unchanged. `bun run typecheck --force && bun run check` pass. `verify-docs --pr` pass.

**Fix 11 — Full UI-rules audit of PR #207 + purple-focus root cause + Configure modal cleanup + compound-component refactor.**

User reported the smart-prompt-input wrapper rendering purple on focus and the Configure modal showing inconsistent spacing between the title and the footer buttons. Required a complete UI-rules audit of every change introduced by PR #207 before any fix.

**Audit findings (PR #207 vs `origin/main`, all UI files).**

- `packages/ui/libraries/*/installed/*` — **no modifications** (governance check 1: passed). The PR only touches `packages/ui/smart-prompt-input/`, `packages/ui/canvas/aia-{agent,sphere}.tsx`, and app-level files.
- Hardcoded palette / hex / oklch / hsl / `text-white` / `bg-black` — **zero** violations in the diff. Searched via `git diff origin/main...HEAD -- packages/ui apps/vada-ai apps/herald-ai | grep -E "text-(red|green|blue|yellow|amber|purple|pink|indigo|violet|fuchsia|cyan|teal|emerald|lime|orange|rose|sky|stone|zinc|slate|neutral|gray)-\d|bg-\[#|text-\[#|#[a-fA-F0-9]{6}|oklch\(|hsl\(|text-white|bg-black"` — empty.
- New inline `style={{}}` with color value — **zero**. The only new inline style is `style={{ position: 'absolute', bottom: '-4px', left: '-4px', zIndex: 2, display: 'inline-flex' }}` in `packages/ui/canvas/aia-sphere.tsx` for the new `badgeLeft` slot; mirrors the existing `badge` slot one line above (`right: '-4px'`). Positional values only, no color.
- `--accent` / `--accent-foreground` misuse — none. All accent usages are doctrine-correct: `hover:bg-accent text-accent-foreground` on dropdown items, `hover:text-accent` on text links, `bg-accent text-accent-foreground` on the dropdown's `data-[highlighted]` state. Status indicator `bg-accent` on a 1.5px pulsing dot is appropriate per the theme-token role doctrine ("accent → reactive / special").
- Compound-component usage — `AlertDialog`, `Card{Header,Content,Footer}` not touched in this PR. `Dialog` was used WITHOUT its compound parts in `ReviewerConfigModal` — flagged here, fixed below.
- Vendored ai-elements code in `packages/ui/smart-prompt-input/vendor/*` — fair game (not `libraries/*/installed/*`). Pruned cleanly to drop unused Command / Select / HoverCard / Tabs / Spinner surfaces and converted to dependency injection via `SmartPromptComponentsProvider`. Graceful fallbacks for the undefined-on-first-render window mirror Herald's `JDInput` `Button ? <Button…> : <button>` pattern. Approved.

**File-by-file pass/fail:**

- `packages/ui/smart-prompt-input/smart-prompt-input.tsx` — PASS. Semantic tokens only, no inline color styles, no palette classes.
- `packages/ui/smart-prompt-input/vendor/prompt-input.tsx` — PASS. Cleanly pruned. Native fallbacks use `hover:bg-accent hover:text-accent-foreground` per doctrine.
- `packages/ui/smart-prompt-input/vendor/components-context.tsx` — PASS. Pure DI plumbing, no styling.
- `packages/ui/smart-prompt-input/vendor/ui/input-group.tsx` — pre-existing `focus-within:ring-1 focus-within:ring-ring` on the InputGroup wrapper (line 10, NOT introduced by PR #207). Identified as the **purple focus-ring root cause** for Vāda.
- `packages/ui/canvas/aia-{agent,sphere}.tsx` — PASS. New `badgeLeft` / `toolBadge` props add a bottom-left overlay slot; inline style is positional (mirrors the existing `badge` slot).
- `apps/vada-ai/web/src/app/(main)/deliberate/components/DeliberateSection.tsx` — PASS at design level; modal modifier classes (`bg-card` override below) flagged at the modal file.
- `apps/vada-ai/web/src/app/(main)/deliberate/components/ReviewerConfigModal.tsx` — **FAIL** on two counts:
  - (a) `DialogContent` was overriding `bg-popover` with `bg-card`. Per the theme-token role doctrine `popover` is the correct surface for floating/transient containers (the canonical `DialogContent` from `packages/ui/libraries/basic/installed/dialog.tsx` uses `bg-popover text-popover-foreground`); `card` is reserved for non-floating object surfaces. Override removed.
  - (b) Hand-rolled `space-y-*` divs were used instead of `DialogHeader` / `DialogFooter` / `DialogDescription`. The compound components exist and were imported but unused. Refactored to use them; spacing is now governed by `DialogContent`'s `flex flex-col gap-4` and `DialogFooter`'s `mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end` — header and footer now share the same rhythm.
- `apps/vada-ai/web/src/app/(main)/deliberate/components/TeamPicker.tsx` — PASS. All tokens semantic. `outline` variant + `hover:text-accent-foreground` is slightly redundant (the variant already provides `hover:bg-accent/20`) but compatible.
- `apps/vada-ai/web/src/app/(main)/deliberate/components/TeamSummary.tsx` — PASS.
- `apps/vada-ai/web/src/app/(main)/deliberation/[id]/components/CouncilFeed.tsx` — PASS. `var(--vendor-*)` resolution via `resolveVendorColor` is the doctrine-correct way to apply vendor identity to canvas spheres (vendor tokens live in `apps/vada-ai/web/src/styles/globals.css`, not Tailwind palette).
- `apps/vada-ai/web/src/components/AgentToolIndicator.tsx` — PASS. `border-border bg-card text-muted-foreground` only.
- `apps/vada-ai/web/src/components/RouteAwareFooter.tsx` — PASS. No styling.
- `apps/vada-ai/web/src/components/agents/{VadaAgent,ModelOrProviderIcon}.tsx` — PASS. `var(--muted-foreground)` is the semantic fallback for unconfigured reviewer slots — correct.
- `apps/herald-ai/web/src/components/envoy/JDInput.tsx` — **PASS, byte-identity preserved.** Only the new `components={{ … }}` prop is passed to `SmartPromptInput`; Herald renders no `className` or `textareaClassName` override on the input, so Herald's visible chrome is byte-identical to the prior commit. The vendor's native fallback branches activate only when injected primitives are `undefined`, which doesn't happen at steady state.

**Fix — purple focus ring at the SmartPromptInput call sites.**

Root cause: `packages/ui/smart-prompt-input/vendor/ui/input-group.tsx` line 10 ships `focus-within:ring-1 focus-within:ring-ring` on the InputGroup `<div>`. In Vāda's theme `--ring` resolves to a magenta/purple-leaning value and reads as purple on the elevated input surface. NOT a new violation in PR #207; pre-existing vendored ai-elements styling.

Fix lives at the call site, not in globals.css or the vendor file (per the ui-theme-tokens skill — "choose a different token at the call site"). `DeliberateSection.tsx` now defines `NO_PURPLE_FOCUS_RING = '[&>form>div]:focus-within:ring-0'` and applies it via `className` on both Vāda call sites (`HERO_WRAPPER_CLASSNAME` = elevation + ring-off; `FIXED_BAR_WRAPPER_CLASSNAME` = ring-off only). The InputGroup keeps its calibrated `border-border` resting border. Herald passes no `className` to `SmartPromptInput`, so its canonical shadcn focus ring is unchanged — Vāda-only opt-out, no shared chrome touched.

No stop condition hit. The theme tokens in `globals.css` are not modified; the fix is a per-call-site visual choice.

**Fix — `ReviewerConfigModal` cleanup.**

- Removed the "Configure models" sub-section heading + its description ("Pick a model for each slot. All need unlocked API keys to run.") — it duplicated the modal title and added a second visual anchor next to the team identity. Modal now reads: title → selectors → footer.
- Modal title is now dynamic: `Configure {spec.displayName}` (replaces the hand-rolled `<h2>` team-identity header added in commit `f6836092`).
- Team description moved into the canonical `DialogDescription` slot inside `DialogHeader` (inherits `text-sm text-muted-foreground` from the primitive and gets `aria-describedby` association on the dialog automatically).
- "View team" link stays inside `DialogHeader`, below `DialogDescription`. Single navigation path out of the modal, anchored to the team identity.

**Fix — compound components via `Dialog{Header,Title,Description,Footer}`.**

Refactored `ReviewerConfigModal` to use the compound parts that already exist in `@atta/ui/components/dialog`:
- Header content lives in `<DialogHeader>` (gives `flex flex-col gap-1.5` automatically).
- Body content (model selectors) is one flex-col block; no hand-rolled spacing wrapper.
- Footer (`Save` + `Cancel` buttons) lives in `<DialogFooter>` (inherits `mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end` — same rhythm as the header, no margin hacks).
- `DialogContent` keeps only `w-full max-w-md`; the prior `bg-card p-6 space-y-6 border-border` overrides are dropped because the canonical compound already ships them (`bg-popover p-6 flex flex-col gap-4 rounded-lg border border-border shadow-lg`).

Result: the modal's title-to-footer spacing is now governed by the canonical `gap-4` between compound parts. No hand-rolled `pt-2` / `space-y-6` / margin hacks. Consistent rhythm.

No stop condition hit. The compound parts (`DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`) are exported by `packages/ui/libraries/basic/installed/dialog.tsx` and resolved via the `@atta/ui/components/*` package.json export.

## Previous session — Jun 27, 2026

PR #207 completion — Phases 1, 4, 5 of the deliberate UX + working-deliberations brief (vada-production-v1, `task/vada-production-v1/tool-badges`). Phases 2, 3 landed in the prior session (frontier-chat + morphing button + dropdown restyle). The acceptance test for PR #207 is: (1) clean frontier-grade input UX, and (2) deliberations actually run and render.

**Phase 1 — `SmartPromptInput` dependency injection (commit `809970db`).**

`packages/ui/smart-prompt-input/` previously hardcoded the `basic` library and vendored its own primitives, so it ignored the consuming app's library (per-user runtime library in Herald, build-time library in Vāda). Refactor: the shared composite resolves NO library; consumers inject.

- New `components` prop: `{ Textarea, Button, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem }`. Component renders injected primitives; deleted every `'../../libraries/basic/installed/*'` and `libraries/basic/components/*` import in the smart-input tree.
- Graceful fallback for the undefined-on-first-render window (mirrors `JDInput`'s `Button ? … : raw` pattern). Missing/loading primitive degrades to a native element rather than crashing — important for Herald's per-user library which resolves async via `useComponents()`.
- Vendor pruning: deleted `attachments.tsx`, `vendor/ui/hover-card.tsx`, `vendor/ui/spinner.tsx`, `vendor/ui/tooltip.tsx`. Remaining vendor surface: `prompt-input.tsx`, `components-context.tsx`, `vendor/ui/input-group.tsx`. Net diff: +319 / -847 lines.
- `Spinner` replaced with lucide `Loader2` in `PromptInputSubmit` — keeps a status indicator without adding `Spinner` to the contract.
- Vāda (`DeliberateSection.tsx`) injects from `@atta/ui` (build-time-resolved library). Herald (`JDInput.tsx`) injects from its existing `useComponents()` (per-user runtime library) — no provider change.
- **`.claude/skills/ui-library-system/SKILL.md` updated** with a "Cross-product composite components" section + injection contract + four-step rule. This closes the governance gap from PR #213 (the same step that was missed there).

**Phase 4 — Council results view (commit `64a833d8`).**

New purpose-built results view for `vada-council` and `vada-council-synthesis`. The existing rounds components (Sparring/crucible/war-room) are untouched.

- `CouncilFeed.tsx` (348 lines new) — N parallel answer columns (one per model) + optional synthesis panel.
- Each column uses a real `AIASphere` with an **EXPLICIT vendor color** via `resolveVendorColor(modelInfo?.modelId)` → `VENDORS[vendor].color` → `var(--vendor-*)` (from `apps/vada-ai/web/src/components/agents/vendors.ts`). The grey-sphere bug is fixed by construction: no `getAgentConfigByName` fallback (which returned the "strategist" generic config and produced grey spheres on Council).
- Per-column sphere props: `useId()` for unique IDs, `state={sphereState}` (`speaking` → `complete` derived from `useDeliberationScene`'s per-agent `msg.state`), `showMatrix={!isComplete}`, `alwaysRenderSpheres matchContentHeight` on the `AIACanvas` (scrolling page).
- Completion-fill streaming consumes existing SSE events via `useDeliberationScene` (rounds transcript flows through `agent_completed` events emitted by `useDeliberation.ts`). Each column flips thinking → answered independently as each model finishes. Token-by-token streaming is out of scope here (requires adapter V2 work — backlogged, not built).
- Synthesis panel reads the locked contract `{ agreements: string[], disagreements: string[], bottomLine: string }` and renders Agree / Disagree / Bottom line. Council synthesis does NOT route through the existing rounds `ConclusionPanel` (which is keyed to the Reviewers JSON shape).
- No rounds vocabulary, no "CONCLUSION / CLEAN" labels on the Council view.
- Per-spec routing in `app/(main)/deliberation/[id]/page.tsx`: `COUNCIL_SPEC_IDS = new Set(['vada-council', 'vada-council-synthesis'])` routes to `<CouncilFeed />`; other specs render the existing components unchanged.
- Footer suppression: `RouteAwareFooter.tsx` with `FOOTER_SUPPRESSED_PREFIXES = ['/deliberate', '/deliberation/']` — applied via Vāda's `(main)/layout.tsx`. Vāda-only. Herald's layout is untouched.

**Phase 5 — Docs gate (commit `0136cb08`).**

`verify-docs` on PR #207 was failing C2 decision-shape because legacy rows in the frozen archive carried `**Status:** Active` but no `**Type:**` field (the gate added Type as a required field after they were written). All 34 are foundational architectural decisions that predate the current type taxonomy → backfilled with `**Type:** 1` (irreversible — Principal must ratify). `verify-docs --pr` now passes against the PR body.

**Result.** PR #207 covers all six phases of the brief. Phases 2, 3 from prior session; Phases 1, 4, 5 from this session. Phase 6 = this docs note + push.

## Previous session — Jun 27, 2026

Frontier-chat hero layout + morphing Configure/Submit slot + dropdown restyle (vada-production-v1, PR #207, `task/vada-production-v1/tool-badges`).

**Commit 1 — `@atta/ui/smart-prompt-input`: `submitSlot` + `textareaClassName`.**
- New optional prop `submitSlot?: React.ReactNode` replaces the default `PromptInputSubmit` in BOTH inline and footer modes. When undefined the render is byte-identical to before — Herald's `JDInput` passes no new props and is unaffected.
- New optional prop `textareaClassName?: string` is merged onto the inner textarea AFTER vendor defaults so callers can defeat utilities like `min-h-16` via tailwind-merge (no vendor patch needed).
- Footer divider question: the vendored InputGroup uses `flex flex-col` with no border between textarea and footer — there is no shared "footer divider" class to opt out of. No `hideFooterDivider` prop introduced. Any further visual separation is a call-site decision (Vāda elevates the InputGroup with a child-selector `shadow-lg`).
- Skill update (mandatory): `.claude/skills/ui-library-system/SKILL.md` gains a new "Cross-product composite components" section documenting the SmartPromptInput contract (all props in a table, the Herald-compatible invariant, and the rule for adding any new slot). The library-contract validator does NOT cover composite components, so the skill section IS the contract.

**Commit 2 — Vāda hero: frontier-chat layout (`DeliberateSection.tsx`).**
- `actionsPosition` flipped from `'left'` to `'right'`. TeamPicker sits inline-right of the textarea on a single line and drops into the footer when the textarea wraps.
- CONFIGURE removed from the `actions` array — `actions` now carries only TeamPicker. CONFIGURE is morphed into the submit slot in Commit 3 so the form never shows both a disabled-submit AND a Configure button.
- Single-line root cause + fix: vendored `PromptInputTextarea` defaults to `min-h-16` (=4rem), which made `el.scrollHeight > singleLineHeight` true on first paint — `isMultiLine` registered true forever and `inlineMode` never engaged. Fix: pass `textareaClassName='min-h-0'` from the call site. `tailwind-merge` resolves `min-h-16` ↔ `min-h-0` in favor of the caller. No vendor file changes.
- Container surface lifted via a child-selector className `[&>form>div]:rounded-xl [&>form>div]:shadow-lg` on the outer wrapper. Keeps the Grok-like elevation local to the Vāda call site without leaking surface decisions into shared SmartPromptInput.

**Commit 3 — Morphing Configure ↔ Submit + dispatchRef fresh-read fix.**
- New `MorphingSubmitButton` (inline in `DeliberateSection.tsx`, passed to `SmartPromptInput.submitSlot`). When `form.canStart` is true → real submit (`type='submit'`, ArrowUp). When false → CONFIGURE outline button (`type='button'`) that opens the reviewer modal. Either-or, never both.
- Cmd+Enter: the vendored textarea handler calls `form.requestSubmit()` regardless of slot content. Routes through `handleSmartSubmit → handleStartWithText`, which re-validates and opens the modal when reviewer config is missing. So the keyboard path lands in the same place as the visible button — no silent submission of an invalid form, no separate handler.
- `dispatchRef.current` now re-reads `getReviewerConfig` from localStorage and re-runs `validateKeysForConfig` fresh, instead of trusting the render-closure `hasValidReviewerConfig` flag. This matters because `handleModalSave` writes the config and then calls `dispatchRef.current()` synchronously — that call uses the dispatchRef assigned during the PREVIOUS render, whose closure was computed BEFORE the localStorage write. The PR-body claim "dispatchRef.current re-validates internally using the just-persisted config" is now accurate.
- Hover doctrine on CONFIGURE: `hover:bg-accent/20` (from outline base) + `hover:text-accent-foreground` (call site). Never `hover:text-accent` — the May 23 bug.

**Commit 4 — Dropdown restyle + short labels + Council copy fix.**
- `TeamPicker.tsx` `DropdownMenuContent` switched to `bg-popover border-border shadow-lg max-h-[60vh] overflow-y-auto`. `bg-popover` is the floating-surface token (per `.claude/skills/ui-theme-tokens/SKILL.md` doctrine) — separates the menu from the page canvas. `max-h + overflow-y` keeps long spec catalogs scrollable.
- Trigger shows the SHORT label only (small pill). Open items show the full `display_name` + corrected subtitle.
- New `getSpecLabel` in `apps/vada-ai/web/src/lib/flow-helpers.ts` returns `{ short, subtitle }` per spec id. Explicit entries for the four current public specs (Council, Council +S, Reviewers, Reviewers +S); generic specs fall back to `displayName` with no subtitle.
- Council misnomer fix: `getFlowShapeLabel` returned "parallel reviewers" for EVERY brokered spec — wrong for Council (which is answer-a-question, not critique-a-draft). The dropdown subtitle now sources from `getSpecLabel.subtitle` so Council reads "3 models · parallel" instead. `getFlowShapeLabel` itself is left as-is (other callers may still rely on it); the spec-label map is the presentation surface.
- Label map is Vāda-local on purpose. Team identity stays in the YAML's `display_name` / `description` — `SPEC_LABELS` is presentation-only. A TODO comment in `flow-helpers.ts` notes the option to promote `short_name` onto the engine `Flow` type if other consumers grow.

**Herald byte-identity verification:** re-read `apps/herald-ai/web/src/components/envoy/JDInput.tsx` line 325 with the new SmartPromptInput. Herald passes no `actions`, `submitSlot`, or `textareaClassName` — falls through to `hasActions = false` branch, default footer with `PromptInputSubmit`. `renderSubmit()` returns the same `<PromptInputSubmit status={chatStatus} onStop={onStop}>{ctaLabel}</PromptInputSubmit>` JSX as the original inline code. Identical DOM tree.

**Stop conditions:** none hit.
- Commit 1: `submitSlot` is purely additive; Herald path unchanged. Divider not in shared code, so no `hideFooterDivider` prop introduced.
- Commit 2: single-line fix is a call-site `textareaClassName='min-h-0'` override — no vendor restructure.
- Commit 3: `dispatchRef` IS re-triggerable after a fresh read; the previous render-closure pattern was the bug. Fixed in-place.

## Previous session — Jun 26, 2026

Council teams added on PR #207 (vada-production-v1, branch `task/vada-production-v1/tool-badges`). Two new YAML specs landed under `packages/agents/vada-deliberation/yamls/`:

- `vada-council.yaml` — three independent answer slots (Gemini / GPT / Grok by default, any vendor-keyed model swappable per slot) answer the user's question in parallel. One round, `layout: parallel`, no synthesis, no draft. Each agent has `tools: [web_search]` and `classifier.mode: skip`.
- `vada-council-synthesis.yaml` — same three answer slots, plus a `role: synthesizer` agent in a second serial round that compares the three answers using the `{{#each allPreviousOutputs}}[{{this.agentName}}] {{this.content}}{{/each}}` template (the new pattern, not the broken `{{reviewerResponses}}` of the old one).

The distinction this introduces: Council is an **answer-a-question** team — there is no draft, the models reason from scratch in parallel. The existing Reviewers / Reviewers + Synthesis remain **critique-a-draft** teams — a primary AI has already produced a draft and reviewers attack it. Both shapes are useful; they answer different jobs.

Synthesis output contract (locked here for the future Council results view to consume):

```ts
{ agreements: string[], disagreements: string[], bottomLine: string }
```

Known limitation, intentionally deferred: the existing rounds UI's `ConclusionPanel` / synthesis parser is keyed to the Reviewers JSON shape (`{summary, agreements, divergences, recommendation, ...}`) and will not correctly render Council's `{agreements, disagreements, bottomLine}` output. Building the Council results view (columns + AIASphere/matrix + synthesis panel) is a separate task; do not retrofit the old rounds UI to handle both shapes.

Both YAMLs are auto-discovered by `listPublicSpecs()` (engine `catalog-loader.ts` enumerates the directory) — no registry edits required. Engine validation (70/70 tests) confirms both pass the v2 schema rules. `listPublicSpecs()` now returns 4 public specs: `vada-council, vada-council-synthesis, vada-reviewers, vada-reviewers-synthesis`.

---

## Previous session — Jun 23, 2026

`SmartPromptInput` gains `actionsPosition` prop + Vāda Deliberate hero moves TeamPicker + CONFIGURE to the LEFT and uses `variant='outline'` (vada-production-v1, PR #207, tool-badges branch).

**Commit — `@atta/ui/smart-prompt-input` + Vāda Deliberate hero:**
- `SmartPromptInput` gains new optional prop `actionsPosition?: 'left' | 'right'` (default `'right'`). Backwards-compatible: when not passed (Herald's `JDInput` case) the layout is byte-identical to before — Herald is unaffected.
- `'left'` placement, inline mode (single-line, no attachments): row becomes `[actions] [textarea ........] [submit]` — actions LEAD the row, submit stays rightmost.
- `'left'` placement, multi-line / attachments mode: footer becomes `[actions, ActionMenu, hint]` on the left + `[submit]` on the right. Previously actions sat next to submit on the right; now they lead the existing toolbar/hint group.
- Vāda hero (`DeliberateSection.tsx`): passes `actionsPosition='left'` to the empty-state `SmartPromptInput`. The `actions` payload (TeamPicker + conditional CONFIGURE) is unchanged in content and gating.
- CONFIGURE `Button` (in `DeliberateSection.tsx`): switched from `variant='ghost'` to `variant='outline'`. Hover-color override (`hover:text-accent-foreground`) preserved so the outline button's hover pair is canonical (`hover:bg-accent/20` from the base outline variant + `hover:text-accent-foreground` from the call site).
- `TeamPicker.tsx`: `DropdownMenuTrigger`'s `Button` switched from `variant='ghost'` to `variant='outline'`. Cleaned up the `hover:bg-transparent p-0` overrides that were specific to the ghost link-look — the outline button now uses default padding/border and a `font-mono text-[10px] uppercase tracking-widest` text styling consistent with CONFIGURE. Hover pair (`hover:bg-accent/20` from base + `hover:text-accent-foreground` from call site) follows the canonical doctrine.
- No new tokens introduced. All color choices stay on `background` / `accent` / `accent-foreground` / `muted-foreground` / `foreground` per `.claude/skills/ui-theme-tokens/SKILL.md`.

## Most recent session — Jun 23, 2026

Token discipline fix on Deliberate hero — TeamPicker dropdown description readability + CONFIGURE hover color (vada-production-v1, PR #207, tool-badges branch).

**Symptom:** Two visual bugs in the empty-state hero controls now living inside `SmartPromptInput`'s `actions` slot.
- TeamPicker dropdown: the per-team description line (`{count} agents · {shape}`) was illegible when its item was highlighted — `bg-accent` background under a hardcoded `text-muted-foreground` description gives near-zero contrast.
- CONFIGURE button: text turned red-ish on hover. Root cause: `Button variant='ghost'` applies `hover:bg-accent` (token: `--accent`). The call site added `hover:text-accent` — same token — making text and background land on the same color. In Vāda's amber-leaning theme this reads as a solid red-orange block. Doctrine violation: ghost-on-hover must pair `bg-accent` with `text-accent-foreground`, never `text-accent`.

**Fix — DeliberateSection.tsx (CONFIGURE button):**
- Swapped `hover:text-accent` for `hover:text-accent-foreground` on the CONFIGURE `Button`. Matches the canonical ghost hover pair documented in `.claude/skills/ui-theme-tokens/SKILL.md` (`bg-accent` always pairs with `text-accent-foreground`). No other classNames changed — `variant='ghost'` is correct for a small inline action.

**Fix — TeamPicker.tsx (dropdown item description):**
- Added `group` to each `DropdownMenuItem`, then on the description span used `group-data-[highlighted]:text-accent-foreground/80`. Default state stays `text-muted-foreground` for the canonical "quiet ink on popover" look; on Radix's `data-[highlighted]` (hover + keyboard nav), the description flips to `text-accent-foreground/80` so it stays readable on the `bg-accent` row.
- Fixed a paired-token bug while here: the selected-row className was `bg-accent` only — added `text-accent-foreground` so the title doesn't read on accent-on-accent for the user's current pick. Description on selected row uses `text-accent-foreground/80` to mirror the highlight state.

**What was already correct (verified):**
- TeamPicker uses canonical `@atta/ui` `DropdownMenu` + `DropdownMenuTrigger` + `DropdownMenuContent` + `DropdownMenuItem` from `@atta/ui/components` (the build-time resolved animate library). Trigger is `Button variant='ghost'` from the same library. No hand-rolled `<button>` or raw `<div>` lists.
- CONFIGURE is `@atta/ui` `Button variant='ghost' size='sm'` — not `destructive`, not raw HTML. The bug was purely a className token mispair at the call site.
- No `text-red-*`, no `bg-[#hex]`, no inline `style={{}}` introduced or present on either control.

## Most recent session — Jun 23, 2026

`SmartPromptInput` gains `actions` slot + Vāda Deliberate hero moves TeamPicker + CONFIGURE inside the input (vada-production-v1, PR #207, tool-badges branch).

**Commit 1 — `@atta/ui/smart-prompt-input` refactor (smart-prompt-input.tsx):**
- New optional prop `actions?: React.ReactNode` for Gemini-style action chips next to the submit button.
- Single-line state (and no attachments): `actions` render inline on the right of the textarea, immediately before submit; submit stays rightmost.
- Multi-line / attachments present: `actions` drop into the existing footer row, between any tools/hint and the submit button.
- Detection approach: measure the textarea's `scrollHeight` against computed `lineHeight + paddingTop + paddingBottom + 1px slack`, re-measured on every `onInput`. The textarea grows via `field-sizing-content`, so no `ResizeObserver` is needed; a 1px slack prevents sub-pixel jitter from flipping the layout.
- Textarea node is resolved via `querySelector('textarea[name="message"]')` from a wrapper `ref` — the vendored `PromptInputTextarea` is a plain function component without ref forwarding, and patching the vendor file would cost more than this targeted DOM query.
- Backwards-compatible default: when `actions` is not passed (Herald's case), the component renders the same DOM tree as before — same `PromptInputTextarea` placement, same footer with submit on the right, same attachment header, same full-width-CTA path. Herald's `JDInput` call site is unchanged and unaffected.

**Commit 2 — Vāda Deliberate hero uses the `actions` slot (DeliberateSection.tsx):**
- Removed the standalone `<div className='flex items-center justify-center gap-3'>` row that previously held `TeamPicker` + `CONFIGURE` + `View team`.
- `TeamPicker` and the conditional `CONFIGURE` button now live inside the `SmartPromptInput`'s `actions` prop. The same `selectedSpec?.agents.some(a => a.editable)` gate is preserved — CONFIGURE only renders for specs with editable agents.
- `View team` link kept as a small `<NextLink>` centered immediately below the input (separate concern from deliberation controls — navigates to `/teams/[slug]`).
- The hero heading and intro paragraph above the input are unchanged.
- Active-state input (the fixed-bottom bar when a question has been submitted) keeps its current shape with no `actions` — the team picker and CTA already live on the `TeamSummary` card above it.

## Most recent session — Jun 23, 2026

Hero configure-then-deliberate flow + post-save auto-dispatch + DeliberatePanel → TeamSummary swap (vada-production-v1, PR #207, tool-badges branch).

**Commit 1 — Hero CONFIGURE affordance (DeliberateSection.tsx):**
- Added CONFIGURE Button (ghost variant, font-mono) inline with the empty-state TeamPicker row.
- Rendered only when `selectedSpec?.agents.some(a => a.editable)` is true — hidden for non-editable specs.
- Calls `form.openReviewerModal()` on click.
- `ReviewerConfigModal` now mounts from the empty state (gated on `form.showReviewerModal`), wired to `form.handleModalSave` / `form.closeReviewerModal`. Previously the modal only mounted from the active state inside `DeliberatePanel`.

**Commit 2 — Post-save auto-dispatch (useDeliberateForm.ts):**
- `handleModalSave` previously stored config + closed modal. Now additionally dispatches via `dispatchRef.current()` if `questionRef.current.trim()` is non-empty after saving.
- Added `questionRef` (mirrors the existing `selectedSpecIdRef` pattern) for a stale-free synchronous read of the current question inside the `useCallback`.
- `dispatchRef.current()` re-validates internally using the freshly persisted config — no duplicate check needed at the call site.
- Empty question → modal closes only; no dispatch.

**Commit 3 — DeliberatePanel → TeamSummary swap (DeliberateSection.tsx):**
- Active-state rendering replaced: `DeliberatePanel`'s two-card layout removed; `TeamSummary` renders instead.
- `TeamSummary` wired: `spec={selectedSpec}`, `onConfigure={form.openReviewerModal}`, `actions` slot contains benchmark checkbox + Deliberate button.
- Benchmark checkbox (previously inside `DeliberatePanel`) preserved in the `actions` slot, using the same `form.benchmarkEnabled` / `form.setBenchmarkEnabled` wire.
- Deliberate button: `onClick={form.handleStart}`, `disabled={!form.canStart}`.
- `ReviewerConfigModal` remains mounted from active state, gated on `form.showReviewerModal`.
- `DeliberatePanel` deleted — confirmed no other importers at the time of deletion.

---

## Most recent session — Jun 23, 2026

Ghost-layer unmount + submit-path audit (vada-production-v1, PR #207, tool-badges branch).

**Problem 1 — Submit path audit:**
- Traced `SmartPromptInput.onSubmit` → `handleSmartSubmit` → `form.handleStartWithText(text)` → `handleStartImplRef.current(q)` → `dispatchRef.current(overrideQuestion)` → `POST /api/deliberation/start` → `router.push(/deliberation/${session_id})`.
- `handleStartWithText` was already wired correctly: it passes the explicit question text directly as `overrideQuestion`, bypassing the React-batched `question` state read. The `effectiveCanStart` guard inside the ref uses `effectiveQuestion` (the override), not the stale state value. No integration was missing — the submit path was complete.
- No code change required for Problem 1.

**Problem 2 — Ghost layer (empty state visible underneath active state on scroll):**
- Root cause: both empty-state and active-state layers were always mounted. Empty state used `opacity-0 pointer-events-none` CSS toggling, so it was invisible but remained in the DOM and participated in layout. On scroll, the empty-state content (heading, TeamPicker, SmartPromptInput) was visible beneath the active panel.
- Fix: converted both layers to conditional render (`{!isActive && <EmptyState />}` / `{isActive && <ActiveState />}`). Safe to unmount because all state that the empty layer displays (selected team, question text) is lifted into `useDeliberateForm` — `TeamPicker` is fully stateless (value+onChange props), `SmartPromptInput` is uncontrolled. No state is lost on unmount.
- Removed `cn` import (no longer needed after removing conditional className logic). Removed `aria-hidden` and `transition-all duration-300` from the layout wrappers — now handled cleanly by React mount/unmount.
- Stop condition not triggered: all state from the empty layer (`selectedSpecId`, `question`) lives in the hook. Unmounting is safe.

## Most recent session — Jun 23, 2026

Flow tab model icons + Deliberate chat-style layout + SmartPromptInput (vada-production-v1, PR #207, tool-badges branch).

**Commit 1 — Flow tab nodes show real model icon and vendor color (AgentFlowNode.tsx):**
- `AgentFlowNode` was passing `model={undefined}` to `VadaAgent`, causing every flow topology node to render the grey no-model sphere — even when the YAML default model was known.
- Fix: destructure `model` from `AgentNodeData` (already populated by `planToVisualNodes` from `agentDef?.model ?? plan.model`) and pass it to `VadaAgent` together with `userConfigured={true}`.
- `userConfigured={true}` is correct for Flow tab nodes: they represent the actual YAML topology, not unconfigured reviewer slots. The model IS known and should be displayed with vendor color and provider icon.
- Only the Flow tab rendering context is affected. Teams page cards and Deliberate reviewer slots continue to pass their own `userConfigured` values unchanged.

**Commit 2 — Deliberate page: chat-style empty/active layout (DeliberateSection.tsx, page.tsx):**
- Redesigned `DeliberateSection` to manage two states based on whether `question.trim().length > 0`.
- **Empty state**: centered hero layout (`min-h-[calc(100dvh-3.5rem)] flex flex-col items-center justify-center`) — heading + brief description, `TeamPicker` + link to `/teams/[slug]` for the selected team, and the input.
- **Active state** (question non-empty): `DeliberatePanel` in a scrollable content area with `pb-[200px]` clearance, and the input fixed at the viewport bottom via `fixed inset-x-0 bottom-0 z-30 bg-background/95 backdrop-blur-md border-t border-border` — same pattern as Herald's `JDInput` sticky bottom.
- The empty↔active transition is CSS-driven: `opacity-0 pointer-events-none select-none` toggled on each layer via `cn()`. Both layers are always mounted (no conditional render) to avoid remounting the form inputs.
- Page wrapper simplified from `min-h-[calc(100dvh-3.5rem)] flex flex-col justify-center` to `relative min-h-[calc(100dvh-3.5rem)]` — section now owns its height management.
- Stop condition not triggered: `useDeliberateForm` state shape unchanged. The transition is purely at the layout layer.

**Commit 3 — SmartPromptInput wired into Deliberate page (DeliberateSection.tsx, useDeliberateForm.ts):**
- Replaced `QuestionInputArea` (plain `Textarea`) with `@atta/ui/smart-prompt-input` `SmartPromptInput`.
- Provider dependency check: `SmartPromptInput` wraps its own vendored `TooltipProvider` from `@radix-ui/react-tooltip`. No Herald-specific context or provider is required. Drop-in for any Next.js app.
- Submit wiring: `SmartPromptInput` is uncontrolled (no `value`/`onChange`); it fires `onSubmit(text, files)`. Added `handleStartWithText(q: string)` to `useDeliberateForm` — a stable `useCallback` ref that accepts an explicit question string, bypassing the React-batched state read that would occur if `setQuestion(text)` and `handleStart()` were called synchronously in the same event handler.
- The `dispatchRef.current` was extended to accept `overrideQuestion?: string`; both `canStart` gating and the benchmark baseline call use `effectiveQuestion` (override or state). The `handleStartImplRef` received the same treatment.
- **File/PDF backend**: Vāda has no file ingestion endpoint. Files are accepted and rendered in the `SmartPromptInput` attachment tiles, but only `text` is forwarded to `/api/deliberation/start`. This is the scoped-out path noted in the PR body.

## Most recent session — Jun 23, 2026

Calculator model list + YAML descriptions + Deliberate button fix + per-agent reviewer description neutralization (vada-production-v1, PR #207, tool-badges branch).

**Fix 1 — Calculator model list (calculator.ts):**
- `CALCULATOR_MODELS` and `MODEL_PRICES` were hardcoded with stale entries (`gpt-4o`, `gpt-4o-mini`) no longer present in the overlay's flagship list.
- Updated to mirror the overlay in `packages/models/src/overlay.ts`: one or two representative entries per vendor (Anthropic, OpenAI, Google, xAI). Removed `gpt-4o` / `gpt-4o-mini`; added `gpt-5` and `gpt-4.1`. Added `grok-4` alongside `grok-3`.
- The source of truth going forward: when the overlay's flagship list changes, `CALCULATOR_MODELS` / `MODEL_PRICES` should be updated to match. There is no runtime helper that derives them automatically — the overlay is static, so the calculator list is kept manually in sync.

**Fix 2 — YAML team-level descriptions (vada-deliberation/yamls/):**
- `vada-reviewers.yaml` and `vada-reviewers-synthesis.yaml`: old descriptions named "Gemini, GPT, and Grok" explicitly, implying vendor-locked slots. Updated to state that each slot is user-chosen (any vendor you have a key for) and that each reviewer has live web access via Vāda's search infrastructure.
- `sparring.yaml`, `crucible.yaml`, `war-room.yaml`: descriptions did not mention web search. Updated to accurately reflect that key agents have live web access (these agents have `tools: [web_search, ...]` in the YAML).
- `brokered-quartet.yaml`: DomainExpert has `tools: [web_search, web_fetch]`. Updated description to note this.
- `brokered-trio.yaml`: no agents have web_search tools; description unchanged.
- The `description:` field is shown verbatim in TeamCard (teams listing), on the team detail page, and inside the Deliberate panel's right card.

**Fix 3 — Per-agent reviewer descriptions (vada-deliberation/yamls/):**
- `vada-reviewers.yaml` and `vada-reviewers-synthesis.yaml`: each of the three reviewer agents (Gemini, GPT, Grok) had a `description:` field that hardcoded the vendor name ("Gemini reviewer — critical external perspective via Google's Gemini model", etc.). Updated to "Independent reviewer slot — critical external perspective from the model you assign, with live web access." — identical text across all three slots, vendor-neutral.
- Agent `name:` fields (Gemini, GPT, Grok) were **not renamed**. The engine's `compile-flow.ts` derives node IDs directly from `agent.name` (e.g. `reviewer-${agentInRound.name}`), and `rounds[].agents[].name` is used as a lookup key into `plan.agents`. Renaming would silently change node IDs and break graph execution. Names are routing keys, not display labels — renaming requires a separate compiler-level decision.
- The sphere label shown under the sphere in the UI also comes from `agent.name` (via `label={label ?? name}` in `VadaAgent.tsx`). Name-to-display-label decoupling (a separate `label:` field in the YAML) is a future decision if the Principal decides to rename the slots.

**Fix 4 — Deliberate button (DeliberatePanel.tsx):**
- The "Deliberate" button had no explicit `variant` prop. Without an explicit variant, the compiled default is `'default'` = `bg-primary text-primary-foreground`. In Vāda's dark theme, `primary` is a purple hue and `primary-foreground` was not visually distinct enough, producing an unreadable label.
- Added `variant='default'` explicitly. This makes the intent unambiguous and ensures all library variants (basic, animate, retro, brutal) use the correct CTA styling without relying on fallback inference.
- Stop condition not triggered: the button wraps only `onStart` (the dispatch handler from `useDeliberateForm`). No benchmark state, no submission logic, no conditional branches live inside the button element itself. Safe UI-only change.

**Fix 5 — MiniTeamCard sub-label contrast on selected state (DeliberatePanel.tsx):**
- The `MiniTeamCard` component's sub-label `<span>` ("N agents · SHAPE") was unconditionally `text-muted-foreground`, even when the card was in its selected state (`bg-accent` fill). `muted-foreground` is calibrated against `background`/`card` surfaces; on a magenta `accent` fill it is unreadable.
- Fix: conditional className using `text-accent-foreground` when `isSelected`, `text-muted-foreground` otherwise. `accent-foreground` is the CMS-managed paired token for `accent` backgrounds — it is contrast-tested against the accent fill across all product themes.
- Scope: `MiniTeamCard` is a file-local function component defined inside `DeliberatePanel.tsx`. Not exported, not shared. The `/teams/` page's `TeamCard` component uses `text-muted-foreground` sub-labels against `bg-card` (always unselected) — correct pairing, unaffected.
- Neither stop condition triggered: component is not shared, and `--accent-foreground` is a properly defined paired token in the CMS theme schema.

---

## Most recent session — Jun 23, 2026

Empty+grey no-model state for reviewer slots + bigger web-search glyph (vada-production-v1, PR #207, tool-badges branch).

**Empty+grey reviewer sphere (Commit 1 — `userConfigured` prop):**
- Root cause: reviewer slots carried a YAML default `model:` field, so `VadaAgent` always took the vendor-icon path and never rendered the empty+grey state — even though the user had never picked a model.
- Fix: purely UI-layer. Added `userConfigured?: boolean` prop to `VadaAgent`. When `false` (or omitted and the slot is a reviewer), the sphere renders the `NoModelSelectedIcon` (Shuffle glyph, `text-muted-foreground`) and uses `var(--muted-foreground)` as the sphere color — empty interior, grey fill. When `true`, existing vendor-icon + vendor-color logic applies unchanged.
- The YAML `model` field is **not removed or ignored at the engine layer** — it still flows through `compileFlow` and the adapter for execution. The prop is a UI rendering gate only.
- **Teams page** (`TeamCard.tsx`): all reviewer-type agents (`!agent.role`) pass `userConfigured={false}` — the Teams listing has no per-slot selection UI, so all reviewer slots are "you choose."
- **Teams detail page** (`AgentTab.tsx`): same — reviewer slots pass `userConfigured={false}`. No per-slot config UI on this page.
- **Deliberate page** (`TeamSummary.tsx`): reviewer slots pass `userConfigured={Boolean(userConfig?.[a.name])}` — only true when the user has explicitly saved a model to localStorage via the ReviewerConfigModal. YAML defaults (`a.model ?? defaultModel`) do not count as "configured."
- Roled agents (Synthesizer, FactChecker, BlindCritic, etc.) are unaffected — they resolve via `AGENT_BY_ROLE` before any `userConfigured` logic runs. The prop is ignored entirely for roled agents.
- Token used for grey sphere: `var(--muted-foreground)` (inline CSS custom property injected into AgentSphere `color` prop, consistent with how vendor color vars are passed).

**Bigger web-search corner glyph (Commit 2 — `AgentToolIndicator.tsx`):**
- Icon increased from `size-3` to `size-4` (16px). Chip padding scaled from `p-0.5` to `p-1` to keep the chip balanced around the larger icon.
- No other logic changes. Corner positioning and `role='img'` / `aria-label` unchanged.

**No-model glyph replacement (Commit 3 — `ModelOrProviderIcon.tsx`):**
- `NoModelSelectedIcon` replaced: the two overlapping grey SVG circles are gone. The new glyph is a single centered `Sparkles` icon from `lucide-react` (the universally recognized AI mark). Sized via the `size` prop (default 36), colored via `className` defaulting to `text-muted-foreground`. No inline SVG, no hardcoded colors. Communicates "AI / model slot — you choose" against the sphere particle background without implying any vendor.

---

## Most recent session — Jun 23, 2026

Reviewer sphere identity + tool indicator corner glyph (vada-production-v1, PR #207).

**Reviewer sphere identity (model-driven, not name-driven):**
- `VadaAgent` already fell through to vendor inference for reviewer slots (Gemini/GPT/Grok are not in `AGENTS`). What was missing: AgentTab hardcoded `model={undefined}` for all agents, stripping reviewer identity on the `/teams/[slug]` detail page. Fixed: AgentTab now passes `model={agent.model}` so reviewer slots render with the correct vendor color and provider icon face.
- `VadaAgent` now shows a `NoModelSelectedIcon` (Shuffle from lucide-react, `text-muted-foreground`) as the face when a reviewer slot has no model assigned — communicates "you choose" without implying a vendor. This state applies to unconfigured Deliberate reviewer slots.
- Roled agents (Synthesizer, FactChecker, BlindCritic etc.) are unaffected — they resolve via `AGENT_BY_ROLE` and keep their portrait face + sphere color.

**Tool indicator refactor:**
- `AgentWebSearchBadge` (full-width bar below sphere) removed; replaced by `AgentToolIndicator` — a small corner glyph anchored bottom-left of the sphere circle.
- `AgentToolIndicator` takes a `tool: 'web_search'` prop; renders a `Globe` icon in a `bg-card border-border` chip matching the existing model-badge style. Accessible via `role='img'` + `aria-label`.
- Threaded via new `toolBadge` prop on `AIAgent` / `AIASphere` (`badgeLeft` slot at `bottom: -4px, left: -4px`), keeping model badge (bottom-right) and tool badge (bottom-left) from colliding.
- `vada-reviewers-synthesis.yaml` reviewers already had `tools: [web_search]` from PR #209 — no YAML change needed.

---

## Previous session — Jun 23, 2026

Per-vendor tool substrate (vada-production-v1 T3, PR #194). The adapter now forwards tool declarations to all three vendor branches, not just Anthropic. Key changes:

- `GOOGLE_TOOL_REGISTRY` added: `web_search → { googleSearch: {} }` — Gemini native grounding. No client-side handler required; Gemini executes the search on Google's infrastructure. `callGoogle()` extended to accept tool configs and uses the structured `generateContent({ contents, tools })` form when tools are present.
- `OPENAI_COMPAT_TOOL_REGISTRY` added: `web_search → OpenAI function tool spec`. All 10 openai-compat vendors (OpenAI, xAI, Groq, Mistral, DeepSeek, etc.) can now forward function tool specs to the model.
- `runOpenAICompatCustomToolLoop` added — multi-turn tool execution loop for openai-compat, parallel to the existing Anthropic loop. Uses OpenAI's `tool_calls` / tool message format. Activated when any tools (server registry + custom) are declared on an openai-compat agent.
- `createMultiVendorLlmCall` gains optional `vendorExtraBody` (4th param) for per-vendor extra body params (e.g. OpenRouter plugin passthrough). No YAML schema field.
- `resolvedTools` is now consumed in all three vendor branches. Anthropic branch unchanged in behavior — Herald's `SkepticalAuditor + fetch_github_signals` path is unaffected.
- The Option A+B vs. Option C boundary is a settled decision. Option C (external MCP servers requiring engine schema changes) remains deferred.

---

## Most recent session — Jun 18, 2026

Homepage rewrite. Removed sections that described implementation internals (YAML, Atta Engine, `compileFlow`) and replaced them with product-focused copy that accurately describes what Vāda does. Key changes:

- Deleted `PositioningSection` (YAML syntax + engine diagram), `MechanismSection` (BYOK callout + round geometry), `EcosystemSection` (Atta/Vitakka branding — products not yet public), `ArchitectureDiagram`, `PositioningDiagram`
- Removed async CMS branding fetches (`getAttaBranding`, `getVitakkaBranding`) from homepage; page is now a plain sync Server Component
- Added `WhatItIsSection`, `WhyItWorksSection`, `TryItSection`, `McpDeveloperSection` — all static, no CMS dependencies
- Updated `NegationsSection`: removed "No tools. No file access. No code execution." (a YAML-level decision, not a product constraint); replaced with "Vāda is not a search engine."
- Updated `HomeHero`: subtitle "Deliberation Teams" → "Multi-model deliberation"; added concrete second line after animation

---

## Most recent session — May 12-13, 2026

The generic flow refactor + cleanup landed. Vāda's YAML schema, engine compiler, and all consumers now operate on a single universal round-based model (v2 schema). Key changes:

- Schema v2: `Flow` (top-level) → `rounds: Round[]`. The three v1 shapes (brokered-no-synthesis, brokered-with-synthesis, rounds-based) collapsed into one model. Synthesizer is a single-agent round. Audit is a round. Revision is declarative via `on_failure: { action: revise, target, max_revisions, signal }`.
- Engine: `compileFlow(flow, question, model?, customVars?) → Plan` replaces `compileSpec` + per-shape compilers. Greenfield code; emits the same Plan node ids (`solo`, `reviewer-{name}`, `brokered-synthesis`, `round-{r}-{name}`, `terminal-{k}`, `audit-{name}-{k}`, `__END__`) so the adapter executes the graph identically across shapes.
- All 9 catalog YAMLs migrated to `schema_version: "2.0"`.
- `vada-reviewers-synthesis` synthesis template bug fixed in the migration: was `{{reviewerResponses}}` (never populated by the engine), now `{{#each allPreviousOutputs}}[{{this.agentName}}] {{this.content}}{{/each}}`. Synthesizer now actually sees the reviewer outputs.
- Deleted: `spec-types.ts`, `spec-schema.ts`, `spec-loader.ts`, `compile.ts`, all `compilers/*.ts` (brokered, rounds, solo, custom, spec). The `Team` / `BrokeredWorkflow` / `RoundsWorkflow` / `SoloWorkflow` / `CustomWorkflow` / `Workflow` union types deleted from `types.ts`.
- 29 consumer files updated: route handler, both MCP tool files (`consult.ts`, `deliberate.ts`), 6 UI components reading the spec shape (`DeliberatePanel`, `TeamPicker`, `TeamSummary`, `TeamHeader`, `AgentTab`, calculator), verify scripts, and `apps/vada-ai/web/src/lib/flow-helpers.ts` (new — shared shape detection for UI).
- Cleanup (PR #48): `compile-flow.ts` `buildRevisionCondition` throws explicitly on unsupported signal types instead of silently treating `equals`/`matches` as `contains`. `RevisionCondition` in `types.ts` collapsed to single-variant interface (`type: 'contains'`); the unused `json-field-equals`/`json-field-truthy` variants and their adapter case blocks removed.
- Implementation across PRs #41 (schema + types + validation), #47 (compileFlow + migration + consumer updates), #48 (cleanup).

---

## Most recent session — May 5, 2026

BYOK + Settings restructure (branch: `feat/shared-keys-ui`). Key changes:
- Settings tabs restructured: Teams tab removed; Account / API Keys / Agent Style remain
- `ProviderKeysSection` and `ApiKeysSection` extracted to `packages/ui/account/` — shared across products
- Ecosystem schemas (`providerKeys`, `userPreferences`) moved from `apps/vada-ai/web` to `@atta/db`; query layer migrated
- Unified team agent model storage: `vada:team:<specId>` → `Record<agentName, string>` for all team types; replaces separate `vada:reviewer-models:` and `vada:team-model:` keys
- DB `getUserTeamModels` call removed from deliberate page; stale DB entries were overriding localStorage selections on every refresh (revert-to-Claude bug) — fixed
- `GlobalModelSelector` writes to unified storage via `specAgentNames` prop; `resolveModel` in `DeliberatePanel` reads from single source


# Vāda — Current State

> **Framing note (2026-04-30):** The "Brokered mode" and "Autonomous mode" product categories used in older entries have been retired. Current framing uses the Vāda Teams catalog (YAML specs at `packages/agents/vada-deliberation/yamls/`). See `vada-reviewers-spec.md` for the in-progress Vāda Reviewers team spec.

**Last updated:** Jun 23, 2026
**Last milestone:** Council + Council + Synthesis teams added — answer-a-question shape distinct from the critique-a-draft Reviewers shape. Per-vendor tool substrate (PR #194, Option A+B) shipped the same day.
**Next milestone:** Council results view — columns + AIASphere/matrix + synthesis panel keyed to the `{ agreements, disagreements, bottomLine }` contract.

---

## What Vāda is, in one paragraph

Vāda is a YAML-driven deliberation runtime. The engine executes deliberation configurations expressed entirely as YAML files. Other applications (Claude Desktop, Cursor, custom apps) invoke Vāda via MCP by passing a YAML and a question; the engine runs the YAML and returns the result. Modes (Crucible, Sparring, Reviewers, baselines) are not features — they are YAML configurations. The engine is mode-agnostic.

The v2 schema collapses all deliberation patterns into a single model: a flow is a sequence of rounds. Each round has agents, layout (parallel or serial), optional repeats, and optional declarative revision. The compiler detects four shapes from this structure (solo, brokered ± synthesis, rounds + audit) and emits a Plan graph the adapter executes identically across all of them.

Vāda is one product within the AttaLabs ecosystem (`vada.attalabs.dev`). It is also the deliberation layer inside Atta-the-product (the composed deep-thinking AI; see `apps/atta-ai/specs/atta-naming-decision.md` and `aeg-project/state.md` for the v2 framing). This document tracks Vāda-internal state — for ecosystem-level positioning see those documents.

---

## What's complete

### Phase 1 — Mastra removal
LangGraph is the sole deliberation execution path. Mastra and `@atta/orchestration` deleted.

### Phase 2 — Package restructure
`@atta/agents` extracted, `@vada/agents` and `@vada/teams` migrated to `apps/vada-ai/`. `@vada/mcp-server` consolidated.

### Phase 2.5 — Documentation hygiene
All affected skill files, CLAUDE.md files, and READMEs updated to match the restructured packages. `ROADMAP.md` and `DOCS.md` introduced.

### Phase 3.5 — Engine cleanup
Vestigial `declare` stubs removed. Vitest added. 8 compile tests passing.

### Phase 4 — Brokered through engine
`BrokeredWorkflow` type, `compileBrokered`, `brokered-trio` team, `verify-brokered-port.ts` live test, `vada__consult` wired through engine. (Note: the `BrokeredWorkflow` type was later deleted as part of the v2 schema migration. The catalog `brokered-trio.yaml` survives as a v2 `brokered-no-synth` shape.)

### Phase 5 — Brokered specs update
`brokered-deliberation/00`, `01`, `02`, `06` specs updated to reflect engine-based architecture. (Some of these specs reference v1 framing — see `vada-teams-catalog/` directory; flagged for separate cleanup pass.)

### Phase 6 — Reviewer-chain teams (brokered-trio, brokered-quartet) polish
`vada__consult` tool description expanded (~1200 words), Zod input validation, DB migration adding 7 columns, Domain Expert agent added, `brokeredQuartet` flag-gated.

### Phase 6.5 — Benchmarks infrastructure
`benchmark_runs` table, judge script, `/brokered/bench` dashboard with detail pages, smoke test infrastructure.

### Phase 6.7 — Reviewer prompts audit + fix
Three reviewer rounds confirmed the original prompts were written for Autonomous multi-round and being incorrectly reused in Brokered single-shot. Strategist, Critic, Devil's Advocate prompts rewritten. Tool description rewritten with synthesis weighting. Per-reviewer notes routing added. Judge prompt restructured around 5 new criteria (assumption surfacing, actionable specificity, confidence calibration, frame quality, length efficiency). Smoke test re-run revealed a benchmark architecture flaw — see Open Questions below.

### Phase 7.1 — YAML schema investigation
Sonnet investigated current code, identified 30+ branches that needed to die, proposed YAML schema, drafted example YAMLs for all 7 flows, identified 9 open questions (5 resolved by Principal, 4 deferred).

### Phase 7.2 — YAML refactor (Phase A + Phase B)
**Phase A:** YAML support added alongside existing TypeScript. 10 commits. New `DeliberationSpec` types, Zod schema, `loadSpec()`, `compileSpec()`, `specToTeam()`, 7 YAML files, MCP `spec-registry`, web app `selectSpec`. All 5 behavioral verifications passed (A0, A1, Crucible, Sparring, Brokered).

**Phase B:** Old TypeScript deleted. `@vada/teams` package removed. Workflow union types removed. Adapter cleaned of mode-specific branches. Classifier name-substring hard rule replaced with `classifierMode` parameter. Documentation updated across skill files, CLAUDE.md files, and spec docs. Audit pass caught 9 stale items in specs and READMEs that the original Phase B scope had missed; all fixed before commit. 5 commits landed clean. Final typecheck 18/18.

### Phase 7.2.1 — YAML catalog loader extraction
Extracted `loadYamlFromCatalog(id)` from ad-hoc per-caller implementations into `@atta/engine` (`packages/engine/src/catalog-loader.ts`). Fixed two broken runtime YAML-loading paths: the web route was using `process.cwd()` (which resolves to `apps/vada-ai/web/` in dev) and the MCP spec-registry was using the wrong `../../../yamls` depth. Path resolution anchored to `import.meta.url` — immune to dev server cwd changes. `VADA_YAMLS_DIR` env var available for production override.

### Phase 7.3 — YAML catalog cleanup and complete migration
Eliminated all hardcoded spec references and static registries. Three `crucible-v1` fallbacks removed from web app (form initialization, route validation, session resume). MCP `spec-registry.ts` rewritten from a static `SPECS` record to dynamic `readdirSync`-based discovery delegating to `@atta/engine`'s `listPublicSpecs()`; `validateAllSpecs()` added for startup fail-fast validation. All 7 YAML filenames and `id` fields stripped of `-v1` suffixes; ALIASES simplified to `a0`/`a1` only. Drizzle migration backfills `sessions.spec_id` column. `@vada/agent-metadata` package deleted and collapsed into `apps/vada-ai/web/src/components/agents/visuals/`. `customVars` Handlebars rendering added for `system_prompt` fields.

### BYOK + Settings restructure (`feat/shared-keys-ui`)
Settings page restructured: Teams tab removed (model selection moved inline to deliberation panel). `ProviderKeysSection` and `ApiKeysSection` extracted to `packages/ui/account/` as shared components. Ecosystem DB schemas (`providerKeys`, `userPreferences`) moved to `@atta/db`. Team agent model storage unified to a single localStorage key format `vada:team:<specId>` → `Record<agentName, string>` for all team types; stale DB seeding that caused revert-to-Claude bug removed.

### Phase 8 — Synthesis exposed to consumers
The engine already produced structured synthesis via terminal nodes; both MCP and web app consumers stripped the structured field at the boundary. Phase 8 exposes it:
- `vada__deliberate` returns `structured` alongside `content`; null when the spec has no output_schema
- Web app SSE adds typed `synthesis_complete` events with both content and structured payloads
- `transcriptEntries` gains a `structured jsonb` column; synthesis and revision phases insert a transcript entry with structured populated
- `persistTurn` threads `structured` from engine output (AgentOutput.structured) through to DB
- Schema validation tightened: synthesis agent must exist in agents list; `output_format: structured` requires `output_schema`; declaring `output_schema` without `output_format: structured` is rejected
- Resolves OQ-A (caller decides per-call) and OQ-B (per-YAML choice; engine surfaces both)
No schema 2.0 required. The change is at the API boundary, not the spec language.

### Phase 9 — Hosted MCP server shipped (May 4, 2026)
PRs #9 + #10 landed server end-to-end. Endpoint: `https://vada.attalabs.dev/api/mcp`. Streamable HTTP transport. Bearer auth via SHA-256-hashed `vada_*` API keys (`packages/auth/src/api-key-auth.ts`). Provider keys envelope-encrypted in `user_provider_keys` (AES-256-GCM, AAD-bound to clerkId, `MASTER_ENCRYPTION_KEY` env var, `kms_key_id` reserved for future KMS migration). Both `vada__consult` and `vada__deliberate` tools wired through. See `apps/vada-ai/specs/mcp-architecture.md` for full spec. Phase 5 (stdio session URL fix) and Phase 6 (rate limiting, audit log, hardening) remain as future work.

### Phase 10 — Single-source-keys reversal (May 4, 2026)
PR #13 demoted IndexedDB from canonical provider-key storage. Server-side `user_provider_keys` is now the single source of truth. Both UI surfaces (Settings → API Keys; the `/deliberate` model picker's inline key dialog) write to the server via `POST /api/keys/provider`. The `/deliberate` page's lock-icon row, "Sign," and "Forget this device" affordances were removed. `@atta/identity` package retained — `IdentityProvider` mounted in vada-ai and atta-ai layouts; `probeProviderKey` (validate before save), `fetchInstalledOllamaModels` (local Ollama discovery), `MigrationPrompt` (one-time UX nudge for users with pre-reversal IndexedDB keys), `useIdentity` hook used by judge benchmark + model picker. The package no longer holds canonical keys.

### Phase 11 — Shared keys UI + ecosystem schemas (May 5, 2026)
`feat/shared-keys-ui` merged. `ProviderKeysSection` and `ApiKeysSection` extracted to `packages/ui/account/` as shared components. Ecosystem-shared key tables (`apiKeys`, `userProviderKeys`, `mcpSessions`) moved from `apps/vada-ai/web/src/db/schema.ts` to `packages/db/src/schema/keys.ts`. Vāda-specific tables (including `userSettings` for face-style preference) stay in app-local schema. Settings tabs restructured: Account / API Keys / Agent Style. Teams tab removed; team agent model selection moves inline via the unified `vada:team:<specId>` localStorage key.

### Phase 12 — Doc audit pass (May 6, 2026)
PR `docs/may-5-reality-sync` synced 6 repo files to May 4-5 reality: `mcp-architecture.md` (target → shipped), `vada-byok-principles.md` (rewritten in place), `vada-byok-gap-report.md` (resolution status block prepended), `vada-mcp-server/SKILL.md`, `auth/SKILL.md`, `database/SKILL.md`. Out-of-scope deferrals were addressed in a follow-up cleanup pass.

### Phase 13 — Vendor registry consolidation (May 11, 2026)
PR #31 shipped a single source of truth for vendor metadata at `packages/models/src/vendors.ts`. 12 vendors registered with `sdkShape`, `baseURL`, `keyConvention`, `modelPrefixes`, `envVar`, `localOnly`. Four prior divergent prefix-resolution implementations (in transform, adapter, route, reviewer-models) collapsed to one. Adapter dispatches by SDK shape (3 branches: `anthropic`, `google-genai`, `openai-compat`) instead of per-vendor switch. `vada__consult` MCP tool gains optional `reviewer_config: Record<agentName, modelId>` parameter, validated against the registry. Crucible, Sparring, War Room marked `experimental: true` and unpublished from the public `/teams` catalog. Tech debt cleared in the same PR — `providers.ts` shim deleted; 18 consumer files migrated.

### Phase 14 — Generic flow refactor + cleanup (May 12-13, 2026)
Universal round-based YAML schema shipped across the stack. PR #41 added the new types + Zod schema + `validateFlow` (10 validation rules). PR #47 implemented greenfield `compileFlow`, migrated all 9 catalog YAMLs to `schema_version: "2.0"`, deleted the old schema and per-shape compilers, and updated 29 consumer files. PR #48 cleanup removed dead code from the adapter switch tables and tightened `RevisionCondition` to a single-variant interface. Key outcomes:

- One compiler entrypoint (`compileFlow`) replaces `compileSpec` + per-workflow compilers. Shape detection at the top of the function emits matching Plan node ids (`solo`, `reviewer-{name}`, `brokered-synthesis`, `round-{r}-{name}`, `terminal-{k}`, `audit-{name}-{k}`, `__END__`) so the adapter executes the graph identically across shapes.
- Bug fix: `vada-reviewers-synthesis` synthesizer template now uses `{{#each allPreviousOutputs}}[{{this.agentName}}] {{this.content}}{{/each}}` (the v1 template referenced `{{reviewerResponses}}`, which the engine never populated — the synthesizer ran blind in production).
- `types.ts` shrunk by ~200 lines: `Team`, `BrokeredWorkflow`, `RoundsWorkflow`, `SoloWorkflow`, `CustomWorkflow`, and the `Workflow` discriminated union all deleted. `Plan`, `PlanNode`, `PlanEdge`, `PlanGraph`, `PlanNodeRole`, `PlanNodeKind`, `PlanEdgeKind`, and the `Agent` re-export survive.
- `index.ts` public API surface: `loadFlow`, `compileFlow`, `validateFlow`, `resolveAgentFailure`, `InvalidFlowConfigError`, `Flow`, `FlowSchema`, `Plan`, `Agent`, and supporting types. No backwards-compat shim — the consumer surface migrated atomically in PR #47.
- UI shape detection extracted into `apps/vada-ai/web/src/lib/flow-helpers.ts` (39 lines). `detectShape`, `getDisplayAgentNames`, `getFlowAgentCount`, `getFlowShapeLabel` consumed by `DeliberatePanel`, `TeamPicker`, `TeamSummary`, `TeamHeader`, `AgentTab`, and `calculator.ts`.
- Cleanup: `compile-flow.ts` `buildRevisionCondition` throws on unsupported signal types instead of silently producing a `contains` Plan. `RevisionCondition` in `types.ts` collapsed to single-variant interface; adapter switch tables in `adapter.ts` and `graph-builder.ts` lost their dead `json-field-equals` / `json-field-truthy` case blocks.

The architectural ideal ("engine has zero branches on workflow type") is met for the YAML schema layer (one schema, zero discriminators) but pragmatically weakened in the compiler — `compileFlow` contains shape detection over `flow.rounds` topology to emit matching node ids. This is a deliberate tradeoff; a future cleanup PR could revisit it once the adapter is refactored.

See `yaml-schema-reference.md` for the canonical schema documentation. See `generic-flow-refactor.md` for the design doc.

### Phase 15 — Per-vendor tool substrate (Jun 23, 2026)

PR #194. `@atta/adapter-langgraph` now supports tool forwarding across all three vendor SDK shapes, not just Anthropic. Implements the Option A+B per-vendor tool substrate.

**Option A — Per-vendor tool registries (tools.ts):**
- `GOOGLE_TOOL_REGISTRY`: `web_search → { googleSearch: {} }`. Gemini grounding is a native server-side capability; no client-side handler required. `callGoogle()` updated to accept `tools?: any[]` and uses structured `generateContent({ contents, tools })` form when tools are present, simple string form otherwise (backward compat preserved).
- `OPENAI_COMPAT_TOOL_REGISTRY`: `web_search → OpenAI function tool spec`. Unlike Anthropic's server-side tools, openai-compat function tools require client-side handler execution. Callers must register a handler in `customToolHandlers` under the same name.
- Both registries share the same logical key space as `ANTHROPIC_TOOL_REGISTRY`. An agent declaring `tools: ['web_search']` in YAML dispatches to the correct vendor-native format via whichever registry matches the resolved `sdkShape`.

**Option B — OpenAI-compat custom tool loop (custom-tool-loop.ts):**
- `runOpenAICompatCustomToolLoop` added — mirrors `runAnthropicCustomToolLoop` using OpenAI's `tool_calls` / tool message format.
- Activated when `allTools.length > 0` (server tools from registry + custom tools from `resolveRegisteredCustomTools`); falls through to single-shot when no tools declared.
- `customToolSpecToOpenAITool` helper converts `CustomToolSpec` to OpenAI function tool format.

**OpenRouter extra-body passthrough:** `callOpenAICompat()` accepts optional `extraBody?: Record<string, unknown>`. `createMultiVendorLlmCall` gains an optional 4th param `vendorExtraBody?: Partial<Record<VendorId, Record<string, unknown>>>` for per-vendor extra body params (e.g. `{ openrouter: { plugins: [...] } }`). No YAML schema field — adapter-construction level only.

**Blast radius:** The Anthropic branch in `createMultiVendorLlmCall` is byte-identical to pre-T3. Herald's `SkepticalAuditor + fetch_github_signals` custom-tool path is unaffected. 62 tests pass (17 new), `@atta/forensic-hiring-auditor:typecheck` clean.

**Deferred (Option C):** External MCP server support requires a new `mcp_servers` field in `@atta/engine` `FlowAgentSchema` — a contract change with blast radius across Vāda + Herald. Deferred to a separate task.


---

## What's parked

These exist but are NOT the product direction. They remain as historical artifacts or as configurations that ship for compatibility.

### Reviewer-chain teams (brokered-trio, brokered-quartet) — role-based, single-shot
Three reviewers (Strategist, Critic, Devil's Advocate) running in parallel for one round. No synthesis at the engine layer. Currently expressed as `brokered-trio.yaml` (v2 shape: `brokered-no-synth`). This is a parked configuration, not the destination.

### Role-based deliberation as theory
The Strategist/Critic/Devil's Advocate role split was a theoretical decomposition. It has not been validated empirically against role-free configurations. The manual workflow that this project is modeled on does NOT use roles. Whether roles add value over role-free reviewer multiplication is an open empirical question deferred to validation experiments.

### Single-round deliberation
Single-round deliberation is a structurally weaker approximation of what the manual workflow actually does (iterative refinement with synthesis between rounds, terminated by Principal). It ships in the current reviewer-chain YAMLs (`brokered-trio`, `brokered-quartet`) but is not the product target.

---

## What's in flight

T2 spec/skill reconciliation (this PR) — aligning vada-state.md, CLAUDE.md, teams-catalog docs, skills, and all stale YAML path references with T1's YAML migration (paths now at `packages/agents/vada-deliberation/yamls/`) and T3's per-vendor tool substrate.

Next focused work after T2 merges: reviewer prompt iteration (Track B Item 3b).

---

## What's next, sequenced

### Reviewer prompt iteration (Track B Item 3b)
Interactive D pair-mode session. Invoke `vada__consult` with `spec_id: "vada-reviewers"`, read the 3 reviewer responses, judge whether the prompt is producing the right behavior, tweak, re-run. §4.1.1 of the rev 5 spec is the starting prompt. Best done in a fresh session with uninterrupted attention. NOT a brief-and-dispatch task.

### Synthesizer prompt iteration (Track B Item 3c)
Same shape as 3b. §4.1.2 of the rev 5 spec is the starting prompt.

### First Vāda Reviewers benchmark run (Track B Item 4)
Six conditions per test case (A0, A1, VR-NS, VR-S-same, VR-S-cross, MW-where-available). Manual judging by Claude in fresh context, Dani as final arbiter. Per-question-type breakdown required.

### Iterate or ship Vāda Reviewers v1 (Track B Item 5)
Decide recommended synthesis mode based on benchmark data, not philosophy.

### Benchmark architecture redesign
Current benchmark judges raw transcript concatenation, NOT what users actually receive (synthesized output). This is a structural flaw discovered in Phase 6.7's smoke test analysis. Judge must measure synthesized output (with augmentation if applicable) against single-shot baseline. Apples-to-apples comparison.

### YAML cost calculator UI
Users can paste/select a YAML and see estimated cost to run it. The calculator was rewritten in PR #47 to consume `Flow` directly (via `flow-helpers.detectShape`). Pairs with benchmark history to enable cost-per-quality and cost-quality frontier analysis. Concept document at `apps/vada-ai/specs/vada-calculator-concept.md`.

### Validation experiments
Stratified test corpus across decision domains. Run each YAML against the corpus. Build benchmark data per YAML. Identify cost-quality frontier. Determine which YAMLs ship as products and which are research artifacts. Address open questions about role-based vs role-free, single-shot vs multi-round empirically.

---

## Open architectural questions

These were raised but not resolved. They need answers before being designed into the system.

### OQ-C: How does the engine express Principal-terminated loops?
Real-case Brokered terminates when the Principal says it's done, not after a fixed number of rounds. Requires engine extension. Could be: external loop control via Caller Claude (Principal continues by re-invoking) or engine-internal with a "continue?" callback.

### OQ-G: How are YAML forks named without the -vN convention?
Vāda dropped the `-v1` suffix convention. When `crucible.yaml` needs to be iterated (after benchmark data exists), what naming scheme is used for the fork? Semantic names (`crucible-extended.yaml`)? Numeric suffixes reintroduced on first fork (`crucible-v2.yaml`)? Date-based? The answer shapes catalog readability and comparison UX.

### OQ-H (NEW May 13): Adapter refactor to new TemplateState shape
PR #47 left the adapter on the v1 `TemplateState` shape (`outputsByRound`, `lastOutputByAgent`, etc.). The v2 design contemplated a round-namespaced template context (`rounds.<id>.outputs`, `currentRound.prior_agents`, `revision.source_outputs`) — that refactor is future work. Currently v2 YAMLs use v1 template variable names; the adapter is unchanged. Decision needed on when (and whether) to refactor the TemplateState to match the new schema's mental model. Adjacent decision: SSE event names (`state_changed: ROUND_N` etc.) also still match v1 semantics; PR 3 (deferred) would rename to `round_started` / `round_completed` / `revision_started`.

### OQ-I (NEW May 13): Shape detection vs generic walker — keep, or revisit when the adapter is refactored?
The v2 compiler's compromise: `compileFlow` uses shape detection (4 branches: solo, brokered ± synthesis, rounds-audit) to emit matching v1 node ids so the adapter and `resolveAuditChain` continue working. This pragmatically weakens the "engine has zero branches" architectural ideal. A future PR could rewrite `compileFlow` as a generic walker that emits round-id-namespaced node ids (e.g. `round-{id}-{agent}` instead of `reviewer-{agent}`) — but the adapter and route handler would need updating in lockstep. Decide when the adapter refactor (OQ-H) happens.

---

## Calibration notes

Things to remember when working on Vāda. These shape how decisions get made.

### The manual workflow is the empirical reference, not theoretical thinking
When making product decisions, the question to ask is: "what does the manual workflow do?" If a proposed feature adds something not present in the manual workflow, the question becomes "do we have validation that this adds value?" If not, it's theory and should be parked or held as research.

### Refactor only after seeing what should be parameterized
Building the wrong thing first is necessary to see what the right thing should look like. Don't pre-optimize architecture before having concrete examples. The YAML refactor only made sense once we had 4+ concrete modes to compare. Pre-V1 YAML design would have been speculative.

### Files are immutable; iterate by forking
Once a YAML has benchmark history, do not modify it. Fork to a new file with a new id. Benchmark history accumulates per file as historical record. This enables clean comparison across configurations and prevents data corruption from "we changed the prompt mid-way."

### Synthesis is the product
Reviewer responses are inputs to the product. The synthesized output (convergence, divergence, proposal) is what the user actually receives. Optimize for synthesis quality.

### Engine supports anything
The engine has zero branches on workflow type at the schema layer (v2 collapses all shapes into rounds). The compiler still contains shape detection for v1 node-id compatibility — see OQ-I. Whatever YAML configuration is expressible should be runnable. Even one agent is deliberation.

### Verify scripts are not runtime verification
The Phase A verify scripts passed while both runtime YAML-loading paths were broken. Scripts compute their own paths; they don't exercise the runtime loading code that the web server and MCP server use. When fixing a runtime bug, verify by running the actual runtime (or a script that calls through the same code path), not by running scripts that bypass it.

### Dynamic YAML discovery prevents registry drift
The MCP server's static `SPECS` object required a manual code change for every new YAML. The engine's `readdirSync`-based `listPublicSpecs()` auto-discovers new files. When two parts of the system maintain separate registries of the same catalog, they will drift. Delegate to the authoritative source.

### Hardcoded fallbacks mask misconfiguration — fail loud
`.default('crucible-v1')` on the Zod schema for `specId` silently resolved bad requests to a hardcoded team. Removing it surfaces the true failure mode. Default values in routing layers hide bugs upstream; prefer 400 errors over opaque defaults.

### Don't add version suffixes before you have a fork
All 7 initial YAMLs were named with `-v1` but none had a `-v2` comparison to justify the suffix. Premature versioning creates churn (renaming at fork time) and implies a multi-version history that doesn't exist. Add numeric suffixes only when an actual fork exists.

### import.meta.url is the correct path anchor for library files
`process.cwd()` resolves relative to whatever process started the server — different for dev, prod, and scripts. `import.meta.url` resolves relative to the file itself, which is stable across all contexts. Any library file that needs to reference sibling assets should anchor on `import.meta.url`.

### customVars Handlebars rendering enables no-code YAML parameterization
`{{variable}}` placeholders in YAML `system_prompt` fields are rendered at runtime against `customVars`. This lets a single YAML express parameterizable behavior (domain, context, role) without code changes. The Domain Expert pattern — injecting `{{domain}}` into the system prompt — is the canonical use case.

### UX coherence walkthrough must precede architectural lock
"What does the user click? What does it mean? What state do they end up in?" — should have killed the two-store sync architecture immediately if asked when the hosted MCP architecture was first locked. Cost: a sync bug surfaced within minutes of feature use, multiple review rounds, and an architectural reversal within the same week.

### SHA-256 + unique index is the right hash mechanism for high-entropy bearer tokens
bcrypt's per-request CPU cost is unjustified when the token has 256 bits of randomness and the lookup uses an indexed unique constraint. The hosted MCP API key path uses SHA-256 hex digest with `api_keys.key_hash` unique-indexed.

### Sycophancy at architectural decision points is dangerous
Reflexive flipping when challenged is as bad as defending a wrong choice. The right answer requires reasoning, not capitulation. Multiple challenges across the May 4 debugging marathon required pushing past the temptation to immediately reverse course.

### Pragmatic weakenings are not failures — they need to be honestly captured
The v2 design's intent was "engine has zero branches on workflow type." In practice, `compileFlow` keeps 4 shape-detection branches for v1 node-id compatibility. This is a deliberate pragmatic choice (the adapter and route handler depend on the v1 ids) but it materially differs from the ideal. Capture both the ideal and the pragmatic outcome in the frozen decision archive so future contributors understand what was traded and why.

### "Fix the entire stack" beats "leave it for a follow-up PR"
PR #47 originally proposed a backwards-compat shim (`compileSpec = compileFlow`-with-aliasing) so the route handler and MCP could merge unchanged, with consumer updates deferred. The Principal rejected the shim and demanded full consumer migration in the same PR. The result was a heavier PR (60 files) but a fully consistent codebase. Half-merged refactors compound; full migrations close the loop cleanly even when large.

---

## File locations

Core architectural documents (read these first in a new session):
- `apps/vada-ai/specs/vada-state.md` (this document)
- `apps/vada-ai/specs/vada-product-recognitions.md`
- `apps/vada-ai/specs/vada-yaml-immutability-principle.md`
- `apps/vada-ai/specs/generic-flow-refactor.md` — generic flow refactor design document

Existing canonical docs:
- `apps/vada-ai/specs/vada-product-spec.md` — full product positioning
- `apps/vada-ai/specs/vada-science-of-deliberation.md` — foundational theory
- `apps/vada-ai/specs/yaml-schema-reference.md` — YAML schema definitive reference (v2)
- `apps/vada-ai/specs/vada-teams-catalog/` — `vada__consult` reviewer-chain specs (some still reference v1 framing — flagged for separate cleanup pass)

Ecosystem-level docs (for the wider AttaLabs framing, not Vāda-internal):
- `apps/atta-ai/specs/atta-naming-decision.md` — v2 brand architecture (AttaLabs vs Atta)
- `apps/atta-ai/specs/atta-ecosystem-vision.md` — strategic positioning
- `aeg-project/state.md` — current state across all products

Skills (`.claude/skills/`):
- `vada-architecture/SKILL.md` — architecture master reference
- `vada-yaml-authoring/SKILL.md` — how to create YAML specs
- `vada-mcp-server/SKILL.md` — MCP server implementation
- `atta-engine/SKILL.md` — engine internals

YAMLs:
- `packages/agents/vada-deliberation/yamls/` — all deliberation specs (9 files, all `schema_version: "2.0"`)

---

## How to update this document

This is a living document. Update it at major milestones. Specifically:

- When a phase completes, move it from "What's next" or "What's in flight" to "What's complete"
- When a new phase starts, move it from "What's next" to "What's in flight"
- When new architectural recognitions emerge, add them or note them in calibration
- When open questions get resolved, move them to a "resolved" section or delete them
- Update the "Last updated" date and milestone at the top

The goal is for this document to always answer "what is the current state of Vāda?" in under 5 minutes of reading.
