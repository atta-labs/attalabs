# 02 — MCP Tool Interface

## The tool: `vada__deliberate`

One tool. Parallel dispatch to multiple reviewers. Returns structured responses with status per reviewer.

---

## Tool description (shown to Caller Claude)

This text is what the MCP protocol surfaces to any AI that connects. Critical for shaping Claude's usage behavior. It teaches Claude when to invoke Vāda, how to write briefs, and what to expect back.

```
vada__deliberate

Dispatches a deliberation to 2-5 reviewers in parallel. Each reviewer 
brings a distinct cognitive mode to the question. Use this when:

- The user is making a decision with real stakes
- Multiple perspectives would catch blind spots a single reasoning 
  pass would miss
- You want to pressure-test a position before committing
- The user explicitly asks for reviewer input or deliberation

Do NOT use this for:
- Simple factual questions ("what's the capital of France")
- Emotional support or venting
- Creative brainstorming without stakes
- Tasks with obviously one right answer

The Reviewers

Core roster (always available):

- strategist: Maps the decision landscape. Surfaces tradeoffs, 
  hidden costs, long-term implications. Asks "what is the real 
  decision here, and what's the cost of being wrong?"

- critic: Probes assumptions. Finds logical gaps, evidence holes, 
  unstated premises. Asks "what has to be true for this to work, 
  and is it?"

- devils_advocate: Challenges the frame entirely. Forces the 
  opposite thesis to sharpen understanding. Asks "what if the 
  question itself is wrong?"

Experimental (flag-gated, may not be available):

- domain_expert: Context-specific expertise grounded in a named 
  domain (provide 'domain' parameter). Asks "what does this field's 
  standard practice say?"

Writing Briefs

The quality of reviewer responses depends entirely on the quality 
of your briefs. A good brief includes:

1. Context — what the user is deciding, constraints they face, 
   their stated or implied stakes
2. The question — clearly stated, in the form of a decision or 
   claim to evaluate
3. Your current leaning (if any) — disclose your position AND your 
   self-doubt. Let reviewers push back on both.
4. Cost of being wrong — what happens if this goes badly
5. Per-reviewer notes — specific concerns or angles you want each 
   reviewer to probe

A bad brief asks "what do you think?" A good brief says "I think X, 
but I'm uncertain about Y, and the cost of getting Y wrong is Z."

Choosing Reviewers

- Default: 3 reviewers (strategist, critic, devils_advocate)
- Quick check: 2 reviewers (strategist + critic)
- Deep dive: 4 reviewers with domain_expert when domain matters

Vary your reviewer selection. Using the same 2 reviewers for every 
call reduces deliberation quality.

The Response

You receive structured responses per reviewer with:
- Their role
- Their response (soft-structured markdown with Key Points / Risks 
  / Recommendation sections)
- Status (success, timeout, error)
- Latency and model used

Your job after invocation:
1. Read every reviewer's response fully (they compress reality 
   differently; signal hides in divergence)
2. Synthesize for the user: map where reviewers converged, where 
   they disagreed, and what unresolved points remain
3. Flag your own position if it differs from reviewer consensus
4. Present back to user with proposed next steps or a clear decision 
   question

Partial Failures

If one reviewer times out or errors, you'll receive the others 
successfully. Explicitly note the missing perspective to the user. 
Don't hallucinate absent reviewers' positions.

Latency

Expect 15-30 seconds. This is cognitive labor being delegated in 
parallel. Inform the user you're bringing in reviewers before 
invoking.
```

---

## Input schema

```typescript
{
  context: string,           // required, min 50 chars
  question: string,          // required, min 10 chars
  reviewers: ReviewerSpec[], // required, min 2, max 5
  session_title?: string,    // optional, for dashboard display
  current_leaning?: string,  // optional but strongly encouraged
  stakes?: string,           // optional but strongly encouraged
}

type ReviewerSpec = {
  role: 'strategist' | 'critic' | 'devils_advocate' | 'domain_expert'
  notes?: string  // reviewer-specific guidance, max 500 chars
  domain?: string // required if role is 'domain_expert'
}
```

### Parameter notes

**`context`** — shared context every reviewer sees. What the user is deciding, their constraints, their environment. Should be self-contained (reviewer can't see the full conversation).

**`question`** — the specific question being deliberated. Framed as a decision or claim, not an open-ended "what do you think."

**`reviewers`** — array of reviewer specs. Minimum 2 because single-reviewer deliberation doesn't produce convergence/divergence. Maximum 5 to prevent context overload.

**`current_leaning`** — the Caller Claude's current position, if any. CRITICAL for reviewer quality. Reviewers push back on briefs that disclose the caller's position; they hedge on briefs that don't.

**`stakes`** — what happens if the decision goes badly. Shifts reviewer reasoning from theoretical optimization to practical risk management.

**`notes` per reviewer** — optional per-reviewer guidance. Example: for the critic, "probe the assumption that we have a month of runway." For the strategist, "focus on opportunity cost of this path."

### Validation rules

Server-side validation before dispatching:
- `context` must be ≥ 50 characters (rejects "help?")
- `question` must be ≥ 10 characters
- `reviewers` must contain at least 2 distinct roles
- If `domain_expert` is in reviewers, its `domain` field is required
- Each reviewer's `notes` field (if provided) must be ≥ 20 chars if included

On validation failure, return structured error that Caller Claude can correct from:
```json
{
  "status": "validation_error",
  "errors": [
    { "field": "context", "reason": "too_short", "min": 50 },
    { "field": "reviewers.0.notes", "reason": "too_short", "min": 20 }
  ]
}
```

---

## Return schema

```typescript
{
  status: 'complete' | 'partial' | 'failed',
  session_id: string,
  session_url: string,
  responses: ReviewerResponse[],
  total_latency_ms: number,
  total_cost_cents?: number,
}

type ReviewerResponse = 
  | {
      role: 'strategist' | 'critic' | 'devils_advocate' | 'domain_expert',
      status: 'success',
      response: string,        // markdown with required sections
      latency_ms: number,
      model: string,
      input_tokens: number,
      output_tokens: number,
    }
  | {
      role: ReviewerRole,
      status: 'timeout' | 'error',
      error_message: string,
      latency_ms: number,
    }
```

### Status values

- **`complete`** — all requested reviewers returned successfully
- **`partial`** — some reviewers succeeded, some failed (timeout/error)
- **`failed`** — no reviewers returned successfully (rare, usually DB or config issue)

### Response format per reviewer

The `response` string is markdown with required sections defined by the persona's system prompt. See document 03 for exact formats per persona.

Example Strategist response:
```markdown
**Key Insight**

The decision framed as "migrate now vs defer" hides a third option: 
migrate-lite with feature flag. This changes the cost calculus.

**Tradeoffs**

- Full migration: 7 days, high quality, blocks product work
- Defer: cognitive router gap stays visible to users
- Migration-lite: 3-4 days, preserves rollback, ships cognitive router

**Recommendation**

Migration-lite. Preserves 2 weeks of runway for product work while 
closing the product-quality gap.

**Risks / Unknowns**

- SSE reconnect semantics need validation
- Langfuse span inheritance may differ between Mastra and LangGraph
```

---

## Error handling across the interface

### Validation errors (before dispatch)

Return immediately without dispatching any reviewers:
```json
{
  "status": "validation_error",
  "errors": [...],
  "session_id": null
}
```

Caller Claude should surface the error to user or retry with corrected inputs.

### Partial failures (during dispatch)

Some reviewers succeeded, some didn't:
```json
{
  "status": "partial",
  "session_id": "sess_abc",
  "session_url": "https://vada.ai/s/sess_abc",
  "responses": [
    { "role": "strategist", "status": "success", "response": "..." },
    { "role": "critic", "status": "timeout", "error_message": "15s exceeded" },
    { "role": "devils_advocate", "status": "success", "response": "..." }
  ]
}
```

Caller Claude synthesizes from the successful ones, explicitly tells user what's missing.

### Total failures

No reviewers succeeded. Usually indicates Vāda configuration issue (DB unreachable, all LLM providers down, invalid auth):
```json
{
  "status": "failed",
  "session_id": null,
  "error_message": "Database connection failed; no session recorded",
  "responses": []
}
```

Caller Claude should inform user and suggest trying again or proceeding without reviewer input.

---

## Rate limiting

V1 limits (per authenticated user):
- 20 deliberations per hour
- 100 deliberations per day

Rate limit response:
```json
{
  "status": "rate_limited",
  "retry_after_seconds": 300,
  "message": "You've reached 20 deliberations this hour. Try again in 5 minutes."
}
```

Caller Claude surfaces this to user directly — it's their quota, not a Vāda-internal issue.

---

## Example full interaction

### Caller Claude's request

```json
{
  "context": "Dani is a senior frontend architect with 30 days of 
  runway, currently doing a job search while building Vāda. The Vāda 
  web app uses Mastra for deliberation orchestration; the MCP server 
  uses LangGraph. Reviewer convergence earlier suggested migrating 
  web app to LangGraph too, with a wrapper approach.",
  
  "question": "Should Dani migrate the web app off Mastra now (3-7 
  days of work), or accept the permanent split?",
  
  "reviewers": [
    {
      "role": "strategist",
      "notes": "Focus on runway allocation. Is migration worth 10-20% 
      of remaining runway?"
    },
    {
      "role": "critic",
      "notes": "Probe the assumption that users care about which 
      engine runs under the hood. Is this real product value or 
      architectural vanity?"
    },
    {
      "role": "devils_advocate",
      "notes": "Challenge the 'MCP works, migrate web to match' 
      framing. What if web should stay on Mastra and MCP revert?"
    }
  ],
  
  "session_title": "Mastra migration decision",
  
  "current_leaning": "Migration-lite over 4 days. Worth it because 
  web is the demo surface.",
  
  "stakes": "30 days runway. Each migration day is 3% of runway 
  spent on invisible infrastructure vs product work or job apps."
}
```

### Vāda's response

```json
{
  "status": "complete",
  "session_id": "sess_2b3c4d",
  "session_url": "https://vada.ai/s/sess_2b3c4d",
  "total_latency_ms": 18432,
  "total_cost_cents": 12,
  "responses": [
    {
      "role": "strategist",
      "status": "success",
      "response": "**Key Insight**\n\nRunway allocation frame ignores...",
      "latency_ms": 14203,
      "model": "claude-sonnet-4-20250514",
      "input_tokens": 842,
      "output_tokens": 311
    },
    {
      "role": "critic",
      "status": "success",
      "response": "**Core Assumption Challenged**\n\n...",
      "latency_ms": 16891,
      "model": "claude-sonnet-4-20250514",
      "input_tokens": 842,
      "output_tokens": 287
    },
    {
      "role": "devils_advocate",
      "status": "success",
      "response": "**What If the Frame is Wrong**\n\n...",
      "latency_ms": 18432,
      "model": "claude-sonnet-4-20250514",
      "input_tokens": 842,
      "output_tokens": 298
    }
  ]
}
```

Caller Claude receives this, reads each response, synthesizes, presents to user.
