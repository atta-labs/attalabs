---
name: ui-theme-tokens
description: The complete and ONLY list of CSS color/radius/font tokens allowed in Atta AI UI code. Hardcoded Tailwind palette colors (green-500, zinc-900, blue-400, etc.) and raw hex / oklch / hsl values are FORBIDDEN — always use the semantic tokens defined in @atta/ui/styles/globals.css.
---

# Theme Tokens — Atta AI

## Context

Every Atta AI product (Herald, Vada, Atta, Vitakka) is themed at runtime. Colors, fonts, and radius come from a Sanity CMS document, are injected into CSS variables by `NextWebShell`, and are exposed to Tailwind via `@theme inline` mappings in `packages/ui/styles/globals.css`. There are also two color schemes (light / dark) and multiple component libraries (basic / retro / animate / brutal).

**If you write `text-green-500` or `bg-[#1A1610]`, the CMS theme cannot reach it.** The color will be wrong in the other scheme, wrong for products with a different brand palette, and wrong when a new library inverts the surface treatment. Semantic tokens are the only way the theme system works.

---

## THE ABSOLUTE RULE

> **Only use the semantic tokens listed below. Never hardcoded Tailwind palette classes. Never raw hex / oklch / hsl. No exceptions for "just this once" or "it's only a small badge".**

If the color you want is not in the list, it does not exist. Pick the closest semantic token, or add a new one to `globals.css` and to the CMS theme schema — do **not** reach for the Tailwind palette as an escape hatch.

---

## The Complete Token List

All tokens below are exposed as Tailwind utilities. For any token `X`, you can use `bg-X`, `text-X`, `border-X`, `ring-X`, and opacity variants like `border-X/40`, `bg-X/10`.

### Surfaces

| Token | Use for |
|-------|---------|
| `background` | Page background |
| `foreground` | Primary text on page background |
| `card` | Card / panel surfaces |
| `card-foreground` | Text on card surfaces |
| `popover` | Popovers, menus, tooltips |
| `popover-foreground` | Text inside popovers |
| `muted` | Subtle background (chips, inactive controls) |
| `muted-foreground` | Labels, metadata, hints, disabled text |

### Brand / Interactive

| Token | Use for |
|-------|---------|
| `primary` | Primary CTAs, active state, product accent |
| `primary-foreground` | Text on `primary` |
| `secondary` | Secondary buttons, less-emphatic fills |
| `secondary-foreground` | Text on `secondary` |
| `accent` | Highlights, hover states, decorative fills |
| `accent-foreground` | Text on `accent` |

### Status

| Token | Use for |
|-------|---------|
| `success` | Success state, positive result, clean/passing signal |
| `warning` | Caution, revised, degraded, needs-attention |
| `destructive` | Error, failure, destructive action, unconverged |
| `destructive-foreground` | Text on `destructive` fills |

> **There is no `info` / `blue` token.** Use `primary` for informational / in-progress states that need visual weight, or `muted-foreground` for neutral ones.

### Chrome

| Token | Use for |
|-------|---------|
| `border` | Dividers, card outlines, input borders |
| `input` | Input field background |
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

### Radius

| Class | Notes |
|-------|-------|
| `rounded-sm` | `calc(var(--radius) - 3px)` |
| `rounded-md` | `calc(var(--radius) - 2px)` |
| `rounded-lg` | `var(--radius)` (the theme's native radius) |
| `rounded-xl` | `calc(var(--radius) + 4px)` |
| `rounded-2xl` / `3xl` / `4xl` | Progressively larger |

### Agent Identity (Vada-specific)

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

// ❌ Inline hex / oklch / hsl / rgb
<div style={{ background: '#0D0B08' }} />
<div style={{ color: 'oklch(72% 0.17 75)' }} />
```

## Correct Patterns

```tsx
// ✅ Status colors use semantic tokens
<Badge className='text-success border-success/40'>Clean</Badge>
<Badge className='text-warning border-warning/40'>Revised</Badge>
<Badge className='text-destructive border-destructive/40'>Unconverged</Badge>
<Badge className='text-primary border-primary/40'>Sparring</Badge>

// ✅ Surfaces, borders, text
<Card className='border-border bg-card text-card-foreground' />
<Text className='text-muted-foreground' />

// ✅ Opacity modifier on a semantic token is allowed
<div className='bg-success/10 border-success/40' />
```

---

## Why This Matters

1. **Dual color schemes.** A hardcoded `text-green-500` does not flip in dark mode the way `text-success` does — the token resolves differently per scheme via CSS variables set by `NextWebShell`.
2. **Per-product branding.** Each product's CMS theme rewrites `--primary`, `--accent`, etc. Hardcoded palette classes ignore the theme entirely.
3. **Component library swap.** The `basic` / `retro` / `animate` / `brutal` libraries all consume the same tokens. Hardcoded colors break this indirection.
4. **Single source of truth.** `packages/ui/styles/globals.css` defines every color that exists. If a reviewer sees `text-blue-400`, that's a bug — full stop.

---

## If a Token Is Missing

1. Decide if the closest existing token works (usually `primary`, `accent`, `muted-foreground`, or one of the three status tokens).
2. If genuinely missing, add it in three places:
   - `packages/ui/styles/globals.css` — declare `--x` under `:root`, map `--color-x: var(--x)` under `@theme inline`.
   - `packages/cms/` — expose the field in the Sanity theme schema so CMS can override per product.
   - `packages/ui/lib/next-web-shell.tsx` — pipe the CMS value into the generated style block.
3. Document it in this skill under the correct section.

**Never skip step 3.** A token that isn't documented here doesn't exist to future contributors.

---

## Enforcement

This rule is **absolute**. If you see hardcoded colors while editing any file, fix them in-flight — do not ship code that regresses the theme system. Reviewers will bounce PRs that introduce Tailwind palette classes or raw color values.

---

## Related

- `packages/ui/styles/globals.css` — source of truth for all tokens
- `.claude/skills/ui-components/SKILL.md` — broader UI rules
- `.claude/skills/cms-theme/SKILL.md` — how CMS theme values become CSS variables
- `packages/ui/CLAUDE.md` — UI package guide
