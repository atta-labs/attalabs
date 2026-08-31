// Verified against each framework's own docs/README (evidenceUrl per claim) — never
// re-derived from memory or third-party summaries. Star counts are a rounded floor
// (nearest 10,000), a snapshot at REVIEW_DATE, never a live count — see the inclusion
// rule this file backs on the page itself.

export type CapabilityStatus = 'native' | 'extension' | 'not-in-core' | 'not-verified'

export interface CapabilityEntry {
  status: CapabilityStatus
  evidenceUrl?: string
  note?: string
}

export const CAPABILITY_GROUPS = [
  {
    label: 'Method & workflow',
    rows: [
      { key: 'multiAgent', label: 'Works across multiple coding agents' },
      { key: 'specArtifacts', label: 'Structured specification artifacts' },
      { key: 'orderedStages', label: 'Ordered development stages' },
      { key: 'namedRoles', label: 'Named specialist roles' },
      { key: 'handoffContracts', label: 'Explicit handoff contracts' },
      { key: 'independentReview', label: 'Independent review role' },
      { key: 'securityReview', label: 'Security-review role' },
      { key: 'tdd', label: 'Test-driven development workflow' }
    ]
  },
  {
    label: 'Forge lifecycle',
    rows: [
      { key: 'githubIssues', label: 'GitHub Issues as canonical task records' },
      { key: 'githubMilestones', label: 'GitHub Milestones as delivery goals' },
      { key: 'labelsAsFacts', label: 'Labels as lifecycle facts' },
      { key: 'tranches', label: 'Tranches with dependency/conflict topology' },
      { key: 'liveForgeStatus', label: 'Status derived from live forge facts' },
      { key: 'prBodyRecord', label: 'Pull-request body as the execution record' }
    ]
  },
  {
    label: 'Enforcement & evidence',
    rows: [
      { key: 'managedHooks', label: 'Managed pre-commit/commit-msg/pre-push hooks' },
      { key: 'sharedCheckContract', label: 'One check contract shared by local hooks and CI' },
      { key: 'requiredMergeCheck', label: 'Required merge check' },
      { key: 'principalAuthorizedVerdict', label: 'Principal-authorized review verdict' },
      { key: 'verdictBoundToHead', label: 'Review verdict bound to the current head commit' },
      { key: 'evidenceBoundToHead', label: 'Evidence bound to the current head commit' },
      { key: 'docOwnershipGate', label: 'Documentation-ownership coverage gate' },
      { key: 'threeRings', label: 'Three enforcement rings (local/forge/audit)' }
    ]
  },
  {
    label: 'Customization & operation',
    rows: [
      { key: 'customChecks', label: 'Custom checks' },
      { key: 'configurableBriefSchema', label: 'Configurable brief/issue schema' },
      { key: 'configurablePrincipals', label: 'Configurable trusted principals' },
      { key: 'configurableProjectRegistry', label: 'Configurable project registry' },
      { key: 'configurableDocOwnership', label: 'Configurable documentation ownership' },
      { key: 'installDiagnostics', label: 'Installation diagnostics' },
      { key: 'managedUpgrades', label: 'Managed upgrades' },
      { key: 'ownershipAwareEject', label: 'Ownership-aware eject' },
      { key: 'studioDashboard', label: 'Studio/dashboard' }
    ]
  }
] as const

type CapabilityKey = (typeof CAPABILITY_GROUPS)[number]['rows'][number]['key']

export interface FrameworkIdentity {
  key: string
  name: string
  repoUrl: string
  docsUrl: string
  license: string
  /**
   * A rounded snapshot at reviewDate, never a live count. Rounding a competitor's
   * count UP past its real value inflates it — the page's own "stars select the
   * set, they don't measure quality" framing depends on that never happening, so
   * prefer flooring below the real count when a value needs correcting.
   */
  stars: number
  reviewDate: string
  primaryStrength: string
  highlight?: boolean
  capabilities: Record<CapabilityKey, CapabilityEntry>
}

export const INCLUSION_THRESHOLD_STARS = 25_000
export const REVIEW_DATE = '2026-08-30'

const n = (status: CapabilityStatus, evidenceUrl?: string, note?: string): CapabilityEntry => ({
  status,
  evidenceUrl,
  note
})

// A `not-in-core` entry without its own citation still gets evidenced — falls back
// to the framework's own repo, the source every absence claim below was actually
// checked against. `not-verified` is the only status allowed to carry no citation.
function withReadmeFallback(fw: FrameworkIdentity): FrameworkIdentity {
  const capabilities = Object.fromEntries(
    Object.entries(fw.capabilities).map(([key, entry]) => [
      key,
      entry.evidenceUrl || entry.status === 'not-verified' ? entry : { ...entry, evidenceUrl: fw.repoUrl }
    ])
  ) as FrameworkIdentity['capabilities']
  return { ...fw, capabilities }
}

const RAW_FRAMEWORKS: FrameworkIdentity[] = [
  {
    key: 'superpowers',
    name: 'Superpowers',
    repoUrl: 'https://github.com/obra/superpowers',
    docsUrl: 'https://github.com/obra/superpowers#readme',
    license: 'MIT',
    stars: 280_000,
    reviewDate: REVIEW_DATE,
    primaryStrength:
      'The most-starred framework in this comparison — a TDD-first agentic-skills discipline with subagent-driven, fresh-context review, portable across nearly a dozen coding agents.',
    capabilities: {
      multiAgent: n(
        'native',
        'https://github.com/obra/superpowers/blob/main/docs/porting-to-a-new-harness.md',
        'Skills are harness-agnostic; ships plugin dirs for Claude Code, Codex, Cursor, Devin, Gemini CLI, Copilot CLI, and more.'
      ),
      specArtifacts: n(
        'native',
        'https://github.com/obra/superpowers/blob/main/skills/brainstorming/SKILL.md',
        'Brainstorming produces a versioned design doc with mandated sections and a self-review pass.'
      ),
      orderedStages: n(
        'native',
        'https://github.com/obra/superpowers/blob/main/README.md',
        'Six enforced stages: brainstorming → worktrees → planning → execution → TDD → review/completion.'
      ),
      namedRoles: n(
        'native',
        'https://github.com/obra/superpowers/blob/main/skills/requesting-code-review/code-reviewer.md',
        'Dispatched subagent templates carry named roles (Senior Code Reviewer, implementer, re-reviewer).'
      ),
      handoffContracts: n(
        'native',
        'https://github.com/obra/superpowers/blob/main/skills/subagent-driven-development/SKILL.md',
        'Implementer subagents must return one of four fixed statuses (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED) plus a report.'
      ),
      independentReview: n(
        'native',
        'https://github.com/obra/superpowers/blob/main/skills/requesting-code-review/SKILL.md',
        'Reviewer is a fresh subagent given only crafted context, never the implementer’s session history.'
      ),
      securityReview: n(
        'not-in-core',
        'https://github.com/obra/superpowers/blob/main/skills/requesting-code-review/code-reviewer.md',
        'Security is one checklist bullet inside the general reviewer, not a distinct role or skill.'
      ),
      tdd: n(
        'native',
        'https://github.com/obra/superpowers/blob/main/skills/test-driven-development/SKILL.md',
        'Mandatory Red-Green-Refactor "Iron Law", enforced with a verification checklist.'
      ),
      githubIssues: n(
        'not-in-core',
        'https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md',
        'Task records are local plan markdown files, not GitHub Issues.'
      ),
      githubMilestones: n('not-in-core', undefined, 'No Milestone concept in any skill.'),
      labelsAsFacts: n('not-in-core', undefined, 'No label-driven state anywhere in the skill set.'),
      tranches: n(
        'not-in-core',
        'https://github.com/obra/superpowers/blob/main/skills/subagent-driven-development/SKILL.md',
        'Has an ad hoc per-plan conflict scan, no tranche/topology construct.'
      ),
      liveForgeStatus: n('not-in-core', undefined, 'Status lives in a local ledger file, not live GitHub state.'),
      prBodyRecord: n(
        'not-in-core',
        'https://github.com/obra/superpowers/blob/main/skills/finishing-a-development-branch/SKILL.md',
        'PR creation is one of three finish options with no structured execution-record contract.'
      ),
      managedHooks: n(
        'not-in-core',
        undefined,
        'Ships session-lifecycle hooks for the agent host, not git hooks installed into adopter repos.'
      ),
      sharedCheckContract: n('not-in-core'),
      requiredMergeCheck: n('not-in-core'),
      principalAuthorizedVerdict: n('not-in-core'),
      verdictBoundToHead: n('not-in-core'),
      evidenceBoundToHead: n('not-in-core'),
      docOwnershipGate: n('not-in-core'),
      threeRings: n('not-in-core'),
      customChecks: n('not-in-core', undefined, 'Authoring new skills is workflow authoring, not a check engine.'),
      configurableBriefSchema: n('not-in-core', undefined, 'Plan/task template is fixed prose.'),
      configurablePrincipals: n('not-in-core'),
      configurableProjectRegistry: n('not-in-core'),
      configurableDocOwnership: n('not-in-core'),
      installDiagnostics: n(
        'not-verified',
        undefined,
        'No doctor-style command found; may be undocumented rather than absent.'
      ),
      managedUpgrades: n(
        'not-verified',
        'https://github.com/obra/superpowers/blob/main/README.md',
        'README says updates are "often automatic" — too vague for a confident call.'
      ),
      ownershipAwareEject: n('not-in-core'),
      studioDashboard: n(
        'not-in-core',
        'https://github.com/obra/superpowers/blob/main/skills/brainstorming/SKILL.md',
        'Only UI-adjacent feature is an optional mockup viewer, not a governance dashboard.'
      )
    }
  },
  {
    key: 'spec-kit',
    name: 'Spec Kit',
    repoUrl: 'https://github.com/github/spec-kit',
    docsUrl: 'https://github.github.com/spec-kit/',
    license: 'MIT',
    stars: 130_000,
    reviewDate: REVIEW_DATE,
    primaryStrength:
      'GitHub’s own spec-driven-development harness — three structured artifacts (spec/plan/tasks) reshaped per-project through a first-class preset system.',
    capabilities: {
      multiAgent: n(
        'native',
        'https://github.github.com/spec-kit/reference/integrations.html',
        '38 integrations listed (Claude Code, Copilot, Gemini CLI, Cursor, Codex CLI, and more).'
      ),
      specArtifacts: n(
        'native',
        'https://github.github.com/spec-kit/concepts/sdd.html',
        'spec.md, plan.md, tasks.md, plus memory/constitution.md, generated and consumed by successive commands.'
      ),
      orderedStages: n(
        'native',
        'https://raw.githubusercontent.com/github/spec-kit/main/workflows/speckit/workflow.yml',
        'Built-in cycle: specify → review-spec (gate) → plan → review-plan (gate) → tasks → implement.'
      ),
      namedRoles: n(
        'extension',
        'https://github.com/github/spec-kit/tree/main/examples/bundles',
        'Role-oriented bundles (business-analyst, developer, security-researcher) are optional, not default core.'
      ),
      handoffContracts: n(
        'native',
        'https://raw.githubusercontent.com/github/spec-kit/main/templates/commands/analyze.md',
        'Each phase command hard-requires the prior artifact via check-prerequisites scripts.'
      ),
      independentReview: n(
        'extension',
        'https://raw.githubusercontent.com/github/spec-kit/main/extensions/catalog.community.json',
        'Core ships only generic approve/reject gates; a dedicated reviewer persona is a community extension.'
      ),
      securityReview: n(
        'extension',
        'https://github.com/github/spec-kit/blob/main/examples/bundles/security-researcher/bundle.yml',
        'A security-researcher example bundle exists; no security role ships by default.'
      ),
      tdd: n(
        'extension',
        'https://raw.githubusercontent.com/github/spec-kit/main/templates/commands/tasks.md',
        'Core template makes tests "OPTIONAL... if user requests TDD approach" — a community extension enforces it.'
      ),
      githubIssues: n(
        'not-in-core',
        'https://raw.githubusercontent.com/github/spec-kit/main/templates/commands/taskstoissues.md',
        'An export command can push tasks.md into Issues, but Issues are a one-way projection — tasks.md stays canonical.'
      ),
      githubMilestones: n('not-in-core'),
      labelsAsFacts: n('not-in-core'),
      tranches: n('not-in-core'),
      liveForgeStatus: n('not-in-core', undefined, 'State lives in local .specify/ files.'),
      prBodyRecord: n(
        'extension',
        'https://raw.githubusercontent.com/github/spec-kit/main/extensions/catalog.community.json',
        'A community pr-bridge extension generates PR descriptions from spec artifacts.'
      ),
      managedHooks: n(
        'extension',
        'https://raw.githubusercontent.com/github/spec-kit/main/extensions/catalog.community.json',
        'A community "gates" extension installs agent hooks and git checks; not shipped in core.'
      ),
      sharedCheckContract: n(
        'extension',
        'https://raw.githubusercontent.com/github/spec-kit/main/extensions/catalog.community.json',
        'The same community extension frames "one policy file, one verify entrypoint."'
      ),
      requiredMergeCheck: n(
        'extension',
        'https://raw.githubusercontent.com/github/spec-kit/main/extensions/catalog.community.json',
        'Community ci-guard/maqa-ci extensions can block merges; not core.'
      ),
      principalAuthorizedVerdict: n('not-in-core'),
      verdictBoundToHead: n('not-in-core'),
      evidenceBoundToHead: n('not-in-core'),
      docOwnershipGate: n(
        'not-in-core',
        undefined,
        'A community docguard extension checks docs-vs-code drift but has no verified ownership mapping.'
      ),
      threeRings: n('not-in-core'),
      customChecks: n(
        'extension',
        'https://raw.githubusercontent.com/github/spec-kit/main/extensions/catalog.community.json',
        'Community gates/ci-guard/docguard extensions add checks; core ships no check framework.'
      ),
      configurableBriefSchema: n(
        'native',
        'https://github.github.com/spec-kit/reference/presets.html',
        'Presets are a first-class core mechanism overriding the templates and commands that ship with core.'
      ),
      configurablePrincipals: n('not-in-core'),
      configurableProjectRegistry: n('not-in-core', undefined, 'Operates per-project via a local .specify/ directory.'),
      configurableDocOwnership: n('not-in-core'),
      installDiagnostics: n(
        'native',
        'https://raw.githubusercontent.com/github/spec-kit/main/docs/reference/core.md',
        'specify check verifies installed agents; specify self check checks CLI currency.'
      ),
      managedUpgrades: n(
        'native',
        'https://github.github.com/spec-kit/upgrade.html',
        'specify self upgrade self-upgrades; a manifest-aware upgrade path avoids clobbering local edits.'
      ),
      ownershipAwareEject: n('not-in-core', undefined, 'No eject/uninstall-to-plain-files feature exists.'),
      studioDashboard: n(
        'extension',
        'https://raw.githubusercontent.com/github/spec-kit/main/extensions/catalog.community.json',
        'Community extensions supply dashboards (tldr, schedule, agentdocx); core ships none.'
      )
    }
  },
  {
    key: 'openspec',
    name: 'OpenSpec',
    repoUrl: 'https://github.com/Fission-AI/OpenSpec',
    docsUrl: 'https://github.com/Fission-AI/OpenSpec/blob/main/docs/cli.md',
    license: 'MIT',
    stars: 66_000,
    reviewDate: REVIEW_DATE,
    primaryStrength:
      'A propose → apply → archive spec workflow with a real validate --strict exit-code contract and a fully customizable artifact schema.',
    capabilities: {
      multiAgent: n(
        'native',
        'https://github.com/Fission-AI/OpenSpec/blob/main/docs/supported-tools.md',
        'Own tool-directory table lists 30+ AI assistants, each generating skill/command files.'
      ),
      specArtifacts: n(
        'native',
        'https://github.com/Fission-AI/OpenSpec/blob/main/docs/concepts.md',
        'Markdown specs with `## Requirement:`/`#### Scenario:` structure and RFC 2119 keywords.'
      ),
      orderedStages: n(
        'native',
        'https://github.com/Fission-AI/OpenSpec/blob/main/docs/concepts.md',
        'A schema-defined artifact dependency graph — proposal → specs → design → tasks → implement.'
      ),
      namedRoles: n(
        'extension',
        'https://github.com/Fission-AI/OpenSpec/blob/main/docs/customization.md',
        'The community "anvil" schema names a fresh-context reviewer; no named roles ship in core.'
      ),
      handoffContracts: n(
        'extension',
        'https://github.com/Fission-AI/OpenSpec/blob/main/docs/customization.md',
        'anvil’s review artifact emits a VERDICT line gating later steps; core only has generic dependency lists.'
      ),
      independentReview: n(
        'extension',
        'https://github.com/Fission-AI/OpenSpec/blob/main/docs/customization.md',
        'anvil’s review step is written by a fresh-context, read-only reviewer — a community schema, not core.'
      ),
      securityReview: n(
        'not-in-core',
        'https://github.com/Fission-AI/OpenSpec/blob/main/docs/customization.md',
        'The doc’s own example lists security as one checklist bullet, not a dedicated role.'
      ),
      tdd: n(
        'extension',
        'https://github.com/Fission-AI/OpenSpec/blob/main/docs/customization.md',
        'anvil ships a scenario-to-test red/green ledger; not shipped in core.'
      ),
      githubIssues: n(
        'not-in-core',
        'https://github.com/Fission-AI/OpenSpec/blob/main/docs/team-workflow.md',
        '"OpenSpec doesn’t touch git" — task tracking is local tasks.md checkboxes.'
      ),
      githubMilestones: n('not-in-core'),
      labelsAsFacts: n('not-in-core'),
      tranches: n(
        'not-in-core',
        'https://github.com/Fission-AI/OpenSpec/blob/main/docs/workflows.md',
        'Bulk-archive only detects same-spec conflicts between local changes, not a forge-level topology.'
      ),
      liveForgeStatus: n(
        'not-in-core',
        'https://github.com/Fission-AI/OpenSpec/blob/main/docs/agent-contract.md',
        'status --json is computed entirely from local files, no forge API involved.'
      ),
      prBodyRecord: n(
        'not-in-core',
        'https://github.com/Fission-AI/OpenSpec/blob/main/docs/team-workflow.md',
        'Putting the delta spec in the PR description is a recommended team convention, not something OpenSpec reads/writes.'
      ),
      managedHooks: n(
        'not-in-core',
        'https://github.com/Fission-AI/OpenSpec/blob/main/docs/cli.md',
        'validate --archived is "handy in a pre-commit hook" the adopter wires up manually.'
      ),
      sharedCheckContract: n(
        'not-in-core',
        'https://github.com/Fission-AI/OpenSpec/blob/main/docs/cli.md',
        'validate --strict --json gives one deterministic exit-code contract, but nothing binds a hook to CI for you.'
      ),
      requiredMergeCheck: n('not-in-core', undefined, 'validate exit codes are for the adopter’s own CI to consume.'),
      principalAuthorizedVerdict: n('not-in-core'),
      verdictBoundToHead: n(
        'not-in-core',
        'https://github.com/Fission-AI/OpenSpec/blob/main/docs/workflows.md',
        '/opsx:verify reports findings with no commit-SHA binding.'
      ),
      evidenceBoundToHead: n('not-in-core'),
      docOwnershipGate: n('not-in-core'),
      threeRings: n('not-in-core'),
      customChecks: n(
        'not-in-core',
        'https://github.com/Fission-AI/OpenSpec/blob/main/docs/customization.md',
        'Schema validate only checks YAML syntax and template existence, not arbitrary content rules.'
      ),
      configurableBriefSchema: n(
        'native',
        'https://github.com/Fission-AI/OpenSpec/blob/main/docs/customization.md',
        'Artifact types, templates, and dependencies are fully user-definable per project.'
      ),
      configurablePrincipals: n('not-in-core'),
      configurableProjectRegistry: n(
        'native',
        'https://github.com/Fission-AI/OpenSpec/blob/main/docs/cli.md',
        'store setup/register/list/doctor — a machine-local registry of planning stores.'
      ),
      configurableDocOwnership: n('not-in-core'),
      installDiagnostics: n(
        'native',
        'https://github.com/Fission-AI/OpenSpec/blob/main/docs/cli.md',
        'openspec doctor reports root/store/reference health.'
      ),
      managedUpgrades: n(
        'native',
        'https://github.com/Fission-AI/OpenSpec/blob/main/docs/installation.md',
        'openspec update checks the registry and regenerates skill/command files.'
      ),
      ownershipAwareEject: n(
        'not-in-core',
        'https://github.com/Fission-AI/OpenSpec/blob/main/docs/installation.md',
        'Uninstalling is explicitly manual — delete the package and generated files by hand.'
      ),
      studioDashboard: n(
        'native',
        'https://github.com/Fission-AI/OpenSpec/blob/main/docs/cli.md',
        'openspec view opens a terminal-based interface for browsing specs and changes — not a browser dashboard like Vinaya Studio.'
      )
    }
  },
  {
    key: 'bmad',
    name: 'BMAD',
    repoUrl: 'https://github.com/bmad-code-org/BMAD-METHOD',
    docsUrl: 'https://github.com/bmad-code-org/BMAD-METHOD/blob/main/docs/index.md',
    license: 'MIT',
    stars: 50_000,
    reviewDate: REVIEW_DATE,
    primaryStrength:
      'Five named specialist personas (Analyst, PM, Architect, Developer, UX Designer) covering the full plan-to-build lifecycle with explicit story handoffs.',
    capabilities: {
      multiAgent: n(
        'native',
        'https://github.com/bmad-code-org/BMAD-METHOD/blob/main/tools/installer/ide/platform-codes.yaml',
        'Installer targets ~56 coding-agent/IDE platforms.'
      ),
      specArtifacts: n(
        'native',
        'https://github.com/bmad-code-org/BMAD-METHOD/blob/main/docs/plan/define-requirements-and-a-specification.md',
        'Product brief, PRFAQ, PRD, spec, UX docs, and architecture doc are all structured artifact-producing skills.'
      ),
      orderedStages: n(
        'native',
        'https://github.com/bmad-code-org/BMAD-METHOD/blob/main/docs/index.md',
        'Plan-then-build phases broken into ordered sub-stages, though pathways are flexible rather than a forced pipeline.'
      ),
      namedRoles: n(
        'native',
        'https://github.com/bmad-code-org/BMAD-METHOD/blob/main/docs/reference/skills-and-agents.md',
        'Five named personas ship in core: Analyst, Product Manager, Architect, Developer, UX Designer.'
      ),
      handoffContracts: n(
        'native',
        'https://github.com/bmad-code-org/BMAD-METHOD/blob/main/docs/plan/break-work-into-stories-and-track-it.md',
        'PRD → architecture/UX → epics/stories → sprint-status.yaml, stories carrying explicit acceptance criteria.'
      ),
      independentReview: n(
        'native',
        'https://github.com/bmad-code-org/BMAD-METHOD/blob/main/docs/build/build-a-change.md',
        'bmad-code-review runs several independent reviewer lenses, then triages the findings.'
      ),
      securityReview: n(
        'extension',
        'https://github.com/bmad-code-org/BMAD-METHOD/blob/main/docs/build/review-a-change.md',
        'No dedicated security role ships; a "security-bot lens" is shown as a user-defined customization example.'
      ),
      tdd: n(
        'extension',
        'https://github.com/bmad-code-org/BMAD-METHOD/blob/main/docs/build/test-completed-work.md',
        'Core default is tests-after-code; true TDD lives in a separately-hosted official Test Architect module.'
      ),
      githubIssues: n('not-in-core', undefined, 'Artifacts are local files (stories.yaml, sprint-status.yaml).'),
      githubMilestones: n('not-in-core'),
      labelsAsFacts: n('not-in-core'),
      tranches: n('not-in-core'),
      liveForgeStatus: n('not-in-core', undefined, 'Status is tracked in local sprint-status.yaml.'),
      prBodyRecord: n(
        'not-in-core',
        'https://github.com/bmad-code-org/BMAD-METHOD/blob/main/docs/build/build-a-change.md',
        'bmad-build commits locally; no PR-body-as-record convention.'
      ),
      managedHooks: n(
        'not-in-core',
        undefined,
        'Own repo’s pre-commit hook is internal contributor tooling, not installed into adopter projects.'
      ),
      sharedCheckContract: n('not-in-core'),
      requiredMergeCheck: n('not-in-core'),
      principalAuthorizedVerdict: n(
        'not-in-core',
        'https://github.com/bmad-code-org/BMAD-METHOD/blob/main/docs/customize/adopt-bmad-across-a-team.md',
        'No approval-authorization hierarchy.'
      ),
      verdictBoundToHead: n('not-in-core'),
      evidenceBoundToHead: n('not-in-core'),
      docOwnershipGate: n(
        'not-in-core',
        'https://github.com/bmad-code-org/BMAD-METHOD/blob/main/docs/customize/adopt-bmad-across-a-team.md'
      ),
      threeRings: n('not-in-core'),
      customChecks: n(
        'not-in-core',
        'https://github.com/bmad-code-org/BMAD-METHOD/blob/main/docs/reference/skills-and-agents.md',
        'Review lenses are customizable (customize.toml), but that’s AI-judgment review, not a deterministic executable check with an exit code.'
      ),
      configurableBriefSchema: n(
        'not-in-core',
        undefined,
        'Customization targets personas/templates, not an issue/brief schema.'
      ),
      configurablePrincipals: n('not-in-core'),
      configurableProjectRegistry: n('not-in-core'),
      configurableDocOwnership: n('not-in-core'),
      installDiagnostics: n(
        'native',
        'https://github.com/bmad-code-org/BMAD-METHOD/blob/main/tools/installer/commands/status.js',
        'status command reports install existence, manifest validity, module versions, update availability.'
      ),
      managedUpgrades: n(
        'native',
        'https://github.com/bmad-code-org/BMAD-METHOD/blob/main/tools/installer/core/existing-install.js',
        'Installer detects an existing install and updates non-destructively.'
      ),
      ownershipAwareEject: n(
        'not-in-core',
        'https://github.com/bmad-code-org/BMAD-METHOD/blob/main/docs/customize/customize-bmad.md',
        '"BMad does not offer a complete eject mechanism" — only layered overrides.'
      ),
      studioDashboard: n('not-in-core', undefined, 'Its website/ is a docs site, not a governance dashboard.')
    }
  },
  {
    key: 'vinaya',
    name: 'Vinaya',
    repoUrl: 'https://github.com/atta-labs/vinaya',
    docsUrl: '/docs/reference',
    license: 'Apache-2.0',
    stars: 0,
    reviewDate: REVIEW_DATE,
    primaryStrength:
      'The only one of these that plans on your forge, gates merges with the same code as its own local hooks, and binds review and evidence to the exact commit under review.',
    highlight: true,
    capabilities: {
      multiAgent: n(
        'native',
        '/docs/reference',
        'Agent-CLI agnostic by design — Cursor, Claude Code, Codex, or another.'
      ),
      specArtifacts: n(
        'native',
        '/docs/reference',
        'The brief is a structured artifact, pasted into the canonical PR-body form.'
      ),
      orderedStages: n('native', '/docs/reference', 'Plan → Brief → Develop → Review → Archive → Wrap up.'),
      namedRoles: n(
        'native',
        '/docs/reference',
        'Architect, Planner, Brief Author, Developer, Reviewer, Security, Archivist, Tranche Archivist, Principal.'
      ),
      handoffContracts: n('native', '/docs/reference', 'A named contract file for every adjacent role pair.'),
      independentReview: n('native', '/docs/reference', 'A separate Reviewer role, a fresh-context invocation.'),
      securityReview: n('native', '/docs/reference', 'A separate Security role with its own verdict grammar.'),
      tdd: n(
        'not-in-core',
        undefined,
        'Every behavioral change ships with tests — required, not a test-first discipline.'
      ),
      githubIssues: n('native', '/docs/reference', 'A task Issue is the addressable unit dispatch resolves against.'),
      githubMilestones: n('native', '/docs/reference', 'A tranche is a GitHub Milestone.'),
      labelsAsFacts: n(
        'native',
        '/docs/reference',
        'vinaya/tranche:*, waiver, and project labels drive real decisions.'
      ),
      tranches: n('native', '/docs/reference', 'depends-on/conflicts-with topology gates dispatch order.'),
      liveForgeStatus: n('native', '/docs/state-machine', 'Status is derived, never written, from live forge facts.'),
      prBodyRecord: n('native', '/docs/reference', 'The brief lives in the PR body — its permanent, durable home.'),
      managedHooks: n('native', '/docs/cli', 'Generated pre-commit, commit-msg, and pre-push hooks.'),
      sharedCheckContract: n('native', '/docs/reference', 'Ring 0 (hooks) and ring 1 (CI) run identical check code.'),
      requiredMergeCheck: n('native', '/docs/state-machine', 'Branch protection plus a required Vinaya check.'),
      principalAuthorizedVerdict: n('native', '/docs/config', 'The `principals` config key names who may approve.'),
      verdictBoundToHead: n(
        'native',
        '/docs/state-machine',
        'Review verdicts are re-checked against the PR’s real head sha.'
      ),
      evidenceBoundToHead: n(
        'native',
        '/docs/state-machine',
        'Evidence is byte-verified against the current head — fixed, not a preference.'
      ),
      docOwnershipGate: n(
        'native',
        '/docs/config',
        '.vinaya/doc-owners binds a code glob to the doc it must keep true.'
      ),
      threeRings: n('native', '/docs/reference', 'Local hooks, a required CI check, and async post-merge audits.'),
      customChecks: n('native', '/docs/cli', '`vinaya new check` scaffolds a custom check with no privileged API.'),
      configurableBriefSchema: n(
        'native',
        '/docs/config',
        'The `briefSchema` key reshapes required PR/Issue sections.'
      ),
      configurablePrincipals: n(
        'native',
        '/docs/config',
        'The `principals` key overrides the default reviewer allowlist.'
      ),
      configurableProjectRegistry: n('native', '/docs/cli', '`.vinaya/projects.md`, written by `init product`.'),
      configurableDocOwnership: n('native', '/docs/config', '.vinaya/doc-owners is hand-authored and adopter-owned.'),
      installDiagnostics: n(
        'native',
        '/docs/cli',
        '`vinaya doctor` diagnoses hooks, workflows, and config — mutates nothing.'
      ),
      managedUpgrades: n(
        'native',
        '/docs/cli',
        '`vinaya upgrade` regenerates vinaya-owned artifacts, diff-and-confirm.'
      ),
      ownershipAwareEject: n(
        'native',
        '/docs/cli',
        '`vinaya eject` removes exactly what was installed, nothing adopter-owned.'
      ),
      studioDashboard: n('native', '/the-studio', 'Vinaya Studio — a local dashboard over the same derived state.')
    }
  }
]

export const FRAMEWORKS: FrameworkIdentity[] = RAW_FRAMEWORKS.map(withReadmeFallback)
