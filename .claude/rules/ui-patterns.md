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

All colors must use semantic Tailwind classes that map to CSS variables. Hardcoded hex, oklch values, or `bg-[#hex]` arbitrary classes are **forbidden**.

```tsx
// ✅
<div className="bg-background text-foreground border-border" />
<span className="text-muted-foreground" />
<div className="bg-card text-card-foreground" />
<Badge className="bg-accent text-accent-foreground" />

// ❌
<div className="bg-[#1A1610]" />
<div style={{ background: '#0D0B08' }} />
<div className="bg-zinc-900 text-amber-200" />
```

Token reference: `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `bg-accent`, `bg-destructive`, `border-border`, `bg-primary`, `bg-muted`.

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

See `ai/skills/cms-theme.md` for full details.

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
