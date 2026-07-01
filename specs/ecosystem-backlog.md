# Ecosystem — backlog

**Out of the AEG flow.** Cross-cutting, infrastructure, and AEG-**model** items that don't belong to a single product. Reference the Planner reads when choosing the next iteration slice; the flow never operates on it.

## AEG-model hardening — punch-list from the `aeg-self-enforcement` session (2026-07-01)

Live-fire findings while dispatching D-069's own tasks. All touch `aeg-root/` (the model), so they live here, not in `apps/aeg`.

- **Ledger-ownership fix (flagged 4× by reviewers).** Read-only / chat roles (Reviewer, Security, Planner, Brief Author) *cannot* self-append their token-ledger row — they don't edit files, and it's not their branch. Parallel Developer rows also collide on the shared `tokens.md` (hit concretely: #255↔#258). **Fix:** no role writes its own ledger row on a task branch; the **Archivist records all rows post-merge** at close-out (roles report tokens in their PR/report). Edit `roles/{reviewer,security,planner,archivist}.md`, `brief-authoring` skill, `iterations/README.md` §12.
- **Reviewers must write nothing to disk (dirty-`main` incident).** A dispatched reviewer appended a ledger row to `aeg-coherence-v1.tokens.md` **in the main checkout** and left it uncommitted → a dirty `main` working tree a user could stumble on. Root causes: (1) the ledger bug above; (2) reviewers are meant to be read-only (verdicts = PR comments only) but this one edited a file; (3) the dispatched agent ran in the **main checkout, not an isolated worktree**. T9's guardrails block *committing* to main and *merging* red PRs but **not a dirty working tree**. **Fix:** reviewers write only PR comments; dispatched agents run only in an isolated worktree (never the main checkout); consider making a dirty `main` structurally impossible for a dispatched agent.
- **Grandfather the lifecycle checks (L2/L3), not just A1/A2/A3.** `COHERENCE_ENFORCED_FROM=2026-07-01` grandfathers the dated A-checks but not L2 (`premature-archive`) — so the oracle still reds on legacy herald #103 (archived iteration with a stale open issue). Extend the cutoff to L2/L3 (skip pre-cutoff iterations) or resolve #103.
- **`executor-protocol` should chain to `roles/developer.md`.** A dispatch that says "read executor-protocol" gives execution discipline but not the Developer role's entry gate / PR-canonical-form / contract — under-specifying the role (bit T9). One line: `executor-protocol` opens with "read `roles/developer.md` first."

This is the **monorepo unit's** plan, the ecosystem-level counterpart to each project's `apps/<project>/specs/<project>-backlog.md`. Convention (D-037, D-041): a unit's *plan* lives in its `specs/`; a unit's *flow + governance* lives in the root `aeg-root/` (model, exists once); its *living state* lives in its `aeg-project/`. The root `specs/ecosystem-backlog.md` is the monorepo's plan; `aeg-root/` + `aeg-project/` (root) are the monorepo's AEG.

Migrated from the retired global `roadmap.md` (June 3, 2026). Moved from `docs/ecosystem-backlog.md` to `specs/ecosystem-backlog.md` (June 10, 2026 — D-037).

---

## AEG the model — flow improving itself

These improve **AEG the model** (the governance/flow constitution at repo-root `aeg-root/`) — distinct from **AEG the product** (the UI + `aeg.sh`), whose plan now lives at `apps/aeg/specs/aeg-backlog.md` (D-038). These items touch the role docs, the manual-flow, and the enforcement layer — not the product.

- **Wire entry gates into the role docs.** Add the `PRECONDITIONS` block (self-locating "is this my phase? / is my input well-formed?") into `roles/developer.md`, `reviewer.md`, `security.md`, and the Brief Author + Planner sections of `roles/team-leader.md`, so agents auto-self-locate on invocation. Add the optional `Ticket:`/`Project:` fields to `.claude/skills/brief-authoring/SKILL.md` + brief template. Add the per-role state-write steps to each done-checklist.
- **Formalize `roles/archivist.md`** — the close-out checklist (merged-PR precondition, issue closed, branch deleted, decision logged if Tier 3, changelog appended, docs updated, worktree flagged, provenance block posted per D-030).
- **Build the Planner mode** — the Team Leader mode that produces an iteration from intent + a backlog slice, with declared dependency/conflict edges.
- **Build dispatch-gate enforcement** — the `depends-on` and `conflicts-with` gates. Manual preconditions first (trusted), then mechanical enforcement in Cetana at `dispatch` (this is the line between "watched pilot" and "team you don't babysit").
- **Reframe/retire `now.md`** — global `now.md` partly overlaps the iteration's active tasks; decide whether it's subsumed once iterations are live. Not urgent.

> **AEG the product (the UI + `aeg.sh` scaffolder) moved out of this backlog (D-038).** Its plan lives at **`apps/aeg/specs/aeg-backlog.md`**; its architecture at `apps/aeg/specs/aeg-app-architecture.md`. The product is the designated first real iteration. The `aeg.sh` neutral scaffolder (a former D-029 build follow-up) moved there too.

### Spec-integrity chain (designed June 5; sequenced, not started)

Two linked items. **Order matters: 1 unlocks 2.** Neither is the AEG product; neither is urgent.

1. **Spec refresh-and-ratify pass — start with Vāda.** Most product specs are substantive but carry no D-005 `Status: ratified` block, and some have drifted (e.g. `vada-product-spec.md` is dated April 2026, references the old `vada.ai` domain / `Next.js 16`). Refresh a product's specs to current shipped reality, then stamp the D-005 metadata block (`Status: ratified` / `Ratified on:` / `Ratified by:` / `Ratifies via: D-###`). This is what gives an automated check a spec it's licensed to treat as authoritative. **Unlocks #2.**
2. **Integrity Reviewer** (iteration-close role; name locked June 5). A new role/phase that runs once per iteration, post-merge, per touched product (the iteration file already lists `Product(s)` per task): does a **deep coherence read** of each product's whole spec vs the merged product state — "do these N merged PRs, together, leave the product honest against its spec?" Distinct from the per-PR Reviewer (too low, sees one diff) and from execution QA (does it *run* — separate future/tool-layer concern). Output is **advisory**: clean bill, a §11 Contradiction entry (which already blocks new Tier 3 work on that subsystem until resolved), or a spec-update task for the next iteration. Holds **no copied specs** — reads the live spec by path. **Graceful degradation:** deep read only for `ratified` specs; for unratified specs it does the cheap check (did a spec-touching change ship without a spec update?) and reports "spec not ratified — deep coherence not assessable." So it can ship before #1 completes, running cheap, and sharpens per-project as specs get stamped. **Depends on #1 for its real value.** Type-1-sized (new role + new phase) — deserves a written spec and likely a reviewer round, same rigor as D-029.

Related future item (not in the chain): a **regulation → AEG-mechanism mapping doc** (EU AI Act high-risk / SLSA L3 / NIST / SOC 2) turning the provenance block (D-030) into compliance evidence. Requires primary-source verification before action.

## Infrastructure / hygiene

- **`@atta/ui` TopBar hard-binds Clerk — guard/unbind `useUser()`.** TopBar calls `useUser()` unconditionally, so any consumer throws without a `ClerkProvider` ancestor — forcing even a no-auth app to depend on `@atta/auth` and require Clerk env just to boot. Surfaced June 14 by AEG Studio's shell (PR #108): a "local, no-auth" infra tool now needs Clerk env to start. D-036 added `isSignedIn`/`accountMenu` props for exactly this signed-out case but never unbound the hook, so the props alone don't deliver a Clerk-free render. Fix: guard the hook so TopBar renders correctly with no `ClerkProvider` present (the signed-out shape). Shared `@atta/ui` change → **Vāda + Herald in the blast radius** (both re-verify), so it's a deliberate task, not an inline fix. Benefits every app; removes a Clerk coupling from infra tooling. (Until done, Studio carries an `@atta/auth` `AuthProvider` workaround + needs Clerk env — accepted for Studio V1.)
- **Atta hub structural work** — `apps/atta-ai` hub: 3 sections (Vāda Teams blurb, Atta Engine, Ecosystem). Less urgent. Polish fixes pending on `feat/atta-hub-redesign` (tagline wrapping, OWNERSHIP label alignment).
- **DB schema management** — when `@atta/db` consolidates further, decide `db:push` vs tracked migrations. No urgency.
- **4th `sdkShape` adapter branch — decide per case.** Current branches: `anthropic`, `google-genai`, `openai-compat`. When a vendor's SDK shape genuinely diverges (streaming-only non-OpenAI shape, AWS SigV4, fundamentally different request shape): add a 4th branch (when latency matters) or proxy via OpenRouter (when it doesn't). Not blocking.
- **Cross-cutting stale skills** — `.claude/skills/atta-adapter-langgraph/SKILL.md` and `.claude/skills/model-picker/SKILL.md` may reference pre-PR-31 vendor routing (`RouteProvider`/`PROVIDERS`); verify and update on next touch.

---

*Product-specific backlogs live at `apps/<product>/specs/<product>-backlog.md` (including `apps/aeg/specs/aeg-backlog.md`). This file is for items that span products or concern the ecosystem / AEG **the model** itself.*
