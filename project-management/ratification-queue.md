# Ratification Queue

Append-only record of decisions and Tier 3 merges awaiting Principal ratification. Items are appended by the Team Leader before a ratification window and marked resolved after the Principal acts.

---

## Format

```
### [D-NNN or PR title] — [one-line description]
- Type: [1/2] | Tier: [0/1/3] | Authored: [YYYY-MM-DD]
- Decision log: [link or "decisions.md D-NNN"]
- Why it needs ratification: [one sentence]
- Deadline context: [any urgency or downstream block]
- Status: PENDING
```

When resolved, add below the entry:
```
- Resolved: [YYYY-MM-DD] | Principal action: [ratified / rejected / deferred] | Notes: [if any]
- Status: RESOLVED
```

---

## Pending items

### PR #49 — D-033 docs cleanup: Vāda specs + skill files + PM appends for v2 schema + v2 naming alignment

- Type: 2 | Tier: 3 | Authored: 2026-05-13
- PR: https://github.com/daniboomerang/atta.ai/pull/49
- Branch: `docs/d033-cleanup-v2` (from main at `311a743`)
- Decision log: no new decisions logged in this PR; consequences of `vada-decisions.md` D-033, D-034 and global `decisions.md` D-025 are reflected in docs.
- Files touched (9): `apps/vada-ai/specs/yaml-schema-reference.md` (full v2 rewrite), `apps/vada-ai/specs/vada-state.md` (Phase 13 + 14 appended, OQ-H + OQ-I added, calibration notes), `apps/vada-ai/specs/generic-flow-refactor.md` (status → ratified+shipped; 5 pragmatic deviations captured), `apps/vada-ai/specs/vada-decisions.md` (D-034 entry appended, D-033 status updated, D-025 log-overlap note), `.claude/skills/vada-architecture/SKILL.md` (full v2 rewrite + v2 naming framing), `.claude/skills/vada-yaml-authoring/SKILL.md` (full v2 rewrite), `.claude/skills/atta-engine/SKILL.md` (full v2 rewrite), `project-management/changelog.md` (4 entries prepended: PR #41, #46, #47, #48), `project-management/now.md` (in-flight refreshed, "Currently active work" updated).
- Why it needs ratification: Tier 3 by impact (touches ratified specs `vada-state.md`, `generic-flow-refactor.md`, `vada-decisions.md`, plus three skill files and the global PM appends `changelog.md` + `now.md`). Type 2 because no new architectural decisions are introduced — the PR documents the consequences of decisions already ratified (D-033, D-034, global D-025).
- Out of scope (deliberately deferred to "patch when touched for other work" per `roadmap.md` Stale specs): `vada-product-spec.md`, `vada-product-recognitions.md`, `vada-reviewers-spec.md`, `vada-teams-catalog/*`, `mcp-architecture.md`, `vada-mcp-server/SKILL.md`, `atta-adapter-langgraph/SKILL.md`, `model-picker/SKILL.md`, `atta-teams/SKILL.md`.
- Deadline context: blocks two follow-ups — (a) `atta-engine/SKILL.md`, `vada-yaml-authoring/SKILL.md`, `vada-architecture/SKILL.md` still teach v1 vocabulary if not merged, which misleads any agent dispatched against the v2 codebase; (b) `project-management/now.md` and `changelog.md` are out of sync with main reality (D-033 + D-034 + v2 naming shipped May 12-13 with no PM updates).
- Status: PENDING

---

## Resolved items archive

None yet.
