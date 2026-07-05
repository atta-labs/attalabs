---
sidebar_title: "Template: PR report"
---
# Template — Developer's PR report (the PR body)

**Copy the block below the divider into the PR body file (opened via `open-pr.ts --body-file`) and replace every `[…]` placeholder with real content.** This packages the canonical PR-body form defined by `aeg-root/roles/developer.md` § "PR body — canonical form" — that section remains the contract for what each field requires (exact `Tier:` syntax, tagging rules, the optional `Conforms-to:`/`Doc-ack:`/`Doc-waiver:` fields); this file is the container.

**The anchor comments are load-bearing.** Each gate-read field — `Closes #N`, `Project:`, `Tier:`, the Test Plan section — sits inside an AEG anchor pair (an HTML comment pair, invisible on the rendered PR). When an anchor pair for a field is present, every gate reads that field **exclusively from inside the pair**, ignoring identical-looking text anywhere else in the body — a pasted reference brief, a quoted example, a duplicate section can no longer be mistaken for the real field. Bodies without anchors remain fully recognized (prose recognition is the compatibility fallback); use at most one anchor pair per field. Keep the anchors when you fill this in.

---

<!-- AEG:CLOSES:START -->
Closes #[N]
<!-- AEG:CLOSES:END -->

**For:** [model + environment that executed the task, matching the brief's `For:` line]
<!-- AEG:PROJECT:START -->
**Project:** [project(s), comma-separated, matching the brief]
<!-- AEG:PROJECT:END -->

## Summary

[SUMMARY — one paragraph: what shipped, the validated mechanism, the durable why. Then the decisions you made that weren't explicit in the brief — name the alternatives and why you picked yours, so the Principal can reverse a wrong call.]

## Test plan

<!-- AEG:TEST-PLAN:START -->
- [ ] **[agent]** [item carried from the brief's §9 — tick only after pasting the actual command output as evidence]
- [ ] **[principal]** [item carried from the brief's §9 — the Principal ticks after verifying in a real browser/session]
<!-- AEG:TEST-PLAN:END -->

## Verification evidence

[EVIDENCE — the actual output (not a paraphrase) for every static gate and every `[agent]` Test Plan item: typecheck, lint, tests, verify-docs, and the full `git diff main --stat` change list. Long output may be elided — say so where you elide.]

## Scope

[SCOPE — one paragraph: blast radius, projects touched, packages edited, shared-package consumers affected, non-goals. Ends with the Tier field:]

<!-- AEG:TIER:START -->
**Tier:** [0 | 1 | 3]
<!-- AEG:TIER:END -->

## Token report

| Phase | Role | Agent/Model | Tokens in | Tokens out | Cost | Date |
|---|---|---|---|---|---|---|
| [task-id]: develop | Developer | [model] | [exact in] | [exact out] | [cost] | [YYYY-MM-DD] |

## Reference — the dispatched brief

<details>
<summary>Full brief (reference copy — the gates read the anchored fields above, never this block)</summary>

[paste the entire dispatched brief here, verbatim]

</details>
