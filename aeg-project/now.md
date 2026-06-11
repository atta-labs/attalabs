# Atta — Now

**Active work, next steps, and manual tasks.** Changes daily.

→ [changelog.md](changelog.md) — what shipped
→ [lessons.md](lessons.md) — calibration

**Where the plan lives** (the old `roadmap.md` is retired — global D-029). The plan is the backlogs, not the iterations:
- Per-project: `apps/vada-ai/specs/vada-backlog.md` · `apps/cetana-ai/specs/cetana-backlog.md` · `apps/herald-ai/specs/herald-backlog.md`
- Cross-cutting / AEG-itself: `specs/ecosystem-backlog.md`
- **Active execution:** `aeg-root/iterations/` — a slice *pulled from a backlog* when it's actually being built. (None active right now.)

---

## In flight now

Nothing actively dispatched. No active iteration.

---

## Next 3 things (candidates to pull into the first iteration)

1. **AEG UI** — the deployed AEG product that visualizes an iteration's tasks (status derived from the forge). This is the intended **first real iteration** — decompose into its own task graph (derive module, GitHub App auth, webhook fact-cache, attention queue, repo-rollup, DAG view).
2. **Cetana F7 — `cetana status`** — fleet overview: running / blocked (question + severity) / recently completed. Ready to dispatch. (Separate iteration from the AEG UI.)
3. **Test Vāda Reviewers end-to-end** — add OpenAI + xAI keys to Vercel first (manual, 5 min), then run a real Reviewers deliberation at `vada.attalabs.dev`. First time ever tested.

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
