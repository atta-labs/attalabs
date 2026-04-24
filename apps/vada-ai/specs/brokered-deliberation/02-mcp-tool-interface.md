# 02 — MCP Tool Interface

## The tool: `vada__consult`

One tool. Invokes a Vāda team (currently `brokeredTrio`: Strategist + Critic + Devil's Advocate) through the Vāda deliberation engine. Sequential execution in V1. Returns structured responses per reviewer.

The name `vada__consult` is what ships in Phase 4. Earlier specs used `vada__deliberate` aspirationally; the actual tool is named `consult` to distinguish Brokered from Autonomous and to fit naturally as a verb in Caller Claude's vocabulary ("let me consult Vāda on this").

---

## Tool description (shown to Caller Claude)

This text is what the MCP protocol surfaces to any AI that connects. Critical for shaping Claude's usage behavior. Current implementation has a minimal description; Phase 6 expands it to the full text below.

```
vada__consult

Invokes Vāda Brokered deliberation — 2-5 specialized reviewers each 
produce their own perspective on a question. Use when:

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

The Reviewers (V1)

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

Experimental (flag-gated, may not be available in this installation):

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
- Their response (markdown with Key Points / Risks / Recommendation sections)
- Latency and model used

Your job after invocation:
1. Read every reviewer's response fully (they compress reality 
   differently; signal hides in divergence)
2. Synthesize for the user: map where reviewers converged, where 
   they disagreed, and what unresolved points remain
3. Flag your own position if it differs from reviewer consensus
4. Present back to user with proposed next steps or a clear decision 
   question

Latency

Sequential execution in V1. Expect 3× the latency of a single 
reviewer (~30-60 seconds for 3 reviewers). This is cognitive labor 
being delegated. Inform the user before invoking.
```

---

## Input schema (V1 target)

Current implementation accepts `brief` and `reviewers[]`. Phase 6 expands to structured input:

```typescript
{
  context: string,              // required, min 50 chars
  question: string,              // required, min 10 chars
  reviewers: ReviewerSpec[],     // required, 2-5 items
  session_title?: string,        // optional, for dashboard display
  current_leaning?: string,      // optional but strongly encouraged
  stakes?: string,               // optional but strongly encouraged
}

type ReviewerSpec = {
  role: 'strategist' | 'critic' | 'devils_advocate' | 'domain_expert'
  notes?: string  // reviewer-specific guidance, max 500 chars
  domain?: string // required if role is 'domain_expert'
}
```

### Parameter notes

**`context`** — shared context every reviewer sees. What the user is deciding, their constraints, their environment. Should be self-contained (reviewers can't see the full conversation).

**`question`** — the specific question being deliberated. Framed as a decision or claim, not open-ended.

**`reviewers`** — array of reviewer specs. Minimum 2 because single-reviewer deliberation doesn't produce convergence/divergence. Maximum 5 to prevent context overload.

**`current_leaning`** — the Caller Claude's current position, if any. CRITICAL for reviewer quality. Reviewers push back on briefs that disclose the caller's position; they hedge on briefs that don't.

**`stakes`** — what happens if the decision goes badly. Shifts reviewer reasoning from theoretical optimization to practical risk management.

**`notes` per reviewer** — optional per-reviewer guidance.

### Validation rules (V1 target, Phase 6)

Server-side validation before dispatching:
- `context` must be ≥ 50 characters
- `question` must be ≥ 10 characters
- `reviewers` must contain at least 2 distinct roles
- If `domain_expert` is in reviewers, its `domain` field is required
- Each reviewer's `notes` field (if provided) must be ≥ 20 chars

On validation failure, return structured error:
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

Current implementation returns per-reviewer `responses[]`. Phase 6 adds session metadata:

```typescript
{
  status: 'complete' | 'failed',
  session_id: string,
  session_url: string,
  responses: ReviewerResponse[],
  total_latency_ms: number,
  total_cost_cents?: number,
}

type ReviewerResponse = {
  role: 'strategist' | 'critic' | 'devils_advocate' | 'domain_expert',
  response: string,        // markdown with required sections
  latency_ms: number,
  model: string,
  input_tokens: number,
  output_tokens: number,
}
```

### V1 status on status values

V1 is sequential and all-or-nothing:
- **`complete`** — all reviewers returned successfully
- **`failed`** — plan execution failed (any reason)

Partial success (some reviewers succeed, some fail) requires parallel execution and is deferred to Phase 4.5. When parallel lands:
- **`partial`** — some reviewers succeeded, some failed
- Per-reviewer status markers (`'success' | 'timeout' | 'error'`)

### Response format per reviewer

The `response` string is markdown with required sections defined by the persona's system prompt. See document 03 for exact formats per persona.

---

## Error handling across the interface

### Validation errors (V1 target, Phase 6)

Return immediately without invoking the engine:
```json
{
  "status": "validation_error",
  "errors": [...],
  "session_id": null
}
```

### Engine execution failures

Plan execution fails (timeout, LLM provider error, internal error):
```json
{
  "status": "failed",
  "session_id": "sess_abc",
  "error_message": "Reviewer 'strategist' failed: timeout after 60s",
  "responses": []
}
```

Caller Claude should inform user and suggest trying again.

---

## Example full interaction

### Caller Claude's request (V1 target)

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

### Vāda's response (V1 target)

```json
{
  "status": "complete",
  "session_id": "sess_2b3c4d",
  "session_url": "https://vada.ai/brokered/consultations/sess_2b3c4d",
  "total_latency_ms": 48230,
  "total_cost_cents": 12,
  "responses": [
    {
      "role": "strategist",
      "response": "**Key Insight**\n\nRunway allocation frame...",
      "latency_ms": 14203,
      "model": "claude-sonnet-4-20250514",
      "input_tokens": 842,
      "output_tokens": 311
    },
    {
      "role": "critic",
      "response": "**Core Assumption Challenged**\n\n...",
      "latency_ms": 16891,
      "model": "claude-sonnet-4-20250514",
      "input_tokens": 842,
      "output_tokens": 287
    },
    {
      "role": "devils_advocate",
      "response": "**What If the Frame is Wrong**\n\n...",
      "latency_ms": 17136,
      "model": "claude-sonnet-4-20250514",
      "input_tokens": 842,
      "output_tokens": 298
    }
  ]
}
```

Caller Claude receives this, reads each response, synthesizes, presents to user.

---

## V1 implementation notes

### Tool name

Actual tool in Phase 4 shipment: `vada__consult`. This doc uses that name. Earlier spec drafts used `vada__deliberate`; those references have been updated.

### Current shape vs V1 target

Phase 4 delivered a working tool with minimal input/output shape:
- Input: `{ brief, reviewers[] }`
- Output: `{ responses[] }`

Phase 6 work migrates to the richer V1 target schema above. Transition should be backward-compatible where possible (new fields optional, existing callers continue to work).

### What caller Claude does today vs what it should do

Today the tool description is minimal. Caller Claude invokes it but doesn't know:
- When to use Brokered vs just answering directly
- How to write good briefs
- How to synthesize responses well

Phase 6 item 1 (expand tool description) addresses this. Until then, Brokered works but isn't used optimally.
