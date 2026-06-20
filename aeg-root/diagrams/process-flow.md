---
sidebar_title: Process Flow
---
# Process flow diagram

Visual representation of the AEG workflow described in `process.md`. Shows actors, artifacts, gates, and decision points.

For the prose walkthrough, see `process.md`. For the optional orchestration tool's software architecture, see `system-architecture.md`.

> **Status is derived, never stored.** These diagrams show transitions as *forge facts* (Issue assigned, branch exists, PR open, review decision, merged) — not as status labels anyone writes. Where a diagram and the prose docs disagree, the prose is canonical.

---

## High-level flow

```mermaid
flowchart TD
    Start([Dani has an idea]) --> P0[Phase 0: Iteration planning<br/>TL Planner mode → Issues + thin topology file]

    P0 --> P1[Phase 1: Idea origination<br/>Principal + TL Strategist mode]

    P1 --> P1Decision{Idea worth<br/>pursuing?}
    P1Decision -->|No / already specced| End1([End: idea dies])
    P1Decision -->|Yes, high-stakes| P2[Phase 2: Pressure-testing<br/>TL + external reviewers]
    P1Decision -->|Yes, normal stakes| P3

    P2 --> P2Decision{Direction<br/>holds?}
    P2Decision -->|Structural flaw| P1
    P2Decision -->|Validated| P3[Phase 3: Brief authoring just-in-time<br/>TL Brief Author mode]

    P3 --> P3Out[/Brief written, pasted to Developer<br/>lands in PR body — never in the Issue/]
    P3Out --> P4[Phase 4: Brief validation<br/>Archivist gate + Developer entry gate]

    P4 --> P4Decision{Brief<br/>well-formed?}
    P4Decision -->|No| P4Block[/needs:brief-correction<br/>back to Brief Author/]
    P4Block --> P3
    P4Decision -->|Yes| P5[Phase 5: Dispatch<br/>Principal — manual paste or automation layer]

    P5 --> P5Gate{Dispatch gates<br/>clear?}
    P5Gate -->|depends-on not merged,<br/>or conflict PR open| P5Wait[/Serialize — wait/]
    P5Gate -->|clear| P5Out[/Worktree task/iteration/n created<br/>branch exists = in-flight/]
    P5Out --> P6[Phase 6: Execution<br/>Developer in worktree]

    P6 --> P6Decision{Blocked on<br/>decision?}
    P6Decision -->|Yes| P7[Phase 7: Escalation<br/>escalation mechanism + severity]
    P6Decision -->|No| P8[Phase 8: Task Done verification<br/>Developer runs checklist + verify-docs]

    P7 --> P7Route{Severity<br/>routing}
    P7Route -->|execution| P7TL[TL Brief Author replies]
    P7Route -->|strategy| P7TLStrat[TL Strategist replies]
    P7Route -->|product| P7Princ[Principal replies<br/>or queues for ratification window]
    P7TL --> P6
    P7TLStrat --> P6
    P7Princ --> P6

    P8 --> P8Decision{All checks<br/>pass?}
    P8Decision -->|No| P6
    P8Decision -->|Yes| P9[Phase 9: PR opened<br/>brief into PR body = in-review derived]

    P9 --> P9Out[/CI runs verify-docs<br/>Archivist posts advisory comments/]
    P9Out --> P10A[Phase 10a: code-reviewer pass<br/>then security pass — fresh context]

    P10A --> P10ADecision{Verdicts<br/>clean?}
    P10ADecision -->|BLOCKER / CRITICAL / HIGH| P6
    P10ADecision -->|APPROVE / PASS| P10B[Phase 10b: Principal code review<br/>+ TL spec review]

    P10B --> P10Decision{Reviews<br/>pass?}
    P10Decision -->|Issues found| P6
    P10Decision -->|All pass| P11[Phase 11: Merge<br/>Principal — Tier 3 at ratification window]

    P11 --> P11Out[/Merge auto-closes Issue Closes-N<br/>merged status derived<br/>Archivist close-out/]
    P11Out --> End2([End: work shipped])

    classDef tlStrat fill:#bbdefb,stroke:#1565c0,color:#000
    classDef tlPlan fill:#b3e5fc,stroke:#0277bd,color:#000
    classDef tlBriefDispatch fill:#ffe0b2,stroke:#e65100,color:#000
    classDef archivist fill:#e1bee7,stroke:#6a1b9a,color:#000
    classDef developer fill:#c8e6c9,stroke:#2e7d32,color:#000
    classDef escalation fill:#fff59d,stroke:#f57f17,color:#000
    classDef reviewer fill:#d1c4e9,stroke:#4527a0,color:#000
    classDef principalReview fill:#f8bbd0,stroke:#ad1457,color:#000
    classDef terminus fill:#cfd8dc,stroke:#455a64,color:#000
    classDef gate fill:#ffccbc,stroke:#bf360c,color:#000

    class P1,P2 tlStrat
    class P0 tlPlan
    class P3,P5 tlBriefDispatch
    class P4,P4Block archivist
    class P6,P8,P9,P9Out,P5Out,P3Out,P11Out developer
    class P7,P7TL,P7TLStrat,P7Princ escalation
    class P10A reviewer
    class P10B,P11 principalReview
    class Start,End1,End2,P5Wait terminus
    class P1Decision,P2Decision,P4Decision,P5Gate,P6Decision,P7Route,P8Decision,P10ADecision,P10Decision gate
```

**Color coding:**
- Light blue: TL Planner mode — decomposing an iteration into Issues + edges
- Blue: TL Strategist mode — thinking, pressure-testing
- Orange: TL Brief Author mode + Principal dispatch — formalization
- Purple: Archivist (validation gate, close-out, advisory)
- Green: Developer work + artifacts produced during execution
- Yellow: Escalation routing
- Deep purple: Reviewer + Security passes (fresh context)
- Pink: Principal + TL review and merge
- Grey: Start/end/wait states
- Salmon: Decision gates

---

## Actor responsibilities by phase

```mermaid
flowchart LR
    subgraph Principal["Principal (Dani)"]
        P_Idea[Originates ideas]
        P_Approve[Approves briefs + iterations]
        P_Type1[Ratifies Type 1 decisions]
        P_Review[Reviews PR code]
        P_Merge[Merges PRs]
    end

    subgraph TL["Team Leader (Claude Desktop / web)"]
        TL_Strat[Strategist:<br/>pressure-test, log decisions,<br/>run reviewer rounds]
        TL_Plan[Planner:<br/>iteration → Issues + edges,<br/>plan-integrity gates]
        TL_Brief[Brief Author:<br/>write briefs just-in-time,<br/>review specs on PRs]
    end

    subgraph Developer["Developer (Claude Code)"]
        D_Gate[Check forge dispatch gates]
        D_Read[Read brief, specs, skills]
        D_Code[Write code + tests]
        D_Doc[Update specs, skills, decision logs]
        D_Verify[Run Task Done checklist]
        D_PR[Open PR — brief into body]
        D_Escalate[Escalate by severity]
    end

    subgraph Reviewers["Reviewer + Security (fresh context)"]
        R_Code[Code-reviewer pass:<br/>APPROVE / REQUEST CHANGES]
        R_Sec[Security pass:<br/>PASS / FAIL]
    end

    subgraph Archivist["Archivist (automation)"]
        A_Validate[Validate briefs — needs:brief-correction]
        A_Verify[verify-docs CI gate]
        A_CloseOut[Close-out: changelog, per-product PM,<br/>flag orphans + worktrees]
        A_Index[Regenerate docs-index.md]
        A_Drift[Flag drift in daily cron]
    end

    P_Idea -.discusses with.-> TL_Strat
    TL_Plan -.produces Issues for.-> Developer
    TL_Strat -.synthesizes for.-> P_Approve
    TL_Brief -.writes brief for.-> Developer
    A_Validate -.gates.-> Developer
    Developer -.escalates to.-> TL_Brief
    Developer -.escalates to.-> TL_Strat
    Developer -.escalates to.-> P_Type1
    D_PR -.triggers.-> A_Verify
    D_PR -.reviewed by.-> R_Code
    R_Code -.then.-> R_Sec
    R_Sec -.feeds.-> P_Review
    P_Review --> P_Merge
    TL_Brief -.spec review.-> P_Merge
    P_Merge --> A_CloseOut
    A_CloseOut --> A_Index

    classDef principalCluster fill:#f8bbd0,stroke:#ad1457,color:#000
    classDef tlCluster fill:#bbdefb,stroke:#1565c0,color:#000
    classDef devCluster fill:#c8e6c9,stroke:#2e7d32,color:#000
    classDef revCluster fill:#d1c4e9,stroke:#4527a0,color:#000
    classDef archCluster fill:#e1bee7,stroke:#6a1b9a,color:#000

    class P_Idea,P_Approve,P_Type1,P_Review,P_Merge principalCluster
    class TL_Strat,TL_Plan,TL_Brief tlCluster
    class D_Gate,D_Read,D_Code,D_Doc,D_Verify,D_PR,D_Escalate devCluster
    class R_Code,R_Sec revCluster
    class A_Validate,A_Verify,A_CloseOut,A_Index,A_Drift archCluster
```

---

## Artifact lifecycle

What gets created or mutated as work flows through the phases. **No status is written** — status is derived from the forge facts shown.

```mermaid
flowchart TD
    subgraph Phase0["Phase 0: Iteration planning (Planner)"]
        IssueSet[GitHub Issues<br/>one per task — identity + metadata]
        ThinFile[iterations/name.md<br/>topology: edges + grouping, NO status]
    end

    subgraph Phase1["Phase 1: Idea"]
        Conv1[Conversation log — ephemeral]
        Dec1[decisions.md — D-### if commitment made]
    end

    subgraph Phase3["Phase 3: Brief (just-in-time)"]
        Brief[Brief — pasted, not committed<br/>destined for the PR body]
    end

    subgraph Phase5["Phase 5: Dispatch"]
        Worktree[Worktree:<br/>.worktrees/task/iteration/n<br/>branch exists = in-flight]
        ToolRuntime[Optional: automation-layer runtime<br/>only if a tool is used]
    end

    subgraph Phase6["Phase 6: Execution"]
        Code[Code commits on task branch]
        Tests[Tests added/updated]
        Specs[Specs created/updated per tier]
        Skills[Skills created/updated per tier]
        DecLog[Decision log entries if architecture changed]
    end

    subgraph Phase7["Phase 7: Escalation (optional)"]
        BlockedLabel[aeg:blocked label + needs:*-input]
        QueueEntry[ratification-queue.md entry if Type 1]
    end

    subgraph Phase9["Phase 9: PR"]
        PR[Pull Request — brief in body<br/>PR open = in-review derived]
        DocsIndex[docs-index.md updated if files moved]
        AdvisoryComment[Archivist advisory comments]
    end

    subgraph Phase11["Phase 11: Merge + close-out"]
        Main[Code in main]
        Closed[Issue auto-closed via Closes-N<br/>merged status derived]
        CloseOut[changelog appended; per-product PM updated;<br/>orphans + worktree flagged]
    end

    Phase0 --> Phase1
    Phase1 --> Phase3
    Phase3 --> Phase5
    Phase5 --> Phase6
    Phase6 -.optional.-> Phase7
    Phase7 -.resumes.-> Phase6
    Phase6 --> Phase9
    Phase9 --> Phase11

    classDef phaseBox fill:#f5f5f5,stroke:#424242,color:#000
    class IssueSet,ThinFile,Conv1,Dec1,Brief,Worktree,ToolRuntime,Code,Tests,Specs,Skills,DecLog,BlockedLabel,QueueEntry,PR,DocsIndex,AdvisoryComment,Main,Closed,CloseOut phaseBox
```

---

## Ratification window flow

How Type 1 decisions, Tier 3 merges, and Lock approvals batch through governance windows.

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant TL as Team Leader
    participant Queue as ratification-queue.md
    participant Princ as Principal (Dani)

    Note over Dev,Princ: During execution, Type 1 decision needed

    Dev->>TL: escalate (severity: product)
    TL->>Queue: Append entry: question, context, deadline
    Queue->>Dev: Reply: "QUEUED for next ratification window"

    Note over Dev: Developer terminates this dispatch

    Note over Princ: At ratification window

    Princ->>Queue: Read all pending items
    Princ->>Queue: Resolve each: ratify, reject, or defer
    Queue->>TL: Notify of ratifications (chat session)
    TL->>Dev: Re-dispatch with amended brief if needed

    Note over TL: Same flow for Type 2 PENDING items<br/>and Lock approvals
```

---

## Severity routing

How escalations route based on severity. (The escalation mechanism is manual, or an automation layer's request-input — the routing is identical either way.)

```mermaid
flowchart TD
    Block[Developer blocks<br/>escalates with severity] --> Severity{severity<br/>field}

    Severity -->|execution| ExecRoute[label: needs:execution-input]
    Severity -->|strategy| StratRoute[label: needs:strategy-input]
    Severity -->|product| ProdRoute[label: needs:principal-input]

    ExecRoute --> ExecResp[TL Brief Author mode responds]
    StratRoute --> StratResp[TL Strategist mode responds]
    ProdRoute --> ProdResp{Principal<br/>available?}

    ProdResp -->|Yes| PrincReply[Principal replies directly]
    ProdResp -->|No| QueueRatif[Queue for next<br/>ratification window]

    ExecResp --> Reply[Reply delivered to Developer]
    StratResp --> Reply
    PrincReply --> Reply
    QueueRatif --> Terminate[Developer terminates<br/>resumes after window]

    Reply --> DevResume[Developer resumes execution]

    classDef tlNode fill:#bbdefb,stroke:#1565c0,color:#000
    classDef principalNode fill:#f8bbd0,stroke:#ad1457,color:#000
    classDef queueNode fill:#fff59d,stroke:#f57f17,color:#000
    classDef neutralNode fill:#f5f5f5,stroke:#424242,color:#000

    class ExecRoute,StratRoute,ExecResp,StratResp tlNode
    class ProdRoute,PrincReply principalNode
    class QueueRatif,Terminate queueNode
    class Block,Severity,ProdResp,Reply,DevResume neutralNode
```

---

## Tier-driven gating

Which gates apply depending on impact tier.

```mermaid
flowchart LR
    Brief[Brief authored<br/>tier: 0/1/3] --> Tier{Impact<br/>tier?}

    Tier -->|Tier 0| T0[Skip Phase 2<br/>Minimal Phase 3<br/>Minimal Phase 8 checklist<br/>Light Phase 10]
    Tier -->|Tier 1| T1[Skip Phase 2 unless contested<br/>Standard Phase 3<br/>Tier 1 checklist:<br/>typecheck, lint, tests,<br/>specs, skills, verify-docs]
    Tier -->|Tier 3| T3[Phase 2 often required<br/>Detailed Phase 3<br/>Tier 3 checklist:<br/>all Tier 1 + decision log<br/>+ PM docs + Lock if irreversible]

    T0 --> Merge0[Anytime merge]
    T1 --> Merge1[Anytime merge]
    T3 --> Merge3[Ratification window merge]

    classDef tier0 fill:#c8e6c9,stroke:#2e7d32,color:#000
    classDef tier1 fill:#fff59d,stroke:#f57f17,color:#000
    classDef tier3 fill:#ffab91,stroke:#bf360c,color:#000
    classDef neutral fill:#f5f5f5,stroke:#424242,color:#000

    class T0,Merge0 tier0
    class T1,Merge1 tier1
    class T3,Merge3 tier3
    class Brief,Tier neutral
```

---

## How to read these diagrams

- **High-level flow** — the canonical map of work. Find where a piece of work is.
- **Actor responsibilities** — who does what; your role determines which boxes are yours.
- **Artifact lifecycle** — what gets created when; note status is derived, never an artifact.
- **Ratification window flow** — governance cadence for Tier 3 / Type 1.
- **Severity routing** — what happens when a Developer blocks.
- **Tier-driven gating** — what discipline applies to a given task.

---

## Diagrams are documentation

These diagrams are part of the canonical operational model. Updates to the process require updating both `process.md` and these diagrams in the same PR. Out-of-sync diagrams are spec drift. Where a diagram and the prose disagree, the prose (`process.md`, `iterations/README.md`, `state-machine.md`) is canonical.
