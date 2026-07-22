<!-- logo: figlet "ANSI Shadow" — regenerate with:  figlet -f "ANSI Shadow" "AttaLabs" -->
```
 █████╗ ████████╗████████╗ █████╗ ██╗      █████╗ ██████╗ ███████╗
██╔══██╗╚══██╔══╝╚══██╔══╝██╔══██╗██║     ██╔══██╗██╔══██╗██╔════╝
███████║   ██║      ██║   ███████║██║     ███████║██████╔╝███████╗
██╔══██║   ██║      ██║   ██╔══██║██║     ██╔══██║██╔══██╗╚════██║
██║  ██║   ██║      ██║   ██║  ██║███████╗██║  ██║██████╔╝███████║
╚═╝  ╚═╝   ╚═╝      ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝ ╚══════╝
```

<div align="center">

# AttaLabs

**A lab building thinking tools — deep-reasoning AI, one Turborepo, many products.**

[![Vāda](https://img.shields.io/badge/V%C4%81da-6366F1?style=for-the-badge)](apps/vada-ai/)
[![Atta](https://img.shields.io/badge/Atta-C8980A?style=for-the-badge)](apps/atta-ai/)
[![Herald](https://img.shields.io/badge/Herald-E11D48?style=for-the-badge)](apps/herald-ai/)
[![Vinaya](https://img.shields.io/badge/Vinaya-972E2A?style=for-the-badge)](apps/vinaya/)

![products](https://img.shields.io/badge/products-4-C8980A?style=flat-square)
![packages](https://img.shields.io/badge/packages-12-E8C050?style=flat-square)
![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?style=flat-square&logo=turborepo&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-000000?style=flat-square&logo=bun&logoColor=white)
![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)

</div>

The dev lab where Dani builds AI products. Multiple products live here, sharing infrastructure
through common packages. Each product has its own surfaces (web, mobile, MCP, CLI) and docs.

For the canonical naming and ecosystem framing, see
[`apps/atta-ai/specs/atta-naming-decision.md`](apps/atta-ai/specs/atta-naming-decision.md).

---

## 🧭 Products

| Product | Domain | What it is | Status |
|---------|--------|------------|--------|
| **[Vāda](apps/vada-ai/)** | `vada.attalabs.dev` | Multi-agent **deliberation engine** — structured debate between AI agents. Standalone product *and* the deliberation layer inside Atta. | 🟢 Live |
| **[Atta](apps/atta-ai/)** | target `atta.ai` | The **deep-thinking AI** — the flagship consumer product. | 🟡 Not yet deployed |
| **[Herald](apps/herald-ai/)** | `herald.attalabs.dev` | **Forensic CV ↔ job-description match** — evidence-based audit reports, not vibes. | 🟢 Active |
| **[Vinaya](apps/vinaya/)** | `vinaya.attalabs.dev` | **Governance layer for AI coding agents** — deterministic checks every agent passes before merge. | 🟠 Bootstrap |

> **Atta** is the deep-thinking consumer product. It lives inside the
> AttaLabs lab today; when ready it moves to its own domain (target: `atta.ai`).

---

## ⚙️ The Atta Engine

`@atta/engine` + `@atta/adapter-langgraph` — the agent-flow **execution substrate**. Compiles
Agent / Workflow / Team plans and runs them on LangGraph with a multi-vendor cognitive router.
Powers Vāda today; will power Atta. May be opened up later.

---

## 📦 Shared packages

| Package | Purpose |
|---------|---------|
| [`@atta/engine`](packages/engine/) | Plan compiler — Agent/Workflow/Team types, validation, terminal states |
| [`@atta/adapter-langgraph`](packages/adapter-langgraph/) | LangGraph execution + multi-vendor cognitive router |
| [`@atta/agents`](packages/agents/) | Agent primitives |
| [`@atta/auth`](packages/auth/) | Clerk wrapper + bearer-token validation |
| [`@atta/crypto`](packages/crypto/) | Envelope encryption (AES-256-GCM) + API-key generation |
| [`@atta/db`](packages/db/) | Drizzle ORM + Neon Postgres client |
| [`@atta/ui`](packages/ui/) | Shared UI (shadcn/ui + Tailwind v4) + canvas particle system |
| [`@atta/cms`](packages/cms/) | Sanity schemas, typed queries, theme utilities |
| [`@atta/identity`](packages/identity/) | BYOK key probing, Ollama discovery, migration utilities |
| [`@atta/models`](packages/models/) | AI model catalog — models.dev fetch + curated overlay |
| [`@atta/storage`](packages/storage/) | Cloudflare R2 client + image transforms |
| [`@atta/governance`](packages/governance/) | Repo governance state as files (decisions, projects, doc-owners) |

The `@atta/*` namespace is the monorepo's name, not a brand — any AttaLabs product can live under
it without implying ownership by Atta-the-product.

---

## 🧱 Tech stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + Bun |
| Framework | Next.js 16 (App Router, TypeScript, React 19) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| CMS | Sanity |
| Auth | Clerk (single AttaLabs-wide app) |
| AI | LangGraph + Vercel AI SDK + Anthropic / Google / OpenAI / xAI |
| Database | Neon Postgres + Drizzle ORM |
| Storage | Cloudflare R2 |
| Hosting | Vercel |
| Tooling | Biome · Husky · lint-staged · commitlint |

---

## 🚀 Quick start

```bash
bun install                # install the whole workspace
bun run dev:vada           # or dev:herald · dev:atta
bun run check              # typecheck + lint + format across everything
```

Workspaces: `apps/*/*` and `packages/*`. See the root `package.json` `scripts` for the full,
current task list. Prefer scoped checks while iterating —
`bun run typecheck --filter=<pkg>`.

---

## 🗂️ Structure

```
attalabs/
├─ apps/
│  ├─ vada-ai/       web · mcp
│  ├─ atta-ai/       web · mcp
│  ├─ herald-ai/     web · mobile · mcp
│  └─ vinaya/        web · cli
└─ packages/         engine · adapter-langgraph · ui · cms · db · auth · …
```

Each product carries its own `CLAUDE.md` (overview) and `README.md`. Start there.
