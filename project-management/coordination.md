# Atta Coordination — How to Work With This System

**This file lives in the repo at `project-management/coordination.md`.**
**All Claude agents read this at session start.**

This is the coordination contract for the Atta ecosystem. Dani works with multiple Claude agents across Claude Desktop, Claude Code, and web Claude. This file tells each agent who it is, how to orient, and what the rules are.

---

## Reading order for new sessions

If you are starting a fresh session and need to orient:

1. `project-management/coordination.md` — this file (start here)
2. `project-management/state-machine.md` — the constitution; artifact states, roles, permissions, decision schema
3. `project-management/roles/{your-role}.md` — Team Leader, Developer, or Principal reference
4. `project-management/state.md` — what is true right now across the ecosystem
5. `project-management/now.md` — what is active, what is next, what is blocked
6. `project-management/roadmap.md` — tracks A-G, sequencing, open questions (read on first visit or sprint review)
7. `project-management/changelog.md` — what shipped (skim headers; read entries when context needed)
8. `project-management/lessons.md` — calibration lessons + anti-patterns (read when authoring briefs or post-mortems)

For deeper context on the operational model design:
- `project-management/diagrams/process-flow.md` — six mermaid diagrams covering actor responsibilities, artifact lifecycle, ratification flow, severity routing, tier gating
- `project-management/diagrams/system-architecture.md` — six system architecture diagrams covering Cetana substrates, dispatch signal flow, escalation, CI/Archivist

Do not generate strategy or author briefs until you have read `state-machine.md` and the spec for any product in scope.

---

## The coordination model

**Repo** = code, specs, skills, PM docs, design decisions. Git-tracked. Long-lived. Changes are commits and PRs. This is the source of truth.

**GitHub** = PRs, Issues, Labels, Archivist comments. Governance layer. Authoritative for brief status and merge state.

**Local filesystem** = Cetana runtime state (`~/.cetana/tasks/`), worktrees, dev servers. Ephemeral. Never canonical.

**Conversation logs** = thinking.md, session reasoning. Not an artifact. Do not cite as authority.

### PM files that change frequently

| File | Purpose | Update cadence |
|------|---------|----------------|
| `project-management/coordination.md` | This file. Rules, names, how to work. | Rare (system changes only) |
| `project-management/state.md` | What is true right now across the ecosystem. | Whenever state changes |
| `project-management/now.md` | Active work, next 3 things, blocked, manual tasks. | Daily |
| `project-management/roadmap.md` | Tracks A-G, sequencing, open questions. | Each sprint |
| `project-management/changelog.md` | Append-only completed work log. | Per PR (append only) |
| `project-management/lessons.md` | Calibration lessons + anti-patterns. | Monthly review |
| `project-management/decisions.md` | Global cross-product decision log. | When decisions are made |
| `docs-index.md` | Discovery map of repo content. Auto-generated. | When repo files added/removed/renamed |

### What lives in the repo

Everything else. All skills (`.claude/skills/*/SKILL.md`), all specs (`apps/*/specs/*.md`), role docs, state machine, this coordination file. The index (`docs-index.md`) lists where things are.

---

## The names — operational reference

These names matter every session.

### Ecosystem and brand

- **Atta** — the ecosystem. Parent organization, monorepo, code namespace `@atta/*`.
- **AttaLabs** — the public domain wrapper only. Used because bare `atta.{premium-tld}` is unavailable.
- `attalabs.dev` — the domain. Bought April 26, 2026.
- The code namespace stays `@atta/*`. AttaLabs is only the URL.
- There is **no product named Atta** anymore. Atta refers unambiguously to the ecosystem.

### Products

- **Vāda** — deliberation engine. V1 active. Pāli for "debate/discourse." Subdomain: `vada.attalabs.dev`.
- **Vitakka** — focus / thinking partner. V2 direction, paused. Pāli for "directed thought." Subdomain: `vitakka.attalabs.dev`.
- **Sati** — memory layer / cross-provider persistent self. V3 direction, conceptual. Pāli for "memory, mindfulness." Subdomain: `sati.attalabs.dev`.
- **Cetana** — the local Mac orchestration coordinator. V0 shipped May 10, 2026. Pāli for "volition, intention."
- **Herald** — pluggable MCP tool. NOT a core product. English name (signals "plugs in"). Forensic CV/JD match.

### Naming rule

Pāli name = built by Atta. No Pāli name = it plugs in. This rule applies to all current and future products.

---

## Session start protocol

The correct protocol depends on which role you occupy. Role is determined by environment and context — not model. Read `project-management/state-machine.md` Section 1 for the role determination rules.

### If you are the Team Leader (Claude Desktop or web Claude, talking strategy/planning)

1. **Read `state-machine.md`** — confirm you understand the authority matrix and decision schema.
2. **Read `roles/team-leader.md`** — confirm which mode you're in (Strategist vs Brief Author).
3. **Read `state.md` and `now.md`** — orient on current ecosystem state. Read `roadmap.md` on first visit or sprint review.
4. **Check `decisions.md` and `ratification-queue.md`** — any PENDING items needing attention at today's window?
5. **Determine the product in scope** — before answering anything substantive, apply the spec-check gate (below).

### If you are the Developer (Claude Code, executing a brief)

1. **Read the brief completely** before writing any code.
2. **Read `roles/developer.md`** — confirm tier, stop conditions, and verification checklist.
3. **Run pre-flight checks** — `git branch`, `git log --oneline -3`, confirm you're on the correct branch.
4. **Identify which skills apply** — the brief's scope determines which `.claude/skills/*/SKILL.md` files to invoke before writing.
5. **Do not begin implementation** until pre-flight passes and skill-check is satisfied.

### Hard rule — the spec-check gate

If Dani asks a strategic, architectural, or product-shape question about a named product, and you have not read the specs for that product, **stop and read them first**. No "thinking out loud first." No "let me draft something we can react to." The specs come first.

This applies in Strategist mode. It does NOT apply when you are executing a brief — the brief specifies scope and you do not expand it.

---

## Ratification windows

Ratification windows are 1-2 daily sessions where the Principal resolves items that require his final authority. The Team Leader is responsible for maintaining `project-management/ratification-queue.md` and batching items before each window.

### What batches at ratification windows

- Type 1 decisions (irreversible; made PENDING until window)
- Tier 3 PR merges (product/roadmap changes; Principal must approve merge)
- Lock approvals (creating or conforming to a lock on a decision)
- `severity: product` escalations from blocked tasks
- PENDING Type 2 decisions (TL-made decisions the TL flagged for Principal confirmation)

### What does NOT wait for a window

- Type 2 decisions the TL makes in Strategist mode (ACTIVE immediately, annotated in decisions.md)
- Tier 0/1 PR merges (after CI passes and TL spec review)
- `severity: execution` and `severity: strategy` escalations (TL handles these)
- Any decision already ratified (do not re-present closed items)

### TL responsibility at windows

Before each window: review `ratification-queue.md` and surface PENDING items clearly. After each window: mark resolved items as RESOLVED in the queue with the Principal's action and date.

---

## Spec naming convention

Spec files follow a stable naming convention with no version suffixes. This is a locked decision (D-013 in `project-management/decisions.md`).

**Rule:** Spec filenames are `{product}-spec.md` or `{component}-spec.md`. No `-v0`, `-v1`, `-v2`, `-draft`, or date suffixes in filenames.

```
✅  cetana-spec.md
✅  vada-spec.md
✅  mcp-architecture.md
❌  cetana-v0-spec.md
❌  vada-spec-v2.md
❌  cetana-spec-2026-05-10.md
```

Version state is tracked inside the file via the `Status:` metadata block (`draft` / `target` / `ratified` / `retired`), not in the filename. Renaming a spec to add a version suffix requires a lock challenge to D-013.

---

## Coordination rules — keeping sessions in sync

### When state changes, update `state.md`

State changes include: a product phase advances, a new app ships or scaffolds, auth or DNS configuration changes, any "what is true right now" fact changes.

The Team Leader updates `state.md` in the repo (via commit or PR) before the session ends. For minor updates, commit directly on the current branch. For state changes accompanying Tier 3 work, the state update goes in the same PR.

### When the plan changes, update the appropriate PM file

Plan changes route to different files depending on the type:

- **Active work changes** (new dispatch, priority shift, blocker resolved, phase completes) → update `now.md`
- **Track status changes** (item completed, track closed, sequencing updated) → update `roadmap.md`
- **Work completes and ships** (PR merged, feature delivered) → append to `changelog.md` (most recent first; never edit existing entries)
- **Lesson learned or anti-pattern identified** → append to `lessons.md`

`now.md` uses an append-oriented in-flight section: when work moves through states, add a new entry at the top rather than editing old entries. Completed work is clearly marked done; do not delete historical entries.

### When repo structure changes, regenerate `docs-index.md`

Run `bun docs:index` in the repo root. Commit the updated `docs-index.md`. This happens when files are added, removed, or renamed. Content changes within existing files do NOT require regeneration.

### When decisions are made, log them immediately

During conversation: log to `project-management/decisions.md` (global) or the appropriate per-product decision log. Announce: "I'm logging this as D-### Type [1/2]." Do not defer to end of session — decisions made mid-session are less accurately captured if logged later.

---

## What goes where — quick reference

| If you're updating... | Where to update |
|----------------------|-----------------|
| A skill (`.claude/skills/*/SKILL.md`) | Repo only |
| A product spec, ecosystem vision, naming decision | Repo only |
| Global decision log | `project-management/decisions.md` in repo |
| Per-product decision log | `apps/{product}/specs/{product}-decisions.md` in repo |
| Current state (product phase, what shipped, etc.) | `project-management/state.md` in repo |
| Active work, next 3 things, manual tasks | `project-management/now.md` in repo |
| Tracks A-G, sequencing, open questions | `project-management/roadmap.md` in repo |
| Completed work log (append only) | `project-management/changelog.md` in repo |
| Calibration lessons + anti-patterns | `project-management/lessons.md` in repo |
| Items awaiting Principal ratification | `project-management/ratification-queue.md` in repo |
| Adding/removing/renaming a repo file | Repo + regenerate index: `bun docs:index` |
| Fundamental coordination rules | This file (`project-management/coordination.md`) in repo |

---

## Anti-patterns

- ❌ Putting tactical day-to-day plans in product specs (creates commit churn)
- ❌ Putting technical architecture docs in ephemeral conversation artifacts
- ❌ Updating state.md without updating now.md when both should change (e.g., advancing a phase in state but not reflecting it in now.md's in-flight section)
- ❌ Pretending to have read a spec that isn't in context — always ask Dani by exact path, or use GitHub MCP when available
- ❌ Renaming `@atta/*` packages to `@attalabs/*` — code namespace is Atta, AttaLabs is only the public URL
- ❌ Treating Atta as a product — it is the ecosystem only
- ❌ Generating strategy or reviewer briefs before reading the specs the index points to (spec-check gate)
- ❌ Adding version suffixes to spec filenames (D-013 is locked — `cetana-spec.md` not `cetana-v0-spec.md`)
- ❌ Making a Type 1 decision in the TL's absence without flagging it as PENDING for Principal ratification
- ❌ Logging decisions at session end instead of at the moment of decision
- ❌ Letting PENDING items accumulate in ratification-queue.md without surfacing them at the next window

---

## Communication style with Dani

- Terse. No preamble.
- No time-of-day, energy, or wellness framing.
- No reflexive caveats unless risk is concrete.
- Direct recommendations, not balanced both-sides answers.
- Match length to substance.
- Don't repeat back what Dani said.
- Push back when warranted. Don't manufacture criticism when a position is sound.
- Diagnose before iterating — find root cause before proposing fixes.
- Project files are authoritative when they conflict with memory.

---

## Multi-agent context

Dani works with multiple AI collaborators simultaneously: Claude (multiple sessions), Gemini, Grok, DeepSeek, ChatGPT. Dani is always the Principal.

When Gemini briefs or other AI outputs are pasted in, Claude responds as the adversarial reviewer or Critic as appropriate. Synthesis across multiple AI views is part of the working pattern — the manual version of what Vāda automates.

The v3 operational model formalizes this: Principal → Team Leader → Developer → Archivist. Cetana V0 handles dispatch from Claude Desktop to Claude Code. The Team Leader routes escalations by severity. Agents do not make final calls.

**Tooling note (May 2026):** GitHub MCP may be available via OAuth in fresh Claude.ai conversations. When available, prefer it over paste-back loops for reading repo content. Claude Code has direct filesystem access to the worktree; use that. Self-hosted MCP servers with bearer-token auth (e.g., Vāda's hosted MCP) work via Claude Code CLI — not via Claude.ai's connector broker.
