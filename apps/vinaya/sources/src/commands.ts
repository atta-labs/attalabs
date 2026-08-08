export type CommandStatus = 'shipped' | 'planned'

export type CommandFlag = {
  flag: string
  description: string
}

export type Command = {
  name: string
  description: string
  flags?: CommandFlag[]
  /**
   * Long-form description paragraphs, rendered only by surfaces that have room
   * for them (the web command reference does; `printHelp()` renders
   * `description` alone and ignores this). Backticked runs are inline code.
   */
  details?: readonly string[]
  status: CommandStatus
}

export const COMMANDS: readonly Command[] = [
  {
    name: 'help',
    description: 'Show this help text',
    status: 'shipped'
  },
  {
    name: 'version',
    description: 'Print the CLI version',
    flags: [{ flag: '--json', description: 'Enveloped JSON output (schema: 1)' }],
    status: 'shipped'
  },
  {
    name: 'init',
    description: "Install Vinaya's git hooks, CI workflow, and starter config (diff-and-confirm, non-destructive)",
    flags: [
      { flag: '--dry-run', description: 'Print the full diff without installing anything' },
      { flag: '--yes', description: 'Skip the confirmation prompt' }
    ],
    details: [
      'It detects your repo, prints the complete diff of every intended change, and waits for your confirmation before installing anything. `--dry-run` prints that same diff and installs nothing. Nothing ever runs automatically on package install.',
      'It installs one CI workflow that runs `vinaya check --all --diff-only`, alongside your existing workflows — refusing to overwrite rather than touching foreign content already at that path. Git hook stubs invoke the `vinaya` binary directly; if a hook already exists, it appends a delimited managed block, shown verbatim in the diff first, rather than overwriting it.',
      "`vinaya.config.json` is seeded with a starter ruleset extracted from Vinaya's own battle-tested gates, not invented defaults. Issue and PR templates carrying the brief schema are added alongside your own; tier and `needs:*-input` labels are created only if they don't already exist — your existing labels are never modified.",
      'The recommended branch-protection command is printed for you to run yourself — it is never applied, and your PATH is never touched. `eject` removes exactly the managed block it owns, or a whole file only if `init` created it.'
    ],
    status: 'shipped'
  },
  {
    name: 'init product',
    description: 'Scaffold an additional governed product area in an already-initialized monorepo',
    status: 'shipped'
  },
  {
    name: 'check',
    description: 'Run one check, or every registered check',
    flags: [
      { flag: '--all', description: 'Run every registered check instead of one named check' },
      { flag: '--json', description: 'Enveloped JSON output (schema: 1)' },
      { flag: '--diff-only', description: 'Scope diff-declared checks to changed files' },
      { flag: '--parallel[=n]', description: 'Concurrency cap (default: cpu-derived)' }
    ],
    details: [
      "Warns (stderr, every output mode, never affecting the exit code) for any check whose executable reads `process.env`/`Bun.env`/`Deno.env` directly with no `env` declared on its `CheckSpec` — those checks will lose environment access once the env allowlist is wired as the spawn default in a later minor. Declare `env` (a core check's own registration, or `vinaya.config.json`'s `checks.<name>.env` for a custom one) to silence the warning ahead of that flip."
    ],
    status: 'shipped'
  },
  {
    name: 'new check',
    description: 'Scaffold a custom check into ./scripts/vinaya-checks/',
    status: 'shipped'
  },
  {
    name: 'pr create',
    description: 'Open a pull request after full brief-schema validation',
    flags: [
      { flag: '--title', description: 'PR title (validated against the forge-title grammar)' },
      { flag: '--body-file', description: 'Path to the PR body (stream-safe; the same bytes are validated and sent)' },
      { flag: '--label', description: 'Label(s) to apply (repeatable, comma-separated)' },
      { flag: '--validate-only', description: 'Run every gate and report PASS without opening the PR' },
      { flag: '--json', description: 'Enveloped JSON output (schema: 1)' }
    ],
    details: [
      'Runs the config-defined brief-schema gate (`briefSchema.pr` in `vinaya.config.json`) LOCALLY before any `gh` write — prevention, not detection. On any failure it refuses with the versioned CheckError contract (one JSON line per finding on stderr, exit 1) whose `agent_recovery_prompt` names the exact corrective command.'
    ],
    status: 'shipped'
  },
  {
    name: 'pr edit',
    description: 'Edit an existing pull request (<n>) after full brief-schema validation',
    flags: [
      { flag: '--title', description: 'New PR title (validated against the forge-title grammar)' },
      { flag: '--body-file', description: 'Path to the new PR body (stream-safe; same bytes validated and sent)' },
      { flag: '--validate-only', description: 'Run every gate and report PASS without editing the PR' },
      { flag: '--json', description: 'Enveloped JSON output (schema: 1)' }
    ],
    details: [
      "The target PR's real head branch and changed files are fetched from the forge to build the validation context — a failed fetch is a hard refusal, never a fall-back to the local checkout."
    ],
    status: 'shipped'
  },
  {
    name: 'issue create',
    description: 'Open an issue after full brief-schema validation',
    flags: [
      { flag: '--title', description: 'Issue title (validated on task Issues)' },
      { flag: '--body-file', description: 'Path to the Issue body (stream-safe; same bytes validated and sent)' },
      { flag: '--label', description: 'Label(s) to apply; a `vinaya/tranche:*` label marks a task Issue' },
      { flag: '--validate-only', description: 'Run every gate and report PASS without opening the Issue' },
      { flag: '--json', description: 'Enveloped JSON output (schema: 1)' }
    ],
    details: [
      'A task Issue (any `vinaya/tranche:*` label) must carry the full Planner rationale (`briefSchema.issue`); non-task Issues pass through unvalidated.'
    ],
    status: 'shipped'
  },
  {
    name: 'issue edit',
    description: 'Edit an existing issue (<n>) after full brief-schema validation',
    flags: [
      { flag: '--title', description: 'New Issue title (validated on task Issues)' },
      { flag: '--body-file', description: 'Path to the new Issue body (stream-safe; same bytes validated and sent)' },
      { flag: '--validate-only', description: 'Run every gate and report PASS without editing the Issue' },
      { flag: '--json', description: 'Enveloped JSON output (schema: 1)' }
    ],
    details: [
      "The target Issue's actual labels are fetched from the forge and unioned with argv to decide task-Issue applicability — a failed fetch is a hard refusal."
    ],
    status: 'shipped'
  },
  {
    name: 'doctor',
    description: 'Diagnose hook, workflow, and config health — report only, never mutates',
    flags: [{ flag: '--json', description: 'Enveloped JSON output (schema: 1)' }],
    details: [
      'Carries the same env-declaration diagnostic `vinaya check` warns with — permanently, at `info` severity, not just ahead of the spawn-default flip — plus a `warn`-severity lint over suspicious `env` literal forms (a stray `"true"`/`"false"` string, or a high-entropy literal that reads like a leaked secret committed to config).'
    ],
    status: 'shipped'
  },
  {
    name: 'upgrade',
    description: 'Regenerate hooks, workflow, and config to the current contract version (diff-and-confirm)',
    flags: [
      { flag: '--dry-run', description: 'Print the full diff without regenerating anything' },
      { flag: '--yes', description: 'Skip the confirmation prompt' }
    ],
    status: 'shipped'
  },
  {
    name: 'archive',
    description: 'Run the post-merge Archivist directly: provenance + Issue close-out for a merged task PR',
    flags: [{ flag: '--merge-sha', description: 'The merge commit to resolve (defaults to the current HEAD)' }],
    details: [
      "Resolves the merge commit's associated PR via `gh`, and — if it's a task PR without a provenance comment yet — posts the provenance block and closes the linked Issue. Idempotent: re-running against an already-archived PR is a no-op.",
      "The same logic the generated `vinaya-archivist.yml` workflow's `post-merge` job runs on every push to `main` — callable directly for a one-off run or local verification."
    ],
    status: 'shipped'
  },
  {
    name: 'audit',
    description: 'Run the ring-2 dead-branch-push and direct-main-push detection checks directly',
    flags: [
      { flag: '--only', description: "Scope to one check: 'dead-branches' or 'direct-push'" },
      { flag: '--sha', description: 'The commit to check for direct-main-push (defaults to the current HEAD)' },
      { flag: '--json', description: 'Enveloped JSON output' }
    ],
    details: [
      'Dead-branch-push is never-red — a notification channel that flags (label + PR comment) any `task/*` branch whose tip commit lands after its own PR already resolved. Direct-main-push is a real pass/fail — it opens an incident Issue and exits 1 if a commit on `main` has no associated merged PR.',
      "The same logic the generated `vinaya-archivist.yml` workflow's `daily-drift` and `direct-main-push-detection` jobs run on schedule / on every push to `main` — callable directly for a one-off run or local verification."
    ],
    status: 'shipped'
  },
  {
    name: 'eject',
    description: 'Remove every Vinaya-installed artifact, restoring the repo to stock',
    flags: [
      { flag: '--dry-run', description: 'Print the full removal diff without removing anything' },
      { flag: '--yes', description: 'Skip the confirmation prompt' }
    ],
    status: 'shipped'
  },
  {
    name: 'demo break',
    description: 'Run a guided refusal-then-fix demo on an isolated, discardable branch',
    flags: [{ flag: '--keep', description: 'Skip cleanup and leave the demo branch checked out to inspect' }],
    details: [
      "Creates a collision-safe `vinaya/demo-break-<id>` branch off the current one, stages a deliberately incomplete draft brief, and attempts a real `git commit` — the repo's actually-installed pre-commit hook refuses it with its real output, not a scripted string. Applies the minimal fix, commits again, then switches back and deletes the demo branch.",
      'Safe to run twice: refuses on a dirty working tree, refuses from a detached HEAD, and recovers automatically from a prior crashed run before starting a fresh one — never leaves the original branch touched or a stray demo branch behind.'
    ],
    status: 'shipped'
  },
  {
    name: 'waiver',
    description:
      "Apply the actor-verified 'vinaya/waiver:docs' or 'vinaya/waiver:review' label after prompting for a reason",
    flags: [
      { flag: '--reason', description: 'The waiver rationale, posted as a PR comment (prompted for if omitted)' },
      { flag: '--print-only', description: 'Print the exact `gh` commands instead of running them' }
    ],
    details: [
      "Applies the label via `gh pr edit --add-label`, under the invoking human's own authenticated `gh` identity — this command never fabricates an actor. A waiver is never an agent-emittable string: not a PR body field, not a commit trailer, not a comment — the label plus its own labeling-timeline actor is the only mechanism ring 1 honors.",
      '`--print-only` prints the exact `gh pr edit`/`gh pr comment` commands and runs nothing — for a human who wants to run them itself, or a CI/non-interactive context where an agent session should never be the one applying its own waiver.'
    ],
    status: 'shipped'
  },
  {
    name: 'studio',
    description: 'Launch local Vinaya Studio against this repo (requires a Vinaya workspace checkout)',
    status: 'shipped'
  }
]
