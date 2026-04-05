# Atta AI — Claude Code Instructions

Atta AI is an ecosystem of AI products built as a Turborepo monorepo. Each product has its own surfaces (web, mobile, MCP) and documentation. Shared infrastructure lives in packages.

**Naming:** All product names come from Pali. Atta (self), Herald (announcement), Vitakka (applied thought), Vada (deliberation).

---

## Products

| Product | Path | CLAUDE.md | README | Domain | Status |
|---------|------|-----------|--------|--------|--------|
| Herald AI | [apps/herald-ai/](apps/herald-ai/) | [CLAUDE.md](apps/herald-ai/CLAUDE.md) | [README.md](apps/herald-ai/README.md) | herald.ai | Active |
| Atta AI | [apps/atta-ai/](apps/atta-ai/) | [CLAUDE.md](apps/atta-ai/CLAUDE.md) | [README.md](apps/atta-ai/README.md) | atta.ai | Scaffold |
| Vitakka AI | [apps/vitakka-ai/](apps/vitakka-ai/) | [CLAUDE.md](apps/vitakka-ai/CLAUDE.md) | [README.md](apps/vitakka-ai/README.md) | vitakka.ai | Scaffold |
| Vada AI | [apps/vada-ai/](apps/vada-ai/) | [CLAUDE.md](apps/vada-ai/CLAUDE.md) | [README.md](apps/vada-ai/README.md) | vada.ai | Scaffold |

## App Structure Convention

Each product follows a nested structure:

```
apps/{product-ai}/
├── web/              # Next.js web app
├── mobile/           # React Native (iOS + Android)
├── mcp/              # MCP server
├── CLAUDE.md         # Product overview
└── README.md
```

Not every product needs all surfaces. Scaffolds are created empty and built when needed.

---

## Shared Packages

| Package | Path | CLAUDE.md | README | Purpose |
|---------|------|-----------|--------|---------|
| @atta/ui | [packages/ui/](packages/ui/) | [CLAUDE.md](packages/ui/CLAUDE.md) | [README.md](packages/ui/README.md) | Shared UI components + libraries (shadcn/ui + Tailwind v4) |
| @atta/cms | [packages/cms/](packages/cms/) | [CLAUDE.md](packages/cms/CLAUDE.md) | [README.md](packages/cms/README.md) | Sanity CMS schemas, config, typed queries |
| @atta/typescript-config | [packages/typescript-config/](packages/typescript-config/) | [CLAUDE.md](packages/typescript-config/CLAUDE.md) | [README.md](packages/typescript-config/README.md) | Shared TypeScript configs |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + Bun |
| Framework | Next.js 16 (App Router, TypeScript, React 19) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| CMS | Sanity |
| Auth | Clerk |
| AI | Vercel AI SDK + Claude API |
| Database | Neon Postgres + Drizzle ORM |
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

### Turbo Tasks

```bash
bun run dev              # Start all dev servers
bun run dev:herald       # Start Herald AI only
bun run dev:vitakka      # Start Vitakka AI only
bun run dev:vada         # Start Vada AI only
bun run dev:atta         # Start Atta AI only
bun run build            # Production build (all)
bun run build:herald     # Build Herald AI only
bun run typecheck        # TypeScript check across all packages
bun run check            # Typecheck + lint + format
bun run clean            # Clean build artifacts
```

### Biome

```bash
bun run lint              # Lint only
bun run format            # Format only
bun run format-and-lint   # Both
bun run check             # Typecheck + lint + format
```

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

Commit format: `Type: Brief description`
Types: `Build`, `Docs`, `Feat`, `Chore`, `Fix`, `Perf`, `Refactor`, `Revert`, `Style`, `Test`

NEVER include `Generated with [Claude Code]` or `Co-Authored-By: Claude` attribution.

---

## Rule Modules

| Rule | File | Loads When |
|------|------|-----------|
| UI patterns | [.claude/rules/ui-patterns.md](.claude/rules/ui-patterns.md) | `.tsx`/`.jsx` files |
| API conventions | [.claude/rules/api-conventions.md](.claude/rules/api-conventions.md) | `api/`, `route.ts` files |
| Git conventions | [.claude/rules/git-conventions.md](.claude/rules/git-conventions.md) | All files |
