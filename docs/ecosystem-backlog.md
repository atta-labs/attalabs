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

## Infrastructure / hygiene

- **Atta hub structural work** — `apps/atta-ai` hub: 3 sections (Vāda Teams blurb, Atta Engine, Ecosystem). Less urgent. Polish fixes pending on `feat/atta-hub-redesign` (tagline wrapping, OWNERSHIP label alignment).
- **DB schema management** — when `@atta/db` consolidates further, decide `db:push` vs tracked migrations. No urgency.
- **4th `sdkShape` adapter branch — decide per case.** Current branches: `anthropic`, `google-genai`, `openai-compat`. When a vendor's SDK shape genuinely diverges (streaming-only non-OpenAI shape, AWS SigV4, fundamentally different request shape): add a 4th branch (when latency matters) or proxy via OpenRouter (when it doesn't). Not blocking.
- **Cross-cutting stale skills** — `.claude/skills/atta-adapter-langgraph/SKILL.md` and `.claude/skills/model-picker/SKILL.md` may reference pre-PR-31 vendor routing (`RouteProvider`/`PROVIDERS`); verify and update on next touch.

---

*Product-specific backlogs live at `apps/<product>/specs/<product>-backlog.md`. This file is for items that span products or concern the ecosystem / AEG itself.*
