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

  **(a) Engine migration — done (D-044 June 13, D-045 June 14).** `apps/herald-ai/web/yamls/herald-auditor.yaml` is the canonical source for the auditor's system prompt + model + classifier + message template. Both call paths run through the engine via one unified endpoint, `POST /api/audit`, using a shared `runSingleMatch` cell that calls `loadFlow → compileFlow → LangGraphAdapter.execute`, with `{{schema}}` substituted from `MATCH_REPORT_SCHEMA` (the parser contract) at compileFlow time. The 2-attempt retry, 25s timeout, `extractSignals` pre-fetch, SHA-256 cache, `parseMatchReport` NO-FIT hard-requirement gate, and `buildPartialReport` fallback are unchanged. Engine and adapter packages consumed unchanged (empty diff against `packages/engine` and `packages/adapter-langgraph`). `SKEPTICAL_AUDITOR_PROMPT` deleted from `prompts.ts` — the YAML is the single source of truth for the auditor prompt. The original "three engine smells" were resolved by rescoping (the engine already runs any vendor as text via prompt-instruction JSON, like Vāda — no structured-output adapter work needed; #87 closed not-planned). **Follow-on:** `herald-onto-engine` task 7 — split into 7a (#102, build custom client-side tool execution into the engine — shared, Vāda in blast radius) + 7b (#103, the auditor uses a YAML-declared GitHub tool) — moves signal-gathering into the auditor agent, retiring the `extractSignals` pre-fetch.

  **(b) Multi-vendor BYOK + audit model selector — done (task 3b, June 14).** Settings → API Keys now renders `@atta/ui/account` `ProviderKeysSection` (multi-vendor; all 12 vendors except Ollama), backed by the existing `/api/keys/provider*` endpoints — `@atta/ui/account` was reused unchanged (empty diff, Vāda safe). A new `AuditModelSection` below the key list lets the user pick which model the forensic audit compiles + dispatches against; the picker is filtered to vendors the user has keys for, and the selection is persisted in two new `herald_profiles` columns (`audit_model_vendor`, `audit_model_id`). `/api/audit` now reads the per-user selection via the shared `resolveAuditCredentials` helper (`apps/herald-ai/web/src/lib/audit-key.ts`) and auto-falls-back to the YAML default (`claude-sonnet-4-20250514`) when the chosen vendor's key has been revoked — server-side guard mirrors the UI's filter so a stale selection never silently breaks an audit. The audit cache key is now scoped by `(jd, profile, vendor, modelId)` so switching models invalidates cleanly. The `hasAnthropicKey` boolean retires: `PublishToggle`, `ProfileEditor`, and `EnvoyFlow` now read `hasAnyKey` (any vendor key is sufficient to publish + run audits). D-033 whose-key logic unchanged. V1 scope: per-user default only; no per-audit override (can come later). (`herald-onto-engine` task 3b / #90.)

  **Sequencing note (from the handoff doc):** the engine migration is likely best done as one atomic PR with endpoint unification at the start of the bulk-audit work, since migrating the single-pair flow now and re-refactoring it for N×M later is wasteful — but it can also be done standalone first. The multi-vendor/model half (b) rides on the engine migration (a); decide exact PR scope when this is pulled into an iteration.

- **Endpoint unification — done (D-045, June 14).** `/api/match` and `/api/recruiter/batch` are deleted; `POST /api/audit` is the unified endpoint with `runSingleMatch` as the reusable per-pair cell. `BulkAudit` and `EnvoyFlow` both call `/api/audit` (dispatched by payload shape). Prerequisite for the matrix work below cleared.
- **N×M matrix UI.** The Bulk Audit surface accepts N CVs × M JDs and renders one report per pair (a matrix / grid of results), not the single-pair view.
- **Polymorphic inputs.** JD = link | pasted text; CV = pasted text | .md | .pdf | a candidate's published Herald profile. Wire all input kinds into the audit cell.

## Smaller / open

- **Logo** — direction is herald trumpet/horn with AI signal arcs; not yet locked.
- **Upstash Redis credentials** — `.env.local` creds expired; rate limiting degrades gracefully but isn't active. Provision at upstash.com, update `.env.local` + Vercel env for `herald.attalabs.dev`. (Operational, not a code task.)
- **`MASTER_ENCRYPTION_KEY`** must be present in Herald's env for audits to run (BYOK decrypt path).
- **Profile-audit abuse cap** — strangers running audits on a published profile spend the owner's key budget (D-033). May need a per-key rate limit or cap. Parked. (`herald-onto-engine` task 6 / #93.)
- **Deploy verification** — confirm `herald.attalabs.dev` works post-PR-#81 (new flat routes `/bulk-audit`, `/ui`, `/settings`, `/onboarding`; public profile `/[username]`).
- **/ui editor library note** — the appearance editor previews the user's library in an iframe while the surrounding chrome stays on the build-time library (correct, per D-035). If confusing, a small "previewing — not saved" hint could be added. Nicety, not a bug.
- **Adapter PRICING table missing the audit's pinned model** — the engine-backed audit defaults to `claude-sonnet-4-20250514`, which is not in `@atta/adapter-langgraph`'s PRICING table (only `claude-sonnet-4-6` is), so the engine reports estimated cost `$0.0000` for every Herald audit. Cosmetic today, but a silent `$0.00` cost readout will mislead once spend is being watched. Fix: add the pinned model to the adapter PRICING table (or pin the YAML's default to a priced model). Pre-existing, surfaced by `herald-onto-engine` task-1 smoke test; not caused by that PR. Small, shared-package (`engine`/`adapter`, Vāda in blast radius) — route it as its own tiny task, not folded into a Herald task.
- **Worktree `.env.local` auto-sync — document the standard.** New worktrees off `main` start without `.env.local` files, so apps (e.g. Vāda CMS) fail until the operator notices. A husky `post-checkout` hook (`.husky/post-checkout` + a `tools/sync-env-from-main.sh` helper) symlinks every `.env*.local` from the main checkout into a new worktree automatically, transparently — no opt-in from the agent that runs `git worktree add` (the property that matters, since agents call `git worktree add` directly). Once the hook ships, add a one-line mention to `aeg-root/process.md` (worktree-setup / pre-flight) so it's the documented standard, not tribal knowledge. Note: symlink (not copy) = single source of truth, but a tool that *writes* `.env.local` in a worktree writes through to main — fine for read-only env consumption (the normal case).

---

*Herald is NOT part of Atta — sibling product in AttaLabs, separate Clerk app (D-031). Future home `herald.attalabs.dev`.*
