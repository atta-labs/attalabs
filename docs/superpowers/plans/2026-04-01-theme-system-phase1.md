# Theme System Phase 1 — CSS Variable Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Herald's UI fully theme-driven so that Sanity themes override all visual tokens at runtime.

**Architecture:** Herald's globals.css currently hardcodes color values in Tailwind's `@theme` block. We need to switch to Summon's pattern: `@theme inline` maps Tailwind tokens to CSS custom property references (`var(--primary)`), and the actual values come from a theme `<style>` tag injected server-side. A default theme provides fallback values so the app works without Sanity. Components already use CSS variables correctly — no component changes needed.

**Tech Stack:** Tailwind CSS v4 (`@theme inline`), Sanity CMS, `@herald/cms` package, Next.js server components

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `apps/herald/src/app/globals.css` | Modify | Switch from hardcoded `@theme` to `@theme inline` with `var()` refs |
| `apps/herald/src/app/layout.tsx` | Modify | Inject default theme CSS as fallback |
| `apps/herald/src/app/[username]/page.tsx` | Already done | Fetches user theme from Sanity, injects `<style>` |
| `apps/herald/src/lib/default-theme.ts` | Create | Hardcoded Minimal Dark theme as CSS string (FOUC prevention) |

---

### Task 1: Create Default Theme Fallback

The default theme is Herald's current Minimal Dark — the same values that are hardcoded in globals.css today. This becomes the fallback when no Sanity theme is loaded.

**Files:**
- Create: `apps/herald/src/lib/default-theme.ts`

- [ ] **Step 1: Create the default theme CSS string**

```typescript
// apps/herald/src/lib/default-theme.ts

/**
 * Default Minimal Dark theme — fallback when no Sanity theme is loaded.
 * These values match the original hardcoded globals.css tokens.
 */
export const DEFAULT_THEME_CSS = `:root {
  --background: #0D0B08;
  --foreground: #E8D5B7;
  --muted: #7A6A50;
  --muted-foreground: #7A6A50;
  --card: #1A1610;
  --card-foreground: #E8D5B7;
  --border: #2A2318;
  --input: #2A2318;
  --ring: #C8A84B;
  --primary: #C8A84B;
  --primary-foreground: #0D0B08;
  --secondary: #1A1610;
  --secondary-foreground: #E8D5B7;
  --accent: #C8A84B;
  --accent-foreground: #0D0B08;
  --destructive: #C85A4B;
  --destructive-foreground: #E8D5B7;
  --popover: #1A1610;
  --popover-foreground: #E8D5B7;
  --radius: 0.5rem;
}
`
```

- [ ] **Step 2: Commit**

```bash
git add apps/herald/src/lib/default-theme.ts
git commit -m "Feat: Add default Minimal Dark theme CSS fallback"
```

---

### Task 2: Switch globals.css to `@theme inline` Pattern

Replace hardcoded color values with CSS variable references. This is the key change — Tailwind reads from `var(--primary)` etc., and the actual values come from the theme `<style>` tag.

**Files:**
- Modify: `apps/herald/src/app/globals.css`

- [ ] **Step 1: Replace globals.css content**

```css
@import 'tailwindcss';

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  --font-display: var(--font-playfair);
  --font-mono: var(--font-dm-mono);
  --font-sans: var(--font-dm-sans);

  --radius: var(--radius);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  html {
    background: var(--background);
  }
  body {
    @apply bg-background text-foreground;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}

@media print {
  html, body {
    background: white;
    color: #1a1a1a;
  }

  .no-print {
    display: none !important;
  }
}
```

- [ ] **Step 2: Verify dev server still works**

Run: `bun run dev` and open `localhost:3000/dani`
Expected: Page may look broken (no colors) because CSS variables are now references but no values are injected yet. That's expected — Task 3 fixes it.

- [ ] **Step 3: Commit**

```bash
git add apps/herald/src/app/globals.css
git commit -m "Refactor: Switch globals.css to @theme inline with CSS variable refs"
```

---

### Task 3: Inject Default Theme in Root Layout

Add the default theme `<style>` tag to the root layout so the app always has fallback theme values. The Envoy page's per-user theme (already implemented) will override these.

**Files:**
- Modify: `apps/herald/src/app/layout.tsx`

- [ ] **Step 1: Add default theme injection**

```tsx
import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'
import { DM_Mono, DM_Sans, Playfair_Display } from 'next/font/google'

import { DEFAULT_THEME_CSS } from '@/lib/default-theme'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap'
})

const dmMono = DM_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-dm-mono',
  display: 'swap'
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap'
})

export const metadata: Metadata = {
  title: 'Herald — Forensic Match Audit',
  description: 'Evidence-based match reports for recruiters and hiring managers.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' className={`${playfair.variable} ${dmMono.variable} ${dmSans.variable}`}>
      <head>
        <style id='herald-default-theme' dangerouslySetInnerHTML={{ __html: DEFAULT_THEME_CSS }} />
      </head>
      <body className='min-h-screen bg-background text-foreground'>
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Verify the app looks correct**

Run: `bun run dev` and open `localhost:3000/dani`
Expected: App looks exactly like before — same Minimal Dark colors. The default theme CSS provides all variable values.

- [ ] **Step 3: Verify theme override works**

Open `localhost:3000/dani` for a user who has a theme selected.
Expected: The user's Sanity theme overrides the default — colors change.
If no user has a theme selected yet, this is fine — the default theme shows.

- [ ] **Step 4: Run typecheck**

Run: `cd /Users/daniboomerang/Work/Repositories/Me/herald && bun run typecheck`
Expected: All packages pass

- [ ] **Step 5: Commit**

```bash
git add apps/herald/src/app/layout.tsx
git commit -m "Feat: Inject default theme CSS in root layout for FOUC prevention"
```

---

### Task 4: Verify Full Theme Flow End-to-End

Test that selecting a theme in admin actually changes the Envoy page appearance.

**Files:** None (testing only)

- [ ] **Step 1: Set a theme via admin**

1. Go to `localhost:3000/admin`
2. In the theme picker, select a visually distinct theme (e.g., "Lava" or "Matrix")
3. Wait for "Saved" confirmation

- [ ] **Step 2: Verify Envoy page uses the theme**

1. Open `localhost:3000/[your-username]` in a new tab
2. Expected: Page colors match the selected theme, not the default Minimal Dark
3. The theme CSS from Sanity overrides the default theme CSS in the layout

- [ ] **Step 3: Verify default fallback**

1. If you have another user without a theme selected, visit their Envoy page
2. Expected: Default Minimal Dark theme appears

- [ ] **Step 4: Run full check**

Run: `cd /Users/daniboomerang/Work/Repositories/Me/herald && bun run check`
Expected: Typecheck + lint + format all pass

- [ ] **Step 5: Final commit with all changes**

```bash
git add -A
git commit -m "Feat: Complete theme system Phase 1 — CSS variable foundation

- Default Minimal Dark theme as fallback CSS
- globals.css uses @theme inline with var() references
- Root layout injects default theme for FOUC prevention
- Per-user Sanity themes override defaults on Envoy pages"
```
