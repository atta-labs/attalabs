# ⚠️ ABSOLUTE RULE — NEVER COMMIT WITHOUT EXPLICIT INSTRUCTION

**NEVER run `git commit` unless the user explicitly asked you to commit in this message. No exceptions.**

---

# Git Commit Conventions

**Use this exact format:**

```bash
git commit -m "Type: Brief description

- Bullet point 1
- Bullet point 2"
```

**Rules:**
- NEVER include `Generated with [Claude Code]` or `Co-Authored-By: Claude` footer
- NEVER use heredoc or multi-line strings with attribution
- ALWAYS use simple, concise commit messages
- Commit types: `Feat`, `Fix`, `Refactor`, `Style`, `Docs`, `Chore`
