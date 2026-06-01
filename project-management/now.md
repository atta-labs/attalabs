# Atta — Now

**Active work, next steps, and manual tasks.** Changes daily.

→ [roadmap.md](roadmap.md) — tracks + sequencing + open questions
→ [changelog.md](changelog.md) — what shipped
→ [lessons.md](lessons.md) — calibration

---

## In flight now

Nothing actively dispatched.

---

## Next 3 things

1. **Herald Phase 2 — self-service candidate onboarding.** Any second person can sign up and get their own Envoy. `AIOnboarding` hardened end-to-end, admin dashboard complete, public landing page at `heyherald.com`. Brief to be authored before dispatch.
2. **Cetana F6 — `cetana watch`.** Live streaming output so agent sessions are visible in real time. Ready to dispatch.
3. **Vāda Reviewers prompt iteration (Track B Item 3b).** Reviewers ERROR fixed (PR #65). Dispatch via Cetana.

---

## Manual work pending (no agent needed)

- **Upstash Redis credentials for Herald** — current `.env.local` creds are expired/truncated. Rate limiting degrades gracefully (Option A merged in #70) but real rate limiting needs fresh creds. Provision at upstash.com, update `.env.local` + Vercel env vars for `herald.attalabs.dev`.
- **Herald deploy verification** — confirm `https://herald.attalabs.dev/dani` returns 200. PR #70 merged but deploy not confirmed.
- **Worktree graveyard cleanup** — many stale worktrees. `git worktree prune && git fetch --prune && git branch --merged main | grep -v "^\* \|main" | xargs git branch -D`.
- **Delete stray PM files** — `project-management/_herald-state-patch.md` and `project-management/_herald-state-pointer.md` created by error May 31.
- **Vitakka Clerk app deletion** — unused, no users. 2 minutes.
- **Add OpenAI + xAI keys server-side** — needed to test full vendor-diverse Reviewers default trio.
- **Generate Vāda API key + configure Claude Desktop / Claude Code connector** — final step in hosted MCP dogfooding.

---

## Blocked

Nothing currently blocked.
