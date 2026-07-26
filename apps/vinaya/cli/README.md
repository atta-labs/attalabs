# @atta/vinaya-cli

The `vinaya` bin — Vinaya's npm-distributed CLI. This package ships the command router, the hierarchical config loader, the versioned `--json` output envelope, and the check engine (`vinaya check` / `vinaya new check`). `init`, `doctor`, `upgrade`, `eject`, and forge writes remain unbuilt — those land in later `vinaya-cli-v1` tasks.

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
| `vinaya check <name> \| --all` | Run one check, or every registered check (core + `vinaya.config.json`-registered). `--json` for the enveloped `{ checks: CheckOutcome[] }` form; `--diff-only` scopes `scope: 'diff'` checks to changed files; `--parallel[=n]` caps concurrency (default: cpu-derived). Findings always print as the check contract's JSON lines on stderr, regardless of `--json`. Exit 0 iff every check passed. |
| `vinaya new check <name>` | Scaffold a self-contained custom check into `./scripts/vinaya-checks/<name>.ts`, ready to register in `vinaya.config.json` |

## Config

Hierarchical, file-level precedence:

1. Repo-local `vinaya.config.json` (walked up from `cwd` to the filesystem root)
2. Global `~/.vinaya/config.json`
3. `null` if neither exists

Whichever file resolves first is used in full — there is no field-by-field merge across the two files, matching the pattern this loader was ported from (Cetana's CLI config loader, since deleted —).

Today the schema carries one surface, added ```json
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

Full field-by-field reference: [`apps/vinaya/specs/vinaya-spec.md` § Check engine](../specs/vinaya-spec.md#check-engine-vinaya-cli-v1-task-3-383). The short version — what an executable must do to be a valid check:

- Exit `0` to pass, `1` to report findings. Any other exit code reads as `status: 'error'` to the runner.
- Emit findings as JSON lines on stderr, one per line: `{ schema: 1, check, severity: 'error' | 'warning', message, agent_recovery_prompt, file?, line? }`.
- `agent_recovery_prompt` is a corrective **instruction**, not a restated diagnosis — it tells the model what to do, not what is wrong (that's `message`'s job).
- Never self-enforce a timeout — the runner does that (`vinaya.config.json`'s `timeoutMs`, or the runner's default).
- Never reach the network unless explicitly declared as an exception (today: none of the custom-check surface; the core `coherence`/`dispatch-readiness` checks are the only declared exceptions).

`vinaya new check <name>` scaffolds a worked, self-contained example that honors this contract out of the box.

## JSON output envelope

Every machine-readable (`--json`) output goes through `src/lib/envelope.ts`, which wraps the payload in `{ schema: 1, data:... }`. The `schema` field is a public-surface commitment — there is no code path in this package that can emit unversioned machine output.

## Interactive commands (future)

None ship in this task. When a later task adds an interactive command with an abort path, it must destroy stdin on abort — Cetana PR #43 hung because an interactive prompt left stdin open after a Ctrl-C. Port that lesson, don't relearn it.

## Architecture

Ported from Cetana's CLI: the config-loader pattern and its precedence regression tests only. No JSONL, no IPC, no coordinator, no state-sync code came across (local parallel state is the disease Vinaya exists to kill). `@atta/aeg-core` and `@atta/vinaya-sources` are workspace dependencies as of the check engine — every core check consumes their public exports read-only; iteration state is read only through a `StateSource`, never a hardcoded path.

See `apps/vinaya/specs/vinaya-spec.md` for the full product spec and `apps/vinaya/specs/vinaya-backlog.md` for what's still ahead.
