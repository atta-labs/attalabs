---
name: code-style
description: Enforces TypeScript, export, import, and Biome code style rules across the Atta AI monorepo
---

# Code Style — Atta AI Monorepo

## Context

Strict TypeScript + Biome linting across all packages and apps. Deviations cause CI failures.

---

## Rules

### Exports
- **MUST** use named exports — never default exports
- **MUST** use `export type` for type-only exports

```ts
// ✅
export function getUserById(id: string) { ... }
export type { UserRow }

// ❌
export default function getUserById() { ... }
```

### TypeScript
- **MUST** use strict mode — no `any`
- **MUST** use `type` imports for type-only imports
- **MUST NOT** use non-null assertions (`!`) on runtime values — only on required config that would crash anyway

```ts
// ✅
import type { UserRow } from '@/db/schema'
const apiKey = process.env.ANTHROPIC_API_KEY!  // OK — app would crash without it

// ❌
const result: any = await fetch(...)
```

### Variables & Constants
- **MUST** use `const` — Biome enforces `useConst`
- **MUST NOT** declare multiple variables in one statement (`useSingleVarDeclarator`)

```ts
// ✅
const a = 1
const b = 2

// ❌
let a = 1, b = 2
```

### Components
- **MUST** use self-closing tags for elements with no children
- **MUST NOT** use inferrable types — let TypeScript infer where obvious

```tsx
// ✅
<Button />
const count = 0  // not: const count: number = 0

// ❌
<Button></Button>
const count: number = 0
```

### Console
- `console.error`, `console.warn`, `console.info`, `console.debug` — allowed
- `console.log` — warning (Biome will flag it)
- **Exempt surface:** `scripts/**` — terminal-facing executables where stdout *is* the
  output. `noConsole` is off there via a `biome.json` override, not via per-line
  `biome-ignore` comments. `scripts/verify-*.sh` (thin wrappers around the published
  `@attalabs/aeg-core`, which holds no local copy in this repo) fall under this same
  exemption. All app code keeps the rule — do not widen the glob.

---

## Anti-patterns

- ❌ `any` type — use `unknown` + type narrowing
- ❌ Inline styles — use Tailwind className
- ❌ Useless `else` after `return` — remove it

---

## Package Import Paths

```ts
import { Button } from '@atta/ui/components/button'   // ✅ shared package
import { db } from '@atta/db'                          // ✅ shared db
import { something } from '@/lib/util'                 // ✅ app-internal alias
import { thing } from '../../../lib/util'              // ❌ relative traversal
```
