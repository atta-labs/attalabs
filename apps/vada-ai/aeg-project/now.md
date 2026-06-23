# Vāda — Now

**What's in flight, what's next, what's blocked.**

→ [state.md](state.md) — full product state and phase plan
→ Root [aeg-project/now.md](../../../aeg-project/now.md) — ecosystem-wide

---

## In flight

**vada-production-v1** iteration active. T1 (YAML migration, PR #192) and T3 (per-vendor tool substrate, PR #194) are merged. T2 (stale spec cleanup, #176) is open and not yet dispatched.

---

## Next 3 things

1. **Dispatch T3a (#178)** — equip reviewers with web search + vendor-native tools using the T3 substrate; tool config declarative in YAML. Unblocked now that T3 (#177) merged.
2. **Dispatch T2 (#176)** — stale spec cleanup (vada-state.md rewrite, CLAUDE.md, teams-catalog). Depends on T1 only; unblocked.
3. **Add OpenAI + xAI keys to Vercel** (manual, 5 min) — Vercel → vada-ai → Settings → Environment Variables. Unblocks Reviewers end-to-end testing.

---

## Manual work pending

- **Add OpenAI + xAI keys to Vercel** — Reviewers multi-vendor testing blocked without these
- **Generate a Vāda API key** — needed to test the hosted MCP via Claude Code CLI
- **Configure Claude Code MCP connector** — point at `https://vada.attalabs.dev/api/mcp` with bearer auth

---

## Blocked

- Reviewers end-to-end testing — blocked on OpenAI + xAI Vercel env vars (manual action needed)
