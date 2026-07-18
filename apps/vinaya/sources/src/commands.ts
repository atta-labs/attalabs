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
      'An adopter decision-log scaffold is added. The recommended branch-protection command is printed for you to run yourself — it is never applied, and your PATH is never touched. `eject` removes exactly the managed block it owns, or a whole file only if `init` created it.'
    ],
    status: 'planned'
  },
  {
    name: 'init product',
    description: 'Scaffold an additional governed product area in an already-initialized monorepo',
    status: 'planned'
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
      { flag: '--label', description: 'Label(s) to apply; an `iteration:*` label marks a task Issue' },
      { flag: '--validate-only', description: 'Run every gate and report PASS without opening the Issue' },
      { flag: '--json', description: 'Enveloped JSON output (schema: 1)' }
    ],
    details: [
      'A task Issue (any `iteration:*` label) must carry the full Planner rationale (`briefSchema.issue`); non-task Issues pass through unvalidated.'
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
    status: 'planned'
  },
  {
    name: 'upgrade',
    description: 'Regenerate hooks, workflow, and config to the current contract version (diff-and-confirm)',
    status: 'planned'
  },
  {
    name: 'eject',
    description: 'Remove every Vinaya-installed artifact, restoring the repo to stock',
    status: 'planned'
  },
  {
    name: 'demo break',
    description: 'Run a guided refusal-then-fix demo on an isolated, discardable branch',
    status: 'planned'
  },
  {
    name: 'waiver',
    description: "Apply the principal-verified 'waiver:docs' label after prompting for a reason",
    status: 'planned'
  },
  {
    name: 'studio',
    description: 'Launch local Vinaya Studio against this repo (requires a Vinaya workspace checkout)',
    status: 'shipped'
  }
]
