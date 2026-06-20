# Atta — Now

**Active work, next steps, and manual tasks.** Changes daily.

→ [changelog.md](changelog.md) — what shipped
→ [lessons.md](lessons.md) — calibration

**Where the plan lives** (the old `roadmap.md` is retired — global D-029). The plan is the backlogs, not the iterations:
- Per-project: `apps/vada-ai/specs/vada-backlog.md` · `apps/cetana-ai/specs/cetana-backlog.md` · `apps/herald-ai/specs/herald-backlog.md`
- Cross-cutting / AEG-itself: `specs/ecosystem-backlog.md`
- **Active execution:** `aeg-root/iterations/` — a slice *pulled from a backlog* when it's actually being built. **herald-onto-engine: complete ✅. aeg-ui-v1: complete ✅. aeg-governance-ui-v2: complete ✅.**

---

## In flight now

Nothing currently in active execution. Three iterations have closed (herald-onto-engine, aeg-ui-v1, aeg-governance-ui-v2). herald-agents-v2, vada-agents-v2 are open as parallel active iterations; see their own `aeg-project/` state docs.

---

## Next 3 things

Principal to declare. The governance model (aeg-governance-ui-v2) and Studio UI (aeg-ui-v1) are both complete. Options: (1) next AEG iteration (forge-derived status / GitHub App auth), (2) Vāda reviewer prompt iteration (Track B 3b), (3) Cetana F7 (`cetana status`). Principal decides.

---

## Manual work pending

- **Close Issue #110 manually** — task 9 view half (token ledger Studio display) merged via PR #153 on branch `task/aeg-governance-ui-v2/4`; auto-close did not fire; issue remains open.
- **Add OpenAI + xAI keys to Vercel** — Vercel → vada-ai project → Settings → Environment Variables → add `OPENAI_API_KEY` and `XAI_API_KEY`. Unblocks Reviewers end-to-end testing.
- **Upstash Redis credentials for Herald** — `.env.local` creds expired. Rate limiting degrades gracefully but isn't active. Provision at upstash.com, update `.env.local` + Vercel env vars for `herald.attalabs.dev`.
- **Herald deploy verification** — confirm `https://herald.attalabs.dev/admin` works post-PR-#75 (avatar upload, CV upload, bio save, theme picker).
- **Worktree graveyard cleanup** — `git worktree prune && git fetch --prune && git branch --merged main | grep -v "^\* \|main" | xargs git branch -D`
- **Vitakka Clerk app deletion** — unused, no users. 2 minutes.
- **Generate Vāda API key + configure Claude Code MCP connector** — point at `https://vada.attalabs.dev/api/mcp` with bearer auth. Final step in hosted MCP dogfooding.

---

## Blocked

Nothing currently blocked.
