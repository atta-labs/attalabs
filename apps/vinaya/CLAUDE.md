# Vinaya — Product Overview

Vinaya is a governance layer for AI coding agents — deterministic checks that every agent must satisfy before merge, installed with `npx @attalabs/vinaya init`. "Vinaya" means "discipline" / "the rules of conduct" in Pali.

**Domain:** vinaya.attalabs.dev

---

## Surfaces

| Surface | Path | Package | Status |
|---------|------|---------|--------|
| Web | `web/` | `@atta/vinaya-web` | Live — see below |
| CLI | standalone `atta-labs/vinaya` repo (`apps/cli`) | `@attalabs/vinaya` | Live on npm — installed into this monorepo as a devDependency; the vendored `cli/` workspace was deleted (attalabs-adoption) |

### Web

Landing + Vinaya CLI command reference (`/docs/cli`) pages live. `/config` renders every `vinaya.config.json` key plus the `vinaya check --plan --json` envelope, from `@atta/vinaya-sources`' `CONFIG_REFERENCE`/`PLAN_JSON_SCHEMA` registry, coupling-tested against `VinayaConfigSchema`. `/install`, `/the-harness`, `/state-machine`, and `/cli` all permanently redirect to their `/docs/*` equivalents. `/start` is the adopter's path, a `/docs`-shaped sidebar section: `/start/quick` (four steps to a governed repo) plus one page per loop stage under "Ship with Vinaya". Studio dashboard is live locally at `/studio` (redirects to the `/the-studio` Portal page in production). `/docs` is a 4-card hub (Harness, State Machine, CLI, Reference); the methodology-doc browser lives at `/docs/reference` (every old `/studio/docs`, bare `/docs` path permanently redirects). Site-wide TopBar on every route. Full detail: [web/CLAUDE.md](web/CLAUDE.md).

### CLI

Developed in the standalone `atta-labs/vinaya` repository (`apps/cli`); this monorepo no longer vendors its source and consumes only the published package. Published to the public npm registry as `@attalabs/vinaya` — the bare name `vinaya` is refused by npm's typosquat filter against `vinyl`; the installed command is still `vinaya`. A Node-executable ESM bundle that inlines the `@atta/*` workspace graph and declares only `zod` + `gray-matter`; `npx`/`pnpm dlx`/`yarn dlx`/`bunx` all resolve it (distribution details now live in `atta-labs/vinaya`, not this repo's spec).

- `vinaya help`/`version` — router, hierarchical config loader, versioned `--json` envelope.
- `vinaya studio` — launches local Vinaya Studio against the current repo.
- `vinaya check <name> | --all` (`--json`/`--diff-only`/`--parallel`) and `vinaya new check` — the check runner, the versioned error contract, and 15 registered adopter-facing checks expressed through the same no-privileged interface as custom checks (check-engine detail now lives in `atta-labs/vinaya`, not this repo's spec). `reader-resolvable-prose` remains repo-internal, reachable only by direct invocation, never through the adopter-facing registry.
- `vinaya pr create | edit` and `vinaya issue create | edit` — the validated forge-write path: full config-defined brief-schema validation (`briefSchema` in `vinaya.config.json`) runs locally before any `gh` write, refusing with the `CheckError` contract; `--validate-only`/`--json` supported.
- `vinaya init` / `init product` / `eject` — the non-destructive install lifecycle: diff-and-confirm install of the minimal manifest (starter config with empty `checks`, four `vinaya-*` workflows — checks, review, review-verdict (the comment-triggered half that re-runs the required review gate when a clean verdict lands, so adopter gates flip green without manual reruns), and archivist — git-hook managed blocks, a root `VINAYA.md` doctrine pointer, an empty `.vinaya/doc-owners` starter manifest, labels — init installs only what a shipped check or ring-2 mechanism consumes), recorded in a `managed` ownership manifest in `vinaya.config.json` that `eject` reverses exactly.
- `vinaya archive` / `vinaya audit` — the ring-2 post-merge/scheduled mechanisms (per-task Archivist provenance + close-out, dead-branch-push drift, direct-main-push detection), callable directly instead of only via the generated `vinaya-archivist.yml` workflow.
- `vinaya doctor` / `upgrade` — the rest of the install lifecycle: `doctor` diagnoses hooks, workflows, `vinaya.config.json`'s manifest coherence, the doctrine pointer, environment (`gh` auth, Node/Bun, package-vs-artifact skew), branch protection (report-only), and custom-check registration, never mutating anything; `upgrade` regenerates vinaya-owned artifacts to the installed package's current generators via the same diff-and-confirm engine `init` uses, leaving adopter-owned config content untouched (doctrine now bundles into the package; install-lifecycle detail now lives in `atta-labs/vinaya`, not this repo's spec).

Every command's name/description/flags/status lives in `@atta/vinaya-sources`' `src/commands.ts`'s `COMMANDS` registry, which both the CLI's `printHelp()` and `apps/vinaya/web`'s `/docs/cli` page render. `scripts/verify-published-lifecycle.ts` (`bun run verify-published-lifecycle`) proves the full shipped-command lifecycle against the real published `@attalabs/vinaya` from the public registry, derived from the same `COMMANDS` registry.

---

## Specifications

- [vinaya-spec.md](specs/vinaya-spec.md) — product spec seed

---

## Related

- [Root CLAUDE.md](../../CLAUDE.md) — AttaLabs monorepo routing index
