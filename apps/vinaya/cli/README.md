# @atta/vinaya-cli

The `vinaya` bin — Vinaya's npm-distributed CLI. This package currently ships a **skeleton only**: the command router, the hierarchical config loader, and the versioned `--json` output envelope. No real command logic (`init`, `check`, `doctor`, forge writes) exists yet — those land in later `vinaya-cli-v1` tasks.

## Install (local dev)

`bun link` is not a workspace script — run it directly from this package's directory, not from the repo root:

```bash
cd apps/vinaya/cli && bun link
vinaya help
```

## Commands

| Command | Description |
|---------|-------------|
| `vinaya help` | Usage text |
| `vinaya version` | Print the installed CLI version (`--json` for the enveloped machine form) |
| `vinaya studio` | Launch local Vinaya Studio against the current repo |

## Config

Hierarchical, file-level precedence:

1. Repo-local `vinaya.config.json` (walked up from `cwd` to the filesystem root)
2. Global `~/.vinaya/config.json`
3. `null` if neither exists

Whichever file resolves first is used in full — there is no field-by-field merge across the two files, matching the pattern this loader was ported from (Cetana's `apps/cetana-ai/cli/src/lib/config.ts`).

Today the schema carries one surface, added per D-117:

```json
{
  "rings": {
    "ring1_forgeWriteInterception": true,
    "ring2_asyncAudits": false
  }
}
```

Both `rings` fields are plain booleans — no conditional logic (D-092/D-109). Ring 0 (git hooks) and the CI/branch-protection guarantee are never represented in this schema, by design — they are not configurable.

## JSON output envelope

Every machine-readable (`--json`) output goes through `src/lib/envelope.ts`, which wraps the payload in `{ schema: 1, data: ... }`. The `schema` field is a public-surface commitment (D-100/D-103) — there is no code path in this package that can emit unversioned machine output.

## Interactive commands (future)

None ship in this task. When a later task adds an interactive command with an abort path, it must destroy stdin on abort — Cetana PR #43 hung because an interactive prompt left stdin open after a Ctrl-C. Port that lesson, don't relearn it.

## Architecture

Ported from Cetana's CLI: the config-loader pattern and its precedence regression tests only. No JSONL, no IPC, no coordinator, no state-sync code came across (D-095 — local parallel state is the disease Vinaya exists to kill). No `@atta/aeg-core` import yet — that lands with the `StateSource` seam in a later task.

See `apps/vinaya/specs/vinaya-spec.md` for the full product spec and `apps/vinaya/specs/vinaya-backlog.md` for what's still ahead.
