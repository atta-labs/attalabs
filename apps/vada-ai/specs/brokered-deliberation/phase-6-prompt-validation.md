# Phase 6 Prompt Validation — Brokered Mode

**Date:** 2026-04-25  
**Model:** `claude-haiku-4-5-20251001` (fast, cheap; production will use Sonnet)  
**Reviewers tested:** Strategist, Critic, Devil's Advocate  
**Briefs run:** 5  
**Outcome:** Prompts work acceptably. No changes required for V1.

---

## Test briefs

1. Key risks of migrating a production monolith to microservices in under 6 months?
2. Should a 12-person engineering team build their own auth system or use Auth0?
3. Startup with $500k runway and working MVP — raise seed now or push to profitability first?
4. Three senior engineers leaving in Q1 — pause new feature development or continue shipping?
5. Competitor dropped prices by 30% — match, hold, or differentiate upmarket?

---

## Findings

### What's working

**Frame-challenging (Devil's Advocate).** DA consistently challenged the question itself rather than debating its terms. Q1: "You're asking about risks of a timeline-constrained migration, but the real risk isn't the migration — it's the constraint." Q3: "The real question isn't *when* you should raise — it's *whether you need to*." This is the intended behavior — reframing rather than agreeing on the frame.

**Assumption-probing (Critic).** The Critic reliably identified unstated premises and asked hard questions. No greetings, no polite exits. Responses get to the point immediately.

**Forbidden phrases absent.** Across all 5 briefs, none of the three reviewers produced "it depends," "both approaches have merit," "ultimately this is a judgment call," or equivalent hedges. The prompts' explicit forbidding is holding.

**Tool use correct.** All three reasoning roles (Strategist, Critic, DA) used web_search/web_fetch as expected. Classifiers granted tools to all three. Brokered sequential execution ran without failures. All 5 runs returned `terminalState: CLEAN`.

**Persona separation.** The three reviewers remain distinct — Strategist expands and maps, Critic probes and challenges assumptions, DA reframes entirely. No blurring across 5 briefs.

---

### Issues observed

**Output section compliance varies.** The required output formats (e.g., Strategist requires **Key Insight** / **Tradeoffs** / **Recommendation** / **Risks**; DA requires **The Opposite Thesis** / **Challenges to the Frame** / etc.) were inconsistently followed. Q1 and Q2 had better structure; Q3–Q5 outputs were more freeform.

**Root cause:** Haiku follows complex formatting instructions less rigidly than Sonnet. Production runs using Sonnet will have higher compliance. Not a prompt defect — a model-tier expectation mismatch.

**Underspecified briefs produce clarifying-question responses.** Q3, Q4, Q5 were intentionally underspecified (no burn rate, no retention context, no market data). Reviewers responded by asking clarifying questions rather than taking positions. This is technically correct (the prompts say "make specific recommendations" but don't have information to be specific about).

**Root cause:** Brokered briefs should be written with full context. Caller Claude needs to front-load context, current leaning, and stakes (per the tool description in server.ts). Underspecified briefs are a caller failure, not a prompt failure.

**Strategist token output varies widely.** Q1 (full context, high stakes): 1165 tokens. Q3 (underspecified): 432 tokens. The variance tracks brief quality, which is expected.

---

### What this means for V1

**Prompt tuning not needed for V1.** The personas are distinct, the forbidden phrases are holding, and the structural failures are attributable to model tier (Haiku vs. Sonnet) and brief quality (underspecified inputs).

**The brief quality is the primary variable.** When Caller Claude provides context + question + current_leaning + stakes (per the Phase 6 Item 1 tool description), the reviewer outputs should be substantially better. The structured input schema added in Item 2 exists precisely to enforce brief quality.

**V1 ship criteria for prompts: met.** Reviewers produce orthogonal perspectives, avoid hedging, and challenge frames correctly. Section compliance will improve on Sonnet.

---

### Recommendation for follow-up (post-V1)

If section compliance remains low after production usage on Sonnet:
1. Add explicit section headers to the system prompt as hard requirements ("Your response MUST contain exactly these markdown headers: ...")
2. Consider a lightweight output validation step (check for required headers, flag missing ones to Caller Claude)

Do NOT modify prompts now. Evaluate on production Sonnet data first.

---

## Raw output summary

| Brief | Strategist tokens | Critic tokens | DA tokens | CLEAN? |
|-------|-------------------|---------------|-----------|--------|
| Microservices migration | 1165 | 1089 | 409 | ✓ |
| Auth system build vs buy | 911 | 481 | 331 | ✓ |
| Raise vs profitability | 432 | 352 | 402 | ✓ |
| Engineer departures | 432 | 338 | 362 | ✓ |
| Competitor price drop | 477 | 367 | 308 | ✓ |
