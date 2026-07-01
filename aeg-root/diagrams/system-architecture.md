---
sidebar_title: System Architecture
---
# System architecture diagram — the orchestration tool (Cetana)

Module-level view of the software that **automates** the AEG flow in this repo. **No agents in this diagram** — no roles, just code modules, files, services, and their connections.

> **Scope: this documents Cetana, the *optional* orchestration tool used in this repo — it is NOT the AEG model.** AEG is forge-native and orchestrator-independent: it runs on the **Repo + the Git forge (GitHub)** alone, with local git **worktrees** that need no tool. Everything below labelled "Cetana" — the Coordinator, the MCP servers, the `~/.cetana` runtime, the IPC files — exists **only when Cetana is in use**. Run AEG by hand and none of it is present; the flow is identical (`aeg-manual-flow.md`). Cetana knows AEG; AEG does not know Cetana.

For the agent/process view, see `process-flow.md`. For the prose workflow, see `process.md`. For why Cetana exists, see `apps/cetana-ai/specs/cetana-spec.md`.

---

## Why this diagram exists

When Cetana is running, an agent action like "the Developer escalates" is implemented as a chain of software: a stdio MCP message from a subprocess to its parent's MCP server, which writes a file to a shared directory, which is polled by another process, which writes a label to GitHub. This diagram shows that substrate — the answer to *"if I forgot the role docs and just looked at Cetana's code, what would I see?"* None of it is required by AEG; it is one tool's way of automating the dispatch + escalation slice.

---

## Substrates: what AEG needs vs. what Cetana adds

```mermaid
flowchart TB
    subgraph AEG["AEG substrates (always — forge-native)"]
        subgraph Repo["Repo (canonical, git-tracked)"]
            Specs[Specs<br/>apps/*/specs/*.md]
            Skills[Skills<br/>.claude/skills/*/SKILL.md]
            PMDocs[AEG docs + iteration files<br/>aeg-root/* + aeg-project/*]
            Code[Source code<br/>apps/*, packages/*]
            DecLogs[Decision logs<br/>per-project + global]
            Scripts[CI scripts<br/>packages/aeg-core/bin/verify-docs.ts]
            Workflows[GitHub Actions<br/>.github/workflows/*.yml]
        end
        subgraph GitHub["Git forge — GitHub (execution state + audit)"]
            Issues[Issues = tasks<br/>+ tier / aeg:blocked / needs:* labels]
            PRs[Pull requests<br/>brief in body; review decision]
            CIRuns[CI run results]
            Comments[Issue/PR comments]
        end
        subgraph Worktrees["Worktrees (per-task isolation — plain git)"]
            WT[.worktrees/task/iteration/n<br/>checkout on task/iteration/n branch]
        end
    end

    subgraph Cetana["Cetana substrate (only if the tool is used)"]
        Config[~/.cetana/config.json]
        TaskLogs[~/.cetana/tasks/N.jsonl<br/>append-only event log]
        TaskDirs[~/.cetana/tasks/N/<br/>question.json, reply.json,<br/>mcp-config.json]
    end

    Repo -.is checked out into.-> Worktrees
    Repo -.referenced by.-> GitHub
    Cetana -.IPC + state for.-> Worktrees
    Cetana -.derives status by reading.-> GitHub

    classDef repoNode fill:#bbdefb,stroke:#1565c0,color:#000
    classDef githubNode fill:#ffe0b2,stroke:#e65100,color:#000
    classDef localNode fill:#c8e6c9,stroke:#2e7d32,color:#000
    classDef worktreeNode fill:#e1bee7,stroke:#6a1b9a,color:#000

    class Specs,Skills,PMDocs,Code,DecLogs,Scripts,Workflows repoNode
    class Issues,PRs,CIRuns,Comments githubNode
    class Config,TaskLogs,TaskDirs localNode
    class WT worktreeNode
```

**What each is for:**

- **Repo** — canonical state: the constitution, specs, skills, code, decision logs, iteration topology files. Survives across machines and time.
- **GitHub (the forge)** — execution state + audit. Issues *are* tasks. PRs gate merges and carry the brief in their body. **Task status is *derived* from Issue/branch/PR/merge state — labels do not carry status** (labels are `tier:*`, `aeg:blocked`, `needs:*-input`). Comments form the audit trail; CI enforces gates.
- **Worktrees** — per-task isolated checkouts on `task/<iteration>/<n>` branches. Plain git; no tool required.
- **Cetana (optional)** — runtime state for the tool that automates dispatch + escalation: config, task event logs, IPC files. Present only when Cetana runs. Nothing canonical depends on it.

---

## The Cetana Coordinator (the orchestration layer)

One Bun package with two MCP server entry points sharing core modules. *(Cetana internals — accurate to this repo's tool.)*

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

**Why two entry points and not two packages:** the strategist and executor servers expose different tool surfaces but share state semantics, event types, and path conventions. Two entry points in one package keeps the shared code DRY. See `apps/cetana-ai/specs/cetana-decisions.md` D-002.

---

## The complete signal flow on dispatch (Cetana)

What Cetana does when the Principal dispatches from Claude Desktop. *(In the manual flow, the Developer's worktree-first Step 0 does the equivalent and none of this runs.)*

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

    Desktop->>StratSrv: dispatch_task(issue_number, brief)
    StratSrv->>Github: getIssue(issue_number) + check dispatch gates
    Github-->>StratSrv: issue, deps merged?, conflict PR open?
    StratSrv->>WT: createWorktree(task/iteration/n)
    WT-->>StratSrv: worktree path
    StratSrv->>FS: write mcp-config.json (points at executor server)
    StratSrv->>Events: append task.dispatched
    StratSrv->>Spawner: spawnClaudeCode(brief, worktree, mcp-config)
    Spawner->>Claude: spawn process (brief pasted as prompt)
    Spawner->>ExecSrv: spawn alongside (via mcp-config)
    Spawner-->>StratSrv: pid
    StratSrv->>Events: append task.spawned
    StratSrv->>Github: postIssueComment("dispatched")
    StratSrv-->>Desktop: {taskId, worktree, pid}

    Note over Claude,ExecSrv: Claude Code now running, connected to<br/>executor MCP server via stdio. Opening the<br/>branch = in-flight (derived). The brief will<br/>land in the PR body, never the Issue.
```

---

## The escalation flow (Cetana implementation)

How Cetana implements AEG's escalation when a Developer blocks. *(Manually, this is a chat message to the TL/Principal; the routing is identical.)*

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

    Claude->>ExecSrv: request_input(question, severity)
    ExecSrv->>FS: write question.json
    ExecSrv->>Events: append task.blocked
    ExecSrv->>Github: postIssueComment + add aeg:blocked + needs:*-input
    Note over ExecSrv: Tool call BLOCKS, polling reply.json every 1s

    Desktop->>StratSrv: list_active_tasks
    StratSrv-->>Desktop: list including blocked one
    Desktop->>Responder: surfaces question to human
    Responder->>Desktop: provides reply
    Desktop->>StratSrv: reply_to_blocked_task(taskId, reply)
    StratSrv->>FS: write reply.json
    StratSrv->>Github: remove needs:* + aeg:blocked labels
    StratSrv-->>Desktop: "reply sent"

    Note over ExecSrv: Polling detects reply.json
    ExecSrv->>FS: read + delete question.json + reply.json
    ExecSrv->>Events: append task.unblocked
    ExecSrv-->>Claude: tool result = reply text

    Note over Claude: Developer resumes with no context loss
```

---

## CI and Archivist (the enforcement layer — AEG-level)

What runs automatically on PR open/merge. This layer is AEG's, not Cetana's — it's GitHub Actions + scripts in the repo.

```mermaid
flowchart TB
    PROpen[PR opened or updated] --> CI[CI: GitHub Actions]

    CI --> Typecheck[Typecheck — tsc --noEmit]
    CI --> Lint[Lint — biome check]
    CI --> Tests[Tests — bun test]
    CI --> VerifyDocs[verify-docs.ts — tier-aware doc check]

    Typecheck --> CIPass{All green?}
    Lint --> CIPass
    Tests --> CIPass
    VerifyDocs --> CIPass

    CIPass -->|Yes| ArchivistAdvisory[Archivist Action — advisory comments]
    CIPass -->|No| Block[PR blocked from merge]

    ArchivistAdvisory --> AdvisoryChecks[related-decision surfacing,<br/>skill staleness, execution-metadata creep,<br/>lock-acknowledgment hints]
    AdvisoryChecks --> Comments[Posts as PR comments — NOT blocking]

    PROpen -.also.-> BriefValid[Brief Validation on the brief]
    BriefValid --> ValidCheck{Brief well-formed?<br/>tier present? structure ok?<br/>Product resolves? no planning fields?}
    ValidCheck -->|Yes| Ready[Dispatchable]
    ValidCheck -->|No| Blocked2[needs:brief-correction]

    Merge[PR merged — auto-closes Issue] --> CloseOut[Archivist close-out]
    CloseOut --> ChangeLog[Append changelog]
    CloseOut --> PerProject[Update per-project state.md<br/>for every project the task listed<br/>(now.md retired — D-057)]
    CloseOut --> IndexRegen[Regenerate docs-index.md]
    CloseOut --> SeqValid[Validate D-### sequence within each log]
    CloseOut --> Orphans[Flag orphaned branches + worktrees]

    Daily[Daily cron] --> DriftCheck[Archivist drift check]
    DriftCheck --> StaleSpec[Flag specs older than referenced code]
    DriftCheck --> MetaCreep[Flag execution metadata in iteration files]
    DriftCheck --> DriftIssue[Open Issue type:drift-detected if found]

    classDef ciNode fill:#ffe0b2,stroke:#e65100,color:#000
    classDef archivistNode fill:#e1bee7,stroke:#6a1b9a,color:#000
    classDef blockNode fill:#ffcdd2,stroke:#b71c1c,color:#000
    classDef passNode fill:#c8e6c9,stroke:#2e7d32,color:#000
    classDef neutralNode fill:#f5f5f5,stroke:#424242,color:#000

    class CI,Typecheck,Lint,Tests,VerifyDocs ciNode
    class ArchivistAdvisory,AdvisoryChecks,Comments,BriefValid,CloseOut,ChangeLog,PerProject,IndexRegen,SeqValid,Orphans,DriftCheck,StaleSpec,MetaCreep,DriftIssue archivistNode
    class Block,Blocked2 blockNode
    class Ready,Merge passNode
    class PROpen,CIPass,ValidCheck,Daily neutralNode
```

**Two enforcement layers:** CI (blocking) — typecheck, lint, tests, verify-docs; if any fail the PR can't merge. Archivist (advisory) — synthesis hints, related-decision surfacing, drift detection, the anti-regression flags (execution metadata in iteration files); posts comments and opens drift issues but never blocks. Hard gates for the mechanically verifiable; advisory for what needs judgment.

---

## State storage and where it lives (Cetana runtime)

```mermaid
flowchart LR
    subgraph Persistent["Persistent (git + forge)"]
        RepoState[Specs, skills, code,<br/>decision logs, PM docs, iteration files]
        IssuesState[Issues + labels — in GitHub]
        PRState[PRs + review decisions + CI — in GitHub]
    end

    subgraph Runtime["Cetana runtime (local filesystem)"]
        ConfigFile[~/.cetana/config.json]
        JSONLLogs[~/.cetana/tasks/N.jsonl<br/>append-only event log]
        IPCFiles[~/.cetana/tasks/N/<br/>question.json, reply.json]
        MCPConfigs[~/.cetana/tasks/N/mcp-config.json]
    end

    subgraph InMemory["In-memory (per-process)"]
        StateManager[StateManager<br/>active tasks, blocked status]
        TaskState[Per-task state<br/>brief, model, worktree path]
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

**Persistence guarantees:** Persistent survives anything short of repo deletion (git + GitHub). Cetana runtime survives process restarts (StateManager rehydrates from JSONL); lost on machine reinstall, recoverable from `~/.cetana` backup. In-memory is lost on termination, always rebuildable from JSONL. A crashed Coordinator restarts and resumes correctly — the JSONL log is the tool's source of truth, while the *task's* status remains derived from the forge regardless of tool state.

---

## Where the operational model files live (AEG file map)

Mapping the AEG docs to the substrate. *(This is AEG's own layout — no tool involved.)*

```mermaid
flowchart TB
    subgraph PM["aeg-root/ (operational model — root only) + aeg-project/ (living state)"]
        Coord[aeg-root/coordination.md<br/>session start protocol]
        Process[aeg-root/process.md<br/>workflow walkthrough]
        Manual[aeg-root/aeg-manual-flow.md<br/>running the flow by hand]
        StateMach[aeg-root/state-machine.md<br/>artifacts, mutations, hierarchy]
        Decisions[aeg-project/decisions.md — global decision log]
        StateNow[aeg-project/state.md — non-derivable operational facts<br/>(now.md retired D-057 — active state from forge)]
        Iterations[aeg-root/iterations/ — README + per-iteration<br/>topology files the plan]
        Projects[aeg-root/projects.md — project registry]
        Reviewer[aeg-root/reviewer-prompt.md — for stateless AIs]
        RatQueue[aeg-project/ratification-queue.md — append-only]
        Think[aeg-project/thinking.md — working memory]
        Diagrams[aeg-root/diagrams/ — process-flow + system-architecture]
        Roles[aeg-root/roles/ — principal, team-leader, planner,<br/>developer, reviewer, security, archivist]
    end

    subgraph Skills[".claude/skills/ (technical + meta)"]
        BriefSkill[brief-authoring/SKILL.md]
        OtherSkills[tech skills: auth, database,<br/>ui, engine/adapter/teams, etc.]
    end

    subgraph Specs["apps/*/specs/ (project-specific)"]
        ProjectSpec[<project>-spec.md]
        ProjectDec[<project>-decisions.md]
        Backlog[<project>-backlog.md — held/future, out of flow]
    end

    subgraph Tooling["packages/aeg-core/bin/ + .github/workflows/"]
        VerifyScript[packages/aeg-core/bin/verify-docs.ts]
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

    class Coord,Process,Manual,StateMach,Decisions,StateNow,Iterations,Projects,Reviewer,RatQueue,Think,Diagrams,Roles pmNode
    class BriefSkill,OtherSkills skillsNode
    class ProjectSpec,ProjectDec,Backlog specsNode
    class VerifyScript,ArchivistFlow toolingNode
```

---

## How a single piece of work touches every layer

A concrete example: implementing a new Vāda team YAML (a Tier 1, single-project task).

```mermaid
flowchart LR
    A[Developer checks dispatch gates,<br/>reads brief + skills + spec]
    A --> B[Writes new YAML in apps/vada-ai/yamls/]
    B --> C[Updates vada-spec.md catalog table]
    C --> D[Adds tests verifying YAML loads]
    D --> E[Runs verify-docs.ts locally]
    E --> F[Opens PR — brief in body, Closes-N]
    F --> G[CI: typecheck/lint/tests/verify-docs]
    G --> H[code-reviewer pass → security pass]
    H --> I[Principal code review]
    I --> J[TL spec review]
    J --> K[Principal merge — Issue auto-closes]
    K --> L[Archivist close-out:<br/>changelog, per-project state.md, docs-index]

    classDef devNode fill:#c8e6c9,stroke:#2e7d32,color:#000
    classDef ciNode fill:#ffe0b2,stroke:#e65100,color:#000
    classDef revNode fill:#d1c4e9,stroke:#4527a0,color:#000
    classDef archivistNode fill:#e1bee7,stroke:#6a1b9a,color:#000
    classDef principalNode fill:#f8bbd0,stroke:#ad1457,color:#000
    classDef tlNode fill:#bbdefb,stroke:#1565c0,color:#000

    class A,B,C,D,E,F devNode
    class G ciNode
    class H revNode
    class I,K principalNode
    class J tlNode
    class L archivistNode
```

This is Tier 1: no Type 1 decisions, no escalation. The status is never written — it moves `todo → in-flight` when the branch opens, `→ in-review` when the PR opens, `→ merged` on merge, all derived. For a Tier 3 task, additional artifacts get touched (`decisions.md` entry, `state.md`, the iteration file is *not* touched for status, a Lock entry if irreversible) and the merge happens during a ratification window.

---

## What this diagram is not

This is the static structure of the optional tool plus the AEG file/enforcement layout. It does **not** show: the lifecycle of work (`process-flow.md`), who does what when (`roles/*.md`), why Cetana exists (`apps/cetana-ai/specs/cetana-spec.md`), or the reasoning behind the architecture (`cetana-decisions.md`). And it is **not the AEG model** — AEG is forge-native; remove Cetana and the flow is unchanged.

---

## Diagrams are documentation

This diagram is part of the canonical operational model. Changes to Cetana's architecture or the AEG file/enforcement layout require updating this diagram in the same PR. Out-of-sync diagrams are spec drift and will be flagged by the Archivist. Where a diagram and the prose disagree, the prose is canonical.
