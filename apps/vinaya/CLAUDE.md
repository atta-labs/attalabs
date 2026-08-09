# Vinaya — Product Overview

Vinaya is a governance layer for AI coding agents — deterministic checks that every agent must satisfy before merge, installed with `npx @attalabs/vinaya init`. "Vinaya" means "discipline" / "the rules of conduct" in Pali.

**Domain:** vinaya.attalabs.dev

---

## Surfaces

| Surface | Path | Package | Status |
|---------|------|---------|--------|
| Web | `web/` | `@atta/vinaya-web` | Landing + Vinaya CLI (command reference, `/cli`) pages live; `/config` — every `vinaya.config.json` key plus the `vinaya check --plan --json` envelope, rendered from `@atta/vinaya-sources`' `CONFIG_REFERENCE`/`PLAN_JSON_SCHEMA` registry and coupling-tested against `VinayaConfigSchema` (#782); `/install` permanently redirects to `/cli` (#681); `/start` — the adopter's path, a `/docs`-shaped sidebar section: `/start/quick` (four steps to a governed repo) plus one page per loop stage under "Ship with Vinaya" (#682); Studio dashboard live locally at `/studio` (redirects to the `/the-studio` Portal page in production); methodology-doc browser at `/docs` (moved from `/studio/docs`, #568 — old path permanently redirects); site-wide TopBar on every route |
| CLI | `cli/` | `@attalabs/vinaya` (published to the public npm registry as `@attalabs/vinaya@0.1.3`, the bare name `vinaya` being refused by npm's typosquat filter against `vinyl`; the installed command is still `vinaya` — a Node-executable ESM bundle that inlines the `@atta/*` workspace graph and declares only `zod` + `gray-matter`; `npx`/`pnpm dlx`/`yarn dlx`/`bunx` all resolve it; see the spec's Distribution section, #700) | `vinaya help`/`version` router, hierarchical config loader, versioned `--json` envelope (#381); `vinaya studio` launches local Vinaya Studio against the current repo (#390); `vinaya check <name> \| --all` (`--json`/`--diff-only`/`--parallel`) and `vinaya new check` — the check runner, the versioned error contract, and 15 registered adopter-facing checks expressed through the same no-privileged interface as custom checks (#383, grown to 15 by #760 — see the spec's Check engine chapter); `reader-resolvable-prose` remains repo-internal, reachable only by direct invocation, never through the adopter-facing registry (its own registry comment explains why). `vinaya pr create \| edit` and `vinaya issue create \| edit` — the validated forge-write path: full config-defined brief-schema validation (`briefSchema` in `vinaya.config.json`) runs locally before any `gh` write, refusing with the `CheckError` contract; `--validate-only`/`--json` supported (#385). `vinaya init` / `init product` / `eject` — the non-destructive install lifecycle: diff-and-confirm install of the minimal manifest (starter config with empty `checks`, three `vinaya-*` workflows — checks, review, and archivist — git-hook managed blocks, a root `VINAYA.md` doctrine pointer, an empty `.vinaya/doc-owners` starter manifest (#665), labels — init installs only what a shipped check or ring-2 mechanism consumes, 2026-07-23 re-ruling), recorded in a `managed` ownership manifest in `vinaya.config.json` that `eject` reverses exactly (#384). `vinaya archive` / `vinaya audit` — the ring-2 post-merge/scheduled mechanisms (per-task Archivist provenance + close-out, dead-branch-push drift, direct-main-push detection), callable directly instead of only via the generated `vinaya-archivist.yml` workflow (#761). `vinaya doctor` / `upgrade` — the rest of the install lifecycle: `doctor` diagnoses hooks, workflows, `vinaya.config.json`'s manifest coherence, the doctrine pointer, environment (`gh` auth, Node/Bun, package-vs-artifact skew), branch protection (report-only), and custom-check registration, never mutating anything; `upgrade` regenerates vinaya-owned artifacts to the installed package's current generators via the same diff-and-confirm engine `init` uses, leaving adopter-owned config content untouched (#386 — doctrine bundling into the package now ships, #787; see the spec's Install-lifecycle chapter). Every command's name/description/flags/status lives in `@atta/vinaya-sources`' `src/commands.ts`'s `COMMANDS` registry (moved out of the CLI package, #569 re-dispatch), which both the CLI's `printHelp()` and `apps/vinaya/web`'s `/cli` page render. `scripts/verify-published-lifecycle.ts` (`bun run verify-published-lifecycle`) proves the full shipped-command lifecycle against the real published `@attalabs/vinaya` from the public registry, derived from the same `COMMANDS` registry (#705). |

---

## Specifications

- [vinaya-spec.md](specs/vinaya-spec.md) — product spec seed

---

## Related

- [Root CLAUDE.md](../../CLAUDE.md) — AttaLabs monorepo routing index
