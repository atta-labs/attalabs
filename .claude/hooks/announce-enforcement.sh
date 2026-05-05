#!/usr/bin/env bash
# SessionStart hook — injects context informing the model that
# skill-check enforcement is active in this repo.
cat <<'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "SKILL-CHECK ENFORCEMENT ACTIVE — A PreToolUse hook ($CLAUDE_PROJECT_DIR/.claude/hooks/check-skill.sh) BLOCKS Edit/Write/NotebookEdit on file paths that match a `paths:` glob in any .claude/skills/<name>/SKILL.md frontmatter, until that skill has been invoked via the Skill tool in this session. The .claude/skills/ directory is the authoritative source of truth for this codebase. Read each invoked skill as ARCHITECTURE before editing — its first section describes system structure and invariants, which are the design anchors. Pattern-matching the topic without reading existing architecture is how agents have wasted hours destroying working code in this repo. Do not skim. Do not bypass."
  }
}
EOF
