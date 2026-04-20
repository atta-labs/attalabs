# Cetanā (Architect Layer) — Capability Reality Check

Written: April 20, 2026, late in a 10-hour Mastra migration session.
Context: Captured after Dani asked "Is the Architect Agent really doable?" following multiple hours of AI-assisted debugging that required substantial human judgment to keep on track.

**Status: Strategic reality document. Read before building Cetanā V1. Anchors ambition to what's actually possible.**

---

## The question that triggered this document

Mid-debugging of a Mastra TypeScript type explosion that had consumed hours of diagnostic effort, Dani asked:

*"Look at how complicated is to get this migration done. How much review from your side. My side. Your knowledge, my brain. Is the architect agent really doable using Vāda etc etc?"*

This is the right question. The Attā ecosystem vision includes a Cetanā layer that does deliberation-guided execution — Vāda plans, an executor acts, Vāda reviews, loop repeats. The ambitious reading of that layer is "autonomous architect agent." The realistic reading is something smaller but still valuable.

This document addresses which reading is buildable.

---

## What this migration actually required (honest inventory)

Over approximately 10 hours, the collaborative work between Dani (Principal), Opus (Critic), and Sonnet (Executor) caught or resolved:

**Architectural decisions Dani made that Opus or Sonnet would not have made alone:**
- Separating identity and orchestration as distinct packages
- Rejecting BYOK shift during Step 4 (keeping axis separation)
- Pushing back on "drop Mastra workflows" when Opus proposed it prematurely
- Framework name in URL path caught mid-implementation
- Insisting typecheck OOM was new (not pre-existing) despite Sonnet's initial diagnostic
- Rejecting `as any` smuggling when it appeared in implementation

**Bugs Opus caught in Sonnet's work:**
- Dangling-if validation bug in route handler
- Silent `userId` removal in `persistTurn` refactor
- Missing WHY comments in containment extraction
- Framework name (`/mastra/`) in URL path
- Mastra imports leaking into browser bundle via re-export chain
- Premature unannounced additions (preload helper, test infrastructure)

**Diagnostic work Sonnet did that Opus couldn't easily replicate:**
- TypeScript `--extendedDiagnostics` interpretation
- Bisecting commits to isolate OOM introduction
- Identifying Mastra's `PublicSchema` 7-way union as specific cause
- Testing type-cast alternatives to find least-loose fix

**Judgment calls that required real thought:**
- When to accept a tradeoff vs push for cleaner architecture
- When to defer to followups vs fix now
- When to stop debugging and apply temporary fix vs persist for root cause
- When to question Sonnet's "it works" vs trust and move on

**Each category required different capabilities.** Removing any category's contribution would have produced materially worse outcomes.

---

## What current AI agents can reliably do (2026)

Based on this session and broader observation:

**Agents are good at:**
- Writing code when the specification is clear and scoped
- Running tests and reporting specific results
- Refactoring within well-defined patterns
- Executing plans that have been validated by humans
- Debugging mechanical failures (wrong imports, syntax errors, obvious bugs)
- Generating structured output when the structure is explicit
- Synthesizing information from multiple sources
- Following checklists they've been given

**Agents are unreliable at:**
- Holding architectural context across multi-hour work
- Pushing back on user decisions (agents tend toward agreement)
- Recognizing when their own proposals have silent tradeoffs
- Knowing when to ask vs proceed
- Distinguishing "works but ugly" from "works and clean"
- Making product decisions about scope or direction
- Catching their own errors in rush conditions
- Sustaining review quality over extended sessions

**Agents cannot currently do:**
- Autonomous architectural decision-making on high-stakes work
- Multi-hour coherent judgment without context loss
- The quality of pushback a senior human gives when something feels wrong
- Taste about what constitutes a good abstraction

**This isn't a criticism of specific models.** Sonnet, Opus, Claude 4.7, GPT-5 — same underlying limits. Some degrade gracefully, some fail obviously, but none reliably replicate what the three of us did today.

---

## What this implies for Cetanā's product scope

### The ambitious version is not currently buildable

**Cetanā-as-autonomous-architect** — "give it a goal, it plans, executes, delivers production code" — is not a 2026 product. Not a 2027 product either, most likely.

Reasoning:
- Every autonomous agent demo today operates on trivial tasks relative to real software architecture
- Complex architectural work requires the kind of sustained judgment current models don't hold
- Error compounding kills autonomy — one wrong call at step 3 corrupts steps 4-50
- The feedback loops that catch errors (human review) are what make the work succeed

Sam Altman can say what he wants. Try it on a real migration. It fails.

### The realistic version is valuable and buildable

**Cetanā-as-collaboration-framework** — "structured tooling that makes human-supervised AI-assisted architecture work dramatically better than ad-hoc chat sessions" — is a 2026-2027 product. Real. Valuable. Differentiated.

What it does:
1. Manages structured handoff between deliberation (Vāda) and execution (any agent)
2. Enforces checkpoint discipline so human review happens at the right moments
3. Maintains persistent context across sessions without loss from compaction
4. Catches mechanical errors via automated adversarial review on results
5. Surfaces patterns of thrashing or context loss so humans can intervene

What it doesn't do:
- Replace the human's judgment
- Act autonomously on decisions beyond a narrow approved scope
- Pretend to be smarter than it is

---

## The three-role system Cetanā actually orchestrates

Today's session had four distinct roles functioning in coordination. Cetanā's architecture should mirror this reality:

**Principal (the user).** Sets goals. Makes product decisions. Catches judgment errors the other roles miss. Has veto on all decisions. Final authority.

**Critic (Vāda in deliberation mode).** Structured multi-agent deliberation on plans and results. Catches architectural issues, drift, scope creep. Produces typed Conclusions that specify plan, key_condition, unresolved_points.

**Executor (Claude Code, Cursor, MCP agent, human, whoever).** Implements approved plans. Reports results in structured form. Agnostic to which executor; Cetanā doesn't care.

**Reviewer (Vāda in review mode).** Adversarial deliberation on execution results. Catches silent behavior changes, smuggled shortcuts, missed specification points. Same Vāda primitive, different invocation.

**Four roles, orchestrated by Cetanā's state machine.**

Critically: **the Principal is always in the loop.** Cetanā doesn't hide decisions from the user. It surfaces them at the right granularity. The user approves plans, approves results, catches what the system misses.

---

## Why this matters for Cetanā's positioning

### Competitive landscape

Most "autonomous agent" products position themselves as **replacing** the human architect. They fail because:
- The core skill isn't coding; it's judgment
- Judgment doesn't transfer to AI yet
- Users get burned, churn, don't come back

Cetanā positioning as **augmenting** the human architect avoids this trap:
- Users stay in the loop where judgment matters
- Users are freed from coordination overhead where it doesn't
- The value proposition matches delivered capability

### Defensibility

Autonomous-agent products compete on "how smart is your AI." This is a losing game — foundation models commoditize, everyone has similar models.

Cetanā competes on **how well structured is the human-AI collaboration**. This is architecture, UX, workflow design, product taste. Harder to replicate. Defensible through execution quality.

### Market fit

The target user isn't "someone who wants AI to do their work." That user will always be disappointed when AI falls short.

The target user is "skilled professional who does architecture-level work and wants dramatically better tooling than chat." Engineers, architects, researchers, consultants. Their work requires judgment they can't outsource. But their coordination overhead is brutal. Cetanā removes the overhead. They keep the judgment.

---

## What today's session specifically taught us about Cetanā

### Lesson 1 — The coordination overhead is the opportunity

Dani spent hours today doing:
- Translating conclusions from deliberation to executor instructions
- Monitoring executor's work
- Translating executor's results back to deliberation context
- Catching drift when context was lost
- Re-explaining things after context compactions

**This coordination work isn't the skilled part.** It's overhead that consumed the majority of the session.

Cetanā eliminates most of this. Deliberation output is typed. Executor receives it structured. Results come back structured. No translation layer needed. The human does the judgment; the system does the coordination.

**Realistic time savings: 40-60% on coordination, zero on judgment.**

### Lesson 2 — Checkpoint discipline must be enforced

Several times today, Sonnet was ready to ship code that had silent issues. If Dani had been less vigilant, they would have landed. The `as any` cast, the `userId` removal, the framework name in URL path — all would have shipped without Dani's specific catches.

**The failure mode is: user trusts agent, agent ships shortcut, issue surfaces later.**

Cetanā can't prevent this entirely but can enforce checkpoint structure. Every N steps: review. Every major decision: explicit approval. Every "done" claim: verification. The cadence is in the product, not in user discipline.

This alone would have caught multiple today.

### Lesson 3 — Context loss is the silent killer

Sonnet compacted twice during the OOM debugging. Each compaction lost nuance. Sonnet retried approaches that had already failed. Sonnet re-derived conclusions already reached.

**This is the biggest productivity drain in long AI-assisted sessions.**

Cetanā maintains structured decision records. Not chat history — a typed log of: decisions made, approaches rejected and why, invariants established, unresolved questions. When an agent compacts, it reads the decision record. When a new session starts, it reads the record. No loss.

**This alone would have saved 2-3 hours today.**

### Lesson 4 — Adversarial review catches what confirmation-biased review misses

When Sonnet said "tests pass, ready to ship," that's a confirmation signal. The tests tested what Sonnet thought to test. They didn't test what wasn't tested.

Dani caught the `as any` because Dani brought adversarial perspective: "I didn't approve this." Opus caught the userId removal because Opus brought adversarial perspective: "this wasn't in the plan."

**Adversarial review is different from verification.** Verification checks "does it do what was asked." Adversarial review asks "what's been smuggled in along the way."

Cetanā can automate adversarial review by running Vāda's Critic posture over execution results. Not as the only review — human review stays essential. As an additional automated layer that catches specific classes of errors.

### Lesson 5 — The human has to decide when to stop

Multiple times today, Opus suggested stopping for the night. Dani didn't. Dani's principle was "we don't ship broken type safety." That principle was correct. Opus's fatigue-based suggestion was wrong.

**The human has better judgment about what quality bar matters than the system does.**

Cetanā shouldn't try to decide when to stop. It should surface fatigue signals (session length, context compactions, repeated failures) so the human can decide with data. But the decision stays with the human.

---

## The long arc of what's possible

### Today (2026)
Cetanā V1: structured collaboration framework. Human in loop. Dramatic efficiency gains on coordination. No autonomous decision-making.

### 3-5 years (2028-2030)
Cetanā V2: more automation of routine decisions within well-scoped tasks. Autonomy ceiling raised but still capped. Human still required for architectural choices.

### 5-10 years (2031+)
Unknown. Possibly closer to autonomous operation on substantial tasks. Possibly the limits encountered today turn out to be structural, not just current. Nobody knows.

**Build toward V1. Don't promise V∞. Ship what works.**

---

## The honest pitch language

When eventually pitching Cetanā:

### What to say

*"Cetanā is structured tooling for AI-assisted architecture work. Your judgment stays; your coordination overhead goes away. Vāda deliberates on plans. Your approved executor implements. Vāda reviews results. Cetanā manages the handoff, preserves context across sessions, and enforces review discipline. You stay in the loop where it matters. You're freed from the work where it doesn't."*

### What NOT to say

*"Cetanā is an autonomous AI architect. Give it a goal and it delivers production code."*

Don't say this. It's not true. Saying it invites churn.

### Positioning against alternatives

*"Tools like Cursor and Claude Code are executors. They're good at implementing plans. Cetanā adds the deliberation and review layers above them, so you're not the only judgment in the system. You're still the Principal — but Vāda's adversarial deliberation gives you a second voice catching what you might miss."*

---

## Practical implications for V1 scope

**Build these:**

1. Structured deliberation invocation from Vitakka focus context
2. Typed plan handoff to approved executor agents (Claude Code, Cursor, MCP agents)
3. Execution result capture in structured form
4. Vāda-driven adversarial review on captured results
5. Decision record persistence across sessions
6. Checkpoint enforcement at configurable granularity
7. Human approval gates at major decision points
8. Fatigue and context-loss detection with user surfacing

**Don't build these for V1:**

1. Autonomous decision-making without human approval
2. Multi-hour unattended operation
3. "Smart" agents that decide when human review is needed
4. Goal-to-production pipelines with no touch points
5. Auto-merge on review passes

The first list is valuable and buildable. The second list is hype territory.

---

## What to watch for as you build

**Warning signs that Cetanā is drifting toward autonomous-agent territory:**

- Removing human approval points "because the AI got it right last 10 times"
- Collapsing adversarial review "because it's slow"
- Making the system "smarter" instead of making coordination better
- Marketing copy that promises things the product can't deliver

**Each of these is tempting.** Users will ask. VCs will ask. The market will push toward autonomy because autonomy is the loudest story.

**Resist.** The honest product is better than the overpromised one.

---

## The meta-observation

**Dani asked "is this doable?" at exactly the right moment.**

The question came after hours of watching AI fail repeatedly in small ways that required human catching. The realistic answer — "a version is doable, not the autonomous version" — shapes product scope in a way that avoids the trap most AI products fall into.

**Founders who ask this question get realistic products. Founders who don't ask it overpromise and undership.**

Dani asked it. Document captures the answer. Cetanā V1's scope is anchored to what's actually possible.

When the scope temptation comes later — "but what if Cetanā could just do the whole thing autonomously?" — return to this document. The answer is in the session we lived through today.

---

## Related documents

- `atta-ecosystem-vision.md` — the full four-layer architecture including Cetanā's place
- `vada-v2-deliberation-execution-cycle.md` — earlier less-complete capture of this direction
- `/mnt/transcripts/` — raw session material from April 20, 2026 that generated these insights

---

*This document exists because a 10-hour session revealed exactly how much human judgment is required to make AI-assisted architecture work succeed. That insight must survive the context compactions and fatigue of tomorrow. When Cetanā is being designed, read this first.*
