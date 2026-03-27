# @herald/ui

Shared UI component library for the Herald monorepo. Built on [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS v4](https://tailwindcss.com/) + [lucide-react](https://lucide.dev/).

## Setup

```bash
cd packages/ui
npx shadcn@latest init
```

## Adding Components

```bash
npx shadcn@latest add button card badge
```

## Usage

```tsx
import { Button } from '@herald/ui/components/button'
import { Card } from '@herald/ui/components/card'
```

## Theme

Herald uses the **Minimal Dark Editorial** theme as default. Components consume CSS variables defined in the app's `globals.css` — they never hardcode color values.

See [HERALD-BUILD-SPEC.md Section 10](../../HERALD-BUILD-SPEC.md) for full theme token reference.

## Icons

All icons use `lucide-react`:

```tsx
import { ArrowRight, Check } from 'lucide-react'
```
