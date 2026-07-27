# Token ledger — aeg-ui-v1

Append-only per-iteration token/cost ledger. See `aeg-root/iteration-model.md` §12.

Rules: each role appends one row at the end of its turn. Re-entry (re-plan, re-develop, re-review) appends a **new** row — never edits an existing one. The iteration total is `sum(rows)`, derived at read time, never stored.

Capture sources: terminal roles (Developer / Archivist run in Claude Code) self-report exact tokens via `/cost`; claude.ai roles (Planner / Brief Author / Reviewer / Security) cannot see their own token count and are filled by the Principal from the claude.ai UI usage figure — or left as `—` until then.

| Phase | Role | Agent/Model | Tokens in | Tokens out | Cost | Date |
|-------|------|-------------|-----------|------------|------|------|
| planning | Planner | claude-opus-4-7 (chat) | — | — | — | 2026-06-13 |
| 9: brief | Brief Author | claude-opus-4-7 (chat) | — | — | — | 2026-06-15 |
| 9: develop | Developer | claude-opus-4-7 (CC) | 184327 | 12502 | $3.4781 | 2026-06-15 |
| 9: develop | Developer | claude-opus-4-7 (CC) | 2150 | 320 | $0.0512 | 2026-06-15 |
