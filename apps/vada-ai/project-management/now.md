# Vāda — Now

**What's in flight, what's next, what's blocked.**

→ [state.md](state.md) — full product state and phase plan
→ Root [project-management/now.md](../../../project-management/now.md) — ecosystem-wide

---

## In flight

- **PR #77** — Reviewers system prompt v2 (anti-convergence, structured output). Open, pending merge. Rebase completed June 2.

---

## Next 3 things

1. **Merge PR #77** — once green
2. **Add OpenAI + xAI keys to Vercel** (manual, 5 min) — go to Vercel → vada-ai project → Settings → Environment Variables. Add `OPENAI_API_KEY` and `XAI_API_KEY`. This unblocks Reviewers end-to-end testing.
3. **Test Reviewers end-to-end** — go to `vada.attalabs.dev`, pick Reviewers team, run a real deliberation with a vendor-diverse config (Anthropic + Google + OpenAI). Confirm all 3 reviewers respond. Then test Reviewers + Synthesis.

---

## Manual work pending

- **Add OpenAI + xAI keys to Vercel** — Reviewers are blocked without these
- **Generate a Vāda API key** — needed to test the hosted MCP via Claude Code CLI
- **Configure Claude Code MCP connector** — point it at `https://vada.attalabs.dev/api/mcp` with bearer auth

---

## Blocked

- Reviewers end-to-end testing — blocked on OpenAI + xAI Vercel env vars (manual action needed)
