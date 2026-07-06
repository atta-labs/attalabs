---
sidebar_title: "Template: Issue rationale"
---
# Template — Issue rationale (the Planner's eight fields)

**Copy the block below the divider into the task Issue's body and replace every `[…]` placeholder with real content.** This is the D-078 rationale grammar that the ring-0 creation gate (`packages/aeg-core/bin/open-issue.ts`) and `verify-coherence`'s R1 check parse: all eight producer fields of the `aeg-root/contracts/planner-brief.md` contract, in bold-inline form (`**<Field>** — …`; the `### <Field>` heading form is equally valid). The contract and `aeg-root/roles/planner.md` § "The Planner's rationale" remain the source of truth for what each field must *contain* — this file packages the shape; it does not lower the reasoning bar. A field filled with boilerplate is still a malformed rationale, even though it parses.

---

[iteration-slug] [n] — [task title, repeated from the Issue title]

## Planner's rationale

**Boundary** — [BOUNDARY — what this task is and, crucially, what it is NOT: what was deliberately split out, where the edges sit. Make the in/out sets concrete enough that the Brief Author can bound a file surface from them.]

**Sizing** — [SIZING — state that the task passed the four "too big?" tests (one verification story; one agent can hold it; bounded file surface; single failure mode) — or how a larger candidate was split when it failed one. Name the single verification story.]

**Project(s) + blast radius** — [PROJECTS + BLAST RADIUS — every project touched, resolving against `packages/governance/projects.md`. For shared-package changes: which consumers are in the blast radius, and whether each needs re-verification only or actual edits.]

**Dependency rationale** — [DEPENDENCY RATIONALE — *why* each `depends-on` / `conflicts-with` edge exists, not just that it does. "No `depends-on`; no `conflicts-with`" is a valid value — state it explicitly, with the check that established it.]

**Traps to avoid** — [TRAPS — concrete pitfalls the dig surfaced that would otherwise bite the executing agent, phrased as "do NOT do X; do Y instead". Highest-value field — never generic advice.]

**Suggested agent-class** — [high | mid | fast — with a one-line reason tied to this task's real difficulty, e.g. "mid — mechanical repackaging, but the changes touch live gates and need round-trip proof".]

**Stop-and-escalate** — [STOP-AND-ESCALATE — the conditions under which the executing agent must stop and escalate rather than improvise, e.g. "if making X work requires changing shared contract Y, escalate severity:strategy".]

**Docs to keep coherent** — [DOCS — which specs/skills/docs this task will make incoherent and must update, derived from reading them (D-058), not from memory — or state "No docs touched." explicitly.]

## Origin

[ORIGIN — where this task came from: Principal-directed, backlog item, incident follow-up — with dates and the Issue/PR references that motivated it.]

**Tier:** [0 | 1 | 3]
**Project:** [project(s), comma-separated, matching the blast radius above]
