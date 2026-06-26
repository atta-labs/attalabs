**Status:** ratified

## Most recent session — Jun 27, 2026

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

`verify-docs` on PR #207 was failing C2 decision-shape because legacy `vada-decisions.md` entries `D-001..D-034` carry `**Status:** Active` but no `**Type:**` field (the gate added Type as a required field after they were written). All 34 are foundational architectural decisions that predate the current type taxonomy → backfilled with `**Type:** 1` (irreversible — Principal must ratify). `verify-docs --pr` now passes against the PR body.

**Result.** PR #207 covers all six phases of the brief. Phases 2, 3 from prior session; Phases 1, 4, 5 from this session. Phase 6 = this docs note + push.

## Previous session — Jun 27, 2026

Frontier-chat hero layout + morphing Configure/Submit slot + dropdown restyle (vada-production-v1, PR #207, `task/vada-production-v1/tool-badges`).

**Commit 1 — `@atta/ui/smart-prompt-input`: `submitSlot` + `textareaClassName`.**
- New optional prop `submitSlot?: React.ReactNode` replaces the default `PromptInputSubmit` in BOTH inline and footer modes. When undefined the render is byte-identical to before — Herald's `JDInput` passes no new props and is unaffected.
- New optional prop `textareaClassName?: string` is merged onto the inner textarea AFTER vendor defaults so callers can defeat utilities like `min-h-16` via tailwind-merge (no vendor patch needed).
- Footer divider question: the vendored InputGroup uses `flex flex-col` with no border between textarea and footer — there is no shared "footer divider" class to opt out of. No `hideFooterDivider` prop introduced. Any further visual separation is a call-site decision (Vāda elevates the InputGroup with a child-selector `shadow-lg`).
- Skill update (D-058, mandatory): `.claude/skills/ui-library-system/SKILL.md` gains a new "Cross-product composite components" section documenting the SmartPromptInput contract (all props in a table, the Herald-compatible invariant, and the rule for adding any new slot). The library-contract validator does NOT cover composite components, so the skill section IS the contract.

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
- `vada-council-synthesis.yaml` — same three answer slots, plus a `role: synthesizer` agent in a second serial round that compares the three answers using the `{{#each allPreviousOutputs}}[{{this.agentName}}] {{this.content}}{{/each}}` template (the post-D-033 pattern, not the broken `{{reviewerResponses}}` of pre-D-033).

The distinction this introduces: Council is an **answer-a-question** team — there is no draft, the models reason from scratch in parallel. The existing Reviewers / Reviewers + Synthesis remain **critique-a-draft** teams — a primary AI has already produced a draft and reviewers attack it. Both shapes are useful; they answer different jobs.

Synthesis output contract (locked here for the future Council results view to consume):

```ts
{ agreements: string[], disagreements: string[], bottomLine: string }
```

Known limitation, intentionally deferred: the existing rounds UI's `ConclusionPanel` / synthesis parser is keyed to the Reviewers JSON shape (`{summary, agreements, divergences, recommendation, ...}`) and will not correctly render Council's `{agreements, disagreements, bottomLine}` output. Building the Council results view (columns + AIASphere/matrix + synthesis panel) is a separate task; do not retrofit the old rounds UI to handle both shapes. See D-035.

Both YAMLs are auto-discovered by `listPublicSpecs()` (engine `catalog-loader.ts` enumerates the directory) — no registry edits required. Engine validation (70/70 tests) confirms both pass the D-033 rules. `listPublicSpecs()` now returns 4 public specs: `vada-council, vada-council-synthesis, vada-reviewers, vada-reviewers-synthesis`.

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
- See D-053 for the Option A+B/C boundary decision. Option C (external MCP servers requiring engine schema changes) remains deferred.

---

## Most recent session — Jun 18, 2026

Homepage rewrite. Removed sections that described implementation internals (YAML, Atta Engine, `compileFlow`) and replaced them with product-focused copy that accurately describes what Vāda does. Key changes:

- Deleted `PositioningSection` (YAML syntax + engine diagram), `MechanismSection` (BYOK callout + round geometry), `EcosystemSection` (Atta/Vitakka branding — products not yet public), `ArchitectureDiagram`, `PositioningDiagram`
- Removed async CMS branding fetches (`getAttaBranding`, `getVitakkaBranding`) from homepage; page is now a plain sync Server Component
- Added `WhatItIsSection`, `WhyItWorksSection`, `TryItSection`, `McpDeveloperSection` — all static, no CMS dependencies
- Updated `NegationsSection`: removed "No tools. No file access. No code execution." (a YAML-level decision per D-046, not a product constraint); replaced with "Vāda is not a search engine."
- Updated `HomeHero`: subtitle "Deliberation Teams" → "Multi-model deliberation"; added concrete second line after animation

---

## Most recent session — May 12-13, 2026

D-033 generic flow refactor + D-034 cleanup landed. Vāda's YAML schema, engine compiler, and all consumers now operate on a single universal round-based model (v2 schema). Key changes:

- Schema v2: `Flow` (top-level) → `rounds: Round[]`. The three v1 shapes (brokered-no-synthesis, brokered-with-synthesis, rounds-based) collapsed into one model. Synthesizer is a single-agent round. Audit is a round. Revision is declarative via `on_failure: { action: revise, target, max_revisions, signal }`.
- Engine: `compileFlow(flow, question, model?, customVars?) → Plan` replaces `compileSpec` + per-shape compilers. Greenfield code; emits the same Plan node ids (`solo`, `reviewer-{name}`, `brokered-synthesis`, `round-{r}-{name}`, `terminal-{k}`, `audit-{name}-{k}`, `__END__`) so the adapter executes the graph identically across shapes.
- All 9 catalog YAMLs migrated to `schema_version: "2.0"`.
- `vada-reviewers-synthesis` synthesis template bug fixed in the migration: was `{{reviewerResponses}}` (never populated by the engine), now `{{#each allPreviousOutputs}}[{{this.agentName}}] {{this.content}}{{/each}}`. Synthesizer now actually sees the reviewer outputs.
- Deleted: `spec-types.ts`, `spec-schema.ts`, `spec-loader.ts`, `compile.ts`, all `compilers/*.ts` (brokered, rounds, solo, custom, spec). The `Team` / `BrokeredWorkflow` / `RoundsWorkflow` / `SoloWorkflow` / `CustomWorkflow` / `Workflow` union types deleted from `types.ts`.
- 29 consumer files updated: route handler, both MCP tool files (`consult.ts`, `deliberate.ts`), 6 UI components reading the spec shape (`DeliberatePanel`, `TeamPicker`, `TeamSummary`, `TeamHeader`, `AgentTab`, calculator), verify scripts, and `apps/vada-ai/web/src/lib/flow-helpers.ts` (new — shared shape detection for UI).
- D-034 cleanup (PR #48): `compile-flow.ts` `buildRevisionCondition` throws explicitly on unsupported signal types instead of silently treating `equals`/`matches` as `contains`. `RevisionCondition` in `types.ts` collapsed to single-variant interface (`type: 'contains'`); the unused `json-field-equals`/`json-field-truthy` variants and their adapter case blocks removed.
- See vada-decisions.md D-033 and D-034. Implementation across PRs #41 (schema + types + validation), #47 (compileFlow + migration + consumer updates), #48 (cleanup).

---

## Most recent session — May 5, 2026

BYOK + Settings restructure (branch: `feat/shared-keys-ui`). Key changes:
- Settings tabs restructured: Teams tab removed; Account / API Keys / Agent Style remain
- `ProviderKeysSection` and `ApiKeysSection` extracted to `packages/ui/account/` — shared across products
- Ecosystem schemas (`providerKeys`, `userPreferences`) moved from `apps/vada-ai/web` to `@atta/db`; query layer migrated
- Unified team agent model storage: `vada:team:<specId>` → `Record<agentName, string>` for all team types (D-027); replaces separate `vada:reviewer-models:` and `vada:team-model:` keys
- DB `getUserTeamModels` call removed from deliberate page; stale DB entries were overriding localStorage selections on every refresh (revert-to-Claude bug) — fixed
- `GlobalModelSelector` writes to unified storage via `specAgentNames` prop; `resolveModel` in `DeliberatePanel` reads from single source


# Vāda — Current State

> **Framing note (2026-04-30):** The "Brokered mode" and "Autonomous mode" product categories used in older entries have been retired. Current framing uses the Vāda Teams catalog (YAML specs at `packages/agents/vada-deliberation/yamls/`). See `vada-reviewers-spec.md` for the in-progress Vāda Reviewers team spec.

**Last updated:** Jun 23, 2026
**Last milestone:** Council + Council + Synthesis teams added — answer-a-question shape distinct from the critique-a-draft Reviewers shape (vada-decisions D-035). Per-vendor tool substrate (PR #194, D-053 Option A+B) shipped the same day.
**Next milestone:** Council results view — columns + AIASphere/matrix + synthesis panel keyed to the `{ agreements, disagreements, bottomLine }` contract.

---

## What Vāda is, in one paragraph

Vāda is a YAML-driven deliberation runtime. The engine executes deliberation configurations expressed entirely as YAML files. Other applications (Claude Desktop, Cursor, custom apps) invoke Vāda via MCP by passing a YAML and a question; the engine runs the YAML and returns the result. Modes (Crucible, Sparring, Reviewers, baselines) are not features — they are YAML configurations. The engine is mode-agnostic.

The v2 schema (D-033) collapses all deliberation patterns into a single model: a flow is a sequence of rounds. Each round has agents, layout (parallel or serial), optional repeats, and optional declarative revision. The compiler detects four shapes from this structure (solo, brokered ± synthesis, rounds + audit) and emits a Plan graph the adapter executes identically across all of them.

Vāda is one product within the AttaLabs ecosystem (`vada.attalabs.dev`). It is also the deliberation layer inside Atta-the-product (the composed deep-thinking AI; see `apps/atta-ai/specs/atta-naming-decision.md` and `aeg-project/state.md` for the v2 framing locked in D-025). This document tracks Vāda-internal state — for ecosystem-level positioning see those documents.

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
`BrokeredWorkflow` type, `compileBrokered`, `brokered-trio` team, `verify-brokered-port.ts` live test, `vada__consult` wired through engine. (Note: the `BrokeredWorkflow` type was later deleted as part of D-033's v2 schema migration. The catalog `brokered-trio.yaml` survives as a v2 `brokered-no-synth` shape.)

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
Eliminated all hardcoded spec references and static registries. Three `crucible-v1` fallbacks removed from web app (form initialization, route validation, session resume). MCP `spec-registry.ts` rewritten from a static `SPECS` record to dynamic `readdirSync`-based discovery delegating to `@atta/engine`'s `listPublicSpecs()`; `validateAllSpecs()` added for startup fail-fast validation. All 7 YAML filenames and `id` fields stripped of `-v1` suffixes (vada-decisions.md D-025 — Vāda-internal; note: the global PM `D-025` is the v2 naming framing — different log, same number); ALIASES simplified to `a0`/`a1` only. Drizzle migration backfills `sessions.spec_id` column. `@vada/agent-metadata` package deleted and collapsed into `apps/vada-ai/web/src/components/agents/visuals/`. `customVars` Handlebars rendering added for `system_prompt` fields.

### BYOK + Settings restructure (`feat/shared-keys-ui`)
Settings page restructured: Teams tab removed (model selection moved inline to deliberation panel). `ProviderKeysSection` and `ApiKeysSection` extracted to `packages/ui/account/` as shared components. Ecosystem DB schemas (`providerKeys`, `userPreferences`) moved to `@atta/db`. Team agent model storage unified to a single localStorage key format `vada:team:<specId>` → `Record<agentName, string>` for all team types; stale DB seeding that caused revert-to-Claude bug removed.

### Phase 8 — Synthesis exposed to consumers
The engine already produced structured synthesis via terminal nodes; both MCP and web app consumers stripped the structured field at the boundary. Phase 8 exposes it:
- `vada__deliberate` returns `structured` alongside `content`; null when the spec has no output_schema (vada-decisions.md D-026)
- Web app SSE adds typed `synthesis_complete` events with both content and structured payloads
- `transcriptEntries` gains a `structured jsonb` column; synthesis and revision phases insert a transcript entry with structured populated
- `persistTurn` threads `structured` from engine output (AgentOutput.structured) through to DB
- Schema validation tightened: synthesis agent must exist in agents list; `output_format: structured` requires `output_schema`; declaring `output_schema` without `output_format: structured` is rejected
- Resolves OQ-A (caller decides per-call) and OQ-B (per-YAML choice; engine surfaces both)
No schema 2.0 required. The change is at the API boundary, not the spec language.

### Phase 9 — Hosted MCP server shipped (May 4, 2026)
PRs #9 + #10 landed server end-to-end. Endpoint: `https://vada.attalabs.dev/api/mcp`. Streamable HTTP transport. Bearer auth via SHA-256-hashed `vada_*` API keys (`packages/auth/src/api-key-auth.ts`). Provider keys envelope-encrypted in `user_provider_keys` (AES-256-GCM, AAD-bound to clerkId, `MASTER_ENCRYPTION_KEY` env var, `kms_key_id` reserved for future KMS migration). Both `vada__consult` and `vada__deliberate` tools wired through. See `apps/vada-ai/specs/mcp-architecture.md` for full spec, `vada-decisions.md` D-029 for the architectural decision. Phase 5 (stdio session URL fix) and Phase 6 (rate limiting, audit log, hardening) remain as future work.

### Phase 10 — Single-source-keys reversal (May 4, 2026)
PR #13 demoted IndexedDB from canonical provider-key storage. Server-side `user_provider_keys` is now the single source of truth. Both UI surfaces (Settings → API Keys; the `/deliberate` model picker's inline key dialog) write to the server via `POST /api/keys/provider`. The `/deliberate` page's lock-icon row, "Sign," and "Forget this device" affordances were removed. `@atta/identity` package retained — `IdentityProvider` mounted in vada-ai and atta-ai layouts; `probeProviderKey` (validate before save), `fetchInstalledOllamaModels` (local Ollama discovery), `MigrationPrompt` (one-time UX nudge for users with pre-reversal IndexedDB keys), `useIdentity` hook used by judge benchmark + model picker. The package no longer holds canonical keys. See vada-decisions.md D-028.

### Phase 11 — Shared keys UI + ecosystem schemas (May 5, 2026)
`feat/shared-keys-ui` merged. `ProviderKeysSection` and `ApiKeysSection` extracted to `packages/ui/account/` as shared components. Ecosystem-shared key tables (`apiKeys`, `userProviderKeys`, `mcpSessions`) moved from `apps/vada-ai/web/src/db/schema.ts` to `packages/db/src/schema/keys.ts`. Vāda-specific tables (including `userSettings` for face-style preference) stay in app-local schema. Settings tabs restructured: Account / API Keys / Agent Style. Teams tab removed; team agent model selection moves inline via vada-decisions.md D-027's unified `vada:team:<specId>` localStorage key. See vada-decisions.md D-030.

### Phase 12 — Doc audit pass (May 6, 2026)
PR `docs/may-5-reality-sync` synced 7 repo files to May 4-5 reality: `vada-decisions.md` (D-028, D-029, D-030 appended), `mcp-architecture.md` (target → shipped), `vada-byok-principles.md` (rewritten in place), `vada-byok-gap-report.md` (resolution status block prepended), `vada-mcp-server/SKILL.md`, `auth/SKILL.md`, `database/SKILL.md`. Out-of-scope deferrals were addressed in a follow-up cleanup pass.

### Phase 13 — Vendor registry consolidation (May 11, 2026)
PR #31 shipped a single source of truth for vendor metadata at `packages/models/src/vendors.ts`. 12 vendors registered with `sdkShape`, `baseURL`, `keyConvention`, `modelPrefixes`, `envVar`, `localOnly`. Four prior divergent prefix-resolution implementations (in transform, adapter, route, reviewer-models) collapsed to one. Adapter dispatches by SDK shape (3 branches: `anthropic`, `google-genai`, `openai-compat`) instead of per-vendor switch. `vada__consult` MCP tool gains optional `reviewer_config: Record<agentName, modelId>` parameter, validated against the registry. Crucible, Sparring, War Room marked `experimental: true` and unpublished from the public `/teams` catalog. Tech debt cleared in the same PR — `providers.ts` shim deleted; 18 consumer files migrated. See vada-decisions.md D-032.

### Phase 14 — D-033 generic flow refactor + D-034 cleanup (May 12-13, 2026)
Universal round-based YAML schema shipped across the stack. PR #41 added the new types + Zod schema + `validateFlow` (10 validation rules). PR #47 implemented greenfield `compileFlow`, migrated all 9 catalog YAMLs to `schema_version: "2.0"`, deleted the old schema and per-shape compilers, and updated 29 consumer files. PR #48 cleanup removed dead code from the adapter switch tables and tightened `RevisionCondition` to a single-variant interface. Key outcomes:

- One compiler entrypoint (`compileFlow`) replaces `compileSpec` + per-workflow compilers. Shape detection at the top of the function emits matching Plan node ids (`solo`, `reviewer-{name}`, `brokered-synthesis`, `round-{r}-{name}`, `terminal-{k}`, `audit-{name}-{k}`, `__END__`) so the adapter executes the graph identically across shapes.
- Bug fix: `vada-reviewers-synthesis` synthesizer template now uses `{{#each allPreviousOutputs}}[{{this.agentName}}] {{this.content}}{{/each}}` (the v1 template referenced `{{reviewerResponses}}`, which the engine never populated — the synthesizer ran blind in production).
- `types.ts` shrunk by ~200 lines: `Team`, `BrokeredWorkflow`, `RoundsWorkflow`, `SoloWorkflow`, `CustomWorkflow`, and the `Workflow` discriminated union all deleted. `Plan`, `PlanNode`, `PlanEdge`, `PlanGraph`, `PlanNodeRole`, `PlanNodeKind`, `PlanEdgeKind`, and the `Agent` re-export survive.
- `index.ts` public API surface: `loadFlow`, `compileFlow`, `validateFlow`, `resolveAgentFailure`, `InvalidFlowConfigError`, `Flow`, `FlowSchema`, `Plan`, `Agent`, and supporting types. No backwards-compat shim — the consumer surface migrated atomically in PR #47.
- UI shape detection extracted into `apps/vada-ai/web/src/lib/flow-helpers.ts` (39 lines). `detectShape`, `getDisplayAgentNames`, `getFlowAgentCount`, `getFlowShapeLabel` consumed by `DeliberatePanel`, `TeamPicker`, `TeamSummary`, `TeamHeader`, `AgentTab`, and `calculator.ts`.
- D-034 cleanup: `compile-flow.ts` `buildRevisionCondition` throws on unsupported signal types instead of silently producing a `contains` Plan. `RevisionCondition` in `types.ts` collapsed to single-variant interface; adapter switch tables in `adapter.ts` and `graph-builder.ts` lost their dead `json-field-equals` / `json-field-truthy` case blocks.

The architectural ideal in D-033 ("engine has zero branches on workflow type") is met for the YAML schema layer (one schema, zero discriminators) but pragmatically weakened in the compiler — `compileFlow` contains shape detection over `flow.rounds` topology to emit matching node ids. The decision is documented in D-033 as deliberate; a future cleanup PR could revisit it once the adapter is refactored.

See `yaml-schema-reference.md` for the canonical schema documentation. See `generic-flow-refactor.md` for the design doc. See vada-decisions.md D-033 and D-034.

### Phase 15 — Per-vendor tool substrate (Jun 23, 2026)

PR #194. `@atta/adapter-langgraph` now supports tool forwarding across all three vendor SDK shapes, not just Anthropic. Implements D-053 Option A+B.

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

**Deferred (Option C):** External MCP server support requires a new `mcp_servers` field in `@atta/engine` `FlowAgentSchema` — a contract change with blast radius across Vāda + Herald. Deferred to a separate task per D-053.

See D-053 in `aeg-project/decisions.md` for the A+B/C boundary rationale.

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
vada-decisions.md D-025 dropped the `-v1` suffix convention. When `crucible.yaml` needs to be iterated (after benchmark data exists), what naming scheme is used for the fork? Semantic names (`crucible-extended.yaml`)? Numeric suffixes reintroduced on first fork (`crucible-v2.yaml`)? Date-based? The answer shapes catalog readability and comparison UX.

### OQ-H (NEW May 13): Adapter refactor to new TemplateState shape
PR #47 left the adapter on the v1 `TemplateState` shape (`outputsByRound`, `lastOutputByAgent`, etc.). The D-033 design contemplated a round-namespaced template context (`rounds.<id>.outputs`, `currentRound.prior_agents`, `revision.source_outputs`) — that refactor is future work. Currently v2 YAMLs use v1 template variable names; the adapter is unchanged. Decision needed on when (and whether) to refactor the TemplateState to match the new schema's mental model. Adjacent decision: SSE event names (`state_changed: ROUND_N` etc.) also still match v1 semantics; PR 3 (deferred) would rename to `round_started` / `round_completed` / `revision_started`.

### OQ-I (NEW May 13): Shape detection vs generic walker — keep, or revisit when the adapter is refactored?
D-033's compromise: `compileFlow` uses shape detection (4 branches: solo, brokered ± synthesis, rounds-audit) to emit matching v1 node ids so the adapter and `resolveAuditChain` continue working. This pragmatically weakens the "engine has zero branches" architectural ideal. A future PR could rewrite `compileFlow` as a generic walker that emits round-id-namespaced node ids (e.g. `round-{id}-{agent}` instead of `reviewer-{agent}`) — but the adapter and route handler would need updating in lockstep. Decide when the adapter refactor (OQ-H) happens.

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
"What does the user click? What does it mean? What state do they end up in?" — should have killed the two-store sync architecture immediately if asked when the hosted MCP architecture was first locked. Cost: a sync bug surfaced within minutes of feature use, multiple review rounds, and an architectural reversal (vada-decisions.md D-028) within the same week.

### SHA-256 + unique index is the right hash mechanism for high-entropy bearer tokens
bcrypt's per-request CPU cost is unjustified when the token has 256 bits of randomness and the lookup uses an indexed unique constraint. The hosted MCP API key path uses SHA-256 hex digest with `api_keys.key_hash` unique-indexed.

### Sycophancy at architectural decision points is dangerous
Reflexive flipping when challenged is as bad as defending a wrong choice. The right answer requires reasoning, not capitulation. Multiple challenges across the May 4 debugging marathon required pushing past the temptation to immediately reverse course.

### Pragmatic weakenings are not failures — they need to be honestly captured
D-033's intent was "engine has zero branches on workflow type." In practice, `compileFlow` keeps 4 shape-detection branches for v1 node-id compatibility. This is a deliberate pragmatic choice (the adapter and route handler depend on the v1 ids) but it materially differs from the ideal. Capture both the ideal and the pragmatic outcome in the decision log so future contributors understand what was traded and why.

### "Fix the entire stack" beats "leave it for a follow-up PR"
PR #47 originally proposed a backwards-compat shim (`compileSpec = compileFlow`-with-aliasing) so the route handler and MCP could merge unchanged, with consumer updates deferred. The Principal rejected the shim and demanded full consumer migration in the same PR. The result was a heavier PR (60 files) but a fully consistent codebase. Half-merged refactors compound; full migrations close the loop cleanly even when large.

---

## File locations

Core architectural documents (read these first in a new session):
- `apps/vada-ai/specs/vada-state.md` (this document)
- `apps/vada-ai/specs/vada-product-recognitions.md`
- `apps/vada-ai/specs/vada-decisions.md`
- `apps/vada-ai/specs/vada-yaml-immutability-principle.md`
- `apps/vada-ai/specs/generic-flow-refactor.md` — D-033 design document

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
