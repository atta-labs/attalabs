# Round Strip UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Commit policy (project rule):** Never `git commit` without explicit per-message approval from the user. Each task ends at "ready to commit"; show the diff and wait. See root `CLAUDE.md`.

**Goal:** Replace the accumulating card-per-agent / collapsible round UI on `/deliberation/[id]` with a per-round strip — horizontal sphere row (agents in turn order) + vertical slot column below (one slot per agent). Directed particles fire from speaker→next-speaker on handoff, using the existing `fireDirectedMessage` primitive.

**Architecture:** Keep the single outer `<AIACanvas>` that already wraps the feed (provides context + particle system + `matchContentHeight` scroll handling). Each round becomes a `<RoundStrip>` component rendered inside that canvas. Spheres register with unique per-round IDs (`round-${round}-${agentRole}`). A `useRoundStrip` hook derives each agent's per-round status (`idle | speaking | done`) from existing `messages` + `streamingMessage` state and fires a directed particle when the current speaker changes. No new canvas implementation — just a simpler *use* of the existing one (no `AIARing`, no fabric bg, no envoy).

**Tech Stack:** Next.js 16 + React 19, `@atta/ui/canvas` (AIACanvas, AIAgent, useAIAContext, fireDirectedMessage), Tailwind v4, existing `@atta/agents` theme colors.

---

## File Structure

**New files:**
- `apps/vada-ai/web/src/app/deliberation/[id]/components/deriveAgentStates.ts` — Pure function: `(agentRoles, entries, streamingMessage, round) → AgentState[]`. No React, no canvas. Unit-testable if test infra is later added.
- `apps/vada-ai/web/src/app/deliberation/[id]/components/useRoundStrip.ts` — Hook: calls `deriveAgentStates`, tracks speaker transitions, fires `fireDirectedMessage` via `useAIAContext`.
- `apps/vada-ai/web/src/app/deliberation/[id]/components/RoundStrip.tsx` — Pure presentation: renders round label, horizontal `AIAgent` row, vertical slot column. Reads from `useRoundStrip`.

**Modified files:**
- `apps/vada-ai/web/src/app/deliberation/[id]/components/DeliberationFeed.tsx` — Replace `<RoundSection>` with `<RoundStrip>`. Replace the "round N started but no entries yet" placeholder block with just an empty-slots `<RoundStrip>`.
- `apps/vada-ai/web/src/app/deliberation/[id]/components/useDeliberationScene.ts` — Compute `displayRounds = union(rounds, currentRoundNum)`; export it.

**Deleted files (once unreferenced):**
- `apps/vada-ai/web/src/app/deliberation/[id]/components/RoundSection.tsx`
- `apps/vada-ai/web/src/app/deliberation/[id]/components/useRoundSection.ts`
- `apps/vada-ai/web/src/app/deliberation/[id]/components/WaveConnector.tsx`
- `apps/vada-ai/web/src/app/deliberation/[id]/components/AgentCard.tsx`

---

## Task 1: Pure derivation function

**Files:**
- Create: `apps/vada-ai/web/src/app/deliberation/[id]/components/deriveAgentStates.ts`

- [ ] **Step 1: Create the pure function**

```ts
// Derive per-agent state for one round strip. Pure function — no React, no
// canvas. `agentRoles` is the turn order from the session; `entries` is the
// completed transcript; `streamingMessage` is the currently-streaming
// message, if any. One AgentState per role in `agentRoles` order (not the
// order messages arrived — turn order is the source of truth for the row).

import type { DeliberationMessage, StreamingMessage } from './useDeliberation'

export type AgentStatus = 'idle' | 'speaking' | 'done'

export interface AgentState {
  role: string
  status: AgentStatus
  message: string
}

export function deriveAgentStates(
  agentRoles: string[],
  entries: DeliberationMessage[],
  streamingMessage: StreamingMessage | null,
  round: number
): AgentState[] {
  return agentRoles.map((role) => {
    const streaming = streamingMessage?.agent === role && streamingMessage.round === round
    if (streaming) {
      return { role, status: 'speaking', message: streamingMessage.content }
    }
    const entry = entries.find((e) => e.agent === role && e.round === round)
    if (entry) {
      return { role, status: 'done', message: entry.content }
    }
    return { role, status: 'idle', message: '' }
  })
}

export function findCurrentSpeaker(states: AgentState[]): string | null {
  return states.find((s) => s.status === 'speaking')?.role ?? null
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `bun run typecheck`
Expected: no errors (the imported types `DeliberationMessage` and `StreamingMessage` are already exported from `useDeliberation.ts:19,29`).

- [ ] **Step 3: Ready to commit (await user approval)**

```bash
git add apps/vada-ai/web/src/app/deliberation/\[id\]/components/deriveAgentStates.ts
# Commit message for user approval:
#   "Feat: Add deriveAgentStates helper for round strip UI"
```

---

## Task 2: useRoundStrip hook

**Files:**
- Create: `apps/vada-ai/web/src/app/deliberation/[id]/components/useRoundStrip.ts`

- [ ] **Step 1: Create the hook**

```ts
'use client'

// Hook that powers a single round strip. Two jobs:
//   1. Derive per-agent state for the round from existing deliberation data.
//   2. Fire a directed particle between spheres when the speaker changes
//      (handoff animation). Must be called inside an <AIACanvas> tree —
//      useAIAContext returns null outside one.
//
// Sphere ID convention: `round-${round}-${agentRole}`. Unique per round so
// particles don't migrate between strips (see canvas/CLAUDE.md "Unique
// Sphere IDs").

import { useAIAContext } from '@atta/ui/canvas'
import { useEffect, useMemo, useRef } from 'react'
import { type AgentState, deriveAgentStates, findCurrentSpeaker } from './deriveAgentStates'
import type { DeliberationMessage, StreamingMessage } from './useDeliberation'

export function sphereIdFor(round: number, role: string): string {
  return `round-${round}-${role}`
}

interface UseRoundStripProps {
  round: number
  agentRoles: string[]
  entries: DeliberationMessage[]
  streamingMessage: StreamingMessage | null
}

export function useRoundStrip({ round, agentRoles, entries, streamingMessage }: UseRoundStripProps) {
  const ctx = useAIAContext()

  const agentStates: AgentState[] = useMemo(
    () => deriveAgentStates(agentRoles, entries, streamingMessage, round),
    [agentRoles, entries, streamingMessage, round]
  )

  const currentSpeaker = useMemo(() => findCurrentSpeaker(agentStates), [agentStates])

  // Handoff animation: when the speaker transitions from A to B, fire a
  // particle from A's sphere to B's sphere. The canvas provides the particle
  // rendering (~230ms flight); we just trigger it on the transition edge.
  const prevSpeakerRef = useRef<string | null>(null)
  useEffect(() => {
    const prev = prevSpeakerRef.current
    const current = currentSpeaker
    if (prev && current && prev !== current && ctx) {
      ctx.fireDirectedMessage(sphereIdFor(round, prev), sphereIdFor(round, current))
    }
    prevSpeakerRef.current = current
  }, [currentSpeaker, round, ctx])

  return { agentStates, currentSpeaker }
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 3: Ready to commit (await user approval)**

```bash
git add apps/vada-ai/web/src/app/deliberation/\[id\]/components/useRoundStrip.ts
# Commit message for user approval:
#   "Feat: Add useRoundStrip hook for per-round state and handoff particles"
```

---

## Task 3: RoundStrip presentational component

**Files:**
- Create: `apps/vada-ai/web/src/app/deliberation/[id]/components/RoundStrip.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

// Pure presentation for one round. Horizontal row of AIAgent spheres at top
// (agents in turn order), vertical slot column below (one per agent, same
// order). Slots show streaming text for the current speaker, frozen text for
// done agents, and a muted placeholder for idle agents. All hooks live in
// useRoundStrip — this file only renders.

import { AIAgent, type AgentName } from '@atta/ui/canvas'
import { AGENT_COLOR_BY_ROLE, ROUND_TITLES } from './agent-theme'
import { useRoundStrip, sphereIdFor } from './useRoundStrip'
import type { DeliberationMessage, StreamingMessage } from './useDeliberation'

interface RoundStripProps {
  round: number
  agentRoles: string[]
  entries: DeliberationMessage[]
  streamingMessage: StreamingMessage | null
  isLive: boolean
  isRoundComplete: boolean
}

// Map internal role strings (lowercase like 'strategist') to canonical
// AgentName used by AIAgent. Agents package defines both.
const AGENT_NAME_BY_ROLE: Record<string, AgentName> = {
  strategist: 'Strategist',
  critic: 'Critic',
  devils_advocate: "Devil's Advocate",
  synthesizer: 'Synthesizer',
  researcher: 'Researcher',
  operator: 'Operator'
}

function toAgentName(role: string): AgentName {
  return AGENT_NAME_BY_ROLE[role] ?? (role as AgentName)
}

export function RoundStrip({
  round,
  agentRoles,
  entries,
  streamingMessage,
  isLive,
  isRoundComplete
}: RoundStripProps) {
  const { agentStates } = useRoundStrip({ round, agentRoles, entries, streamingMessage })

  return (
    <section className='mb-8 rounded-lg border border-border bg-card/40'>
      {/* Round header */}
      <header className='flex items-center justify-between border-b border-border px-4 py-2'>
        <span className='font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground'>
          Round {round} — {ROUND_TITLES[round] ?? ''}
        </span>
        <span className='font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground'>
          {isRoundComplete ? 'done' : isLive ? 'live' : 'pending'}
        </span>
      </header>

      {/* Sphere row — agents in turn order, left to right */}
      <div className='flex items-end justify-around px-4 pt-6 pb-4'>
        {agentStates.map((s) => (
          <div key={s.role} className='flex flex-col items-center gap-2'>
            <AIAgent
              id={sphereIdFor(round, s.role)}
              name={toAgentName(s.role)}
              size='sm'
              state={s.status === 'speaking' ? 'speaking' : s.status === 'done' ? 'complete' : 'idle'}
              showMatrix={s.status === 'speaking'}
              noLabel
            />
            <span className='font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground'>
              {toAgentName(s.role)}
            </span>
          </div>
        ))}
      </div>

      {/* Slot column — one per agent, same turn order */}
      <ol className='flex flex-col gap-2 px-4 pb-4'>
        {agentStates.map((s) => {
          const color = AGENT_COLOR_BY_ROLE[s.role] ?? 'var(--border)'
          const active = s.status === 'speaking'
          const filled = s.status !== 'idle'
          return (
            <li
              key={s.role}
              className={`rounded border-l-2 px-3 py-2 ${active ? 'bg-card' : 'bg-card/30'} ${
                filled ? 'border-l-[var(--agent-color)]' : 'border-l-border'
              }`}
              style={{ '--agent-color': color } as React.CSSProperties}
            >
              <div
                className={`mb-1 font-mono text-[9px] uppercase tracking-[0.22em] ${
                  filled ? 'text-[var(--agent-color)]' : 'text-muted-foreground'
                }`}
              >
                {toAgentName(s.role)}
              </div>
              {s.status === 'idle' ? (
                <div className='text-[13px] italic text-muted-foreground'>— waiting —</div>
              ) : (
                <div className='whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90'>
                  {s.message}
                  {active && <span className='ml-0.5 inline-block h-3 w-px animate-pulse bg-foreground align-middle' />}
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
```

- [ ] **Step 2: Verify exports in `agent-theme.ts`**

Run: `grep -n "AGENT_COLOR_BY_ROLE\|ROUND_TITLES" apps/vada-ai/web/src/app/deliberation/\[id\]/components/agent-theme.ts`
Expected: Both exports present (`AGENT_COLOR_BY_ROLE` is re-exported via `@/lib/agent-theme`).

- [ ] **Step 3: Inline-style pattern check**

The only `style={{ }}` use is `style={{ '--agent-color': color } as React.CSSProperties}` — CSS custom property injection, the explicitly-allowed pattern per `.claude/rules/ui-patterns.md` RULE 3. Agent color then consumed via Tailwind arbitrary classes `border-l-[var(--agent-color)]` and `text-[var(--agent-color)]`. No raw `style={{ color: ... }}` anywhere.

- [ ] **Step 4: Typecheck**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 5: Ready to commit (await user approval)**

```bash
git add apps/vada-ai/web/src/app/deliberation/\[id\]/components/RoundStrip.tsx
# Commit message for user approval:
#   "Feat: Add RoundStrip presentational component"
```

---

## Task 4: Wire RoundStrip into DeliberationFeed

**Files:**
- Modify: `apps/vada-ai/web/src/app/deliberation/[id]/components/useDeliberationScene.ts`
- Modify: `apps/vada-ai/web/src/app/deliberation/[id]/components/DeliberationFeed.tsx`

- [ ] **Step 1: Export `displayRounds` from useDeliberationScene**

In `useDeliberationScene.ts`, after the `rounds` computation (currently around line 35-37), add:

```ts
  // Display set = completed rounds ∪ currently-streaming round. Makes an
  // empty RoundStrip appear as soon as the engine starts a new round, even
  // before any content streams back.
  const displayRounds = (() => {
    const s = new Set<number>(rounds)
    if (currentRoundNum) s.add(currentRoundNum)
    return Array.from(s).sort((a, b) => a - b)
  })()
```

Then in the returned object (end of the hook), add `displayRounds` to the return so the component can read it.

- [ ] **Step 2: Replace RoundSection with RoundStrip in DeliberationFeed**

In `DeliberationFeed.tsx`, change the import:

```tsx
// Remove:
import { RoundSection } from './RoundSection'
// Add:
import { RoundStrip } from './RoundStrip'
```

Replace the `{s.rounds.map((round) => {...})}` block and the "agents are reading round…" placeholder block with:

```tsx
        {s.displayRounds.map((round) => {
          const roundEntries = s.messages.filter((m) => m.round === round)
          const streamingForRound = s.streamingMessage?.round === round ? s.streamingMessage : null
          return (
            <RoundStrip
              key={round}
              round={round}
              agentRoles={agentRoles}
              entries={roundEntries}
              streamingMessage={streamingForRound}
              isLive={s.currentRoundNum === round && s.isLiveSession}
              isRoundComplete={s.isRoundComplete(round)}
            />
          )
        })}
```

Note: delete the separate "Round N — Agents are reading…" placeholder block (it's now redundant — an empty RoundStrip covers the same purpose).

- [ ] **Step 3: Typecheck**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 4: Start dev server and manually verify**

Run: `bun run dev:vada`
Open: `http://localhost:3003/deliberation/<any-completed-session-id>`

Expected behavior:
- Each round renders as a single strip (sphere row + slot column).
- No collapse/expand. No jumping scroll.
- Completed sessions: all rounds show 'done' status, all slots filled.
- Live sessions: current round shows 'live', spheres reflect per-agent speaking/done state, particle flies between spheres when speaker changes.

If matrix rain does not render for the current speaker, verify `alwaysRenderSpheres` is still on the outer `<AIACanvas>` (`DeliberationFeed.tsx:30`).

- [ ] **Step 5: Ready to commit (await user approval)**

```bash
git add apps/vada-ai/web/src/app/deliberation/\[id\]/components/useDeliberationScene.ts \
         apps/vada-ai/web/src/app/deliberation/\[id\]/components/DeliberationFeed.tsx
# Commit message for user approval:
#   "Feat: Use RoundStrip in DeliberationFeed, remove round placeholder"
```

---

## Task 5: Delete obsolete round/card files

**Files:**
- Delete: `apps/vada-ai/web/src/app/deliberation/[id]/components/RoundSection.tsx`
- Delete: `apps/vada-ai/web/src/app/deliberation/[id]/components/useRoundSection.ts`
- Delete: `apps/vada-ai/web/src/app/deliberation/[id]/components/WaveConnector.tsx`
- Delete: `apps/vada-ai/web/src/app/deliberation/[id]/components/AgentCard.tsx`

- [ ] **Step 1: Verify each is unreferenced**

Run:
```
grep -rn "from './RoundSection'\|from './useRoundSection'\|from './WaveConnector'\|from './AgentCard'" apps/vada-ai/web/src
```
Expected: zero matches (DeliberationFeed no longer imports RoundSection; nothing else uses the others). If any match remains, stop and investigate before deleting.

- [ ] **Step 2: Delete the files**

```bash
rm apps/vada-ai/web/src/app/deliberation/\[id\]/components/RoundSection.tsx
rm apps/vada-ai/web/src/app/deliberation/\[id\]/components/useRoundSection.ts
rm apps/vada-ai/web/src/app/deliberation/\[id\]/components/WaveConnector.tsx
rm apps/vada-ai/web/src/app/deliberation/\[id\]/components/AgentCard.tsx
```

- [ ] **Step 3: Typecheck + lint**

Run: `bun run check`
Expected: 0 errors. (Pre-existing warnings in `mdx-preprocess.ts` and `useDeliberation.ts:137` are unrelated and acceptable — do not fix here.)

- [ ] **Step 4: Ready to commit (await user approval)**

```bash
git add -A apps/vada-ai/web/src/app/deliberation/\[id\]/components/
# Commit message for user approval:
#   "Chore: Remove obsolete RoundSection/AgentCard/WaveConnector files"
```

---

## Task 6: Manual verification pass

**No file changes. Visual-only.**

- [ ] **Step 1: Run a fresh Sparring Match on Ollama (2 agents, no rate limits)**

Start a new deliberation: `/deliberate`, pick **The Sparring Match**, Ollama model, submit a short question.

- [ ] **Step 2: Verify per-round behavior**

For each of the 3 volleys:
- Strip appears at the start of the round (empty slots, 2 idle spheres).
- Strategist sphere lights up + matrix on + streams text into its slot.
- When Strategist finishes: matrix off, slot freezes with full text.
- Particle fires from Strategist → Critic sphere (~230ms flight, visible white streak).
- Critic sphere lights up + matrix on + streams into its slot.
- At round end: both slots show frozen text, both spheres in 'done' (matrix off, face visible).

- [ ] **Step 3: Verify round transitions**

When Round 1 completes, Round 2's strip appears **below** Round 1. Round 1 stays frozen. User can scroll up to re-read Round 1. Scroll direction is always downward with time. No collapses, no jumps.

- [ ] **Step 4: Verify particle uniqueness across rounds**

Round 1's Strategist sphere is `round-1-strategist`. Round 2's Strategist sphere is `round-2-strategist`. When Round 2's Strategist speaks, particles are at its position — they do NOT migrate back to Round 1's Strategist. If particles go to the wrong sphere, there's an ID collision — recheck `sphereIdFor`.

- [ ] **Step 5: Verify a completed Crucible session**

Reload an older 4-agent CLEAN session. All 3 rounds visible as static strips, 4 agents per row, all slots filled, no animation (canvas should be paused per `DeliberationFeed.tsx:30 paused={isAlreadyTerminal}`).

- [ ] **Step 6: Ship**

No commit — this task is verification. If any step fails, file the failure as a follow-up task and fix before declaring done.

---

## Self-Review — completed

**Spec coverage:**
- ✅ Per-round strip with sphere row + slot column → Task 3
- ✅ Only scroll is between strips, not within → Task 3 (single section per round, no collapse)
- ✅ Particle handoff between spheres on speaker change → Task 2 (`fireDirectedMessage` in `useRoundStrip`)
- ✅ Face stays on 'done', matrix off → Task 3 (`state='complete' showMatrix={false}`)
- ✅ Unique sphere IDs per round → Task 2 (`sphereIdFor`)
- ✅ Reuse existing canvas primitives, no new canvas → no `AIARing`, no fabric, no `matchContentHeight` override
- ✅ Empty strip for an in-progress round that hasn't streamed yet → Task 4 (`displayRounds`)
- ✅ Old card UI removed → Task 5

**Placeholder scan:** No TBD / TODO / "add error handling" phrases. All step code is complete.

**Type consistency:** `AgentState` / `AgentStatus` defined in Task 1 and used in Tasks 2/3. `sphereIdFor` defined in Task 2 and used in Tasks 2/3. `AGENT_COLORS` and `ROUND_TITLES` read from existing `agent-theme.ts` (verified in Task 3 Step 2).

**Known follow-ups (out of scope):**
- Per-agent model picker (user confirmed not this cycle).
- Making `displayRounds` include the currently-streaming round even before `streamingMessage.round` is set for a fresh round (if the engine ever emits `run_agent` without pre-populating streaming state). Not currently observed.
