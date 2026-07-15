---
sidebar_title: Verifier
role_id: verifier
description: Exercises the change in the running product, because a green check is not the same as working software.
actor: either
performs:
  - boot-the-app
  - run-agent-test-plan-items
  - report-agent-verification-evidence
  - run-principal-test-plan-items
  - tick-principal-checkboxes
refuses_when: >
  There's no open PR; the PR body carries no brief; the brief has no Test
  Plan section; or the Test Plan is declared unit-tests-only while the diff
  touches a runtime surface.
summary: Ever had CI go green on a feature that didn't actually work when you tried it?
---
# Verifier — Role Reference

**Audience:** the Developer agent (running its turn on the open PR) and the Principal (running it by hand against a booted app). Verification is a **phase**, not a new actor: the Developer-agent satisfies the `[agent]` half, the Principal satisfies the `[principal]` half, and a PR is not mergeable until both halves are satisfied.

You are in the Verifier phase when a PR is open, the code-reviewer and security passes have run (or are running in parallel), and someone is about to merge. Before the merge happens, the **runtime test plan in the brief** has to be executed — not read, executed — against the work actually shipped on the branch. CI green is not enough; the code-review pass reads the diff; the security pass reads the diff; nobody up to this point has booted the app and exercised the feature. That is what the Verifier phase does.

> **Doctrine:** **CI green ≠ app boots ≠ feature works.** This phase exists because four consecutive features in the `aeg-ui-v1` iteration merged CI-green and were broken at runtime (missing DB migration, missing env var, missing IdentityProvider, unexecuted polymorphic-input test plan). The Developer agent could not exercise the auth-gated / key-dependent / browser-rendered paths; the Reviewer reads the diff, not a running app; the test plan — already written into PR bodies by good agents — fell into the gap between "agent who can't run it" and "reviewer who doesn't." The Verifier phase closes that gap.

---

## The two-actor split (the whole shape of the role)

Verification is split by *who can structurally do it* — mirroring the two-source asymmetry D-048 encoded for the token ledger (terminal roles know their own tokens; chat roles do not). The test plan in the brief tags each item with one of two labels:

- **`[agent]`** — non-auth, scriptable, dispatchable against a booted app. Examples: an SSRF rejection (the safe-fetch refuses a private IP), a parse check (a malformed `.md` returns the right error), a route response shape (`GET /api/x` returns the right JSON for a known input), a render smoke (the page mounts without crashing on stubbed data). These are executed by a **dispatched local agent** (the Developer's own session, or a fresh executor) with the app running locally. The agent reports executed-and-passing in the PR.
- **`[principal]`** — auth-gated, key-dependent, visual, or otherwise reachable only from a real signed-in browser session. Examples: a signed-in BYOK audit with the Principal's stored key, a ModelPicker render behind Clerk, a visual confirmation that a new card renders in the right column. These are executed by the **Principal** in a browser. The Principal ticks the box.

A test-plan item is one tag or the other — never both — and a brief that touches a runtime surface carries at least one of each kind when the surface includes both reachable paths. Pure-logic tasks (a parser, a sum function, a markdown normaliser — no runtime surface) declare **`Test Plan: unit-tests-only`** and are exempt from the runtime gate; the unit tests in CI are the proof.

The split is deliberate and asymmetric: the agent can prove `[agent]` items because they don't require what the agent structurally lacks (an auth session, the Principal's BYOK key, eyes on a rendered page); the Principal proves `[principal]` items because they require exactly those things. **Pretending the agent could verify a `[principal]` item is the failure mode this role exists to remove.** (Mirror of D-048: the Brief Author cannot self-fill a chat-role token cell because the chat surface doesn't expose its own count; here, the dispatched agent cannot self-fill a `[principal]` test item because the agent surface doesn't expose authenticated browser state.)

---

## Entry gate (self-locating) — refuse if it isn't your turn

The Verifier phase runs after the code-reviewer and security passes (whose verdicts are already on the PR) and **before** the Principal merges. Refuse if:

- **No open PR** for the task → *"Nothing to verify — there's no open PR. Come back when one is open."*
- **No brief in the PR body** → *"This PR has no brief; without a Test Plan I cannot judge what 'verified' means. The Developer must paste the brief into the PR description first."*
- **No `Test Plan` section in the brief** → *"This brief has no Test Plan. Brief Validation should have rejected it; flag the brief as malformed (`needs:brief-correction`) and stop. A brief with a runtime surface and no tagged test plan is not dispatchable, let alone verifiable."*
- **The Test Plan is `unit-tests-only`** but the PR touches a runtime surface (an API route, a page, a server action) → *"The brief declared `unit-tests-only` but the diff includes a runtime surface. The brief was mis-declared; flag for correction."* (This is the failsafe against an unattended agent quietly downgrading verification.)

If the brief carries `Test Plan: unit-tests-only` and the diff *is* pure-logic, the Verifier phase is satisfied automatically — the CI unit-test gate is the proof — and you record that as the outcome.

---

## What the `[agent]` half does

The Developer-agent (or a fresh dispatched executor) does the following on the PR's branch:

1. **Boot the relevant app(s).** From the worktree, start the dev server(s) named in the brief (e.g. `bun run dev:herald`, `bun run dev:aeg`, `bun run dev`). Wait for the server to be reachable. If the app doesn't boot, that is itself a failure — the test plan never gets a chance to fail; the boot failure is the failure.
2. **Execute every `[agent]` item in the brief's Test Plan.** Each item names a concrete observable (an HTTP response shape, a console output, a rendered DOM node, an error message). Run the named command, paste the actual output, confirm it matches the expectation. **Paste output — don't paraphrase.** Round-tripping through prose is how falsely-passing claims slip through.
3. **Report executed-and-passing in the PR.** Post a comment (or update the PR body's Verification section) listing each `[agent]` item with its result and the evidence (command + output, or curl + JSON). A `[agent]` item with no evidence is treated as not-yet-executed.
4. **Stop after the `[agent]` items.** Do not execute `[principal]` items — you cannot. Mark them clearly as awaiting the Principal.

If an `[agent]` item fails, the PR is **not** mergeable. Report the failure on the PR (mirror of the code-reviewer's REQUEST CHANGES — the PR's review state effectively returns to `changes-requested` via the Developer's pending follow-up); the Developer fixes on the same branch and the `[agent]` items re-run.

## What the `[principal]` half does

The Principal, in a browser, with the dev server running:

1. **Reads the `[principal]` test items in the PR body.** Each is a concrete user-observable behavior (sign in → upload a CV → audit returns a grade; open the model picker → switch model → state persists).
2. **Executes each item.** This is the part the agent structurally cannot do (auth, BYOK keys, visual confirmation).
3. **Ticks the box on the PR.** The PR body's Verification section is a checkbox list; an unticked `[principal]` checkbox keeps the PR in the non-mergeable state, exactly as an unresolved `REQUEST CHANGES` does. (See `process.md` Verification phase.)

If a `[principal]` item fails (the audit doesn't return a grade, the model picker doesn't switch, the page crashes behind Clerk), the Principal records the failure on the PR and the Developer fixes — same loop as `[agent]` failures, just observed by a different actor.

---

## Where the Verifier phase sits in the process

```
code-reviewer pass → security pass → Principal code review → TL spec review → Verification phase → merge
```

Verification is the **last** gate before merge. The reviews judge the diff against intent; verification proves the diff actually works against a running system. Both have to pass.

It runs after the human reviews so that any code that fundamentally shouldn't ship (architectural drift, security flaw, missing decision log) is caught before someone bothers booting the app to verify it. By the time a PR reaches Verification, the diff is *good*; this phase asks whether it is *true*.

The phase is **not** a new actor: there is no "Verifier agent" sitting between Reviewer and Principal. The Developer-agent runs the `[agent]` half (it is already in the loop, on this PR's branch); the Principal runs the `[principal]` half (the human is already merging). The role doc you are reading defines what each of them does in this phase — it does not create a new role to dispatch.

---

## What the Verifier phase does NOT do

- **Does not edit code.** A failure is reported back to the Developer. (Same rule as Reviewer / Security.)
- **Does not author tests.** The Test Plan is in the brief, written by the Brief Author against the Planner's rationale. Verification *executes* the plan; it does not invent it. A test plan that proves the wrong thing is a brief-quality problem (`severity:execution` → Brief Author), not a verification-quality problem.
- **Does not merge.** Only the Principal merges. Verification produces the green light; the merge action is still the Principal's.
- **Does not write status.** Whether the runtime test plan executed-and-passed is a fact on the PR (the checkboxes + the executed-and-passing comment), exactly like CI status — derived, never stored in a status field or the iteration file.
- **Does not replace the code-reviewer or security pass.** It is a *fourth* gate, complementary to the first three. A diff can pass code review and security review and still be broken at runtime — that is precisely what this phase exists to catch.
- **Does not retroactively gate already-merged PRs.** The phase runs before merge; if a runtime bug ships, it is a follow-up task, not an after-the-fact verification.

---

## Output format

The Verifier phase writes onto the open PR — as a body section, a comment, or a checkbox block (the exact mechanism is per-repo). The shape:

```
## Verification

### Test Plan execution (from the brief)

- [x] **[agent]** SSRF: a fetch to `http://10.0.0.1` returns "URL rejected"
      → `curl -X POST .../resolve-input -d '{"url":"http://10.0.0.1"}'` → 400 "URL rejected" ✓
- [x] **[agent]** Parse: a malformed `.md` upload returns 400 with a useful error
      → curl multipart with `<<bad>>.md` → 400 "Parse error: …" ✓
- [ ] **[principal]** Sign in → upload CV (PDF) → run audit → CLEAN report with grade
- [ ] **[principal]** ModelPicker renders in Profile editor; switching persists

### Outcome
- `[agent]` items: 2/2 executed-and-passing (see comments)
- `[principal]` items: 0/2 — awaiting Principal
- Verdict: **not yet mergeable** (or: **mergeable** once both halves are ticked)
```

A `unit-tests-only` brief produces a much shorter block:

```
## Verification
- Test Plan: `unit-tests-only` — no runtime surface; CI unit tests are the proof. ✓
- Verdict: mergeable.
```

---

## Stop / escalate conditions

- **The brief has no Test Plan, or it has runtime surface but no `[agent]`/`[principal]` tags.** Stop. Flag the brief malformed (`needs:brief-correction`) and route back through Brief Author. Do not invent a test plan at verification time — that is the Brief Author's job, by design (it lives in the brief so the executor sees it during execution, not after).
- **An `[agent]` item proves un-executable from the agent surface.** (e.g. the item requires real auth that doesn't have a scriptable dev-mode bypass.) That is a tag error — it should have been `[principal]`. Escalate `severity:execution` to the Brief Author; the brief is amended (logged as an event, not a brief edit — briefs are frozen after dispatch).
- **A `[principal]` item proves un-verifiable in any reasonable way.** (e.g. the item requires production data the dev environment can't produce.) Escalate `severity:strategy` — the feature may not be testable end-to-end in dev, which is itself a design issue worth surfacing.
- **An `[agent]` or `[principal]` item passes individually but the full flow visibly regresses something else.** This is the "single failure mode" sizing test from `roles/planner.md` failing after the fact — record what you saw and escalate `severity:strategy` so the next iteration accounts for it.

---

## Anti-patterns

- ❌ **Ticking the `[principal]` box because the `[agent]` items passed.** They are different items proving different properties; the agent boxes do not stand in for the principal boxes.
- ❌ **Paraphrasing the test output instead of pasting it.** "Endpoint returned 400 as expected" is not evidence; the actual response body is.
- ❌ **Skipping verification because the reviewer approved.** Code review and verification answer different questions. A clean code review on broken runtime code is exactly what this phase exists to catch.
- ❌ **Re-running the same `[agent]` item after a fix without re-pasting evidence.** A second run produces second output; show it.
- ❌ **Inventing a test plan at verification time because the brief omitted one.** The brief is the source of truth for what "verified" means; inventing one mid-flight loses the Planner's intent and lets the agent grade its own homework.
- ❌ **Downgrading a `[principal]` item to `[agent]` to make the agent half complete.** The Principal-only items exist precisely because the agent cannot prove them; reclassifying them is the failure mode (D-049 is built around not pretending the asymmetry away).
- ❌ **Writing "verified ✓" in the PR body without the per-item evidence.** Verification has the same evidence-or-it-didn't-happen discipline as the code-reviewer's FINDINGS block.
- ❌ **Treating `Test Plan: unit-tests-only` as a way around the gate when the diff actually touches a runtime surface.** The Verifier rejects this at the entry gate; the Brief Validation gate should also reject it pre-dispatch.

---

## Turn-end: append one row to the iteration's token ledger

The `[agent]` half is run from the Developer's session (terminal role) — its turn-end ledger row already covers it (see `roles/developer.md`); no separate Verifier row is appended. The `[principal]` half is run by the Principal in a browser, which is not a metered surface, so no token row exists for it. Verification therefore adds **no new row class** to the per-iteration ledger; the Developer's `<task>: develop` row carries the agent-side cost, and the Principal's browser-side time has no token cost to record. (Re-entry after a failure follows the existing append-only rule on the Developer side.)

See `iterations/README.md` §12 for the ledger format; `state-machine.md` §13 for the append-only rule.
