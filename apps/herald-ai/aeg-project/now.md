# Herald — Now

**What's in flight, what's next, what's blocked.**

→ [state.md](state.md) — full product state and phase plan
→ Root [aeg-project/now.md](../../../aeg-project/now.md) — ecosystem-wide

---

## In flight

Nothing actively dispatched.

---

## Next 3 things

1. **Verify admin redesign in production** — go to `https://herald.attalabs.dev/admin`, test avatar upload, CV upload, bio save, theme picker. Confirm all 3 new DB columns work end-to-end.
2. **Fresh Upstash Redis credentials** — rate limiting degrades gracefully but isn't active. Provision at upstash.com, update `.env.local` + Vercel env vars.
3. **Herald Phase 3 brief** — recruiter self-serve: paste JD + upload N CVs → batch forensic audit → ranked report list. Author brief before dispatching.

---

## Manual work pending

- Verify `https://herald.attalabs.dev/admin` admin redesign works (avatar + CV upload, bio save)
- Provision fresh Upstash Redis creds
- Drizzle constraint naming mismatch — `herald_profiles_username_key` vs `herald_profiles_username_unique` — will prompt on every future `drizzle-kit push`. Resolve in a separate PR.

---

## Blocked

Nothing currently blocked.
