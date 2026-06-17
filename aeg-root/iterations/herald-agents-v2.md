# Iteration: herald-agents-v2 — June–July 2026
Lifecycle: active

Goal: Extract forensic-hiring-auditor intelligence into `packages/agents/forensic-hiring-auditor/`
(D-046 first execution), make Herald a thin consumer, overhaul Bulk Audit UX, improve report
quality, expose Herald MCP, close housekeeping debt from two completed iterations.

Repo: daniboomerang/attalabs · Team Leader: Claude (web)

## Tasks (topology)

| # | Task | Issue | Project(s) | Depends-on | Conflicts-with |
|---|------|-------|------------|------------|----------------|
| 1 | Housekeeping — Archivists (herald-onto-engine + aeg-ui-v1) + herald backlog fix + herald-ai/aeg-project state/now rewrite | #TBD | herald, aeg | — | — |
| 2 | Agent migration — `packages/agents/forensic-hiring-auditor/` (YAML + GitHub tool + MatchReport schema + NO-FIT gate) + Herald thin consumer + Bulk Audit stays green | #TBD | herald, engine, aeg-core | 1 | — |
| 3 | Herald MCP — `herald__audit` at `herald.attalabs.dev/api/mcp` | #TBD | herald | 2 | — |
| 4 | Bulk Audit UX overhaul — matrix result rendering, report cards, cell status, overall flow | #TBD | herald | 2 | vada-agents-v2/7 |
| 5 | Report quality — research existing forensic hiring frameworks + vendor-diverse LLM review + real improvement to agent YAML/prompt with fixture-based before/after evidence | #TBD | herald, aeg-core | 2 | — |
| 6 | Abuse cap — per-owner per-day rate limit on public profile audits (D-033 follow-up, #93) | #TBD | herald | 2 | — |
| 7 | Deploy verification — `herald.attalabs.dev` Phase 2 flows (avatar, CV upload, bio save, onboarding, Bulk Audit with real BYOK) | #TBD | herald | 2 | — |

## Planner's rationale

### Task 1 — Housekeeping
**Boundary:** Run Iteration Archivist (roles/iteration-archivist.md) for `herald-onto-engine`
and `aeg-ui-v1`. Rewrite `apps/herald-ai/aeg-project/state.md` (last updated June 2 — describes
pre-engine product, references deleted `/api/match` route, old stack) and `now.md` (still points
at Phase 3 brief authoring as next action). Fix `apps/herald-ai/specs/herald-backlog.md` — stale
items presented as todo (N×M matrix, polymorphic inputs, engine migration are all done), missing
D-046, missing report quality task, PRICING table item resolved by PR #132. No code changes.
**Sizing:** Pure doc writes and forge queries. One PR. Single verification story (state docs
describe current reality). Bounded file surface (4 files + iteration archival moves).
Single failure mode (archivist finds open task PRs — cannot proceed). Passes all four tests.
**Project(s) + blast radius:** herald (state docs), aeg (iteration files moved to completed/).
No shared packages touched.
**Dependency rationale:** No dependencies. Must run first — the Planner readiness gate requires
previous iterations on each product to be in `aeg-root/iterations/completed/` before new
iteration planning can proceed. This task satisfies that gate for herald and aeg.
**Traps to avoid:** Do NOT attempt to dispatch herald-agents-v2 task 2 before this merges —
the Planner gate requires clean close-out. Do NOT invent retrospective content; assemble only
from merged PR summaries, decision log, and forge facts.
**Suggested agent-class:** mid — doc writing, forge queries, markdown only. No architecture.
**Stop-and-escalate:** If either `herald-onto-engine` or `aeg-ui-v1` has open task PRs not
yet merged, STOP — cannot archive an incomplete iteration.

---

### Task 2 — Agent migration
**Boundary:** Create `packages/agents/forensic-hiring-auditor/` containing: (a) the YAML
(moved from `apps/herald-ai/web/yamls/herald-auditor.yaml`); (b) `fetch_github_signals`
tool implementation (moved from Herald route, declared in YAML as a custom tool per D-047 —
retiring the `extractSignals` pre-fetch); (c) `MatchReport` Zod schema + validator; (d)
NO-FIT hard-requirement gate; (e) `parseMatchReport`; (f) a clean `run({ profile, jd,
providerKeys })` export. Herald's `/api/audit` route becomes a thin consumer: message
construction, BYOK resolution, caching, rate limiting, rendering — nothing else. Bulk Audit
must stay green end-to-end against the new package. This is D-046's first execution.
NOT in scope: new Bulk Audit UI (task 4), MCP surface (task 3), report quality (task 5),
Vāda YAML migration (vada-agents-v2).
**Sizing:** Large but bounded. One PR. One verification story (Bulk Audit returns MatchReport
via the new package). One agent can hold it (package extraction + route rewire is one concern).
Bounded surface (new package + herald route). Single failure mode (package import breaks →
audit fails). Passes all four tests.
**Project(s) + blast radius:** herald (primary consumer, route rewired), engine (in blast
radius — must re-verify, though no engine files change), aeg-core (YAML location changes —
parser must still find files; verify `parseLedger` and `parseIteration` still pass).
**Dependency rationale:** Depends on task 1 because (a) the Planner readiness gate requires
clean close-out before code work begins, (b) `herald-ai/aeg-project/state.md` should reflect
the current architecture before it's changed again.
**Traps to avoid:** Do NOT use `loadYamlFromCatalog` with a hardcoded app path — it will break
when the YAML moves to `packages/agents/`. Use `loadFlow(readFileSync(...))` with an explicit
path. Do NOT put `MatchReport` schema in Herald app code — it belongs in the agent package.
Do NOT inject tool handlers from the consumer route — the agent package registers its own
`fetch_github_signals` handler internally and calls `runAnthropicCustomToolLoop` (D-047).
Do NOT touch `packages/engine` or `packages/adapter-langgraph` shared contracts — the
agent package consumes them, not modifies them.
**Suggested agent-class:** high — multi-package extraction, shared blast radius, architectural
judgment required on the package boundary.
**Stop-and-escalate:** If making the agent self-contained requires changing `@atta/engine` or
`@atta/adapter-langgraph` shared contracts (not just consuming them), escalate
`severity:strategy` — that is a separate task with its own blast radius and planning pass.

---

### Task 3 — Herald MCP
**Boundary:** Expose `herald__audit({ profile, jd })` as an MCP tool at
`herald.attalabs.dev/api/mcp`. Herald owns auth, BYOK key resolution, rate limiting.
Caller supplies inputs only; agent internals are opaque. Reuses the existing `/api/audit`
route internals via `packages/agents/forensic-hiring-auditor`. NOT in scope: Vāda MCP
changes, billing, external auth for third-party callers.
**Sizing:** Additive. One PR. Single verification story (MCP call returns MatchReport).
Bounded to Herald's MCP route file. Passes all four tests.
**Project(s) + blast radius:** herald only. No shared package changes.
**Dependency rationale:** Depends on task 2 — the MCP tool calls the agent package which
must exist and be wired into Herald's route first.
**Traps to avoid:** Do NOT expose agent internals (YAML content, tool handler implementations,
MatchReport schema internals) via the MCP surface — the MCP tool is the product API.
The MCP surface is `{ profile, jd }` in, `MatchReport` out. Follow Vāda's hosted MCP
pattern (`apps/vada-ai/web/src/app/api/mcp/route.ts`) as the reference implementation.
**Suggested agent-class:** mid — additive route, existing Vāda MCP pattern to follow.
**Stop-and-escalate:** If Herald's Clerk auth model makes unauthenticated or bearer-authed
MCP calls structurally impossible without a Herald API key system (like Vāda's `vada_*` keys
in `api_keys` table), escalate `severity:strategy` before building — that is a separate
decision about Herald's auth model.

---

### Task 4 — Bulk Audit UX overhaul
**Boundary:** Redesign the Bulk Audit result surface. Better matrix rendering, result cards,
report display, cell status indicators (running/done/failed), expandable report inline, overall
flow polish. Primary targets: `apps/herald-ai/web/src/components/audit/BulkAudit.tsx` and
`ReportView`. Input controls (confirmed fully implemented — JD: text/URL; CV: text/md/pdf/
profile) are NOT in scope. API and `MatchReport` type are unchanged. Pure UI work.
**Sizing:** UI-only. One PR. Single verification story (matrix renders correctly end-to-end).
Bounded to herald UI components. Passes all four tests.
**Project(s) + blast radius:** herald only. No shared package changes.
**Dependency rationale:** Depends on task 2 — UI calls the agent package via the route;
must be stable before iterating on the display layer.
**Conflicts-with:** vada-agents-v2 task 7 (SmartTextInput extraction from Herald into
`@atta/ui`). Both touch Herald's audit input components. Must not run in parallel —
vada-agents-v2 task 7 must merge first, then this task picks up the extracted component.
**Traps to avoid:** Do NOT change the API contract or the `MatchReport` type in this task.
Do NOT touch `packages/agents/forensic-hiring-auditor` — those live in the agent package.
UI only.
**Suggested agent-class:** mid — component work, no architecture.
**Stop-and-escalate:** If the desired UX requires a new API shape (e.g. streaming per-cell
results from the route), escalate `severity:strategy` — that touches the route and the agent
package and requires a separate brief.

---

### Task 5 — Report quality
**Boundary:** Research existing forensic hiring frameworks and evaluation criteria (read
external sources, consult vendor-diverse LLMs — Gemini, Grok, DeepSeek, ChatGPT — on what
a real-quality forensic match report must contain). Produce scored evaluation of current
`forensic-hiring-auditor` output against real CV+JD fixtures. Improve: update the agent's
system prompt in the YAML, improve signal weighting, improve interview hook extraction.
Deliverable: improved `packages/agents/forensic-hiring-auditor/` YAML + a test fixture set
(`tests/fixtures/`) with before/after evidence. NOT in scope: `MatchReport` schema changes,
NO-FIT gate changes, UI changes.
**Sizing:** Research + bounded prompt engineering. One PR (improved YAML + fixtures +
before/after evidence). Single verification story (side-by-side fixture comparison shows
measurable improvement). Bounded (YAML + fixtures). Single failure mode (prompt regression).
**Project(s) + blast radius:** herald (primary, YAML in agent package), aeg-core (if YAML
schema needs extension — unlikely but in blast radius). Vāda in blast radius only if shared
adapter behavior changes — this task must NOT touch the adapter.
**Dependency rationale:** Depends on task 2 — the YAML lives in the agent package after
migration. Cannot improve the prompt before the package exists.
**Traps to avoid:** Do NOT declare the task done based on subjective judgment — must have
fixture-based before/after evidence. Do NOT change `MatchReport` schema or the NO-FIT gate
in this task — those require their own blast-radius pass. Prompt and YAML content only.
Do NOT simulate reviewer voices — consult real vendor-diverse models with real prompts.
**Suggested agent-class:** high — research synthesis, prompt engineering, evaluation design.
**Stop-and-escalate:** If improving quality requires `MatchReport` schema changes (new fields,
changed grades), escalate `severity:strategy` — that has a blast radius across Herald's UI
and the MCP surface.

---

### Task 6 — Abuse cap
**Boundary:** Per-owner per-day rate limit on public profile audits where a stranger audits
a published profile and spends the profile owner's BYOK key budget (D-033 known gap, logged
as #93). Server-side guard on the existing `/api/audit` single shape (profile audit path).
NOT in scope: Bulk Audit rate limiting (already has per-IP Upstash cap), billing, key
revocation. Uses existing Upstash Redis infrastructure.
**Sizing:** Small. One PR. Additive server-side guard. Bounded (route + Redis key pattern).
**Project(s) + blast radius:** herald only.
**Dependency rationale:** Depends on task 2 — the audit path runs through the agent package
after migration; the cap logic wraps that call.
**Traps to avoid:** Do NOT apply the cap to the Bulk Audit (batch) path — that is
authenticated and the user spends their own key (not an abuse surface). Public profile
single-shape path only. Use a per-owner key pattern (not per-IP) so the cap protects the
owner regardless of which IP the recruiter uses.
**Suggested agent-class:** mid — additive server guard, existing Upstash pattern.
**Stop-and-escalate:** If Upstash Redis creds are still expired at task time (manual work
item in `now.md`), STOP and flag — the cap cannot be tested or deployed without Redis.

---

### Task 7 — Deploy verification
**Boundary:** Verify `herald.attalabs.dev` end-to-end against current main: Phase 2 flows
(avatar upload → URL saved → renders on Envoy; CV upload → Download CV button works; bio save
→ reflects on Envoy), onboarding second user, public profile render, Bulk Audit with real
BYOK key returning a full report (not the partial fallback). Document findings. Fix any broken
flows found IF the fix is a one-line correction — if a fix requires real code work, open a
follow-up Issue and document it in the PR body.
**Sizing:** Verification + small fixes. One PR (findings doc + any tiny fixes).
**Project(s) + blast radius:** herald only.
**Dependency rationale:** Depends on task 2 — the audit path is rewired; must verify
production works after the agent migration lands. Must also come after #132 (Herald audit
truncation fix) is confirmed live on production — it merged to main and Vercel auto-deploys,
so it should be live, but verify.
**Traps to avoid:** Do NOT conflate deploy verification with feature work. Document broken
flows, open Issues for them, do not expand scope. The Drizzle constraint naming mismatch
(`herald_profiles_username_key` vs `herald_profiles_username_unique`) can be fixed here if
encountered during a `drizzle-kit push` run — it is a one-line schema annotation fix.
**Suggested agent-class:** mid — verification script, production smoke test.
**Stop-and-escalate:** If production deploy is broken in a way that blocks all verification
(build failure, env var missing, app not booting), escalate to Principal immediately.

## Backlog (this iteration, not yet dispatched)

- Per-audit (one-off) vendor + model override on Bulk Audit — deferred post-V1, not in scope.
- Herald Phase 4 (recruiter as distinct B2B surface) — future, not in scope.

## Cross-iteration dependencies

- Task 1 here must merge before herald-agents-v2 task 2 can dispatch AND before
  vada-agents-v2 task 1 can dispatch (Planner readiness gate on both).
- Task 4 here conflicts-with vada-agents-v2 task 7 (SmartTextInput extraction). Serialize:
  vada-agents-v2/7 merges first (extract to @atta/ui), then herald-agents-v2/4 consumes it.
- Task 2 here must merge before vada-agents-v2 task 1 (Vāda YAML migration follows the
  package structure established here).
