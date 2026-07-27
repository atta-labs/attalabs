# Token ledger — aeg-ui-v1

Append-only per-tranche token/cost ledger. Format + rationale: `aeg-root/tranches/README.md` §12. Append-only artifact class: `aeg-root/state-machine.md` §13.

**The rule:** at the end of a role's turn, append one row; never edit a row; re-entry appends another row; the tranche total is `sum(rows)`, derived at read time, never stored.

**Capture sources:** terminal roles run in Claude Code (Developer; Archivist when automated) and self-report exact tokens via `/cost`. claude.ai roles (Planner; Brief Author; Reviewer; Security) cannot read their own token count and append the row with numeric cells as `—`; the Principal fills them later from the claude.ai UI usage figure.

**Backfill policy:** the per-role turn-end obligation is introduced in task 9 (this tranche). Rows for prior tasks in this tranche (tasks 1, 2, 4, 7) are not backfilled — those turns predate the obligation, and inventing numbers would falsify the ledger. The ledger starts here.

**Cost-table dependency (V1):** the adapter PRICING table is currently missing some recent models (e.g. `claude-sonnet-4-20250514`), so a row's `Cost` cell may read `$0.00` even when tokens are exact. Tokens are still authoritative; cost is best-effort and noted at this seam. Backlogged in `apps/herald-ai/specs/herald-backlog.md`.

| Phase | Role | Agent/Model | Tokens in | Tokens out | Cost | Date |
|-------|------|-------------|-----------|------------|------|------|
| 9: brief | Brief Author | claude-opus-4-7 (chat) | — | — | — | 2026-06-15 |
| 9: develop | Developer | claude-opus-4-7 (CC) | — | — | — | 2026-06-15 |
| tranche-close | Tranche Archivist | claude-sonnet-4-6 (CC) | — | — | — | 2026-06-21 |
