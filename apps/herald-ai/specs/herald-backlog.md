# Herald — product backlog

**Status:** draft · living reference (out of the AEG flow; not a ratified spec)

**Out of the AEG flow.** Held / future items for Herald (standalone forensic CV/JD audit tool, sibling AttaLabs product). Reference the Planner reads when choosing the next iteration slice; the flow never operates on it.

Rewritten 2026-06-18 to reflect herald-onto-engine iteration complete (PRs #104, #107, #112, #113, #115, #117, #120, #123, #132).

---

## Product shape (current)

One audit operation — **Bulk Audit**: N CVs × M job descriptions → one forensic match report per pair. Same operation whether a recruiter runs many CVs against one role or a candidate runs their CV against many roles; the user chooses the inputs. Plus a public forensic profile at `/[username]`.

The auditor runs as a YAML-declared agent on `@atta/engine` + `@atta/adapter-langgraph`, backed by multi-vendor BYOK (all 12 vendors) and per-audit model selection. The GitHub signal tool is declared in the YAML and executed by the adapter's custom-tool loop (D-047). `POST /api/audit` is the unified endpoint.

---

## Next major work

### Agent migration — herald-agents-v2 task 2 (D-051)

Move Herald's auditor into a self-contained `packages/agents/forensic-hiring-auditor/` package: YAML + tools + schema + gates + `run()` export. This is the first instance of the D-051 agent package pattern (workspace glob extension to `packages/*/*` is part of this task). The goal: the Herald web app imports and calls `forensic-hiring-auditor` the same way any other consumer would — no Herald-specific orchestration knowledge inside the package.

---

## What shipped in herald-onto-engine (complete ✅, June 2026)

All items below merged as part of the herald-onto-engine AEG iteration.

| Item | Decision | PR | Status |
|------|----------|----|--------|
| Engine migration — auditor as solo YAML | D-044 | #104 | ✅ done |
| Endpoint unification → `POST /api/audit` | D-045 | #107 | ✅ done |
| Multi-vendor BYOK + audit model selector | task 3b | #112 | ✅ done |
| N×M matrix UI (Bulk Audit accepts N CVs × M JDs) | task 4 | #117 | ✅ done |
| Polymorphic inputs (JD link/text; CV text/.md/.pdf/profile) | task 5 | #123 | ✅ done |
| Per-key rate limit / cap on profile audits | task 6 / #93 | #113 | ✅ done (enforcement degraded — Upstash creds expired; see below) |
| Custom client-side tool execution in engine | D-047 | #115 | ✅ done (shared, Vāda in blast radius) |
| GitHub tool declared in auditor YAML | task 7b | #120 | ✅ done |
| Auditor quality fix (max_tokens, stale model, JD charset) | — | #132 | ✅ done |

---

## Smaller / open

- **Logo** — direction is herald trumpet/horn with AI signal arcs; not yet locked.
- **Upstash Redis credentials** — `.env.local` creds expired; per-key rate limiting is wired at `/api/audit` middleware but not enforced. Provision at upstash.com, update `.env.local` + Vercel env for `herald.attalabs.dev`. (Operational, not a code task.)
- **`MASTER_ENCRYPTION_KEY`** must be present in Herald's Vercel env for BYOK decrypt path to work.
- **Profile-audit abuse cap (D-033)** — per-key rate limit shipped (task 6 / #93), but enforcement depends on fresh Upstash Redis creds (above). Once creds are fresh, enforcement is active with no code change needed.
- **Deploy verification** — confirm `herald.attalabs.dev` works end-to-end post herald-onto-engine: admin routes (`/admin`, `/admin/ui`), Bulk Audit N×M grid, polymorphic inputs (URL fetch, PDF parse, Herald profile as CV), per-audit model selection.
- **/ui editor library note** — the appearance editor previews the user's library in an iframe while the surrounding chrome stays on the build-time library (correct, per D-035). If confusing, a small "previewing — not saved" hint could be added. Nicety, not a bug.
- **PRICING table missing the auditor's pinned model** — `claude-sonnet-4-20250514` is not in `@atta/adapter-langgraph`'s PRICING table (only `claude-sonnet-4-6` is listed), so every Herald audit reports `$0.00` estimated cost. Pre-existing; surfaced during task 1 smoke test. Fix: add the pinned model to the adapter PRICING table or update the YAML default to a priced model. Small, shared-package change — Vāda in blast radius.
- **Report quality improvement** — the auditor's forensic output is solid but has room for improvement in signal weighting and gap specificity. Candidate for a dedicated iteration once agent migration (herald-agents-v2) is complete. Requires benchmark runs to measure before/after.

---

*Herald is NOT part of Atta — sibling product in AttaLabs, separate Clerk app (D-031). Domain `herald.attalabs.dev`.*
