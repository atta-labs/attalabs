// The install manifest, made concrete (vinaya-cli-v1 task 4).
//
// Every artifact `vinaya init` writes into an adopter repo lives here as
// content + a typed `Op` (see lib/ops.ts). Naming and collision rules follow
// Issue #384's amendment-4 manifest, corrected for D-115 (TWO workflows) and
// D-085 (adopter artifacts are neutral / `vinaya`-named, never `aeg-root` or
// `aeg-project` — an adopter never encounters "AEG").
//
// The starter ruleset seeded into `vinaya.config.json` is EXTRACTED from this
// repo's own battle-tested gates (D-105), not invented blanks — the failure it
// kills is blank-config paralysis.

import type { VinayaConfig } from './config.js'
import type { CreateLabelOp, Op } from './ops.js'

export type HookDir = '.husky' | '.git/hooks'

export type InitContext = {
  owner: string
  repo: string
  /** where the git-hook stubs are installed (husky if present, else raw) */
  hookDir: HookDir
}

// --- neutral scaffold paths (never aeg-root / aeg-project) ------------------
export const CONFIG_PATH = 'vinaya.config.json'
export const GOVERNANCE_DIR = 'governance'
export const DECISIONS_PATH = `${GOVERNANCE_DIR}/decisions.md`
export const DOC_OWNERS_PATH = `${GOVERNANCE_DIR}/doc-owners`
export const PROJECTS_PATH = `${GOVERNANCE_DIR}/projects.md`
export const DOCTRINE_POINTER_PATH = `${GOVERNANCE_DIR}/doctrine.md`
export const CHECKS_WORKFLOW_PATH = '.github/workflows/vinaya-checks.yml'
export const REVIEW_WORKFLOW_PATH = '.github/workflows/vinaya-review.yml'
export const ISSUE_TEMPLATE_PATH = '.github/ISSUE_TEMPLATE/vinaya-task.md'
export const PR_TEMPLATE_PATH = '.github/pull_request_template.md'
export const EXAMPLE_CHECK_TODO = 'scripts/vinaya-checks/example-no-stray-todo.sh'
export const EXAMPLE_CHECK_BRANCH = 'scripts/vinaya-checks/example-branch-name.sh'

const MANAGED_NOTE =
  'Managed by Vinaya — created by `vinaya init`. `vinaya upgrade` regenerates it; `vinaya eject` removes it.'

// ---------------------------------------------------------------------------
// D-105 starter ruleset — the seed for vinaya.config.json (no `managed`; the
// installer injects the ownership manifest after applying every op).
// ---------------------------------------------------------------------------
export function starterConfig(): VinayaConfig {
  return {
    // Ring 1 (forge-write interception) and Ring 2 (async audits) are opt-in
    // accelerators, off by default (D-090). Ring 0 (git hooks) and the CI
    // guarantee are non-negotiable and deliberately absent from the schema.
    rings: { ring1_forgeWriteInterception: false, ring2_asyncAudits: false },
    // Two real custom-check examples (D-105), each honoring the versioned
    // CheckError contract. Their scripts are scaffolded alongside this config.
    checks: {
      'no-stray-todo': {
        run: `./${EXAMPLE_CHECK_TODO}`,
        scope: 'diff',
        include: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx']
      },
      'branch-name': {
        run: `./${EXAMPLE_CHECK_BRANCH}`,
        scope: 'full'
      }
    },
    // Brief-schema defaults extracted from this repo's real PR/Issue gates: a
    // PR body must carry Tier, a tagged Test Plan, and a Closes #N; a task
    // Issue must carry the Planner rationale.
    briefSchema: {
      pr: {
        sections: [
          { builtin: 'tier' },
          { builtin: 'testPlan' },
          { builtin: 'testPlanExclusivity' },
          { builtin: 'closesN' },
          { builtin: 'project' }
        ]
      },
      issue: {
        sections: [{ builtin: 'issueRationale' }, { builtin: 'project' }]
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Workflow files (D-115: two, both refuse-if-foreign, both vinaya-prefixed)
// ---------------------------------------------------------------------------
function checksWorkflow(): string {
  return `# ${MANAGED_NOTE}
#
# The deterministic gate suite. Runs every registered vinaya check over the
# pull request's diff. This is the guarantee: a PR cannot merge red.
name: Vinaya Checks

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  vinaya-checks:
    name: vinaya check --all --diff-only
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Run checks
        run: npx --yes vinaya check --all --diff-only
`
}

function reviewWorkflow(): string {
  return `# ${MANAGED_NOTE}
#
# The review gate — split from the checks suite (D-115) so a verdict *comment*
# re-triggers it. GitHub fires \`issue_comment\` for a new PR comment, a
# different event from \`pull_request\`; the checks workflow (pull_request only)
# structurally cannot receive it. A cheap \`contains(..., 'VERDICT')\` guard
# runs before any checkout cost, so ordinary PR chat spends no billed minute.
name: Vinaya Review Gate

on:
  pull_request:
    types: [opened, synchronize, reopened, labeled, unlabeled]
  issue_comment:
    types: [created]

jobs:
  vinaya-review:
    name: vinaya review gate
    if: >
      github.event_name == 'pull_request' ||
      (github.event.issue.pull_request != null && contains(github.event.comment.body, 'VERDICT'))
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
      issues: read
    steps:
      # issue_comment payloads carry no PR head SHA/branch — resolve them
      # before checkout, and check out that exact commit (the event's default
      # ref is the repo's default branch, not the PR head).
      - name: Resolve PR head
        id: pr
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: |
          if [ "\${{ github.event_name }}" = "pull_request" ]; then
            NUMBER="\${{ github.event.pull_request.number }}"
          else
            NUMBER="\${{ github.event.issue.number }}"
          fi
          SHA=$(gh pr view "$NUMBER" --repo "\${{ github.repository }}" --json headRefOid -q .headRefOid)
          echo "sha=$SHA" >> "$GITHUB_OUTPUT"
      - uses: actions/checkout@v4
        with:
          ref: \${{ steps.pr.outputs.sha }}
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Review gate
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: npx --yes vinaya check --all
`
}

// ---------------------------------------------------------------------------
// Git-hook stubs — thin, marker-delimited, invoke the vinaya binary ONLY
// (never inline check logic, never path into any repo-internal bin).
// ---------------------------------------------------------------------------
const HOOK_PREAMBLE = '#!/usr/bin/env sh\n'

function preCommitBody(): string {
  return `# Vinaya commit-time gate. Runs the deterministic checks over your staged
# diff before the commit lands.
npx --no-install vinaya check --all --diff-only || exit 1`
}

function prePushBody(): string {
  return `# Vinaya pre-push gate. Runs branch/dispatch checks before the push leaves.
npx --no-install vinaya check --all || exit 1`
}

// ---------------------------------------------------------------------------
// Issue + PR templates
// ---------------------------------------------------------------------------
function issueTemplate(): string {
  return `<!-- ${MANAGED_NOTE} -->
---
name: Vinaya task
about: A governed task Issue carrying the Planner rationale the gates read
labels: []
---

Project: <project>
Iteration: <iteration> · task <n>

**Boundary** — <the single change this task makes; what is explicitly out of scope>

**Sizing** — <why this is one task: one verification story, one agent, bounded surface>

**Project(s) + blast radius** — <projects touched>

**Dependency rationale** — \`Depends-on: —\` <or the task ids this serializes behind, and why>

**Traps to avoid** — <the specific mistakes this task must not make>

**Stop-and-escalate** — <the conditions under which the executor stops rather than guessing>
`
}

function prTemplateBody(): string {
  return `## Summary

<one paragraph: what shipped, the validated mechanism, and the durable why. Closes #<N>.>

## Test plan

- [ ] **[agent]** <scriptable non-auth check — paste the actual command output>
- [ ] **[principal]** <auth-gated / visual check — verified in a real session>

## Scope

<blast radius — projects touched, packages edited, non-goals.>

**Tier:** <0 | 1 | 3>`
}

// ---------------------------------------------------------------------------
// Governance scaffold (D-106 decision log, D-111 doctrine pointer, registries)
// ---------------------------------------------------------------------------
function decisionsScaffold(): string {
  return `<!-- ${MANAGED_NOTE} -->
# Decision log

Every irreversible or contested choice is recorded here as a numbered entry so
the decision-number-integrity gate has something real to validate from day one
(D-106). Append-only: never rewrite a landed entry; supersede it with a new one.

Entry shape:

## D-001 — <one-line title>

**Date:** YYYY-MM-DD
**Status:** ACTIVE | PENDING
**Type:** 1 (irreversible) | 2 (reversible)
**Decision:** <what was decided>
**Rationale:** <why>
**Locked gates affected:** <none, or the gate/check this constrains>

---

<!-- Add your first decision above this line. Keep the numbering contiguous. -->
`
}

function docOwnersScaffold(): string {
  return `# ${MANAGED_NOTE.replace('# ', '')}
# doc-owners — code→doc coverage bindings (example set; edit for your repo).
#
# Each line binds a code surface (glob) to the doc that must be updated in the
# same PR when that surface changes. The coverage gate reads this file; an
# empty or absent file makes the gate dormant.
#
# format:  <glob>  ->  <doc path>
#
# src/**            ->  docs/architecture.md
# packages/api/**   ->  docs/api.md
`
}

function projectsScaffold(owner: string, repo: string): string {
  return `<!-- ${MANAGED_NOTE} -->
# Projects

The registry of governed product areas in this repo. A task's \`Project:\` field
must resolve against a row here. \`vinaya init product <name>\` appends a row.

| Project | Path | Status |
|---------|------|--------|
| ${repo} | . | Active |

<!-- owner/repo: ${owner}/${repo} -->
`
}

function doctrinePointer(): string {
  return `<!-- ${MANAGED_NOTE} -->
# Vinaya doctrine — read this first

This repo is governed by Vinaya. The full, canonical doctrine (roles,
contracts, the state machine, the ring gates) ships inside the installed
\`vinaya\` npm package as versioned reference content and is updated cleanly by
\`vinaya upgrade\` — there is no in-repo copy to drift (D-111).

An agent working in this repo follows the governed flow by reading three
things:

1. **This pointer** — the tool-agnostic entry point at the conventional
   reading-order path. It names where the doctrine lives.
2. **\`${CONFIG_PATH}\`** — the ruleset the gates enforce: rings, custom checks,
   and the brief schema a PR/Issue body must satisfy.
3. **\`${DECISIONS_PATH}\`** — the decision log, the durable record of the
   irreversible choices this repo has made.

Live task status is derived from the forge (Issues, labels, comments) via
\`vinaya check\` — it is never written into a file here.

To view the doctrine text: \`vinaya doctor\` reports what is installed; the
package's own reference content is the source of truth.
`
}

// ---------------------------------------------------------------------------
// Example custom-check scripts (real, executable, contract-honoring)
// ---------------------------------------------------------------------------
function exampleTodoCheck(): string {
  return `#!/usr/bin/env sh
# Example vinaya custom check (D-105). Fails if a staged file introduces a
# stray "TODO: FIXME"-style marker. Emits one CheckError JSON line per finding
# on stderr and exits 1 — the versioned check contract. Delete or edit freely.
set -eu

hits=$(git diff --cached -U0 | grep -nE '^\\+.*(FIXME|XXX)\\b' || true)
if [ -n "$hits" ]; then
  printf '%s\\n' '{"schema":1,"check":"no-stray-todo","severity":"error","message":"Staged diff introduces a FIXME/XXX marker.","agent_recovery_prompt":"Resolve or remove the FIXME/XXX marker before committing, then re-run vinaya check."}' >&2
  exit 1
fi
exit 0
`
}

function exampleBranchCheck(): string {
  return `#!/usr/bin/env sh
# Example vinaya custom check (D-105). Fails if the current branch is not a
# task/<iteration>/<n> or fix/<slug> branch. Emits the CheckError contract.
set -eu

branch=$(git rev-parse --abbrev-ref HEAD)
case "$branch" in
  task/*/*|fix/*|main) exit 0 ;;
  *)
    printf '%s\\n' '{"schema":1,"check":"branch-name","severity":"error","message":"Branch does not match task/<iteration>/<n> or fix/<slug>.","agent_recovery_prompt":"Rename the branch to task/<iteration>/<n> or fix/<slug> before pushing."}' >&2
    exit 1
    ;;
esac
`
}

// ---------------------------------------------------------------------------
// Labels — create-if-absent, existing never modified (amendment-4 manifest).
// Extracted from this repo's real gate vocabulary (D-105): tier tiers +
// needs:*-input escalation labels. No tier:2 (vestigial). No status:*.
// ---------------------------------------------------------------------------
export function labelOps(): CreateLabelOp[] {
  const g = 'Labels (create-if-absent; existing labels never modified)'
  const mk = (name: string, color: string, description: string): CreateLabelOp => ({
    kind: 'create-label',
    name,
    color,
    description,
    group: g
  })
  return [
    mk('tier:0', 'ededed', 'Trivial / mechanical change'),
    mk('tier:1', 'c5def5', 'Standard task — code + tests + docs'),
    mk('tier:3', 'd93f0b', 'Records a decision; ratification-gated'),
    mk('needs:execution-input', 'fbca04', 'Blocked on a missing execution detail'),
    mk('needs:strategy-input', 'fbca04', 'Blocked on a strategy/approach decision'),
    mk('needs:principal-input', 'b60205', 'Blocked on a Principal decision')
  ]
}

const BRANCH_PROTECTION_NOTE = `Recommended (run yourself — vinaya never applies branch protection, D-091):

  gh api -X PUT repos/{owner}/{repo}/branches/main/protection \\
    -F required_pull_request_reviews.required_approving_review_count=1 \\
    -F required_status_checks.strict=true \\
    -F 'required_status_checks.contexts[]=vinaya-checks' \\
    -F enforce_admins=true -F restrictions=`

// ---------------------------------------------------------------------------
// Op builders
// ---------------------------------------------------------------------------

/** The full forward change-set for `vinaya init`. */
export function buildInitOps(ctx: InitContext): Op[] {
  const ops: Op[] = []
  const hookMode = 0o755

  // Workflows (refuse-if-foreign create-file).
  ops.push({ kind: 'create-file', path: CHECKS_WORKFLOW_PATH, content: checksWorkflow(), group: 'CI workflows' })
  ops.push({ kind: 'create-file', path: REVIEW_WORKFLOW_PATH, content: reviewWorkflow(), group: 'CI workflows' })

  // Git hooks (marker-delimited managed blocks; never clobber).
  ops.push({
    kind: 'managed-block',
    path: `${ctx.hookDir}/pre-commit`,
    marker: 'pre-commit',
    body: preCommitBody(),
    comment: 'hash',
    hostPreamble: HOOK_PREAMBLE,
    mode: hookMode,
    group: 'Git hooks'
  })
  ops.push({
    kind: 'managed-block',
    path: `${ctx.hookDir}/pre-push`,
    marker: 'pre-push',
    body: prePushBody(),
    comment: 'hash',
    hostPreamble: HOOK_PREAMBLE,
    mode: hookMode,
    group: 'Git hooks'
  })

  // Config (refuse-if-foreign). Content is the seed WITHOUT `managed`; the
  // installer rewrites it with the ownership manifest injected after apply.
  ops.push({
    kind: 'create-file',
    path: CONFIG_PATH,
    content: `${JSON.stringify(starterConfig(), null, 2)}\n`,
    group: 'Config (starter ruleset)'
  })

  // Example custom-check scripts (real, executable).
  ops.push({
    kind: 'create-file',
    path: EXAMPLE_CHECK_TODO,
    content: exampleTodoCheck(),
    mode: hookMode,
    group: 'Config (starter ruleset)'
  })
  ops.push({
    kind: 'create-file',
    path: EXAMPLE_CHECK_BRANCH,
    content: exampleBranchCheck(),
    mode: hookMode,
    group: 'Config (starter ruleset)'
  })

  // Templates.
  ops.push({ kind: 'create-file', path: ISSUE_TEMPLATE_PATH, content: issueTemplate(), group: 'Forge templates' })
  ops.push({
    kind: 'managed-block',
    path: PR_TEMPLATE_PATH,
    marker: 'pr-template',
    body: prTemplateBody(),
    comment: 'html',
    group: 'Forge templates'
  })

  // Governance scaffold (D-106 / D-111).
  ops.push({
    kind: 'create-file',
    path: DOCTRINE_POINTER_PATH,
    content: doctrinePointer(),
    group: 'Governance scaffold'
  })
  ops.push({ kind: 'create-file', path: DECISIONS_PATH, content: decisionsScaffold(), group: 'Governance scaffold' })
  ops.push({ kind: 'create-file', path: DOC_OWNERS_PATH, content: docOwnersScaffold(), group: 'Governance scaffold' })
  ops.push({
    kind: 'create-file',
    path: PROJECTS_PATH,
    content: projectsScaffold(ctx.owner, ctx.repo),
    group: 'Governance scaffold'
  })

  // Labels.
  ops.push(...labelOps())

  // Branch protection — printed only, never applied (D-091).
  ops.push({ kind: 'print', message: BRANCH_PROTECTION_NOTE, group: 'Branch protection (printed, never applied)' })

  return ops
}

/** The change-set for `vinaya init product <name>` — a new governed area. */
export function buildInitProductOps(name: string): Op[] {
  const safe = name.trim()
  const projectRow = `| ${safe} | apps/${safe} | Active |`
  return [
    {
      kind: 'managed-block',
      path: PROJECTS_PATH,
      marker: `product-${safe}`,
      body: projectRow,
      comment: 'html',
      group: `Governed product area: ${safe}`
    },
    {
      kind: 'create-file',
      path: `${GOVERNANCE_DIR}/products/${safe}/decisions.md`,
      content: `<!-- ${MANAGED_NOTE} -->\n# ${safe} — decision log\n\n<!-- Numbered decisions scoped to the ${safe} product area. -->\n`,
      group: `Governed product area: ${safe}`
    }
  ]
}

export { BRANCH_PROTECTION_NOTE }
