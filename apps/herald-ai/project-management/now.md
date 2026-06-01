# Herald — Now

**What's in flight, what's next, what's blocked.** Changes per session.

→ [state.md](state.md) — full product state and phase plan
→ Root [project-management/now.md](../../../project-management/now.md) — ecosystem-wide in-flight

---

## In flight

- **Herald Phase 2 — self-service onboarding** — `feat/herald-phase-2` branch. Onboarding crash fixed (ToolPart state guards), flow hardened, profile editing verified, landing page confirmed real. PR open.

---

## Next 3 things

1. **Merge Phase 2 PR** — review and merge `feat/herald-phase-2`.
2. **Fresh Upstash Redis credentials** — rate limiting degrades gracefully but isn't active. Provision new creds at upstash.com, update `.env.local` and Vercel env vars.
3. **Herald Phase 3 brief** — recruiter self-serve: paste JD + upload N CVs → batch forensic audit → ranked report list.

---

## Manual work pending

- Provision fresh Upstash Redis creds (expired in `.env.local`)
- Confirm `https://herald.attalabs.dev/dani` returns 200

---

## Blocked

Nothing currently blocked.
