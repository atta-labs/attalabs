# Herald — product backlog

**Out of the AEG flow.** Held / future items for Herald (standalone forensic CV/JD match tool, sibling AttaLabs product). Reference the Planner reads when choosing the next iteration slice; the flow never operates on it.

Migrated from the retired global `roadmap.md` and `now.md` (June 3, 2026).

---

## Next major work

- **Phase 3 — recruiter self-serve.** Paste a JD + upload N candidate CVs → batch forensic audit → ranked reports. This is the recruiter-side use case (Phase 1 shipped the candidate-side Envoy). Sizeable; likely its own iteration when pulled. Phase-1 dispatch brief precedent: `apps/herald-ai/project-management/briefs/phase-1-candidate-use-case.md`.

## Smaller / open

- **Logo** — direction is herald trumpet/horn with AI signal arcs; not yet locked.
- **Upstash Redis credentials** — `.env.local` creds expired; rate limiting degrades gracefully but isn't active. Provision at upstash.com, update `.env.local` + Vercel env for `herald.attalabs.dev`. (Operational, not a code task.)
- **Deploy verification** — confirm `herald.attalabs.dev/admin` redesign works post-PR-#75 (avatar upload, CV upload, bio save).

---

*Herald is NOT part of Atta — sibling product in AttaLabs, separate Clerk app. Future home `herald.attalabs.dev`.*
