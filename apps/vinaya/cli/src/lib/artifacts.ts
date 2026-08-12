// The install manifest, made concrete.
//
// Every artifact `vinaya init` writes into an adopter repo lives here as
// content + a typed `Op` (see lib/ops.ts). Naming and collision rules follow
// Issue #384's 2026-07-23 MINIMAL-MANIFEST re-ruling: **init installs only
// what a shipped check or ring-2 mechanism consumes.** The manifest is
// exactly six items — `vinaya.config.json` (starter ruleset, `checks: {}`
// empty), three `vinaya-` workflows (checks, review, and — since #761 —
// the archivist's ring-2 post-merge/scheduled jobs), git-hook managed
// blocks, a root `VINAYA.md` doctrine pointer (reading-order convention),
// an empty `.vinaya/doc-owners` starter manifest (#665), and labels.
// Everything else the earlier amendment-4 manifest carried (GitHub
// templates, the governance/ scaffold, example check scripts) was this
// monorepo's own operational apparatus, not product surface — no shipped
// check consumes it, so it is cut from the installer.
//
// The starter ruleset seeded into `vinaya.config.json` is EXTRACTED from this
// repo's own battle-tested gates, not invented blanks — the failure it
// kills is blank-config paralysis.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DOC_OWNERS_PATH, label } from '@atta/aeg-core'
import type { VinayaConfig } from './config.js'
import type { CreateLabelOp, Op } from './ops.js'
import { packageRoot } from './package-root.js'

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
export const REVIEW_VERDICT_WORKFLOW_PATH = '.github/workflows/vinaya-review-verdict.yml'
export const ARCHIVIST_WORKFLOW_PATH = '.github/workflows/vinaya-archivist.yml'

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
      pull-requests: read
      issues: read
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Run checks
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          PR_NUMBER: \${{ github.event.pull_request.number }}
          # PR_BODY is what makes test-plan/closes-n EVALUATE: neither check
          # fetches the body itself (both read \`process.env.PR_BODY\` only) —
          # without it they read "no body — nothing to check" and pass
          # vacuously regardless of the PR's real content, on every run.
          PR_BODY: \${{ github.event.pull_request.body }}
          BRANCH: \${{ github.head_ref }}
        run: npx --yes @attalabs/vinaya check --all --diff-only
`
}

function reviewWorkflow(): string {
  return `# ${MANAGED_NOTE}
#
# The required review gate — pull_request events only. The verdict-comment
# half lives in its own workflow (vinaya-review-verdict.yml): a new PR
# comment fires a different GitHub event that this pull_request-only
# workflow structurally cannot receive — and keeping the comment path in a
# separate FILE means this workflow's runs never list permanently-skipped
# comment jobs on the PR's checks panel. When a clean final verdict lands,
# the verdict workflow re-runs this one, so the required check below goes
# green natively with no manual rerun.
name: Vinaya Review Gate

on:
  pull_request:
    types: [opened, synchronize, reopened, labeled, unlabeled]

jobs:
  vinaya-review:
    name: vinaya review gate
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
      issues: read
    steps:
      - uses: actions/checkout@v4
        with:
          # This job executes repo content; don't leave the token in
          # .git/config for scripts to read.
          persist-credentials: false
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Review gate
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          # PR_NUMBER is what makes the review-gate check EVALUATE: without
          # it the adapter reads "no PR yet — local dev" and exits 0, and
          # the gate is green regardless of review state.
          PR_NUMBER: \${{ github.event.pull_request.number }}
          # Same PR_BODY gap as vinaya-checks.yml — this job also runs
          # \`check --all\` (test-plan/closes-n included), so it needs the
          # same wiring or those two checks pass vacuously here too.
          PR_BODY: \${{ github.event.pull_request.body }}
          BRANCH: \${{ github.head_ref }}
        run: npx --yes @attalabs/vinaya check --all
`
}

function reviewVerdictWorkflow(): string {
  return `# ${MANAGED_NOTE}
#
# The verdict-comment half of the review gate. A reviewer's verdict arrives
# as a PR comment (\`VERDICT: APPROVE\` / \`VERDICT: PASS\`), which fires
# GitHub's \`issue_comment\` event — an event the required pull_request
# workflow cannot receive. This workflow evaluates the gate on that comment
# and, when the evaluation is clean, RE-RUNS the required workflow so its
# check goes green natively with no manual rerun. (Writing check-run
# conclusions directly is no longer possible: GitHub's 2025-02-12 change
# restricts check-run updates to the owning workflow — re-running is the
# supported channel.)
#
# Privilege split, deliberate: \`evaluate\` checks out and executes repo
# content and therefore holds NO write permission; \`retrigger\` holds
# \`actions: write\` but checks out and executes nothing — its only inputs
# are the evaluator's outputs, resolved via \`gh pr view\` before any repo
# content ran. A malicious branch can at worst fail its own evaluation.
name: Vinaya Review Gate (on verdict)

on:
  issue_comment:
    types: [created]

jobs:
  evaluate:
    name: vinaya review gate (verdict check)
    if: github.event.issue.pull_request != null && contains(github.event.comment.body, 'VERDICT')
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
      issues: read
    outputs:
      branch: \${{ steps.pr.outputs.branch }}
    steps:
      # issue_comment payloads carry no PR head SHA/branch — resolve them
      # before checkout, and check out that exact commit (the event's default
      # ref is the repo's default branch, not the PR head).
      - name: Resolve PR head
        id: pr
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: |
          NUMBER="\${{ github.event.issue.number }}"
          BRANCH=$(gh pr view "$NUMBER" --repo "\${{ github.repository }}" --json headRefName -q .headRefName)
          SHA=$(gh pr view "$NUMBER" --repo "\${{ github.repository }}" --json headRefOid -q .headRefOid)
          echo "number=$NUMBER" >> "$GITHUB_OUTPUT"
          echo "branch=$BRANCH" >> "$GITHUB_OUTPUT"
          echo "sha=$SHA" >> "$GITHUB_OUTPUT"
      - uses: actions/checkout@v4
        with:
          ref: \${{ steps.pr.outputs.sha }}
          persist-credentials: false
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Review gate (verdict evaluation)
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          # Same wiring as the required workflow: PR_NUMBER is what makes
          # the adapter evaluate instead of no-op'ing as "local dev".
          PR_NUMBER: \${{ steps.pr.outputs.number }}
          BRANCH: \${{ steps.pr.outputs.branch }}
        run: npx --yes @attalabs/vinaya check review-gate

  # Executes nothing; consumes only the evaluator's outputs. Fires only on a
  # clean evaluation — a failed one leaves the standing red untouched.
  retrigger:
    name: vinaya review gate (retrigger)
    if: needs.evaluate.result == 'success'
    needs: evaluate
    runs-on: ubuntu-latest
    permissions:
      actions: write
    steps:
      - name: Re-run the required review gate for this branch
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          BRANCH: \${{ needs.evaluate.outputs.branch }}
        run: |
          RUN_ID=$(gh run list --repo "\${{ github.repository }}" \\
            --workflow vinaya-review.yml --branch "$BRANCH" \\
            --status completed \\
            --json databaseId,event \\
            --jq '[.[] | select(.event=="pull_request")][0].databaseId // empty')
          if [ -z "$RUN_ID" ]; then
            echo "No completed pull_request run of vinaya-review.yml for branch $BRANCH - nothing to re-run."
            exit 0
          fi
          gh run rerun "$RUN_ID" --repo "\${{ github.repository }}"
`
}

// The ring-2 post-merge/scheduled mechanisms — same three-job shape as this
// monorepo's own live `.github/workflows/archivist.yml` (triggers,
// permissions, `continue-on-error` on the drift job), calling `vinaya
// archive`/`vinaya audit` instead of a repo-internal `bun packages/aeg-core/
// bin/*.ts` invocation, so any vinaya-init'd repo gets the same post-merge
// provenance/close-out, dead-branch drift notification, and direct-main-push
// detection — not just this one.
function archivistWorkflow(): string {
  return `# ${MANAGED_NOTE}
#
# The ring-2 post-merge/scheduled mechanisms: per-task Archivist provenance
# + close-out (post-merge), dead-branch-push drift (daily-drift, a
# notification channel — never fails red), and direct-main-push detection
# (direct-main-push-detection, a real pass/fail).
name: Vinaya Archivist

on:
  push:
    branches: [main]
  schedule:
    - cron: "0 2 * * *"  # daily at 02:00 UTC
  workflow_dispatch:

jobs:
  post-merge:
    name: Post-Merge Archivist
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Run vinaya archive
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: npx --yes @attalabs/vinaya archive --merge-sha=\${{ github.sha }}

  daily-drift:
    name: Daily Drift Check (dead-branch pushes)
    if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Run vinaya audit --only=dead-branches
        continue-on-error: true # never-red — this job is a notification channel, not a gate
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: npx --yes @attalabs/vinaya audit --only=dead-branches

  direct-main-push-detection:
    name: Direct-Main-Push Detection
    if: (github.event_name == 'push' && github.ref == 'refs/heads/main') || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write
      pull-requests: read
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Run vinaya audit --only=direct-push
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: npx --yes @attalabs/vinaya audit --only=direct-push --sha=\${{ github.sha }}
`
}

// ---------------------------------------------------------------------------
// Git-hook stubs — thin, marker-delimited, invoke the vinaya binary ONLY
// (never inline check logic, never path into any repo-internal bin).
//
// `npx --yes @attalabs/vinaya@<exact-version>`, NOT `--no-install` bare:
// npx's cache is keyed by the invoked spec, and a cache entry written by
// `npx @attalabs/vinaya init` (bare or `@latest`) does NOT satisfy a later
// `--no-install @attalabs/vinaya` lookup — reproduced live 2026-08-09: on
// any machine that never ran the exact spec, the very first commit after
// init died with npx's non-interactive "canceled due to missing packages
// and no YES option". The exact-version pin makes the cache key stable
// (one download at most, offline afterwards) and pins the gate's version
// to the installer that wrote the hook; `vinaya upgrade` re-pins it.
// ---------------------------------------------------------------------------
const HOOK_PREAMBLE = '#!/usr/bin/env sh\n'

/** This installed package's own version — the hook pins to it. */
function ownVersion(): string {
  const pkg = JSON.parse(readFileSync(join(packageRoot(import.meta.url), 'package.json'), 'utf-8')) as {
    version: string
  }
  return pkg.version
}

// `--local` skips every `requiresOpenPr` check (closes-n, test-plan): neither
// hook can ever satisfy them — a PR doesn't exist yet at commit time, and
// pushing the branch is what makes one *possible*, not what creates it. CI's
// `vinaya-checks.yml` runs on the `pull_request` event and omits `--local`,
// so both checks run for real, against the real PR body, once one exists.
function preCommitBody(): string {
  return `# Vinaya commit-time gate. Runs the deterministic checks over your staged
# diff before the commit lands.
npx --yes @attalabs/vinaya@${ownVersion()} check --all --diff-only --local || exit 1`
}

function prePushBody(): string {
  return `# Vinaya pre-push gate. Runs branch/dispatch checks before the push leaves.
npx --yes @attalabs/vinaya@${ownVersion()} check --all --local || exit 1`
}

// ---------------------------------------------------------------------------
// Doctrine pointer (root VINAYA.md, the only orientation artifact)
// ---------------------------------------------------------------------------
function doctrinePointer(): string {
  const doctrineRoot = join(packageRoot(import.meta.url), 'aeg-root')
  return `<!-- ${MANAGED_NOTE} -->
# Vinaya doctrine — read this first

This repo is governed by Vinaya. The full, canonical doctrine (roles,
contracts, the state machine, the ring gates) ships inside the installed
\`@attalabs/vinaya\` npm package itself — no in-repo copy to drift, and
\`vinaya upgrade\` regenerates this pointer if the install location changes.

An agent working in this repo follows the governed flow by reading two things:

1. **This pointer** — the tool-agnostic entry point at the conventional
   reading-order path (repo root). It names where the doctrine lives.
   Start at \`${doctrineRoot}/skills/aeg/SKILL.md\` — the doctrine's own
   front door, read first every session regardless of role.
2. **\`${CONFIG_PATH}\`** — the ruleset the gates enforce: rings, custom checks,
   and the brief schema a PR/Issue body must satisfy.

Live task status is derived from the forge (Issues, labels, comments) via
\`vinaya check\` — it is never written into a file here.

To read the doctrine text, it is bundled at this install's own resolved
path:

    ${doctrineRoot}

\`vinaya doctor\` reports what is installed in this repo.
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
  ops.push({
    kind: 'create-file',
    path: REVIEW_VERDICT_WORKFLOW_PATH,
    content: reviewVerdictWorkflow(),
    group: 'CI workflows'
  })
  ops.push({ kind: 'create-file', path: ARCHIVIST_WORKFLOW_PATH, content: archivistWorkflow(), group: 'CI workflows' })

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
 * Per the 2026-07-23 minimal-manifest re-ruling this shrank to a single
 * `project:<name>` label (create-if-absent): the governance/ scaffold the old
 * op-list wrote (a per-product decision record + the rest of the governance
 * folder) is cut — no shipped check consumed it. The `.vinaya/projects.md`
 * row is back, though, as a SEPARATE write (`lib/registry-write.ts`, called
 * from `runInitProduct` in `commands/init.ts`, not modeled as an `Op` here):
 * Vinaya Studio's tranche board started reading it (#829) — a shipped
 * consumer, distinct from a "check", which the
 * 2026-07-23 premise didn't anticipate.
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
