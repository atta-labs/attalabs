# Atta Ecosystem — Current State

**Last updated:** July 2, 2026 (aeg-consolidation archived; aeg-governance-hardening + aeg-studio-cleanup active)
**Purpose:** Non-derivable operational facts across the AttaLabs ecosystem. For live execution state (active tasks, blocked, next), derive from the forge — see `coordination.md` "Session-start forge queries."

This doc lives in the repo at `aeg-project/state.md`. For non-PM docs (skills, Vāda specs, legacy material), see `docs-index.md` for paths and read via GitHub MCP. See `coordination.md` for how the system works.

Vāda's own internal phase tracking lives in `apps/vada-ai/specs/vada-state.md`.

---

## Current focus

**aeg-governance-hardening** and **aeg-studio-cleanup** are the active AEG-model iterations, prioritized ahead of `vada-production-v1` by explicit Principal decision (2026-07-01) — Vāda work resumes once the AEG refactor lands. `aeg-governance-hardening` (10 tasks: #251/#252/#218/#219/#266/#293/#297/#300/#309/#278–282) finishes D-069's role-seam gates, the doc-owners audit, three model-hardening fixes, and 5 promoted stale-doc fixes. `aeg-studio-cleanup` (4 tasks: #287/#290/#291/#292, `Lifecycle: planned`) curates AEG Studio's UI surface. **`aeg-consolidation` is complete** (4 of 4 tasks shipped July 1–2: #263/#264/#220/#265; archived to `aeg-root/iterations/completed/aeg-consolidation.md`; homed the coherence-check engine in `@atta/aeg-core`, fixed the CI≠local drift, re-armed the coherence gate as blocking, added the docs coherence gate — D-079. See the retrospective in `lessons.md`). **`aeg-coherence-v1` is complete** (6 of 9 tasks shipped June 25–July 1; archived to `aeg-root/iterations/completed/aeg-coherence-v1.md`; its 5 unbuilt tasks moved to `aeg-consolidation` + `aeg-governance-hardening` via D-070, not abandoned). **`vada-production-v1` is parked, not paused-and-forgotten** — 6 done / 15 open tasks, `Lifecycle: active`, untouched this session; two of its issues (#180, #182) read `Incoherent` (closed `COMPLETED` with no linked merged PR) and need a provenance fix or reopen — flagged, not yet actioned. **herald-agents-v2 is complete** (8 tasks, June 18–29; iteration archived to `aeg-root/iterations/completed/herald-agents-v2.md`; #234 open bug — prod ANTHROPIC_API_KEY likely expired, Principal to disposition).

Check `gh issue list --label "iteration:aeg-governance-hardening" --state open`, `gh issue list --label "iteration:aeg-studio-cleanup" --state open`, and `gh issue list --label "iteration:vada-production-v1" --state open` for live task status.

---

## Pending manual operations

These require Principal action and are not trackable as forge Issues:

- **Add Attalabs write token to tools/admin env** — `SANITY_API_TOKEN_ATTALABS` must be configured in Vercel environment variables and local `.env.local` for `tools/admin` to authorize theme/library mutations.
- **Close Issue #110 manually** — task 9 view half (token ledger Studio display) merged via PR #153 on branch `task/aeg-governance-ui-v2/4`; auto-close did not fire; issue remains open.
- **Add OpenAI + xAI keys to Vercel** — Vercel → vada-ai project → Settings → Environment Variables → add `OPENAI_API_KEY` and `XAI_API_KEY`. Unblocks Reviewers end-to-end testing.
- **Upstash Redis credentials for Herald** — `.env.local` creds expired. Rate limiting degrades gracefully but isn't active. Provision at upstash.com, update `.env.local` + Vercel env vars for `herald.attalabs.dev`.
- **Herald deploy verification (browser-auth flows)** — Code paths verified by PR #235 (T7). Manual browser-auth test still required: avatar upload → URL saved, CV upload → download works, bio save → reflects on Envoy, onboarding second user, Bulk Audit with real BYOK key. **#234 blocking BYOK-free audits**: prod `ANTHROPIC_API_KEY` likely expired — rotate in Vercel before re-verifying, or accept-and-defer (Principal to decide).
- **Worktree graveyard cleanup** — `git worktree prune && git fetch --prune && git branch --merged main | grep -v "^\* \|main" | xargs git branch -D`
- **Vitakka Clerk app deletion** — unused, no users. 2 minutes.
- **Generate Vāda API key + configure Claude Code MCP connector** — point at `https://vada.attalabs.dev/api/mcp` with bearer auth. Final step in hosted MCP dogfooding.

---

## Operational model

**Atta Agentic Execution Governance (AEG) — ratified June 4, 2026 (global D-029, PR #80).** The coordination model migrated from an informal Claude.ai project-knowledge workflow (pre-May) to a formalized state-machine model (v3, May 10), and is now the AEG model: **forge-native, orchestrator-independent governance of delegated AI execution.** It is not project management — there is no plan, timeline, or resource tracking inside AEG; that lives outside it (see "Where the plan lives" below).

**AEG is two things sharing one name (D-038):** the **model** (this governance/flow constitution, living at repo-root `aeg-root/`, governing the whole monorepo — D-041) and the **product** (a deployed UI that visualizes a repo's AEG execution + the `aeg.sh` adoption scaffolder, living at `apps/aeg/` — see the AEG product section below). The model is the thing; the product makes it visible and adoptable.

**Roles:** four conversational roles — **Principal, Team Leader, Developer, Reviewer** (code + security specializations) — plus the non-conversational **Archivist**. The Team Leader has three modes: **Strategist** (architecture/decisions), **Planner** (turns intent + a backlog slice into an iteration), **Brief Author** (writes the just-in-time brief). Established by global D-001 (three roles + Archivist) → D-026 (added Reviewer) → D-029 (added Planner mode + Archivist role doc).

**Execution model (D-029):**
- **A task IS a GitHub Issue.** Status is **derived** from the forge (branch `task/<iteration>/<n>` exists → in-flight; PR open → in-review; merged → merged; `aeg:blocked` label → blocked), **never stored**. No `status:*` labels.
- **The iteration** (`aeg-root/iterations/<name>.md`) is AEG's top-level artifact — a thin topology file (task→Issue map, `depends-on` / `conflicts-with` edges, grouping). No status, no PR numbers, no dates. The active slice of work, pulled from a backlog by the Planner.
- **The brief** is just-in-time, pasted (not committed), and lives in the **PR body** — never in the Issue.
- **Conflicts** are declared, package-level, static (no dynamic scanner). **Dispatch gates:** never start a task whose `depends-on` isn't merged, or while a `conflicts-with` sibling's PR is open.
- **verify-docs** is a real, blocking CI gate (global D-027) — `.github/workflows/verify-docs.yml`, live as of June 4.
- **AEG enhancements (D-030, ratified ACTIVE June 10):** the Archivist assembles a **provenance block** at close-out (frozen facts → merged PR, append-only, not stored status); the Reviewer does an **advisory** spec-conformance cross-check (never a blocker — stale/unratified specs must not veto correct code); **observe mode** is the read-only advisory adoption floor of the advisory→enforced gradient.

**Where the plan lives (NOT in AEG):** the roadmap is the backlogs — `apps/<project>/specs/<project>-backlog.md` (per project) and `specs/ecosystem-backlog.md` (cross-cutting / AEG-itself, the monorepo's own plan). The global `roadmap.md` is **retired** (D-029). **Backlog convention (D-037, D-041):** a unit's *plan* lives in its `specs/`; a unit's *flow + governance* lives in the root `aeg-root/` (model, exists once); its *living state* lives in its `aeg-project/` (one at the root for monorepo-level work, one per project). The backlog is the seam where AEG meets a planning tool (Jira/Linear/etc.); AEG is indifferent to which one — it only needs "a well-formed brief exists." The Planner *may* read the backlogs to compose an iteration, but does not depend on them.

**Key AEG model artifacts (all in `aeg-root/`, model layer, root only — D-041):**
- `aeg-root/coordination.md` — session-start protocol, names, rules
- `aeg-root/state-machine.md` — the constitution: artifact classes, mutation matrix, authority hierarchy, decision schema, lock mechanism, tiered docs, ratification windows
- `aeg-root/aeg-manual-flow.md` — running the flow by hand (the operator's guide)
- `aeg-root/process.md` — the eleven-phase walkthrough
- `aeg-root/iterations/README.md` — the iteration model (the only file in `iterations/` until the first real iteration starts)
- `aeg-root/projects.md` — project registry (name → folder), for multi-project repos
- `aeg-root/roles/` — `principal.md`, `team-leader.md` (Strategist/Planner/Brief Author), `developer.md`, `reviewer.md`, `security.md`, `archivist.md`
- `aeg-root/skills/` — canonical AEG skills (`aeg`, `aeg-roles`, `brief-authoring`); the `.claude/skills/` copies are a generated view (D-039)
- `aeg-root/diagrams/` — `process-flow.md` (the AEG process), `system-architecture.md` (the optional Cetana tool + the AEG file/enforcement layout)
- `aeg-root/reviewer-prompt.md` — template for adversarial multi-AI reviewer rounds

**Living state (in `aeg-project/`, one at root + one per project):**
- `aeg-project/decisions.md` — global cross-project decision log, **D-001 to D-057**
- `aeg-project/ratification-queue.md` — append-only queue for decisions awaiting Principal ratification
- `aeg-project/state.md` / `changelog.md` / `lessons.md` — current state / shipped log / calibration (active-work state is derived from the forge — D-057)

The monorepo's own plan lives at `specs/ecosystem-backlog.md` (the root `specs/` folder, per D-037 — the ecosystem-level counterpart to each project's `apps/<project>/specs/<project>-backlog.md`).

The `.claude/skills/brief-authoring/SKILL.md` is the canonical brief authoring guide (tier, principal_delegate, spike, Type 1/2 declaration, lock acknowledgment, optional `Ticket:`/`Project:`, brief-lands-in-PR-body).

PM docs are in the repo (not Claude.ai project knowledge). Any Claude session reads them via GitHub MCP or worktree access.

## CMS theme and library centralization migration (D-060)

The migration of UI themes and component libraries from Atta (`892o2m9f`) to Attalabs (`l5n0n8nn`) was run and verified.
- **Script**: `packages/cms/scripts/migrate-themes-and-libraries.ts`
- **Verification query**: `sanity documents query "*[_type in ['uiTheme', 'library']]{_id, _type, name}" --project-id l5n0n8nn`
- **Results**: Verified that exactly 19 themes (prefixed with `theme-`) and 4 component libraries (prefixed with `library-`) reside in the `l5n0n8nn` target dataset.

---

## Brand & domain

**v2 framing locked May 12, 2026 (D-025, PR #46).** Two ecosystems at different scales:

- **AttaLabs ecosystem** = the dev/lab. Permanent home at `attalabs.dev` (purchased April 26, 2026). Multiple products live here; some are part of Atta, others are independent.
- **Atta ecosystem** = the internal composition of Vāda + Vitakka + Sati that makes up Atta-the-product. A smaller scale.

**Brand architecture:**

- **AttaLabs** = the dev/lab ecosystem. Domain `attalabs.dev`.
- **Atta** = a product within AttaLabs. The deep-thinking AI composed of Vāda + Vitakka + Sati. Not yet deployed. Target consumer domain: `atta.ai` (preferred, not owned — Japanese individual owner, may free 2027). Fallback options preserved.
- **The Atta Engine** = the agent-flow execution substrate (`@atta/engine` + `@atta/adapter-langgraph`). Lives in AttaLabs.
- **Code namespace** stays `@atta/*` (immutable; the monorepo's name, not a brand).

**Auth architecture:** single Clerk app named "Atta" in Clerk dashboard, cookie scoped to `.attalabs.dev`, SSO across all subdomains.

**Naming convention:**
- No `-AI` suffix on any product brand (Atta, Vāda, Vitakka, Sati, Herald, Cetana are all bare).
- App **folders** carry `-ai` (`vada-ai`, `herald-ai`, `cetana-ai`, `atta-ai`, `vitakka-ai`) except meta/infra apps (`attalabs`, `aeg`, `desktop`). Folder suffix ≠ brand.
- Pāli names mandatory inside Atta (Atta, Vāda, Vitakka, Sati); elective elsewhere in AttaLabs. The earlier "Pāli = built by Atta" rule was demoted from structural to aesthetic in v2.

Canonical decision docs: `apps/atta-ai/specs/atta-naming-decision.md` (full reasoning), `apps/atta-ai/specs/atta-ecosystem-vision.md` (strategic positioning).

---

## Products

### Vāda — *production live; Council + deliberate page shipped June 28 (PR #207); back-half iteration open*

**Status:** Live at `https://vada.attalabs.dev`. Standalone deliberation engine and the deliberation layer inside Atta. Vāda Teams is the catalog of YAML team specifications compiled by the Atta engine. **Council deliberations shipped June 28 (PR #207):** `vada-council` + `vada-council-synthesis` YAML specs live; `CouncilFeed` view (N independent-answer columns, vendor-color spheres, streaming `{agreements, disagreements, bottomLine}` synthesis); deliberate-page production UX (frontier-chat hero input, morphing Configure↔Submit, tool badges, `RouteAwareFooter`). 4 public teams in catalog. **Hosted MCP server live at `https://vada.attalabs.dev/api/mcp` (May 4).** **Single-source-keys reversal locked (May 4) — server-side `user_provider_keys` is canonical, IndexedDB demoted.** **`feat/shared-keys-ui` merged (May 5) — `ProviderKeysSection` / `ApiKeysSection` extracted to `@atta/ui/account`, ecosystem-shared key schemas moved to `@atta/db`.** **Vendor registry consolidation shipped (May 11, PR #31) — single source of truth for vendor metadata, SDK shapes, baseURLs, and routing across all 12 supported vendors.** Teams-as-a-product rethink in draft (`apps/vada-ai/specs/vada-rethink.md`, June 28) — not yet a forge Issue.

**Web app structure:** Routes are flat. Home is at `/`. The `/autonomous/*` and `/brokered/*` route trees no longer exist.

**Full plan / backlog:** `apps/vada-ai/specs/vada-backlog.md`.

#### Vāda Teams catalog (current state — 11 YAMLs, 4 published)

All YAMLs at `packages/agents/vada-deliberation/yamls/`. Use Sonnet (`claude-sonnet-4-6`) by default; Vāda Reviewers uses vendor-diverse defaults.

| Team YAML | Display name | Shape | Status |
|---|---|---|---|
| `a0-baseline` | A0 | Single agent, direct answer | Benchmarking baseline (experimental) |
| `a1-baseline` | A1 | Single agent, structured output | Benchmarking baseline (experimental) |
| `brokered-trio` | Brokered Trio | 3 reviewers parallel (Strategist + Critic + Devil's Advocate), single-shot, no synthesis | Engine demo (experimental) |
| `brokered-quartet` | Brokered Quartet | Brokered Trio + Domain Expert | Engine demo (experimental) |
| `crucible` | Crucible | 4 agents × 3 rounds with dual audit and revision | Experimental (unpublished May 11, PR #31) |
| `sparring` | Sparring | 2 agents × 3 rounds with dual audit and revision | Experimental (unpublished May 11, PR #31) |
| `war-room` | War Room | 6 agents × 3 rounds with dual audit and revision | Experimental (unpublished May 11, PR #31) |
| `vada-reviewers` | Reviewers | 3 vendor-diverse reviewers (configurable per slot), uniform critic role, single-shot, no synthesizer | Published — pending prompt iteration |
| `vada-reviewers-synthesis` | Reviewers + Synthesis | Same 3 reviewers + Anthropic Synthesizer producing structured JSON | Published — pending prompt iteration |
| `vada-council` | Council | N independent models answer in parallel (no critique role — vendor identity IS identity) | Published — shipped June 28 (PR #207) |
| `vada-council-synthesis` | Council + Synthesis | Same N columns + Anthropic Synthesizer: `{agreements, disagreements, bottomLine}` | Published — shipped June 28 (PR #207) |

The 7 experimental YAMLs are filtered out of the public `/teams` catalog by the `experimental: true` flag (`listPublicSpecs()` returns the 4 published only). Crucible, Sparring, and War Room were marked experimental in PR #31 — flow design, system prompts, and inter-agent interactions all need iteration before they should be re-exposed publicly. **Taxonomy reconsideration in flight:** `apps/vada-ai/specs/vada-rethink.md` (draft, June 28) questions whether "Council" accurately describes what the team does and how Vāda's team taxonomy should evolve — not yet a forge Issue; gates T8/T11/T12 in vada-production-v1.

**Two known bugs (undiagnosed):** Reviewers team ERROR (provider keys / SDK routing); Sparring duplicates the Critic message. Both pending diagnosis.

#### What's built

- **Hosted MCP server (May 4):** `https://vada.attalabs.dev/api/mcp`. Streamable HTTP transport, bearer auth via `vada_*` API keys (SHA-256 hashed in `api_keys` table). Provider keys envelope-encrypted in `user_provider_keys` (AES-256-GCM, AAD-bound to `clerkId`, `MASTER_ENCRYPTION_KEY` env var, `kms_key_id` reserved for future KMS migration). Implementation: `apps/vada-ai/web/src/app/api/mcp/route.ts`, `packages/auth/src/api-key-auth.ts`, `packages/crypto/`. See vada-decisions.md D-029.
- **Single-source-keys reversal (May 4):** server-side canonical store; IndexedDB demoted from key-storage role; `@atta/identity` preserved for probe/Ollama/migration utilities. See vada-decisions.md D-028.
- **Shared keys UI + ecosystem schemas (May 5):** `ProviderKeysSection` and `ApiKeysSection` in `@atta/ui/account`; `apiKeys`, `userProviderKeys`, `mcpSessions` in `packages/db/src/schema/keys.ts`; `userSettings` (face-style) stays in `apps/vada-ai/web/src/db/schema.ts`. Settings tab structure: Account / API Keys / Agent Style. Teams tab removed; team agent model selection moved inline (per vada-decisions.md D-027 unified storage). See vada-decisions.md D-030.
- LangGraph-only execution path (Mastra removed)
- **Vendor registry (May 11, PR #31):** Single source of truth at `packages/models/src/vendors.ts`. 12 vendors registered (anthropic, openai, google, xai, groq, openrouter, deepseek, cerebras, mistral, together, fireworks, ollama). Each entry: `sdkShape`, `baseURL`, `keyConvention`, `modelPrefixes`, `envVar`, `localOnly`. `VendorId = keyof typeof VENDORS` replaces the prior 5-wide `RouteProvider` union. See vada-decisions.md D-032.
- **SDK-shape dispatch in `@atta/adapter-langgraph` (May 11, PR #31):** Adapter dispatches by SDK shape (3 branches: `anthropic`, `google-genai`, `openai-compat`) rather than per-vendor switch. `ProviderKeys = Partial<Record<VendorId, string>>` accepts all 12 vendors. `createMultiVendorLlmCall` gains `agentVendorOverrides` — catalog-resolved vendor map keyed by agent name; correctly routes cross-vendor models like `deepseek-r1-distill-llama-70b` served by Groq (which prefix matching alone misidentifies as `deepseek`). Closes BYOK Gap 2 in its final form.
- **`BrokeredWorkflow.synthesis?` field** in `@atta/engine` — optional synthesizer node.
- **Per-node error capture** — `AgentOutput.error?` field; partial failures complete with `terminalState: CLEAN`.
- **Engine vocabulary refactor (May 3)** — `PlanNodeKind` (7 values) and `PlanEdgeKind` (flow, ordering) emitted by all 4 compilers. Resolves OQ-cross-9 as Choice A.
- **Role/engine separation (May 3)** — `AgentRole` deleted from `@atta/agents`. Vendor identity is first-class for unroled agents (Vāda Reviewers' Gemini/GPT/Grok = no role, vendor IS identity).
- **MCP contract surfaces aligned with deployed runtime (May 9, PR #21):** `vada__consult` inputSchema declares structured shape (`context`, `question`, `reviewers[{role, notes?, domain?}]`, plus optional `spec_id`, `current_leaning`, `stakes`, `session_title`); `vada__deliberate` `team` enum expanded then pruned (May 11, PR #31) to the 2 currently published specs (`vada-reviewers`, `vada-reviewers-synthesis`).
- **MCP `reviewer_config` parameter (May 11, PR #31):** `vada__consult` accepts an optional `reviewer_config: Record<agentName, modelId>` field, validated against the vendor registry, refused with structured `local_only_vendor` or `missing_provider_key` errors. Mirrors the web UI's per-slot model configurability; closes the contract gap between MCP and web for the Reviewers and Reviewers + Synthesis teams.
- **`vada__consult` accepts generic `spec_id`** — routes to any YAML in the catalog
- `vada__deliberate` MCP tool returns `structured` field alongside `content`
- 11 YAML team specs in catalog (4 published, 7 experimental — see Vāda Teams catalog table above)
- Domain Expert agent (uses Handlebars `customVars`)
- Benchmarks infrastructure (`benchmark_runs` table, judge script, `/bench` dashboard)
- YAML-driven specs replacing TypeScript mode logic
- Per-agent model overrides
- YAML catalog loader extraction (`@atta/engine/src/catalog-loader.ts`)
- UI driven by `listPublicSpecs()` server-side
- Synthesis structured output persisted to `transcript_entries.structured` JSONB
- SSE typed `synthesis_complete` events with `{ agent, content, structured, is_revision }`
- Auth: single shared `users` table in `@atta/db` keyed by `clerk_id`. Vāda-specific profile data in `vada_profile` table.
- Settings page top bar restored. Account tab uses Clerk `<UserProfile />` themed via `@atta/ui/account`.
- Theme-reactive Clerk modal
- OAuth-only V1: Google + GitHub + Web3 wallets

#### Web app structure

Flat routes at `apps/vada-ai/web/src/app/(main)/`:
- `/` — animated hero homepage
- `/deliberate` — picker + brief flow (lock-icon row removed; key entry now writes server-side)
- `/deliberation` — in-flight session viewer (SSE streaming)
- `/sessions` — unified history
- `/sessions/consultations/[id]` — brokered consultation detail
- `/teams` — catalog page (2 published cards) with animated agent spheres
- `/teams/[slug]` — detail page with agent grid, cost calculator with model picker, embedded flow visualization
- `/trust` — Trust Vāda page (existing content; rewrite pending — references browser-only BYOK which is no longer current)
- `/mcp` — MCP server documentation page
- `/bench` — consolidated benchmarks
- `/settings` — Account / API Keys / Agent Style tabs (Teams tab removed)
- `_archived-science/` — science route hidden, content preserved

**Domain:** `vada.attalabs.dev` (production live). Auto-deploys from `main` via Vercel.

**Next (vada-production-v1 back half):** Fusion teams (T4/T5); reviewers-prompt iteration (T8 — gates on `vada-rethink.md` taxonomy decision); benchmark harness + quality audit (T9–T11); Teams-page measured stats (T12); hardening (T13). Test Reviewers end-to-end first (needs OpenAI + xAI keys added to Vercel — manual). Hosted MCP works via Claude Code CLI; Claude.ai web blocked by the broker bug (`ofid_*`).

See `apps/vada-ai/aeg-project/state.md` for the current per-project Vāda snapshot.

### AEG — *model ratified (D-029, D-030); AEG Studio V1 shipped (aeg-ui-v1, June 2026)*

**Status:** The **model** is ratified and live (global D-029, PR #80 merged June 4; enhancements D-030 ratified ACTIVE June 10). **AEG Studio V1 shipped** (aeg-ui-v1 iteration, June 14–20, 2026) — `apps/aeg/web/studio` is built and running with `@atta/aeg-core` as its substrate. Iteration archived to `aeg-root/iterations/completed/aeg-ui-v1.md`.

**What it is:** Atta Agentic Execution Governance — the forge-native, orchestrator-independent model above (see "Operational model"). The product is two things: (1) a Next.js UI (`apps/aeg/web`) that reads an AEG repo's `iterations/*.md` (topology) + the Git forge (derived status) + the backlogs (plan) and renders an attention queue (default), repos grouped by tag, each repo's iterations, and the iteration DAG; and (2) `aeg.sh`, a neutral scaffolder that lays down the AEG structure in any repo (and creates a specified unit's folders per D-037). AEG-only (a repo must practice AEG to render). Connects repos via a GitHub App (OAuth, read-only, per-repo, tokens encrypted via `@atta/crypto`); a webhook-fed cache of *forge facts* (not authored status) keeps reads fast within rate limits.

**AEG Studio V1 (aeg-ui-v1, shipped June 2026):** Local read-only tool at `apps/aeg/web/studio`. Features: `@atta/aeg-core` pure parser + `deriveIteration`; local GitHub forge adapter; projects/iterations topology pages; kanban (derived status) + task detail (brief from PR body); task-dependency graph (`@atta/ui/engine-flow`); shared docs renderer; AEG logo mark; append-only token/cost ledger (model + Studio view); Verification phase + runtime merge gate (D-049). Substrate (`@atta/aeg-core`) inheritable by the future Portal.

**Orchestrator-independence is structural (D-038):** AEG does **not** know Cetana. Cetana is the optional orchestrator (a sibling product at `apps/cetana-ai/`) that automates AEG's dispatch/escalation slice — it knows AEG, not the reverse. The UI may render an orchestrator's activity read-only as forge facts; it never contains or depends on the orchestrator. Cetana is never moved inside `apps/aeg/`.

**Folder:** `apps/aeg/` (meta/infra app → no `-ai` suffix, matching `apps/attalabs`, `apps/desktop`). Specs at `apps/aeg/specs/` (`aeg-app-architecture.md`, `aeg-backlog.md`, `aeg-decisions.md`); state layer at `apps/aeg/aeg-project/` (`state.md`). Deploy target `aeg.attalabs.dev`.

**Next:** Principal to declare second iteration (Portal public surface, `aeg.sh`, or attention-queue features per `apps/aeg/specs/aeg-backlog.md`).

### Atta — *deep-thinking AI consumer product; composition not yet deployed*

**Status:** Not yet built as a unified product. Composed of Vāda (live) + Vitakka (not yet built) + Sati (memory layer, not yet built). Atta-the-product is what the composition delivers.

**What it is:** The deep-thinking AI consumer product — thinking that compounds across every AI provider, every focus, every session. See `apps/atta-ai/specs/atta-ecosystem-vision.md` for strategic positioning.

**Domain:** TBD; target `atta.ai` (preferred, not owned). The hub at `attalabs.dev` (served by `apps/atta-ai/web`) is the AttaLabs lab surface, not Atta-the-product.

**Next:** Vitakka V1 build → then Atta V1 composition (Vitakka + Sati). Build sequence locked. See `apps/atta-ai/specs/atta-build-strategy.md`.

### Vitakka — *concept locked; build not yet started*

**Status:** Concept locked (May 3, 2026). Build not yet started. Vitakka V1 ships standalone to `vitakka.attalabs.dev`; later composes inside Atta as the focus / situated-cognition layer.

**What it is:** Personal AI thinking partner — situated cognition with artifacts, MCPs, conversation history, accumulated conclusions inside a Focus. See `apps/vitakka-ai/specs/vitakka-human.md` (narrative) and `vitakka-spec.md` (technical).

**Domain:** `vitakka.attalabs.dev` (when built).

**Next:** Vitakka V1 build can start in parallel with Vāda first-user validation. See `atta-build-strategy.md` for sequencing.

### Sati — *memory layer inside Atta; standalone surface scope deferred*

**Status:** No code exists yet. Concept clarified by round 4 (May 3, 2026). Memory layer inside Atta. Standalone surface (separate from being internal to Atta) is a deferred decision — Sati may have its own surface or may live entirely as Atta's internal memory layer.

**What it is:** Cross-Focus / cross-provider / cross-session persistent memory of the user's thinking. When Vitakka composes with Sati, the result is the Atta experience: thinking that compounds.

Earlier framing (April 26, 2026) presented Sati as having been "renamed from the previous Atta-the-product." That history is preserved in the decision log but is no longer the framing — Sati is the memory layer; Atta is the composed deep-thinking AI product.

**Domain:** TBD (may or may not exist as a standalone surface).

**Next:** Buildout downstream of Vitakka shipping.

### Cetana — *V0.5 + F6 shipped; internal dev tooling, not part of Atta; the optional AEG orchestrator*

V0 Coordinator shipped May 10 (PR #25). V0.5 spec locked May 11 (PR #33). V0.5 Step 1 (F5) shipped May 12 (PRs #39/#42/#43). Install gate D-021 verified end-to-end by Principal. F6 (`cetana watch`) shipped June 3, 2026 (PR #79).

**Current capability:** `cetana init`, `cetana dispatch <issue>`, `cetana list`, `cetana reply <id> "msg"`, `cetana logs <id>`, `cetana watch <id>`. Hierarchical config. Heartbeat-based CRASHED detection. 46 passing tests. Claude binary resolved via `which claude` + known fallback paths — no hardcoded path. Model tier resolution via `resolveDispatchModel` in `@atta/models` (config stores `anthropic/balanced`, resolved at dispatch). `repoPath` read from config.

**Relationship to AEG:** Cetana is the **optional orchestration tool** that automates AEG's dispatch/escalation slice in *this* repo. AEG does not depend on it (forge-native). **Cetana knows AEG; AEG does not know Cetana** — and this is now structural: Cetana is a sibling at `apps/cetana-ai/`, never inside `apps/aeg/` (D-038). Its software architecture is documented in `aeg-root/diagrams/system-architecture.md` (scoped explicitly as the tool, not the model).

**Locked decisions (cetana-decisions.md):** D-020 (CLI canonical), D-021 (install gate non-negotiable), D-022 (thin client over Coordinator), D-023 (4-week dogfood gate), D-025 (install gate path coverage), D-026 (watch shape: single-task-by-id).

**Full plan / backlog:** `apps/cetana-ai/specs/cetana-backlog.md`.

**Next:** F7 (`cetana status`) — ready to dispatch (its own iteration, separate from the AEG UI). Then the 4-week dogfood gate (D-023) before any V1 UI.

**What it is:** Local Mac orchestration coordinator for the Atta team's own development workflow. NOT part of Atta-the-product. Sibling product in AttaLabs (D-025 global). Lets Claude Desktop (Team Leader) dispatch Claude Code agents (Developers) into the repo via MCP, watch them work, and unblock them. The `cetana` CLI binary (D-020 — locked) is the canonical operator interface.

**Architecture (locked May 9, 2026; updated to AEG terms June 4):**
- Claude Desktop = Team Leader — local stdio MCP only; web Claude.ai cannot reach localhost
- The Git forge (GitHub) = tasks (Issues), PRs, derived status; the brief lives in the PR body, not the Issue; the plan lives in backlogs, not GitHub
- Cetana Coordinator = single Bun service inside `apps/cetana-ai/`, exposes MCP tools (`cetana.dispatch_task`, `cetana.list_active_tasks`, `cetana.reply_to_blocked_task`, `cetana_request_input`)
- Claude Code = Developer, spawned per task, runs in a git worktree (AEG branch convention `task/<iteration>/<n>`; Cetana V0 runtime paths under `~/.cetana/`)
- JSONL append-only logs at `~/.cetana/tasks/*.jsonl` for the tool's runtime state
- CLI binary = canonical operator interface (D-020 locked). Tauri shell + dashboard deferred to V1 iff V0 proves daily-driver value (D-023 gate: ≥20 tasks, ≥3 concurrent, documented friction).

**Domain:** `cetana.attalabs.dev` reserved for if/when Cetana ships as a public product surface. Internal tooling today.

### Herald — *standalone AttaLabs product; herald-agents-v2 complete (Jun 29); Phase 4 (recruiter B2B surface) is next*

**Full state:** `apps/herald-ai/aeg-project/state.md` — read that file for Herald detail. Backlog: `apps/herald-ai/specs/herald-backlog.md`.
**Phases:** Phase 1 (candidate Envoy) complete June 1 (PR #70). Phase 2 (self-service onboarding + admin redesign) complete June 1–2 (PRs #74/#75) — **needs production verification** (avatar/CV upload not tested in prod). **Phase 3 — recruiter self-serve (paste JD + N CVs → batch forensic audit → ranked reports) complete June 16** — built as the herald-onto-engine AEG iteration (engine onboarding + multi-vendor BYOK + Bulk Audit UI). Phase 4 (recruiter as distinct B2B surface) is future.

**Backlog note (June 10):** Herald's backlog now logs the **engine migration + multi-vendor BYOK** work (move Herald's one AI call onto `@atta/engine` + a Flow YAML; make the API Keys tab support all 12 vendors + per-audit model choice like Vāda — Herald is Anthropic-only today). Sequenced as likely one atomic PR with endpoint unification at the start of the bulk-audit (Phase 3) work. See `apps/herald-ai/specs/herald-backlog.md`.

**Phase 3 integration (June 16):** Phase 3 (recruiter self-serve: bulk audit, N CVs × M JDs) was pulled into the AEG flow as the **herald-onto-engine iteration** — now complete. Engine onboarding + multi-vendor BYOK + Bulk Audit UI all merged.

**Status:** Standalone forensic CV-to-JD match tool. Sibling product in AttaLabs, NOT part of Atta-the-product (D-025). Built by Dani. Exposes itself via MCP for integration — Atta or any MCP host can invoke it as one of many external tools. Separate Clerk app.

**Domain:** `herald.attalabs.dev` (live).

---

## Apps in the monorepo

- `apps/vada-ai/` — Vāda product (web + mcp-server). Production-deployed at `vada.attalabs.dev`. Web hosts the hosted MCP route at `apps/vada-ai/web/src/app/api/mcp/route.ts`.
- `apps/atta-ai/` — AttaLabs hub. Production-deployed at `attalabs.dev` (April 28). Hosts engine tools and engine-as-MCP. The directory name `atta-ai` is historical; the app serves the AttaLabs hub, not Atta-the-product.
- `apps/cetana-ai/` — Cetana V0/V0.5 (coordinator + CLI + MCP servers). No UI. Internal dev tooling / the optional AEG orchestrator.
- `apps/herald-ai/` — Herald product (web + mobile + mcp). Separate auth.
- `apps/vitakka-ai/` — scaffold; build not yet started.
- `apps/aeg/` — **spec-only scaffold (D-038, June 10).** AEG the product: `specs/` (architecture, backlog, decisions) + `aeg-project/` (state — renamed per D-041; `now.md` retired per D-057). No `apps/aeg/web` code yet → `aeg.attalabs.dev`. The designated first real iteration.
- `apps/desktop/` — AttaLabs Desktop. Spec-only (DRAFT / NOT RATIFIED). Tauri shell embedding the web products + a local CLI transport.

`apps/atta-labs-ai/` was deleted April 28 (Operations cleanup).

---

## Shared infrastructure (`@atta/*` packages)

- `@atta/engine` — Plan compiler. Includes optional `BrokeredWorkflow.synthesis` field; per-node error capture; PlanNodeKind/PlanEdgeKind emission across all compilers.
- `@atta/agents` — agent primitives. `AgentRole` deleted (May 3) — role is presentation, not engine.
- `@atta/adapter-langgraph` — LangGraph execution + cognitive router. Dispatches by SDK shape (3 branches: `anthropic`, `google-genai`, `openai-compat`) reading `vendorId` from the catalog-resolved override map or vendor registry prefix fallback. Supports all 12 vendors. See vada-decisions.md D-032.
- `@atta/auth` — Clerk wrapper + bearer-token validation. Includes `verifyApiKeyBearer` for hosted MCP. Single Clerk app SSO model.
- `@atta/crypto` — envelope encryption for sensitive columns (AES-256-GCM, AAD-bound). API key generation + SHA-256 hashing. Master key from `MASTER_ENCRYPTION_KEY`; `kms_key_id` reserved for future KMS. (The AEG UI's GitHub-token vault will reuse this.)
- `@atta/db` — Drizzle ORM + Neon client. Single shared `users` table keyed by `clerk_id`. Ecosystem-shared key tables: `apiKeys`, `userProviderKeys`, `mcpSessions` in `packages/db/src/schema/keys.ts`.
- `@atta/ui` — shadcn/ui + Tailwind + lucide-react + canvas particle system (AIACanvas). Includes `@atta/ui/account` (themed Clerk wrappers + `ProviderKeysSection` + `ApiKeysSection`). `@atta/ui/engine-flow` subpath (React Flow / `@xyflow/react`) — the renderer the AEG iteration DAG will reuse.
- `@atta/cms` — Sanity schemas + typed queries.
- `@atta/storage` — Cloudflare R2 client.
- `@atta/identity` — preserved post-May-4 reversal but no longer canonical key store. Surviving roles: `probeProviderKey`, `fetchInstalledOllamaModels`, `MigrationPrompt`, `useIdentity` hook. Mounted via `IdentityProvider` in vada-ai and atta-ai layouts.
- `@atta/typescript-config` — base + nextjs tsconfig.
- `@atta/models` — model catalog AND vendor registry (`vendors.ts`, 12 vendors). Single source of truth for vendor metadata. See vada-decisions.md D-032.

`@xyflow/react` is a direct dependency of `apps/vada-ai/web`.

The `@atta/*` namespace is the monorepo's name, not a brand.

---

## Auth state

**Single Clerk app, AttaLabs-ecosystem-wide.** Live in production. Cookie scoped to `.attalabs.dev`.

**Pending (manual, not blocking):** Vitakka Clerk app in dashboard — unused, can delete.

**Apple OAuth:** deferred (needs $99/year Apple Developer account)
**Email auth:** disabled in Clerk dashboard (V1 OAuth-only)

---

## Domain & DNS state

- `attalabs.dev` registered at GoDaddy. Production DNS configured.
- `vada.attalabs.dev` — Vāda production. Live.
- `attalabs.dev` (root) — AttaLabs hub. Live.
- `herald.attalabs.dev` — Herald. Live.
- `clerk.attalabs.dev` — Clerk frontend API CNAME. Live.
- `*.attalabs.dev` — wildcard CNAME to Vercel (covers the planned `aeg.attalabs.dev`).
- Local dev: `attalabs.test`, `vada.attalabs.test` resolve to `127.0.0.1`. (`account.attalabs.test` no longer used per vada-decisions.md D-030.)
- `atta.com` (€500K) — not pursued.
- `atta.ai` — Japanese individual owner; signal of possible release 2027. Target Atta-the-product domain.

---

## BYOK architecture state

**Server-side at rest, decrypted per-request, since May 4, 2026 (vada-decisions.md D-028 + D-029).**

`user_provider_keys` table holds envelope-encrypted provider keys (AES-256-GCM, AAD-bound to `clerkId`, master key from `MASTER_ENCRYPTION_KEY`). Decryption happens only inside request handlers (`/api/deliberation/[id]/workflow/run`, `/api/mcp`). Plaintext never logged or persisted. `kms_key_id` column reserved for V2 KMS migration.

Distinct from the prior browser-only BYOK story (pre-May 4), which used IndexedDB + passkey for at-rest storage and transited keys through Vāda's server in cleartext. That model was stronger for at-rest privacy but incompatible with hosted MCP. The reversal was the explicit cost of shipping hosted MCP.

`@atta/identity` package retained: `IdentityProvider` mounted in vada-ai and atta-ai layouts. The package no longer holds canonical keys.

Two specs:
- `apps/vada-ai/specs/vada-byok-principles.md` — current state, rewritten May 6.
- `apps/vada-ai/specs/vada-byok-gap-report.md` — historical (April 30 framework). All four gaps closed or superseded; preserved for record.

**Herald note (June 10):** Herald has its own per-user encrypted key store (same `@atta/crypto` + `getProviderKeys` backbone, D-031) but is **Anthropic-only** in its UI today (settings reads only `keys.anthropic`). Making Herald multi-vendor + model-choice like Vāda is logged in the Herald backlog, coupled to the engine migration.

---

## Hosted MCP — shipped (May 4, 2026)

**Live at:** `https://vada.attalabs.dev/api/mcp`
**Transport:** Streamable HTTP (POST + SSE)
**Auth:** Vāda API key (bearer token). SHA-256 hashed in `api_keys` table.
**BYOK:** server-side envelope-encrypted in `user_provider_keys`; same store backs the web app's deliberate page (vada-decisions.md D-028).
**Two MCP tools:** `vada__consult`, `vada__deliberate`. Identical input/output shapes to the local stdio server.
**Per-slot model configurability:** `vada__consult` accepts optional `reviewer_config: Record<agentName, modelId>` (May 11, PR #31), validated against the vendor registry.

**Status:** Shipped May 4 (PRs #9 + #10). Phases 1-4 complete. Phase 5 (stdio session URL `vada.ai` hardcode bug) and Phase 6 (rate limiting, audit log, hardening) remain future work. Contract surfaces aligned May 9 (PR #21). Vendor registry consolidation May 11 (PR #31). Dogfooded May 9 via curl (healthy) and Claude.ai web (broker bug `ofid_*` reconfirmed — Claude Code CLI is the working integration).

See `apps/vada-ai/specs/mcp-architecture.md`, `vada-decisions.md` D-029 (hosted MCP) and D-032 (vendor registry).

---

## DB schema management

Vāda's web app maintains its DB schema via `bun run db:push` from `apps/vada-ai/web/`. Ecosystem-shared key tables live in `@atta/db` and have their own migration handling. No Drizzle migration tracking table yet. When `@atta/db` consolidates further, decide `db:push` vs tracked migrations. No urgency.

---

## Doc system

This ecosystem uses the repo as the source of truth for project management. See `coordination.md` for full rules.

**AEG files (in repo, split per D-041):** the **model** lives in `aeg-root/` (`coordination.md`, `state-machine.md`, `aeg-manual-flow.md`, `process.md`, `projects.md`, `reviewer-prompt.md`, plus `iterations/` (README + active iterations), `roles/` (principal, team-leader, developer, reviewer, security, archivist), `skills/`, and `diagrams/`); the **living state** lives in `aeg-project/` (`state.md`, `changelog.md`, `lessons.md`, `decisions.md`, `ratification-queue.md`) — one at the repo root, one per project at `apps/<x>/aeg-project/`. Plus `docs-index.md` at repo root. **`roadmap.md` is retired (D-029). `now.md` is retired (D-057) — active/blocked/next state is derived from the forge.**

**Backlogs (the plan) live in `specs/` (D-037):** `specs/ecosystem-backlog.md` (monorepo / cross-cutting / AEG-the-model) and `apps/<project>/specs/<project>-backlog.md` (per project, including `apps/aeg/specs/aeg-backlog.md`). The rule: a unit's *plan* lives in its `specs/`; the AEG *model* lives once in `aeg-root/`; a unit's *living state* lives in its `aeg-project/`. (`docs/ecosystem-backlog.md` was moved to `specs/` June 10; the dead `plan.md` redirect stub from D-024 was removed the same day.)

**Everything else is repo specs/skills/code, indexed by `docs-index.md`.**

### Recently shipped (most recent first)

**July 1–2, 2026 — aeg-consolidation iteration complete.** Homed the AEG coherence-check engine (`scripts/verify-coherence.ts` + `scripts/verify-docs.ts`) in `@atta/aeg-core` as pure, exhaustively-tested functions, and relocated the CLI shims themselves into `packages/aeg-core/bin/` — the only sanctioned crossing point into the host monorepo is now `.github/workflows/*.yml`. Fixed the two confirmed CI≠local drift bugs (missing `BRANCH` in the coherence-gate CI step; `isGrandfathered(null)` on forge-fetch failure) and re-armed the `coherence-gate` as a genuinely blocking CI check (fulfilling D-069). Added the docs coherence gate (C6): a data-driven "surfaced doc" manifest (`packages/aeg-core/src/docs/surfaced-manifest.ts`, D-079) asserting every canonical AEG framework doc is reachable in the doc-nav tree with no orphans or dangling links — the same manifest `aeg-studio-cleanup` #292 will consume for Studio's `/docs` curation. 4 task PRs: #271, #277, #305, #315 — July 1–2. Absorbed `aeg-coherence-v1`'s former task 5 (D-070 movement) as this iteration's task 3.

**June 18–29, 2026 — herald-agents-v2 iteration complete.** Forensic-hiring-auditor intelligence extracted to `packages/agents/forensic-hiring-auditor/` (D-046 first execution, D-051); Herald made a thin engine consumer; `herald__audit` MCP tool live at `herald.attalabs.dev/api/mcp`; Bulk Audit UX overhauled (N×M matrix, report cards, cell status, polymorphic inputs); report quality improved with evidence-tiered prompt + fixture evidence (14 regression tests); owner `/ui` + `/settings` relocated under `/[username]/(owner)/` with `extraActions` topbar buttons (D-061); deploy verification complete — code paths clean, browser-auth flows need manual principal sign-off. **#234 open bug:** prod `ANTHROPIC_API_KEY` likely expired — fallback triggered on non-BYOK audits; Principal to rotate or defer. T6 (abuse cap) verified already-implemented; closed by Principal (no PR). 7 task PRs: #148, #150, #156, #191, #193, #213, #235 — June 18–29.

**June 28, 2026 — vada-production-v1 deliberate-page slice + UI-libraries restoration (PR #207).** Council deliberations end-to-end: `vada-council` + `vada-council-synthesis` YAML specs published; `CouncilFeed` (N independent-answer columns, vendor-color spheres via `resolveVendorColor → VENDORS[v].color`; grey-sphere bug fixed by construction; completion-fill streaming; locked `{agreements, disagreements, bottomLine}` synthesis panel); per-spec routing. Deliberate-page production UX: frontier-chat hero input (inline-right single-line → footer multi-line), morphing Configure↔Submit, dropdown restyle/short labels (kills Council "reviewers" misnomer), team-identity Configure modal, tool-badge corner glyph + `badgeLeft` slot, `RouteAwareFooter` (Vāda-only). `SmartPromptInput` dependency-injection contract — shared composites resolve no library; consumers inject primitives (D-064 ACTIVE). `TextReveal` added to `@atta/ui` contract + all 4 libraries. UI-libraries doctrine (D-065 ACTIVE): `installed/*` re-established as verbatim upstream CLI pastes; Biome-ignored; `check-forbidden-colors` gate exempts them; customizations in `components/interactive/*`; Tabs + Button restored to canonical; per-library cva; dropped zero-consumer variants and contract types; skills updated; supersedes #226. 4 teams now in public catalog. Rode-along: Herald `JDInput` bare-variant refactor; `tools/admin` theme-editor routing fix. This is the 6a/6b/6c slice; vada-production-v1 back half (Fusion, benchmark, Teams stats, hardening) remains open.

**June 18–20, 2026 — aeg-governance-ui-v2 iteration complete.** Completed the AEG model by writing all five missing role-seam contracts (`aeg-root/contracts/brief-developer.md`, `developer-reviewer.md`, `reviewer-archivist.md`, `archivist-iteration-archivist.md`, `iteration-archivist-planner.md`), adding Planner readiness gate item 8 (enforces iteration archival before new planning on any product), and running a governance gap discovery spike (`aeg-root/discovery/2026-06-17-governance-gaps.md`, 16 gaps documented). AEG Studio fully refactored with the science layout pattern (replacing `StudioShell` + `StudioSidebar`), wired to Atta CMS config via `NextWebShell`, and extended with a cross-product `/iterations` view and token ledger display on the iteration detail page. 6 PRs merged (#144 task/1a, #145 task/1b, #149 task/2, #152 task/theme unplanned, #153 task/4, #155 task/3).

**June 16–17, 2026 — herald-onto-engine + aeg-ui-v1 iterations complete.** Engine onboarding for Herald with multi-vendor BYOK + Bulk Audit UI (8 merged PRs). AEG Studio scaffolded with project/iteration topology, kanban, task-dependency graph, shared docs renderer, and verification role (11 merged PRs). Task 9-view (token ledger display) unblocked.

**June 11, 2026 — AEG folder restructure + "product"→"project" vocabulary erasure (D-041, PR #86).** Root `project-management/` split into `aeg-root/` (the model — exists once, at the root only) and `aeg-project/` (the living state — one at the root, one per project). Per-project `apps/*/project-management/` renamed to `apps/*/aeg-project/`. "Product" erased from AEG vocabulary in favor of "project" (the AEG unit-of-work); brand-instance product references (Atta, Vāda, Herald, …) and the `severity:product` label literal kept. `products.md` → `projects.md`; brief `Product:` → `Project:`; `aeg.sh add-product` → `add-project`. Orient-from-root rule added to `coordination.md` and `state-machine.md`. One commit, revertible with one `git revert`.

**June 10, 2026 — AEG product folder + backlog relocation + D-030 ratification (direct to main + PR #83).**
- **AEG the product scaffolded (global D-038):** `apps/aeg/` created spec-only (architecture + backlog + decisions + per-project state layer), registered in `projects.md`. Distinguishes AEG-the-product (UI + `aeg.sh`) from AEG-the-model (root `aeg-root/`). Orchestrator-independence made structural: Cetana stays a sibling at `apps/cetana-ai/`, never inside `apps/aeg/` — AEG does not know Cetana. The AEG-UI write-up moved from the ecosystem backlog into `apps/aeg/specs/aeg-backlog.md`.
- **Backlogs moved to `specs/` (global D-037):** `docs/ecosystem-backlog.md` → `specs/ecosystem-backlog.md`, establishing the uniform rule "a unit's plan lives in its `specs/`." `coordination.md`, `state.md`, `projects.md`, and references updated. Dead `plan.md` redirect stub (D-024) removed.
- **PR #83 merged (June 8) + D-030 ratified ACTIVE (June 10):** AEG enhancements — provenance block (Archivist close-out projection), advisory spec-conformance review (amended from BLOCKER → advisory before ratification), observe mode (read-only adoption floor).
- **Herald backlog updated:** engine migration + multi-vendor BYOK / model-choice logged (Herald is Anthropic-only today). Cetana backlog stale header fixed (F6 shipped; F7 next).

**June 4–5, 2026 — AEG model ratified + PM hygiene (PR #80, then direct-to-main cleanup).**
- **PR #80 (merged `ab7c4d4`) — AEG manual-flow + iteration layer + full doc reconciliation.** Ratified as global **D-029** (Type 1). Forge-native/orchestrator-independent model: task = Issue, status derived, thin iteration topology file, static package-level conflicts, brief in PR body, two dispatch gates, Planner as a third TL mode, Archivist role doc, three anti-regression rules. New: `aeg-manual-flow.md`, `iterations/README.md`, `products.md`, `roles/planner.md`, `roles/archivist.md`, the three `*-backlog.md`, the ecosystem backlog. Reconciled: `coordination.md`, `process.md`, `state-machine.md`, every other role doc, `brief-authoring/SKILL.md`, both `diagrams/`. `roadmap.md` retired. Pressure-tested across three external-reviewer rounds (Gemini/DeepSeek/ChatGPT) to unanimous endorsement.
- **verify-docs CI gate installed** (`.github/workflows/verify-docs.yml`) — fulfilling D-027; now blocking on PRs.
- **PM hygiene (direct to main):** `now.md` repointed from the retired `roadmap.md` to the backlogs; the example iteration `cetana-cli-ladder.md` removed (`iterations/` now holds only `README.md`); this `state.md` refreshed to the AEG model.

**June 3, 2026 — Cetana F6 (`cetana watch`) shipped (PR #79).** Single-task-by-id watch (cetana-decisions.md D-026). Plus Herald logo refactor + admin TopBar unification.

**June 2, 2026 — Governance roles + verify-docs gate (PR #78).** Reviewer + Security role docs and agent defs (D-026); AgentShield interim security scan (D-028); verify-docs implemented as a real gate (D-027, workflow staged).

**June 1, 2026 — Cetana spawner fixes + Herald Phase 1 + test failures + Vāda key validation.**
- **PR #68 — Cetana spawner fixes:** tier-based model resolution; `which claude` binary resolution; `repoPath` from config.
- **PR #70 — Herald Phase 1 complete:** match reads profile from DB; GitHub signals server-side; graceful Redis degradation. Envoy live.
- **PR #71 — test failures from #29:** localStorage mock reset; `planToVisualNodes` cross-round edge off-by-one.
- **PR #65 — Vāda provider key validation:** validates non-local-vendor agents have keys before `runLangGraph`.

**May 12 — v2 naming and framing audit (PR #46, D-025).** AttaLabs = dev/lab; Atta = product; no `-AI` suffix; Pāli rule demoted; Cetana = internal tooling; Herald = standalone.

**May 12 — Cetana V0.5 Step 1 (F5) shipped (PRs #39/#42/#43).** `@atta/cetana-cli`: `init`, `dispatch`, `list`, `reply`, `logs`. D-021 verified end-to-end. D-025 (install-gate path coverage) added.

**May 11 — Vendor registry consolidation (PR #31, D-032).** `packages/models/src/vendors.ts` — 12 vendors, single source of truth. SDK-shape dispatch. `reviewer_config` for MCP. Crucible/Sparring/War Room unpublished. Full `RouteProvider`→`VendorId` migration.

**May 10 — Cetana V0 shipped (PR #25) + v3 operational model adopted.** State-machine-governed coordination (precursor to AEG).

**May 9 — MCP contract fixes + skill registration unblock (PRs #20 + #21).** `paths.txt` decoupling (17 skills); `vada__consult`/`vada__deliberate` surfaces aligned with runtime; hosted MCP dogfooded.

**May 6 — doc audit (`docs/may-5-reality-sync`).** 7 files synced to May 4-5 reality.

**May 5 — `feat/shared-keys-ui` merged.** `@atta/ui/account` extraction; ecosystem key schemas to `@atta/db`; Settings restructured.

**May 4 — hosted MCP + single-source-keys (PRs #9/#10/#13).**

**May 3 — engine-flow-ui PR.** `/teams` + `/teams/[slug]`; `@atta/ui/engine-flow`; engine vocabulary refactor; role/engine separation.

**April 28 — production launch.** Vāda + AttaLabs hub deployed.

**April 30 – May 1 — Track B Item 2 closeout.** Multi-vendor adapter, engine extensions, Vāda Reviewers v1 YAMLs.

### Stale, references old framing or pre-merge state

- `apps/vada-ai/specs/vada-state.md` (Vāda-internal — needs phase update post-May-4-5)
- `apps/vada-ai/specs/vada-product-spec.md`, `vada-product-recognitions.md`
- `apps/vada-ai/specs/vada-reviewers-spec.md` — MCP/BYOK references; §8 phantom-consensus not in locked decisions
- `apps/vada-ai/specs/vada-teams-catalog/02-mcp-tool-interface.md` — old `apiKey` body param (route now reads from DB by `clerkId`)
- `apps/vada-ai/specs/vada-teams-catalog/04-caller-claude-protocol.md` — "Caller Claude owns synthesis" reversed by D-016
- `apps/vada-ai/CLAUDE.md` — Settings tab table still shows Teams tab
- Trust page content — references browser-only BYOK; needs rewrite
- `apps/atta-ai/specs/cetana-reality-check.md` — V0/V0.7/V1 sequencing superseded
- `apps/atta-ai/specs/atta-build-strategy.md` — Cetana "Layer 4" section references retired sequencing
- `.claude/skills/vada-mcp-server/SKILL.md` — `domain_expert` how-to reference
- `.claude/skills/atta-adapter-langgraph/SKILL.md` — may describe per-vendor switch (pre-PR-31)
- `.claude/skills/model-picker/SKILL.md` — may reference `RouteProvider`/`PROVIDERS` (pre-PR-31)

---

## What exists physically vs. what's planned

**Exists in code (June 10, 2026):**
- `apps/vada-ai/web` + hosted MCP route — production-deployed
- `apps/vada-ai/mcp-server` — local stdio MCP server
- `apps/atta-ai/mcp-server` — engine-as-MCP server
- `apps/atta-ai/web` — AttaLabs hub, production-deployed
- `apps/cetana-ai/coordinator/` + `apps/cetana-ai/cli/` — Cetana V0/V0.5 (+ F6 watch)
- `apps/herald-ai/*` — Herald (separate auth). Phases 1–2 complete; Phase 3 in active build.
- `apps/vitakka-ai/` — scaffold; build not started
- All `@atta/*` packages (incl. `@atta/crypto`, `@atta/ui/account`, `@atta/ui/engine-flow`, `@atta/db` shared key schemas)
- `packages/models/src/vendors.ts` — vendor registry (12 vendors)
- 11 YAML teams (4 published, 7 experimental)
- `aeg-root/` + `aeg-project/` — full AEG model doc set (constitution, manual-flow, process, iterations/README, projects, roles ×6, skills ×3, diagrams ×2) + global state (decisions to D-057, state, changelog, lessons, ratification-queue); `.github/workflows/verify-docs.yml` live
- `specs/ecosystem-backlog.md` — the monorepo's plan (moved from `docs/`, D-037)
- `apps/aeg/specs/` + `apps/aeg/aeg-project/` — AEG product spec-only scaffold (D-038); no `apps/aeg/web` yet
- `apps/desktop/specs/` — AttaLabs Desktop spec set (DRAFT / NOT RATIFIED); no `apps/desktop` code yet
- `.claude/skills/*/paths.txt` (17 skills)

**Specced / planned but not yet built:**
- **AEG UI** (`apps/aeg/web`) — the first real iteration (folder scaffolded, code not started)
- `aeg.sh` neutral scaffolder (specced in `apps/aeg/specs/aeg-backlog.md`)
- Reviewer system prompt iteration (3b); synthesizer iteration (3c); Vāda Reviewers benchmark (4)
- Vitakka V1 build
- Herald Phase 3 (recruiter self-serve) — in active build, outside the flow; engine migration + multi-vendor BYOK logged in the Herald backlog
- Cetana F7 (`cetana status`) — ready to dispatch
- Spec refresh-and-ratify pass (Vāda first) → Integrity Reviewer (spec-integrity chain, `specs/ecosystem-backlog.md`)

**Active iterations:** herald-onto-engine: complete ✅ (June 16). aeg-ui-v1: complete ✅ (June 20). aeg-governance-ui-v2: complete ✅ (June 20). **herald-agents-v2: complete ✅ (June 29) — archived.** **aeg-coherence-v1: complete ✅ (July 1) — archived; 6/9 tasks shipped, 5 moved to aeg-consolidation + aeg-governance-hardening (D-070).** **aeg-consolidation: complete ✅ (July 2) — archived; 4/4 tasks shipped (#263/#264/#220/#265).** **aeg-governance-hardening** (10 tasks) and **aeg-studio-cleanup** (4 tasks, `Lifecycle: planned`): active/planned — prioritized ahead of Vāda by explicit Principal decision. vada-production-v1: active but parked (6/21 tasks done); deliberate-page slice (6a/6b/6c) shipped PR #207 June 28; Fusion (T4/T5) merged June 29; back half (T8–T16) open; #180/#182 read Incoherent, unresolved. Studio: Active 2→2; Archived 6→7.

**Drafted briefs awaiting dispatch:** none.

**Does not exist yet:**
- Atta-the-product (composed Vāda + Vitakka + Sati)
- `apps/aeg/web` — AEG Studio V1 shipped (aeg-ui-v1, June 2026). Next: Portal (public hosted surface, future).
- `apps/account/web` — DEFERRED indefinitely (D-030 — see vada-decisions, distinct from global D-030)
- Sati standalone surface — scope deferred
- Hosted MCP hardening (rate limiting, audit log, KMS, per-key tool scoping)
- Trust + MCP page content rewrites
- Cetana V1 surfaces (Tauri shell, dashboard) — deferred until D-023 gate

---

## Open questions across the ecosystem

- **OQ-cross-1:** Does Sati get built before or after Vāda hits revenue?
- **~~OQ-cross-2~~ (RESOLVED May 5):** No billing hub at `account.attalabs.dev`. Component-level sharing via `@atta/ui/account` (vada-decisions D-030).
- **OQ-cross-3:** `atta.ai` migration — eager vs. wait for natural rebuild moment? (May free 2027.)
- **OQ-cross-4:** When `@atta/db` consolidates further, keep `db:push` or move to tracked migrations?
- **~~OQ-cross-5~~ (RESOLVED May 9):** V0.7 path collapsed; Cetana V0 implements the escalation primitive directly.
- **~~OQ-cross-6~~ (RESOLVED May 4):** Server-side at rest, envelope-encrypted (vada-decisions D-028).
- **~~OQ-cross-7~~ (RESOLVED May 5):** API key management in product-local Settings via shared components (vada-decisions D-030).
- **OQ-cross-8:** Fate of the 7 experimental YAMLs after the Vāda Reviewers benchmark.
- **~~OQ-cross-9~~ (RESOLVED May 3):** Engine vocabulary — Choice A. `PlanNodeKind` + `PlanEdgeKind` shipped.
- **~~OQ-cross-10~~ (RESOLVED May 9):** Cetana V0 not superseded by CCPM/APM; interactive pause/resume is the differentiator.
- **OQ-cross-11 (May 9):** Does Cetana V1 (Tauri + dashboard) ship after 2 weeks of V0 use, or is V0 sufficient indefinitely?
- **OQ-cross-12 (May 11):** When a vendor's SDK shape diverges, add a 4th `sdkShape` branch (latency) or proxy via OpenRouter (convenience)? Decide per case.
- **OQ-cross-13 (May 12):** Should Sati have a standalone surface, or live entirely as Atta's internal memory layer? Deferred.
- **OQ-cross-14 (June 5):** AEG UI scope — it must render the **plan** (backlogs) as well as **execution** (iterations), since retiring `roadmap.md` removed the single whole-plan view. Single-tenant *usage* (you, one repo, next job) on a multi-repo, tagged *architecture* (repos group by company and by product). GitHub App OAuth, read-only, per-repo, encrypted tokens; webhook-fed forge-fact cache (never authored status). AEG-only (a repo must practice AEG to render). (Now homed in `apps/aeg/specs/` per D-038.)

Vāda-internal open questions live in `apps/vada-ai/specs/vada-state.md`.
