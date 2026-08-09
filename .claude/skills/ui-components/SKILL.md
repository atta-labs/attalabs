---
name: ui-components
description: Rules for building UI across ALL Atta AI apps — component usage, CSS variables, theming, typography, inline styles, library system
---

# UI Components — Atta AI (All Products)

> # ⛔ URGENT — DO NOT EDIT `packages/ui/libraries/*/installed/*`
>
> **Each library's `installed/` holds the vendored canonical from THAT library's design-system
> source — installed via shadcn CLI, pasted verbatim, NEVER hand-edited.** Each of the four
> libraries comes from a different upstream:
>
> | Library | Upstream source | CLI install command |
> |---|---|---|
> | `basic` | shadcn (`ui.shadcn.com`) | `npx shadcn@latest add <component>` |
> | `animate` | animate-ui (`animate-ui.com`) | `npx shadcn@latest add @animate-ui/...` |
> | `retro` | retroui (`retroui.dev`, Radix flavor) | `npx shadcn@latest add https://retroui.dev/r/radix/<component>.json` |
> | `brutal` | neobrutalism (`neobrutalism.dev`) | shadcn-compatible registry |
>
> **Even a one-character change in `installed/` is a hard rule violation.** Never hand-roll
> an implementation there — always pull from upstream.
>
> ### How to add or change a primitive — the right workflow
>
> 1. **Install via CLI** (or paste the canonical from the upstream's docs) into the right
>    library's `installed/<comp>.tsx`, adjusting only import paths — nothing else.
> 2. **Check if the upstream's exported API matches our contract** (`packages/ui/component-contract.mjs`).
>    Most upstreams export flat named components (`Tabs`, `TabsList`, `TabsTrigger`,
>    `TabsContent`) — those match our contract directly, just re-export from `components/index.ts`
>    and you're done.
> 3. **If the upstream's API differs from our contract**, **add a wrapper** in
>    `components/<comp>.tsx` (or `components/interactive/`) that adapts it to our contract's
>    flat named exports. The wrapper IS editable. `installed/` stays verbatim. (retro's old
>    Base UI heritage needed this — dotted `Object.assign` Tabs, `render`-instead-of-`asChild`
>    Button — but its Radix-flavor upstream exports flat components and native `asChild`, so
>    those adapters were removed.)
> 4. **If you want to vary appearance for one library (e.g. add a variant prop)** — that goes
>    in the wrapper layer (`components/interactive/<comp>.tsx`), NOT in `installed/`. The
>    `Button.ghost-pill` variant is the canonical example: basic's `installed/button.tsx` is
>    shadcn canonical, and the additional variant lives in
>    `packages/ui/libraries/basic/components/interactive/button.tsx`.
>
> ### When a consumer in `components/` imports from `installed/` and that's blocking you
>
> Switch the import to the editable `components/interactive/<component>` so the consumer
> benefits from the wrapper / variants without touching `installed/`. Worked example:
> `model-picker.tsx` should import `Button` from `../interactive/button`, NOT
> `../../installed/button` — see PR #207.
>
> Existing variant additions like `ghost-pill`, `'bare'` (Textarea), and `'link'` (NextLink)
> are the canonical examples — see "Canonical extension patterns" in
> `.claude/skills/ui-library-system/SKILL.md`.
>
> ### Why this rule is non-negotiable
>
> The `installed/` files MUST stay verbatim against their upstream source so future upstream
> updates can be **pasted in** instead of **reconciled by hand**. Every deviation in
> `installed/` becomes drift that has to be reconciled forever after.
>
> **Red flags that mean STOP — you are about to violate this rule:**
> - "I'll just change `text-sm` to `text-base` in `installed/`, it's one line."
> - "I'll add `font-mono` to the trigger here, it's a small tweak."
> - "I'll fix the hover colour in `installed/`, easier than adding a wrapper."
> - "Our `installed/<comp>.tsx` was already drifted from upstream when I got here, so a bit
>   more drift is fine."
>
> No to all of them. Either pull the upstream canonical (paste verbatim) or add a wrapper.
> If you find yourself wanting to edit `installed/`, STOP and pick one of the workflow steps above.
>
> **One legitimate edit case:** restoring `installed/<comp>.tsx` to canonical when it has
> drifted. Pasting the upstream verbatim back into `installed/` IS the rule's spirit ("stay
> verbatim against upstream") — that's reconciling drift, not adding it. Do this whenever
> you notice drift; document the upstream URL in the commit message.

---

## Context

Every app in this monorepo shares a single UI system via `@atta/ui`. The active component library and theme are set per-consumer in Sanity CMS and injected at the root layout via `NextWebShell`. These rules apply to every consumer, every surface.

---

## RULE 1: Use UI Components — NEVER Raw HTML Markup

Every element that has a component equivalent **MUST** use the component. Raw HTML primitives (`<button>`, `<input>`, `<div>` as interactive, `<p>`, `<h1>` etc.) are **FORBIDDEN** when a component exists.

```tsx
// ✅ Always
import { Button } from '@atta/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components/card'
import { Input } from '@atta/ui/components/input'
import { Badge } from '@atta/ui/components/badge'
import { Textarea } from '@atta/ui/components/textarea'
import { Heading, Text } from '@atta/ui/shared'
import { TextReveal } from '@atta/ui'

<Button variant="ghost">Click me</Button>
<Input placeholder="Type here..." />
<Card><CardHeader><CardTitle>Title</CardTitle></CardHeader></Card>
<TextReveal text="What are you wrestling with?" />   // typography reveal animation

// ❌ Never
<button className="...">Click me</button>
<input type="text" className="..." />
<div className="card ...">...</div>
```

**Never build custom primitives.** Do not create custom Button, Card, Input, Dialog, Badge, etc. from scratch. Extend shadcn/ui components when customization is needed.

---

## RULE 1b: Missing Component? ADD IT to `@atta/ui` — NEVER Roll Custom

If a primitive you need (Tabs, Accordion, Dialog, Select, Popover, etc.) does not exist in `@atta/ui`, you **MUST** add it to the library. **Do not** hand-roll a substitute in the app using `<Button>` + conditional rendering, `<div>` + state, or any other workaround.

This includes "simple" cases like tab bars, toggle groups, segmented controls, or accordion-style disclosures. If it has a shadcn/Radix primitive, it belongs in `@atta/ui`.

**Required workflow when a component is missing:**

1. **Install the upstream canonical via shadcn CLI** into the active library's `installed/`. Each library has its own upstream registry — never hand-roll the file:
   - `basic` → `bunx shadcn@latest add <component>` (shadcn/ui registry)
   - `animate` → `bunx shadcn@latest add @animate-ui/<component>`
   - `retro` → `bunx shadcn@latest add https://retroui.dev/r/radix/<component>.json` (Radix flavor)
   - `brutal` → `bunx shadcn@latest add @neobrutalism/<component>`

   Copy the CLI output verbatim to `packages/ui/libraries/{name}/installed/{component}.tsx`. Adjust ONLY the import paths (e.g. `@/lib/utils` → `../../../lib/utils`). Helper directory trees (e.g. animate-ui's `installed/animate-ui/primitives/...`) are preserved as-is. `installed/*` is Biome-ignored — never reformat.
2. **Install the canonical in every other library too** (matching its own upstream). If a non-`basic` library has no design-system equivalent, fall back to basic with `export { Tabs } from '../../basic/installed/tabs'` in `components/index.ts`.
3. **Wrap only if the upstream's exported shape differs from our contract.** Most upstreams (including retro's Radix flavor) export flat named components (`Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`) and native `asChild`, so you re-export from `components/index.ts` directly. Add a thin adapter in `components/interactive/{component}.tsx` only when an upstream genuinely diverges — e.g. a dotted `Object.assign` API or a different child-prop name. (retro used to diverge on both counts under its old Base UI heritage; its Radix flavor no longer does.) The adapter is editable; `installed/` stays verbatim.
4. **Add the component + its Props type** to `REQUIRED_COMPONENTS` and `REQUIRED_TYPES` in `packages/ui/component-contract.mjs`. The contract validates **component + type NAMES across libraries** — not variant enums. Each library derives its own Props from its own cva via `VariantProps<typeof buttonVariants>`.
5. **Run `bun run validate:ui-contract`** — build fails if any library is missing the export.
6. **Then `import { Tabs } from '@atta/ui'`** in the app.

**Red flags that mean STOP — you are about to violate this rule:**
- "I'll just make a quick tab bar with Buttons"
- "A simple `<div>` with onClick is enough here"
- "I'll wrap it in motion.div myself since the library doesn't have it"
- "It's just this one page, I'll inline it"
- "I'll hand-write the `installed/` file from memory of the upstream"

Every one of these is a custom primitive in disguise. Stop, install the upstream canonical via CLI, then use it.

---

## RULE 2: CSS Variables — NEVER Hardcoded Colors

All colors **MUST** come from CSS variables via Tailwind semantic classes. Hardcoded hex values, oklch literals, or `bg-[#hex]` arbitrary Tailwind values are **FORBIDDEN**.

```tsx
// ✅ Always — semantic CSS variable classes
<div className="bg-background text-foreground" />
<div className="bg-card text-card-foreground border border-border" />
<span className="text-muted-foreground" />
<Badge className="bg-accent text-accent-foreground" />
<div className="bg-destructive text-destructive-foreground" />
<div className="bg-primary text-primary-foreground" />

// ❌ Never — hardcoded colors
<div className="bg-[#1A1610] text-[#E8D5B7]" />
<div style={{ background: '#0D0B08' }} />
<div className="bg-zinc-900 text-amber-200" />   // Tailwind palette colors, not theme
```

### Full CSS Variable Token Reference

| Tailwind Class | CSS Variable | Purpose |
|---------------|-------------|---------|
| `bg-background` | `--background` | Page background |
| `text-foreground` | `--foreground` | Primary body text |
| `bg-card` | `--card` | Card, surface backgrounds |
| `text-card-foreground` | `--card-foreground` | Text on cards |
| `bg-primary` | `--primary` | Primary action color |
| `text-primary-foreground` | `--primary-foreground` | Text on primary |
| `bg-secondary` | `--secondary` | Secondary surfaces |
| `text-muted-foreground` | `--muted-foreground` | Labels, metadata, captions |
| `bg-muted` | `--muted` | Muted backgrounds |
| `bg-accent` | `--accent` | Badges, CTAs, highlights |
| `text-accent-foreground` | `--accent-foreground` | Text on accent |
| `bg-destructive` | `--destructive` | Error states |
| `text-destructive-foreground` | `--destructive-foreground` | Text on error |
| `border-border` | `--border` | Dividers, outlines |
| `outline-ring` | `--ring` | Focus rings |
| `bg-input` | `--input` | Input backgrounds |
| `bg-success` | `--success` | Success states |
| `bg-warning` | `--warning` | Warning states |

---

## RULE 3: Inline Styles Are FORBIDDEN

`style={{}}` is **FORBIDDEN** unless a value is provably impossible with Tailwind classes. This applies to all files in all products.

**The only legitimate exceptions:**
- Dynamically computed numeric values (e.g., `style={{ height: `${pixels}px` }}` when the value is runtime-computed and no Tailwind class exists)
- CSS custom property injection that Tailwind cannot do: `style={{ '--agent-color': color } as React.CSSProperties}`

```tsx
// ✅ Always use Tailwind
<div className="p-4 rounded-lg border border-border bg-card" />

// ✅ Legitimate exception — runtime computed value
<div style={{ width: `${progressPercent}%` }} />

// ✅ Legitimate exception — CSS custom property injection
<div data-agent="strategist" style={{ '--agent-color': customColor } as React.CSSProperties} />

// ❌ Forbidden — use Tailwind instead
<div style={{ padding: '16px', borderRadius: '8px' }} />
<div style={{ color: 'var(--foreground)' }} />   // Use className="text-foreground"
```

---

## RULE 4: Icons — lucide-react ONLY

All icons **MUST** use `lucide-react`. No other icon library. No inline SVG for standard icons.

```tsx
// ✅
import { ArrowRight, Check, AlertTriangle, ChevronDown } from 'lucide-react'
<ArrowRight className="h-4 w-4" />

// ❌
import { FaArrowRight } from 'react-icons/fa'
<svg viewBox="..."><path d="..." /></svg>   // custom inline SVG for standard icons
```

---

## RULE 5: Typography — Use Font Classes

Three semantic font families. Always use the class, never hardcode font names.

| Role | Tailwind Class | CSS Variable | Usage |
|------|---------------|-------------|-------|
| Headings, display | `font-serif` | `--font-serif` | H1–H3, grade badges, emphasis |
| Technical, code-like | `font-mono` | `--font-mono` | Signal titles, data, code |
| Body, UI | `font-sans` | `--font-body` | Labels, buttons, navigation, paragraphs |

```tsx
// ✅
<h1 className="font-serif text-3xl font-bold text-foreground">Report Title</h1>
<span className="font-mono text-sm text-muted-foreground">S-TIER</span>
<p className="font-sans text-base text-foreground">Body copy</p>

// ❌
<h1 style={{ fontFamily: 'Playfair Display' }}>...</h1>
<span className="font-['DM_Mono']">...</span>
```

Font values (which Google Font is used for each role) are set by the active theme in CMS and injected at the root layout — never hardcode font names.

---

## The UI Library System

`@atta/ui` ships four component libraries (`basic`, `animate`, `retro`, `brutal`). Each consumer uses exactly one, resolved either at build time or at runtime.

```tsx
// ✅ Always import from the default alias — resolves to the active library
import { Button, Card, Badge, Input } from '@atta/ui'

// ❌ Don't hard-switch libraries in component code
import { Button } from '@atta/ui/brutal/components'   // unless specifically required
```

Shared cross-library primitives (`Heading`, `Text`, `Flex`, `AgentThinkingText`) live in `@atta/ui/shared` and are always available regardless of active library.

**For the full architecture** — build-time generation, runtime switching, adding apps, debugging resolution — see [`.claude/skills/ui-library-system/SKILL.md`](../ui-library-system/SKILL.md).

---

## Theme Loading from CMS

Colors, fonts, and the active component library are **not hardcoded** — they come from the CMS, and every consumer's root `layout.tsx` loads them through `NextWebShell`, which injects the CSS custom properties and font links and wraps the tree in the library/auth/toast providers.

That is the whole contract this skill needs you to know. What you must never do:

```tsx
// ✅ Theme values reach components as CSS variables via semantic tokens
<div className="bg-background text-foreground" />

// ❌ Never call the CMS from inside a component
const theme = await client.fetch(`*[_type == "uiTheme"][0]`)

// ❌ Never replicate what NextWebShell does
<style>{`:root { --background: ${color} }`}</style>
```

**For everything else** — which config document a consumer reads, the typed query functions, the SSR loading sequence, the root-layout pattern, `styleId` conventions, font loading, the color-scheme toggle, and how to wire up a new consumer's theme — see [`.claude/skills/ui-cms-theme/SKILL.md`](../ui-cms-theme/SKILL.md), which owns that domain.

> **Why this skill names no consumer:** `@atta/ui` does not import any product, so this skill does not know any product's name either. Product-to-config mapping lives in the CMS skills and `packages/cms/CLAUDE.md`. A doc that enumerates consumers goes stale every time one is added, renamed, or retired — which is a coupling, not a convenience.

---

## `@atta/ui/topbar` `TopBar` — responsive contract

`TopBar` from `@atta/ui/topbar` is the shared topbar used by every consumer's signed-in app chrome (consumers without auth mount it via `withAuth={false}`). It exposes four mountable slots:

| Slot | Where it renders ≥ md | Where it renders < md |
|------|----------------------|-----------------------|
| `signedInLinks` (centered nav links) | Absolutely centered between logo and the right cluster | Inside the hamburger sheet, stacked vertically with `h-14` rows. **Ignored when `withAuth={false}`.** |
| `extraActions` (right-cluster buttons) | In the right cluster, immediately after `ColorSchemeToggle` (`withAuth={false}`) or **immediately before** `accountMenu` (`withAuth={true}`, signed in only) | Inside the hamburger sheet — below the nav links (`withAuth={false}`), or below the nav links and above `accountMenu` (`withAuth={true}`) |
| `accountMenu` (Sign out / `<UserButton/>`) | At the end of the right cluster | Inside the hamburger sheet, **below** `extraActions`. **Ignored when `withAuth={false}`.** |
| `SignInButton` (signed-out only) | In the right cluster, alone | Inside the hamburger sheet. **Ignored when `withAuth={false}`.** |

**Below `md` the topbar collapses to: logo · `ColorSchemeToggle` · hamburger.** Nothing else renders inline. The hamburger renders unconditionally below `md` because there is always at least Sign-in or account UI to surface (`withAuth={true}`) or nav links (`withAuth={false}`).

**`extraActions` on `withAuth={false}`** (#544): unlike `signedInLinks`/`accountMenu`/`SignInButton`, `extraActions` is NOT gated on auth mode — it renders unconditionally on both `TopBarWithAuth` and `TopBarNoAuth`, since there is no signed-in state to gate it on in the no-auth variant. Use it for content that must appear regardless of auth (e.g. a product switch next to `ColorSchemeToggle`) even on a `withAuth={false}` consumer.

**`TopBarLink.label` takes a `ReactNode`, not just a `string`.** A plain string renders exactly as before — every existing consumer's `links`/`signedInLinks` array is unaffected. Passing a decorated node instead (e.g. a label wrapped in a small self-contained client component) renders that node in the same slot, in both the desktop centered nav and the mobile sheet row, with no other change to `TopBar` itself. Vinaya's `ElectricLabel` (`apps/vinaya/web/src/app/(site)/_components/ElectricLabel.tsx`) is the first consumer: it self-detects whether its own `href` is the active route (via `usePathname()`, mirroring `TopBar`'s own `isActive`) and renders a `<canvas>` accent only then — `TopBar` stays agnostic to what a decorated label actually does.

**`links`/`signedInLinks` accept `TopBarNavItem[]` — a `TopBarLink | TopBarLinkGroup` union.** A group is discriminated by carrying `items: TopBarGroupItem[]` (a flat `TopBarLink` never has that key). `TopBarLink[]` remains assignable wherever `TopBarNavItem[]` is expected, so every existing flat-array consumer compiles and renders unchanged — nothing about the union is opt-in per consumer, it's just a wider type that nobody has to touch until they actually want a group.

- **Desktop (≥ md):** a flat item renders exactly as before, a plain `NextLink`. A group renders its own `NavigationMenu` instance (library-resolved via `useComponents()`, basic fallback — same precedent as `ChromeFrame`/`Button` above) sitting inline among the flat links: a trigger styled to match `NextLink variant='nav'` metrics (`text-xs`, `text-muted-foreground` / `hover:text-primary`, active `text-primary font-medium` — active means *any* item inside the group is active), and a panel listing each item as icon + label + optional muted one-line `description`. The trigger is a real button (Radix `NavigationMenuTrigger`) — it never nests inside a `NextLink`/`<a>`, and a group never carries its own `href`; only its items navigate.
- **Mobile (< md, inside the hamburger sheet):** a group renders a non-navigating header row (icon + label, muted, `h-14` like its siblings) followed by its items as the same `SheetClose`+`NextLink` rows flat links use, just indented — there is no dropdown inside the sheet.
- **Keying:** groups have no `href`, so they key on their first item's `href` (falling back to the label as a string) rather than array index — never index-key a group sitting next to href-keyed flat siblings.
- **Icons:** `TopBarLink`/`TopBarGroupItem` both carry an optional `icon?: ReactNode`, rendered before the label in the desktop row and the sheet row. When absent, the row's markup is byte-identical to before the icon slot existed — there's no empty wrapper span waiting for an icon that never comes.

When wiring an action that belongs in the right cluster (Settings gear, theme switcher, owner-only buttons): use `extraActions` and trust the responsive contract — your button will appear in the desktop cluster and inside the mobile sheet automatically. Do NOT manually duplicate it in a custom mobile row; that creates two-place-to-fix drift.

When a button has both icon and label (Sign out, Settings, Theme): always render the label text. Do **not** wrap it in `<span className='hidden md:inline'>` — the label is hidden in the desktop cluster only by the topbar's own breakpoint, not by per-button visibility classes. Inside the mobile sheet the label needs to be visible.

These icon+label buttons (Sign out, Settings, Sign in) need no per-call-site className for vertical alignment — `Button` itself defaults to `leading-none` in every library (see `.claude/skills/ui-library-system/SKILL.md`'s wrapper-pattern examples). Never re-add `leading-none` at a call site; if a button's label still looks vertically off against its icon, the fix belongs in the shared `Button` wrapper, not in the consumer.

**The nav frame is library-resolved via `ChromeFrame`** (#621). The shared TopBar renders its content through `useComponents().ChromeFrame` with `variant='topbar'` (falling back to basic's flush frame during the runtime library-import window), so the *edge treatment* is each library's own: the flush libraries (basic/animate/brutal) render a full-width `border-b` bar; **retro** wraps it in its own Card with a small `px-2 pt-2` margin — the "floating card" look — so its offset shadow has room to breathe. This is why the same TopBar reads as flush chrome on animate and a detached card on retro **without a `library === '…'` branch** and without leaking retro's spacing onto other products: the float lives only in `retro/components/chrome/chrome-frame.tsx`. The earlier `bg-secondary`-token approach (this note's prior wording) is superseded — the token gave every library the same frame band, which is precisely the per-library difference `ChromeFrame` restores. The same component (`variant: 'topbar' | 'bar' | 'rail' | 'panel'`) skins the sidebar rails (`variant='rail'`), content panels (`variant='panel'`), and generic horizontal chrome bars (`variant='bar'` — the `/docs` sticky breadcrumb). Full architecture: `.claude/skills/ui-library-system/SKILL.md`.

The contract lives at `packages/ui/topbar/index.tsx` (single source of truth). Adding a new slot (or changing where `extraActions` renders) requires updating every consumer's mental model — touch with care.

---

## Constraining a shared primitive at the call site (not in the primitive)

A library's primitive can carry layout constraints that are right everywhere except in
one container. The canonical case: `retro`'s `installed/badge.tsx` ships
`whitespace-nowrap` + a fixed `h-5` + `overflow-hidden`, which is correct for a free-floating
badge but clips inside a `table-fixed` column, where the column never grows to fit its
content.

**Relax the constraint on the container's children, not in the shared component.** A
child-selector class on the cell wrapper overrides the primitive's own utility class without
touching a component other consumers depend on:

```tsx
// ✅ The constraint belongs to THIS table's fixed layout, not to the badge
const LABEL_CELL =
  'flex min-w-0 flex-wrap gap-1 [&>*]:h-auto [&>*]:max-w-full [&>*]:overflow-visible [&>*]:break-words [&>*]:whitespace-normal'
<TableCell><div className={LABEL_CELL}>{labels.map(l => <LabelBadge key={l} label={l} />)}</div></TableCell>

// ❌ Editing the shared badge (or its consumers' wrapper) to fix one table
```

**Know why it wins — it is cascade order, not specificity.** `[&>*]:whitespace-normal>*` and
the badge's own `.whitespace-nowrap` are **equal** specificity `(0,1,0)`: the `>*` is a
universal selector and contributes nothing. The override lands only because Tailwind emits
variant-modified utilities *after* bare ones, so the later rule wins on source order. Do not
generalize this to "child selectors outrank utilities" — against a later-emitted utility,
across cascade layers, or against a `tailwind-merge`d class on the *same* element, the same
trick is a silent no-op. When you need to actually outrank rather than out-order, raise
specificity deliberately (an extra class on the selector), or set the value on the element
that owns it.

The reasoning test: *would every other consumer want this change?* If yes, it belongs in the
`components/interactive/` wrapper (see RULE 1b). If it only holds inside your container, it
belongs on your container. Either way it never goes in `installed/`.

Live example: `apps/vinaya/web`'s `studio/backlog/_components/BacklogTable.tsx` (#624).
Note that `table-fixed` `w-[..%]` widths are one 100% budget — widening one column means
rebalancing the whole set, not just editing one value.

---

## Layout Philosophy

These rules apply to all products:

- **Single column, editorial layout** — not a dashboard
- **Generous whitespace** — premium product feel
- **Information density increases as user scrolls** — heaviest content at bottom
- **Decision anchors** (grade, primary CTA, key result) are always the most visually dominant element
- Must pass the **Print Test** — content should read well printed on paper, not just on screen

---

## Anti-patterns

| Anti-pattern | Rule |
|-------------|------|
| `<button>` instead of `<Button>` | RULE 1 — use UI components |
| Custom hand-rolled Card/Badge/Input | RULE 1 — extend shadcn/ui |
| Custom tab bar built from `<Button>` + state | RULE 1b — add `Tabs` to `@atta/ui` |
| Custom accordion built from `useState` + `<div>` | RULE 1b — add `Accordion` to `@atta/ui` |
| "I'll inline it just this once" | RULE 1b — no one-offs, add it to the library |
| `bg-[#1A1610]` | RULE 2 — use CSS variable class |
| `style={{ color: '#E8D5B7' }}` | RULE 2 + RULE 3 |
| `style={{ padding: '16px' }}` | RULE 3 — use Tailwind |
| `import { FaArrow } from 'react-icons/fa'` | RULE 4 — lucide-react only |
| `fontFamily: 'Playfair Display'` | RULE 5 — use font-serif class |
| Hardcoded Google Fonts URL in layout | Theme system — use NextWebShell |
| Calling CMS directly in a component | Use typed queries from `@atta/cms` |
| Different `<style>` block per component | Theme CSS is global, injected once at root |
