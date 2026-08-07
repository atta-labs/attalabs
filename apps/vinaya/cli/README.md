# @attalabs/vinaya

The `vinaya` bin — Vinaya's npm-distributed CLI, published to the public npm registry as `@attalabs/vinaya`. The installed command is `vinaya`; only the package name carries the scope. This package ships the command router, the hierarchical config loader, the versioned `--json` output envelope, the check engine (`vinaya check` / `vinaya new check`), the install lifecycle (`init` / `doctor` / `upgrade` / `eject`), and validated forge writes (`pr` / `issue`).

## Install

The published artifact is a Node-executable bundle — plain Node ≥ 20 is enough, through any package manager:

```bash
npx @attalabs/vinaya init        # or: pnpm dlx / yarn dlx / bunx
```

## Commands

| Command | Description |
|---------|-------------|
| `vinaya help` | Usage text |
| `vinaya version` | Print the installed CLI version (`--json` for the enveloped machine form) |
| `vinaya studio` | Launch local Vinaya Studio against the current repo |
| `vinaya check <name> \| --all` | Run one check, or every registered check (core + `vinaya.config.json`-registered). `--json` for the enveloped `{ checks: CheckOutcome[] }` form; `--diff-only` scopes `scope: 'diff'` checks to changed files; `--parallel[=n]` caps concurrency (default: cpu-derived). Findings always print as the check contract's JSON lines on stderr, regardless of `--json`. Exit 0 iff every check passed. |
| `vinaya new check <name>` | Scaffold a self-contained custom check into `./scripts/vinaya-checks/<name>.ts`, ready to register in `vinaya.config.json` |

## Config

Hierarchical, file-level precedence:

1. Repo-local `vinaya.config.json` (walked up from `cwd` to the filesystem root)
2. Global `~/.vinaya/config.json`
3. `null` if neither exists

Whichever file resolves first is used in full — there is no field-by-field merge across the two files.

Today the schema carries one surface:

```json
{
  "rings": {
    "ring1_forgeWriteInterception": true,
    "ring2_asyncAudits": false
  }
}
```

Both `rings` fields are plain booleans — no conditional logic. Ring 0 (git hooks) and the CI/branch-protection guarantee are never represented in this schema, by design — they are not configurable.

Custom checks register under `checks`, one entry per check:

```json
{
  "checks": {
    "my-check": {
      "run": "./scripts/my-check.ts",
      "scope": "diff",
      "include": ["src/**/*.ts"],
      "timeoutMs": 30000
    }
  }
}
```

Glob scoping (`include`) is permitted; conditional logic (`if`/`unless`/`except`) is **never** part of this grammar — see the check-contract quick reference below for the full grammar and the error contract every registered `run` executable must honor.

## Check contract — quick reference

Full field-by-field reference: [vinaya.attalabs.dev/cli](https://vinaya.attalabs.dev/cli). The short version — what an executable must do to be a valid check:

- Exit `0` to pass, `1` to report findings. Any other exit code reads as `status: 'error'` to the runner.
- Emit findings as JSON lines on stderr, one per line: `{ schema: 1, check, severity: 'error' | 'warning', message, agent_recovery_prompt, file?, line? }`.
- `agent_recovery_prompt` is a corrective **instruction**, not a restated diagnosis — it tells the model what to do, not what is wrong (that's `message`'s job).
- Never self-enforce a timeout — the runner does that (`vinaya.config.json`'s `timeoutMs`, or the runner's default).
- Never reach the network unless explicitly declared as an exception (today: none of the custom-check surface; the core `coherence`/`dispatch-readiness` checks are the only declared exceptions).

`vinaya new check <name>` scaffolds a worked, self-contained example that honors this contract out of the box.

## JSON output envelope

Every machine-readable (`--json`) output is wrapped in `{ schema: 1, data: ... }`. The `schema` field is a public-surface commitment — no code path in this package emits unversioned machine output.

## Known limits

The five core AEG checks (`coherence`, `dispatch-readiness`, and siblings) are bound to the Vinaya development repository — they read governance documents relative to it. Outside a Vinaya workspace, `vinaya check --all` reports those checks as `status: 'error'` rather than crashing.

Custom checks are any executable you register in `vinaya.config.json`, in any language. Note that the TypeScript file `vinaya new check` scaffolds carries a `#!/usr/bin/env bun` shebang, so **that scaffold requires [bun](https://bun.sh) on your `PATH`** — without it the check reports `status: 'error'`. The CLI itself needs only Node; this applies to the scaffolded template alone. Write the check in a language your machine already runs and it has no such requirement.

## Documentation

Full documentation at [vinaya.attalabs.dev](https://vinaya.attalabs.dev) — the command reference lives at [/cli](https://vinaya.attalabs.dev/cli), and [/start](https://vinaya.attalabs.dev/start) walks the path from install to a governed repository.

## License

Copyright (C) 2026 Daniel Estevez.

Apache-2.0 — see [LICENSE](./LICENSE).
