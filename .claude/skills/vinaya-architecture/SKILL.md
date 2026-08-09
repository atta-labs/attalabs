---
name: vinaya-architecture
description: Vinaya product architecture — the CLI/web/sources workspace split, the check-engine contract (CheckSpec/CheckError, core registry, custom checks), the install lifecycle (init/eject/doctor/upgrade), the StateSource/DoctrineSource seams, and the renderer-never-derives rule. Load when working inside apps/vinaya/** (cli, web, sources, specs). Do NOT load for the gate logic Vinaya's checks wrap (packages/aeg-core), the forge adapter it consumes (packages/aeg-forge-state), or the doctrine it ships (aeg-root) — see those skills for the underlying model.
---

# Vinaya — Product Architecture (`apps/vinaya/`)

## Context

Vinaya is AEG packaged as a distributable product: `npx @attalabs/vinaya init` turns any GitHub repo into a governed one. Everything under `apps/vinaya/` exists to ship that packaging — it does not reimplement governance logic. The single rule that disambiguates almost every design question in this tree: **Vinaya renders and spawns; `@atta/aeg-core` and `@atta/aeg-forge-state` decide.** If a change under `apps/vinaya/**` starts computing a governance verdict instead of consuming one, it is very likely in the wrong package.

## Architecture — three workspaces, one contract each

```
apps/vinaya/
├── cli/        @attalabs/vinaya — the published npm package (bin: `vinaya`)
├── sources/    @atta/vinaya-sources — the StateSource/DoctrineSource adapters + COMMANDS registry
├── web/        @atta/vinaya-web — the marketing site + local Vinaya Studio dashboard
└── specs/      vinaya-spec.md — the product spec (routes, CLI, check engine, config, install lifecycle)
```

### The one-way import boundary (mechanically enforced)

`web` must never import `cli` internals; `cli` must never import `web` internals. Each side's own vitest/bun-test file (`web/src/lib/import-boundary.test.ts`, `cli/tests/import-boundary.test.ts`) walks its own source tree and fails on any specifier reaching across — deliberately **not** sharing a helper between the two tests, since importing one would itself cross the boundary they exist to defend. Crossing either direction would let one surface reach around the other's derivation and compute governance facts on its own — the renderer-never-derives rule, made structural.

### `@atta/vinaya-sources` — the shared registry + the two `StateSource` adapters

This workspace is the seam both `cli` and `web` sit on top of without crossing each other:

- **`commands.ts`'s `COMMANDS` registry** — every command's name, description, flags, and `shipped`/`planned` status, in one place. `cli`'s `printHelp()` and `web`'s `/docs/cli` page are two renderers over this one registry — never a hand-transcribed second list.
- **`forge-adapter.ts`'s `createForgeSource`** (primary) — wires `@atta/aeg-forge-state`'s `deriveTrancheFromForge` behind aeg-core's `StateSource` contract.
- **`file-adapter.ts`'s `createFileSource`** (transitional, deliberately deleted once every consumer is forge-backed) — wraps `parseTranche` over a configurable governance root.
- **`select-source.ts`** — config-driven choice between the two.
- **`doctrine-file-adapter.ts`'s `createFileDoctrineSource`** — implements aeg-core's `DoctrineSource` contract, reading `<root>/enforcement.md` + `roles/*.md` + `contracts/*.md` for `DiagramModel` derivation.

Both adapters are proven equivalent by a golden comparison test (`golden-forge-vs-file.test.ts`) — the forge and file paths must derive the identical `Tranche` shape on every field the pure evaluators read.

### `cli` — the shipped package

**Router:** `vinaya help`/`version`, `check <name>|--all`, `new check`, `pr|issue create|edit`, `init|init product|eject`, `doctor|upgrade`, `archive|audit`, `demo break|waiver`, `studio`. The per-command source of truth is `COMMANDS`, above — this list drifts; the registry does not.

**Check engine (`cli/src/checks/`)** — the mechanism every gate reaches an adopter through:

```
CheckSpec { name, run, args?, scope: 'diff'|'full', include?, timeoutMs?, env? }
   │
   ├─ scope:'diff'  → runner may skip under --diff-only when no `include` glob matches a changed file
   ├─ scope:'full'  → always runs (coherence, dispatch-readiness — both read live forge state)
   └─ env           → declared allowlist; child spawns with ONLY the fixed baseline
                       (PATH/LANG/HOME/HTTPS_PROXY/HTTP_PROXY/NO_PROXY/TMPDIR) plus
                       whatever the check explicitly forwards — never the full parent env.
                       Any core check whose bin spawns `gh` (any call shape) or reaches
                       the forge via token resolution must forward GITHUB_TOKEN/GH_TOKEN
                       `{ optional: true }` — on CI runners those vars are `gh`'s only
                       auth path; coupling-tested in tests/checks/registry-env.test.ts
   ▼
runner.ts:  spawn → race timeoutMs → parse stderr as CheckError JSON lines → CheckOutcome
   ▼
CheckError { schema: 1, check, severity: 'error'|'warning', message, agent_recovery_prompt, file?, line? }
```

`agent_recovery_prompt` is a corrective **instruction**, never a restatement of `message` — this is the ring-0 self-correction loop's entire mechanism (a hook that only diagnoses, never tells the agent what to run next, is half-built). The exit code IS the verdict (`0`=pass, `1`=findings); anything else, or unparseable stderr, is `status: 'error'` — a check that emits garbage must be loud, never a silent pass. A `timeoutMs` is runner-enforced (the runner kills the child; a check is never trusted to self-enforce its own deadline).

`coreCheckRegistry()` currently ships **15 core checks** through this exact same `CheckSpec` interface as any adopter-authored custom check — `tests/checks/no-privileged-api.test.ts` mechanically proves neither side carries a field the other cannot. `vinaya new check <name>` scaffolds a self-contained custom check into the *adopter's* repo (`./scripts/vinaya-checks/<name>.ts`), never into this package.

One of those 15, `review-gate` (`cli/src/checks/bin/check-review-gate.ts`), wraps `@atta/aeg-core`'s `checkReviewGate` and carries **verdict-author verification** (2026-08-09): only PR comments whose author is on the principal allowlist participate in `APPROVE`/`PASS` verdict extraction — forged, bot, and unresolvable-author comments are ignored, never fatal. The allowlist is currently the same hardcoded `PRINCIPAL_ALLOWLIST` the waiver actor-check trusts, which makes this check unpassable in a foreign adopter repo until it goes config-driven (a known, routed follow-up in the configurability tranche — do not "fix" it ad hoc here).

**Install lifecycle (`init`/`init product`/`eject`, `doctor`/`upgrade`):** `init` is a diff-and-confirm install of a fixed manifest (`cli/src/lib/artifacts.ts` — the ONE place that decides what ships to an adopter repo), recorded in a `managed` ownership block `eject` reverses exactly. The generated git hooks invoke `npx --yes @attalabs/vinaya@<exact-installed-version>` — never a bare/`--no-install` spec, whose npx cache-key mismatch broke the first post-init commit on fresh machines (regression-tested in `cli/tests/init.test.ts`). The manifest's four workflows include a split review gate: `vinaya-review.yml` (required, `pull_request`-only) plus `vinaya-review-verdict.yml`, whose comment-triggered evaluation re-runs the required workflow on a clean verdict — cross-workflow check-run writes are platform-forbidden, so re-running is the propagation channel (2026-08-09). `doctor` diagnoses everything (hooks, workflows, manifest coherence, `gh` auth, custom-check registration) and mutates nothing; `upgrade` regenerates vinaya-owned artifacts through the same diff-and-confirm engine, leaving adopter-owned config content untouched.

**Config loader (`cli/src/lib/config.ts`):** hierarchical — repo-local `vinaya.config.json` (walked up from `cwd`) over global `~/.vinaya/config.json`, `null` if neither exists; a global config's `checks` key is stripped at load time (loud stderr warning naming the file), never resolved. The **configurability architecture** (design frozen v11, implementation landing incrementally — see `specs/vinaya-spec.md`'s own chapter) layers two things on top of this loader: an `env` allowlist per check (above), and a `default`/`overridden`/`additive` resolution model shared between checks and roles — a config key exactly matching a core ID is an override attempt (contract-validated, fail-closed if it doesn't satisfy the contract); any other key must be namespaced (`<name>/<id>`). This is a live, in-progress design — read the spec chapter's own Correction notes for what has actually shipped versus what is still design-only before assuming a piece of it is built. The checks-side half of the resolution model has landed as a pure function (`cli/src/checks/resolver.ts`, `resolveChecks`/`isValidNamespacedKey`), feeding `vinaya check --plan` / `--plan --json` only — `vinaya check`'s real execution still runs the unvalidated flat concat until a later task wires the resolver into it (Correction 11). Every `vinaya.config.json` key, and the `--plan --json` envelope's own shape, is documented adopter-facing at `/config` (`@atta/vinaya-sources`' `CONFIG_REFERENCE`/`PLAN_JSON_SCHEMA`, Correction 12) — an authored registry, not a schema introspection, coupling-tested against `VinayaConfigSchema`.

**Distribution:** published as `@attalabs/vinaya` (bare `vinaya` is unobtainable — npm's typosquat filter, not a taken name), a single Node-executable ESM bundle inlining the whole `@atta/*` workspace graph (`aeg-core`, `aeg-forge-state`, `aeg-types`, `vinaya-sources`). The `files` allowlist (`dist/`, `templates/`, `aeg-root/`, `README.md`) is the tarball's actual contents — a file that isn't an `artifacts.ts` op AND isn't in this list never reaches an adopter, whatever else it may be (`specs/vinaya-spec.md`'s "Vinaya's own vs. attalabs' own" classification table is the authoritative three-way split when this is ambiguous).

### `web` — Studio + the marketing/docs site

**The renderer contract, stated as a rule:** *"Studio renders, it never re-derives."* Governance state enters `web` through exactly two permitted paths — `@atta/aeg-core`'s public API, or a `StateSource`/`DoctrineSource` adapter from `@atta/vinaya-sources` — an OR, not a hierarchy; do not "fix" an aeg-core-direct call site into a `StateSource` one on this rule's strength alone. Fetching facts (an HTTP call, a `gh` shell-out inside a `StateSource` adapter) is fine; **computing** a derived status, a dispatch verdict, or a diagram layout inside `web/` is the violation — the derivation must happen inside `aeg-core`, even if the I/O that feeds it happens in `web`.

**`DiagramModel` is the one derivation, N consumers principle made concrete:** `deriveDiagramModel` (in `aeg-core`) turns doctrine + config + a live tranche into one renderer-agnostic model; `/docs/harness`, `/docs/reference`, and Studio's own dashboard all draw from it, so none re-implements which gate guards which action.

**`/docs` IA:** `/docs` is a 4-card hub (Harness, State Machine, CLI, Reference), not a page in its own right. Its children split across two route groups under `web/src/app/(site)/docs/`: `(with-sidebar)/` — `layout.tsx` (the `DocSidebarHost` shell), `[...slug]/` (the doctrine catch-all: roles/contracts/rings/actions/glossary), and `reference/` (the generated harness-map, formerly `/docs` itself) — versus `(standalone)/` — `harness/`, `state-machine/`, `cli/`, each full-bleed or bringing its own layout, none wrapped in the doc sidebar. Static route directories take precedence over the `[...slug]` catch-all, so `harness`/`state-machine`/`cli`/`reference` can never collide with a doctrine slug (checked at dispatch time against `loadAegDocs()`'s `nav.flat`, which only ever emits `roles/*`, `contracts/*`, `actions`, `rings`, `rings/ring-*`, `glossary`). The pre-move paths (`/the-harness`, `/state-machine`, `/cli`, and `/install`) are permanent-redirect stubs pointing at their `/docs/*` equivalents — `/install` points straight at `/docs/cli`, never through an intermediate redirect.

**Route inventory and status** live in `specs/vinaya-spec.md`'s "Pages" table — treat that table, not this skill, as the up-to-date map of what's live versus not-yet-applied; it is kept current per-route and would drift immediately if duplicated here.

## Rules

### Every command's identity lives in ONE registry

Never hand-write a second command list (in `printHelp()`, in a web page, in a doc) — read from or extend `@atta/vinaya-sources`' `COMMANDS`.

### `CheckSpec` carries no privileged field

A core check and a config-registered custom check are indistinguishable to the runner. A new core check must be addable by an adopter through the public grammar — if it needs a field a custom check couldn't also declare, that is a design gap to escalate, not a quiet exception.

### Repo-root resolution is a deployment input, not just a lookup

Any route or check that locates the repo by walking up for a marker file (`vinaya.config.json`, `.vinaya/projects.md`) must have that marker declared in the serverless host's file-tracing config, or the walk fails silently at runtime with a green build. Introducing a new marker-walking reader is a two-place change (the walk itself + the tracing declaration) — see `specs/vinaya-spec.md`'s Architecture section for the exact incident this caused twice.

### The `files` allowlist is the real ship boundary — not what exists in this monorepo

Something existing on disk under `apps/vinaya/cli` does not mean it reaches an adopter. Before assuming a bin/script/asset is available post-install, check `package.json`'s `files` field and `cli/src/lib/artifacts.ts`, not just the source tree.

## Anti-patterns

- ❌ `web` importing anything from `cli/src` (or vice versa) — mechanically caught by the import-boundary tests, but know the rule before writing the import.
- ❌ Computing a derived status, a dispatch verdict, or graph layout logic inside `web/` — that is `aeg-core`'s job; `web` fetches and renders.
- ❌ Adding a second command-list literal instead of extending `COMMANDS`.
- ❌ A `CheckSpec` field or behavior only a core check can use — breaks the no-privileged-API invariant `tests/checks/no-privileged-api.test.ts` exists to prove.
- ❌ A check reading `process.env` directly with no `env` declared on its `CheckSpec` — the allowlist is enforced, so such a read is invisible to the child process, and `vinaya doctor`'s permanent missing-declaration diagnostic flags the missing declaration.
- ❌ Hardcoding this monorepo's own paths/product names into anything meant to ship in the `@attalabs/vinaya` tarball — the same portability discipline `aeg-core`/`aeg-forge-state` follow applies here, since this workspace is what actually ships.
- ❌ Assuming a design chapter in `specs/vinaya-spec.md` (e.g. the configurability architecture) is fully built because it's documented — check its own Correction/Status notes; several land in stages across multiple minors.

## When you need more context

- `apps/vinaya/specs/vinaya-spec.md` — the full product spec: route-by-route status, the Check engine chapter (with all its Corrections), the Configuration architecture design, Install lifecycle, Forge writes, StateSource, DiagramModel derivation
- `apps/vinaya/CLAUDE.md` — the short surface-status summary
- **aeg-core** skill — the pure evaluators every `vinaya check` core adapter wraps
- **aeg-forge-state** skill — what `createForgeSource` actually derives from
- **aeg-model** skill — the doctrine this whole product exists to enforce
- `aeg-root/enforcement.md`'s "Portability" section — what ships vendor-neutral today versus what still needs this harness's own hooks
