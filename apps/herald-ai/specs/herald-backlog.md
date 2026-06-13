# Herald — product backlog

**Status:** draft · living reference (out of the AEG flow; not a ratified spec)

**Out of the AEG flow.** Held / future items for Herald (standalone forensic CV/JD audit tool, sibling AttaLabs product). Reference the Planner reads when choosing the next iteration slice; the flow never operates on it.

Rewritten 2026-06-10 after `herald-profile-refactor` (PR #81) retired the Candidate/Recruiter mode split (D-034). For the app's structure see `herald-app-architecture.md`.

---

## Product shape (current)

One audit operation — **Bulk Audit**: N CVs × M job descriptions → one forensic match report per pair. Same operation whether a recruiter runs many CVs against one role or a candidate runs their CV against many roles; the user chooses the inputs. Plus a public forensic profile at `/[username]`.

---

## Next major work

- **Engine migration + multi-vendor BYOK and model choice — move Herald's AI call onto `@atta/engine` + `@atta/adapter-langgraph`, and make Herald multi-LLM like Vāda.** Two coupled halves of one piece of work:

  **(a) Engine migration — `/api/match` done (D-044, June 13).** `apps/herald-ai/web/yamls/herald-auditor.yaml` is the canonical source for the auditor's system prompt + model + classifier + message template. `route.ts` runs the audit via `loadFlow → compileFlow → LangGraphAdapter.execute`, with `{{schema}}` substituted from `MATCH_REPORT_SCHEMA` (the parser contract) at compileFlow time. The 2-attempt retry, 25s timeout, `extractSignals` pre-fetch, SHA-256 cache, `parseMatchReport` NO-FIT hard-requirement gate, and `buildPartialReport` fallback are unchanged. Engine and adapter packages consumed unchanged (empty diff against `packages/engine` and `packages/adapter-langgraph`). The original "three engine smells" were resolved by rescoping (the engine already runs any vendor as text via prompt-instruction JSON, like Vāda — no structured-output adapter work needed; #87 closed not-planned). **Remaining (a) work:** `/api/recruiter/batch` is still on the direct `generateText` path — `herald-onto-engine` task 2 migrates it onto the engine, after which `SKEPTICAL_AUDITOR_PROMPT` can be deleted from `prompts.ts`. **Follow-on:** `herald-onto-engine` task 7 (#102) moves signal-gathering into the auditor agent as a YAML-declared tool, retiring the `extractSignals` pre-fetch.

  **(b) Multi-vendor BYOK + per-audit model choice (IMPORTANT — Dani-flagged).** Today Herald is **Anthropic-only**: the settings page (`(app)/settings/page.tsx`) decrypts the per-user key store but only ever reads `keys.anthropic` → a single `hasAnthropicKey` boolean, and there is no model picker. The *storage* is already the right backbone — Herald uses the shared encrypted per-user store (`@atta/crypto` + `getProviderKeys`, the same `encryptedPayload` vendor-map shape Vāda uses), so it can already hold keys for all 12 vendors. What's missing is the UI and the wiring. Make Herald work like Vāda: the **API Keys tab in Herald settings supports multiple LLM vendors** (a user can save keys for any vendor — Anthropic, OpenAI, xAI, Google, etc.), and the user can **choose any model they want for the audit**. The engine migration is what unlocks this — the engine + vendor registry (`packages/models/src/vendors.ts`) already route to all 12 vendors and the Flow takes a `model` per agent, so once Herald runs the audit through the engine, vendor/model choice is mostly a UI + plumbing job, not new infra. Likely reuse: Vāda's `@atta/ui/account` `ProviderKeysSection` (the multi-vendor key UI already exists there) rather than building new; add a model selector on the audit surface (or in settings as a default) resolved against the vendor registry. This supersedes the old single-`ANTHROPIC_API_KEY`-env-var path and the single-vendor settings boolean. Respect D-033 key-resolution (profile audits run on the profile owner's key; batch runs on the logged-in user's key) — that decision is about *whose* key, orthogonal to *which vendor*.

  **Sequencing note (from the handoff doc):** the engine migration is likely best done as one atomic PR with endpoint unification at the start of the bulk-audit work, since migrating the single-pair flow now and re-refactoring it for N×M later is wasteful — but it can also be done standalone first. The multi-vendor/model half (b) rides on the engine migration (a); decide exact PR scope when this is pulled into an iteration.

- **Endpoint unification.** Fold `/api/match` (profile audit) and `/api/recruiter/batch` (bulk) into one `/api/audit` cell runner; `runSingleMatch` is the reusable per-pair cell. `BulkAudit` currently still calls `/api/recruiter/batch`. Prerequisite for the matrix work below. (The engine migration is the natural trigger to do this — see above.)
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
