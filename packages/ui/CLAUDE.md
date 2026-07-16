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
├── component-contract.mjs   # Contract: every component/type all libraries must export
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

// Palette + popover primitives
import { Popover, PopoverContent, PopoverTrigger } from '@atta/ui'
import {
  Command, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator
} from '@atta/ui'

// Model-aware primitives (backed by @lobehub/icons + @atta/models)
import { ModelPicker, ModelIcon } from '@atta/ui'
// See .claude/skills/model-picker/SKILL.md for the full contract.

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
  const { config, branding } = await getProductCms('vada')
  return <NextWebShell config={config} branding={branding} styleId="vada-theme">{children}</NextWebShell>
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

### `ColorSchemeToggle` — runtime light/dark switch

Client component. Sun/moon icon button; flips `<html data-theme>` and writes the `atta-color-scheme` cookie so the next SSR render agrees. Drop into any topbar.

```tsx
import { ColorSchemeToggle } from '@atta/ui/lib/color-scheme-toggle'

<div className='flex items-center gap-3'>
  <ColorSchemeToggle />
  {/* avatar, sign-in, etc. */}
</div>
```

The shared cookie name, attribute name, default scheme, and `resolveColorScheme()` helper live in `@atta/ui/lib/color-scheme` — `NextWebShell` (server) and the toggle (client) both import from there. See `.claude/skills/ui-cms-theme/SKILL.md` for the full architecture.

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

## Component Contract

Every library must export the same set of components and types. This is enforced by `component-contract.mjs` + `scripts/validate-ui-contract.mjs`, which runs automatically before every `build` and `dev` command. If a library is missing an export the process exits 1 and nothing starts.

### Adding a new component to a library

1. Create the component file in `libraries/{name}/installed/` or `libraries/{name}/components/`
2. Export it from `libraries/{name}/components/index.ts`
3. Add the component name to `REQUIRED_COMPONENTS` in `component-contract.mjs`
4. Add its Props type to `REQUIRED_TYPES` in `component-contract.mjs`
5. Implement (or add a basic fallback) in **all other libraries** — the contract blocks the build until every library exports it
6. Run `bun run validate:ui-contract` to verify before committing

### Running the validator manually

```bash
bun run validate:ui-contract
```

### What the output looks like

```
🔍 Validating UI Component Contract

   Contract : 37 components, 43 types
   Libraries: basic, retro, animate, brutal

📦 Checking retro...
   ❌ Missing components (2):
        - Toast
        - ToastProvider

❌ Some libraries are missing required exports. Fix them or update the contract.
```

---

## Related Documentation

- [Root CLAUDE.md](../../CLAUDE.md)
- [canvas/CLAUDE.md](canvas/CLAUDE.md) — Canvas particle animation system
- [.claude/skills/ui-components/SKILL.md](../../.claude/skills/ui-components/SKILL.md) — Full UI rules
- [.claude/skills/ui-library-system/SKILL.md](../../.claude/skills/ui-library-system/SKILL.md) — Library system, build-time generation, contract validation
- [.claude/skills/ui-cms-theme/SKILL.md](../../.claude/skills/ui-cms-theme/SKILL.md) — Theme loading from CMS
