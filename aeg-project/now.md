# Atta — Now

**Active work, next steps, and manual tasks.** Changes daily.

→ [changelog.md](changelog.md) — what shipped
→ [lessons.md](lessons.md) — calibration

**Where the plan lives** (the old `roadmap.md` is retired — global D-029). The plan is the backlogs, not the iterations:
- Per-project: `apps/vada-ai/specs/vada-backlog.md` · `apps/cetana-ai/specs/cetana-backlog.md` · `apps/herald-ai/specs/herald-backlog.md`
- Cross-cutting / AEG-itself: `specs/ecosystem-backlog.md`
- **Active execution:** `aeg-root/iterations/` — a slice *pulled from a backlog* when it's actually being built. **herald-onto-engine: complete ✅. aeg-ui-v1: complete except task 9-view (#110).**

---

## In flight now

**PR #132** — Herald audit fix (max_tokens truncation, stale model, JD charset encoding). Open, awaiting Principal browser-test verification of a real audit.

---

## Next 3 things

1. **Merge PR #132** after Principal browser-tests a real audit against the fix.
2. **Build task 9-view** (#110, token ledger Studio display) — unblocked, brief needed.
3. **PR body contract in developer.md** — brief written, ready to dispatch.

---

## Manual work pending

- **Add OpenAI + xAI keys to Vercel** — Vercel → vada-ai project → Settings → Environment Variables → add `OPENAI_API_KEY` and `XAI_API_KEY`. Unblocks Reviewers end-to-end testing.
- **Upstash Redis credentials for Herald** — `.env.local` creds expired. Rate limiting degrades gracefully but isn't active. Provision at upstash.com, update `.env.local` + Vercel env vars for `herald.attalabs.dev`.
- **Herald deploy verification** — confirm `https://herald.attalabs.dev/admin` works post-PR-#75 (avatar upload, CV upload, bio save, theme picker).
- **Worktree graveyard cleanup** — `git worktree prune && git fetch --prune && git branch --merged main | grep -v "^\* \|main" | xargs git branch -D`
- **Vitakka Clerk app deletion** — unused, no users. 2 minutes.
- **Generate Vāda API key + configure Claude Code MCP connector** — point at `https://vada.attalabs.dev/api/mcp` with bearer auth. Final step in hosted MCP dogfooding.

---

## Blocked

Nothing currently blocked.
