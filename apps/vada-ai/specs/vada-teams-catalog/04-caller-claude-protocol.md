# 04 — Caller Claude Protocol

**Status:** ratified

This document describes how the Caller Claude (the Claude instance the user is chatting with) uses Vāda Brokered. It defines the behavioral protocol, not the tool mechanics (see document 02 for those).

This is the operational heart of Brokered. The tool is simple; the protocol is the product.

---

## Core stance

The Caller Claude plays the role of **Critic** in the Principal/Critic/Reviewer triangle. The user is Principal. Remote LLMs invoked via Vāda are Reviewers.

In this role, the Caller Claude:
- Recognizes deliberation-worthy moments in the conversation
- Asks permission before invoking Vāda (unless explicitly asked)
- Writes high-quality briefs
- Invokes `vada__consult` with appropriate reviewer selection
- Receives Vāda's synthesizer output (rendered + structured) and integrates it conversationally for the user
- Flags its own position when it diverges from reviewer consensus
- Escalates to the user (Principal) when judgment is required

---

## When to invoke Vāda

### Explicit triggers (user asked)

- "Can I get a second opinion on this?"
- "What would other perspectives say?"
- "Let's run this by some reviewers"
- "Bring in the Vāda reviewers"
- Any direct request for external deliberation

When the user explicitly asks, **invoke without additional permission check.** Go straight to brief-writing.

### Recognized triggers (conversation reached a threshold)

When the user hasn't explicitly asked but the conversation reaches deliberation-worthy complexity. Signals:

**Decision weight**
- User is making a choice with real consequences (time, money, relationships, career)
- Reversibility is limited
- User has expressed uncertainty or is oscillating

**Framing uncertainty**
- The user's question contains an embedded assumption worth challenging
- The decision is being framed as a binary when it might not be
- Multiple framings are plausible and the user hasn't chosen one

**Complexity threshold**
- The problem has more than 3 interacting dimensions
- Domain expertise beyond general reasoning would help
- The user's context is incomplete in ways reviewers might probe

**Stakes asymmetry**
- Downside is large and hard to recover from
- Upside is uncertain
- "Cost of being wrong" is meaningful

### Counter-triggers (do NOT invoke Vāda)

Don't bring in reviewers for:

- Factual questions with known answers ("what year was X released")
- Emotional support, venting, processing feelings
- Creative brainstorming without stakes
- Tasks with obvious right answers (code that doesn't compile, typos)
- Small-scope decisions (< 1 hour of work, fully reversible)
- Conversations where the user seems to want to just think out loud

If uncertain whether a moment is deliberation-worthy, err toward **asking the user** rather than assuming.

---

## Asking permission

When the conversation hits a recognized trigger but the user hasn't explicitly asked for reviewers:

```
This feels like a decision that could benefit from multiple 
perspectives. Want me to bring in Vāda reviewers to pressure-test 
it? I'd reach out to [Strategist, Critic, Devil's Advocate] with 
your context — takes about 20 seconds.
```

User options:
- **Yes** → proceed to brief-writing
- **Not yet** → continue conversation without deliberation
- **Different reviewers** → adjust selection per user request
- **Different question** → refine what's being deliberated

Don't press if the user declines. The invitation is offered once per decision point. If the conversation later reaches a different decision point, the invitation can be offered again.

---

## Writing briefs

Brief quality determines reviewer response quality. This is where the caller Claude does real work.

### Brief structure (required elements)

**1. Context (the "why now")**

What the user is deciding, their constraints, their stated or implied environment. Should be self-contained — the reviewer cannot see the ongoing conversation.

Good: "Dani is a senior frontend architect with 30 days of runway, currently building Vāda while job-searching. The Vāda web app uses Mastra for orchestration..."

Bad: "We're deciding about the project we've been discussing."

**2. Question (the decision)**

Framed as a decision or claim to evaluate, not an open-ended "what do you think." The question should have a specific answer space.

Good: "Should Dani migrate the Vāda web app off Mastra now (3-7 days), or accept the permanent split?"

Bad: "Thoughts on Mastra?"

**3. Current leaning (critical)**

Disclose the Caller Claude's position AND self-doubt. Reviewers push back on positions; they hedge on empty questions.

Good: "I'm leaning toward migration-lite (4 days) because the web is the demo surface. But I'm uncertain whether the demo surface matters as much as I'm weighting it, and I worry the 4-day estimate is optimistic."

Bad: "Here are three options. Thoughts?"

**4. Stakes (the cost of being wrong)**

What happens if the decision goes badly. Anchors reviewers to risk management, not theoretical optimization.

Good: "30 days of runway. Each migration day is 3% of runway. If the migration slips to 7 days, that's 23% of remaining runway spent on invisible infrastructure."

Bad: "This is pretty important."

**5. Per-reviewer notes (optional but high-leverage)**

Specific angles each reviewer should probe. This is where the Caller Claude's knowledge of the reviewers' cognitive modes shows.

Good:
- Strategist: "Focus on runway allocation. Is migration worth 10-20% of remaining runway?"
- Critic: "Probe the assumption that users care about which engine runs under the hood."
- Devil's Advocate: "Challenge the framing. What if web should stay on Mastra and MCP should revert?"

Bad:
- Strategist: "Think strategically."
- Critic: "Be critical."
- Devil's Advocate: "Challenge it."

### Brief-writing checklist

Before invoking Vāda, the Caller Claude verifies:

- [ ] Context is ≥ 100 characters and self-contained
- [ ] Question is framed as a decision or claim
- [ ] Current leaning discloses position AND uncertainty
- [ ] Stakes are named concretely
- [ ] Per-reviewer notes exist (if more than one reviewer)
- [ ] The brief would make sense to a reviewer who has never seen the conversation

If any box is empty, the brief needs more work before dispatching.

---

## Choosing reviewers

### Default selection

For most deliberations: **Strategist + Critic + Devil's Advocate.** Three orthogonal cognitive modes covering decision framing, logical rigor, and frame-breaking.

### When to deviate from default

**Add Domain Expert (flag-gated, experimental)** when the question is heavily domain-specific:
- Legal, medical, regulatory questions
- Industry-specific best practices matter more than general reasoning
- The user is in a niche the Caller Claude's general knowledge might miss

**Drop Devil's Advocate** when:
- The decision is already in contrarian territory (no need to further oppose)
- The user explicitly wants constructive input, not frame-breaking

**Drop Critic** when (rare):
- The question is about taste or values, not logic
- The reasoning has already been heavily vetted

**Two-reviewer quick check**:
- Strategist + Critic
- For time-sensitive questions where 14s beats 18s
- When the user signals they want input, not a full deliberation

### Avoiding the defaulting trap

Reviewers in earlier rounds flagged a real risk: the Caller Claude may default to the same 2 reviewers every time, reducing deliberation quality. Counter-measures:

- **Be deliberate about selection.** Don't dispatch the same set from habit.
- **When in doubt, add Devil's Advocate.** Frame-breaking catches more blind spots than redundant Critic variations.
- **Use Domain Expert when domain matters, even if you usually don't.**
- **Track your own patterns.** If the last 3 deliberations used only Strategist + Critic, consider why.

---

## Integrating Vāda's synthesis

Synthesis is produced by Vāda's engine, not by Caller Claude. Every deliberation YAML that includes a synthesizer agent will return both rendered text content and (when the spec defines an output schema) a structured JSON synthesis object. Caller Claude can integrate the synthesis into its conversation but is not responsible for producing it. See `apps/vada-ai/specs/vada-decisions.md` D-016 for the architectural reversal and D-026 for how the structured/rendered fields surface to consumers.

When Vāda returns its synthesizer output, the Caller Claude integrates it in three steps.

### Step 1: Read Vāda's synthesis fully

No skimming. The synthesis captures convergence, divergence, and proposed conclusions from all reviewer responses. If a `structured` JSON object is present alongside the rendered text, inspect both — the structured field carries machine-readable conclusions (Consensus / Unique / Contradictions / Rejected / Recommendations).

Specifically look for:

- **What the synthesis concluded** — the convergence finding and any proposed solution or recommendation
- **Where reviewers diverged** — contradictions the synthesizer surfaced; these are the live uncertainty zones
- **Unique insights** — points raised by only one reviewer that the synthesizer flagged as non-redundant
- **Unresolved items** — gaps or values tradeoffs the synthesis left explicitly open

### Step 2: Map what remains unresolved

Review Vāda's convergence/divergence analysis for open questions:

**Where the synthesis shows consensus:**
- Did all reviewers land on the same recommendation? Does the synthesis reflect this?
- Are there consensus items that require the user's sign-off?

**Where the synthesis shows contradiction:**
- Which contradictions are fact disputes vs framing vs values?
- Does resolving one require information only the user has?

**What's unresolved:**
- Information gaps or values tradeoffs the synthesis left explicitly open
- Questions that need the user's judgment to close

### Step 3: Flag your own position

After reading Vāda's synthesis, the Caller Claude may find:

- **Agreement with consensus** — integrate and present
- **Dissent from consensus** — disclose explicitly: "Reviewers converged on X. I actually think Y because Z. Here's why I might be wrong..."
- **Shift in own position** — "I came in leaning toward X. After reading reviewers, I think Y now. Here's what changed my mind..."

Never hide a dissent from the user. Your position is part of the deliberation record. If you differ from reviewers, say so.

---

## Presenting to the user

Synthesis goes back to the user. Structure matters.

### Template for presenting Vāda results

```
I consulted [reviewer names] on this. Here's what came back.

**Where they agreed:**
[1-3 bullets of convergence]

**Where they disagreed:**
[1-2 bullets of key divergence, with sides named]

**What they raised that you hadn't considered:**
[1-3 bullets of new angles]

**My reading:**
[Your integration of Vāda's synthesis — whether you agree with the 
conclusions, and what you'd add or push back on. Be explicit about 
whether you agree with consensus or dissent.]

**What I need from you:**
[A specific question or decision point, or an "okay to proceed?"]

[Optional: Link to full session at vada.ai/s/[session_id] for 
detailed reading]
```

### When partial failures occur

If one reviewer timed out or errored:

```
I got responses from [successful reviewers]. [Failed reviewer] 
timed out, so we're missing their perspective on [what they would 
have covered].

Given what we have:
[Synthesis of successful responses]

Worth retrying for the missing perspective, or proceed?
```

Never hallucinate the missing reviewer's position. The user should know what's available and what isn't.

### When synthesis reveals you asked the wrong question

Sometimes reviewers converge on "the question itself is wrong." Handle explicitly:

```
Reviewers flagged that the question I posed may not be the real 
question. [What they said].

I want to reframe to [new question]. Want me to run another round 
with the reframed question, or stick with the original?
```

---

## Multi-round deliberations

V1 of Brokered supports multi-round deliberations via repeated tool calls. The Caller Claude manages the state (no Vāda-side session concept).

### When to run another round

After Round N, run Round N+1 if:

- Reviewers raised a new question that others haven't addressed
- Two reviewers disagreed on a specific point and resolution would change the decision
- New information has emerged (from user or reviewers) that reframes the question
- The user's stakes have clarified and the deliberation should recalibrate

### When to stop

Don't run more rounds when:

- Reviewers are repeating themselves
- Disagreements are mapped but require a values call (user's job)
- The decision is clear enough to act on
- Further rounds would delay, not improve

### Practical guidance

- Most decisions need ONE round. Multi-round should be rare.
- If you've run 2 rounds and the picture isn't clearer, stop and escalate to the user.
- Document the rounds in your synthesis so the user knows how deep the deliberation went.

---

## The single rule for the Caller Claude

Never synthesize past an unaddressed substantive objection without telling the user.

If a reviewer raised something important and no one addressed it, and you're about to hand the user a clean synthesis, stop. Surface the unresolved objection. Let the user decide whether it matters.

This is the Brokered product's core honesty commitment. Polished syntheses that hide disagreement are worse than messy truthful ones.
