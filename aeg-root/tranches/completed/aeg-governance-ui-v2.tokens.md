---
sidebar_title: Tokens (aeg-gov-ui-v2)
---
# Token ledger — aeg-governance-ui-v2

Append-only per-tranche token/cost ledger. Format + rationale: `aeg-root/tranches/README.md` §12. Append-only artifact class: `aeg-root/state-machine.md` §13.

**The rule:** at the end of a role's turn, append one row; never edit a row; re-entry appends another row; the tranche total is `sum(rows)`, derived at read time, never stored.

**Capture sources:** terminal roles run in Claude Code (Developer; Archivist when automated) and self-report exact tokens via `/cost`. claude.ai roles (Planner; Brief Author; Reviewer; Security) cannot read their own token count and append the row with numeric cells as `—`; the Principal fills them later from the claude.ai UI usage figure.

**Cost-table dependency (V1):** the adapter PRICING table is currently missing some recent models (e.g. `claude-sonnet-4-20250514`), so a row's `Cost` cell may read `$0.00` even when tokens are exact. Tokens are still authoritative; cost is best-effort and noted at this seam. Backlogged in `apps/herald-ai/specs/herald-backlog.md`.

| Phase | Role | Agent/Model | Tokens in | Tokens out | Cost | Date |
|-------|------|-------------|-----------|------------|------|------|
| theme: brief | Brief Author | gemini-3.5-flash (chat) | — | — | — | 2026-06-20 |
| theme: develop | Developer | gemini-3.5-flash (chat) | — | — | — | 2026-06-20 |
| tranche-close | Tranche Archivist | claude-sonnet-4-6 | — | — | — | 2026-06-21 |
