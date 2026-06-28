# Vāda — Current State

**Last updated:** June 28, 2026 (post PR #207 — deliberate page + Council shipped)
**Purpose:** Per-product snapshot for Vāda. Agents working in `apps/vada-ai/` read this before starting any task. Root `aeg-project/state.md` has full ecosystem context.

---

## What Vāda is

YAML-driven deliberation runtime. The engine executes deliberation configurations expressed as YAML files. Other applications invoke Vāda via MCP by passing a YAML spec and a question; the engine runs it and returns the result. Live at `vada.attalabs.dev`. Hosted MCP at `vada.attalabs.dev/api/mcp`.

---

## Pending manual operations

- **Add OpenAI + xAI keys to Vercel** — Vercel → vada-ai → Settings → Environment Variables. Unblocks Reviewers end-to-end testing.
- **Generate a Vāda API key** — needed to test the hosted MCP via Claude Code CLI.
- **Configure Claude Code MCP connector** — point at `https://vada.attalabs.dev/api/mcp` with bearer auth.

---

## Current state (as of June 28, 2026)

### Shipped in vada-production-v1 (PR #207, merged June 28)

- **Deliberate page** — production UX live: frontier-chat hero input, morphing Configure↔Submit, dropdown restyle/short labels, team-identity Configure modal, tool-badge corner glyph + `badgeLeft` slot, `RouteAwareFooter` (suppresses global footer on `/deliberate` + `/deliberation/[id]`).
- **Council teams** — `vada-council` + `vada-council-synthesis` YAML specs shipped and published. `CouncilFeed` view: N independent-answer columns, explicit vendor-color spheres (`resolveVendorColor → VENDORS[v].color`; grey-sphere bug fixed by construction), completion-fill streaming, locked `{agreements, disagreements, bottomLine}` synthesis panel. Per-spec routing on the deliberation page.
- **4 public teams in catalog** — `vada-council`, `vada-council-synthesis`, `vada-reviewers`, `vada-reviewers-synthesis`.
- **SmartPromptInput DI** — shared composite now resolves no library; consumers inject primitives (Vāda from `@atta/ui`, Herald from `useComponents()`); ratifies D-064.
- **TextReveal** — added to `@atta/ui` contract + all 4 libraries.
- **UI-libraries doctrine** — `installed/*` verbatim upstream CLI pastes (shadcn/animate-ui/retroui/neobrutalism); Biome-ignored; customizations in `components/interactive/*`. Tabs + Button restored. D-065 ACTIVE.

### Positioning rethink in draft

`apps/vada-ai/specs/vada-rethink.md` (created June 28) — captures positioning/team-taxonomy rethinking mid-PR. Status: draft. Not a forge Issue, not a dispatched task. The Principal should decide whether to open an Issue before the next Vāda iteration starts.

---

## Current build state

**Production live:**
- `vada.attalabs.dev` — full web app, deliberate page live
- `vada.attalabs.dev/api/mcp` — hosted MCP, Streamable HTTP, bearer auth
- 4 public teams: `vada-council`, `vada-council-synthesis`, `vada-reviewers`, `vada-reviewers-synthesis`
- 7 experimental teams (hidden from public catalog): `a0-baseline`, `a1-baseline`, `brokered-trio`, `brokered-quartet`, `crucible`, `sparring`, `war-room`

---

## Stack

- Next.js App Router, React, Tailwind, shadcn/ui
- Neon Postgres + Drizzle ORM (`@atta/db` for shared tables, `apps/vada-ai/web/src/db/schema.ts` for app-local)
- Clerk (shared AttaLabs Clerk app, `.attalabs.dev` cookie)
- `@atta/engine` — Plan compiler (`compileFlow`, `loadFlow`, `validateFlow`)
- `@atta/adapter-langgraph` — LangGraph execution, SDK-shape dispatch (3 branches: anthropic, google-genai, openai-compat)
- `@atta/models` — vendor registry (12 vendors), model catalog, `resolveDispatchModel`
- `@atta/crypto` — envelope encryption (AES-256-GCM) for provider keys
- LangGraph (`@xyflow/react` for visualization)

---

## Key files

| File | Purpose |
|------|---------|
| `apps/vada-ai/aeg-project/state.md` | This file — current per-product state |
| `apps/vada-ai/specs/vada-state.md` | Legacy internal state (pre-June 28, may be stale — see DANGLING note in PR #207 provenance) |
| `apps/vada-ai/specs/vada-rethink.md` | Positioning/team-taxonomy draft (June 28, not yet a task) |
| `apps/vada-ai/specs/vada-decisions.md` | Vāda-specific decision log |
| `apps/vada-ai/specs/yaml-schema-reference.md` | YAML schema v2 definitive reference |
| `apps/vada-ai/specs/vada-reviewers-spec.md` | Reviewers team spec (rev 5 + v2 prompt) |
| `packages/agents/vada-deliberation/yamls/` | All deliberation YAML specs |
| `apps/vada-ai/web/src/app/api/deliberation/[id]/workflow/run/route.ts` | Main deliberation route |
| `apps/vada-ai/web/src/app/api/mcp/route.ts` | Hosted MCP endpoint |
| `.claude/skills/vada-architecture/SKILL.md` | Architecture master reference — read before any cross-cutting change |

---

## What's NOT done yet (deferred from vada-production-v1)

- Token streaming (adapter V2)
- Multimodal ingestion
- Topbar hardcoded-basic sweep (shared backlog — all products)
- ~12 un-audited shared `@atta/ui` primitives (Card/Badge/Input/Textarea/DropdownMenu/Popover/Select/Sidebar/Sheet/Table/Toast/Collapsible/Command) — same upstream-canonical sweep applied to Tabs + Button
- Reviewers system prompt v2 (B-3b, PR #77 open since June 1)
- End-to-end Reviewers test (blocked on OpenAI + xAI keys in Vercel)
- Synthesizer prompt iteration (B-3c)
- Benchmark harness + quality audit
- Fusion team (`vada-fusion`, `vada-fusion-native`)
- Teams page measured stats (replace CalculatorStats)
- Council "REVIEWER N" label in configure modal
- Deliberation UI tool/MCP support (`required_inputs` validation)
- Trust page rewrite (references stale BYOK model)

---

## Open questions

- OQ-C: How does the engine express Principal-terminated loops?
- OQ-G: How are YAML forks named without `-vN` convention?
- OQ-H: Adapter refactor to new TemplateState shape (round-namespaced) — when?
- OQ-I: Shape detection vs generic walker in `compileFlow` — keep or revisit with adapter refactor?
- OQ-cross-8: Fate of the 7 experimental YAMLs after benchmark data exists
