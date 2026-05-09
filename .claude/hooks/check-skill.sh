#!/usr/bin/env bash
# PreToolUse hook for Edit / Write / NotebookEdit.
# Reads path globs from each .claude/skills/<name>/paths.txt and
# BLOCKS the tool call until every matching skill has been invoked via the
# Skill tool in the current session (recorded by track-skill.sh).
#
# Source of truth = each skill's own paths.txt (one glob per line).
set -euo pipefail

input=$(cat)
session_id=$(printf '%s' "$input" | jq -r '.session_id // empty')
file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')

# If we can't determine the file path, don't block.
if [[ -z "$file_path" ]]; then
  exit 0
fi

# Resolve repo root. Prefer $CLAUDE_PROJECT_DIR (set by the harness — points to the
# active worktree's checkout), so the hook reads the SAME .claude/skills/ that the
# Skill tool's registry was built from. Falls back to the script's own location for
# the case where the hook runs outside the harness.
#
# Without this, when running in a worktree the hook reads main repo's skills (via
# the script's path) while the Skill tool reads the worktree's — divergence in
# `paths:` frontmatter creates a Catch-22 where the hook requires a skill that the
# Skill tool's registry doesn't recognize.
repo_root="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
skills_dir="$repo_root/.claude/skills"

if [[ ! -d "$skills_dir" ]]; then
  exit 0
fi

# Collect every skill whose paths.txt glob matches this file_path.
required=()
for skill_path in "$skills_dir"/*/; do
  skill_name=$(basename "$skill_path")
  skill_md="${skill_path}SKILL.md"
  [[ -f "$skill_md" ]] || continue

  # Read paths from the sibling paths.txt file (one glob per line; # comments OK).
  paths_file="${skill_path}paths.txt"
  if [[ -f "$paths_file" ]]; then
    paths=$(grep -v '^[[:space:]]*#' "$paths_file" | grep -v '^[[:space:]]*$' || true)
  else
    paths=""
  fi

  [[ -z "$paths" ]] && continue

  # For each glob, derive a substring prefix and check `contains` on file_path.
  # Glob conventions:
  #   "packages/ui/canvas/**" -> prefix "packages/ui/canvas/"
  #   "**/api/**"             -> prefix "/api/"
  #   "**/route.ts"           -> prefix "/route.ts"
  #   "packages/cms/seed-**"  -> prefix "packages/cms/seed-"
  while IFS= read -r p; do
    [[ -z "$p" ]] && continue
    prefix="${p%\*\*}"   # strip trailing **
    prefix="${prefix#\*\*}" # strip leading **
    [[ -z "$prefix" ]] && continue
    if [[ "$file_path" == *"$prefix"* ]]; then
      required+=("$skill_name")
      break
    fi
  done <<< "$paths"
done

if [[ ${#required[@]} -eq 0 ]]; then
  exit 0
fi

# Dedup
IFS=$'\n' required=($(printf '%s\n' "${required[@]}" | sort -u))
unset IFS

# Read invoked skills for this session.
state_file="${TMPDIR:-/tmp}/claude-skills-${session_id}.txt"
invoked=""
if [[ -r "$state_file" ]]; then
  invoked=$(sort -u "$state_file")
fi

# Find any required skill NOT yet invoked.
missing=()
for skill in "${required[@]}"; do
  if ! printf '%s\n' "$invoked" | grep -qx "$skill"; then
    missing+=("$skill")
  fi
done

if [[ ${#missing[@]} -eq 0 ]]; then
  exit 0
fi

missing_list=$(printf -- '- %s\n' "${missing[@]}")
template='STOP. Editing %s requires these project skills to be invoked first:

%s
Invoke the Skill tool for each one BEFORE retrying this edit.

After invoking: read each skill as the ARCHITECTURE for what you are about to do, not as a checklist of gotchas. The first section of each skill describes the system structure and invariants — those are the design anchors. Pattern-matching the topic without reading the existing architecture is how agents have wasted hours destroying working code in this repo. The skills under .claude/skills/ are the source of truth — do not skim, do not bypass.'
reason=$(printf "$template" "$file_path" "$missing_list")

jq -n --arg reason "$reason" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: $reason
  }
}'
exit 0
