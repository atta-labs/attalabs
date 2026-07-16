export type CommandStatus = 'shipped' | 'planned'

export type CommandFlag = {
  flag: string
  description: string
}

export type Command = {
  name: string
  description: string
  flags?: CommandFlag[]
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
    status: 'planned'
  },
  {
    name: 'init product',
    description: 'Scaffold an additional governed product area in an already-initialized monorepo',
    status: 'planned'
  },
  {
    name: 'check',
    description: 'Run one named check, or every check, and report pass/fail',
    flags: [
      { flag: '--json', description: 'Enveloped JSON output' },
      { flag: '--diff-only', description: 'Scope checks to the current change surface (ring-1 default)' },
      { flag: '--parallel', description: 'Run checks concurrently, concurrency-capped' }
    ],
    status: 'planned'
  },
  {
    name: 'new check',
    description: 'Scaffold a new custom check from a worked template',
    status: 'planned'
  },
  {
    name: 'pr create',
    description: 'Open a pull request after full brief-schema validation',
    status: 'planned'
  },
  {
    name: 'pr edit',
    description: 'Edit an existing pull request after full brief-schema validation',
    status: 'planned'
  },
  {
    name: 'issue create',
    description: 'Open an issue after full brief-schema validation',
    status: 'planned'
  },
  {
    name: 'issue edit',
    description: 'Edit an existing issue after full brief-schema validation',
    status: 'planned'
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
    description: 'Launch Vinaya Studio locally',
    status: 'planned'
  }
]
