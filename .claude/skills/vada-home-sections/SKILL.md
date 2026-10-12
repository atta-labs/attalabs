---
name: vada-home-sections
description: How the Vāda home page is built — the scroll-driven Three.js hero (Outside Read's four reviewers around the Synthesizer) and the four landing sections below it in Vinaya's landing language (SplitSection, the team cards, the VadaAgent sphere wrappers, text reveals, scroll hooks).
---

# Vāda Home — Hero and Landing Sections

## Context

The home page (`apps/vada-ai/web/src/app/(main)/page.tsx`) is two things stacked: a pinned, scroll-driven **hero** that plays one deliberation, then four **landing sections** in Vinaya Portal's landing language. Everything on the page tells the product as published: what the hero runs and what the sections claim must match a real team in `packages/agents/vada-deliberation/yamls/` and what `/teams` and `/mcp` say. When the page and the product disagree, the page is wrong.

Two rules disambiguate most questions:

- **Agents are drawn with our components, never invented.** In the sections, every agent is a `VadaAgent` sphere (through `landing/ReviewerAgent.tsx`); in the hero, the 3D spheres wear the agents' real face SVGs. No placeholder spheres, dots standing in for agents, or new 3D scenes in the sections.
- **A landing section says little.** One title, one subtitle, one visual. Detail belongs on `/teams` and `/mcp`; a section links there instead of reproducing it.

---

## Architecture

```
(main)/page.tsx                    HomeHero + SectionsWithCanvas
(main)/components/
├── home/                          the hero
│   ├── HomeHero.tsx               title lockup (LetterReveal), scroll cue, renders HomeCanvas
│   ├── HomeCanvas.tsx             the pinned hero track, headline/sub spans, label overlay
│   ├── useHomeCanvas.ts           useHeroScrolled (the "camera has tipped" flag)
│   ├── DeliberateAction.tsx       the sign-in-aware "go to /deliberate" button (label prop)
│   └── fabric/                    the Three.js scene
│       ├── HeroFabric3D.tsx       the script: hub, reviewers, hub text, display names
│       ├── fabric-scene.js        scene, camera, hub painting, labels and link lines
│       ├── agent-ring-3d.js       the spheres, question and answer dots, timing
│       ├── agent-face-canvases.tsx  face SVGs rasterised to canvases
│       ├── field-3d.js, floaters.js the background fabric
│       └── tokens.js              CSS tokens → Three.js colours
├── SectionsWithCanvas.tsx         the four sections, in order
└── landing/                       the sections
    ├── SplitSection.tsx           two-column shell: copy one side, visual the other
    ├── LandingSection.tsx         single-column shell (background token + container)
    ├── SectionHeading.tsx         SectionTitle / SectionSubtitle / SectionHeader / HEADER_MARGIN
    ├── WipeReveal.tsx             the clip-path title wipe
    ├── LandingInteractions.tsx    useSeen / useEnterProgress / usePinProgress / useReducedMotion …
    ├── ReviewerAgent.tsx          ReviewerAgent + RoleAgent: memoized VadaAgent wrappers
    ├── reviewers.ts               the vendor slots shown (vendor, model, colour class)
    ├── IndependentSection.tsx     01
    ├── RoomsSection.tsx           02
    ├── RecordSection.tsx          03
    └── WhereYouWorkSection.tsx    04
```

`LandingInteractions.tsx`, `SectionHeading.tsx`, `WipeReveal.tsx`, `UnderlineLink.tsx` and `pin-math.ts` are copies of Vinaya Portal's (`apps/vinaya-portal/web/src/app/(site)/_components/landing/`). Port further Vinaya patterns from there rather than reinventing them.

---

## The hero

### What it plays

The scene runs Vāda's **Outside Read** team (`vada-fusion-native.yaml`): four reviewers answering in parallel, each alone, and the Synthesizer writing the result from their answers. In order, as the hero track scrolls:

1. **Question.** The hub (the Synthesizer, large, at the front) shows QUESTION and "Should we ship it?". The four reviewers sit on an arc behind it. A line joins each reviewer to the hub.
2. **The question reaches the reviewers.** A dot pops up at each reviewer's rim. The question does not travel out of the hub: the Synthesizer never hands out work, the engine sends the question to each reviewer.
3. **Live deliberation.** The hub shows a log row per reviewer (the tool it works with), typing in.
4. **Answers.** Each reviewer's answer dot travels to the hub; as it lands, that reviewer's line goes from its colour to muted and stays.
5. **Verdict.** The headline becomes the decision, with the tally and the one dissent named; the camera leans in.

### Invariants

- **The cast follows a real team.** `HeroFabric3D.tsx` keeps only the roles in `PANEL_ROLES` (Outside Read's: strategist, critic, devils_advocate, researcher). Change the cast only to match another published team.
- **Display names are hero-only.** `HERO_NAMES` shows the Devil's Advocate as **Reframer** (its prompt audits the question's framing). The agents' real names stay everywhere else in the product.
- **Colours come from tokens, read at runtime.** `tokens.js` resolves `--agent-*`, `--foreground`, `--card`, … and the scene re-reads them on theme change. Never hardcode a colour in the scene.
- **Hub text is one type scale** (`LABEL_PX`, `HEADLINE_PX`, `DETAIL_PX` in `fabric-scene.js`), all `--font-mono`. The headline keeps one size from question to decision, and the gaps between the slots are what keep it readable. Grow a size only with the spacing.
- **The links are 2D lines, not 3D.** One SVG line per reviewer in the label overlay, drawn edge to edge between the projected spheres every frame, so no sphere can hide or fragment it. A 3D tube aliased and broke apart as the camera tipped, and the hub hid it.
- **`.js` scene files are not scanned by Tailwind.** Elements they create get inline styles, or class strings passed in from the `.tsx`.
- **The wordmark leaves at once on scroll** (only fading back in), so the scroll-driven headline can never come in underneath a wordmark still fading out.

---

## The landing sections

### The language (from Vinaya's landing)

- **One title style everywhere:** `SectionTitle size='compact'` + `SectionSubtitle`. Never a one-off heading size.
- **Text is always animated.** Titles wipe in line by line (`WipeReveal`), subtitles after them. A new text block gets a reveal too.
- **Each section's background differs from the next one's** (`bg-secondary`, `bg-background`, `bg-secondary/40`, `bg-background`).
- **Copy and visual alternate sides** in the two-column sections (`SplitSection reverse`).

### The four sections

| # | Section | Shell | Visual |
|---|---|---|---|
| 01 | Independent views. Clearer judgment. | `SplitSection` | The question and four reviewers' one-line answers, arriving on scroll; the one that disagrees is marked |
| 02 | Pick your room. | `LandingSection` | Three cards, one per published team: name, one line, its agents; each card links to its team page |
| 03 | The conclusion shows its work. | `SplitSection` | A result card building in: agreement, conflict, transcript, then the Outside Read audit |
| 04 | Use Vāda where you work. | `SplitSection fill={false}` | An assistant session calling `vada__deliberate`; the web-app and MCP calls to action |

Claims to keep true: the audit (blind critic, fact-checker) is Outside Read only; reviewer slots are chosen by the user, any vendor with a key; 04's call is the real tool and parameter (`vada__deliberate` takes `team`; `spec_id` belongs to `vada__consult`).

### Rules that cost time before

- **Spheres: `md` minimum, never scaled.** Below `md` the particle ring crowds the face and reads off-centre and faint. Never put a sphere inside a CSS transform or `zoom`: it tracks its own screen position for its particle canvas, and scaling puts the two out of step.
- **Spheres go through `ReviewerAgent` / `RoleAgent`.** They are memoized because every section re-renders on scroll as its progress changes, and a re-rendered sphere visibly ticks. The `shrink-0` wrapper keeps a flex row from squeezing the sphere's canvas. `tight` drops the wrapper's margin for a row that sets its own gap.
- **Aligned cards** reserve heights (title `min-h-[2.3em]`, line `min-h-[3em]`) and push the last row down with `mt-auto`, so rules and rows line up across cards.
- **Three columns only from `xl`.** Below that the team cards stack; three columns at narrower widths break the titles and wrap the spheres.
- **The last section is not a full screen tall** (`fill={false}`): with the footer under it, a full-height section put its title under the header at the bottom of the page.
- **Reveal as soon as content enters** (`useSeen(ref, 1)` for a row of cards): a later threshold leaves a dark, empty screen while the reader scrolls toward it.

---

## Related

- `.claude/skills/ui-components/SKILL.md` — component usage rules
- `.claude/skills/ui-theme-tokens/SKILL.md` — the allowed tokens
- `.claude/skills/ui-canvas-animation/SKILL.md` — `VadaAgent` / `AgentSphere`, the standalone sphere canvas
- `.claude/skills/vinaya-architecture/SKILL.md` — the Vinaya landing these sections follow
