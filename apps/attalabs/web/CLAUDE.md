# AttaLabs Web — Claude Code Instructions

The ecosystem hub Next.js app, deployed to `attalabs.dev` — the doorway to the ecosystem, not a product UI itself. Links to product subdomains (`vada.attalabs.dev`, `vitakka.attalabs.dev`, `sati.attalabs.dev`) and serves as attalabs' own identity page.

---

## Architecture

```
apps/attalabs/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout — NextWebShell + IdentityProvider. No footer.
│   │   ├── globals.css        # App-local styles (scrollbar hiding) over @atta/ui's globals
│   │   └── page.tsx           # Homepage (server component) — resolves branding, renders EcosystemHero
│   ├── components/home/
│   │   └── EcosystemHero.tsx  # The whole home page: four scroll sections + the scroll timeline
│   ├── middleware.ts          # Clerk middleware — homepage public, no protected routes yet
│   └── env.d.ts
├── vercel.json
├── .env.example
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## Key Design Decisions

- **Renders its own CMS identity** — the root layout calls `getProductCms('attalabs')`, resolving `attalabsConfig`/`branding-attalabs` from the central `attalabs` project (`l5n0n8nn`) directly. It no longer borrows Atta's.
- **No DB** — this is a pure marketing/hub surface. No Drizzle, no Neon.
- **No engine** — no `@atta/engine` or `@atta/adapter-langgraph`.
- **Homepage is public** — no auth required to view. Middleware only gates future `/account` and `/settings` routes.
- **The home page is four full-height scroll sections**, one per product — Vāda, Herald, Vinaya, Atta Engine — each carrying that product's own real canvas mark from `@atta/ui/canvas`, never a redrawn approximation. A single vertical timeline threads all four; its head tracks scroll position and wakes each mark as it passes (identity colours, matrix rain, the harness gripping `main`, the Engine's gear turning), releasing again on the way back up. See Issue #710's Boundary for the binding design record.
- **Marks are sized, never CSS-scaled.** The mark diameter shrinks on narrow viewports through `MarkSizeContext`. A `transform: scale()` would double-scale the sphere canvases — `use-aia-canvas.ts` measures the scaled rect and writes it back as a CSS width, which the transform then scales again.
- **The native scrollbar is hidden** while this page is mounted (the timeline is the scroll indicator), via a class toggled on `<html>` and removed on unmount.

---

## Known TODOs (in order)

2. **YAML flow visualizer at `/flows`** — Track A item 4.
3. **Documentation routes** — `/docs` or similar for ecosystem documentation.
4. **Auth-gated account routes** — `/account`, `/settings` when ecosystem needs them (middleware already wired — see Key Design Decisions).
5. **Sati anchor word** — "Remember." is a placeholder. Confirm or swap.

---

## Domain

| Environment | URL |
|-------------|-----|
| Production | `attalabs.dev` |
| Local dev | `attalabs.test` |

---

## Local Dev

```bash
bun run dev:atta    # from monorepo root — starts on port 3001
```

---

## Related

- [Atta AI Overview](../CLAUDE.md)
- [Root CLAUDE.md](../../../CLAUDE.md)
- [.claude/skills/auth/SKILL.md](../../../.claude/skills/auth/SKILL.md)
- [.claude/skills/ui-canvas-animation/SKILL.md](../../../.claude/skills/ui-canvas-animation/SKILL.md)
- [.claude/skills/ui-branding/SKILL.md](../../../.claude/skills/ui-branding/SKILL.md)
