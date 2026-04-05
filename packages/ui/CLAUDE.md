# UI Package — Claude Code Instructions

Shared UI component library for Atta AI. Built on shadcn/ui + Tailwind CSS v4 + lucide-react.

Atta AI uses a single component set with runtime theme switching via CSS variables.

---

## Architecture

```
packages/ui/
├── src/
│   ├── components/          # shadcn/ui components (Button, Card, Badge, etc.)
│   ├── lib/                 # Utilities (cn helper, etc.)
│   └── index.ts             # Public exports
├── CLAUDE.md
├── README.md
├── package.json
└── tsconfig.json
```

---

## Critical Rules

### RULE #1: Use shadcn/ui — NEVER build custom primitives

All base components come from shadcn/ui. Do not create custom Button, Card, Dialog, etc. from scratch. Extend shadcn components when needed.

**Setup (one-time):**
```bash
cd packages/ui
npx shadcn@latest init
```

**Adding a component:**
```bash
npx shadcn@latest add button
npx shadcn@latest add card
```

### RULE #2: Use lucide-react for ALL icons

```tsx
import { ArrowRight, Check, AlertTriangle } from 'lucide-react'
```

Never use other icon libraries. Never use inline SVGs for standard icons.

### RULE #3: Theme tokens are CSS variables, not hardcoded values

Components must use CSS variables for theming, never hardcoded hex values. The theme tokens are defined in `apps/herald/src/app/globals.css` and referenced via Tailwind classes.

```tsx
// ✅ Good — uses theme variable
<div className="bg-card text-primary border-border" />

// ❌ Bad — hardcoded hex
<div className="bg-[#1A1610] text-[#E8D5B7]" />
```

### RULE #4: Named exports only

```tsx
// ✅ Good
export { Button } from './components/button'

// ❌ Bad
export default Button
```

---

## Theme Tokens (Minimal Dark Editorial — Default)

These are the CSS variable values for the launch theme. Defined in the app's `globals.css`, consumed by components via Tailwind.

| Token | CSS Variable | Value | Usage |
|-------|-------------|-------|-------|
| Background | `--background` | `#0D0B08` | Page background |
| Primary text | `--foreground` | `#E8D5B7` | Body text |
| Accent | `--accent` | `#C8A84B` | Grade badges, CTAs, links |
| Secondary text | `--muted-foreground` | `#7A6A50` | Labels, metadata |
| Card | `--card` | `#1A1610` | Card backgrounds |
| Border | `--border` | `#2A2318` | Dividers |
| Error | `--destructive` | `#C85A4B` | Error states |

## Typography

| Font | Family | Tailwind Class | Usage |
|------|--------|---------------|-------|
| Display | Playfair Display | `font-display` | Headings, grade badges |
| Mono | DM Mono | `font-mono` | Signal titles, technical data |
| Sans | DM Sans | `font-sans` | Labels, buttons, navigation |

---

## How to Import

```tsx
import { Button } from '@atta/ui/components/button'
import { Card, CardHeader, CardContent } from '@atta/ui/components/card'
import { Badge } from '@atta/ui/components/badge'
```

---

## Related Documentation

- [Root CLAUDE.md](../../CLAUDE.md) — Monorepo routing index
- [.claude/rules/ui-patterns.md](../../.claude/rules/ui-patterns.md) — UI coding rules (loaded when editing .tsx files)
