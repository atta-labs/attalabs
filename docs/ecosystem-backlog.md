# Ecosystem — backlog

**Out of the AEG flow.** Cross-cutting, infrastructure, and AEG-itself items that don't belong to a single product. Reference the Planner reads when choosing the next iteration slice; the flow never operates on it.

Migrated from the retired global `roadmap.md` (June 3, 2026).

---

## AEG build-out (the flow improving itself)

These make AEG production-ready beyond the watched two-person pilot. Defined in PR #80's docs (`aeg-manual-flow.md`, `iterations/README.md`); not yet built.

- **Wire entry gates into the role docs.** Add the `PRECONDITIONS` block (self-locating "is this my phase? / is my input well-formed?") into `roles/developer.md`, `reviewer.md`, `security.md`, and the Brief Author + Planner sections of `roles/team-leader.md`, so agents auto-self-locate on invocation. Add the optional `Ticket:`/`Product:` fields to `.claude/skills/brief-authoring/SKILL.md` + brief template. Add the per-role state-write steps to each done-checklist.
- **Formalize `roles/archivist.md`** — the close-out checklist (merged-PR precondition, issue closed, branch deleted, decision logged if Tier 3, changelog appended, docs updated, worktree flagged).
- **Build the Planner mode** — the Team Leader mode that produces an iteration from intent + a ticket slice, with declared dependency/conflict edges.
- **Build dispatch-gate enforcement** — the `depends-on` and `conflicts-with` gates. Manual preconditions first (trusted), then mechanical enforcement in Cetana at `dispatch` (this is the line between "watched pilot" and "team you don't babysit").
- **Reframe/retire `now.md`** — global `now.md` partly overlaps the iteration's active tasks; decide whether it's subsumed once iterations are live. Not urgent.

### Spec-integrity chain (designed June 5; sequenced, not started)

Three linked items. **Order matters: 1 unlocks 2.** None is the AEG UI (still the first build iteration); none is urgent.

1. **Spec refresh-and-ratify pass — start with Vāda.** Most product specs are substantive but carry no D-005 `Status: ratified` block, and some have drifted (e.g. `vada-product-spec.md` is dated April 2026, references the old `vada.ai` domain / `Next.js 16`). Refresh a product's specs to current shipped reality, then stamp the D-005 metadata block (`Status: ratified` / `Ratified on:` / `Ratified by:` / `Ratifies via: D-###`). This is what gives an automated check a spec it's licensed to treat as authoritative. **Unlocks #2.**
2. **Integrity Reviewer** (iteration-close role; name locked June 5). A new role/phase that runs once per iteration, post-merge, per touched product (the iteration file already lists `Product(s)` per task): does a **deep coherence read** of each product's whole spec vs the merged product state — "do these N merged PRs, together, leave the product honest against its spec?" Distinct from the per-PR Reviewer (too low, sees one diff) and from execution QA (does it *run* — separate future/tool-layer concern). Output is **advisory**: clean bill, a §11 Contradiction entry (which already blocks new Tier 3 work on that subsystem until resolved), or a spec-update task for the next iteration. Holds **no copied specs** — reads the live spec by path. **Graceful degradation:** deep read only for `ratified` specs; for unratified specs it does the cheap check (did a spec-touching change ship without a spec update?) and reports "spec not ratified — deep coherence not assessable." So it can ship before #1 completes, running cheap, and sharpens per-product as specs get stamped. **Depends on #1 for its real value.** Type-1-sized (new role + new phase) — deserves a written spec and likely a reviewer round, same rigor as D-029.
3. **Amend PR #83** (`feat/aeg-provenance-verifier-observe`, open, unratified). The D-030 spec-conformance check currently makes a spec **contradiction** a BLOCKER — wrong, because specs are mostly unratified/out-of-flow, so a stale spec could veto correct code. **Demote spec-conformance to advisory:** a `severity:strategy` finding/escalation, never a merge BLOCKER. (Provenance block and observe mode in #83 are fine as-is.) Edit `roles/reviewer.md`, `state-machine.md` §3, and the D-030 entry before ratifying #83.

## Infrastructure / hygiene

- **Atta hub structural work** — `apps/atta-ai` hub: 3 sections (Vāda Teams blurb, Atta Engine, Ecosystem). Less urgent. Polish fixes pending on `feat/atta-hub-redesign` (tagline wrapping, OWNERSHIP label alignment).
- **DB schema management** — when `@atta/db` consolidates further, decide `db:push` vs tracked migrations. No urgency.
- **4th `sdkShape` adapter branch — decide per case.** Current branches: `anthropic`, `google-genai`, `openai-compat`. When a vendor's SDK shape genuinely diverges (streaming-only non-OpenAI shape, AWS SigV4, fundamentally different request shape): add a 4th branch (when latency matters) or proxy via OpenRouter (when it doesn't). Not blocking.
- **Cross-cutting stale skills** — `.claude/skills/atta-adapter-langgraph/SKILL.md` and `.claude/skills/model-picker/SKILL.md` may reference pre-PR-31 vendor routing (`RouteProvider`/`PROVIDERS`); verify and update on next touch.

---

*Product-specific backlogs live at `apps/<product>/specs/<product>-backlog.md`. This file is for items that span products or concern the ecosystem / AEG itself.*
