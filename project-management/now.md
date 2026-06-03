# Atta — Now

**Active work, next steps, and manual tasks.** Changes daily.

→ [roadmap.md](roadmap.md) — tracks + sequencing + open questions
→ [changelog.md](changelog.md) — what shipped
→ [lessons.md](lessons.md) — calibration

---

## In flight now

- **Herald admin redesign** — PR #75 open — avatar upload (Vercel Blob), CV storage, bio field, two-column admin UI, onboarding TopBar + CV paste mode.

---

## Next 3 things

1. **Cetana F7 — `cetana status`** — fleet overview: running tasks, blocked tasks (question + severity), recently completed. Ready to dispatch.
2. **Vāda Track B Item 3b — Reviewer prompt iteration** — unblocked since PR #31 (May 11) and PR #65 (June 1). Ready to dispatch.
3. **Herald Phase 3 — recruiter self-serve** — after #75 merges. Brief to be authored.

---

## Manual work pending

- **Upstash Redis credentials for Herald** — `.env.local` creds expired. Rate limiting degrades gracefully but isn't active. Provision at upstash.com, update `.env.local` + Vercel env vars.
- **Worktree graveyard cleanup** — `git worktree prune && git fetch --prune && git branch --merged main | grep -v "^\* \|main" | xargs git branch -D`
- **Vitakka Clerk app deletion** — unused, no users. 2 minutes.
- **Add OpenAI + xAI keys server-side** — needed to test full vendor-diverse Reviewers default trio.
- **Generate Vāda API key + configure Claude Desktop / Claude Code connector** — final step in hosted MCP dogfooding.

---

## Blocked

Nothing currently blocked.
