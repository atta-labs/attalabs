# Atta — Now

**Active work, next steps, and manual tasks.** Changes daily.

→ [roadmap.md](roadmap.md) — tracks + sequencing + open questions
→ [changelog.md](changelog.md) — what shipped
→ [lessons.md](lessons.md) — calibration

---

## In flight now

**D-033 docs cleanup PR (May 13, 2026) — IN FLIGHT.** Vāda spec docs and skill files brought into alignment with the v2 schema and the shipped engine surface. 8 files touched: `apps/vada-ai/specs/yaml-schema-reference.md` (full v2 rewrite), `apps/vada-ai/specs/vada-state.md` (Phase 13 + 14 entries, OQ-H + OQ-I), `apps/vada-ai/specs/generic-flow-refactor.md` (status → ratified and shipped; pragmatic weakenings captured honestly), `.claude/skills/vada-architecture/SKILL.md` (full v2 rewrite), `.claude/skills/vada-yaml-authoring/SKILL.md` (full v2 rewrite), `.claude/skills/atta-engine/SKILL.md` (full v2 rewrite), `project-management/changelog.md` (prepend 4 missing entries), `project-management/now.md` (this file). Branch: `docs/d033-cleanup-v2`. Scope deliberately narrower than original 16-file plan — other Vāda spec files (`vada-product-spec.md`, `vada-product-recognitions.md`, `vada-reviewers-spec.md`, `vada-teams-catalog/*`, `mcp-architecture.md`, `vada-mcp-server/SKILL.md`) listed as "patch when touched for other work" in `roadmap.md` and are out of scope.

**D-034 cleanup shipped (May 13, 2026) — PR #48.** Follow-up to PR #47. `buildRevisionCondition` now throws explicitly on unsupported signal types instead of silently coercing. `RevisionCondition` collapsed to single-variant interface. Dead `json-field-equals`/`json-field-truthy` adapter switch cases + orphaned `getJsonField` helper deleted. 5 files, +35/-86. 68 engine tests. Logged as `vada-decisions.md` D-034.

**D-033 PR 2 shipped (May 13, 2026) — PR #47.** Universal round-based schema + greenfield `compileFlow` + all 9 catalog YAMLs migrated to `schema_version: "2.0"` + deletion of v1 engine surface + 29 consumer file migrations + `flow-helpers.ts` extraction + synthesizer template bug fix. 60 files touched, +477/-2637. Architecturally the cleanest path — Principal rejected the proposed backwards-compat shim in favour of full atomic migration. PR 3 (MCP `agent_config` rename + new SSE events) and PR 4 (UI rewrite) deferred — see `generic-flow-refactor.md` for the deferred work breakdown. See `vada-decisions.md` D-033.

**v2 naming + framing audit shipped (May 13, 2026) — PR #46.** Cross-product brand architecture refactor. AttaLabs = the dev/lab ecosystem at `attalabs.dev`. Atta = a product within AttaLabs, the deep-thinking AI composed of Vāda + Vitakka + Sati (not yet deployed; target `atta.ai`). No `-AI` suffix on any product brand. Pāli rule demoted from structural to elective aesthetic. Cetana reframed as internal dev tooling (sibling AttaLabs product, not part of Atta). Herald reframed as standalone AttaLabs product. 6 files updated. Logged as global `decisions.md` D-025. Note: the global log ends at D-025; references to "D-025-D-033" elsewhere in `state.md` are per-product entries in `cetana-decisions.md` and `vada-decisions.md`, not global — disambiguation by source log is now the rule.

**D-033 PR 1 shipped (May 12, 2026) — PR #41.** Foundational schema work: `Flow`, `Round`, `AgentInRound`, `OnFailureSpec` types + Zod schema + `validateFlow` enforcing 10 rules + 30 unit tests. New files only; old engine surface untouched. Build green; consumed by PR #47.

**Cetana V0.5 Step 1 (F5) shipped, Principal-verified (May 12, 2026).** Three PRs: #39 (initial), #42 (install command fix), #43 (abort hang fix). Install gate D-021 honored end-to-end. `cetana-decisions.md` D-025 added: install gate path coverage requirement. Next: F6 (`cetana watch`) — ready to dispatch.

**Vendor registry consolidation shipped (May 11, 2026 — PR #31).** Single source of truth at `packages/models/src/vendors.ts` (12 vendors). 4 prior prefix-resolution implementations collapsed to 1. Adapter dispatches by SDK shape (3 branches: `anthropic`, `google-genai`, `openai-compat`). `vada__consult` MCP tool gains `reviewer_config` parameter mirroring the web UI. Crucible/Sparring/War Room marked `experimental: true` (unpublished from public catalog). `providers.ts` backward-compat shim deleted; 6 consumer files + 12 web-app files migrated from `RouteProvider`/`PROVIDERS` to `VendorId`/`VENDORS`. No half-merged state on main. See `vada-decisions.md` D-032.

**v3 operational model shipped (May 10, 2026).** State-machine-governed coordination model with three conversational roles (Principal, Team Leader, Developer) + Archivist automation. New files: `state-machine.md` (constitution), `decisions.md` (global D-001 to D-016, now extended through D-025), three role docs, `reviewer-prompt.md`, `ratification-queue.md`. Coordination.md rewritten. Brief-authoring-rules migrated to `.claude/skills/brief-authoring/SKILL.md` with v3 fields. Cetana spec renamed to `cetana-spec.md` (`cetana-decisions.md` D-018 locked). Archivist V0.7 stub in `.github/workflows/archivist.yml`. `scripts/verify-docs.ts` stub added.

**Code follow-up items from v3 model (NOT in this PR — next tasks):**
- `cetana_request_input` severity routing implementation in `src/tools/request-input.ts` + GitHub label posting (global D-016)
- Archivist V0.7 real implementation: brief-validation job checks tier field + lock acknowledgments
- `verify-docs.ts` V1 implementation: spec Status blocks, decision log field validation, docs-index sync (global D-010)
- Spec ratification pass: read all current specs, add `Status: draft` or `Status: ratified` blocks as appropriate

**Cetana V0 shipped (May 10, 2026).** Full coordinator built at `apps/cetana-ai/coordinator/`. Three specs, one skill, brief-authoring-rules migrated, prototype deleted. First real dispatch target: Track B Item 3b (Reviewer prompt iteration). Configure Claude Desktop with the strategist MCP server, then dispatch.

**MCP contract surfaces + skill registration fixed (May 9, 2026).** PRs #20 and #21 merged. Skill registration unblocked across 17 skills (paths decoupled from SKILL.md frontmatter into sibling `paths.txt`). Vāda's `vada__consult` and `vada__deliberate` MCP tool surfaces aligned with deployed runtime — structured input schema, expanded team enum, stale references and `domain_expert` removed, README retired old terminology and added hosted MCP section. Hosted MCP empirically dogfooded via curl (server healthy) and Claude.ai web (Track E12 broker bug reconfirmed — `ofid_*` errors). Claude Code CLI is the working integration today.

**PM docs migrated to repo (May 9, 2026).** Project-management files (`coordination.md`, `state.md`, `plan.md`, `brief-authoring-rules.md`) moved from Claude.ai project knowledge to repo at `project-management/` via PR #22. Eliminates manual upload loop, gives files git history, prepares for Cetana V0 (which reads/writes these files programmatically).

**Hosted MCP shipped end-to-end (May 4).** Live at `https://vada.attalabs.dev/api/mcp`. Bearer auth, envelope-encrypted provider keys, both MCP tools wired through. See `vada-decisions.md` D-029.

**Single-source-keys reversal merged (May 4).** Server-side `user_provider_keys` canonical; IndexedDB demoted; `@atta/identity` preserved for probe/Ollama/migration. See `vada-decisions.md` D-028.

**`feat/shared-keys-ui` merged (May 5).** Shared components in `@atta/ui/account`, ecosystem-shared key schemas in `@atta/db`, Settings tabs restructured (Account / API Keys / Agent Style; Teams tab removed). See `vada-decisions.md` D-030.

**Doc audit PR merged (May 6).** Branch `docs/may-5-reality-sync`, commit `aa03a51`. 7 repo files synced to May 4-5 reality.

**Currently active work:** D-033 docs cleanup PR (this branch) bringing Vāda specs and skill files into alignment with the v2 schema, then ratification + merge.

**Next focused work:** After docs cleanup merges — choose between (a) Track B Item 3b reviewer prompt iteration via Cetana V0/V0.5 dispatch, (b) Cetana V0.5 Step 2 (F6 `cetana watch`) ready to dispatch, or (c) D-033 PR 3 (MCP `agent_config` rename + new SSE events `round_started`/`round_completed`/`revision_started`). PR 4 (UI rewrite) depends on PR 3 emitting the new events.

---

## Manual work pending (no agent needed)

- **Vitakka Clerk app deletion** — unused, no users, no consumers. 2 minutes.
- **Vercel env audit** — confirm no stray `NEXT_PUBLIC_CLERK_*FALLBACK_REDIRECT_URL` env vars. 5 minutes.
- **Worktree cleanup** — many redundant after May 4-13 merges. Run `git worktree list` and remove anything pointing to merged branches. Includes `.worktrees/skill-paths-decouple`, `.worktrees/mcp-schema-drift`, `.worktrees/vendor-registry`, `.worktrees/feat-generic-flow-refactor-pr1`, `.worktrees/feat-generic-flow-refactor-pr2`, `.worktrees/d033-cleanup`, `.worktrees/docs-naming-and-framing-audit-may-12`.
- **Abandon `docs/d033-cleanup` branch (pre-#46-merge base, 6 commits at SHA `818db23`)** — superseded by `docs/d033-cleanup-v2` (rebased to current main, naming framing applied throughout). Delete the abandoned branch after the v2 PR merges.
- **Add OpenAI + xAI keys server-side** — Anthropic + Groq + Gemini already configured; need OpenAI and xAI to test the full vendor-diverse Reviewers default trio. With PR #31 shipped, every vendor in the registry can be added cleanly.
- **Generate Vāda API key + configure Claude Desktop / Claude Code connector** — final step in dogfooding setup; hosted MCP is live but not yet used end-to-end. Settings → API Keys.
- **Delete `~/code/cetana-prototype/`** — after Cetana V0 ships and is verified working. The throwaway from Slice -1 has served its purpose.
- **Rotate any Vāda API keys exposed in chat transcripts** — May 9 dogfooding session pasted a real `vada_*` key into Claude.ai conversation history. Revoke and regenerate before reuse.
