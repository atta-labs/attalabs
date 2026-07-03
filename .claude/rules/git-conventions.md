# ⚠️ ABSOLUTE RULE — NEVER COMMIT WITHOUT EXPLICIT INSTRUCTION

**NEVER run `git commit` unless the user explicitly asked you to commit in this message. No exceptions.**

---

# Git Commit Conventions

**Use this exact format** (scope is optional; when present, lower-case):

```bash
git commit -m "Type: Brief description

- Bullet point 1
- Bullet point 2"
```

```bash
git commit -m "Type(scope): Brief description

- Bullet point 1
- Bullet point 2"
```

**Rules:**
- NEVER include `Generated with [Claude Code]` or `Co-Authored-By: Claude` footer
- NEVER use heredoc or multi-line strings with attribution
- ALWAYS use simple, concise commit messages
- Header line (type + scope + description) must be ≤72 characters
- Commit types: `Build`, `Docs`, `Feat`, `Chore`, `Fix`, `Perf`, `Refactor`, `Revert`, `Style`, `Test`
