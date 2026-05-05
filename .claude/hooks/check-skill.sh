#!/usr/bin/env bash
# PreToolUse hook for Edit / Write / NotebookEdit.
# Reads paths: globs from each .claude/skills/<name>/SKILL.md frontmatter and
# BLOCKS the tool call until every matching skill has been invoked via the
# Skill tool in the current session (recorded by track-skill.sh).
#
# Source of truth = each skill's own SKILL.md (single file describes itself).
set -euo pipefail

input=$(cat)
session_id=$(printf '%s' "$input" | jq -r '.session_id // empty')
file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')

# If we can't determine the file path, don't block.
if [[ -z "$file_path" ]]; then
  exit 0
fi

# Resolve repo root from this script's location: <repo>/.claude/hooks/check-skill.sh
script_dir=$(cd "$(dirname "$0")" && pwd)
repo_root=$(cd "$script_dir/../.." && pwd)
skills_dir="$repo_root/.claude/skills"

if [[ ! -d "$skills_dir" ]]; then
  exit 0
fi

# Collect every skill whose paths: frontmatter glob matches this file_path.
required=()
for skill_path in "$skills_dir"/*/; do
  skill_name=$(basename "$skill_path")
  skill_md="${skill_path}SKILL.md"
  [[ -f "$skill_md" ]] || continue

  # Extract `paths:` block from YAML frontmatter (between the first two ---).
  # Lists of `  - "..."` lines; stop on first non-indented line.
  paths=$(awk '
    /^---$/ { c++; if (c == 2) exit; next }
    c == 1 {
      if (/^paths:[[:space:]]*$/) { in_paths = 1; next }
      if (in_paths) {
        if (/^[[:space:]]+-[[:space:]]+/) {
          line = $0
          sub(/^[[:space:]]+-[[:space:]]+"?/, "", line)
          sub(/"?[[:space:]]*$/, "", line)
          print line
          next
        }
        if (/^[a-zA-Z_]/) { in_paths = 0 }
      }
    }
  ' "$skill_md")

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
