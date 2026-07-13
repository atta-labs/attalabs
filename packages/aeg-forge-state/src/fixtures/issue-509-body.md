Project: vinaya

## Planner's rationale

**Boundary** — The landing page per the settled design: hero is a real refusal replaying (the #474 review-gate incident — seven of nine merged unreviewed — block → recovery prompt → self-correct → merge); the recognition line ("An agent will tell you it followed the rules. It will be sincere. It will be wrong."); three corpses each cited by real PR number; the identity-vs-syntax waiver panel; the live dogfood strip (open PRs, undispatched work, real red via StateSource). Subhead relocated to the merge/forge layer (guarantee is at the merge, not "every agent at every layer"). /known-limits in the top nav, in red. CTA `npx vinaya init` links to the known-limits bullet stating it does not exist yet. NOT inventing capability. NOT the still-frame-of-the-rings link to /how-it-works originally scoped here — dropped in the 2026-07-13 Amendment below so this task no longer depends on /how-it-works existing; that link is now explicit fast-follow scope once /how-it-works (task 3, #508) ships, not a promise this task makes.

**Sizing** — Passes the four tests. One verification story: the page renders, the refusal animation runs, every cited PR resolves, the dogfood strip reads live state, and the subhead makes no claim the Portability section of enforcement.md contradicts. Bounded: the page. Single failure mode: an unverifiable claim ships.

**Project(s) + blast radius** — vinaya.

**Dependency rationale** — `Depends-on: 1`. `Conflicts-with: —`. Task 1 (#507, design assets) is already merged, so this dependency is trivially satisfied — kept for provenance, not as a live blocker. The prior `Depends-on: 2` edge (on /how-it-works) is removed in the 2026-07-13 Amendment below along with the scope that motivated it.

**Traps to avoid** — The subhead must not overclaim: the guarantee is the merge, not every agent at every layer (the forge-command gate is harness-dependent — enforcement.md Portability; D-104 defers the shim). Corpses cite real PRs (#474, #380, #364-area) — a fabricated incident on the landing page is the worst place for one; verify each resolves before shipping. The CLI does not exist — the CTA is honest or it is a lie. COLOURS/tokens: same ui-theme-tokens constraint as task 3 — CSS variables / shadcn tokens only, no raw hex. Do NOT add a still-frame /how-it-works link back in — that scope was deliberately dropped so this task has no dependency; adding it back reintroduces the removed edge.

**Suggested agent-class** — high (copy sensitivity + live data).

**Stop-and-escalate** — If a cited incident PR cannot be verified on the forge, stop — do not ship an unverifiable claim on the landing page.

**Docs to keep coherent** — apps/vinaya/specs/vinaya-spec.md (pages table + Positioning block: the relocated subhead + slogan replace the D-088 strings, a Principal-owned copy edit; note the still-frame /how-it-works link is fast-follow, not this task). Surfaces: apps/vinaya/web/**, apps/vinaya/sources/**.

## Origin

Principal-directed, 2026-07-10. The acquisition surface.

**Amendment (2026-07-13, Planner) — renumbered task 3 → 2, and the closing still-frame link to /how-it-works dropped from scope, at Principal direction (landing ships first).** Originally this task depended on /how-it-works (task 2 at the time, #508) existing, purely because of one closing UI element — a still frame of the rings linking to /how-it-works. The Principal wants the landing page dispatched first rather than serialized behind the diagram page. Since the only real coupling was that one link, the fix is to drop it from this task's scope (not fake the dependency away) — it becomes explicit fast-follow scope for whenever /how-it-works ships. With the link gone, this task's only dependency is task 1 (#507, design assets), already merged — genuinely no blocker. Renumbered `[vinaya-pages-v1] 3` → `[vinaya-pages-v1] 2` in the title to reflect the new dispatch order; /how-it-works (#508) is renumbered `2` → `3` in the same action (see its own Amendment). No other task's rationale changes — #533 (branding) and #544 (Studio prod gate) were already independent of both.

**Tier:** 1
**Project:** vinaya

