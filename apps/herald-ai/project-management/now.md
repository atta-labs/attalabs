# Herald — Now

**What's in flight, what's next, what's blocked.** Changes per session.

→ [state.md](state.md) — full product state and phase plan
→ Root [project-management/now.md](../../../project-management/now.md) — ecosystem-wide in-flight

---

## In flight

- **Herald admin redesign** — `feat/herald-admin-redesign` branch. Avatar + CV storage via Vercel Blob, bio field, two-column profile editor + live Envoy preview, onboarding TopBar, CV paste-text mode. PR ready to open.

---

## Next 3 things

1. **Merge Phase 2 PR #74** — review and merge `feat/herald-phase-2` (depends on when main is unblocked).
2. **Merge admin redesign PR** — review and merge `feat/herald-admin-redesign`.
3. **Fresh Upstash Redis credentials** — rate limiting degrades gracefully but isn't active. Provision new creds at upstash.com, update `.env.local` and Vercel env vars.

---

## Manual work pending

- Provision fresh Upstash Redis creds (expired in `.env.local`)
- Confirm `https://herald.attalabs.dev/dani` returns 200

---

## Blocked

Nothing currently blocked.
