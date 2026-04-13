# UI Package — Claude Code Instructions

Shared UI component library for all Atta AI products. Built on shadcn/ui + Tailwind CSS v4 + lucide-react. Supports runtime theme switching and swappable component libraries via CSS variables and dynamic imports.

---

## Architecture

```
packages/ui/
├── libraries/
│   ├── basic/               # Default library — clean, minimal (shadcn/ui base)
│   │   ├── components/      # Card, Button, Badge, Input, Textarea, Toast, Separator...
│   │   └── installed/       # Raw shadcn installed files
│   ├── retro/               # Retro/vintage aesthetic
│   ├── animate/             # Motion-rich
│   ├── brutal/              # Neo-brutalist
│   └── shared/              # Cross-library primitives: Heading, Text, Flex, AgentThinkingText
├── lib/
│   ├── next-web-shell.tsx   # Root async Server Component — theme + fonts + providers
│   ├── library-provider.tsx # LibraryProvider (client) + useComponents() hook
│   ├── library-loader.ts    # useLibraryLoader — dynamic import of libraries
│   └── utils.ts             # cn() helper (clsx + tailwind-merge)
├── canvas/                  # Particle animation system — see canvas/CLAUDE.md
├── styles/
│   └── globals.css          # Tailwind v4 @theme inline mappings + base styles
├── hooks/                   # Shared React hooks
├── types/                   # Shared TypeScript types
├── CLAUDE.md
└── package.json
```

---

## Critical Rules

### RULE #1: Always use components — never raw HTML primitives

```tsx
// ✅
import { Button } from '@atta/ui/components/button'
import { Card, CardContent } from '@atta/ui/components/card'
import { Heading, Text } from '@atta/ui/shared'

// ❌
<button>, <div class="card">, <p>, <h1>
```

### RULE #2: CSS variables only — never hardcoded colors

```tsx
// ✅
<div className="bg-card text-foreground border-border" />

// ❌
<div className="bg-[#1A1610]" />
<div style={{ background: '#0D0B08' }} />
```

### RULE #3: Inline styles are forbidden

Only two exceptions: runtime-computed numeric values, and CSS custom property injection (`style={{ '--x': val } as React.CSSProperties}`).

### RULE #4: lucide-react only for icons

### RULE #5: Named exports only — no default exports

---

## Imports

```tsx
// Components (resolves to basic library by default)
import { Button } from '@atta/ui'
import { Button } from '@atta/ui/components/button'   // explicit shadcn path
import { Card, CardContent } from '@atta/ui/components/card'
import { Badge } from '@atta/ui/components/badge'
import { Input } from '@atta/ui/components/input'

// Shared cross-library primitives
import { Heading, Text, Flex, AgentThinkingText } from '@atta/ui/shared'

// Explicit library imports (when you specifically need a non-basic library)
import { Button } from '@atta/ui/basic/components'
import { Button } from '@atta/ui/retro/components'
import { Button } from '@atta/ui/animate/components'
import { Button } from '@atta/ui/brutal/components'

// Root layout integration
import { NextWebShell } from '@atta/ui/lib/next-web-shell'
import '@atta/ui/globals.css'

// Canvas system
import { AIACanvas, AIASphere, AIARing } from '@atta/ui/canvas'

// Utilities
import { cn } from '@atta/ui/lib/utils'
```

---

## The Library System

Four component libraries, one active per product. Set in Sanity CMS via `userInterface.library`.

| Library | Style |
|---------|-------|
| `basic` | Default — clean, minimal |
| `retro` | Retro/vintage |
| `animate` | Motion-rich |
| `brutal` | Neo-brutalist |

**Runtime switching** is handled by `LibraryProvider` (inside `NextWebShell`). It dynamically imports the active library via `useLibraryLoader`, which guards against race conditions — a slower import won't overwrite a later one.

**Never hard-switch libraries in component code** unless you have a specific reason to use a non-active library. The active library is resolved at runtime from the CMS config.

---

## `lib/` — Integration Utilities

### `NextWebShell` — every product's root layout uses this

Async Server Component. Fetches theme from CMS config, generates CSS variables, loads Google Fonts, sets up Clerk appearance, wraps children in all required providers.

```tsx
import { NextWebShell } from '@atta/ui/lib/next-web-shell'

export default async function RootLayout({ children }) {
  const config = await getVadaConfig(cmsClient).catch(() => null)
  return <NextWebShell config={config} styleId="vada-theme">{children}</NextWebShell>
}
```

### `LibraryProvider` + `useComponents()`

Client-side context. Exposes the currently active library's component map.

```tsx
import { useComponents } from '@atta/ui/lib/library-provider'

function MyComponent() {
  const { Button } = useComponents()
  // Button is from whichever library is active
}
```

### `cn()` — className utility

```tsx
import { cn } from '@atta/ui/lib/utils'
<div className={cn('bg-card', isActive && 'border-accent', className)} />
```

---

## globals.css

Import once in each product's root layout:

```tsx
import '@atta/ui/globals.css'
```

This sets up Tailwind v4 `@theme inline` mappings (all CSS variables → Tailwind utility classes), base body styles, agent identity color variables (`--agent-strategist`, etc.), and shadow utilities.

**Do not import `globals.css` in individual components** — root layout only.

---

## Theme Tokens

Defined in each product's `globals.css` as CSS variables, overridden by the Sanity theme via `NextWebShell`. Reference them only via Tailwind classes:

| Class | Variable | Usage |
|-------|----------|-------|
| `bg-background` | `--background` | Page background |
| `text-foreground` | `--foreground` | Primary text |
| `bg-card` | `--card` | Card surfaces |
| `text-muted-foreground` | `--muted-foreground` | Labels, metadata |
| `bg-accent` | `--accent` | CTAs, highlights |
| `bg-destructive` | `--destructive` | Error states |
| `border-border` | `--border` | Dividers |
| `font-sans` | `--font-sans` | Body/UI text |
| `font-serif` | `--font-serif` | Headings |
| `font-mono` | `--font-mono` | Technical/code |

---

## Related Documentation

- [Root CLAUDE.md](../../CLAUDE.md)
- [canvas/CLAUDE.md](canvas/CLAUDE.md) — Canvas particle animation system
- [ai/skills/ui-components.md](../../ai/skills/ui-components.md) — Full UI rules
- [ai/skills/cms-theme.md](../../ai/skills/cms-theme.md) — Theme loading from CMS
