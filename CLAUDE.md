# ⚠️ ABSOLUTE RULE — NEVER COMMIT WITHOUT EXPLICIT INSTRUCTION

**NEVER run `git commit` (or any command that creates a commit) unless the user has explicitly asked you to commit in that message.**

- "Can you commit this?" → commit
- "Commit X" → commit only X
- Fixing a bug, spotting a typo, completing a task → DO NOT commit
- Finding uncommitted related changes → DO NOT commit them
- No exceptions. No bundling. No "while I'm at it". Ask first.

---

# AttaLabs Monorepo — Claude Code Instructions

This is the AttaLabs dev lab monorepo — a Turborepo containing multiple AI products. Each product has its own surfaces (web, mobile, MCP, CLI as relevant) and documentation. Shared infrastructure lives in packages.

For the canonical naming and ecosystem framing, see [`apps/atta-ai/specs/atta-naming-decision.md`](apps/atta-ai/specs/atta-naming-decision.md). Brief summary:

- **AttaLabs** is the dev/lab ecosystem. Domain: `attalabs.dev`. Multiple products live here.
- **Atta** is one product within AttaLabs — the deep-thinking AI composed of Vāda + Vitakka + Sati. Target consumer domain: `atta.ai` (preferred, not owned).
- **Vāda, Vitakka, Sati** are the layers inside Atta. Vāda and Vitakka also live as standalone products at AttaLabs.
- **Herald** and **Cetana** are standalone products in AttaLabs, not part of Atta.
- **The Atta Engine** is the execution substrate (`@atta/engine` + `@atta/adapter-langgraph`).
- **No `-AI` suffix** on any product brand. Pāli naming is mandatory inside Atta, elective elsewhere.

---

## Products

| Product | Path | CLAUDE.md | README | Domain | Status |
|---------|------|-----------|--------|--------|--------|
| Vāda | [apps/vada-ai/](apps/vada-ai/) | [CLAUDE.md](apps/vada-ai/CLAUDE.md) | [README.md](apps/vada-ai/README.md) | `vada.attalabs.dev` | Live |
| Atta | [apps/atta-ai/](apps/atta-ai/) | [CLAUDE.md](apps/atta-ai/CLAUDE.md) | [README.md](apps/atta-ai/README.md) | TBD (`atta.ai` target) | Hub serves `attalabs.dev`; consumer product not yet deployed |
| Vitakka | [apps/vitakka-ai/](apps/vitakka-ai/) | [CLAUDE.md](apps/vitakka-ai/CLAUDE.md) | [README.md](apps/vitakka-ai/README.md) | `vitakka.attalabs.dev` | Scaffold |
| Herald | [apps/herald-ai/](apps/herald-ai/) | [CLAUDE.md](apps/herald-ai/CLAUDE.md) | [README.md](apps/herald-ai/README.md) | `herald.attalabs.dev` | Active |
| Cetana | [apps/cetana-ai/](apps/cetana-ai/) | (README only) | [README.md](apps/cetana-ai/README.md) | (internal) → `cetana.attalabs.dev` if/when published | V0/V0.5 in dev |

## App Structure Convention

Each product follows a nested structure as needed:

```
apps/{product-ai}/
├── web/              # Next.js web app (Vāda, Atta, Vitakka, Herald)
├── mobile/           # React Native (Herald — iOS + Android)
├── mcp/              # MCP server (Vāda, Atta, Herald)
├── cli/              # CLI binary (Cetana)
├── coordinator/      # MCP server entry points (Cetana)
├── specs/            # Product-internal specs
├── CLAUDE.md         # Product overview
└── README.md
```

Not every product needs every surface. Cetana is CLI + coordinator only. Vāda is web + mcp. Vitakka is scaffold only today.

---

## Shared Packages

| Package | Path | Purpose |
|---------|------|---------|
| @atta/engine | [packages/engine/](packages/engine/) | Plan compiler — Agent/Workflow/Team types, validation, terminal states |
| @atta/adapter-langgraph | [packages/adapter-langgraph/](packages/adapter-langgraph/) | LangGraph execution + multi-vendor cognitive router |
| @atta/agents | [packages/agents/](packages/agents/) | Agent primitives |
| @atta/auth | [packages/auth/](packages/auth/) | Clerk wrapper + bearer-token validation |
| @atta/crypto | [packages/crypto/](packages/crypto/) | Envelope encryption (AES-256-GCM) + API key generation |
| @atta/db | [packages/db/](packages/db/) | Drizzle ORM + Neon Postgres client |
| @atta/ui | [packages/ui/](packages/ui/) | Shared UI components + libraries (shadcn/ui + Tailwind v4) + canvas particle system |
| @atta/cms | [packages/cms/](packages/cms/) | Sanity CMS schemas, config, typed queries, theme utilities |
| @atta/identity | [packages/identity/](packages/identity/) | BYOK key probing, Ollama discovery, migration utilities |
| @atta/models | [packages/models/](packages/models/) | AI model catalog — dynamic fetch from models.dev + curated overlay |
| @atta/storage | [packages/storage/](packages/storage/) | Cloudflare R2 storage client + image transforms |
| @atta/typescript-config | [packages/typescript-config/](packages/typescript-config/) | Shared TypeScript configs |
| @atta/forge-state | [packages/forge-state/](packages/forge-state/) | Derives an `Iteration` purely from forge objects (Milestone + labeled Issues) — repo/owner-parameterized, consumed by this repo's own migration and by `vinaya-cli-v1`'s CLI |

The `@atta/*` namespace is the monorepo's name, not a brand. Code for any AttaLabs product can live under it without implying ownership by Atta-the-product.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + Bun |
| Framework | Next.js 16 (App Router, TypeScript, React 19) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| CMS | Sanity |
| Auth | Clerk (single AttaLabs-wide app) |
| AI | LangGraph + Vercel AI SDK + Anthropic / Google / OpenAI / xAI SDKs |
| Database | Neon Postgres + Drizzle ORM |
| Storage | Cloudflare R2 |
| Hosting | Vercel |
| Linting | Biome (formatter + linter) |
| Git Hooks | Husky + lint-staged + commitlint |

---

## Monorepo Tooling

### Workspace

Workspaces defined in root `package.json`:
```json
"workspaces": ["apps/*/*", "packages/*"]
```

### Turbo Tasks & Biome

`bun run dev[:herald|:vitakka|:vada|:atta]`, `build[:herald]`, `clean` — see root `package.json` `scripts` for the full, current list rather than duplicating it here.

**Prefer scoped checks while iterating** — `bun run typecheck --filter=<pkg>` / `bun run lint --filter=<pkg>` against the package you're touching. Reserve unscoped `bun run check` (typecheck + lint + format across everything) for the final pre-PR gate — a full-repo run on every iteration is slow and burns tool-call budget for no signal beyond what the scoped run already gave you.

---

## Code Style

- TypeScript strict mode, no `any`
- Prefer named exports over default exports
- Use `type` imports for type-only imports
- Biome for formatting (configured in `biome.json`)
- Use shadcn/ui components — do not build custom primitives
- Use `lucide-react` for icons

---

## Git Conventions

Commit format: `Type: Brief description` (scope optional: `Type(scope): Brief description`, scope lower-case)
Types: `Build`, `Docs`, `Feat`, `Chore`, `Fix`, `Perf`, `Refactor`, `Revert`, `Style`, `Test`
Header line (type + scope + description) must be ≤72 characters.

NEVER include `Generated with [Claude Code]` or `Co-Authored-By: Claude` attribution.

---

## Principal Session Hygiene

Long-running Principal/orchestration sessions (Planner, Brief Author, multi-task oversight) accumulate context fast — every turn replays the whole window. Keep one iteration-scope per session: when a task's PR merges and you're moving to a genuinely separate concern, start a fresh session rather than continuing in the same one. Briefs and AEG's own docs (Issues, topology files, decision log) are the durable state — a new session loses no context that matters, since none of it lives in the chat itself. Push exploratory digging into subagents/dispatched sessions rather than doing it inline in a Principal session that's already carrying a lot of history.

---

## Rule Modules

| Rule | File | Loads When |
|------|------|-----------|
| UI patterns | [.claude/rules/ui-patterns.md](.claude/rules/ui-patterns.md) | `.tsx`/`.jsx` files |
| API conventions | [.claude/rules/api-conventions.md](.claude/rules/api-conventions.md) | `api/`, `route.ts` files |
| Git conventions | [.claude/rules/git-conventions.md](.claude/rules/git-conventions.md) | All files |

## Skills

In-depth guides for specific domains. Reference when working in that area.

> **⛔ Skill-check enforcement is active in this repo.** A `PreToolUse` hook (`.claude/hooks/check-skill.sh`) blocks any `Edit` / `Write` / `NotebookEdit` whose file path matches a glob in a skill's sibling `paths.txt` — until that skill has been invoked via the `Skill` tool in the current session. The `.claude/skills/` directory is the authoritative source of truth for this codebase: read each invoked skill as architecture (the first section describes structure and invariants — those are the design anchors), not as a checklist of gotchas. Wired in `.claude/settings.json`; do not disable without explicit approval.

| Skill | File | Use For |
|-------|------|---------|
| UI Components | [.claude/skills/ui-components/SKILL.md](.claude/skills/ui-components/SKILL.md) | Component usage, CSS variables, theming |
| Theme Tokens | [.claude/skills/ui-theme-tokens/SKILL.md](.claude/skills/ui-theme-tokens/SKILL.md) | Complete list of semantic color/font/radius tokens — hardcoded palette colors forbidden |
| UI Library System | [.claude/skills/ui-library-system/SKILL.md](.claude/skills/ui-library-system/SKILL.md) | Build-time generation, runtime switching, adding apps/libraries |
| CMS Theme | [.claude/skills/ui-cms-theme/SKILL.md](.claude/skills/ui-cms-theme/SKILL.md) | SSR theme loading, fonts, Sanity studios |
| Branding | [.claude/skills/ui-branding/SKILL.md](.claude/skills/ui-branding/SKILL.md) | Logos, favicons, brand assets, seed script |
| API Routes | [.claude/skills/ui-api-routes/SKILL.md](.claude/skills/ui-api-routes/SKILL.md) | Route patterns, validation, LLM calls |
| Database | [.claude/skills/database/SKILL.md](.claude/skills/database/SKILL.md) | Drizzle schema, queries, migrations |
| Monorepo | [.claude/skills/monorepo-structure/SKILL.md](.claude/skills/monorepo-structure/SKILL.md) | Workspace layout, package imports |
| Git Commits | [.claude/skills/git-commits/SKILL.md](.claude/skills/git-commits/SKILL.md) | Commit format and rules |
| Canvas Animation | [.claude/skills/ui-canvas-animation/SKILL.md](.claude/skills/ui-canvas-animation/SKILL.md) | AIACanvas, AIASphere, AIARing |
| Vāda Architecture | [.claude/skills/vada-architecture/SKILL.md](.claude/skills/vada-architecture/SKILL.md) | Architecture master reference — layer stack, phase status, moat framework |
| Vāda MCP Server | [.claude/skills/vada-mcp-server/SKILL.md](.claude/skills/vada-mcp-server/SKILL.md) | MCP server implementation |
| Vāda Home Sections | [.claude/skills/vada-home-sections/SKILL.md](.claude/skills/vada-home-sections/SKILL.md) | Home page section primitives |
| Vāda YAML Authoring | [.claude/skills/vada-yaml-authoring/SKILL.md](.claude/skills/vada-yaml-authoring/SKILL.md) | Authoring deliberation YAML specs — workflow types, spec-registry, verify scripts |
| Atta Engine | [.claude/skills/atta-engine/SKILL.md](.claude/skills/atta-engine/SKILL.md) | Plan compiler — types, validation, compilers, node ID scheme |
| Atta Adapter | [.claude/skills/atta-adapter-langgraph/SKILL.md](.claude/skills/atta-adapter-langgraph/SKILL.md) | LangGraph execution + cognitive router |
| Atta Teams | [.claude/skills/atta-teams/SKILL.md](.claude/skills/atta-teams/SKILL.md) | Agent and team configs |
| Herald Engine | [.claude/skills/herald-engine/SKILL.md](.claude/skills/herald-engine/SKILL.md) | Forensic audit, Skeptical Auditor, signal detection |
| Cetana Coordinator | [.claude/skills/cetana-coordinator/SKILL.md](.claude/skills/cetana-coordinator/SKILL.md) | MCP servers, worktree manager, JSONL events |
| Auth | [.claude/skills/auth/SKILL.md](.claude/skills/auth/SKILL.md) | Clerk patterns, middleware, AttaLabs-wide SSO |
| Model Picker | [.claude/skills/model-picker/SKILL.md](.claude/skills/model-picker/SKILL.md) | ModelPicker component, dynamic model catalog, overlay curation |
| Brief Authoring | [aeg-root/skills/brief-authoring/SKILL.md](aeg-root/skills/brief-authoring/SKILL.md) | Task briefs for Developer agents — v3 model integration |
| Executor Protocol | [.claude/skills/executor-protocol/SKILL.md](.claude/skills/executor-protocol/SKILL.md) | Patterns for executing dispatched tasks |
| Code Style | [.claude/skills/code-style/SKILL.md](.claude/skills/code-style/SKILL.md) | TypeScript, exports, Biome rules |

---

## Dispatched tasks

When you receive a task dispatched by the Principal, read
`.claude/skills/executor-protocol/SKILL.md` first. Those rules are mandatory
for dispatched work.
