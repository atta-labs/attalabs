# AttaLabs Monorepo

The dev lab where Dani builds AI products. Multiple products live here, sharing infrastructure through common packages. Each product has its own surfaces (web, mobile, MCP, CLI) and documentation.

For the canonical naming and ecosystem framing, see [`apps/atta-ai/specs/atta-naming-decision.md`](apps/atta-ai/specs/atta-naming-decision.md).

---

## Products

| Product | Path | Domain | Description | Status |
|---------|------|--------|-------------|--------|
| [Vāda](apps/vada-ai/) | `apps/vada-ai/` | `vada.attalabs.dev` | Deliberation engine. Standalone product + deliberation layer inside Atta. | Live |
| [Atta](apps/atta-ai/) | `apps/atta-ai/` | TBD (target: `atta.ai`) | Deep-thinking AI. Composed of Vāda + Vitakka + Sati. | Not yet deployed |
| [Vitakka](apps/vitakka-ai/) | `apps/vitakka-ai/` | `vitakka.attalabs.dev` | Situated cognition / focus layer. Standalone + inside Atta. | Scaffold |
| [Herald](apps/herald-ai/) | `apps/herald-ai/` | `herald.attalabs.dev` | Forensic CV-to-job-description match tool. Standalone. | Active |
| [Cetana](apps/cetana-ai/) | `apps/cetana-ai/` | (internal) → `cetana.attalabs.dev` if/when published | Local Mac orchestration for Atta team development. Internal today; conditional future public product. | V0/V0.5 in dev |

**Atta** is the deep-thinking AI consumer product (composed of Vāda + Vitakka + Sati). It lives inside the AttaLabs lab today; when ready, it moves to its own domain (target: `atta.ai`).

**The Atta Engine** (`@atta/engine` + `@atta/adapter-langgraph`) is the agent-flow execution substrate. Powers Vāda today; will power Vitakka and Atta. May be opened up later.

Naming: all product brands are bare (no `-AI` suffix). Pāli names are mandatory inside Atta; elective elsewhere. See the naming-decision spec for details.

## Shared Packages

| Package | Description |
|---------|-------------|
| [@atta/engine](packages/engine/) | Plan compiler — Agent/Workflow/Team types, validation, terminal states |
| [@atta/adapter-langgraph](packages/adapter-langgraph/) | LangGraph execution + multi-vendor cognitive router |
| [@atta/agents](packages/agents/) | Agent primitives |
| [@atta/auth](packages/auth/) | Clerk wrapper + bearer-token validation |
| [@atta/crypto](packages/crypto/) | Envelope encryption + API key generation |
| [@atta/db](packages/db/) | Drizzle ORM + Neon Postgres client |
| [@atta/ui](packages/ui/) | UI components + libraries (shadcn/ui, Tailwind v4, canvas particle system) |
| [@atta/cms](packages/cms/) | Sanity CMS schemas and queries |
| [@atta/identity](packages/identity/) | BYOK key probing + Ollama discovery utilities |
| [@atta/models](packages/models/) | AI model catalog — dynamic fetch from models.dev + curated overlay |
| [@atta/storage](packages/storage/) | Cloudflare R2 storage client |
| [@atta/typescript-config](packages/typescript-config/) | Shared TypeScript configs |

The `@atta/*` namespace is the monorepo's name, not a brand. Code for any AttaLabs product can live under it.

## Tech Stack

Turborepo + Bun | Next.js 16 | React 19 | Tailwind CSS v4 | shadcn/ui | Sanity | Clerk | Neon Postgres + Drizzle ORM | Cloudflare R2 | LangGraph | Anthropic / Google / OpenAI / xAI SDKs | Biome

## Getting Started

```bash
# Install dependencies
bun install

# Start a specific product
bun run dev:herald       # Herald
bun run dev:atta         # Atta (currently serves attalabs.dev hub)
bun run dev:vitakka      # Vitakka (scaffold)
bun run dev:vada         # Vāda

# Start all
bun run dev

# Quality checks
bun run check            # Typecheck + lint + format
```

## Monorepo Structure

```
attaai/   (repo name; rename TBD)
├── apps/
│   ├── herald-ai/       # web/ + mobile/ + mcp/
│   ├── atta-ai/         # web/ (serves attalabs.dev hub today)
│   ├── vitakka-ai/      # scaffold
│   ├── vada-ai/         # web/ + mcp/
│   └── cetana-ai/       # cli/ + coordinator/ + specs/
├── packages/
│   ├── engine/          # @atta/engine
│   ├── adapter-langgraph/
│   ├── ui/              # @atta/ui
│   ├── cms/             # @atta/cms
│   └── ...
└── turbo.json
```

Each product has the surfaces it needs — not every product has web + mobile + MCP. Cetana is CLI + coordinator only. Vāda is web + MCP.
