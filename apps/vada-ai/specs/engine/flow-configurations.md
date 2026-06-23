# Engine Flow Configurations

**Status:** ratified

Reference for the four RoundsWorkflow configurations supported by `@atta/engine`. Use this when selecting a team structure or debugging graph shape.

---

## Configuration Matrix

| Variant | `auditAgent` | `maxRevisions` | Terminal slots | Audit slots | Conditional edges |
|---------|-------------|----------------|---------------|-------------|-------------------|
| NoAudit | omitted | n/a | 1 | 0 | 0 |
| WithAudit, maxRevisions:0 | set | 0 | 1 | 1 | 0 |
| WithAudit, maxRevisions:1 | set | 1 | 2 | 2 | 1 |
| WithAudit, maxRevisions:N | set | N | N+1 | N+1 | N |

---

## NoAudit

```
[round agents × R rounds] → terminal-0
```

- No audit nodes, no conditional edges.
- `terminalState` is always `CLEAN`.
- Use when deliberation output is trusted without external verification.

**Example teams:** A0, A1 baselines.

---

## WithAudit, maxRevisions: 0

```
[round agents × R rounds] → terminal-0 → audit-*-0
```

- One terminal, one audit slot, no conditional edges.
- Audit runs and can FLAG the conclusion, but there is no revision node to route to.
- Adapter checks the audit output after execution ends: `CLEAN` if no flag, `MAX_REVISIONS` if flagged (same slot as revision-exhausted behavior, but with 0 revisions attempted).
- Use when you want audit visibility without the cost of revision.

**No existing Vāda team uses this today** — it exists as an intermediate configuration and is tested in `packages/engine/src/compilers/rounds.test.ts`.

---

## WithAudit, maxRevisions: 1 (default)

```
[round agents × R rounds] → terminal-0 → audit-*-0
  audit-*-0  --[FLAG]-->  terminal-1 → audit-*-1
  audit-*-0  --[PASS]-->  __END__
  audit-*-1: no outgoing edge (execution ends)
```

- Two terminal slots, two audit slots, one conditional edge.
- If audit-0 flags → revision → terminal-1 → audit-1 (final check).
- `terminalState`: `CLEAN` (audit-0 passes), `REVISED` (audit-0 flags, audit-1 passes), `MAX_REVISIONS` (audit-1 also flags).
- This is the default for Sparring and Crucible teams (`maxRevisions` defaults to 1 when omitted).

**Example teams:** Sparring, Crucible, War Room.

---

## WithAudit, maxRevisions: N

Generalization of the above. Each slot k (0 through N-1) has a conditional edge to terminal-(k+1) on FLAG or `__END__` on PASS. The final slot (N) has no conditional edge.

`maxRevisions > 1` is rarely worth the cost. Audit flags on a second revision usually indicate a systemic prompt issue, not a fixable revision. Raising the limit without fixing the underlying cause only burns tokens.

---

## Audit condition

The conditional edge check uses `workflow.revisionCondition`:

```ts
revisionCondition: {
  type: 'contains',    // only supported type in V1
  value: 'FLAG',
  caseSensitive: false
}
```

Any audit node in the slot whose output contains the trigger value causes revision. This is an `anyOf` check across all auditors in the slot.

---

## Multi-auditor slots

When `auditAgent` is an array (e.g., `['BlindCritic', 'FactChecker']`), auditors run sequentially within each slot. The conditional edge fires if ANY auditor in the slot triggers the revision condition.

```
terminal-k → audit-BlindCritic-k → audit-FactChecker-k
                                        ↓ [conditional]
                                   terminal-(k+1) or __END__
```

---

## Brokered workflow (Phase 7.2 — YAML)

Brokered specs are defined in YAML using the `reviewers:` section with `response.mode: concatenate`. There is no separate `BrokeredWorkflow` type in `@atta/engine`; the YAML is compiled via `compileSpec()` which calls `specToTeam()` and then the standard `compile()`. Reviewer nodes are parallel solo-role nodes with no audit, no synthesis, no revision. See `packages/agents/vada-deliberation/yamls/brokered-trio-v1.yaml` for a reference spec and `specs/yaml-schema-reference.md` for the full schema.
