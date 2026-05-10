# Process flow diagram

Visual representation of the eleven-phase workflow described in `process.md`. This shows actors, artifacts, gates, and decision points.

For the prose walkthrough, see `process.md`.
For the static system architecture (no agents, just code modules), see `system-architecture.md`.

---

## High-level flow

```mermaid
flowchart TD
    Start([Dani has an idea]) --> P1[Phase 1: Idea origination<br/>Principal + TL Strategist mode]

    P1 --> P1Decision{Idea worth<br/>pursuing?}
    P1Decision -->|No / already specced| End1([End: idea dies])
    P1Decision -->|Yes, high-stakes| P2[Phase 2: Pressure-testing<br/>TL + external reviewers]
    P1Decision -->|Yes, normal stakes| P3

    P2 --> P2Decision{Direction<br/>holds?}
    P2Decision -->|Structural flaw| P1
    P2Decision -->|Validated| P3[Phase 3: Brief authoring<br/>TL Brief Author mode]

    P3 --> P3Out[/GitHub Issue created<br/>tier label, status:todo/]
    P3Out --> P4[Phase 4: Brief validation<br/>Archivist automation]

    P4 --> P4Decision{Brief<br/>valid?}
    P4Decision -->|No| P4Block[/status:blocked<br/>needs:brief-correction/]
    P4Block --> P3
    P4Decision -->|Yes| P4Pass[/status:ready/]

    P4Pass --> P5[Phase 5: Dispatch<br/>Principal calls cetana.dispatch_task]
    P5 --> P5Out[/Worktree created<br/>Claude Code spawned<br/>JSONL log started/]
    P5Out --> P6[Phase 6: Execution<br/>Developer in worktree]

    P6 --> P6Decision{Blocked on<br/>decision?}
    P6Decision -->|Yes| P7[Phase 7: Escalation<br/>cetana_request_input + severity]
    P6Decision -->|No| P8[Phase 8: Task Done verification<br/>Developer runs checklist + verify-docs]

    P7 --> P7Route{Severity<br/>routing}
    P7Route -->|execution| P7TL[TL replies<br/>via cetana.reply_to_blocked_task]
    P7Route -->|strategy| P7TLStrat[TL Strategist mode replies]
    P7Route -->|product| P7Princ[Principal replies<br/>or queues for ratification window]
    P7TL --> P6
    P7TLStrat --> P6
    P7Princ --> P6

    P8 --> P8Decision{All checks<br/>pass?}
    P8Decision -->|No| P6
    P8Decision -->|Yes| P9[Phase 9: PR opened<br/>Developer]

    P9 --> P9Out[/CI runs verify-docs<br/>Archivist posts advisory comments<br/>status:review/]
    P9Out --> P10[Phase 10: Review<br/>Principal reviews code<br/>TL reviews specs]

    P10 --> P10Decision{Reviews<br/>pass?}
    P10Decision -->|Issues found| P6
    P10Decision -->|All pass| P11[Phase 11: Merge<br/>Principal during ratification window]

    P11 --> P11Out[/Code in main<br/>Issue closed<br/>Archivist runs post-merge automation/]
    P11Out --> End2([End: work shipped])

    classDef tlStrat fill:#bbdefb,stroke:#1565c0,color:#000
    classDef tlBriefDispatch fill:#ffe0b2,stroke:#e65100,color:#000
    classDef archivist fill:#e1bee7,stroke:#6a1b9a,color:#000
    classDef developer fill:#c8e6c9,stroke:#2e7d32,color:#000
    classDef escalation fill:#fff59d,stroke:#f57f17,color:#000
    classDef principalReview fill:#f8bbd0,stroke:#ad1457,color:#000
    classDef terminus fill:#cfd8dc,stroke:#455a64,color:#000
    classDef gate fill:#ffccbc,stroke:#bf360c,color:#000

    class P1,P2 tlStrat
    class P3,P5 tlBriefDispatch
    class P4,P4Pass,P4Block archivist
    class P6,P8,P9,P9Out,P5Out,P3Out,P11Out developer
    class P7,P7TL,P7TLStrat,P7Princ escalation
    class P10,P11 principalReview
    class Start,End1,End2 terminus
    class P1Decision,P2Decision,P4Decision,P6Decision,P7Route,P8Decision,P10Decision gate
```

**Color coding:**
- Blue: TL Strategist mode work — thinking, pressure-testing
- Orange: TL Brief Author mode + Principal dispatch — formalization
- Purple: Archivist automation (validation, indexing, advisory)
- Green: Developer work + artifacts produced during execution
- Yellow: Escalation routing
- Pink: Principal + TL review and merge
- Grey: Start/end states
- Salmon: Decision gates

All boxes use dark text on light backgrounds for readability.

---

## Actor responsibilities by phase

```mermaid
flowchart LR
    subgraph Principal["Principal (Dani)"]
        P_Idea[Originates ideas]
        P_Approve[Approves briefs]
        P_Type1[Ratifies Type 1 decisions]
        P_Review[Reviews PR code]
        P_Merge[Merges PRs]
    end

    subgraph TL["Team Leader (Claude Desktop / web)"]
        TL_Strat[Strategist mode:<br/>pressure-test, push back,<br/>log decisions, run reviewer rounds]
        TL_Brief[Brief Author mode:<br/>write briefs, update PM docs,<br/>review specs on PRs]
    end

    subgraph Developer["Developer (Claude Code)"]
        D_Read[Read brief, specs, skills]
        D_Code[Write code + tests]
        D_Doc[Update specs, skills, decision logs]
        D_Verify[Run Task Done checklist]
        D_PR[Open PR]
        D_Escalate[Escalate via cetana_request_input]
    end

    subgraph Archivist["Archivist (automation)"]
        A_Validate[Validate briefs on issue open]
        A_Verify[verify-docs CI script]
        A_Index[Regenerate docs-index.md]
        A_Sequence[Validate D-### sequencing]
        A_Drift[Flag drift in daily cron]
    end

    P_Idea -.discusses with.-> TL_Strat
    TL_Strat -.synthesizes for.-> P_Approve
    TL_Brief -.writes brief for.-> Developer
    A_Validate -.gates.-> Developer
    Developer -.escalates to.-> TL_Brief
    Developer -.escalates to.-> TL_Strat
    Developer -.escalates to.-> P_Type1
    D_PR -.triggered by.-> A_Verify
    P_Review --> P_Merge
    TL_Brief -.spec review.-> P_Merge
    P_Merge --> A_Index
    P_Merge --> A_Sequence

    classDef principalCluster fill:#f8bbd0,stroke:#ad1457,color:#000
    classDef tlCluster fill:#bbdefb,stroke:#1565c0,color:#000
    classDef devCluster fill:#c8e6c9,stroke:#2e7d32,color:#000
    classDef archCluster fill:#e1bee7,stroke:#6a1b9a,color:#000

    class P_Idea,P_Approve,P_Type1,P_Review,P_Merge principalCluster
    class TL_Strat,TL_Brief tlCluster
    class D_Read,D_Code,D_Doc,D_Verify,D_PR,D_Escalate devCluster
    class A_Validate,A_Verify,A_Index,A_Sequence,A_Drift archCluster
```

---

## Artifact lifecycle

What gets created or mutated as work flows through the phases.

```mermaid
flowchart TD
    subgraph Phase1["Phase 1: Idea"]
        Conv1[Conversation log<br/>ephemeral]
        Think1[thinking.md<br/>updated if open tensions]
        Dec1[decisions.md<br/>D-### entry if commitment made]
    end

    subgraph Phase3["Phase 3: Brief"]
        Issue[GitHub Issue<br/>with brief + tier label]
    end

    subgraph Phase5["Phase 5: Dispatch"]
        Worktree[Worktree:<br/>~/code/atta/.worktrees/issue-N/]
        JSONL[JSONL log:<br/>~/.cetana/tasks/taskId.jsonl]
        IPC[IPC dir:<br/>~/.cetana/tasks/taskId/]
        Comment1[GitHub comment:<br/>dispatch confirmed]
    end

    subgraph Phase6["Phase 6: Execution"]
        Code[Code commits on feat branch]
        Tests[Tests added/updated]
        Specs[Specs created/updated<br/>per impact tier]
        Skills[Skills created/updated<br/>per impact tier]
        DecLog[Decision log entries<br/>if architecture changed]
        Progress[task.progress events<br/>in JSONL]
    end

    subgraph Phase7["Phase 7: Escalation (optional)"]
        Question[question.json<br/>+ task.blocked event]
        Reply[reply.json<br/>+ task.unblocked event]
        QueueEntry[ratification-queue.md entry<br/>if Type 1]
    end

    subgraph Phase9["Phase 9: PR"]
        PR[Pull Request<br/>with body, description]
        DocsIndex[docs-index.md updated<br/>if files added/removed]
        AdvisoryComment[Archivist advisory comments]
    end

    subgraph Phase11["Phase 11: Merge"]
        Main[Code in main]
        Closed[Issue closed,<br/>label: status:merged]
        Completed[task.completed event]
    end

    subgraph PostMerge["Post-merge (automated)"]
        IndexRegen[docs-index.md regenerated]
        SeqValid[D-### sequence validated]
        DriftCron[Drift cron output]
    end

    Phase1 --> Phase3
    Phase3 --> Phase5
    Phase5 --> Phase6
    Phase6 -.optional.-> Phase7
    Phase7 -.resumes.-> Phase6
    Phase6 --> Phase9
    Phase9 --> Phase11
    Phase11 --> PostMerge

    classDef phaseBox fill:#f5f5f5,stroke:#424242,color:#000
    class Conv1,Think1,Dec1,Issue,Worktree,JSONL,IPC,Comment1,Code,Tests,Specs,Skills,DecLog,Progress,Question,Reply,QueueEntry,PR,DocsIndex,AdvisoryComment,Main,Closed,Completed,IndexRegen,SeqValid,DriftCron phaseBox
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

    Dev->>TL: cetana_request_input(severity: product)
    TL->>Queue: Append entry: question, context, deadline
    Queue->>Dev: Reply: "QUEUED for next ratification window"

    Note over Dev: Developer terminates this dispatch

    Note over Princ: At ratification window (e.g., 9am)

    Princ->>Queue: Read all pending items
    Princ->>Queue: Resolve each: ratify, reject, or defer
    Queue->>TL: Notify of ratifications (chat session)
    TL->>Dev: Re-dispatch with amended brief if needed

    Note over TL: Same flow for Type 2 PENDING items<br/>(decisions made in solo TL sessions)<br/>and Lock approvals
```

---

## Severity routing

How `cetana_request_input` escalations route based on severity.

```mermaid
flowchart TD
    Block[Developer blocks<br/>cetana_request_input called] --> Severity{severity<br/>field}

    Severity -->|execution| ExecRoute[GitHub label:<br/>needs:execution-input]
    Severity -->|strategy| StratRoute[GitHub label:<br/>needs:strategy-input]
    Severity -->|product| ProdRoute[GitHub label:<br/>needs:principal-input]

    ExecRoute --> ExecResp[TL Brief Author mode<br/>responds in chat]
    StratRoute --> StratResp[TL Strategist mode<br/>responds in chat]
    ProdRoute --> ProdResp{Principal<br/>available?}

    ProdResp -->|Yes| PrincReply[Principal replies directly]
    ProdResp -->|No| QueueRatif[Queue for next<br/>ratification window]

    ExecResp --> Reply[cetana.reply_to_blocked_task]
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

Which gates apply to work depending on impact tier.

```mermaid
flowchart LR
    Brief[Brief authored<br/>tier: 0/1/3] --> Tier{Impact<br/>tier?}

    Tier -->|Tier 0| T0[Skip Phase 2<br/>Minimal Phase 3<br/>Minimal Phase 8 checklist<br/>Fast Phase 10 review]
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

**The high-level flow** is the canonical map of work. If you're unsure where a piece of work is in the system, find it on this diagram.

**The actor responsibilities diagram** is for understanding who does what. If you're starting a new Claude session, your role determines which boxes are yours.

**The artifact lifecycle diagram** is for understanding what gets created when. If you're auditing a finished task, this tells you what artifacts should exist.

**The ratification window flow** is for understanding governance cadence. Critical for Tier 3 work and Type 1 decisions.

**The severity routing diagram** is for understanding what happens when a Developer blocks. Determines who responds and how.

**The tier-driven gating diagram** is for understanding what discipline applies to a given task. Different tiers, different ceremony.

---

## Diagrams are documentation

These diagrams are part of the canonical operational model. Updates to the process require updates to both `process.md` and these diagrams in the same PR. Out-of-sync diagrams are spec drift.
