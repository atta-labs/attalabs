---
name: git-commits
description: Git commit format and rules for the Atta AI monorepo — enforced by commitlint + husky
---

# Git Commits — Atta AI

## Rules

### Commit Format

Scope is optional; when present it must be lower-case. Header line (type + scope + description) must be ≤72 characters.

```
Type: Brief description

- Bullet point 1
- Bullet point 2
```

```
Type(scope): Brief description

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
| `Build` | Build system or dependency changes |
| `Perf` | Performance improvement |
| `Revert` | Reverts a previous commit |
| `Test` | Test-only changes |

### Hard Rules
- **NEVER** include `Generated with [Claude Code]` or `Co-Authored-By: Claude` footers
- **NEVER** use heredoc with attribution
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

# ✅ Scoped
git commit -m "Chore(deps): Bump @atta/ui to 2.4.0"

# ❌ Wrong type (not in the enum)
git commit -m "Update: Bump dependencies"

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
