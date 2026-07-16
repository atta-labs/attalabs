# Atta AI Web — Claude Code Instructions

The ecosystem hub Next.js app, deployed to `attalabs.dev`. This is the parent surface — not a product UI, but the doorway to the entire ecosystem. It links to product subdomains (`vada.attalabs.dev`, `vitakka.attalabs.dev`, `sati.attalabs.dev`) and serves as the Atta brand identity page.

---

## Architecture

```
apps/atta-ai/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout — NextWebShell + IdentityProvider
│   │   └── page.tsx           # Homepage (server component) — logo + headline + product cards
│   ├── components/
│   │   └── home-canvas.tsx    # AIACanvas client component — fabric bg + central sphere
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

- **Renders Atta's CMS identity, not attalabs' own** — the root layout calls `getProductCms('atta')`. An `attalabsConfig` singleton exists in the central `attalabs` project (`l5n0n8nn`) but has never been wired to anything; whether this hub should adopt it is an open product decision (D-125 surfaced the borrow without changing it).
- **No DB** — this is a pure marketing/hub surface. No Drizzle, no Neon.
- **No engine** — no `@atta/engine` or `@atta/adapter-langgraph`.
- **Homepage is public** — no auth required to view. Middleware only gates future `/account` and `/settings` routes.
- **Single central `AIASphere`** with `color='var(--primary)'` at low matrix opacity. Brand restraint over visual density.
- **Sati anchor word** "Remember." is a placeholder — Principal may swap it.

---

## Known TODOs (in order)

1. **Decide whether the hub adopts `attalabsConfig`** — it currently renders Atta's identity via `getProductCms('atta')`. The `attalabsConfig` singleton exists and is unread.
2. **Real homepage design** — V1 is C-thin. Polish in a later dedicated session.
3. **YAML flow visualizer at `/flows`** — Track A item 4. Foundation route for the YAML visualizer.
4. **Documentation routes** — `/docs` or similar for ecosystem documentation.
5. **Auth-gated account routes** — `/account`, `/settings` when ecosystem needs them. Middleware is already wired to protect these paths.
6. **Sati anchor word** — "Remember." is a placeholder. Confirm or swap.

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
