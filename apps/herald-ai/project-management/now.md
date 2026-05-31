# Herald — Now

**What's in flight, what's next, what's blocked.** Changes per session.

→ [state.md](state.md) — full product state and phase plan
→ Root [project-management/now.md](../../../project-management/now.md) — ecosystem-wide in-flight

---

## In flight

Nothing actively dispatched.

---

## Next 3 things

1. **Phase 1a — Audit** Run the app locally. Walk the full flow: sign-up → onboarding → Envoy renders with real DB profile → paste JD → match report comes back. Document what's broken.
2. **Phase 1b — Fix match engine** Based on audit findings: confirm `POST /api/match` uses the real DB profile (not `DANI_PROFILE` fallback), Skeptical Auditor prompt fires, caching works, timeout fallback degrades gracefully.
3. **Phase 1c/1d — Envoy polish + deploy** `ReportView` renders correctly, rate limiting wired, share link works, deploy to `herald.attalabs.dev`.

---

## Manual work pending

- Nothing currently.

---

## Blocked

- Nothing currently.
