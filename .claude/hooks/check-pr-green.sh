#!/usr/bin/env bash
# PreToolUse merge-gate hook.
#
# Intercepts every agent path that can MERGE a pull request and BLOCKS it unless
# the PR's checks are all green (`gh pr checks <n>` exits 0). The repository
# ruleset's `required_status_checks` rule now blocks a red merge for every actor
# too — this hook is defense-in-depth ahead of that forge-side gate, not a
# substitute for a missing one: it denies the merge attempt itself, before the
# API call the ruleset would otherwise reject.
#
# Intercepted merge paths:
#   - Bash:  `gh pr merge [<n>]`, `gh api … /pulls/<n>/merge`, `curl … /pulls/<n>/merge`
#   - MCP :  merge_pull_request tools (GitHub MCP + the a4f816ff… server) via `.tool_input.pullNumber`
#
# FAIL CLOSED: if greenness cannot be proven (PR number unresolvable, gh missing,
# checks non-zero), the merge is DENIED. Read-only `gh` (pr view/checks/list) is
# never a merge path → always allowed.
#
# Deny mechanism mirrors check-skill.sh: emit a PreToolUse hookSpecificOutput JSON
# with permissionDecision "deny" + a reason, then `exit 0`.
set -euo pipefail

input=$(cat)

tool_name=$(printf '%s' "$input" | jq -r '.tool_name // empty')
raw_command=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')

# Resolve repo root. Prefer an explicit `cd <path>` in the command itself —
# a session's PROJECT_DIR is fixed to wherever it started, but a merge
# command can legitimately target ANY repo the agent `cd`'d into first (a
# different local clone, a worktree elsewhere). Blindly using
# CLAUDE_PROJECT_DIR made this gate check the wrong repo's PR list for any
# such command and fail closed with a bogus "PR not found" — found live:
# `cd .../vinaya && gh pr merge 167` denied because this hook ran
# `gh pr checks 167` against attalabs, which has no PR #167. Falls back to
# CLAUDE_PROJECT_DIR (then this script's own repo) exactly as before when no
# `cd` is present, or when it names a path that doesn't exist.
#
# Use the LAST `cd <path>` in the command, not the first: a `&&`/`;`-chained
# command's real final working directory is whichever `cd` ran last, and
# matching only the first `cd` let `cd /decoy && cd /target && gh pr merge N`
# resolve repo_root to /decoy — checking a different repo's CI status than
# the one the merge actually targets. Delimiters excluded from a captured
# path are `&`/`;` (the two chain operators this parses) — a path itself is
# never expected to contain either.
repo_root=""
if [[ -n "$raw_command" ]]; then
  cd_path=""
  while IFS= read -r match; do
    cd_path="$match"
  done < <(printf '%s' "$raw_command" | grep -oE '(^|&&|;)[[:space:]]*cd[[:space:]]+[^&;]+' | sed -E 's/^(&&|;)?[[:space:]]*cd[[:space:]]+//')
  if [[ -n "$cd_path" ]]; then
    # Trim trailing whitespace BEFORE stripping quotes: for `cd "/path" && ...`
    # the captured segment includes the space between the closing quote and
    # `&&`, so a trailing-quote strip run before this trim never matches —
    # every quoted `cd` (the idiomatic form) silently fell back to the old,
    # unpatched repo-root resolution.
    cd_path="$(printf '%s' "$cd_path" | sed -e 's/[[:space:]]*$//')"
    cd_path="${cd_path%\"}"
    cd_path="${cd_path#\"}"
    cd_path="${cd_path%\'}"
    cd_path="${cd_path#\'}"
    if [[ -n "$cd_path" && -d "$cd_path" ]]; then
      repo_root="$cd_path"
    fi
  fi
fi
repo_root="${repo_root:-${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}}"

# ---- deny helper -----------------------------------------------------------
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

# ---- greenness gate --------------------------------------------------------
# Given a PR number, allow (exit 0) iff `gh pr checks <n>` is all-green; otherwise
# DENY. `gh pr checks` exit codes: 0 = all pass, 1 = at least one failing,
# 8 = at least one pending. Treat ANY non-zero as "not green" (pending ≠ green).
gate_on_pr() {
  local pr="$1"

  if ! command -v gh >/dev/null 2>&1; then
    deny "Merge blocked: \`gh\` is not available to the merge-gate hook, so PR #${pr}'s green status cannot be verified. The gate fails closed (no merge without proof of green). See .claude/hooks/check-pr-green.sh."
  fi

  local checks_output rc
  set +e
  checks_output=$(cd "$repo_root" && gh pr checks "$pr" 2>&1)
  rc=$?
  set -e

  if [[ $rc -eq 0 ]]; then
    # All checks green — allow the merge to proceed.
    exit 0
  fi

  local status_word
  case $rc in
    8) status_word="pending (not yet green)" ;;
    1) status_word="failing" ;;
    *) status_word="not green (gh pr checks exit ${rc})" ;;
  esac

  deny "Merge blocked: PR #${pr} checks are ${status_word}. A PR may only be merged when \`gh pr checks ${pr}\` is all-green (exit 0). Wait for checks to pass, or fix the failing checks, then retry.

gh pr checks ${pr} output:
${checks_output}"
}

# ---- MCP merge tools -------------------------------------------------------
# Any merge_pull_request tool (GitHub MCP or the a4f816ff… server) carries the PR
# number in .tool_input.pullNumber.
if [[ "$tool_name" == *merge_pull_request* ]]; then
  pr=$(printf '%s' "$input" | jq -r '.tool_input.pullNumber // empty')
  if [[ -z "$pr" || ! "$pr" =~ ^[0-9]+$ ]]; then
    deny "Merge blocked: the MCP merge tool (${tool_name}) did not carry a resolvable \`pullNumber\`, so green status cannot be verified. The gate fails closed. Supply an explicit pullNumber."
  fi
  gate_on_pr "$pr"
fi

# ---- Bash merge commands ---------------------------------------------------
if [[ "$tool_name" == "Bash" ]]; then
  command="$raw_command"
  [[ -z "$command" ]] && exit 0

  # Lowercase copy for case-insensitive matching.
  lc=$(printf '%s' "$command" | tr '[:upper:]' '[:lower:]')

  # Is this a merge path? Three shapes:
  #   1. `gh pr merge`
  #   2. `gh api …/pulls/<n>/merge`
  #   3. `curl …/pulls/<n>/merge`
  # Read-only `gh` (pr view / pr checks / pr list) is NOT a merge path → fall through to allow.
  is_merge=0
  if printf '%s' "$lc" | grep -Eq 'gh[[:space:]]+pr[[:space:]]+merge\b'; then
    is_merge=1
  elif printf '%s' "$lc" | grep -Eq '(gh[[:space:]]+api|curl)\b.*/pulls/[0-9]+/merge\b'; then
    is_merge=1
  fi

  if [[ $is_merge -eq 0 ]]; then
    exit 0
  fi

  # Resolve the PR number.
  pr=""
  # Form 2/3: explicit PR number in a `/pulls/<n>/merge` path.
  if [[ "$lc" =~ /pulls/([0-9]+)/merge ]]; then
    pr="${BASH_REMATCH[1]}"
  fi
  # Form 1: `gh pr merge <n>` — first bare integer after `merge`.
  if [[ -z "$pr" && "$lc" =~ gh[[:space:]]+pr[[:space:]]+merge([[:space:]]+[^[:space:]]+)* ]]; then
    # Scan tokens after `merge` for the first bare integer (skip flags / flag values).
    rest="${command#*[Mm]erge}"
    for tok in $rest; do
      if [[ "$tok" =~ ^[0-9]+$ ]]; then
        pr="$tok"
        break
      fi
    done
  fi

  # Implicit form: `gh pr merge` on the current branch → resolve via gh.
  if [[ -z "$pr" ]]; then
    if ! command -v gh >/dev/null 2>&1; then
      deny "Merge blocked: \`gh pr merge\` with no explicit PR number, and \`gh\` is unavailable to resolve the current branch's PR. The gate fails closed."
    fi
    set +e
    pr=$(cd "$repo_root" && gh pr view --json number -q .number 2>/dev/null)
    set -e
  fi

  if [[ -z "$pr" || ! "$pr" =~ ^[0-9]+$ ]]; then
    deny "Merge blocked: could not resolve a PR number for this merge command, so green status cannot be verified. The gate fails closed (no merge without proof of green). Pass an explicit PR number (e.g. \`gh pr merge <n>\`)."
  fi

  gate_on_pr "$pr"
fi

# Any other tool_name is not a merge path → allow.
exit 0
