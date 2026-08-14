**Conforms-to:** vada-rethink-v1-decision.md
**Iteration:** vada-production-v1
**Task:** 13
**Project(s):** vada, engine, adapter
**Depends-on:** #177 (T3), #186 (T11)
**Conflicts-with:** —
**Ticket:** —

---

### Docs to keep coherent

- `apps/vada-ai/specs/vada-backlog.md` — mark E8–E12 closed
- `apps/vada-ai/mcp/` — update MCP capability doc with situated-loop hardening status

---

### Boundary

Production hardening across two concerns:

**1. MCP situated-loop hardening (first-class, alongside E8–E12)**

The MCP surface is Vāda's primary product surface in V1 (see `vada-rethink-v1-decision.md` §3). Hardening the situated loop is NOT optional follow-up — it is the same priority as the web hardening items.

MCP situated-loop hardening scope:
- The `vada__consult` and `vada__deliberate` tool calls return the battlefield-map contract from T7 (structured JSON, not prose)
- Error states for tool-equipped runs mid-deliberation: what the MCP caller receives when a tool call fails, a reviewer times out, or the synthesis step fails — must be structured and actionable, never a raw exception
- Streaming vs. non-streaming return: confirm which pattern is used and document it
- Rate-limit and context-size behavior: what happens when a reviewer exceeds the model's context window during a round
- The MCP tool call surface aligns with the web surface — same engine, same output contract, observable by the same audit trail

**2. Hosted MCP hardening (E8–E12)**

Items E8–E12 from `apps/vada-ai/specs/vada-backlog.md` — check the current list at task start (items may have been closed by earlier tasks). For each item: verify open, implement, confirm with a test.

**3. Observability and error states**

- Observability confirmed: the T3 hook is wired and emitting data for all conditions (including Outside Read panel runs and Belief Revision rounds)
- Reviewers ERROR fully closed: verify from production logs post-T1 that the ERROR state is not recurring
- Error states for tool-equipped runs: what the user sees when a tool call fails mid-deliberation — never a raw exception

NOT in scope: new features.

### Sizing

Varies by findings. One PR per concern if needed, or one consolidated PR. Passes all four tests for each sub-concern.

### Project(s) + blast radius

vada, engine, adapter (as applicable).

**Dependency rationale** — Depends on T3 (#177 — observability hook) and T11 (#186 — benchmark run may surface hardening gaps not visible before real load). MCP situated-loop hardening also depends on T7 (#182 — battlefield-map return contract must be locked before the MCP surface can return it).

### Traps to avoid

Do not treat MCP hardening as lower priority than E8–E12. The MCP surface is the primary V1 product surface. Any hardening item that requires a new shared-engine interface must be escalated before implementing.

### Suggested agent-class

high.

### Stop-and-escalate

Any hardening item that requires a new shared-engine interface, escalate `severity:strategy`. If T7 battlefield-map contract is not merged and stable, the MCP return shape cannot be hardened — stop and report.




