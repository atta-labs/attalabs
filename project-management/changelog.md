# Atta — Changelog

**Completed work log.** Append-only, most recent first.

→ [now.md](now.md) — active work
→ [roadmap.md](roadmap.md) — tracks + sequencing
→ [lessons.md](lessons.md) — calibration

---

## 2026-05-12 — Fix: F5 install gate documentation correction

PR #39 (Cetana V0.5 Step 1) shipped with a broken install command in `apps/cetana-ai/README.md` and `apps/cetana-ai/cli/README.md`. The documented invocation `bun link --cwd apps/cetana-ai/cli` failed on Principal's machine with "Script not found 'link'" because `bun link` is not a workspace script and `--cwd` doesn't apply to it. Correct invocation is `(cd apps/cetana-ai/cli && bun link)` (run from inside the package directory via subshell).

The agent's install-gate verification in PR #39 used the working command but documented a different one. D-021's install gate (Lock: YES) was technically violated.

Calibration lesson added to `lessons.md`: install gate verification must produce Principal-runnable artifacts.

---

## 2026-05-12 — Cetana V0.5 Step 1: CLI scaffold + init (F5 complete)

Shipped the `cetana` CLI binary at `apps/cetana-ai/cli/`. Five commands: `init`, `dispatch`, `list`, `reply`, `logs`. Hierarchical config (local `.cetana.json` overrides global `~/.cetana/config.json`). Heartbeat-based CRASHED detection. Install gate verified end-to-end on fresh checkout.

PR: #39
Commit: 039768c
Conforms to: D-020 (CLI canonical), D-021 (install gate), D-022 (thin client over Coordinator).

After this PR: Cetana V0 is usable without manual JSON editing. Next: F6 (`cetana watch`).

---

## 2026-05-11 — Vendor registry consolidation (PR #31)

- **Two commits on the branch.** `2db31eb` shipped the architectural refactor (registry + SDK-shape dispatch + MCP `reviewer_config` + experimental flag on three YAMLs). `08a041b` shipped the tech-debt cleanup (delete `providers.ts` shim, migrate 6 ecosystem consumers + 12 web-app files). `58926a1` fixed a Vercel build issue (declared `@atta/models` as a workspace dep in `@vada/mcp-server`, masked locally by Bun's hoisted node_modules but exposed by Vercel's `--frozen-lockfile`).
- **Single source of truth.** `packages/models/src/vendors.ts` lists 12 vendors with `sdkShape`, `baseURL`, `keyConvention`, `modelPrefixes`, `envVar`, `localOnly`. `VendorId = keyof typeof VENDORS` replaces the 5-wide `RouteProvider` union. Adding a new OpenAI-compatible vendor is one registry entry; a new SDK shape is one adapter + one switch branch.
- **MCP `reviewer_config`.** `vada__consult` mirrors the web UI's per-slot model configurability. Validated against the registry — refuses `local_only_vendor` and `missing_provider_key` with structured errors. Closes the prior MCP/web contract gap.
- **Unpublished role-played teams.** Crucible, Sparring, War Room marked `experimental: true`. Public `/teams` catalog now shows 2 teams (Vāda Reviewers, Vāda Reviewers + Synthesis). YAMLs retained in repo for bench harness + future iteration.
- **Tech debt fully cleared.** `providers.ts` deleted; 18 consumer files migrated. Architecture clean.
- See D-032 for full decision.

## 2026-05-10 — Cetana V0 shipped (PR #25) + v3 operational model adopted

- Cetana coordinator built at `apps/cetana-ai/coordinator/`. Single Bun service, two MCP server entry points, 4 tools, 38 passing tests.
- State-machine-governed v3 operational model: three conversational roles (Principal, Team Leader, Developer) + Archivist automation. New files in `project-management/`: `state-machine.md`, `decisions.md`, role refs, ratification queue. Brief authoring migrated to `.claude/skills/brief-authoring/SKILL.md`.
- Slice -1 prototype deleted; `cetana-spec.md` finalized (D-018 locked).

## 2026-05-09 — MCP contract fixes + skill registration unblock

- **PR #20** (`fix/skill-paths-decouple`, commit `865c6c9`) merged. Moved per-skill path globs from custom `paths:` SKILL.md frontmatter into sibling `paths.txt` files. Skill tool's frontmatter parser silently drops skills with non-standard fields; the skill-check enforcement hook was demanding skills the Skill tool refused to load. 17 skills affected. Hook updated to read `paths.txt` instead of parsing frontmatter.
- **PR #21** (`fix/mcp-schema-drift`, commit `26c20ba`) merged. Aligned Vāda's `vada__consult` and `vada__deliberate` MCP surfaces with deployed runtime: structured inputSchema (`context`, `question`, `reviewers[{role, notes?, domain?}]`, plus optional `spec_id`, `current_leaning`, `stakes`, `session_title`); team enum expanded to all 5 published specs (later pruned to 2 in PR #31); stale `vada__deliberate_brokered` reference and `domain_expert` description removed; README retired Brokered/Autonomous mode framing, fixed broken specs link, added hosted MCP installation section. Validator (`validateAndNormalize`) untouched — both legacy and structured shapes still accepted.
- **Hosted MCP dogfooded.** Server verified end-to-end via curl (`initialize` + `tools/list` clean with bearer auth). Claude.ai web returns `ofid_5a58c66b85d09d04` — Track E12 broker bug reconfirmed (third independent reproduction). Claude Code CLI works.

## 2026-05-08 — rev 5 of Vāda Reviewers spec + ecosystem doc updates

- `vada-reviewers-spec.md` rev 5: three additions to reviewer + synthesizer prompts (Persona+Goal+Posture+Output structure, verification block requirement, phantom consensus detection). Derived from cross-vendor research synthesis (Gemini, Grok, ChatGPT — May 2026). See D-031.
- `vada-decisions.md` D-031: rev-4-to-rev-5 reasoning recorded.
- `vada-reviewers-tech-deep-dive.md` Section 9.6: methodological note on framework-vs-production patterns.
- `mcp-architecture.md`: known-issue note added on Claude.ai connector broker bug.
- `atta-plan.md`: Vāda Desktop parking-lot item, Track E12 OAuth hardening watchpoint, calibration lessons on principles-vs-specs and broker bug.
- `atta-coordination.md`: GitHub MCP connection note.

## 2026-05-06 — doc audit

- 7 repo files synced to May 4-5 reality via PR `docs/may-5-reality-sync` (commit `aa03a51`)
- D-028, D-029, D-030 appended to `vada-decisions.md`
- BYOK principles rewritten in place; gap report marked historical
- `mcp-architecture.md` flipped target → shipped
- `vada-mcp-server/SKILL.md`, `auth/SKILL.md`, `database/SKILL.md` all updated

## 2026-05-04 — hosted MCP + single-source-keys + shared-keys-ui

- May 4: Hosted MCP server shipped end-to-end (PRs #9 + #10). Endpoint `https://vada.attalabs.dev/api/mcp`. Bearer auth via `vada_*` API keys (SHA-256). Provider keys envelope-encrypted in `user_provider_keys`. Both MCP tools wired through. See D-029.
- May 4: Single-source-keys reversal (PR #13). Server-side canonical; IndexedDB demoted; `@atta/identity` preserved for probe/Ollama/migration. See D-028.
- May 5: `feat/shared-keys-ui` merged. Components extracted to `@atta/ui/account`, schemas moved to `@atta/db`, Settings restructured, D-027 unified team storage. See D-030.

## 2026-05-03 — engine-flow-ui PR

- Full teams catalog surface
- `@atta/ui/engine-flow` module shipped
- Engine vocabulary: `PlanNodeKind` + `PlanEdgeKind` emitted by all 4 compilers
- `AgentRole` deleted from engine

## 2026-05-02 — architectural locks

- Hosted MCP target architecture locked (endpoint, auth, BYOK trust model)
- Role/engine separation locked

## 2026-04-30 — Track B Item 2 + closeout

- Multi-vendor adapter, engine extensions, docs cleanup, web restructure, Vāda Reviewers v1 YAMLs all merged

## 2026-04-29 — post-launch fixes + audits

- Settings UI fixes; BYOK structural audit; Vāda Reviewers spec rev 4 locked
- "Brokered" and "Autonomous" retired as architectural concepts

## 2026-04-28 — production launch

- Vāda + atta hub deployed; DNS configured; OAuth-only V1 launched
