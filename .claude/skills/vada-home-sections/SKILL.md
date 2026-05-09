---
name: vada-home-sections
description: Primitives and patterns for building Vāda home-page sections below the canvas hero — SectionWrapper, SectionLabel, StatusFooter, TwoColumnSection, and the section composition convention.
---

# Vāda Home Sections — Composition System

The Vāda home page (`apps/vada-ai/web/src/app/(main)/(home)/`) is an editorial scroll of numbered sections below the canvas hero. Each section follows a shared visual language: dark background, generous whitespace, monospace labels, serif display headlines, a single green accent (`text-success`), and — where it fits — a two-column content/diagram layout.

This skill documents the reusable primitives and the convention every new section should follow.

---

## File Layout

```
apps/vada-ai/web/src/app/(main)/(home)/
├── page.tsx                                  # Renders HomeCanvas + all sections in order
└── components/
    ├── primitives/                           # Cross-section building blocks
    │   ├── SectionWrapper.tsx
    │   ├── SectionLabel.tsx
    │   ├── StatusFooter.tsx
    │   └── TwoColumnSection.tsx
    └── sections/                             # One file per numbered section
        ├── PositioningSection.tsx            # §2 — canonical example
        ├── PositioningDiagram.tsx            # Section-specific sub-component
        ├── IntroSection.tsx
        ├── PullQuoteSection.tsx
        ├── PillarsSection.tsx
        ├── ProtocolSection.tsx
        └── ArchitectureSection.tsx
```

Each section lives in its own file, exports a named function, and composes primitives + optional section-specific sub-components (e.g. `PositioningDiagram`).

---

## Primitives

### `SectionWrapper`

The outer `<section>`. Provides `bg-background`, `py-24 md:py-32`, and a centered inner container capped at `max-w-6xl`. Accepts optional `id`, `className`, and `innerClassName` for overrides.

```tsx
import { SectionWrapper } from '../primitives/SectionWrapper'

<SectionWrapper id='positioning'>
  …
</SectionWrapper>
```

### `SectionLabel`

The small monospace uppercase label at the top of each section (e.g. `02 / Positioning`). Uses `text-muted-foreground` by default — do not colorize unless the section is the single exception.

```tsx
<SectionLabel>02 / Positioning</SectionLabel>
```

### `StatusFooter`

The closing status block: a `STATUS: {LABEL}` line in mono uppercase over an italic `text-muted-foreground` body. Use to reinforce a locked protocol or constraint at the bottom of a section.

```tsx
<StatusFooter
  label='Closed-Room Protocol'
  body='No external tools. No web access. No code execution. …'
/>
```

### `TwoColumnSection`

A responsive 2-column grid: stacks on mobile (`< md`), splits 50/50 on desktop, vertically aligned. Pass `className` to override the column ratio (e.g. `md:grid-cols-[1.2fr_1fr]` for text-heavy layouts like §2).

```tsx
<TwoColumnSection
  className='md:grid-cols-[1.2fr_1fr]'
  left={<SectionBody />}
  right={<SectionDiagram />}
/>
```

On mobile the left slot always renders first (content before diagram).

---

## Section Composition Recipe

Every numbered section should follow this shape:

```tsx
import { Heading, Text } from '@atta/ui'
import { SectionLabel } from '../primitives/SectionLabel'
import { SectionWrapper } from '../primitives/SectionWrapper'
import { StatusFooter } from '../primitives/StatusFooter'
import { TwoColumnSection } from '../primitives/TwoColumnSection'

export function MySection() {
  return (
    <SectionWrapper id='my-section'>
      <TwoColumnSection
        left={
          <div className='flex flex-col gap-8'>
            <SectionLabel>0N / Section Name</SectionLabel>
            <Heading level={2} className='font-serif text-4xl md:text-6xl text-success leading-tight'>
              <span className='block'>First sentence.</span>
              <span className='block'>Parallel sentence.</span>
            </Heading>
            <Text as='p' className='text-muted-foreground max-w-xl leading-relaxed'>
              Body copy.
            </Text>
            <blockquote className='border-l-4 border-success pl-5 py-1 max-w-xl'>
              <Text as='p' className='text-foreground leading-relaxed'>
                Key line that carries the section's thesis.
              </Text>
            </blockquote>
            <StatusFooter label='Status Label' body='Closing italic body.' />
          </div>
        }
        right={<SectionSpecificDiagram />}
      />
    </SectionWrapper>
  )
}
```

Single-column sections (§1 Intro, §3 Pull Quote, etc.) skip `TwoColumnSection` and lay out content directly inside `SectionWrapper`.

---

## Wiring Into the Home Page

Register sections in `page.tsx` in display order under the `relative z-10` wrapper, directly below `HomeCanvas`:

```tsx
<div className='relative z-10'>
  <PositioningSection />
  <IntroSection />
  <PullQuoteSection />
  …
</div>
```

The numbered label (`02 / …`) is editorial — it reflects the user's scroll order, not the DOM position. Renumber labels when the section order changes.

---

## Style Rules (Non-Negotiable)

These are enforced across every section:

- **Semantic tokens only.** `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `text-success`, `border-border`, `border-success/40`, etc. **Never** hardcoded hex, `oklch(…)`, `hsl(…)`, or palette classes like `text-green-500`. Full reference: `.claude/skills/ui-theme-tokens/SKILL.md`.
- **No raw HTML primitives.** Use `Heading` / `Text` from `@atta/ui` — never raw `<h1>` / `<p>`. `<section>`, `<div>`, `<blockquote>` are semantic HTML and allowed.
- **Icons only from `lucide-react`.**
- **No inline styles.** `style={{}}` is forbidden except for runtime-computed numeric values.
- **The green accent is `text-success`** — the Vāda-specific green token at `oklch(65% 0.17 145)`, defined in `packages/ui/styles/globals.css`. Never introduce a new green variable.
- **Typography:** `font-serif` for headlines and the `Vāda` wordmark inside diagrams, `font-mono` for section labels, status lines, diagram labels, and corner system tags; `font-sans` is the default for body copy.

---

## Agent Colors

Four locked colors — Strategist / Critic / Devil's Advocate / Synthesizer — defined in `packages/ui/styles/globals.css` as `--agent-strategist`, `--agent-critic`, `--agent-devils-advocate`, `--agent-synthesizer`. They are **not** mapped to Tailwind utility classes; use them via the `data-agent` cascade or as direct CSS-variable references in SVG attributes.

**DOM-element pattern (cascade):** set `data-agent="…"` on the container, which globally sets `--agent-color`. Then reference it through arbitrary Tailwind property syntax.

```tsx
<div
  data-agent='strategist'               // or critic | devils_advocate | synthesizer
  className='border-l-4 [border-left-color:var(--agent-color)] …'
/>
```

**SVG pattern:** reference the variable directly in the attribute value.

```tsx
<circle fill='var(--agent-strategist)' … />
```

Never hardcode the hex/HSL values — they're tuned per product and may be retheme-overridden by the CMS.

---

## Shared Content Primitives

Three cross-section components live in `components/primitives/` and are reused across sections that describe or dramatize the deliberation engine:

### `AgentCard` + `AgentGrid`

`AgentCard` is a single labeled card driven by the `data-agent` cascade — its left border color comes from `--agent-color` set on the DOM element. `AgentGrid` wraps four cards in a responsive 2×2 grid.

```tsx
import { AgentGrid } from '../primitives/AgentGrid'
import type { AgentCardData } from '../primitives/AgentCard'

const AGENTS: AgentCardData[] = [
  { agent: 'strategist', name: 'Strategist', role: 'Maps the landscape.', voice: '…' },
  { agent: 'critic', name: 'Critic', role: 'Finds what is wrong.' },
  // …
]

<AgentGrid agents={AGENTS} />
```

`voice` is optional — omit it for one-line cards (§02 round walkthroughs), include it for full cards with the italic voice line (§03 mechanism overview).

### `ConclusionCard`

Labeled output card with a state tag (`Clean` / `Revised` / `Unconverged`) and a list of fields. Fields accept either just a `label` (for the abstract structural view in §03) or `label + value` (for a concrete conclusion in §02).

```tsx
import { ConclusionCard, type ConclusionField } from '../primitives/ConclusionCard'

<ConclusionCard
  state='Clean'
  fields={[
    { label: 'Recommendation', value: 'Pursue European expansion via partnership.' },
    { label: 'Key condition', value: 'Identify a viable partner within 60 days.' },
    { label: 'Unresolved', value: '…' }
  ]}
/>
```

State tone (success / warning / destructive) is applied automatically to the bullet color and the header pill.

---

## Round Geometry Component

`components/sections/mechanism/RoundGeometry.tsx` renders the four-agent deliberation diagram in one of three states — `orthogonal`, `adversarial`, `convergence`. Reuse it for any visualization of the three-round mechanism. It sizes to its parent (give it a sized container, e.g. `aspect-square`).

```tsx
<div className='aspect-square rounded-md border border-border bg-background/40 p-5'>
  <RoundGeometry state='convergence' />
</div>
```

---

## Provider Icons (BYOK / Model Showcases)

For callouts that display AI model provider logos, use `ProviderIcon` from `@lobehub/icons` (already a dependency of `@atta/ui`):

```tsx
import { ProviderIcon } from '@lobehub/icons'

<ProviderIcon provider='anthropic' size={28} />
```

Supported slugs include `anthropic`, `google`, `openai`, `meta`, `mistral`, `deepseek`, `qwen`, `xai`, `groq`. For a compact callout, render at `size={28}` inside a `flex flex-wrap` row with `opacity-60`. For a full interactive picker, use the `ModelPicker` primitive instead — see `.claude/skills/model-picker/SKILL.md`.

---

## Diagram Conventions

When a section includes a diagram (§2 canonical example):

- **Let it breathe.** Layer boxes sit directly on the section background — no outer wrapper container.
- **Asymmetric flow only.** Arrows go in one direction; never add a return arrow unless the content explicitly describes a round-trip.
- **Corner system tags** (e.g. `SYS.V1_STABLE // NO_EXIT_TRAFFIC`) are `font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60`, bottom-right, no container.
- **Tool rows** (e.g. `SKILLS · SWARMS · PLUGINS · MCP · BROWSERS · RUNNERS`) must stay on a single line — use short labels and `whitespace-nowrap`.

---

## When to Promote a Primitive

A new shared helper belongs in `components/primitives/` when:

1. It will be reused by two or more sections, **and**
2. It encodes a pattern (layout, spacing, typography scheme), not a specific piece of content.

Section-specific sub-components (like `PositioningDiagram`) live in `components/sections/` alongside the section they serve.

---

## Related

- `.claude/skills/ui-components/SKILL.md` — UI component rules across the monorepo
- `.claude/skills/ui-theme-tokens/SKILL.md` — complete list of allowed CSS tokens
- `.claude/skills/ui-canvas-animation/SKILL.md` — the `HomeCanvas` hero above §2
- `apps/vada-ai/web/CLAUDE.md` — Vāda web app architecture
