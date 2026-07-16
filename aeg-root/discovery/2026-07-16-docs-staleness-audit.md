# AEG Docs Staleness Audit — Findings

**Date:** 2026-07-16
**Iteration/Task:** `vinaya-pages-v1` · task 7 · Issue #567
**Scope:** read + report only — no `aeg-root/**.md` file is edited by this task
**Files read:** every surfaced `aeg-root/**.md` doc (see "Audited scope" below)

---

## Audited scope

Derived mechanically by calling `isSurfacedDoc(relPath, frontmatter)` (`packages/aeg-core/src/docs/surfaced-manifest.ts`) over every `aeg-root/**.md` file, parsing each file's real frontmatter with `parseDocFrontmatter` (`packages/aeg-core/src/docs/parse-doc.ts`) so any `surfaced:` override is honoured rather than assumed. No file in the current tree carries a `surfaced:` frontmatter override.

- **Total `aeg-root/**.md` files:** 45
- **Surfaced (audited):** 31
- **Excluded (not audited — matched an exclusion rule):** 14 — `discovery/2026-06-17-governance-gaps.md` (discovery-artifacts rule) and 13 files under `iterations/completed/**` (iteration-execution-files / token-ledgers rules)

31 matches the brief's ~30 estimate; not a `severity:strategy` trigger.

**Surfaced set (31):**

```
aeg-manual-flow.md
contracts/archivist-iteration-archivist.md
contracts/brief-developer.md
contracts/developer-reviewer.md
contracts/iteration-archivist-planner.md
contracts/planner-brief.md
contracts/reviewer-archivist.md
coordination.md
diagrams/process-flow.md
diagrams/system-architecture.md
documentation-coherence.md
enforcement.md
iterations/README.md
process.md
reviewer-prompt.md
roles/archivist.md
roles/developer.md
roles/iteration-archivist.md
roles/planner.md
roles/principal.md
roles/reviewer.md
roles/security.md
roles/team-leader.md
roles/verifier.md
skills/aeg-roles/SKILL.md
skills/aeg/SKILL.md
skills/brief-authoring/SKILL.md
state-machine.md
templates/brief-template.md
templates/issue-rationale-template.md
templates/pr-report-template.md
```

`gh auth status` confirmed authenticated (account `daniboomerang`) — `stale-state` findings requiring live Issue/PR lookups were possible and several were checked.

---

## Findings

### FINDING-001 — state-machine.md cites the pre-port Studio path for nest-doc-children

**Doc:** `aeg-root/state-machine.md:587`
**Severity:** `stale-path`
**Claim (verbatim):** "This mirrors the real parent/child resolution `apps/aeg/web/studio/src/lib/docs/nest-doc-children.ts` performs when building Studio's live `/docs` nav"
**Reality:** `apps/aeg/web/studio/src/lib/docs/nest-doc-children.ts` still exists on disk (the `@atta/aeg-studio` package is still a live, buildable app), but the actively-developed copy Studio's live `/docs` nav actually runs is `apps/vinaya/web/src/lib/docs/nest-doc-children.ts` (`vinaya-studio-v1` task 1, #493 — "Port AEG Studio dashboard into apps/vinaya/web as Vinaya Studio"). The doc means the live implementation; the live one moved.

### FINDING-002 — state-machine.md cites the pre-port Studio path for the token-ledger aggregator

**Doc:** `aeg-root/state-machine.md:144`
**Severity:** `stale-path`
**Claim (verbatim):** "it re-derives the Developer/Reviewer/Security rows live from the task's own merged PR(s) (`packages/aeg-core/src/parse-token-report.ts`, `apps/aeg/web/studio/src/lib/forge/fetch-token-ledger.ts`)"
**Reality:** same #493 port. The live copy is `apps/vinaya/web/src/lib/forge/fetch-token-ledger.ts`; confirmed by recent commit history (`497497d1`, `8aae982c` touch the Vinaya path, not the aeg one).

### FINDING-003 — iterations/README.md cites the same pre-port token-ledger path

**Doc:** `aeg-root/iterations/README.md:293`
**Severity:** `stale-path`
**Claim (verbatim):** cites `apps/aeg/web/studio/src/lib/forge/fetch-token-ledger.ts` alongside `packages/aeg-core/src/parse-token-report.ts` as the live aggregation mechanism
**Reality:** same as FINDING-002 — live copy is `apps/vinaya/web/src/lib/forge/fetch-token-ledger.ts`.

### FINDING-004 — roles/archivist.md cites the same pre-port token-ledger path

**Doc:** `aeg-root/roles/archivist.md:80`
**Severity:** `stale-path`
**Claim (verbatim):** "AEG Studio's iteration page no longer reads `<name>.tokens.md` to render token totals — it fetches every merged PR ... (`aggregateTaskTokenRows`, `packages/aeg-core/src/parse-token-report.ts`, called from `apps/aeg/web/studio/src/lib/forge/fetch-token-ledger.ts`)"
**Reality:** same as FINDING-002.

### FINDING-005 — state-machine.md cites a fetch-provenance.ts path that no longer resolves at all

**Doc:** `aeg-root/state-machine.md:535`
**Severity:** `stale-path`
**Claim (verbatim):** "`fetchProvenance` (in `apps/aeg/web/studio/src/lib/forge/fetch-provenance.ts` — moved out of `verify-coherence.ts` by task 28/#372's bundled finding ...)"
**Reality:** `apps/aeg/web/studio/src/lib/forge/fetch-provenance.ts` does not exist anywhere in the repo. `git log --all -- apps/aeg/web/studio/src/lib/forge/fetch-provenance.ts` shows it was moved by commit `573a4d44` ("Refactor(aeg): Evacuate shared forge helpers out of apps/aeg/web"); the live file is `packages/aeg-forge-state/src/fetch-provenance.ts` — a package extraction, not an app-to-app copy like FINDING-001–004. This is a path-no-longer-resolves case, not a which-copy-is-live case, so `apps/aeg/**` still existing doesn't save this citation.

### FINDING-006 — coordination.md asserts vada-production-v1 still carries a topology file

**Doc:** `aeg-root/coordination.md:29`
**Severity:** `stale-state`
**Claim (verbatim):** "`vada-production-v1` is the one deliberate, tracked exception still carrying a file (`iterations/README.md` §4)"
**Reality:** `find aeg-root/iterations -maxdepth 1 -iname "vada-production*"` returns nothing — the file is gone. The doc it cites as its own source, `iterations/README.md:95`, says so explicitly: "...`vada-production-v1.md` + `.tokens.md` were then deleted — the same disposition every other active iteration's topology file ... already went through." `decisions.md` D-113 (2026-07-08) is the point-in-time snapshot where the exception was still real; a later, unlogged event (acknowledged as a gap by `iterations/README.md` itself) completed the backfill and deletion. `coordination.md` was not updated past D-113's snapshot.

### FINDING-007 — enforcement.md asserts the same stale vada-production-v1 exception

**Doc:** `aeg-root/enforcement.md:60`
**Severity:** `stale-state`
**Claim (verbatim):** "`vada-production-v1`'s file remains a deliberate, tracked exception (see `iterations/README.md` §4 and `state-machine.md` §15b) — 9 of its Issues predate the D-078 rationale grammar ... backfilling them is its own follow-up task, not yet dispatched."
**Reality:** same as FINDING-006 — the file is confirmed absent and `iterations/README.md` records the backfill as already done, not "not yet dispatched."

### FINDING-008 — coordination.md still calls process.md an "eleven-phase" walkthrough

**Doc:** `aeg-root/coordination.md:42`
**Severity:** `contradiction`
**Claim (verbatim):** "`aeg-root/process.md` — the eleven-phase walkthrough from idea to merged code"
**Reality:** `process.md:24` itself is headed "## The thirteen phases," and `state-machine.md:14` independently corroborates "thirteen phases" for the same document. `coordination.md` was not updated when Phase 11 (Verification) and the current Phase 13 (Iteration Close) were split out.

### FINDING-009 — process.md still frames verify-test-plan as an optional, per-iteration decision

**Doc:** `aeg-root/process.md:256`
**Severity:** `stale-mechanism`
**Claim (verbatim):** "A `verify-test-plan` CI check ... is the optional enforcer companion to this phase; whether it ships is decided per-iteration."
**Reality:** `.github/workflows/forge-lifecycle.yml` runs `verify-test-plan.ts` unconditionally as one of the 9 mandatory steps of the consolidated `aeg-gate-suite` job (line 190; the job's own header comment states "all 9 verdicts are always produced"). It is not opt-in and is not decided per-iteration — it is a hard-wired mandatory gate for every PR.

### FINDING-010 — process.md and state-machine.md disagree on whether Brief Validation is a real gate

**Doc:** `aeg-root/process.md:119`
**Severity:** `contradiction`
**Claim (verbatim):** "(Brief Validation is an Archivist-gate stub today — see `state-machine.md` for mechanically-enforced vs trusted.)"
**Reality:** `state-machine.md:338`, the very doc process.md points to for the authoritative answer, says the opposite: "**Real (D-069)**, now the `Brief Validation` step (9/9) of the AEG gate suite job in `.github/workflows/forge-lifecycle.yml`." process.md's own cross-reference contradicts process.md's own claim.

### FINDING-011 — principal.md still describes state.md as a live, TL-maintained artifact

**Doc:** `aeg-root/roles/principal.md:46` (repeated at `:78`)
**Severity:** `contradiction`
**Claim (verbatim):** "The TL maintains `state.md`, the iteration files, `thinking.md`, and decision logs during working sessions." / "Say 'I see in `state.md` that...' not 'I recall that...'"
**Reality:** `find . -iname "state.md"` returns nothing anywhere in the repo. `roles/archivist.md:78`, `roles/iteration-archivist.md:98`, and `roles/team-leader.md:94` — three other surfaced role docs — all state that per-project operational state "is no longer a `state.md` file — it lives on a pinned GitHub Issue" (D-110). `principal.md` credits only `now.md`'s retirement (D-057) and missed the later `state.md` retirement (D-110).

### FINDING-012 — reviewer.md still instructs judging a PR-body field CI no longer accepts

**Doc:** `aeg-root/roles/reviewer.md:59`
**Severity:** `stale-mechanism`
**Claim (verbatim):** "A `Doc-waiver: <pointer> — <reason>` in the PR body is the author's explicit deferral; judge whether the reason is real ... a waiver-of-convenience is also a BLOCKER."
**Reality:** `decisions.md` D-097 (Status: ACTIVE, ratified 2026-07-06): "the `Doc-waiver:` grammar is removed from CI-accepted inputs in the same change (`Doc-ack:` unchanged)." Waivers are now a Principal-only, actor-verified `waiver:docs` label — not a self-serve PR-body field. `roles/developer.md` reflects this correctly (twice); `roles/reviewer.md` still tells the Reviewer to look for and judge a mechanism CI no longer reads.

### FINDING-013 — archivist.md names the wrong phase number for its own close-out step

**Doc:** `aeg-root/roles/archivist.md:148`
**Severity:** `stale-mechanism`
**Claim (verbatim):** "The last step of **Phase 10** / the flow (`process.md`): code-reviewer pass → security pass → Principal code review → TL spec review → merge → close-out (you)."
**Reality:** `archivist.md`'s own Scope line 43 lines above (`:25`) correctly says "this role closes out individual tasks after their PR merges (**Phase 12**)." `process.md`'s own heading confirms close-out sits under "## Phase 12: Merge," not Phase 10 (Review). Line 148 reads as a leftover from before Phase 11 (Verification) was split out as its own numbered phase.

### FINDING-014 — archivist.md frames the token-ledger file write as still-pending, future work

**Doc:** `aeg-root/roles/archivist.md:80`
**Severity:** `stale-mechanism`
**Claim (verbatim):** "`.tokens.md` itself is not deleted (task 7's job, once the live mechanism is proven in production use)."
**Reality:** Task 7 is `aeg-forge-state-v1` task 7 / #431, dated 2026-07-08 (`decisions.md` D-113) — already run. It deleted the `.tokens.md` files for `herald-hardening-v1`, `vinaya-cli-v1`, `vinaya-studio-v1`; `iterations/README.md:95` confirms `vada-production-v1`'s was later deleted too. No active iteration has a `.tokens.md` file today. Separately, `packages/aeg-core/bin/check-no-disk-state.ts`'s own header (D-117/D-121) now blocks **adding** any new `*.tokens.md` file anywhere in the repo — so the very mechanism this line assumes the Archivist still performs (append a row, creating the file if it doesn't exist) is CI-blocked for exactly the iterations it would now apply to.

### FINDING-015 — team-leader.md tells the TL to self-append a token-ledger row; planner.md and D-071 say the opposite

**Doc:** `aeg-root/roles/team-leader.md:80`
**Severity:** `contradiction`
**Claim (verbatim):** "**Turn-end ledger row (Planner / Brief Author modes).** At the end of every planning session and every brief-author session, append one row to `aeg-root/iterations/<name>.tokens.md` ... Re-entry (re-plan, re-brief) appends another row."
**Reality:** `roles/planner.md:263-265`, describing the identical Planner-mode turn-end duty, is headed "Turn-end: report your tokens, don't append them" and states: "You do not append your own row to `aeg-root/iterations/<name>.tokens.md` — D-071 retired self-append for every role ... report your tokens instead." Two surfaced docs give opposite instructions for the same role, same moment, same file.

### FINDING-016 — aeg-manual-flow.md cites a `.aeg/packages` file that does not exist

**Doc:** `aeg-root/aeg-manual-flow.md:21`
**Severity:** `stale-path`
**Claim (verbatim):** "`.aeg/packages` — the static collision-domain list (conflicts are package-level, `iterations/README.md` §5)."
**Reality:** no `.aeg/` directory exists anywhere in the repo (`find . -maxdepth 1 -iname ".aeg"` — no match). No `aeg.sh`/`aeg` CLI implementing an `init` that would scaffold it exists either (`find . -iname "aeg.sh" -o -iname "aeg-cli*"` — no match; the only reference to `aeg add-project` in the whole repo is inside a test fixture, `packages/aeg-core/src/fixtures/projects.md`, not real code).

### FINDING-017 — aeg-manual-flow.md cites a deleted CI workflow file by name

**Doc:** `aeg-root/aeg-manual-flow.md:22`
**Severity:** `stale-path`
**Claim (verbatim):** "`.github/workflows/verify-docs.yml` + the `verify-docs` script — the doc-tier CI gate (D-027)."
**Reality:** `.github/workflows/verify-docs.yml` does not exist; `.github/workflows/forge-lifecycle.yml`'s own header comment lists it among what was "Consolidated here (formerly): ... `verify-docs.yml` (deleted)." The `verify-docs` script itself is real and still runs (`packages/aeg-core/bin/verify-docs.ts`, invoked as a step inside `forge-lifecycle.yml`) — only the standalone workflow file name is stale.

### FINDING-018 — skills/aeg/SKILL.md repeats the same nonexistent `.aeg/packages` citation

**Doc:** `aeg-root/skills/aeg/SKILL.md:58`
**Severity:** `stale-path`
**Claim (verbatim):** "Conflicts are **declared, package-level, and static** (collision domains in `.aeg/packages`) ..."
**Reality:** same as FINDING-016.

### FINDING-019 — skills/aeg/SKILL.md repeats the same deleted-workflow citation

**Doc:** `aeg-root/skills/aeg/SKILL.md:75`
**Severity:** `stale-path`
**Claim (verbatim):** "**verify-docs** (`.github/workflows/verify-docs.yml`) is a real blocking CI gate (D-027) ..."
**Reality:** same as FINDING-017.

### FINDING-020 — skills/aeg-roles/SKILL.md claims a generated `.claude/` view that was never built

**Doc:** `aeg-root/skills/aeg-roles/SKILL.md:7`
**Severity:** `stale-mechanism`
**Claim (verbatim):** "The copy at .claude/skills/aeg-roles/SKILL.md is a GENERATED VIEW produced by `aeg generate-skills` for the agent harness that loads from .claude/ — edit THIS file, then regenerate; never edit the generated view by hand."
**Reality:** `.claude/skills/` contains 23 real `SKILL.md` files today, none of them named `aeg-roles`, `aeg`, or `brief-authoring` (`ls .claude/skills/` — the 23 are unrelated product skills: `ui-components`, `database`, `auth`, etc.). No `generate-skills` tool exists anywhere in the codebase (`find . -iname "*generate-skills*"` — no match). This repo's own `CLAUDE.md` points agents at `aeg-root/` directly, consistent with the generated view never having existed here.

### FINDING-021 — skills/aeg/SKILL.md makes the identical false generated-view claim

**Doc:** `aeg-root/skills/aeg/SKILL.md:7`
**Severity:** `stale-mechanism`
**Claim (verbatim):** "The copy at .claude/skills/aeg/SKILL.md is a GENERATED VIEW produced by `aeg generate-skills` for the agent harness that loads from .claude/ ... A different agent (e.g. Codex) generates its own view from this same source."
**Reality:** same as FINDING-020.

### FINDING-022 — skills/brief-authoring/SKILL.md makes the identical false generated-view claim

**Doc:** `aeg-root/skills/brief-authoring/SKILL.md:7`
**Severity:** `stale-mechanism`
**Claim (verbatim):** "The copy at .claude/skills/brief-authoring/SKILL.md is a GENERATED VIEW produced by `aeg generate-skills` for the agent harness that loads from .claude/ ..."
**Reality:** same as FINDING-020.

---

## Seed 3 — confirmed, but produces no row

The brief's third seed: "`D-125`-era prose and `decisions.md:2912` cite `apps/vinaya/web/src/lib/aeg-fs/read-root.ts`, renamed to `src/lib/repo-state/read-root.ts` by #553."

Confirmed: the citation actually lives in `decisions.md` D-117 (2026-07-11), not D-125 (a different, unrelated entry about CMS Sanity-project resolution) — the brief's "D-125-era" framing appears to be an approximate pointer, not a literal D-number. The underlying fact holds: `apps/vinaya/web/src/lib/aeg-fs/read-root.ts` no longer exists; the live path is `apps/vinaya/web/src/lib/repo-state/read-root.ts` (confirmed on disk — only `apps/aeg/web/studio/src/lib/aeg-fs/read-root.ts`, a different app's copy, and `apps/vinaya/web/src/lib/repo-state/read-root.ts` exist today).

This task's schema requires a `doc path:line` inside the **surfaced** set for every finding. `packages/governance/decisions.md` is explicitly out of surface (§4 of the brief — different owner, different audit), and a full-text search of all 31 surfaced docs for `aeg-fs` or `read-root` returns zero hits — no surfaced doc repeats this stale citation. So there is nothing in-scope to record a row against. Recorded here for completeness (D-087 — no lying by omission) rather than silently dropped, but it is not FINDING-023.

---

## Judgment calls — looked stale, ruled not stale

- **`roles/planner.md:25`** ("vada-production-v1 cutover complete") looked suspicious against D-113/D-117 in `decisions.md` (both still describe it as an open, tracked exception at their own authoring dates) — but the physical absence of `aeg-root/iterations/vada-production-v1.md` and `iterations/README.md §4`'s own account confirm the cutover genuinely completed after those decision entries were written. Not stale; `decisions.md` itself is missing a later entry recording the final backfill/deletion — a gap in an out-of-surface file, not a finding here.
- **`archivist.md`/`iteration-archivist.md`/`contracts/*.md` citations of pinned-state Issues #447–#453 as settled D-110 infrastructure** — `decisions.md` D-110's own header still reads `Status: PENDING`, which looked like it might make every "per D-110" citation premature. Checked live via `gh issue view 447` and `gh issue view 453`: both are real, OPEN, correctly-titled pinned Issues in active use exactly as the role docs describe. The decision entry's formal status lags the already-implemented reality; that lag lives in an out-of-surface file (`decisions.md`), not in a stale surfaced-doc claim.
- **`process.md:235`** ("no CI bot dispatches [review passes] automatically yet") — `.github/workflows/claude-code-review.yml` does auto-dispatch a generic `/code-review:code-review` Claude Code Action on PR open. But `forge-lifecycle.yml`'s own header comment lists it as "different cost/latency class, LLM-based," explicitly NOT consolidated with the AEG-specific gate suite, and nothing confirms its generic output satisfies `review-gate.yml`'s specific `VERDICT: APPROVE | REQUEST CHANGES` verdict-comment format that `roles/reviewer.md`'s bespoke code-reviewer pass produces. Insufficient evidence these are the same mechanism — dropped rather than risk a false finding.
- **`diagrams/system-architecture.md`'s CI section** (parallel Typecheck/VerifyDocs arrows vs. the actual single consolidated sequential-steps `aeg-gate-suite` job) — this diagram's own header scopes itself to Cetana, the optional orchestration tool, not the GitHub Actions gate suite; not confident the CI nodes shown are meant to represent `forge-lifecycle.yml` at all. Dropped rather than risk a false finding.
- **`docs-index.md` maintenance claimed by three role docs** (`developer.md`, `archivist.md`, `iteration-archivist.md`) — reads as intentional layered checkpoints (the same pattern used for Test Plan items across roles), not a real ownership conflict. No doc claims exclusivity the way the token-ledger write does. Not a finding.

---

## What was not exhaustively re-derived

- Every D-### citation across all 31 docs was spot-checked for existence against `packages/governance/decisions.md` (all resolved to a real header); this does not mean every citation's *characterization* of its decision was individually re-verified — only the ones surfaced above were.
- PR/Issue numbers cited purely as historical narrative (e.g. "#358/#359 incident," "#485 live-fire bug") were not individually re-verified via `gh` — they are offered as illustrative history in their docs, not live-state assertions, and re-deriving each would not change any finding above.
