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
  && printf '%s' "$command" | grep -qE '(--body|--body-file|[[:space:]]-b[[:space:]]|[[:space:]]-F[[:space:]])'; then
  deny "Forge gate (D-078): raw \`gh pr edit\` with a body change is not allowed — the edited body must re-pass the contract gates. Use:

  bun packages/aeg-core/bin/open-pr.ts edit <n> --body-file /path/to/body.md"
fi

# --- Issue creation ---------------------------------------------------------
if printf '%s' "$command" | grep -qE '\bgh[[:space:]]+issue[[:space:]]+create\b'; then
  deny "Forge gate (D-078): raw \`gh issue create\` is not allowed — a task Issue (iteration:* label) must carry the full eight-field Planner rationale, validated BEFORE it reaches the forge. Use the validated wrapper instead (same args):

  bun packages/aeg-core/bin/open-issue.ts --title \"...\" --body-file /path/to/body.md --label iteration:<slug> [other gh args]

Non-task Issues (no iteration label) pass straight through the wrapper unvalidated."
fi

# --- Issue body edits -------------------------------------------------------
if printf '%s' "$command" | grep -qE '\bgh[[:space:]]+issue[[:space:]]+edit\b' \
  && printf '%s' "$command" | grep -qE '(--body|--body-file|[[:space:]]-b[[:space:]]|[[:space:]]-F[[:space:]])'; then
  deny "Forge gate (D-078): raw \`gh issue edit\` with a body change is not allowed — the edited body must re-pass the rationale gate. Use:

  bun packages/aeg-core/bin/open-issue.ts edit <n> --body-file /path/to/body.md"
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

exit 0
