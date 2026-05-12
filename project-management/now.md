# Atta — Now

**Active work, next steps, and manual tasks.** Changes daily.

→ [roadmap.md](roadmap.md) — tracks + sequencing + open questions
→ [changelog.md](changelog.md) — what shipped
→ [lessons.md](lessons.md) — calibration

---

## In flight now

**Cetana V0.5 Step 1 (F5) shipped, Principal-verified (May 12, 2026).** Three PRs: #39 (initial), #42 (install command fix), #43 (abort hang fix). Install gate D-021 honored end-to-end. D-025 added: install gate path coverage requirement. Next: F6 (`cetana watch`) — ready to dispatch.

**Vendor registry consolidation shipped (May 11, 2026 — PR #31).** Single source of truth at `packages/models/src/vendors.ts` (12 vendors). 4 prior prefix-resolution implementations collapsed to 1. Adapter dispatches by SDK shape (3 branches: `anthropic`, `google-genai`, `openai-compat`). `vada__consult` MCP tool gains `reviewer_config` parameter mirroring the web UI. Crucible/Sparring/War Room marked `experimental: true` (unpublished from public catalog). `providers.ts` backward-compat shim deleted; 6 consumer files + 12 web-app files migrated from `RouteProvider`/`PROVIDERS` to `VendorId`/`VENDORS`. No half-merged state on main. See D-032.

**v3 operational model shipped (May 10, 2026).** State-machine-governed coordination model with three conversational roles (Principal, Team Leader, Developer) + Archivist automation. New files: `state-machine.md` (constitution), `decisions.md` (global D-001 to D-016), three role docs, `reviewer-prompt.md`, `ratification-queue.md`. Coordination.md rewritten. Brief-authoring-rules migrated to `.claude/skills/brief-authoring/SKILL.md` with v3 fields. Cetana spec renamed to `cetana-spec.md` (D-018 locked). Archivist V0.7 stub in `.github/workflows/archivist.yml`. `scripts/verify-docs.ts` stub added.

**Code follow-up items from v3 model (NOT in this PR — next tasks):**
- `cetana_request_input` severity routing implementation in `src/tools/request-input.ts` + GitHub label posting (D-016)
- Archivist V0.7 real implementation: brief-validation job checks tier field + lock acknowledgments (D-017)
- `verify-docs.ts` V1 implementation: spec Status blocks, decision log field validation, docs-index sync (D-010)
- Spec ratification pass: read all current specs, add `Status: draft` or `Status: ratified` blocks as appropriate

**Cetana V0 shipped (May 10, 2026).** Full coordinator built at `apps/cetana-ai/coordinator/`. Three specs, one skill, brief-authoring-rules migrated, prototype deleted. First real dispatch: Track B Item 3b (Reviewer prompt iteration). Configure Claude Desktop with the strategist MCP server, then dispatch.

**MCP contract surfaces + skill registration fixed (May 9, 2026).** PRs #20 and #21 merged. Skill registration unblocked across 17 skills (paths decoupled from SKILL.md frontmatter into sibling `paths.txt`). Vāda's `vada__consult` and `vada__deliberate` MCP tool surfaces aligned with deployed runtime — structured input schema, expanded team enum, stale references and `domain_expert` removed, README retired old terminology and added hosted MCP section. Hosted MCP empirically dogfooded via curl (server healthy) and Claude.ai web (Track E12 broker bug reconfirmed — `ofid_*` errors). Claude Code CLI is the working integration today.

**PM docs migrated to repo (May 9, 2026).** Project-management files (`coordination.md`, `state.md`, `plan.md`, `brief-authoring-rules.md`) moved from Claude.ai project knowledge to repo at `project-management/` via PR #22. Eliminates manual upload loop, gives files git history, prepares for Cetana V0 (which reads/writes these files programmatically).

**Hosted MCP shipped end-to-end (May 4).** Live at `https://vada.attalabs.dev/api/mcp`. Bearer auth, envelope-encrypted provider keys, both MCP tools wired through. See D-029.

**Single-source-keys reversal merged (May 4).** Server-side `user_provider_keys` canonical; IndexedDB demoted; `@atta/identity` preserved for probe/Ollama/migration. See D-028.

**`feat/shared-keys-ui` merged (May 5).** Shared components in `@atta/ui/account`, ecosystem-shared key schemas in `@atta/db`, Settings tabs restructured (Account / May 5 — Account / API Keys / Agent Style — Teams tab removed). See D-030.

**Doc audit PR merged (May 6).** Branch `docs/may-5-reality-sync`, commit `aa03a51`. 7 repo files synced to May 4-5 reality.

**Currently active work:** Configure Claude Desktop with Cetana strategist MCP server; dispatch Track B Item 3b (Reviewer prompt iteration) as first real Cetana V0 dispatch.

**Next focused work:** Cetana V0.5 Step 2 — `cetana watch` (F6). Human-readable, color-coded, auto-refreshing JSONL renderer. Estimated 2-3 hours agent work.

---

## Manual work pending (no agent needed)

- **Vitakka Clerk app deletion** — unused, no users, no consumers. 2 minutes.
- **Vercel env audit** — confirm no stray `NEXT_PUBLIC_CLERK_*FALLBACK_REDIRECT_URL` env vars. 5 minutes.
- **Worktree cleanup** — many redundant after May 4-11 merges. Run `git worktree list` and remove anything pointing to merged branches. Includes `.worktrees/skill-paths-decouple`, `.worktrees/mcp-schema-drift`, and `.worktrees/vendor-registry` after PR #31 merge.
- **Add OpenAI + xAI keys server-side** — Anthropic + Groq + Gemini already configured; need OpenAI and xAI to test the full vendor-diverse Reviewers default trio. With PR #31 shipped, every vendor in the registry can be added cleanly.
- **Generate Vāda API key + configure Claude Desktop / Claude Code connector** — final step in dogfooding setup; hosted MCP is live but not yet used end-to-end. Settings → API Keys.
- **Delete `~/code/cetana-prototype/`** — after Cetana V0 ships and is verified working. The throwaway from Slice -1 has served its purpose.
- **Rotate any Vāda API keys exposed in chat transcripts** — May 9 dogfooding session pasted a real `vada_*` key into Claude.ai conversation history. Revoke and regenerate before reuse.
