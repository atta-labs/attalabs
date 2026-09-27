/**
 * @file graph-state.ts
 * @description This package's own LangGraph state annotation. Declared from
 * scratch rather than extended from `packages/adapter-langgraph`'s
 * `VadaGraphState` — that state is shaped for rounds-shaped Plans (transcript,
 * tool decisions, revision loops keyed by round). This state carries only
 * what an agent-lifecycle Plan's executor needs: a per-run identifier, each
 * node's resumable session id, and a per-node revision counter.
 */

import { Annotation } from '@langchain/langgraph'
import type { RunOutcomeRecord, StepNodeResult } from './types'

/**
 * LangGraph state for executing a steps-shaped Plan.
 *
 * - `runId`: set once at graph start; correlates every event this run
 *   produces (engine-agent-spawn-v1 task 6 reads this).
 * - `results`: merged, keyed by node id — each node writes its own key, so
 *   parallel steps (a future shape) never clobber each other. The value is a
 *   union discriminated on `kind`: agent-spawn nodes record their event
 *   stream and session, mechanical nodes their exit code and output. Adding
 *   the second node kind widened this field's value type and left its reducer
 *   untouched — keyed merge is already the right one for per-node writes.
 * - `sessions`: merged, keyed by node id — the resumable session id a later
 *   step's `resume` field looks up. Only agent-spawn nodes ever write here;
 *   a mechanical node has no session to resume.
 * - `revisionCounts`: merged, keyed by node id — how many times that node's
 *   position has executed (1 on first run; a later retry/resume increments
 *   it). Not a rounds-style audit-revision counter — this shape has none.
 * - `outcome`: why this run is not executing, in the typed vocabulary
 *   `RunOutcomeRecord` names. A channel rather than a table beside the
 *   checkpointer so the reason travels with the state it describes and cannot
 *   drift from it. Its reducer is last-write-wins with two guards, and both are
 *   load-bearing — see `mergeOutcome`.
 */
/**
 * Merges an `outcome` write into the recorded one.
 *
 * Two guards, each closing a real way the recorded reason could become wrong:
 *
 * - **A write carrying nothing leaves the reason standing.** Every node that is
 *   not a recorder returns no `outcome` key at all, and a plain last-write-wins
 *   reducer would read those as a clearing write.
 * - **`exhausted` is never replaced.** It is a terminal reason, and the only other
 *   in-graph writer is the node executor's `resumed` marker. Those two can land in
 *   the same superstep — a resumed leg whose pending set holds an exhaustion
 *   recorder alongside a Plan node — and which one survived would then depend on
 *   LangGraph's task-application order, which nothing documents. Node insertion
 *   order happens to favour the recorder today; if it ever reversed, the ceiling
 *   would be erased from the store and the run would read as `resumed` and then,
 *   once the leg finished, as `completed` — the silent success the whole outcome
 *   vocabulary exists to prevent. Precedence here removes the dependence on
 *   ordering rather than relying on it.
 */
export function mergeOutcome(
  current: RunOutcomeRecord | undefined,
  update: RunOutcomeRecord | undefined
): RunOutcomeRecord | undefined {
  if (update === undefined) return current
  if (current?.reason === 'exhausted') return current
  return update
}

export const AgentSpawnGraphState = Annotation.Root({
  runId: Annotation<string>(),
  results: Annotation<Record<string, StepNodeResult>>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({})
  }),
  sessions: Annotation<Record<string, string>>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({})
  }),
  revisionCounts: Annotation<Record<string, number>>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({})
  }),
  outcome: Annotation<RunOutcomeRecord | undefined>({
    reducer: mergeOutcome,
    default: () => undefined
  })
})

/** Runtime type of the state object passed between this graph's nodes. */
export type AgentSpawnGraphStateValue = typeof AgentSpawnGraphState.State
