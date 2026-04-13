---
name: git-commits
description: Git commit format and rules for the Atta AI monorepo — enforced by commitlint + husky
triggers:
  - Committing any changes
  - Writing a commit message
---

# Git Commits — Atta AI

## Rules

### Commit Format

```
Type: Brief description

- Bullet point 1
- Bullet point 2
```

### Valid Types

| Type | When |
|------|------|
| `Feat` | New feature or behavior |
| `Fix` | Bug fix |
| `Refactor` | Code restructuring, no behavior change |
| `Style` | Visual/CSS changes only |
| `Docs` | Documentation only |
| `Chore` | Build, config, tooling, deps |

### Hard Rules
- **NEVER** include `Generated with [Claude Code]` or `Co-Authored-By: Claude` footers
- **NEVER** use heredoc with attribution
- **NEVER** use `Build`, `Perf`, `Revert`, or `Test` as commit types
- **NEVER** skip husky pre-commit hooks (`--no-verify`)
- **NEVER** force push

---

## Examples

```bash
# ✅ Correct
git commit -m "Feat: Add per-agent model configuration to deliberation start

- Extend createSession to persist agentModels JSON
- Validate per-agent model keys in start route
- Thread ModelConfig through round builder"

# ✅ Short (no bullets needed for simple changes)
git commit -m "Fix: Correct sticky header z-index in DeliberationFeed"

# ❌ Wrong type
git commit -m "Build: Update dependencies"   # Use Chore instead

# ❌ Attribution footer
git commit -m "Feat: Add feature

Co-Authored-By: Claude Sonnet <noreply@anthropic.com>"
```

---

## Anti-patterns

- ❌ `Co-Authored-By` or `Generated with` footers — ever
- ❌ Vague messages like "fix stuff" or "update code"
- ❌ One massive commit for many unrelated changes
- ❌ Committing before the user has tested and confirmed
