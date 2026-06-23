# Herald — Now

**What's in flight, what's next, what's blocked.**

→ [state.md](state.md) — full product state and phase plan
→ Root [aeg-project/now.md](../../../aeg-project/now.md) — ecosystem-wide

---

## In flight

**herald-agents-v2** iteration active. Tasks 1–5 are all merged (housekeeping, agent migration, Herald MCP, Bulk Audit UX, report quality). Tasks 6 (abuse cap) and 7 (deploy verification) are next.

---

## Next 3 things

1. **Dispatch task 6 (#172)** — per-owner per-day rate limit on public profile audits (D-033 follow-up). Depends on task 2 (#168, merged).
2. **Dispatch task 7 (#173)** — deploy verification: `herald.attalabs.dev` Phase 2 flows (avatar, CV upload, bio save, onboarding, Bulk Audit with real BYOK). Depends on task 2 (#168, merged).
3. **Provision fresh Upstash Redis creds** — rate limiting (task 6) will be wired but inactive without live creds.

---

## Manual work pending

- **Provision fresh Upstash Redis creds** — per-key rate limiting degrades gracefully but is inactive. Provision at upstash.com, update `.env.local` + Vercel env vars for `herald.attalabs.dev`.
- **`MASTER_ENCRYPTION_KEY`** must be present in Herald's Vercel env for BYOK decrypt path to work.

---

## Blocked

Nothing currently blocked.
