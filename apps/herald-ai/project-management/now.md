# Herald — Now

**What's in flight, what's next, what's blocked.** Changes per session.

→ [state.md](state.md) — full product state and phase plan
→ Root [project-management/now.md](../../../project-management/now.md) — ecosystem-wide in-flight

---

## In flight

Nothing actively dispatched.

---

## Next 3 things

1. **Verify deploy** — confirm `https://herald.attalabs.dev/dani` returns 200 and the full flow works end-to-end in production.
2. **Fresh Upstash Redis credentials** — rate limiting degrades gracefully but isn't active. Provision new creds at upstash.com, update `.env.local` and Vercel env vars.
3. **Herald Phase 2 — self-service onboarding** — `AIOnboarding` hardened end-to-end, admin dashboard complete, public landing at `heyherald.com`. Author brief before dispatching.

---

## Manual work pending

- Provision fresh Upstash Redis creds (expired in `.env.local`)
- Confirm `https://herald.attalabs.dev/dani` returns 200

---

## Blocked

Nothing currently blocked.
