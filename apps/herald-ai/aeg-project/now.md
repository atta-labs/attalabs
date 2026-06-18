# Herald — Now

**What's in flight, what's next, what's blocked.**

→ [state.md](state.md) — full product state and phase plan
→ Root [aeg-project/now.md](../../../aeg-project/now.md) — ecosystem-wide

---

## In flight

**herald-agents-v2** iteration active. Task 1 (housekeeping — Archivist close-out, state doc rewrites, backlog fix) is the current work. Task 2 (agent migration — forensic-hiring-auditor package) dispatched after task 1 merges.

---

## Next 3 things

1. **Merge herald-agents-v2 task 1** — this housekeeping PR.
2. **Dispatch herald-agents-v2 task 2** — forensic-hiring-auditor agent package (`packages/agents/forensic-hiring-auditor/`). First D-051 agent package in the monorepo.
3. **Verify admin end-to-end in production** — go to `https://herald.attalabs.dev/admin`, test avatar upload, CV upload, bio save, theme picker. Confirm all DB columns work.

---

## Manual work pending

- **Provision fresh Upstash Redis creds** — per-key rate limiting is wired but not enforced. Provision at upstash.com, update `.env.local` + Vercel env vars for `herald.attalabs.dev`.
- **Deploy verification** — confirm production build post herald-onto-engine: admin routes, Bulk Audit N×M grid, polymorphic inputs (URL/pdf/md/profile).
- **`MASTER_ENCRYPTION_KEY`** must be present in Herald's Vercel env for BYOK decrypt path to work.

---

## Blocked

Nothing currently blocked.
