/**
 * @file parallel-proof.fixture.ts
 * @description The steps-shaped Flow fixture for
 * `scripts/run-agent-spawn-parallel-proof.ts` — this task's own end-to-end
 * proof that fan-out/join compiles and executes for real: `start`
 * (mechanical) fans out to `branch-a` and `branch-b` (both agent-spawn,
 * independent — neither depends on the other), joined by `finish`
 * (mechanical, `dependsOn: [branch-a, branch-b]`). Sibling to
 * `conditional-proof.fixture.ts` — same discoverability exclusion applies:
 * not a `.yaml` file, not under `packages/agents/vada-deliberation/yamls/`,
 * so `@atta/engine`'s catalog loader never sees it.
 *
 * `start` exists only to give the graph a single `entryNode` — LangGraph
 * wires `'__start__'` to exactly one node, so two independent branches
 * cannot both be graph entry points. `branch-a` omits `dependsOn` (defaults
 * to the immediately preceding step, `start`); `branch-b` declares it
 * explicitly, since its own default would otherwise be `branch-a` — the
 * same explicit-declaration style `@atta/engine`'s own `FAN_OUT_JOIN_YAML`
 * compiler fixture uses.
 *
 * `StepsFlow` (and `AgentStep`/`MechanicalStep`/`AgentRole`) are not
 * re-exported through `@atta/engine`'s `index.ts` — only `compileFlow` and
 * `Plan`/`PlanAgentSpawnNode`/`PlanMechanicalNode` are. This object is
 * therefore typed structurally (no imported `StepsFlow` annotation): passing
 * it to `compileFlow` is still checked against that function's own declared
 * parameter type at the call site, which is what actually matters here.
 * `compileFlow` runs the real `@atta/engine` Flow validator
 * (`validateStepsFlow`) on this fixture, so its `dependsOn` fields must
 * satisfy that validator's own rules — every entry must reference an
 * existing step id, and the resolved graph must be acyclic — the same rules
 * any real flow author is bound by.
 */

/** The two independent agent-spawn roles this fixture declares — bound to real binaries in the runner, never here. */
export const DRAFTER_A_ROLE = 'drafter-a'
export const DRAFTER_B_ROLE = 'drafter-b'

export const START_STEP_ID = 'start'
export const BRANCH_A_STEP_ID = 'branch-a'
export const BRANCH_B_STEP_ID = 'branch-b'
export const FINISH_STEP_ID = 'finish'

/** Trivial, side-effect-free prompts — the point of this fixture is proving the fan-out/join wiring, not exercising a real agent's judgment. */
export const BRANCH_A_PROMPT =
  'Do not read, search, write, or execute anything. Output exactly the literal text BRANCH-A-OK and nothing else.'
export const BRANCH_B_PROMPT =
  'Do not read, search, write, or execute anything. Output exactly the literal text BRANCH-B-OK and nothing else.'

export const parallelProofFlow = {
  schemaVersion: '2.0',
  id: 'agent-spawn-parallel-proof-fixture',
  displayName: 'Fan-out/join end-to-end proof',
  description:
    'Minimal fixture for the engine-parallel-steps tranche: a mechanical start step fans out to two independent agent-spawn steps, joined by a mechanical finish step. Proves real concurrent execution and a real join — not a catalog flow.',
  experimental: true,
  benchmarked: false,
  defaults: {
    // Unused by the agent-lifecycle shape (this shape resolves roles to
    // binaries via the executor's own config, never Plan.agents) — a
    // placeholder satisfying FlowDefaults.model's required string.
    model: 'n/a'
  },
  agents: [{ role: DRAFTER_A_ROLE }, { role: DRAFTER_B_ROLE }],
  steps: [
    {
      id: START_STEP_ID,
      type: 'mechanical',
      action: 'record-start'
    },
    {
      id: BRANCH_A_STEP_ID,
      type: 'agent',
      role: DRAFTER_A_ROLE,
      promptTemplate: BRANCH_A_PROMPT,
      permission: 'plan',
      // Filled in by the runner with a fresh, confined temp directory —
      // this placeholder is never used as-is.
      workingDirectory: '__RUNNER_FILLS_IN_WORKING_DIRECTORY__',
      maxTurns: 3
      // dependsOn omitted: defaults to the immediately preceding step, 'start'.
    },
    {
      id: BRANCH_B_STEP_ID,
      type: 'agent',
      role: DRAFTER_B_ROLE,
      promptTemplate: BRANCH_B_PROMPT,
      permission: 'plan',
      workingDirectory: '__RUNNER_FILLS_IN_WORKING_DIRECTORY__',
      maxTurns: 3,
      // Explicit: this step's own default dependsOn would otherwise be
      // 'branch-a' (the immediately preceding step), not 'start'.
      dependsOn: [START_STEP_ID]
    },
    {
      id: FINISH_STEP_ID,
      type: 'mechanical',
      action: 'record-completion',
      dependsOn: [BRANCH_A_STEP_ID, BRANCH_B_STEP_ID]
    }
  ]
}
