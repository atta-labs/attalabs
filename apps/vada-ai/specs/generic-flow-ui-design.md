# Generic Flow UI — Design

**Status:** Draft, not ratified
**Author:** Claude (Critic/Synthesizer) with Dani (Principal)
**Date:** May 12, 2026
**Branch:** `design/generic-flow-ui`
**Related:** Bug #1 from the May 11 deliberate-page audit. PRs #37, #38 closed Bugs #2 and #3.

## Purpose

The deliberation viewer at `/deliberation/[id]` was written when every Vāda team had the same shape (3+ rounds, synthesizer, audit, revision). Two new team shapes shipped since (`vada-reviewers`, `vada-reviewers-synthesis`) — single-round brokered teams. The UI is hardcoded to the rounds-era assumption: agent cards only appear when `currentState` matches `ROUND_N`, the `RoundStrip` component drives layout, and the empty state ("Agents are getting ready…") persists for the full duration of single-round runs.

This design proposes a **single, spec-driven renderer** that handles all current and future flow shapes by reading the YAML structure directly rather than special-casing per shape.

## The conceptual model

A Vāda flow is structured as a sequence of **phases**. Each phase takes an array-shaped input (the accumulated flow state — original prompt + all prior phase outputs) and produces an array-shaped output. Phases compose into the full flow. The UI renders one component per phase, parameterized by the phase's shape.

### Phase shape parameters

For each phase the UI needs to know:

- **agents** — the names of the agents that participate in this phase (ordered or unordered set; see `layout`)
- **layout** — `parallel` (all agents in the phase run independently with no cross-visibility within the phase) or `serial` (agents run in order, each seeing the prior agent's output)
- **kind** — `reviewers` (the standard case), `synthesis` (single-agent phase that consumes the previous phase's outputs and renders below with a `↓` connector), or `audit` (validation phase — may emit FLAG/PASS rather than substantive content)
- **rounds_count** — how many times this phase repeats (defaults to `1`; `sparring`/`crucible`/`war-room` have `rounds_count: 3`)

For the v1 of this design, that's all the UI needs. The runtime characteristics (templates, classifiers, tools, output schemas) are the engine's concern, not the UI's.

### Mapping each current YAML to phases

| YAML | Phases (in order) |
|---|---|
| `a0-baseline` | 1 phase: `reviewers` layout=parallel agents=[A0] |
| `a1-baseline` | 1 phase: `reviewers` layout=parallel agents=[A1] |
| `vada-reviewers` | 1 phase: `reviewers` layout=parallel agents=[Gemini, GPT, Grok] |
| `vada-reviewers-synthesis` | 2 phases: (1) `reviewers` layout=parallel agents=[Gemini, GPT, Grok]; (2) `synthesis` agents=[Synthesizer] |
| `brokered-trio` | 1 phase: `reviewers` layout=parallel agents=[Strategist, Critic, Devil's Advocate] |
| `brokered-quartet` | 1 phase: `reviewers` layout=parallel agents=[Strategist, Critic, Devil's Advocate, Domain Expert] |
| `sparring` | 3 phases: (1) `reviewers` layout=serial agents=[Strategist, Critic] rounds_count=3; (2) `synthesis` agents=[ConclusionSynthesizer]; (3) `audit` agents=[BlindCritic, FactChecker] layout=parallel |
| `crucible` | Same shape as sparring, agents per round = 4 |
| `war-room` | Same shape as sparring, agents per round = 6 |

Every YAML in the catalog fits this model. Adding a new shape is a YAML change with no UI code change.

### Where the model and the current YAML schema disagree

Today's YAML has three distinct top-level schemas:

- **Brokered-no-synthesis** (`vada-reviewers`): `reviewers:` is top-level, no `flow:` block at all
- **Brokered-with-synthesis** (`vada-reviewers-synthesis`): `reviewers:` top-level, `flow.synthesis:` block
- **Rounds-based** (`sparring`, `crucible`, `war-room`): `flow.rounds:`, `flow.synthesis:`, `flow.audit:` blocks; no top-level `reviewers:`

The conceptual model treats reviewers/synthesis/audit as the same kind of thing (phases). The YAML schema does not.

**Path α — Adapter in the UI layer.** A new function `normalizeSpecToPhases(spec)` lives in the web app's spec-loading code (likely `apps/vada-ai/web/src/engine/normalize.ts`). It reads any of the three YAML shapes and returns a uniform `phases: PhaseSpec[]` array. The YAML files, the engine compilers, the MCP server, the route handler — all unchanged. The UI consumes only the normalized shape.

**Path β — Migrate the YAML schema.** All 9 YAML files migrated to a `phases:` array. Engine compilers consolidated to one `compilePhases` function. Spec validation rewritten. Documentation rewritten (D-018, D-013, D-011 affected). Tests updated. Larger blast radius, more architecturally pure.

**Recommendation: Path α for this design.** Reasoning:

1. The UI is the bottleneck right now. Path α gets it done.
2. Track B Item 3b (prompt iteration) starts immediately after this design ships. Migrating the YAML schema mid-iteration introduces a moving target — every YAML the Principal touches for prompt work would carry schema-migration risk in the same diff.
3. Path β is a real architectural improvement and worth doing later. It deserves its own design pass and PR, possibly as part of a broader schema-cleanup track. The conceptual model in this design becomes the foundation for that future migration: the UI is already operating on `phases[]`, so when the YAML migrates, the UI doesn't change.
4. Path α leaves an obvious seam (`normalizeSpecToPhases`) that becomes the migration target for Path β when the time comes.

The cost of Path α is one small adapter function. The benefit is unblocking the UI rewrite today without touching the engine or YAML.

## What the new UI looks like

### The component tree

```
DeliberationPage (server)
  ├── loadYamlFromCatalog(specId)
  ├── normalizeSpecToPhases(spec) → phases: PhaseSpec[]
  └── DeliberationFeed (client)
        ├── PhaseColumn  (one per phase, rendered top-to-bottom)
        │     ├── PhaseHeader  (phase title, kind badge, status)
        │     ├── AgentCardGrid  (parallel layout) | AgentCardChain  (serial layout)
        │     │     └── AgentCard  (one per agent in this phase × rounds_count)
        │     │           ├── AgentAvatar
        │     │           ├── StreamingContent
        │     │           └── ErrorBanner  (when output.error is set)
        │     └── PhaseConnector  (↓ icon if next phase is `synthesis`)
        ├── ConclusionPanel  (existing component, already hasSynthesizer-aware)
        └── TranscriptActions
```

### Three layout patterns

**Parallel phase (`vada-reviewers` round 1, `audit` in sparring):**
- All agents shown side-by-side in a horizontal row (or 2×N grid on narrow viewports)
- No connectors between agents within the phase — they're independent
- Each card streams independently as its `agent_completed` event arrives
- Phase status: "active" until all agents complete (success or error), then "complete"

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Gemini     │  │     GPT      │  │     Grok     │
│  (streaming) │  │   (complete) │  │   (error)    │
└──────────────┘  └──────────────┘  └──────────────┘
```

**Serial phase (`sparring` rounds 1-3 with Strategist → Critic):**
- Agents shown left-to-right in a row with → connectors between them
- Each agent's card fills only after the previous agent in the phase has completed
- For `rounds_count > 1`, repeat the phase pattern below, separated by a horizontal divider with "Round N" label
- Existing `RoundStrip` behavior — preserved but driven from the spec rather than hardcoded

```
Round 1:
┌──────────────┐  →  ┌──────────────┐
│  Strategist  │     │    Critic    │
│   (complete) │     │   (complete) │
└──────────────┘     └──────────────┘
─────────────────────────────────────
Round 2:
┌──────────────┐  →  ┌──────────────┐
│  Strategist  │     │    Critic    │
│   (complete) │     │  (streaming) │
└──────────────┘     └──────────────┘
─────────────────────────────────────
Round 3: …
```

**Synthesis phase (after a reviewers phase):**
- Renders below the previous phase with a centered `↓` connector
- Single agent card, full-width
- For structured-output synthesizers, the rendered conclusion JSON gets pretty-printed by the existing `ConclusionPanel` logic
- For free-text synthesizers, just streams the agent's content

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Gemini     │  │     GPT      │  │     Grok     │
│   (complete) │  │   (complete) │  │   (complete) │
└──────────────┘  └──────────────┘  └──────────────┘
                  ↓
        ┌─────────────────────────────────┐
        │         Synthesizer             │
        │       (streaming)               │
        └─────────────────────────────────┘
```

### Streaming render contract

The existing SSE events (per the live PR #35 payload format) are:

- `keepalive` — heartbeat, no UI effect
- `agent_completed` — `{ id, agent, round, content }` — a turn was persisted; render this agent's card with the content
- `state_changed` — `{ state: "ROUND_N" | "TERMINAL" | "CONCLUDING" | ... }` — phase-level state transition
- `synthesis_complete` (per `vada-state.md`) — `{ agent, content, structured, is_revision }` — synthesis turn with structured output
- `terminal` — `{ terminalState }` — flow concluded

**The new UI binds these events to phases as follows:**

| Event | Phase update |
|---|---|
| `agent_completed` with `round=N`, `agent=X` | Find the phase containing agent X at round N. Update that phase's `AgentCard[X]` with the content. |
| `agent_completed` where `output.error` is set | Same phase update, but render the ErrorBanner instead of streaming content (the error message is in `content` per PR #35). |
| `state_changed: ROUND_N` | Mark the corresponding `reviewers` phase as active for round N. Subsequent `agent_completed` events flow into that phase's round-N row. |
| `state_changed: CONCLUDING` | Mark the `synthesis` phase as active. |
| `state_changed: AUDITING` | Mark the `audit` phase as active. |
| `state_changed: REVISING` | The `synthesis` phase enters a "revising" sub-state. Render the prior synthesis card with a "revising" indicator and append a new card for the revised output when it arrives. |
| `synthesis_complete` | Update the synthesis phase's agent card with `content` (rendered text) and `structured` (for ConclusionPanel). |
| `terminal: CLEAN` (or ERROR/UNCONVERGED) | All phases marked complete. ConclusionPanel renders below. |

**A key change from today:** the UI does NOT wait for `state_changed: ROUND_N` to start rendering anything. The phase columns are rendered as soon as the page mounts (with empty agent cards). As `agent_completed` events arrive, cards fill in. For single-round brokered teams that emit no `ROUND_1` state but go straight to `agent_completed` × N → `TERMINAL`, the UI behaves correctly because rendering is event-driven, not state-driven.

This is the root cause fix for Bug #1.

### What stays the same from today's UI

- The page layout (sticky header, scroll behavior, error toasts)
- The `ConclusionPanel` (already made spec-aware in PR #38 via `hasSynthesizer`)
- The `TranscriptActions` (Copy / Download / View Benchmark Comparison)
- The streaming animations on agent cards (Framer Motion fade-in)
- The agent-avatar visuals (the `<AIASphere>` cluster per agent)
- The session-resume behavior (`fetchInitialMessages` on mount before SSE subscribes)
- The benchmark comparison link in the footer
- The cost estimate display per agent

These are all rendered by component subtrees that don't depend on the round-strip model. They get hoisted into the new component tree unchanged.

### What changes

- `RoundStrip.tsx`, `Round.tsx`, `RoundView.tsx`, `useRoundStrip.ts` are replaced by `PhaseColumn.tsx`, `AgentCardGrid.tsx`, `AgentCardChain.tsx`, `usePhaseState.ts`
- `useDeliberationScene.ts` no longer derives `displayRounds` and `currentRoundNum` from `currentState` strings. Instead, it derives per-phase status from the events arriving for each phase's agents.
- The mental model in the codebase shifts from "rounds drive the UI" to "phases drive the UI; rounds are a property of certain phase types"
- The empty state ("Agents are getting ready…") is no longer the default. Phase columns are always rendered; cards fill in as events arrive. If no events have arrived yet, each card shows a spinner or "Pending" state in place of the panel-level empty message.

## Implementation phasing

The full rewrite is large enough that doing it in one PR is risky. Proposed phasing:

### Phase 1: Spec normalization (~½ day, mechanical)
- Add `normalizeSpecToPhases()` in `apps/vada-ai/web/src/engine/normalize.ts`
- Add types: `PhaseSpec`, `PhaseKind`, `PhaseLayout`
- Unit tests for all 9 catalog YAMLs (assert correct phase decomposition)
- Wire `normalizeSpecToPhases` into `page.tsx` and pass `phases` as a prop to `DeliberationFeed` (alongside existing props for backwards compatibility during the rewrite)

This phase ships without UI changes. The new prop is passed but not yet consumed. Easy to revert. Catches schema-shape edge cases early.

### Phase 2: New renderer for `reviewers` + `synthesis` phases (~1-2 days)
- Build `PhaseColumn`, `AgentCardGrid`, `AgentCardChain`, `AgentCard`, `usePhaseState` components
- Build the new event-to-phase routing logic (replaces the round-state-based logic in `useDeliberationScene`)
- Add a feature flag (env var or query param like `?ui=v2`) that selects between the old `RoundStrip` and the new `PhaseColumn` renderer
- Initial scope: `vada-reviewers` and `vada-reviewers-synthesis` work in the new renderer
- Rounds-based teams (`sparring`/`crucible`/`war-room`) STILL go through the old `RoundStrip` (the renderer doesn't yet handle multi-round `reviewers` phases)

This phase delivers user-visible value for Vāda Reviewers immediately. The old renderer continues to work for everything else.

### Phase 3: Handle multi-round and audit/revision phases (~2-3 days)
- Extend the new renderer to handle `rounds_count > 1` (sparring/crucible/war-room as serial-phase × N rounds)
- Handle audit phase and revision sub-state (the FLAG → REVISING → re-synthesis loop)
- Switch the feature flag default to the new renderer
- Sparring/crucible/war-room run on the new renderer

### Phase 4: Cleanup (~½ day)
- Remove `RoundStrip.tsx`, `Round.tsx`, `RoundView.tsx`, `useRoundStrip.ts` and all related dead code
- Remove the feature flag
- Update `vada-home-sections` SKILL.md if it references the rounds-era components
- Update `vada-state.md` and PR description in the docs trail

### Phase 5 (optional, future): Path β
- Migrate YAML schemas to native `phases:` array
- Consolidate engine compilers to `compilePhases`
- Drop `normalizeSpecToPhases` (the UI reads `phases` natively from the YAML)
- This is a separate design + PR. Captured as OQ-cross-13 (new) for future tracking.

## Open questions for Principal review

**OQ-1 — Does the rounds-based teams' synthesis phase render below the entire rounds stack, or below the last round?**

Sparring runs 3 rounds of 2 agents, then synthesis. The synthesis phase logically operates on the full transcript (all 3 rounds), not just the last round. Visually, two options:

- (a) Render rounds 1-3 stacked top-to-bottom (as today's RoundStrip does), then the synthesis card below the last round with a single `↓` connector. Implies "synthesis follows the deliberation."
- (b) Render rounds 1-3 in a single phase column, then synthesis as a distinct phase column with its own `↓` connector spanning the entire previous phase. More architecturally honest but visually heavier.

Lean: (a). Matches how users already read the existing rounds-based UI. The `↓` connector is a per-phase-boundary signal, not a per-round signal.

**OQ-2 — Where does the `audit` phase render?**

Sparring's audit (BlindCritic + FactChecker) runs after synthesis. Options:

- (a) Render audit as a parallel phase below the synthesis phase, full-width like reviewers, with its own header. Audit results (FLAG/PASS) shown as small badge-style cards.
- (b) Render audit results inline on the synthesis card (a small "Audit: PASS" pill in the card footer).
- (c) Hide audit entirely from the live UI; show only its effect (revision was triggered, here's the revised conclusion). Audit details available in the transcript only.

Lean: (a). The audit phase is conceptually a real phase in the flow; making it visible matches the "phases drive the UI" model. Users get to see the deliberation working. The badges keep the visual weight small.

**OQ-3 — Where does revision sub-state render?**

When audit FLAGs, the synthesis phase re-runs. Two synthesis outputs exist. Options:

- (a) Replace the original synthesis card with the revised one. Loses the original; user sees only the final result.
- (b) Render both synthesis cards stacked, with the first marked "superseded by revision" and the second the active one.
- (c) Toggle between original/revised via a tab on the synthesis card.

Lean: (b). Matches Vāda's transparency principle — show the user what happened, not just the verdict. The original synthesis being visibly revised is part of the story.

**OQ-4 — How does the UI handle phase-level errors that aren't agent-specific?**

If the engine throws before any agent completes (e.g., missing provider key for the team's default model), the SSE stream may emit no `agent_completed` events at all and go straight to `terminal: ERROR`. The new UI's "always render phase columns with empty cards" approach means in this case the user sees empty cards forever.

Options:

- (a) On `terminal: ERROR` with zero `agent_completed` events, replace the phase columns with a single error banner explaining the flow failed at startup.
- (b) Leave the empty cards but mark each "Failed (no output)" with a tooltip pointing to the transcript.
- (c) Render an "execution error" toast at the top while leaving the phase columns intact for diagnosis.

Lean: (a) for startup errors, (c) for mid-flight errors. Combining both: any time a `terminal: ERROR` arrives with at least one missing agent output, show the toast; if zero agents emitted, additionally replace the columns with an error state.

**OQ-5 — Naming.**

I've been using `phase` throughout this design as the unit. The current code uses `round` for a different concept (the inner repetition of a phase). The new code needs a clean word for the outer thing.

Options:

- `phase` (used in this doc) — neutral, generic, matches the conceptual model
- `step` — natural to read, but ambiguous (a single agent could also be called a "step")
- `stage` — fine, but generic
- `block` — fine, evokes structure
- `act` — evocative but maybe too theatrical

Lean: `phase`. Sticking with it for the rest of this design unless you push back.

**OQ-6 — Should the spec normalize directly translate to the UI's data shape, or should there be an intermediate event-routing layer?**

The phase descriptors are static (from YAML). The runtime state (which agents have completed, which are streaming, error messages) is dynamic. Two ways to organize:

- (a) `phases` is static + `phaseStates: PhaseRuntimeState[]` parallel array tracks per-phase runtime. Two arrays, indexed by phase index.
- (b) `phases` is enriched with runtime state during render via a `useReducer` keyed by phase id.

Lean: (a). Static config separated from runtime state is easier to reason about, easier to test, and easier to extend. The reducer in `useDeliberationScene` mutates `phaseStates` based on SSE events.

## Out of scope for this design

These are not addressed here and may be future work:

- **YAML schema migration (Path β).** Separate design.
- **Real-time agent-card streaming (token-by-token).** Today's `agent_completed` arrives as a single payload at the end. Future work could stream tokens via a different SSE event type (`agent_token`?) and render them as they arrive. The new renderer is forward-compatible with this — `AgentCard` already has a `streaming` state — but no schema or backend work is in scope here.
- **Mobile responsive design.** The new renderer should look reasonable on narrow viewports (grids wrap to 2×N then 1×N), but pixel-perfect mobile UX is not in scope.
- **Accessibility audit.** Not addressed in this design. A separate pass before Phase 4 cleanup.
- **Animation choreography between phase transitions.** The current `RoundStrip` has nice Framer Motion fades. The new renderer preserves them at the agent-card level but doesn't specify phase-to-phase transition animation.

## What I need from you, Dani

1. **Confirm the conceptual model.** Does the phase abstraction capture the architecture cleanly enough that this is the right cleanup, vs. some better framing?
2. **Resolve the six open questions** (OQ-1 through OQ-6). My leans are explicit; please push back where I'm wrong.
3. **Confirm the phasing.** Phase 1 (spec normalization) + Phase 2 (new renderer for brokered teams) is ~2 days of work and ships the user-visible win. Do you want to dispatch them as separate briefs, or as a combined PR? My lean: separate briefs, separate PRs — Phase 1 is mechanical and easy to verify; Phase 2 has design judgment in the layout. Separate PRs reduce review surface.
4. **Confirm Path α.** Are you comfortable with the YAML schema staying as-is and the normalization happening in the web app? Or do you want Path β scoped now as the long-term commitment?

Once these are settled, I'll write the Phase 1 brief (Haiku-level, mechanical), and the Phase 2 brief (Sonnet, design judgment required). Each goes through the executor workflow we've been using.

---

## Appendix A — `PhaseSpec` type sketch

```ts
type PhaseKind = 'reviewers' | 'synthesis' | 'audit'
type PhaseLayout = 'parallel' | 'serial'

interface PhaseSpec {
  id: string                    // unique identifier within the spec, e.g., 'reviewers-r1', 'synthesis', 'audit'
  kind: PhaseKind
  layout: PhaseLayout
  agents: string[]              // ordered if layout=serial, unordered if layout=parallel
  rounds_count: number          // defaults to 1
  has_revision?: boolean        // true for sparring/crucible/war-room synthesis phases (audit can trigger revision)
}

interface PhaseRuntimeState {
  phaseId: string
  status: 'pending' | 'active' | 'complete' | 'errored'
  agentStates: Record<string, AgentRuntimeState>   // keyed by agent name
  activeRound: number            // for multi-round phases
}

interface AgentRuntimeState {
  status: 'pending' | 'streaming' | 'complete' | 'errored'
  content: string                // accumulated or final content
  error?: string                 // error message if errored
  rounds: Record<number, { content: string; error?: string }>   // per-round content for multi-round phases
}
```

## Appendix B — `normalizeSpecToPhases` examples

```ts
// vada-reviewers.yaml → 1 phase
normalizeSpecToPhases(vadaReviewersSpec) === [
  { id: 'reviewers', kind: 'reviewers', layout: 'parallel',
    agents: ['Gemini', 'GPT', 'Grok'], rounds_count: 1 }
]

// vada-reviewers-synthesis.yaml → 2 phases
normalizeSpecToPhases(vadaReviewersSynthesisSpec) === [
  { id: 'reviewers', kind: 'reviewers', layout: 'parallel',
    agents: ['Gemini', 'GPT', 'Grok'], rounds_count: 1 },
  { id: 'synthesis', kind: 'synthesis', layout: 'parallel',
    agents: ['Synthesizer'], rounds_count: 1 }
]

// sparring.yaml → 3 phases
normalizeSpecToPhases(sparringSpec) === [
  { id: 'reviewers', kind: 'reviewers', layout: 'serial',
    agents: ['Strategist', 'Critic'], rounds_count: 3 },
  { id: 'synthesis', kind: 'synthesis', layout: 'parallel',
    agents: ['ConclusionSynthesizer'], rounds_count: 1, has_revision: true },
  { id: 'audit', kind: 'audit', layout: 'parallel',
    agents: ['BlindCritic', 'FactChecker'], rounds_count: 1 }
]
```
