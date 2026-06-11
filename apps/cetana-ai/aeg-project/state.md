# Cetana — Current State

**Last updated:** June 2, 2026
**Purpose:** Per-product snapshot for Cetana. Agents working in `apps/cetana-ai/` read this before starting any task.

---

## What Cetana is

Local Mac orchestration CLI for Dani's solo development workflow. NOT part of Atta-the-product — sibling AttaLabs product. Lets the Team Leader (Claude in chat) dispatch Claude Code agents (Developers) into the repo via GitHub issues, watch them work, and unblock them when they escalate.

Internal dev tooling today. Future public surface at `cetana.attalabs.dev` conditional on dogfood value (D-023: ≥20 tasks, ≥3 concurrent, documented friction).

---

## CLI ladder (V0.5 spec)

| Step | Command | Status |
|------|---------|--------|
| F1 | `cetana init` | ✅ shipped |
| F2 | `cetana dispatch <issue>` | ✅ shipped (PR #68 fixed spawner) |
| F3 | `cetana list` | ✅ shipped |
| F4 | `cetana reply <id> "msg"` | ✅ shipped |
| F5 | `cetana logs <id>` | ✅ shipped |
| **F6** | **`cetana watch <id>`** | **← NEXT — ready to dispatch** |
| F7 | `cetana pause / resume` | not started |
| F8 | `cetana kill <id>` | not started |
| F9 | `cetana status` | not started |

---

## Current build state

**Shipped (PR #68, June 1, 2026):**
- Claude binary resolved via `which claude` + known NVM/homebrew/global fallback paths
- Model tier resolution via `resolveDispatchModel` in `@atta/models` — config stores `anthropic/balanced`, no hardcoded model strings
- `repoPath` read from config (set during `cetana init`, defaults to `git rev-parse --show-toplevel`)
- 26 passing tests
- Install: `cd apps/cetana-ai/cli && bun link`

**Working today:**
- `cetana dispatch <issue>` spawns Claude Code agent in a fresh worktree
- `cetana list` shows active/blocked/crashed tasks
- `cetana reply <id> "msg"` unblocks a waiting agent
- `cetana logs <id>` dumps the JSONL task log (raw, not human-readable)

**Known pain points (F6 fixes these):**
- No live output — agent runs in background, you can only tail JSONL
- JSONL is not human-readable — `cetana logs` dumps raw events
- No way to know what the agent is doing without parsing logs manually
- Crashed tasks clutter `cetana list` with no easy cleanup

---

## Architecture

- `apps/cetana-ai/cli/` — CLI binary (`cetana`)
- `apps/cetana-ai/coordinator/` — Bun coordinator service
- Agent spawned via `claude --output-format stream-json` subprocess
- JSONL logs at `~/.cetana/tasks/*.jsonl`
- Config at `~/.cetana/config.json` (`repoPath`, `model`, `github.*`)
- MCP tool `cetana_request_input` — agent calls this to escalate/block

---

## Locked decisions

| Decision | Summary |
|----------|---------|
| D-020 | CLI is canonical operator interface |
| D-021 | Install gate non-negotiable — must be Principal-runnable |
| D-022 | Thin client over Coordinator |
| D-023 | 4-week dogfood gate before V1 |
| D-025 | Install gate path coverage — every code path, not just happy path |

---

## Key files

| File | Purpose |
|------|---------|
| `apps/cetana-ai/cli/src/commands/` | All CLI commands |
| `apps/cetana-ai/cli/src/lib/state-manager.ts` | Task state, JSONL log paths |
| `apps/cetana-ai/cli/src/lib/config.ts` | Config schema and loading |
| `apps/cetana-ai/coordinator/src/claude-spawner.ts` | Agent spawning |
| `apps/cetana-ai/coordinator/src/paths.ts` | Binary resolution |
| `~/.cetana/config.json` | Runtime config (not in repo) |
| `~/.cetana/tasks/*.jsonl` | Task logs (not in repo) |

---

## What's NOT done yet

- F6 `cetana watch` — live streaming output (highest pain point)
- `cetana init product [app-name]` — scaffold per-product PM files
- Severity routing in `cetana_request_input` (D-016, issue #30)
- F7-F9 commands
- V1 surfaces (Tauri shell, dashboard) — deferred until dogfood gate
- Log cleanup / auto-prune of crashed tasks
