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

# >>> vinaya:managed:track-transcript >>>
# Vinaya-managed Stop hook. Records this session's transcript_path (and
# session_id) so the token-report adapter can resolve it without scanning
# ~/.claude/projects/ for the newest file, which silently grabs another
# concurrent session's transcript when two worktrees are active at once.
node -e '
const fs = require("fs")
let data = ""
process.stdin.on("data", (c) => { data += c })
process.stdin.on("end", () => {
  let hook
  try {
    hook = JSON.parse(data)
  } catch {
    return
  }
  if (!hook.transcript_path) return
  const crypto = require("crypto")
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd()
  const tmpDir = process.env.TMPDIR || "/tmp"
  const digest = crypto.createHash("sha256").update(projectDir).digest("hex")
  const key = projectDir.replace(/[^A-Za-z0-9]+/g, "-") + "-" + digest
  const pointerPath = tmpDir + "/claude-transcript-" + key + ".txt"
  const content = (hook.session_id || "") + "\t" + hook.transcript_path + "\n"
  const scratchPath = pointerPath + "." + process.pid + "." + Math.random().toString(36).slice(2) + ".tmp"
  try {
    fs.writeFileSync(scratchPath, content, { mode: 0o600, flag: "wx" })
  } catch {
    return
  }
  try {
    fs.renameSync(scratchPath, pointerPath)
  } catch {
    try { fs.unlinkSync(scratchPath) } catch {}
  }
})
'
exit 0
# <<< vinaya:managed:track-transcript <<<
