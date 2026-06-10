# Herald — product backlog

**Status:** draft · living reference (out of the AEG flow; not a ratified spec)

**Out of the AEG flow.** Held / future items for Herald (standalone forensic CV/JD audit tool, sibling AttaLabs product). Reference the Planner reads when choosing the next iteration slice; the flow never operates on it.

Rewritten 2026-06-10 after `herald-profile-refactor` (PR #81) retired the Candidate/Recruiter mode split (D-034). For the app's structure see `herald-app-architecture.md`.

---

## Product shape (current)

One audit operation — **Bulk Audit**: N CVs × M job descriptions → one forensic match report per pair. Same operation whether a recruiter runs many CVs against one role or a candidate runs their CV against many roles; the user chooses the inputs. Plus a public forensic profile at `/[username]`.

---

## Next major work

- **Endpoint unification.** Fold `/api/match` (profile audit) and `/api/recruiter/batch` (bulk) into one `/api/audit` cell runner; `runSingleMatch` is the reusable per-pair cell. `BulkAudit` currently still calls `/api/recruiter/batch`. Prerequisite for the matrix work below.
- **N×M matrix UI.** The Bulk Audit surface accepts N CVs × M JDs and renders one report per pair (a matrix / grid of results), not the single-pair view.
- **Polymorphic inputs.** JD = link | pasted text; CV = pasted text | .md | .pdf | a candidate's published Herald profile. Wire all input kinds into the audit cell.

## Smaller / open

- **Logo** — direction is herald trumpet/horn with AI signal arcs; not yet locked.
- **Upstash Redis credentials** — `.env.local` creds expired; rate limiting degrades gracefully but isn't active. Provision at upstash.com, update `.env.local` + Vercel env for `herald.attalabs.dev`. (Operational, not a code task.)
- **`MASTER_ENCRYPTION_KEY`** must be present in Herald's env for audits to run (BYOK decrypt path).
- **Profile-audit abuse cap** — strangers running audits on a published profile spend the owner's key budget (D-033). May need a per-key rate limit or cap. Parked.
- **Deploy verification** — confirm `herald.attalabs.dev` works post-PR-#81 (new flat routes `/bulk-audit`, `/ui`, `/settings`, `/onboarding`; public profile `/[username]`).
- **/ui editor library note** — the appearance editor previews the user's library in an iframe while the surrounding chrome stays on the build-time library (correct, per D-035). If confusing, a small "previewing — not saved" hint could be added. Nicety, not a bug.

---

*Herald is NOT part of Atta — sibling product in AttaLabs, separate Clerk app (D-031). Future home `herald.attalabs.dev`.*
