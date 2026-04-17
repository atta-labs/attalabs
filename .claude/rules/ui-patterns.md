# UI Patterns — Atta AI (All Products)

These rules apply to every product and surface in the Atta AI monorepo.

---

## RULE 1: UI Components — NEVER Raw HTML

Always use `@atta/ui` components. Never use raw HTML elements when a component equivalent exists.

```tsx
// ✅
import { Button } from '@atta/ui/components/button'
import { Card, CardContent } from '@atta/ui/components/card'
import { Input } from '@atta/ui/components/input'
import { Badge } from '@atta/ui/components/badge'

// ❌ Forbidden
<button className="...">Click</button>
<input type="text" />
<div className="card ...">
```

**Never build custom primitives.** Extend shadcn/ui components instead.

---

## RULE 2: CSS Variables — NEVER Hardcoded Colors

All colors **MUST** use semantic tokens mapped to CSS variables. Hardcoded Tailwind palette classes (`text-green-500`, `bg-zinc-900`, `ring-blue-400`, …), hex, oklch, hsl, or `bg-[#hex]` arbitrary classes are **forbidden**.

```tsx
// ✅ Semantic tokens only
<div className="bg-background text-foreground border-border" />
<span className="text-muted-foreground" />
<Badge className="text-success border-success/40">Clean</Badge>
<Badge className="text-warning border-warning/40">Revised</Badge>
<Badge className="text-destructive border-destructive/40">Unconverged</Badge>

// ❌ NEVER
<div className="bg-[#1A1610]" />
<div style={{ background: '#0D0B08' }} />
<div className="text-green-500 border-yellow-500/40" />   // palette colors are forbidden
<div className="ring-blue-400" />
```

**Available tokens:** `background`, `foreground`, `card` / `card-foreground`, `popover` / `popover-foreground`, `muted` / `muted-foreground`, `primary` / `primary-foreground`, `secondary` / `secondary-foreground`, `accent` / `accent-foreground`, `success`, `warning`, `destructive` / `destructive-foreground`, `border`, `input`, `ring`, plus `sidebar-*` variants.

> There is no `info` / `blue` token. Use `primary` for informational/in-progress states with visual weight, or `muted-foreground` for neutral ones.

**Full reference:** [.claude/skills/theme-tokens/SKILL.md](../skills/theme-tokens/SKILL.md) — complete list, why it matters, and how to add a new token if one is truly missing.

---

## RULE 3: Inline Styles Are FORBIDDEN

`style={{}}` is forbidden unless the value is **provably impossible** with Tailwind.

```tsx
// ✅ Legitimate exceptions only
<div style={{ width: `${runtimePx}px` }} />                           // runtime-computed
<div style={{ '--agent-color': color } as React.CSSProperties} />     // CSS custom property

// ❌ Forbidden
<div style={{ padding: '16px', color: 'var(--foreground)' }} />
```

---

## RULE 4: Icons — lucide-react ONLY

```tsx
import { ArrowRight, Check, AlertTriangle } from 'lucide-react'
// Never: react-icons, heroicons, custom SVG for standard icons
```

---

## RULE 5: Typography — Semantic Font Classes

| Role | Class | Usage |
|------|-------|-------|
| Headings | `font-serif` | H1–H3, display text, grade badges |
| Technical | `font-mono` | Signal titles, data, code-like |
| Body/UI | `font-sans` | Labels, buttons, paragraphs |

Font values come from the CMS theme. Never hardcode font-family names.

---

## Theme System

Colors, fonts, and UI library (basic/retro/animate/brutal) are set per-product in Sanity CMS and injected at root layout via `NextWebShell`. Never hardcode theme values — they change per product and per theme.

See `.claude/skills/cms-theme/SKILL.md` for full details.

---

## Layout Philosophy

- Single column, editorial — not a dashboard
- Generous whitespace — premium product
- Information density increases as user scrolls
- Decision anchors (grade, primary result, CTA) are always the most visually dominant
- Must pass the **Print Test**: reads well printed on paper

---

## Error States

Always graceful. Never show raw error messages or stack traces to users.

```tsx
// ✅
{error && <p className="text-muted-foreground text-sm">Unable to load data.</p>}

// ❌
{error && <p>{error.message}</p>}
```
