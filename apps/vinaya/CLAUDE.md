# Vinaya — Product Overview

Vinaya is a governance layer for AI coding agents — deterministic checks that every agent must satisfy before merge, installed with `npx vinaya init` (coming soon). "Vinaya" means "discipline" / "the rules of conduct" in Pali.

**Domain:** vinaya.attalabs.dev

---

## Surfaces

| Surface | Path | Package | Status |
|---------|------|---------|--------|
| Web | `web/` | `@atta/vinaya-web` | Landing + Install (CLI command reference, `/install`) pages live; `/start` — the adopter's path, a `/docs`-shaped sidebar section: `/start/quick` (four steps to a governed repo) plus one page per loop stage under "Ship with Vinaya" (`misc-hardening-v1` task 8, #682); Studio dashboard live locally at `/studio` (redirects to the `/the-studio` Portal page in production); methodology-doc browser at `/docs` (moved from `/studio/docs`, `vinaya-pages-v1` task 8, #568 — old path permanently redirects); site-wide TopBar on every route |
| CLI | `cli/` | `@atta/vinaya-cli` | `vinaya help`/`version` router, hierarchical config loader, versioned `--json` envelope (`vinaya-cli-v1` task 1, #381); `vinaya studio` launches local Vinaya Studio against the current repo (`vinaya-studio-v1` task 5, #390); `vinaya check <name> \| --all` (`--json`/`--diff-only`/`--parallel`) and `vinaya new check` — the check runner, the versioned error contract, and the four core AEG gates expressed through the same no-privileged interface as custom checks (`vinaya-cli-v1` task 3, #383). `vinaya pr create \| edit` and `vinaya issue create \| edit` — the validated forge-write path: full config-defined brief-schema validation (`briefSchema` in `vinaya.config.json`) runs locally before any `gh` write, refusing with the `CheckError` contract; `--validate-only`/`--json` supported (`vinaya-cli-v1` task 5, #385). `vinaya init` / `init product` / `eject` — the non-destructive install lifecycle: diff-and-confirm install of the minimal manifest (starter config with empty `checks`, two `vinaya-*` workflows, git-hook managed blocks, a root `VINAYA.md` doctrine pointer, labels — init installs only what a shipped check consumes, 2026-07-23 re-ruling), recorded in a `managed` ownership manifest in `vinaya.config.json` that `eject` reverses exactly (`vinaya-cli-v1` task 4, #384). `doctor`, `upgrade` not yet implemented. Every command's name/description/flags/status lives in `@atta/vinaya-sources`' `src/commands.ts`'s `COMMANDS` registry (moved out of the CLI package `vinaya-pages-v1` task 9, #569 re-dispatch), which both the CLI's `printHelp()` and `apps/vinaya/web`'s `/install` page render. |

---

## Specifications

- [vinaya-spec.md](specs/vinaya-spec.md) — product spec seed

---

## Related

- [Root CLAUDE.md](../../CLAUDE.md) — AttaLabs monorepo routing index
