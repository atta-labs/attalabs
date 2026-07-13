---
name: ui-theme-tokens
description: The complete and ONLY list of CSS color/radius/font tokens allowed in Atta AI UI code, AND the doctrine for which token to reach for in which situation. Hardcoded Tailwind palette colors (green-500, zinc-900, blue-400, etc.), raw hex / oklch / hsl values, and absolute colors (text-white, bg-black) are FORBIDDEN — always use the semantic tokens defined in @atta/ui/styles/globals.css according to the role doctrine below.
---

# Theme Tokens — Atta AI

## Context

Every Atta AI product (Herald, Vāda, Atta, Vitakka) is themed at runtime. Colors, fonts, and radius come from a Sanity CMS document, are injected into CSS variables by `NextWebShell`, and are exposed to Tailwind via `@theme inline` mappings in `packages/ui/styles/globals.css`. There are also two color schemes (light / dark) and multiple component libraries (basic / retro / animate / brutal).

**If you write `text-green-500` or `bg-[#1A1610]` or `text-white`, the CMS theme cannot reach it.** The color will be wrong in the other scheme, wrong for products with a different brand palette, and wrong when a new theme inverts the surface treatment. Semantic tokens are the only way the theme system works.

---

## THE ABSOLUTE RULE

> **Only use the semantic tokens listed below. Never hardcoded Tailwind palette classes. Never raw hex / oklch / hsl. Never absolute colors like `text-white` or `bg-black`. No exceptions for "just this once" or "it's only a small badge".**

If the color you want is not in the list, it does not exist. Pick the closest semantic token by **role** (see doctrine below), or add a new one to `globals.css` and to the CMS theme schema — do **not** reach for the Tailwind palette as an escape hatch.

**One scoped exemption.** `packages/ui/libraries/*/installed/**` is verbatim upstream CLI paste (shadcn / animate-ui / retroui / neobrutalism) — the colors there are upstream's, not ours. Per D-065 those files are exempt from both the Biome ignore and the `check-forbidden-colors` CI gate. The exemption does NOT apply to the `components/interactive/*` wrappers next to them — those are our code, and the rule applies in full.

---

## Token Role Doctrine

The token list is the *vocabulary*. This section is the *grammar*. Every token has exactly one role. Picking by role — not by "which color looks nicest in the current theme" — is what makes the system survive theme changes.

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
| `accent-foreground` | **Highlight ink** | `accent` | Text on `accent` fills. |
| `destructive-foreground` | **Error fill ink** | `destructive` | Text on `destructive` fills. Note: `destructive` text on a non-destructive surface uses `text-destructive` directly (see status section). |

**Rule of thumb:** if you wrote `bg-X`, the matching text token is `text-X-foreground`. If you wrote `bg-background` or no surface at all, your text choices are `foreground` or `muted-foreground`.

### Brand / Interactive roles

| Token | Role | Use for |
|---|---|---|
| `primary` | **Action / Selected** | Primary CTAs, the active item in a nav, the selected item in a list, in-progress informational state that needs visual weight. The "this is where the user is / what the user does next" color. |
| `accent` | **Hover / Highlight / Emphasis** | Hover surfaces on interactive elements, decorative highlights, soft emphasis on a small number of high-meaning inline tokens. The "this is reactive / this is special" color. |

**`primary` vs `accent` discipline:**

- `primary` is for things the user **acts on or has selected**. It's a commitment. One or two `primary` elements per view, max.
- `accent` is for things the UI **reacts to or wants to emphasize**. It's a touch. Use it more freely, but stay restrained — accent everywhere is accent nowhere.
- If you're tempted to introduce a third brand color: don't. Use `accent` with an opacity modifier (`bg-accent/20`) or fall back to `muted` / `muted-foreground`.

**Hover and active state patterns** (apply consistently across the codebase):

```tsx
// Interactive surface (button, list item, nav item)
<button className='bg-card hover:bg-accent text-card-foreground hover:text-accent-foreground' />

// Selected / active item — primary holds, accent does not
<button className='bg-primary text-primary-foreground' />        // when selected
<button className='hover:bg-accent hover:text-accent-foreground' /> // when hovered

// Soft hover (preferred for dense lists where full accent fill is too loud)
<button className='hover:bg-accent/20' />

// Text-only link / inline action
<a className='text-foreground hover:text-accent' />

// Ghost button on a card
<button className='bg-transparent hover:bg-accent/10 text-card-foreground hover:text-accent-foreground' />

// Border emphasis on hover (no fill)
<div className='border border-border hover:border-accent' />
```

The principle: **hover always reaches for `accent`** (or `accent` with opacity). **Selected/active always reaches for `primary`.** Never the reverse. Never a Tailwind palette color.

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
| `accent` | **Emphasized border** | Hover/selected borders (`hover:border-accent`, `data-[selected=true]:border-accent`). |
| status tokens | **State borders** | `border-success/40`, `border-destructive/40` for status-tagged containers. |

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

## The Complete Token List

All tokens below are exposed as Tailwind utilities. For any token `X`, you can use `bg-X`, `text-X`, `border-X`, `ring-X`, and opacity variants like `border-X/40`, `bg-X/10`.

### Surfaces

| Token | Use for |
|-------|---------|
| `background` | Page canvas |
| `foreground` | Primary text on canvas |
| `secondary` | Structural chrome (topbar, toolbar, footer, tab strip) |
| `secondary-foreground` | Text on secondary chrome |
| `card` | Card / panel surfaces |
| `card-foreground` | Text on card surfaces |
| `popover` | Popovers, menus, tooltips |
| `popover-foreground` | Text inside popovers |
| `muted` | Recessed fills (chips, inactive controls, table zebra) |
| `muted-foreground` | Quiet ink (metadata, helpers, placeholders) |
| `input` | Input field background |

### Brand / Interactive

| Token | Use for |
|-------|---------|
| `primary` | Action / selected / weighted info |
| `primary-foreground` | Text on `primary` |
| `accent` | Hover / highlight / inline emphasis |
| `accent-foreground` | Text on `accent` |

### Status

| Token | Use for |
|-------|---------|
| `success` | Positive outcome |
| `warning` | Needs attention |
| `destructive` | Failure / destructive action |
| `destructive-foreground` | Text on `destructive` fills |

### Chrome

| Token | Use for |
|-------|---------|
| `border` | Dividers, card outlines, input borders |
| `ring` | Focus ring |

### Sidebar

| Token | Use for |
|-------|---------|
| `sidebar` | Sidebar background |
| `sidebar-foreground` | Sidebar text |
| `sidebar-primary` / `sidebar-primary-foreground` | Sidebar active item |
| `sidebar-accent` / `sidebar-accent-foreground` | Sidebar hover / highlight |
| `sidebar-border` | Sidebar dividers |
| `sidebar-ring` | Sidebar focus ring |

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

// ❌ Hover reaching for primary (reserved for selected/active)
<button className='hover:bg-primary' />                       // use hover:bg-accent

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

// ✅ Accent for hover / highlight / inline emphasis
<button className='bg-card hover:bg-accent text-card-foreground hover:text-accent-foreground' />
<a className='text-foreground hover:text-accent'>Read more</a>
<span className='text-accent font-serif'>deliberation</span>  // sparingly: 1–2 emphases per view

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
<div className='border border-border hover:border-accent transition-colors' />
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
   - Hover → `accent` (or `accent/10`/`accent/20` for soft)
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
   - Hover/selected emphasis → `accent`
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

This rule is **absolute**. If you see hardcoded colors, absolute colors, or wrong-pair surface/text combinations while editing any file, fix them in-flight — do not ship code that regresses the theme system. Reviewers will bounce PRs that introduce Tailwind palette classes, raw color values, `text-white`/`bg-black`, or surface/foreground mispairings.

---

## Related

- `packages/ui/styles/globals.css` — source of truth for all tokens
- `.claude/skills/ui-components/SKILL.md` — broader UI rules
- `.claude/skills/ui-cms-theme/SKILL.md` — how CMS theme values become CSS variables
- `packages/ui/CLAUDE.md` — UI package guide
