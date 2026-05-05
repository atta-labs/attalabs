#!/usr/bin/env bash
# PostToolUse hook for the `Skill` tool.
# Records every skill invocation into a per-session file so the
# check-skill.sh PreToolUse hook can verify required skills were read.
set -euo pipefail

input=$(cat)
session_id=$(printf '%s' "$input" | jq -r '.session_id // empty')
skill_name=$(printf '%s' "$input" | jq -r '.tool_input.skill // empty')

if [[ -z "$session_id" || -z "$skill_name" ]]; then
  exit 0
fi

state_dir="${TMPDIR:-/tmp}"
state_file="${state_dir}/claude-skills-${session_id}.txt"

# Append the skill name (one per line). Dedup on read, not write.
printf '%s\n' "$skill_name" >> "$state_file"
exit 0
