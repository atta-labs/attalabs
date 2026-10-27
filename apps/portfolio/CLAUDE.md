# Portfolio — Claude Code Instructions

Daniel Estevez's one-page animated portfolio: his story, his career timeline, and links to every current product. A public, read-only marketing page — no auth, no DB, no engine.

---

## Surfaces

| Surface | Path | Package | Status |
|---------|------|---------|--------|
| Web | `web/` | `@atta/portfolio-web` | Built, not yet deployed (no Vercel project / domain) |

---

## Architecture

```
apps/portfolio/web/src/
├── app/
│   ├── layout.tsx              # getProductCms('portfolio') → NextWebShell (withAuth={false})
│   └── page.tsx                # Renders PortfolioPage
├── components/home/
│   ├── PortfolioPage.tsx       # Client root: MotionConfig, fixed nav, scroll progress bar, footer
│   ├── Hero.tsx / Story.tsx / CareerTimeline.tsx / ProductGrid.tsx
│   └── Reveal.tsx              # whileInView fade-and-lift wrapper
└── content/portfolio.ts        # Every fact on the page — profile, story, career, products
```

---

## Rules

- **Copy lives in `content/portfolio.ts`, and only real, already-public facts go there** — Daniel's GitHub profile README and CV. No invented claims; no private CV fields (phone, date of birth).
- **Theme comes from CMS.** `portfolioConfig` lives in the central `attalabs` Sanity project (`l5n0n8nn`); its `userInterface.library` (currently `animate`) is what `generateUIIndex('portfolio')` builds against. Change the look there, not in code.
- **Import primitives from `@atta/ui/components`** (the aliased string) — never a subpath or bare `@atta/ui`.
- **Animation uses `motion/react`.** Reduced motion is handled once by `<MotionConfig reducedMotion='user'>` in `PortfolioPage` — don't add per-component checks.
- Adding a product to the grid: append to `products` in `content/portfolio.ts`.

---

## Local Dev

```bash
bun run dev:portfolio    # from monorepo root — port 3009
```

---

## Related

- [Root CLAUDE.md](../../CLAUDE.md)
- [.claude/skills/ui-cms-theme/SKILL.md](../../.claude/skills/ui-cms-theme/SKILL.md)
- [.claude/skills/ui-library-system/SKILL.md](../../.claude/skills/ui-library-system/SKILL.md)
