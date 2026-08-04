---
name: ui-theme-tokens
description: The complete and ONLY list of CSS color/radius/font tokens allowed in Atta AI UI code, AND the doctrine for which token to reach for in which situation. Hardcoded Tailwind palette colors (green-500, zinc-900, blue-400, etc.), raw hex / oklch / hsl values, and absolute colors (text-white, bg-black) are FORBIDDEN — always use the semantic tokens defined in @atta/ui/styles/globals.css according to the role doctrine below.
---

# Theme Tokens — Atta AI

## Context

Every Atta AI product (Herald, Vāda, Atta, Vitakka) is themed at runtime. Colors, fonts, and radius come from a Sanity CMS document, are injected into CSS variables by `NextWebShell`, and are exposed to Tailwind via `@theme inline` mappings in `packages/ui/styles/globals.css`. There are also two color schemes (light / dark) and multiple component libraries (basic / retro / animate / brutal).

**If you write `text-green-500` or `bg-[#1A1610]` or `text-white`, the CMS theme cannot reach it** — wrong in the other scheme, wrong per-product, wrong under a future theme (detailed under "Why This Matters" below). Semantic tokens are the only way the theme system works.

---

## THE ABSOLUTE RULE

> **Only use the semantic tokens listed below. Never hardcoded Tailwind palette classes. Never raw hex / oklch / hsl. Never absolute colors like `text-white` or `bg-black`. No exceptions for "just this once" or "it's only a small badge".**

If the color you want is not in the list, it does not exist. Pick the closest semantic token by **role** (see doctrine below), or add a new one to `globals.css` and to the CMS theme schema — do **not** reach for the Tailwind palette as an escape hatch.

**One scoped exemption.** `packages/ui/libraries/*/installed/**` is verbatim upstream CLI paste (shadcn / animate-ui / retroui / neobrutalism) — the colors there are upstream's, not ours. Per D-065 those files are exempt from both the Biome ignore and the `check-forbidden-colors` CI gate. The exemption does NOT apply to the `components/interactive/*` wrappers next to them — those are our code, and the rule applies in full.

---

## Token Roles — the canonical reference

**This is the single source of truth for what every token means.** Later sections
(Decision Tree, Forbidden/Correct Patterns) are lookups and worked examples — when they
disagree with these tables, these tables win, and the other section is the bug.

Every token has exactly one role. Picking by role — not by "which color looks nicest in the current theme" — is what makes the system survive theme changes.

### Surface roles (where things sit)

Surfaces stack from canvas → frame → object → inset. Pick the one that matches the structural role, not the desired darkness.

| Token | Role | Use for |
|---|---|---|
| `background` | **Canvas** — the page itself | The outermost page background. Always the bottom layer. |
| `secondary` | **Frame** — persistent chrome around content | Topbars, footers, toolbars, tab strips, command bars, segmented controls. Anything that's structurally the *container* of the app rather than the content. **Sidebars are the exception** — they have their own `sidebar-*` tokens (see below). |
| `card` | **Object** — discrete content containers | Cards, panels, dialog bodies, popover bodies, list items rendered as surfaces. Anything you'd visually "lift" off the canvas. |
| `popover` | **Floating object** — transient surfaces | Popovers, dropdown menus, tooltips, command palettes. Same idea as `card` but reserved for floating/temporary surfaces so themes can give them stronger separation (shadow, slight tint shift) without affecting cards. |
| `muted` | **Inset** — subtle recessed fills | Inactive chips, disabled fields, code-block backgrounds, table zebra rows, inline tag backgrounds. Visually *below* the surface it sits on, not above. |
| `input` | **Field** — editable input surfaces | Text inputs, textareas, select fields. Distinct token so input chrome can be themed independently of `muted`. |

**Sidebars are a specialization of `secondary`,** not a competitor to it. A sidebar IS structural chrome. It gets its own token family (`sidebar`, `sidebar-foreground`, `sidebar-border`, `sidebar-primary`, `sidebar-accent`, `sidebar-ring`) only because sidebars often need independent theming (e.g., always-dark sidebar in a light product). Use `sidebar-*` for the actual sidebar component; use `secondary` for every other piece of frame chrome.

### Text roles (the ink system)

Each text token is calibrated against a specific surface. Using the wrong pairing produces inconsistent contrast across themes.

| Token | Role | Pair with | Use for |
|---|---|---|---|
| `foreground` | **Primary ink** | `background` | Body text, headings, anything load-bearing on the page canvas. The default. |
| `muted-foreground` | **Quiet ink** | `background`, `card`, `muted` | Metadata, timestamps, captions, helper text, placeholders, secondary descriptions, inactive labels. The "less important" ink. |
| `card-foreground` | **Object ink** | `card` | Text on a `card` surface. In most themes equals `foreground`, but use the paired token so themes that tint cards can adjust independently. |
| `popover-foreground` | **Floating ink** | `popover` | Text inside popovers/menus/tooltips. |
| `secondary-foreground` | **Frame ink** | `secondary` | Text on `secondary` surfaces (topbar labels, toolbar buttons). **Do not use this as free-floating "metadata text" on a `background` surface** — its contrast is calibrated against `secondary`, not `background`. |
| `primary-foreground` | **CTA ink** | `primary` | Text on `primary` fills (button labels, badge text on primary backgrounds). |
| `accent-foreground` | **Fill ink** | `accent` | Text on `accent` fills. (Named "highlight ink" before D-131, when `accent` was still a highlight; it is a fill now.) |
| `destructive-foreground` | **Error fill ink** | `destructive` | Text on `destructive` fills. Note: `destructive` text on a non-destructive surface uses `text-destructive` directly (see status section). |

**Rule of thumb:** if you wrote `bg-X`, the matching text token is `text-X-foreground`. If you wrote `bg-background` or no surface at all, your text choices are `foreground` or `muted-foreground`.

### Brand / Interactive roles

| Token | Role | Use for |
|---|---|---|
| `primary` | **Action / Selected** | Primary CTAs, the active item in a nav, the selected item in a list, in-progress informational state that needs visual weight. The "this is where the user is / what the user does next" color. |
| `accent` | **Hover FILL (a surface)** | The background a component paints on hover — `bg-accent`, `hover:bg-accent`. It is a *surface*, not an ink: under retro/brutal it is the fill behind a row, a ghost button, a menu item. Never `text-accent` / `hover:text-accent` / `border-accent` (D-131). |

> ### THE FILL/HIGHLIGHT SPLIT (D-131) — stated once, here
>
> **`accent` paints backgrounds. `primary` colours text and borders.**
>
> | You are styling | Token |
> |---|---|
> | a hover **fill** (row, ghost button, menu item) | `bg-accent` / `hover:bg-accent` + `text-accent-foreground` |
> | a selected/active **fill** | `bg-primary` + `text-primary-foreground` |
> | **text** emphasis or a link hover | `text-primary` / `hover:text-primary` |
> | a **border** highlight | `hover:border-primary` / `group-hover:border-primary` |
>
> **Why it cannot be one token.** The neobrutalist libraries paint `bg-accent` at full
> opacity (retro's `installed/table.tsx` row hover, Button `ghost`, dropdown items);
> retroui's own `--accent` is `#38342b`, a dark surface one step above its card. On a dark
> background a fill must be *dark* and an ink must be *light* — measured, there is no
> overlapping value. It is a role conflict, not a tuning problem.
>
> **Do not bridge it with opacity** (`bg-accent/15`). That fakes a token that should
> exist, and the fill belongs to the component, not the call site.
>
> Discipline, unchanged: `primary` is a commitment — one or two per view. Wanting a third
> brand colour means reaching for `muted` / `muted-foreground`, not inventing one.

### Status roles

Status tokens describe **outcome semantics**, not aesthetic mood. Don't use `success` because something is "good vibes" — use it because something passed/converged/succeeded.

| Token | Role | Use for |
|---|---|---|
| `success` | **Positive outcome** | Passed, converged, clean, verified, completed successfully. |
| `warning` | **Needs attention** | Revised, degraded, partial, deprecated, slow, near-limit. |
| `destructive` | **Failure / destructive action** | Errors, failed runs, unconverged deliberations, delete buttons, irreversible actions. |

**There is no `info` / `blue` token, by design.** Informational states with weight use `primary`. Informational states without weight use `muted-foreground`. If you find yourself wanting a fourth status color, the answer is almost always `primary` for the "weighted" case and `muted-foreground` for the "neutral" case.

**Status as text vs. as fill:**

```tsx
// Text-only status (most common)
<span className='text-success'>Passed</span>
<span className='text-warning'>Revised</span>
<span className='text-destructive'>Failed</span>

// Soft fill (badges, inline tags) — opacity modifier, no foreground swap needed
<Badge className='bg-success/10 text-success border-success/40'>Passed</Badge>

// Hard fill (rare, only for high-stakes destructive actions)
<Button className='bg-destructive text-destructive-foreground'>Delete forever</Button>
```

`success-foreground` and `warning-foreground` do not exist. If you need text on a hard-filled `success`/`warning` surface, you need to add the token (see "If a Token Is Missing" below) — don't reach for `text-white`.

### Border / focus roles

| Token | Role | Use for |
|---|---|---|
| `border` | **Default divider/outline** | All borders unless emphasized. Card outlines, input borders, dividers, list separators. |
| `ring` | **Focus** | Keyboard focus rings (`focus-visible:ring-ring`). Never used decoratively. |
| `primary` | **Emphasized border** | Hover/selected borders — see Brand / Interactive above. |
| status tokens | **State borders** | `border-success/40`, `border-destructive/40` for status-tagged containers. |
| `shadow-color` | **Shadow colour** | The colour of the theme's offset/drop shadows, **deliberately separate from `border`**. The neobrutalist libraries draw a hard offset shadow next to a hard border; a theme wanting a black border but a visible mid-tone shadow cannot express that if its shadow strings reference `var(--border)` — the shadow goes black and disappears. CMS shadow strings MUST use `var(--shadow-color)`. |
| `primary-hover` | **Fill hover** | Hover fill for `primary`-filled controls. retro's vendored `installed/button.tsx` ships `hover:bg-primary-hover`; without the token *and* a `--color-primary-hover` mapping in `globals.css` that class emits **no CSS at all** and the hover silently never fires. |
| `secondary-hover` | **Fill hover** | Same, for `secondary`-filled controls (`hover:bg-secondary-hover`). |

### Sidebar role family

Used **only** by the actual sidebar component. Do not pull these into other chrome — that's what `secondary` is for.

| Token | Use for |
|---|---|
| `sidebar` | Sidebar background |
| `sidebar-foreground` | Sidebar text |
| `sidebar-primary` / `sidebar-primary-foreground` | Sidebar active item |
| `sidebar-accent` / `sidebar-accent-foreground` | Sidebar hover / highlight |
| `sidebar-border` | Sidebar dividers |
| `sidebar-ring` | Sidebar focus ring |

---

### Chart / multi-series

| Token | Use for |
|-------|---------|
| `chart-1` … `chart-5` | Distinguishing ≥3 categorical series in one visualization (chart segments, diagram rings/bands) — CMS-driven (`packages/cms/schemas/ui-theme.ts`'s `chart1`..`chart5` fields), scheme-fixed rather than paired to a surface/text role like the tokens above. Wired into Tailwind's utility system (`--color-chart-N`) in `packages/ui/styles/globals.css`; first real consumer is Vinaya's `/how-it-works` rings diagram. |

**`chart-N` is scheme-fixed, not scheme-relative — do not treat it as "pale."** Unlike `muted`/`secondary` (which are calibrated *relative to the active scheme*, and can render nearly indistinguishable from `background` in a dark theme), `chart-N` values hold roughly constant lightness regardless of light/dark mode. For a genuinely pale/neutral fill that still contrasts against `background` in **both** schemes, use a low-opacity tint of `foreground` (e.g. `fill-foreground/12`) rather than `muted`/`secondary` — this is what `/how-it-works`'s seam rings do, after `muted`/`secondary` were tried first and found invisible-on-background in dark mode.

### Fonts

| Class | Use for |
|-------|---------|
| `font-sans` | Body, UI controls, labels (default) |
| `font-serif` | Headings, display, grade badges |
| `font-mono` | Technical data, signal titles, code |

> **`font-head` is NOT for app code.** `globals.css` also defines `--font-head`
> (mapped to `var(--font-sans)`), but only so the vendored retro `installed/*`
> pastes — which use retroui's own `font-head` token — resolve to a font instead
> of emitting nothing. It is mapped to the **sans** stack (not serif) because
> pre-relaunch retro rendered these tab-trigger/button labels in sans, and
> serif-uppercase triggers read as broken on Herald; a real display-font slot is
> future CMS work. It is a compat alias for the `installed/` layer, not an
> app-author token. In product code use `font-serif` (or `font-heading`) for
> headings; never `font-head`.

### Radius

| Class | Notes |
|-------|-------|
| `rounded-sm` | `calc(var(--radius) - 3px)` |
| `rounded-md` | `calc(var(--radius) - 2px)` |
| `rounded-lg` | `var(--radius)` (the theme's native radius) |
| `rounded-xl` | `calc(var(--radius) + 4px)` |
| `rounded-2xl` / `3xl` / `4xl` | Progressively larger |

### Agent Identity (Vāda-specific)

Cascades from the nearest `[data-agent="..."]` ancestor into `--agent-color`. Use `var(--agent-color)` inside canvas code, or apply the scoped data attribute; **never** hardcode the underlying hsl().

| Attribute | Variable |
|-----------|----------|
| `[data-agent="strategist"]` | `--agent-strategist` |
| `[data-agent="critic"]` | `--agent-critic` |
| `[data-agent="devils_advocate"]` | `--agent-devils-advocate` |
| `[data-agent="synthesizer"]` | `--agent-synthesizer` |
| `[data-agent="researcher"]` | `--agent-researcher` |
| `[data-agent="operator"]` | `--agent-operator` |

---

## Forbidden Patterns

```tsx
// ❌ Tailwind palette colors
<div className='text-green-500 border-green-500/40' />
<Badge className='text-yellow-500' />
<div className='bg-zinc-900 text-amber-200' />
<div className='ring-blue-400' />

// ❌ Arbitrary values
<div className='bg-[#1A1610]' />
<div className='text-[oklch(65%_0.17_145)]' />

// ❌ Absolute colors (break light themes, break dark themes that aren't pure black)
<div className='text-white' />
<div className='bg-black' />
<div className='text-white/80' />

// ❌ Inline hex / oklch / hsl / rgb
<div style={{ background: '#0D0B08' }} />
<div style={{ color: 'oklch(72% 0.17 75)' }} />

// ❌ Wrong-pair text on surface (contrast not calibrated)
<div className='bg-background text-secondary-foreground' />  // secondary-foreground belongs on bg-secondary
<div className='bg-card text-popover-foreground' />          // popover-foreground belongs on bg-popover

// ❌ Status token used for mood, not outcome
<div className='text-success'>Welcome back!</div>            // not an outcome — use foreground

// ❌ Hover FILL reaching for primary
<button className='hover:bg-primary' />                       // fills use hover:bg-accent

// ❌ accent used as an ink — it is a fill (see THE FILL/HIGHLIGHT SPLIT)
<a className='hover:text-accent' />                           // use hover:text-primary
<div className='hover:border-accent' />                       // use hover:border-primary
<span className='text-accent' />                              // use text-primary

// ❌ Sidebar tokens leaking into non-sidebar chrome
<header className='bg-sidebar text-sidebar-foreground' />    // use bg-secondary text-secondary-foreground
```

## Correct Patterns

```tsx
// ✅ Surface + paired text
<Card className='bg-card text-card-foreground border-border' />
<aside className='bg-secondary text-secondary-foreground border-r border-border' />
<div className='bg-popover text-popover-foreground' />

// ✅ Quiet ink on canvas
<p className='text-muted-foreground'>Last updated 2 hours ago</p>

// ✅ Primary for selected / active / committed action
<Button className='bg-primary text-primary-foreground'>Deliberate</Button>
<NavItem className='data-[active=true]:bg-primary data-[active=true]:text-primary-foreground' />

// ✅ accent = the hover FILL; primary = the ink/border highlight
<button className='bg-card hover:bg-accent text-card-foreground hover:text-accent-foreground' />
<a className='text-foreground hover:text-primary'>Read more</a>
<span className='text-primary font-serif'>deliberation</span>  // sparingly: 1–2 emphases per view

// ✅ Soft hover for dense lists
<li className='hover:bg-accent/10' />

// ✅ Status as text
<span className='text-success'>Passed</span>
<span className='text-warning'>Revised</span>
<span className='text-destructive'>Failed</span>

// ✅ Status as soft fill (with opacity, no foreground swap)
<Badge className='bg-success/10 text-success border-success/40'>Clean</Badge>
<Badge className='bg-warning/10 text-warning border-warning/40'>Revised</Badge>
<Badge className='bg-destructive/10 text-destructive border-destructive/40'>Unconverged</Badge>
<Badge className='bg-primary/10 text-primary border-primary/40'>Sparring</Badge>

// ✅ Focus ring
<input className='focus-visible:ring-2 focus-visible:ring-ring' />

// ✅ Border emphasis on hover
<div className='border border-border hover:border-primary transition-colors' />
```

---

## Decision Tree — "Which token do I use?"

When unsure, walk this tree top-down. The first match wins.

1. **Is this a surface?**
   - The page itself → `background`
   - Persistent app chrome (topbar, toolbar, footer, tabs) → `secondary`
   - The actual sidebar component → `sidebar`
   - A card / panel / dialog body → `card`
   - A popover / menu / tooltip → `popover`
   - An inline recessed fill (chip, code block) → `muted`
   - An input field → `input`

2. **Is this text?**
   - On `bg-background` and load-bearing → `foreground`
   - On `bg-background` and quiet (metadata, captions, hints) → `muted-foreground`
   - On any other surface → the matching `*-foreground` token

3. **Is this an interactive state?**
   - Default rest state → the surface's normal token
   - Hover → see **THE FILL/HIGHLIGHT SPLIT**: fill = `accent`, text/border = `primary`
   - Selected / active / current → `primary`
   - Focus ring → `ring`
   - Disabled → `muted` background + `muted-foreground` text

4. **Is this a status signal?**
   - Success outcome → `success`
   - Needs attention → `warning`
   - Failure / destructive → `destructive`
   - Informational with weight → `primary`
   - Informational without weight → `muted-foreground`

5. **Is this a border?**
   - Default → `border`
   - Hover/selected emphasis → `primary` (see THE FILL/HIGHLIGHT SPLIT)
   - Status-tagged → `success/40` / `warning/40` / `destructive/40`
   - Focus → `ring`

6. **None of the above fit?** → See "If a Token Is Missing".

---

## Why This Matters

1. **Dual color schemes.** A hardcoded `text-green-500` does not flip in dark mode the way `text-success` does — the token resolves differently per scheme via CSS variables set by `NextWebShell`. `text-white` and `bg-black` break in light themes; the *idea* of "white text" only makes sense in a dark context.
2. **Per-product branding.** Each product's CMS theme rewrites `--primary`, `--accent`, etc. Hardcoded palette classes ignore the theme entirely.
3. **Future themes are unknown.** A theme that doesn't exist yet will rewrite every token. Code that picks colors *by role* migrates for free; code that picks colors *by appearance* breaks silently.
4. **Component library swap.** The `basic` / `retro` / `animate` / `brutal` libraries all consume the same tokens. Hardcoded colors break this indirection.
5. **Contrast is calibrated per pair.** `secondary-foreground` is contrast-tested against `secondary`, not `background`. Mixing pairs produces accessibility failures that pass in one theme and fail in the next.
6. **Single source of truth.** `packages/ui/styles/globals.css` defines every color that exists. If a reviewer sees `text-blue-400`, that's a bug — full stop.

---

## If a Token Is Missing

1. Walk the decision tree first. Most "missing" tokens turn out to exist under a role-based name (e.g., wanting "info blue" → use `primary` or `muted-foreground`).
2. If genuinely missing, add it in three places:
   - `packages/ui/styles/globals.css` — declare `--x` under `:root` AND under `.dark`, map `--color-x: var(--x)` under `@theme inline`.
   - `packages/cms/` — expose the field in the Sanity theme schema so CMS can override per product.
   - `packages/ui/lib/next-web-shell.tsx` — pipe the CMS value into the generated style block.
3. Document it in this skill under the correct role section AND the token list.

**Never skip step 3.** A token that isn't documented here doesn't exist to future contributors.

---

## Enforcement

If you see hardcoded colors, absolute colors, or wrong-pair surface/text combinations while editing any file, fix them in-flight — do not ship code that regresses the theme system. Reviewers will bounce PRs that introduce Tailwind palette classes, raw color values, `text-white`/`bg-black`, or surface/foreground mispairings.

---

## Related

- `packages/ui/styles/globals.css` — source of truth for all tokens
- `.claude/skills/ui-components/SKILL.md` — broader UI rules
- `.claude/skills/ui-cms-theme/SKILL.md` — how CMS theme values become CSS variables
- `packages/ui/CLAUDE.md` — UI package guide
