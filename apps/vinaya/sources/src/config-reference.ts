/**
 * The `vinaya.config.json` reference — an AUTHORED registry, not a Zod
 * introspection. `apps/vinaya/cli/src/lib/config.ts`'s `VinayaConfigSchema`
 * validates SHAPE only (zero `.describe()` calls); this module is the one
 * place semantics are written down in adopter-facing prose. Content is
 * reconciled from two sources of truth — `config.ts`'s own comments and
 * `specs/vinaya-spec.md`'s Configuration architecture chapter — never
 * invented.
 *
 * `apps/vinaya/cli/tests/checks/config-reference-coverage.test.ts` proves
 * every `VinayaConfigSchema` top-level key and every `CheckEntrySchema` key
 * has a row here, by key-presence only (it does not check prose accuracy —
 * that is a review concern, not a mechanizable one).
 *
 * `web` renders this registry (`apps/vinaya/web/src/app/(site)/config`);
 * `web` must never import `cli` internals, so this lives sources-side,
 * exactly like `commands.ts`'s `COMMANDS`.
 */

export type ConfigField = {
  /** Dotted path from the config root, e.g. `checks`, `checks.<name>.env`. Matches `VinayaConfigSchema`/`CheckEntrySchema`'s own key for top-level and check-entry rows — this is what the coverage test matches against. */
  key: string
  /** Human-readable type/forms summary, e.g. `object (optional)`, `true | { optional: true } | { anyOf: string[] } | string`. */
  type: string
  /** One–three adopter-facing sentences: what it's for and how it behaves. */
  semantics: string[]
  /** A runnable JSON snippet showing the field in context. */
  example: string
  /** Set only where a form invites a real security mistake (the `env` literal form). */
  warning?: string
}

export const CONFIG_REFERENCE: readonly ConfigField[] = [
  {
    key: 'rings',
    type: 'object (optional)',
    semantics: [
      'Declarative booleans for the two opt-in accelerator rings. Ring 0 (git hooks) and the CI/branch-protection guarantee are never represented here — they are universal, not configurable — so this object controls only whether the optional rings are on.'
    ],
    example: `{
  "rings": {
    "ring1_forgeWriteInterception": true,
    "ring2_asyncAudits": true
  }
}`
  },
  {
    key: 'rings.ring1_forgeWriteInterception',
    type: 'boolean',
    semantics: ['Whether `pr`/`issue create|edit` validate a body against `briefSchema` before any `gh` write.'],
    example: `{ "rings": { "ring1_forgeWriteInterception": true } }`
  },
  {
    key: 'rings.ring2_asyncAudits',
    type: 'boolean',
    semantics: [
      'Whether the async, forge-scheduled mechanisms (`vinaya archive`, `vinaya audit`’s dead-branch-push and direct-main-push detection) run.'
    ],
    example: `{ "rings": { "ring2_asyncAudits": true } }`
  },
  {
    key: 'checks',
    type: 'Record<string, CheckEntry> (optional)',
    semantics: [
      'Custom-check registration, keyed by check name. Each entry produces the exact same `CheckSpec` shape the built-in registry does — no field either side can carry that the other cannot.',
      'A key that exactly matches a core check id is an **override attempt** (replaces the core check, contract-validated, fail-closed if malformed); any other key must be namespaced `<yourname>/<id>` (exactly one `/`, both segments `[a-z0-9][a-z0-9-]*`, the `vinaya` prefix reserved). A bare key matching no core id is a config error.',
      'Globs (`include`) are permitted for scoping; conditionals (`if`/`unless`/`except`) are never part of this grammar. Registered from a repo-local `vinaya.config.json` only — a global `~/.vinaya/config.json`’s `checks` key is stripped at load time with a loud stderr warning, never resolved.'
    ],
    example: `{
  "checks": {
    "myteam/vocab-check": {
      "run": "./scripts/vinaya-checks/vocab-check.ts",
      "scope": "diff",
      "include": ["**/*.md"]
    }
  }
}`
  },
  {
    key: 'checks.run',
    type: 'string',
    semantics: ['The executable path (or bare command on PATH) the runner spawns directly — never through a shell.'],
    example: `{ "run": "./scripts/vinaya-checks/vocab-check.ts" }`
  },
  {
    key: 'checks.scope',
    type: `'diff' | 'full'`,
    semantics: [
      '`diff` checks may be skipped by the runner under `--diff-only` when no changed file matches `include`. `full` checks (coherence, dispatch-readiness) always run — they read live forge state, not the local diff.'
    ],
    example: `{ "scope": "diff" }`
  },
  {
    key: 'checks.include',
    type: 'string[] (optional)',
    semantics: ['Glob patterns that scope a `diff`-scoped check to changed files. Scoping only — never a conditional.'],
    example: `{ "include": ["**/*.md", "apps/**/*.ts"] }`
  },
  {
    key: 'checks.args',
    type: 'string[] (optional)',
    semantics: ['Extra argv elements passed to `run`, appended after the runner’s own fixed arguments.'],
    example: `{ "args": ["--strict"] }`
  },
  {
    key: 'checks.timeoutMs',
    type: 'number (optional)',
    semantics: [
      'Advisory to the check; the RUNNER enforces the actual deadline (kills the whole process group), never the check itself.'
    ],
    example: `{ "timeoutMs": 30000 }`
  },
  {
    key: 'checks.requiresOpenPr',
    type: 'boolean (optional)',
    semantics: [
      'Marks a check that can only meaningfully evaluate once a pull request exists — it reads the real PR body/number, not local git state. The generated `pre-commit`/`pre-push` hooks (`vinaya check --all --local`) skip a check declaring this entirely rather than running it against a PR that cannot exist yet; CI (which only ever runs after a PR is open) always runs it for real.',
      'Use for a custom check with the same shape as the core `closes-n`/`test-plan` checks — anything that would otherwise deadlock the first commit on a fresh branch by requiring PR content before a PR can exist.'
    ],
    example: `{ "requiresOpenPr": true }`
  },
  {
    key: 'checks.env',
    type: 'Record<string, EnvEntry> (optional)',
    semantics: [
      'The per-check environment allowlist. A check’s child process receives ONLY a fixed safe baseline (`PATH`, `LANG`, `HOME`, `HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY`, `TMPDIR`) plus whatever this declaration explicitly forwards — never the full parent environment.',
      'A check that reads `process.env`/`Bun.env`/`Deno.env` directly with no `env` declared is invisible to the child process; `vinaya doctor` carries the permanent diagnostic for that gap. Four declared forms, below.'
    ],
    example: `{
  "env": {
    "JIRA_TOKEN": { "anyOf": ["JIRA_TOKEN", "JIRA_PAT"] }
  }
}`
  },
  {
    key: 'checks.env.passthrough',
    type: 'true',
    semantics: [
      'Required passthrough — forwards the caller’s own value for this key verbatim. Absent from the caller’s environment synthesizes a `CheckError` before the check ever spawns.'
    ],
    example: `{ "env": { "GITHUB_TOKEN": true } }`
  },
  {
    key: 'checks.env.optional',
    type: '{ optional: true }',
    semantics: [
      'Passthrough if set, simply absent from the child otherwise — never fatal. Use for a var the check’s own code already tolerates missing (e.g. a CI-only secret that would otherwise hard-block `git push` on a developer laptop).'
    ],
    example: `{ "env": { "PR_BODY": { "optional": true } } }`
  },
  {
    key: 'checks.env.anyOf',
    type: '{ anyOf: string[] }',
    semantics: [
      'An either/or requirement with no deeper fallback — at least one named member must be set in the caller’s environment, or a `CheckError` is synthesized before spawn. Every set member passes through under its own name.',
      'The record key must be one of its own `anyOf` members, and at least 2 unique members are required (a single-member `anyOf` is just `true` under a different name). Adopter-facing only — no core check uses this form, since every core check’s env read already has a deeper fallback (a `gh auth token` subprocess, a default literal) that an `anyOf`’s hard pre-spawn failure would be wrong for.'
    ],
    example: `{ "env": { "JIRA_TOKEN": { "anyOf": ["JIRA_TOKEN", "JIRA_PAT"] } } }`
  },
  {
    key: 'checks.env.literal',
    type: 'string',
    semantics: [
      'Sets the key to this exact value, never interpolated — `spawn` takes an explicit `env` object, no shell expands `$VAR`.'
    ],
    example: `{ "env": { "NODE_ENV": "test" } }`,
    warning:
      'Never put a secret in a literal. `env` values live in a COMMITTED file, reviewed like any other code change — a literal is for fixed, non-sensitive values only (e.g. `"NODE_ENV": "test"`), never a token or credential. `vinaya doctor` warns on a high-entropy literal (looks like a leaked secret) and on a literal `"true"`/`"false"` string (almost certainly meant as the boolean passthrough form instead) as a backstop, but review is the real defense — do not rely on the linter to catch every case.'
  },
  {
    key: 'briefSchema',
    type: 'object (optional)',
    semantics: [
      'The config-defined brief schema the forge-write commands (`pr create|edit`, `issue create|edit`) validate a body against, locally, before any `gh` write. Declarative only — a required section is either a named battle-tested builtin or a generic heading/field/phrase matcher; no conditional grammar.'
    ],
    example: `{
  "briefSchema": {
    "pr": { "sections": [{ "builtin": "tier" }, { "heading": "Rollback Plan" }] }
  }
}`
  },
  {
    key: 'briefSchema.pr',
    type: '{ sections: BriefSection[] } (optional)',
    semantics: ['Required sections for a PR body — checked by `vinaya pr create|edit` before any `gh` write.'],
    example: `{ "pr": { "sections": [{ "builtin": "closesN" }] } }`
  },
  {
    key: 'briefSchema.issue',
    type: '{ sections: BriefSection[] } (optional)',
    semantics: ['Required sections for an Issue body — checked by `vinaya issue create|edit` before any `gh` write.'],
    example: `{ "issue": { "sections": [{ "builtin": "issueRationale" }] } }`
  },
  {
    key: 'managed',
    type: 'object (optional)',
    semantics: [
      'The ownership manifest `vinaya init` writes and `vinaya eject` reads — machine-owned, never adopter-authored. It records exactly what the installer created (`files`, marker-delimited `blocks` inside adopter-owned files, created-if-absent `labels`) so `eject` reverses precisely: deleting only files it created, stripping only blocks it wrote, reporting labels for manual removal.',
      'If this manifest is absent or corrupt at eject time, `eject` refuses rather than guessing at ownership. Hand-editing this block is not a supported workflow.'
    ],
    example: `{
  "managed": {
    "version": 1,
    "files": [".github/workflows/vinaya-checks.yml"],
    "blocks": [],
    "labels": ["tier:1"]
  }
}`
  },
  {
    key: 'principals',
    type: 'string[] (optional, min 1)',
    semantics: [
      'GitHub logins trusted as THIS repo’s own principals — the only authors whose PR comments count as a review-gate verdict, and the only actors an actor-verified `vinaya/waiver:docs`/`vinaya/waiver:review` label trusts. Overrides the package’s hardcoded default principal (this monorepo’s own maintainer) entirely — a full replacement, not additive.',
      'Repo-local only, same rule as `checks`: a global `~/.vinaya/config.json`’s `principals` key is stripped at load time with a loud stderr warning, never resolved — who is trusted to approve merges must come from the reviewed, committed per-repo file, never a machine-wide personal config.',
      'Without this key, `vinaya`’s hardcoded default principal is the only trusted author — which makes review-gate structurally unpassable on any repo that principal doesn’t personally review. Set this to your own team’s GitHub logins to make the gate passable on your repo.',
      'Read from your repository’s DEFAULT BRANCH via the GitHub API — never the PR’s own checkout, local git state, or any environment variable, all of which a pull request can rewrite. A PR that edits this field therefore takes effect only once it merges, never for itself.',
      '⚠️ **This field is only a security control if `main` has branch protection with the Vinaya check marked as a required status check.** Vinaya’s checks run in a `pull_request`-triggered workflow, which GitHub executes from the pull request’s own copy of the workflow file — so a PR can always edit or delete the job that runs them. What a PR cannot do is satisfy a required status check that never reports. Without branch protection, `principals` is a useful team convention, not an enforced boundary. `vinaya init` prints the exact `gh api` command to enable it, and `vinaya doctor` reports when it is missing.'
    ],
    example: `{ "principals": ["alice", "bob"] }`
  }
] as const

/**
 * The documented home of `vinaya check --plan --json`'s `schema: 1` shape
 * (`apps/vinaya/cli/src/commands/check.ts`), field by field — not part of
 * `vinaya.config.json` itself, but the config reference's natural companion:
 * this is what reading the resolved config back out looks like.
 */
export type PlanJsonField = {
  key: string
  type: string
  semantics: string[]
}

export const PLAN_JSON_SCHEMA: readonly PlanJsonField[] = [
  {
    key: 'schema',
    type: '1',
    semantics: [
      'The envelope version. Additive evolution only — a field is never removed or retyped under the same version number.'
    ]
  },
  {
    key: 'checks',
    type: 'Record<name, { state, source, env, envAnyOf?, scope }>',
    semantics: [
      'The fully resolved check registry, keyed by name — every core and config entry, after override/additive resolution.'
    ]
  },
  {
    key: 'checks.<name>.state',
    type: `'default' | 'overridden' | 'additive'`,
    semantics: [
      '`default`: shipped with Vinaya, unmodified. `overridden`: a config entry currently claims this (core) id and satisfies its contract. `additive`: a wholly new, namespaced entry.'
    ]
  },
  {
    key: 'checks.<name>.source',
    type: `'core' | 'config'`,
    semantics: ['Where the resolved spec came from — `registry.ts` (`core`) or `vinaya.config.json` (`config`).']
  },
  {
    key: 'checks.<name>.env',
    type: `Record<string, 'passthrough' | 'optional' | 'literal' | 'anyOf'>`,
    semantics: [
      'How each declared env var resolves — never the actual value. A security reviewer auditing the plan needs to see "reads the caller’s real token" vs. "sets a fixed string," never the token or string itself.'
    ]
  },
  {
    key: 'checks.<name>.envAnyOf',
    type: 'Record<string, string[]> (optional)',
    semantics: ['Present only for `anyOf`-labeled env keys — the full member list for that key.']
  },
  {
    key: 'checks.<name>.scope',
    type: `'diff' | 'full'`,
    semantics: ['The resolved check’s scope, echoed from its `CheckSpec`.']
  },
  {
    key: 'roles',
    type: '{ available: false, reason: string }',
    semantics: [
      'An explicit degraded placeholder — role resolution/registration is not implemented yet. Not the shape roles will render once that lands; do not build against this as a stable contract.'
    ]
  },
  {
    key: 'errors',
    type: 'ResolverFailure[]',
    semantics: [
      'Every `FAIL_CLOSED` entry (a bare key with no namespace matching no core check) — rendered inline, never dropped. Non-empty `errors` always exits non-zero; `--plan` never swallows a failure to render a clean-looking table.'
    ]
  }
] as const
