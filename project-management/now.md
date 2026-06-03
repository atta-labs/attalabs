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

1. **Cetana F7 — `cetana status`** — fleet overview: running tasks, blocked tasks (question + severity), recently completed. Ready to dispatch.
2. **Test Vāda Reviewers end-to-end** — add OpenAI + xAI keys to Vercel first (manual, 5 min), then run a real Reviewers deliberation at `vada.attalabs.dev`. First time this has ever been tested.
3. **Herald Phase 3 brief** — recruiter self-serve: paste JD + upload N CVs → batch forensic audit → ranked reports. Brief to be authored.

---

## Manual work pending

- **Add OpenAI + xAI keys to Vercel** — go to Vercel → vada-ai project → Settings → Environment Variables. Add `OPENAI_API_KEY` and `XAI_API_KEY`. Unblocks Reviewers end-to-end testing.
- **Upstash Redis credentials for Herald** — `.env.local` creds expired. Rate limiting degrades gracefully but isn't active. Provision at upstash.com, update `.env.local` + Vercel env vars for `herald.attalabs.dev`.
- **Worktree graveyard cleanup** — `git worktree prune && git fetch --prune && git branch --merged main | grep -v "^\* \|main" | xargs git branch -D`
- **Vitakka Clerk app deletion** — unused, no users. 2 minutes.
- **Generate Vāda API key + configure Claude Code MCP connector** — point at `https://vada.attalabs.dev/api/mcp` with bearer auth. Final step in hosted MCP dogfooding.
- **Herald deploy verification** — confirm `https://herald.attalabs.dev/admin` admin redesign works post-PR-#75. Test avatar upload, CV upload, bio save.

---

## Blocked

Nothing currently blocked.
