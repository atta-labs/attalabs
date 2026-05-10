# System architecture diagram

Module-level view of the software pieces that implement the Atta operational model. **No agents in this diagram.** No roles. Just code modules, files, services, and the connections between them.

For the agent/process view, see `process-flow.md`.
For the prose explanation of the workflow, see `process.md`.

---

## Why this diagram exists

The operational model is implemented across multiple software components: the Cetana Coordinator (Bun service), the executor's MCP server (spawned per task), the verification CI script, the Archivist GitHub Actions, the GitHub Issues system, the JSONL filesystem layer, and the repo files themselves.

When agents talk, they're using these modules as substrate. When a Developer "calls `cetana_request_input`," what's actually happening is a stdio MCP message from a subprocess to its parent's MCP server which writes a file to a shared directory which is polled by another process which writes a label to GitHub.

This diagram shows the substrate. It's the answer to: *if I forgot all the role docs and just looked at the code, what would I see?*

---

## Top-level: the four substrates

The operational model runs across four substrates. Each owns a different kind of state.

```mermaid
flowchart TB
    subgraph Repo["Repo (canonical, git-tracked)"]
        Specs[Specs<br/>apps/*/specs/*.md]
        Skills[Skills<br/>.claude/skills/*/SKILL.md]
        PMDocs[PM docs<br/>project-management/*.md]
        Code[Source code<br/>apps/*, packages/*]
        DecLogs[Decision logs<br/>per-product + global]
        Scripts[CI scripts<br/>scripts/verify-docs.ts]
        Workflows[GitHub Actions<br/>.github/workflows/*.yml]
    end

    subgraph GitHub["GitHub (governance + audit)"]
        Issues[Issues<br/>+ labels + milestones]
        PRs[Pull requests]
        CIRuns[CI run results]
        Comments[Issue/PR comments]
    end

    subgraph Local["Local filesystem (~/.cetana)"]
        Config[~/.cetana/config.json]
        TaskLogs[~/.cetana/tasks/N.jsonl<br/>JSONL append-only]
        TaskDirs[~/.cetana/tasks/N/<br/>question.json, reply.json,<br/>mcp-config.json]
    end

    subgraph Worktrees["Worktrees (per-task isolation)"]
        WT[~/code/atta/.worktrees/issue-N/<br/>full repo checkout on<br/>feat/issue-N branch]
    end

    Repo -.is checked out into.-> Worktrees
    Repo -.referenced by.-> GitHub
    Local -.IPC + state for.-> Worktrees

    classDef repoNode fill:#bbdefb,stroke:#1565c0,color:#000
    classDef githubNode fill:#ffe0b2,stroke:#e65100,color:#000
    classDef localNode fill:#c8e6c9,stroke:#2e7d32,color:#000
    classDef worktreeNode fill:#e1bee7,stroke:#6a1b9a,color:#000

    class Specs,Skills,PMDocs,Code,DecLogs,Scripts,Workflows repoNode
    class Issues,PRs,CIRuns,Comments githubNode
    class Config,TaskLogs,TaskDirs localNode
    class WT worktreeNode
```

**The substrates and what they're for:**

- **Repo** — canonical state. The constitution, the specs, the skills, the code, the decision logs. Anything that survives across machines and across time.
- **GitHub** — governance + audit. Issues track tasks. PRs gate merges. Labels carry status. Comments form the audit trail. CI enforces gates.
- **Local filesystem** — runtime state. Configuration, task event logs, IPC files between MCP servers. Survives process restarts but not machine reinstalls.
- **Worktrees** — per-task isolated workspaces. Each running task has its own checkout. Multiple parallel tasks don't collide.

---

## The Cetana Coordinator (the orchestration layer)

The Coordinator is one Bun package with two MCP server entry points. They share core modules.

```mermaid
flowchart TB
    subgraph CoordPkg["apps/cetana-ai/coordinator/"]
        subgraph Entry["Entry points (two MCP servers)"]
            Strat[mcp-server-strategist.ts<br/>long-running, Claude Desktop connects]
            Exec[mcp-server-executor.ts<br/>per-task, spawned by claude -p]
        end

        subgraph Tools["Tool definitions"]
            DispTool[tools/dispatch-task.ts]
            ListTool[tools/list-active-tasks.ts]
            ReplyTool[tools/reply-to-blocked-task.ts]
            ReqTool[tools/request-input.ts]
        end

        subgraph Core["Shared core modules"]
            State[state.ts<br/>StateManager + hydration]
            Events[events.ts<br/>JSONL append-only]
            Worktree[worktree.ts<br/>git worktree wrapper]
            Github[github.ts<br/>Octokit wrapper]
            Spawner[claude-spawner.ts<br/>spawns claude -p subprocess]
            Paths[paths.ts<br/>filesystem path constants]
            Config[config.ts<br/>~/.cetana/config.json loader]
        end
    end

    Strat -.registers.-> DispTool
    Strat -.registers.-> ListTool
    Strat -.registers.-> ReplyTool
    Exec -.registers.-> ReqTool

    DispTool -.uses.-> State
    DispTool -.uses.-> Events
    DispTool -.uses.-> Worktree
    DispTool -.uses.-> Github
    DispTool -.uses.-> Spawner

    ListTool -.uses.-> State

    ReplyTool -.uses.-> State
    ReplyTool -.uses.-> Events
    ReplyTool -.uses.-> Paths

    ReqTool -.uses.-> Events
    ReqTool -.uses.-> Paths

    State -.hydrates from.-> Events
    Events -.writes to.-> Paths

    classDef entryNode fill:#ffe0b2,stroke:#e65100,color:#000
    classDef toolNode fill:#c8e6c9,stroke:#2e7d32,color:#000
    classDef coreNode fill:#bbdefb,stroke:#1565c0,color:#000

    class Strat,Exec entryNode
    class DispTool,ListTool,ReplyTool,ReqTool toolNode
    class State,Events,Worktree,Github,Spawner,Paths,Config coreNode
```

**Why two entry points and not two packages:** the strategist and executor servers expose different tool surfaces but share the same state semantics, event types, and path conventions. Two entry points in one package keeps the shared code DRY without forcing workspace gymnastics. See `apps/cetana-ai/specs/cetana-decisions.md` D-002.

---

## The complete signal flow on dispatch

What actually happens when Principal calls `cetana.dispatch_task` from Claude Desktop.

```mermaid
sequenceDiagram
    participant Desktop as Claude Desktop
    participant StratSrv as mcp-server-strategist
    participant Github as github.ts
    participant WT as worktree.ts
    participant Spawner as claude-spawner.ts
    participant Events as events.ts
    participant FS as Local filesystem
    participant ExecSrv as mcp-server-executor<br/>(spawned per task)
    participant Claude as claude -p subprocess

    Desktop->>StratSrv: cetana.dispatch_task(issue_number, brief)
    StratSrv->>Github: getIssue(issue_number)
    Github-->>StratSrv: issue title, body, labels
    StratSrv->>WT: createWorktree(issue_number)
    WT-->>StratSrv: worktree path
    StratSrv->>FS: write mcp-config.json<br/>(points at executor server)
    StratSrv->>Events: append task.dispatched
    StratSrv->>Spawner: spawnClaudeCode(brief, worktree, mcp-config)
    Spawner->>Claude: spawn process
    Spawner->>ExecSrv: spawn alongside (via mcp-config)
    Spawner-->>StratSrv: pid
    StratSrv->>Events: append task.spawned
    StratSrv->>Github: postIssueComment("dispatched")
    StratSrv-->>Desktop: {taskId, worktree, pid}

    Note over Claude,ExecSrv: Claude Code is now running<br/>connected to executor MCP server<br/>via stdio
```

---

## The escalation flow (when Developer blocks)

What happens when a Developer calls `cetana_request_input`.

```mermaid
sequenceDiagram
    participant Claude as claude -p subprocess<br/>(Developer)
    participant ExecSrv as mcp-server-executor
    participant FS as ~/.cetana/tasks/N/
    participant Events as events.ts
    participant Github as github.ts
    participant StratSrv as mcp-server-strategist
    participant Desktop as Claude Desktop
    participant Responder as TL or Principal

    Claude->>ExecSrv: cetana_request_input(question, severity)
    ExecSrv->>FS: write question.json
    ExecSrv->>Events: append task.blocked
    ExecSrv->>Github: postIssueComment + add label<br/>(needs:execution-input etc.)
    Note over ExecSrv: Tool call now BLOCKS<br/>polling reply.json every 1s

    Desktop->>StratSrv: cetana.list_active_tasks
    StratSrv-->>Desktop: list of tasks including blocked one
    Desktop->>Responder: surfaces question to human
    Responder->>Desktop: provides reply
    Desktop->>StratSrv: cetana.reply_to_blocked_task(taskId, reply)
    StratSrv->>FS: write reply.json
    StratSrv->>Events: append task.unblocked
    StratSrv->>Github: remove needs:* label
    StratSrv-->>Desktop: "reply sent"

    Note over ExecSrv: Polling detects reply.json
    ExecSrv->>FS: read reply.json
    ExecSrv->>FS: delete question.json + reply.json
    ExecSrv->>Events: append task.unblocked
    ExecSrv-->>Claude: tool result = reply text

    Note over Claude: Developer resumes execution<br/>with no context loss
```

---

## CI and Archivist (the enforcement layer)

What runs automatically when a PR is opened or merged.

```mermaid
flowchart TB
    PROpen[PR opened or updated] --> CI[CI: GitHub Actions]

    CI --> Typecheck[Typecheck<br/>tsc --noEmit]
    CI --> Lint[Lint<br/>biome check]
    CI --> Tests[Tests<br/>bun test]
    CI --> VerifyDocs[verify-docs.ts<br/>tier-aware doc check]

    Typecheck --> CIPass{All green?}
    Lint --> CIPass
    Tests --> CIPass
    VerifyDocs --> CIPass

    CIPass -->|Yes| ArchivistAdvisory[Archivist GitHub Action<br/>posts advisory comments]
    CIPass -->|No| Block[PR blocked from merge]

    ArchivistAdvisory --> AdvisoryChecks[Archivist checks:<br/>- related decisions surfacing<br/>- skill staleness flags<br/>- decision log term references<br/>- thinking.md mentions]

    AdvisoryChecks --> Comments[Posts as PR comments<br/>NOT blocking]

    PROpen -.also triggers.-> BriefValid[Brief Validation<br/>on linked issue]
    BriefValid --> ValidCheck{Brief well-formed?<br/>tier present?<br/>structure correct?}
    ValidCheck -->|Yes| Ready[status:ready]
    ValidCheck -->|No| Blocked2[status:blocked<br/>needs:brief-correction]

    Merge[PR merged] --> PostMerge[Archivist post-merge]
    PostMerge --> IndexRegen[Regenerate docs-index.md]
    PostMerge --> SeqValid[Validate D-### sequence<br/>across all decision logs]
    PostMerge --> WTPrune[Flag merged worktrees<br/>as cleanup candidates]

    Daily[Daily cron] --> DriftCheck[Archivist drift check]
    DriftCheck --> StaleSpec[Flag specs older than<br/>referenced code]
    DriftCheck --> StaleThink[Flag thinking.md if untouched >7d]
    DriftCheck --> DriftIssue[Open GitHub Issue<br/>type:drift-detected if found]

    classDef ciNode fill:#ffe0b2,stroke:#e65100,color:#000
    classDef archivistNode fill:#e1bee7,stroke:#6a1b9a,color:#000
    classDef blockNode fill:#ffcdd2,stroke:#b71c1c,color:#000
    classDef passNode fill:#c8e6c9,stroke:#2e7d32,color:#000
    classDef neutralNode fill:#f5f5f5,stroke:#424242,color:#000

    class CI,Typecheck,Lint,Tests,VerifyDocs ciNode
    class ArchivistAdvisory,AdvisoryChecks,Comments,BriefValid,PostMerge,IndexRegen,SeqValid,WTPrune,DriftCheck,StaleSpec,StaleThink,DriftIssue archivistNode
    class Block,Blocked2 blockNode
    class Ready,Merge passNode
    class PROpen,CIPass,ValidCheck,Daily neutralNode
```

**The two enforcement layers:**

- **CI (blocking):** typecheck, lint, tests, verify-docs. If any fail, the PR cannot merge.
- **Archivist (advisory):** synthesis hints, related-decision surfacing, drift detection. Posts comments on PRs and opens issues for drift, but never blocks merge.

This split is deliberate. Hard gates for things that are mechanically verifiable (does the code compile? did the right files get updated?). Advisory for things that require judgment (is this decision related to D-042? is this spec describing the current behavior?).

---

## State storage and where it lives

Where each kind of state actually lives on disk.

```mermaid
flowchart LR
    subgraph Persistent["Persistent (git)"]
        RepoState[Specs, skills, code,<br/>decision logs, PM docs<br/>in repo]
        IssuesState[Issues + labels<br/>in GitHub]
        PRState[PRs + CI runs<br/>in GitHub]
    end

    subgraph Runtime["Runtime (local filesystem)"]
        ConfigFile[~/.cetana/config.json<br/>static config]
        JSONLLogs[~/.cetana/tasks/N.jsonl<br/>append-only event log]
        IPCFiles[~/.cetana/tasks/N/<br/>question.json, reply.json<br/>ephemeral IPC]
        MCPConfigs[~/.cetana/tasks/N/<br/>mcp-config.json<br/>per-task spawn config]
    end

    subgraph InMemory["In-memory (per-process)"]
        StateManager[StateManager<br/>active tasks, blocked status,<br/>pending questions]
        TaskState[Per-Task state<br/>brief, model, worktree path]
    end

    JSONLLogs -.hydrates on startup.-> StateManager
    IPCFiles -.observed by polling.-> InMemory

    classDef persistentNode fill:#c8e6c9,stroke:#2e7d32,color:#000
    classDef runtimeNode fill:#fff59d,stroke:#f57f17,color:#000
    classDef memoryNode fill:#ffab91,stroke:#bf360c,color:#000

    class RepoState,IssuesState,PRState persistentNode
    class ConfigFile,JSONLLogs,IPCFiles,MCPConfigs runtimeNode
    class StateManager,TaskState memoryNode
```

**Persistence guarantees:**

- **Persistent:** survives anything short of repo deletion. Git history preserves it.
- **Runtime:** survives process restarts (StateManager rehydrates from JSONL on startup). Lost on machine reinstall — recoverable from `~/.cetana` backup if needed.
- **In-memory:** lost on process termination. Always rebuildable from the JSONL log.

This means a crashed Coordinator can be restarted and will resume tracking active tasks correctly. The JSONL log is the source of truth.

---

## Where the operational model files live

Mapping the operational model docs to the substrate.

```mermaid
flowchart TB
    subgraph PM["project-management/ (operational model)"]
        Coord[coordination.md<br/>session start protocol]
        Process[process.md<br/>workflow walkthrough]
        StateMach[state-machine.md<br/>artifacts, mutations, hierarchy]
        Decisions[decisions.md<br/>global decision log]
        State[state.md<br/>current snapshot]
        Plan[plan.md<br/>active work, append-style]
        Reviewer[reviewer-prompt.md<br/>for stateless AIs]
        RatQueue[ratification-queue.md<br/>append-only queue]
        Think[thinking.md<br/>working memory]
        Diagrams[diagrams/<br/>process-flow.md<br/>system-architecture.md]
        Roles[roles/<br/>principal.md, team-leader.md, developer.md]
    end

    subgraph Skills[".claude/skills/ (technical + meta)"]
        BriefSkill[brief-authoring/SKILL.md]
        OtherSkills[other tech skills:<br/>auth, database, ui-components,<br/>cetana-coordinator, etc.]
    end

    subgraph Specs["apps/*/specs/ (product-specific)"]
        ProductSpec[product-spec.md]
        ProductDec[product-decisions.md]
        ExperLog[experiment-log.md]
    end

    subgraph Tooling["scripts/ + .github/workflows/"]
        VerifyScript[scripts/verify-docs.ts]
        ArchivistFlow[.github/workflows/archivist.yml]
    end

    PM -.governs.-> Specs
    PM -.references.-> Skills
    Skills -.applied during.-> Specs
    Tooling -.enforces.-> Specs
    Tooling -.enforces.-> Skills
    Tooling -.enforces.-> PM

    classDef pmNode fill:#bbdefb,stroke:#1565c0,color:#000
    classDef skillsNode fill:#c8e6c9,stroke:#2e7d32,color:#000
    classDef specsNode fill:#ffe0b2,stroke:#e65100,color:#000
    classDef toolingNode fill:#e1bee7,stroke:#6a1b9a,color:#000

    class Coord,Process,StateMach,Decisions,State,Plan,Reviewer,RatQueue,Think,Diagrams,Roles pmNode
    class BriefSkill,OtherSkills skillsNode
    class ProductSpec,ProductDec,ExperLog specsNode
    class VerifyScript,ArchivistFlow toolingNode
```

---

## How a single piece of work touches every layer

A concrete example: implementing a new Vāda team YAML.

```mermaid
flowchart LR
    A[Developer reads:<br/>brief, vada-yaml-authoring skill,<br/>vada-product-spec.md]
    A --> B[Developer writes:<br/>new YAML in apps/vada-ai/yamls/]
    B --> C[Developer updates:<br/>vada-product-spec.md<br/>YAMLs catalog table]
    C --> D[Developer adds tests<br/>verifying YAML loads]
    D --> E[Developer runs:<br/>verify-docs.ts locally]
    E --> F[Developer opens PR]
    F --> G[CI: typecheck/lint/tests/verify-docs]
    G --> H[Archivist: advisory comments]
    H --> I[Principal: code review]
    I --> J[TL: spec review]
    J --> K[Principal: merge]
    K --> L[Archivist: regenerate<br/>docs-index.md]

    classDef devNode fill:#c8e6c9,stroke:#2e7d32,color:#000
    classDef ciNode fill:#ffe0b2,stroke:#e65100,color:#000
    classDef archivistNode fill:#e1bee7,stroke:#6a1b9a,color:#000
    classDef principalNode fill:#f8bbd0,stroke:#ad1457,color:#000
    classDef tlNode fill:#bbdefb,stroke:#1565c0,color:#000

    class A,B,C,D,E,F devNode
    class G ciNode
    class H,L archivistNode
    class I,K principalNode
    class J tlNode
```

This is a Tier 1 task. No Type 1 decisions, no escalation. Six artifacts touched (YAML, spec, tests, verify-docs run, PR, docs-index). Two reviewers (Principal for code, TL for spec). One automated post-merge step.

For a Tier 3 task, additional artifacts get touched: `decisions.md` entry, `state.md` update, possibly `plan.md` update, possibly a Lock entry. And the merge happens during a ratification window rather than anytime.

---

## What this diagram is not

This is the static structure. It does **not** show:

- The lifecycle of a piece of work (see `process-flow.md`)
- Who does what when (see `roles/*.md`)
- Why each module exists (see `apps/cetana-ai/specs/cetana-spec.md` and `cetana-decisions.md`)
- The reasoning behind the architecture (see `apps/cetana-ai/specs/cetana-experiment-log.md`)

If you're trying to understand how something flows, this is the wrong diagram. If you're trying to understand what software exists and how the pieces connect, this is the right one.

---

## Diagrams are documentation

This diagram is part of the canonical operational model. Updates to the architecture require updates to this diagram in the same PR. Out-of-sync architecture diagrams are spec drift and will be flagged by the Archivist.
