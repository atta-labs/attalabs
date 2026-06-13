# AEG — Build-vs-Adopt: Can AEG use Cordum or GitHub Spec Kit?

**Status:** study / living
**Author:** Team Leader (Claude), at the Principal's request
**Date:** 2026-06-13 (verified against the live repos this date)
**Companion:** `aeg-market-study.md`, `aeg-process-reflection.md`
**Question answered:** *"Can I use Cordum or GitHub Spec Kit for AEG? We did the market study — now decide."*

> **Method:** this is grounded in reading the **actual repositories** (Spec Kit `github/spec-kit` README at v0.9.1, June 2 2026; Cordum `cordum-io/cordum`), not the marketing. The point of the exercise is to stop treating these as abstract threats and decide concretely: replace, adopt-and-extend, ignore, or run-alongside.

---

## TL;DR

- **Cordum → run-alongside-later, not now.** It governs agent **actions at runtime** (policy gates on tool calls). AEG governs the **code-production workflow**. Different layer. Cordum is not a substitute for AEG and AEG is not a substitute for Cordum. You'd only add Cordum if/when you run autonomous agents taking real-world actions that need runtime policy enforcement — not the case for Herald/Vāda today.
- **Spec Kit → adopt-and-extend, seriously consider.** Spec Kit (108k★, v0.9.1, GitHub-maintained, 219 contributors, agent-agnostic, MIT) is a battle-tested implementation of the **front half of AEG** — constitution → spec → clarify → plan → tasks → tasks-to-issues → implement → analyze → checklist. AEG has been **hand-building a solo variant of this.** The strategically correct posture is almost certainly to **build AEG as a Spec Kit preset + extension that adds the four things Spec Kit lacks**, rather than maintain a parallel bespoke stack.

---

## 1. The two are different layers — separate the questions

"Can I use Cordum or Spec Kit for AEG" conflates two different products doing two different jobs:

| | **Cordum** | **GitHub Spec Kit** | **AEG** |
|---|---|---|---|
| **Layer** | Agent **runtime** (actions) | Dev **workflow** (producing code) | Dev **workflow** (producing code) |
| **Governs** | Every tool call / API request / delegation, pre-execution | The intent→spec→plan→tasks→code pipeline | The intent→plan→brief→build→review→merge pipeline |
| **Artifact** | Policy bundles, run history, approval queue | `constitution.md`, `spec.md`, `plan.md`, `tasks.md`, GitHub Issues | `state-machine.md`, iteration topology, briefs (in PR body), forge-derived status |
| **Source of truth** | Its own run store | `tasks.md` (stored) | The git forge (status **derived**, never stored) |
| **Relation to AEG** | **Different layer** — sits *under* agents, beside AEG | **Same layer** — overlaps AEG's front half heavily | — |

So: **Cordum is an orthogonal layer** (the question is "do I bolt it under my agents?"), while **Spec Kit is a direct overlap** (the question is "do I build on it instead of reinventing it?").

## 2. Cordum — verdict: not now, different layer

Cordum is "the open agent control plane": pre-execution policy enforcement, approval gates, deterministic audit trails, policy-as-code (ALLOW/DENY/REQUIRE_APPROVAL/ALLOW_WITH_CONSTRAINTS), framework-agnostic, with a Claude Code edge path.

**Why it's not a substitute for AEG:** it governs *what a running agent is allowed to do* (send this email? hit this API? at runtime, before the action fires). AEG governs *whether AI-written code is reviewed, spec-conformant, and merge-worthy*. Herald's and Vāda's agents don't take autonomous real-world actions that need a runtime policy kernel — they produce text/code that a human reviews and merges. So Cordum solves a problem AEG's products don't currently have.

**When Cordum would become relevant:** if AttaLabs ever ships agents that autonomously act on external systems (send communications, move money, mutate production) without a human in the loop per action. Then Cordum (or the category) is the right *runtime* layer — and it would sit *beside* AEG, not replace it. **Decision: park. Revisit only if an autonomous-action product appears.**

## 3. Spec Kit — verdict: adopt the front half, extend with AEG's distinctive parts

### What Spec Kit already does (that AEG hand-builds)
Verified from the v0.9.1 README:
- **`/speckit.constitution`** → `.specify/memory/constitution.md` — "governing principles the agent follows." **This is AEG's `state-machine.md` constitution concept.**
- **`/speckit.specify`**, **`/speckit.plan`**, **`/speckit.tasks`** — the spec→plan→tasks pipeline. **This is AEG's planner→brief→tasks flow.**
- **`/speckit.taskstoissues`** — converts tasks into **GitHub Issues**. **This is AEG's iteration-file→Issue machinery.**
- **`/speckit.clarify`** — structured clarification before planning. **This is AEG's `[NEEDS CLARIFICATION]` convention (which AEG already lifted from Spec Kit).**
- **`/speckit.analyze`** — cross-artifact consistency & coverage analysis. **This is AEG's spec-conformance check.**
- **`/speckit.checklist`** — "unit tests for English," requirement completeness/clarity. **This is AEG's brief validation.**
- **Tasks carry** dependency ordering, `[P]` parallel-execution markers, file-path specs, TDD structure, checkpoints. **This overlaps AEG's topology/dependency model.**
- **Extensions** (add commands/phases — examples cited: Jira integration, **post-implementation code review**, **V-Model test traceability**, project diagnostics) and **Presets** (override formats — examples cited: **mandatory security review gates**, test-first ordering, **compliance/regulatory traceability**, terminology/localization). Agent-agnostic across 30+ agents incl. Claude Code. MIT-licensed.

It is at **108k stars, 219 contributors, GitHub-maintained, releasing actively** (v0.9.1, June 2 2026). A solo author cannot out-maintain this, and shouldn't try.

### What Spec Kit does NOT do (AEG's genuine, uncrowded contributions)
1. **Forge-derived status (never stored).** Spec Kit stores a `tasks.md`. AEG's "status is computed from branch/PR/merge, never written" is a real, different stance that avoids a drift bug class. *Not in Spec Kit.*
2. **Multi-developer dispatch gates + package-level conflict declaration.** Spec Kit marks `[P]` for parallel tasks but has no cross-developer lock and no collision-domain model. AEG's "don't start while a conflicting sibling's PR is open / a dependency isn't merged" is *not in Spec Kit.*
3. **Independent Reviewer + Archivist + provenance block.** Spec Kit *extensions* can bolt on "post-implementation code review," but the fresh-context independent-reviewer + audit-by-construction provenance model is AEG's design. *Not core to Spec Kit.*
4. **The trust/adoption framing — manual mode, observe mode, the scared-team on-ramp.** Spec Kit targets developers who already trust their agent. It has no "run read-only, monitoring-not-restriction, visible-hand-offs-for-a-frightened-team" mode. **This is AEG's most differentiated and least-crowded contribution (the Sateliot thesis), and Spec Kit doesn't touch it.**

### The strategic implication
Spec Kit's extension/preset architecture is *designed for exactly what AEG is*: a customized, opinionated, organization-specific SDD workflow. AEG's four distinctive parts (above) map cleanly onto **a Spec Kit preset (formats/gates) + a Spec Kit extension (new phases/commands: forge-derived status view, dispatch gates, reviewer/archivist, observe mode).**

**Building AEG *on* Spec Kit would:**
- **kill the "you reinvented Spec Kit" objection** — you'd be *extending the standard*, not competing with it;
- **roughly halve the bespoke machinery** you maintain solo (constitution, clarify, analyze, checklist, tasks-to-issues all come free and maintained);
- **concentrate your effort on the genuinely-yours parts** (forge-derived status, conflict gates, reviewer/provenance, trust/observe-mode);
- **inherit agent-agnosticism + distribution** (30+ agents, 108k-star ecosystem, GitHub's brand).

**Building AEG *parallel to* Spec Kit (status quo) means** maintaining a solo reimplementation of a 219-contributor GitHub project, forever, for the ~50% of AEG that Spec Kit already does better.

## 4. The honest recommendation

1. **Cordum: park.** Different layer; revisit only if an autonomous-action product appears.
2. **Spec Kit: run a real spike before committing — but lean toward adopt-and-extend.** This is a `Type 1`-sized decision (it reshapes what `aeg-root/` *is*), so it gets a deliberate evaluation, not a chat-room call. The spike question: *can AEG's four distinctive parts be expressed as a Spec Kit preset + extension without fighting Spec Kit's grain?* Concretely test:
   - Can a Spec Kit **preset** enforce AEG's brief format + tier gates + reviewer/security gates?
   - Can a Spec Kit **extension** add the forge-derived-status view + dispatch gates + the observe-mode on-ramp?
   - Does `/speckit.taskstoissues` produce Issues compatible with AEG's "Issue = task, status derived" model, or does it store status in a way that fights it?
   - Does Spec Kit's `tasks.md` (stored) clash irreconcilably with AEG's "never store status"? (This is the one real philosophical tension — Spec Kit stores task state; AEG derives it. Resolvable by treating `tasks.md` as plan-topology only and still deriving live status from the forge — but verify.)
3. **Either way, stop hand-building the front half.** Even if the spike says "don't fully adopt," AEG should *converge its vocabulary and structure toward Spec Kit's* so it reads as a Spec-Kit-compatible methodology, not a parallel invention. The constitution, clarify, analyze, and checklist concepts should explicitly map to `/speckit.*` equivalents.

## 5. How this answers the Principal's underlying worry

"Should I drop AEG and use something famous?" splits cleanly now:
- **The famous thing for the front half exists (Spec Kit) — so don't rebuild that part; adopt it.**
- **The famous thing for the runtime layer exists (Cordum) — but you don't need that layer yet.**
- **The part that is genuinely AEG's — forge-derived status, conflict-domain dispatch gates, the reviewer/provenance model, and above all the trust/observe-mode adoption framing for teams afraid of agents — has no famous equivalent.** That is the part worth keeping, and it's smaller and more defensible than "all of AEG."

So the answer is not "drop AEG." It's **"shrink AEG to its differentiated core, stand that core on Spec Kit's shoulders, and aim the whole thing at the trust/adoption buyer the Sateliot pilot revealed."** That is a smaller, cheaper, more defensible, less-crowded product than the all-bespoke AEG — and it's the version most likely to survive contact with the market.

---

*Living study. Before acting: run the Spec Kit adopt-and-extend spike (§4.2). Re-read both repos at decision time — Spec Kit moves fast (155 releases; v0.9.1 was June 2 2026). The `tasks.md`-stored vs forge-derived-status tension (§4.2) is the one architectural question that decides whether adoption is clean or forced.*
