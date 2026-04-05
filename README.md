# Atta AI

Ecosystem of AI products. Each product is an independent app with its own domain, sharing infrastructure through common packages.

All names come from Pali: Atta (self), Herald (announcement), Vitakka (applied thought), Vada (deliberation).

---

## Products

| Product | Domain | Description | Status |
|---------|--------|-------------|--------|
| [Herald AI](apps/herald-ai/) | herald.ai | Forensic CV-to-job-description match tool | Active |
| [Atta AI](apps/atta-ai/) | atta.ai | Organization hub | Scaffold |
| [Vitakka AI](apps/vitakka-ai/) | vitakka.ai | Focus and applied thought | Scaffold |
| [Vada AI](apps/vada-ai/) | vada.ai | Deliberation engine | Scaffold |

## Shared Packages

| Package | Description |
|---------|-------------|
| [@atta/ui](packages/ui/) | UI components + libraries (shadcn/ui, Tailwind v4) |
| [@atta/cms](packages/cms/) | Sanity CMS schemas and queries |
| [@atta/typescript-config](packages/typescript-config/) | Shared TypeScript configs |

## Tech Stack

Turborepo + Bun | Next.js 16 | React 19 | Tailwind CSS v4 | shadcn/ui | Sanity | Clerk | Neon Postgres | Drizzle ORM | Vercel AI SDK | Biome

## Getting Started

```bash
# Install dependencies
bun install

# Start a specific product
bun run dev:herald       # Herald AI on port 3000
bun run dev:atta         # Atta AI on port 3001
bun run dev:vitakka      # Vitakka AI on port 3002
bun run dev:vada         # Vada AI on port 3003

# Start all
bun run dev

# Quality checks
bun run check            # Typecheck + lint + format
```

## Monorepo Structure

```
atta-ai/
├── apps/
│   ├── herald-ai/       # web/ + mobile/ + mcp/
│   ├── atta-ai/         # web/ + mobile/
│   ├── vitakka-ai/      # web/ + mobile/ + mcp/
│   └── vada-ai/         # web/ + mobile/ + mcp/
├── packages/
│   ├── ui/              # @atta/ui
│   ├── cms/             # @atta/cms
│   └── typescript-config/
└── turbo.json
```

Each product has surfaces: `web/` (Next.js), `mobile/` (React Native), `mcp/` (MCP server).
