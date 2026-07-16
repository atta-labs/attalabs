# Vinaya — Product Overview

Vinaya is a governance layer for AI coding agents — deterministic checks that every agent must satisfy before merge, installed with `npx vinaya init` (coming soon). "Vinaya" means "discipline" / "the rules of conduct" in Pali.

**Domain:** vinaya.attalabs.dev

---

## Surfaces

| Surface | Path | Package | Status |
|---------|------|---------|--------|
| Web | `web/` | `@atta/vinaya-web` | Landing + Known Limits + Install (CLI command reference, `/install`) pages live; Studio dashboard live locally at `/studio` (redirects to the `/the-studio` Portal page in production, D-126); methodology-doc browser at `/studio/docs`; site-wide TopBar on every route |
| CLI | `cli/` | `@atta/vinaya-cli` | `vinaya help`/`version` router, hierarchical config loader, versioned `--json` envelope (`vinaya-cli-v1` task 1, #381); `vinaya studio` launches local Vinaya Studio against the current repo (`vinaya-studio-v1` task 5, #390); `vinaya check <name> \| --all` (`--json`/`--diff-only`/`--parallel`) and `vinaya new check` — the check runner, the versioned error contract, and the four core AEG gates expressed through the same no-privileged interface as custom checks (`vinaya-cli-v1` task 3, #383). `init`, `doctor`, `upgrade`, `eject`, forge writes not yet implemented. Every command's name/description/flags/status lives in `@atta/vinaya-sources`' `src/commands.ts`'s `COMMANDS` registry (moved out of the CLI package per D-087, `vinaya-pages-v1` task 9, #569 re-dispatch), which both the CLI's `printHelp()` and `apps/vinaya/web`'s `/install` page render. |

---

## Specifications

- [vinaya-spec.md](specs/vinaya-spec.md) — product spec seed

---

## Related

- [Root CLAUDE.md](../../CLAUDE.md) — AttaLabs monorepo routing index
