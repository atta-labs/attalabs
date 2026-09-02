/**
 * @file conditional-proof.fixture.ts
 * @description The steps-shaped Flow fixture for
 * `scripts/run-agent-spawn-conditional-proof.ts` — this task's own
 * end-to-end proof that a step's declared `decision` compiles and routes
 * for real: `draft` (agent-spawn) → `check` (agent-spawn, resumes `draft`,
 * declares a `decision` examining `draft`) → either back to `draft` (a real
 * LangGraph cycle, session-threaded through `resume` on each iteration) or
 * forward to `finish` (mechanical). Sibling to `agent-spawn-proof.fixture.ts`
 * — same discoverability exclusion applies: not a `.yaml` file, not under
 * `packages/agents/vada-deliberation/yamls/`, so `@atta/engine`'s catalog
 * loader never sees it.
 *
 * `StepsFlow` (and `AgentStep`/`MechanicalStep`/`AgentRole`) are not
 * re-exported through `@atta/engine`'s `index.ts` — only `compileFlow` and
 * `Plan`/`PlanAgentSpawnNode`/`PlanMechanicalNode` are. This object is
 * therefore typed structurally (no imported `StepsFlow` annotation): passing
 * it to `compileFlow` is still checked against that function's own declared
 * parameter type at the call site, which is what actually matters here.
 * `compileFlow` runs the real `@atta/engine` Flow validator
 * (`validateStepsFlow`) on this fixture, so its `decision` fields must
 * satisfy that validator's own rules — `examine` and `ifTrue` strictly
 * prior to the declaring step, `ifFalse` merely required to exist — the
 * same rules any real flow author is bound by.
 */

/** The two agent-spawn roles this fixture declares — bound to real binaries in the runner, never here. */
export const DRAFTER_ROLE = 'drafter'
export const CHECKER_ROLE = 'checker'

export const DRAFT_STEP_ID = 'draft'
export const CHECK_STEP_ID = 'check'
export const FINISH_STEP_ID = 'finish'

/** Trivial, side-effect-free prompts — the point of this fixture is proving the routing wiring, not exercising a real agent's judgment. */
export const DRAFT_PROMPT =
  'Do not read, search, write, or execute anything. Output exactly the literal text DRAFT-OK and nothing else.'
export const CHECK_PROMPT =
  'Do not read, search, write, or execute anything. Output exactly the literal text CHECK-OK and nothing else.'

export const conditionalProofFlow = {
  schemaVersion: '2.0',
  id: 'agent-spawn-conditional-proof-fixture',
  displayName: 'Conditional-routing end-to-end proof',
  description:
    "Minimal fixture for the engine-conditional-edges tranche: an agent-spawn step whose declared decision, examining a prior step's result, routes back to that prior step exactly once (a real LangGraph cycle, real session resume) before continuing to a mechanical step. Not a catalog flow.",
  experimental: true,
  benchmarked: false,
  defaults: {
    // Unused by the agent-lifecycle shape (this shape resolves roles to
    // binaries via the executor's own config, never Plan.agents) — a
    // placeholder satisfying FlowDefaults.model's required string.
    model: 'n/a'
  },
  agents: [{ role: DRAFTER_ROLE }, { role: CHECKER_ROLE }],
  steps: [
    {
      id: DRAFT_STEP_ID,
      type: 'agent',
      role: DRAFTER_ROLE,
      promptTemplate: DRAFT_PROMPT,
      permission: 'plan',
      // Filled in by the runner with a fresh, confined temp directory —
      // this placeholder is never used as-is.
      workingDirectory: '__RUNNER_FILLS_IN_WORKING_DIRECTORY__',
      maxTurns: 3
    },
    {
      id: CHECK_STEP_ID,
      type: 'agent',
      role: CHECKER_ROLE,
      promptTemplate: CHECK_PROMPT,
      permission: 'plan',
      workingDirectory: '__RUNNER_FILLS_IN_WORKING_DIRECTORY__',
      maxTurns: 3,
      resume: DRAFT_STEP_ID,
      decision: {
        examine: DRAFT_STEP_ID,
        ifTrue: DRAFT_STEP_ID,
        ifFalse: FINISH_STEP_ID,
        maxRevisions: 2
      }
    },
    {
      id: FINISH_STEP_ID,
      type: 'mechanical',
      action: 'record-completion'
    }
  ]
}
