// The install manifest, made concrete.
//
// Every artifact `vinaya init` writes into an adopter repo lives here as
// content + a typed `Op` (see lib/ops.ts). Naming and collision rules follow
// Issue #384's 2026-07-23 MINIMAL-MANIFEST re-ruling: **init installs only
// what a shipped check consumes.** The manifest is exactly six items —
// `vinaya.config.json` (starter ruleset, `checks: {}` empty), two `vinaya-`
// workflows, git-hook managed blocks, a root `VINAYA.md`
// doctrine pointer (reading-order convention), an empty `.vinaya/doc-owners`
// starter manifest (#665), and labels. Everything
// else the earlier amendment-4 manifest carried (GitHub templates, the
// governance/ scaffold, example check scripts) was this monorepo's own
// operational apparatus, not product surface — no shipped check consumes it,
// so it is cut from the installer.
//
// The starter ruleset seeded into `vinaya.config.json` is EXTRACTED from this
// repo's own battle-tested gates, not invented blanks — the failure it
// kills is blank-config paralysis.

import { DOC_OWNERS_PATH, label } from '@atta/aeg-core'
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
// Root VINAYA.md — the doctrine pointer. Root placement is the whole point
// (reading-order convention): an agent orienting in a fresh repo finds it
// beside README, not buried inside a governance/ subfolder.
export const DOCTRINE_POINTER_PATH = 'VINAYA.md'
export const CHECKS_WORKFLOW_PATH = '.github/workflows/vinaya-checks.yml'
export const REVIEW_WORKFLOW_PATH = '.github/workflows/vinaya-review.yml'

const MANAGED_NOTE =
  'Managed by Vinaya — created by `vinaya init`. `vinaya upgrade` regenerates it; `vinaya eject` removes it.'

// ---------------------------------------------------------------------------
// Starter ruleset — the seed for vinaya.config.json (no `managed`; the
// installer injects the ownership manifest after applying every op).
// ---------------------------------------------------------------------------
export function starterConfig(): VinayaConfig {
  return {
    // Ring 1 (forge-write interception) and Ring 2 (async audits) are opt-in
    // accelerators, off by default. Ring 0 (git hooks) and the CI
    // guarantee are non-negotiable and deliberately absent from the schema.
    rings: { ring1_forgeWriteInterception: false, ring2_asyncAudits: false },
    // `checks` starts EMPTY (2026-07-23 minimal-manifest re-ruling). init
    // ships no example checks and no example scripts: a starter config that
    // registered example `checks` was the only thing those scripts backed, and
    // init installs only what a shipped check consumes. `vinaya new check` is
    // the add-path for an adopter's first custom check.
    checks: {},
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
// Workflow files (two, both refuse-if-foreign, both vinaya-prefixed)
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
        run: npx --yes @attalabs/vinaya check --all --diff-only
`
}

function reviewWorkflow(): string {
  return `# ${MANAGED_NOTE}
#
# The review gate — split from the checks suite so a verdict *comment*
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
        run: npx --yes @attalabs/vinaya check --all
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
// Doctrine pointer (root VINAYA.md, the only orientation artifact)
// ---------------------------------------------------------------------------
function doctrinePointer(): string {
  return `<!-- ${MANAGED_NOTE} -->
# Vinaya doctrine — read this first

This repo is governed by Vinaya. The full, canonical doctrine (roles,
contracts, the state machine, the ring gates) currently lives in the
\`attalabs\` monorepo's \`aeg-root/\` (public GitHub source) — bundling it into
the installed \`vinaya\` npm package, so it ships and updates cleanly via
\`vinaya upgrade\` with no in-repo copy to drift, is planned but not yet
shipped.

An agent working in this repo follows the governed flow by reading two things:

1. **This pointer** — the tool-agnostic entry point at the conventional
   reading-order path (repo root). It names where the doctrine lives.
2. **\`${CONFIG_PATH}\`** — the ruleset the gates enforce: rings, custom checks,
   and the brief schema a PR/Issue body must satisfy.

Live task status is derived from the forge (Issues, labels, comments) via
\`vinaya check\` — it is never written into a file here.

To view the doctrine text today: read \`aeg-root/\` in the \`attalabs\`
monorepo; \`vinaya doctor\` reports what is installed in this repo. Once
in-package bundling ships, the package's own reference content becomes the
source of truth.
`
}

// ---------------------------------------------------------------------------
// Doc-ownership manifest (root .vinaya/doc-owners) — the starter for the C5
// coherence seam. Grammar reproduced from this monorepo's own doc-owners
// header (format line, glob syntax, pointer forms, coverage rule, no-doc
// escape hatch, dormancy note) so an adopter learns the file by reading it.
// Ships with zero real bindings — an adopter's bindings are theirs to add.
// ---------------------------------------------------------------------------
function starterDocOwners(): string {
  return `# ${MANAGED_NOTE}
#
# ${DOC_OWNERS_PATH} — code → doc bindings for the coherence seam.
#
# Format: one binding per line, CODEOWNERS-shaped.
#     <code-glob>  <doc-pointer>
# Whitespace-separated. Lines starting with \`#\` and blank lines are ignored.
#
# Glob syntax (kept deliberately simple — no character classes):
#   \`**\`  matches any sequence (including \`/\`)
#   \`*\`   matches any sequence not containing \`/\`
#   every other character is literal — so dynamic-route segments like
#   \`[username]\` match literally, no escaping required.
#
# Pointer forms:
#   in-repo path             e.g. \`docs/my-feature.md\`
#   in-repo path with anchor e.g. \`docs/my-feature.md#section-2\`
#   URL                      e.g. \`https://example.com/docs/x\`
#
# Coverage rule (enforced by C5, the doc-owners check bundled into \`vinaya check\`):
#   When a code file in the PR matches a glob:
#     - in-repo pointer  → that path must appear in the PR diff, else FAIL
#     - URL pointer      → require a \`Doc-ack: <pointer> — <note>\` PR-body line
#     - dangling pointer → in-repo pointer that does not exist on disk: FAIL
#   Escape:
#     A PR-wide \`vinaya/waiver:docs\` label whose labeling timeline event's
#     actor is a configured principal suppresses every fired binding for that
#     PR — a forge-authenticated human act, never a parseable string. There is
#     no PR-body waiver field; label presence alone is never sufficient.
#
# Dormancy:
#   This file absent, OR no glob matches any changed code file → silent no-op.
#   The gate has no opinion until you teach it one.
#
# ── No-doc allow-list ───────────────────────────────────────────────────────
# Surfaces that legitimately need no bound doc are listed below. Format:
#   # no-doc: <glob> — <reason>
# These lines exempt the matching directory from the completeness scoreboard
# (\`vinaya check\`'s advisory output). They do NOT affect C5 enforcement — if a
# binding exists for a surface, C5 still fires on changed files regardless of
# any no-doc line. Use no-doc for scaffold-only, config-only, or stub-only
# surfaces where adding a doc-owners binding would be meaningless busywork.
# To un-exempt a surface, remove its no-doc line and add a real binding.
#
# This starter ships empty — no bindings, no no-doc entries. Add your own
# below this line as your repo grows real code → doc coverage needs.
`
}

// ---------------------------------------------------------------------------
// Labels — create-if-absent, existing never modified (amendment-4 manifest).
// The names come from the code-owned vocabulary (`@atta/aeg-core`'s re-exported
// `LABELS`), never written here as literals, so an adopter's repo is seeded
// with exactly the namespaced set this repo runs on. Only the
// tier + needs families are installed: no tier:2 (vestigial), no status:*
// (status is derived), no project:* (project is a body field).
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
    mk(label('tier-0'), 'ededed', 'Trivial / mechanical change'),
    mk(label('tier-1'), 'c5def5', 'Standard task — code + tests + docs'),
    mk(label('tier-3'), 'd93f0b', 'Records a decision; ratification-gated'),
    mk(label('needs-execution-input'), 'fbca04', 'Blocked on a missing execution detail'),
    mk(label('needs-strategy-input'), 'fbca04', 'Blocked on a strategy/approach decision'),
    mk(label('needs-principal-input'), 'b60205', 'Blocked on a Principal decision')
  ]
}

const BRANCH_PROTECTION_NOTE = `Recommended (run yourself — vinaya never applies branch protection):

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

  // Doctrine pointer — root VINAYA.md, the only orientation artifact.
  ops.push({
    kind: 'create-file',
    path: DOCTRINE_POINTER_PATH,
    content: doctrinePointer(),
    group: 'Doctrine pointer'
  })

  // Doc-ownership manifest — root .vinaya/doc-owners starter.
  ops.push({
    kind: 'create-file',
    path: DOC_OWNERS_PATH,
    content: starterDocOwners(),
    group: 'Doc-ownership manifest'
  })

  // Labels.
  ops.push(...labelOps())

  // Branch protection — printed only, never applied.
  ops.push({ kind: 'print', message: BRANCH_PROTECTION_NOTE, group: 'Branch protection (printed, never applied)' })

  return ops
}

/**
 * The change-set for `vinaya init product <name>` — a new governed area.
 * Per the 2026-07-23 minimal-manifest re-ruling this shrinks to a single
 * `project:<name>` label (create-if-absent): the governance/ scaffold the old
 * op-list wrote (a `projects.md` row + a per-product decision record) is cut with
 * the rest of the governance folder — no shipped check consumes it.
 */
export function buildInitProductOps(name: string): Op[] {
  const safe = name.trim()
  return [
    {
      kind: 'create-label',
      name: `project:${safe}`,
      color: '0e8a16',
      description: `Governed product area: ${safe}`,
      group: `Governed product area: ${safe}`
    }
  ]
}

export { BRANCH_PROTECTION_NOTE }
