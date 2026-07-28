# Vinaya — Product Overview

Vinaya is a governance layer for AI coding agents — deterministic checks that every agent must satisfy before merge, installed with `npx vinaya init`. "Vinaya" means "discipline" / "the rules of conduct" in Pali.

**Domain:** vinaya.attalabs.dev

---

## Surfaces

| Surface | Path | Package | Status |
|---------|------|---------|--------|
| Web | `web/` | `@atta/vinaya-web` | Landing + Vinaya CLI (command reference, `/cli`) pages live; `/install` permanently redirects to `/cli` (`misc-hardening-v1` task 7, #681); `/start` — the adopter's path, a `/docs`-shaped sidebar section: `/start/quick` (four steps to a governed repo) plus one page per loop stage under "Ship with Vinaya" (`misc-hardening-v1` task 8, #682); Studio dashboard live locally at `/studio` (redirects to the `/the-studio` Portal page in production); methodology-doc browser at `/docs` (moved from `/studio/docs`, `vinaya-pages-v1` task 8, #568 — old path permanently redirects); site-wide TopBar on every route |
| CLI | `cli/` | `vinaya` (published to the public npm registry as `vinaya@0.1.0` — a Node-executable ESM bundle that inlines the `@atta/*` workspace graph and declares only `zod` + `gray-matter`; `npx`/`pnpm dlx`/`yarn dlx`/`bunx` all resolve it; see the spec's Distribution section, `vinaya-cli-v1` task 9, #700) | `vinaya help`/`version` router, hierarchical config loader, versioned `--json` envelope (`vinaya-cli-v1` task 1, #381); `vinaya studio` launches local Vinaya Studio against the current repo (`vinaya-studio-v1` task 5, #390); `vinaya check <name> \| --all` (`--json`/`--diff-only`/`--parallel`) and `vinaya new check` — the check runner, the versioned error contract, and the five core AEG gates expressed through the same no-privileged interface as custom checks (`vinaya-cli-v1` task 3, #383; fifth gate `reader-resolvable-prose` added `misc-hardening-v1` task 15, #694 — report-only). `vinaya pr create \| edit` and `vinaya issue create \| edit` — the validated forge-write path: full config-defined brief-schema validation (`briefSchema` in `vinaya.config.json`) runs locally before any `gh` write, refusing with the `CheckError` contract; `--validate-only`/`--json` supported (`vinaya-cli-v1` task 5, #385). `vinaya init` / `init product` / `eject` — the non-destructive install lifecycle: diff-and-confirm install of the minimal manifest (starter config with empty `checks`, two `vinaya-*` workflows, git-hook managed blocks, a root `VINAYA.md` doctrine pointer, labels — init installs only what a shipped check consumes, 2026-07-23 re-ruling), recorded in a `managed` ownership manifest in `vinaya.config.json` that `eject` reverses exactly (`vinaya-cli-v1` task 4, #384). `vinaya doctor` / `upgrade` — the rest of the install lifecycle: `doctor` diagnoses hooks, workflows, `vinaya.config.json`'s manifest coherence, the doctrine pointer, environment (`gh` auth, Node/Bun, package-vs-artifact skew), branch protection (report-only), and custom-check registration, never mutating anything; `upgrade` regenerates vinaya-owned artifacts to the installed package's current generators via the same diff-and-confirm engine `init` uses, leaving adopter-owned config content untouched (`vinaya-cli-v1` task 6, #386 — the doctrine-bundling half of that Issue is not shipped; see the spec's Install-lifecycle chapter). Every command's name/description/flags/status lives in `@atta/vinaya-sources`' `src/commands.ts`'s `COMMANDS` registry (moved out of the CLI package `vinaya-pages-v1` task 9, #569 re-dispatch), which both the CLI's `printHelp()` and `apps/vinaya/web`'s `/cli` page render. |

---

## Specifications

- [vinaya-spec.md](specs/vinaya-spec.md) — product spec seed

---

## Related

- [Root CLAUDE.md](../../CLAUDE.md) — AttaLabs monorepo routing index
