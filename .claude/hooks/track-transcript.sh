#!/usr/bin/env bash
# Stop hook — records the current session's transcript_path so a finishing
# role can hand it to `@attalabs/aeg-core`'s `report-tokens.ts` without a
# newest-file scan across `~/.claude/projects/<slug>/` (that scan silently
# grabs another concurrent session's transcript when two worktrees are
# active at once — misc-hardening-v1 task 1, #675).
#
# Keyed by CLAUDE_PROJECT_DIR, not session_id: the reporter runs from a bare
# Bash tool call, which has no way to know its own session_id (only hooks
# receive that, via stdin JSON). CLAUDE_PROJECT_DIR is already the harness's
# own per-worktree identity — check-skill.sh relies on the same fact — so
# concurrent sessions in different worktrees never collide on this file.
set -euo pipefail

input=$(cat)
transcript_path=$(printf '%s' "$input" | jq -r '.transcript_path // empty')
session_id=$(printf '%s' "$input" | jq -r '.session_id // empty')

if [[ -z "$transcript_path" ]]; then
  exit 0
fi

repo_root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
# `tr -c ... '-'` maps each non-alnum char individually — a run like the
# `/.` in `.../attalabs/.worktrees/...` becomes `--`, not `-`. Squeeze with
# a second `tr -s '-'` so this matches `report-tokens.ts`'s
# `sanitizeKey`'s regex, which collapses a whole run in one step
# (`[^A-Za-z0-9]+`) — confirmed live: the two diverged on a worktree path
# and the reporter couldn't find the pointer file this hook wrote.
key=$(printf '%s' "$repo_root" | tr -c 'A-Za-z0-9' '-' | tr -s '-')
state_file="${TMPDIR:-/tmp}/claude-transcript-${key}.txt"

printf '%s\t%s\n' "$session_id" "$transcript_path" > "$state_file"
exit 0
