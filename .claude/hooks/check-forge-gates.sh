#!/usr/bin/env bash
# PreToolUse hook for Bash (D-078) — the tool-layer forge gate.
#
# DENIES any raw command that would create or body-edit a PR or Issue,
# directing the agent to the validated wrappers instead:
#   gh pr create / gh pr edit --body*        → packages/aeg-core/bin/open-pr.ts
#   gh issue create / gh issue edit --body*  → packages/aeg-core/bin/open-issue.ts
#   gh api POST to /pulls or /issues         → same wrappers
#
# The wrappers run the identical deterministic contract gates that CI runs
# (verify-brief, verify-docs --pr, closes-n, issue rationale) LOCALLY and only
# call `gh` on green. This is prevention, not detection: a malformed artifact
# can never reach the forge — the agent's command is refused, the exact errors
# are fed back into its session, it fixes the body and retries. Same principle
# as husky + commitlint for commits, applied to forge writes.
#
# Read-only and non-body gh commands (view, list, comment, merge, label edits,
# close, reopen, checks, diff, …) are untouched.
set -euo pipefail

input=$(cat)
command=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')

# Not a Bash command payload — allow.
if [[ -z "$command" ]]; then
  exit 0
fi

deny() {
  local reason="$1"
  jq -n --arg reason "$reason" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $reason
    }
  }'
  exit 0
}

# --- PR creation ------------------------------------------------------------
if printf '%s' "$command" | grep -qE '\bgh[[:space:]]+pr[[:space:]]+create\b'; then
  deny "Forge gate (D-078): raw \`gh pr create\` is not allowed — the PR body must pass the deterministic contract gates BEFORE anything reaches the forge. Use the validated wrapper instead (same args, plus a --body-file):

  bun packages/aeg-core/bin/open-pr.ts --title \"...\" --body-file /path/to/body.md [other gh args]

It runs verify-brief + verify-docs --pr + the Closes #N gate locally and only calls gh on green. On failure it prints the exact missing sections — fix the body file and rerun."
fi

# --- PR body edits ----------------------------------------------------------
if printf '%s' "$command" | grep -qE '\bgh[[:space:]]+pr[[:space:]]+edit\b' \
  && printf '%s' "$command" | grep -qE '(--body|--body-file|--title|[[:space:]]-b[[:space:]]|[[:space:]]-F[[:space:]]|[[:space:]]-t[[:space:]])'; then
  deny "Forge gate (D-078): raw \`gh pr edit\` with a body or title change is not allowed — edited bodies re-pass the contract gates and titles the title grammar. Use:

  bun packages/aeg-core/bin/open-pr.ts edit <n> [--body-file /path/to/body.md] [--title \"...\"]"
fi

# --- Issue creation ---------------------------------------------------------
if printf '%s' "$command" | grep -qE '\bgh[[:space:]]+issue[[:space:]]+create\b'; then
  deny "Forge gate (D-078): raw \`gh issue create\` is not allowed — a task Issue (iteration:* label) must carry the full eight-field Planner rationale, validated BEFORE it reaches the forge. Use the validated wrapper instead (same args):

  bun packages/aeg-core/bin/open-issue.ts --title \"...\" --body-file /path/to/body.md --label iteration:<slug> [other gh args]

Non-task Issues (no iteration label) pass straight through the wrapper unvalidated."
fi

# --- Issue body edits -------------------------------------------------------
if printf '%s' "$command" | grep -qE '\bgh[[:space:]]+issue[[:space:]]+edit\b' \
  && printf '%s' "$command" | grep -qE '(--body|--body-file|--title|[[:space:]]-b[[:space:]]|[[:space:]]-F[[:space:]]|[[:space:]]-t[[:space:]])'; then
  deny "Forge gate (D-078): raw \`gh issue edit\` with a body or title change is not allowed — edits re-pass the rationale/title gates. Use:

  bun packages/aeg-core/bin/open-issue.ts edit <n> [--body-file /path/to/body.md] [--title \"...\"]"
fi

# NOTE (#614): the label names below are re-stated as literals because a bash
# hook cannot import `packages/aeg-forge-state/src/labels.ts`. They are the one
# sanctioned duplication of the code-owned vocabulary, and they must be updated
# with it — a follow-up could generate a constants file from `LABELS` and source
# it here, which would remove the duplication entirely.
# --- Waiver-label mutation (D-097, extended to vinaya/waiver:review by
# aeg-review-gate-v1 task 1/#474) ---------------------------------------------
# `vinaya/waiver:docs`/`vinaya/waiver:review` are the ONLY ways a C5 doc-coverage finding or
# the pre-merge review gate are ever honored as waived — CI verifies the
# ACTOR of that label's own labeling timeline event against a principal
# allowlist. But a local agent session shares the Principal's own `gh` PAT,
# so actor verification alone is spoofable at this layer: an agent applying
# the label would inherit the Principal's identity on the labeling event,
# defeating the whole point (live-fire proof, aeg-review-gate-v1 task 1: an
# agent session applying `vinaya/waiver:review` via `gh pr edit` unblocked the gate
# before this extension existed). This block denies ANY command mutating
# `vinaya/waiver:docs` OR `vinaya/waiver:review` specifically, from an agent session —
# every OTHER label mutation stays covered by the general exemption noted
# above.
if printf '%s' "$command" | grep -qE '\bgh[[:space:]]+(pr|issue)[[:space:]]+edit\b' \
  && printf '%s' "$command" | grep -qE '(--add-label|--remove-label)\b' \
  && printf '%s' "$command" | grep -qiE 'vinaya/waiver:docs|vinaya/waiver:review'; then
  deny "Forge gate (D-097): mutating the \`vinaya/waiver:docs\`/\`vinaya/waiver:review\` labels is not allowed from an agent session — a waiver is a forge-authenticated human act, and a local agent acts with the Principal's own \`gh\` credential, so actor verification alone would be spoofable here. Only the Principal, outside an agent session, may apply or remove these labels. Every other label is unaffected by this gate."
fi

if printf '%s' "$command" | grep -qE '\bgh[[:space:]]+api\b' \
  && printf '%s' "$command" | grep -qE '/(issues|pulls)/[0-9]+/labels' \
  && printf '%s' "$command" | grep -qiE 'vinaya/waiver:docs|vinaya%2Fwaiver%3Adocs|vinaya/waiver:review|vinaya%2Fwaiver%3Areview'; then
  deny "Forge gate (D-097): mutating the \`vinaya/waiver:docs\`/\`vinaya/waiver:review\` labels via raw \`gh api\` is not allowed from an agent session — see the \`gh pr/issue edit\` deny message above for why. Only the Principal, outside an agent session, may apply or remove these labels."
fi

# GraphQL label mutations (`addLabelsToLabelable`/`removeLabelsFromLabelable`)
# take an opaque label NODE ID, not a name — a two-step bypass (read-call
# resolves the label's node ID via a `label(name: ...)` lookup, a second
# call mutates by that ID alone) would never contain the literal label name
# in the mutating command, so a text-scoped match on that string is not a
# reliable gate here the way it is for `gh pr/issue edit` (label names) and
# the REST endpoint above (also label names). Denied UNCONDITIONALLY
# instead — every raw GraphQL label mutation, regardless of which label —
# since a static single-command grep cannot distinguish a waiver label's
# node ID from any other. The sanctioned path for every OTHER label stays
# `gh pr/issue edit --add-label`/`--remove-label` (name-based, untouched
# above), so this does not remove any legitimate path — raw GraphQL label
# mutations were never the sanctioned mechanism for anything.
if printf '%s' "$command" | grep -qE '\bgh[[:space:]]+api[[:space:]]+graphql\b' \
  && printf '%s' "$command" | grep -qE '(addLabelsToLabelable|removeLabelsFromLabelable)'; then
  deny "Forge gate (D-097): mutating labels via a raw GraphQL label mutation is not allowed from an agent session — these mutations resolve labels by opaque node ID, so a static command-text check cannot reliably tell a \`vinaya/waiver:docs\`/\`vinaya/waiver:review\` mutation apart from any other (a two-step 'look up the ID, then mutate by ID' pattern would otherwise bypass a text-based check entirely). Use \`gh pr edit --add-label <name>\` / \`gh issue edit --add-label <name>\` instead — denied separately, only when the label is \`vinaya/waiver:docs\` or \`vinaya/waiver:review\`."
fi

# --- gh api bypass attempts --------------------------------------------------
# POST to .../pulls or .../issues (creation endpoints). Comments/labels
# endpoints (/issues/N/comments, /issues/N/labels) are NOT matched — those are
# sanctioned append operations (provenance, verdicts, rationale comments).
if printf '%s' "$command" | grep -qE '\bgh[[:space:]]+api\b' \
  && printf '%s' "$command" | grep -qE '(-X[[:space:]]*POST|--method[[:space:]]*POST|[[:space:]]-f[[:space:]]|[[:space:]]-F[[:space:]])' \
  && printf '%s' "$command" | grep -qE '(/pulls|/issues)(["'"'"'[:space:]]|$)'; then
  deny "Forge gate (D-078): creating PRs/Issues via raw \`gh api\` bypasses the contract gates. Use the validated wrappers: packages/aeg-core/bin/open-pr.ts / open-issue.ts."
fi

# PATCH to .../pulls/N or .../issues/N (edit endpoints) — a body/title edit via
# raw API bypasses the wrappers exactly like the create case. Sub-resources
# (/comments, /labels) keep their trailing path segment and are not matched.
if printf '%s' "$command" | grep -qE '\bgh[[:space:]]+api\b' \
  && printf '%s' "$command" | grep -qE '(-X[[:space:]]*PATCH|--method[[:space:]]*PATCH)' \
  && printf '%s' "$command" | grep -qE '(/pulls|/issues)/[0-9]+(["'"'"'[:space:]]|$)'; then
  deny "Forge gate (D-078): editing PRs/Issues via raw \`gh api -X PATCH\` bypasses the contract gates. Use the validated wrappers: packages/aeg-core/bin/open-pr.ts edit <n> / open-issue.ts edit <n>."
fi

# --- curl/wget bypass attempts ------------------------------------------------
# Any write-method HTTP call straight at the GitHub API's pulls/issues
# endpoints. Read (GET) calls are untouched.
if printf '%s' "$command" | grep -qE '\b(curl|wget)\b' \
  && printf '%s' "$command" | grep -qE 'api\.github\.com' \
  && printf '%s' "$command" | grep -qE '(/pulls|/issues)' \
  && printf '%s' "$command" | grep -qE '(-X[[:space:]]*(POST|PATCH|PUT)|--method[[:space:]]*(POST|PATCH|PUT)|--data\b|[[:space:]]-d[[:space:]]|--json\b|--post-data)'; then
  deny "Forge gate (D-078): writing to PRs/Issues via raw curl/wget bypasses the contract gates. Use the validated wrappers: packages/aeg-core/bin/open-pr.ts / open-issue.ts."
fi

exit 0
