/**
 * @file agent-spawn-proof.fixture.ts
 * @description The steps-shaped Flow fixture for `scripts/run-agent-spawn-proof.ts` —
 * this tranche's end-to-end proof that a Flow compiles and executes for real: one
 * `agent-spawn` step (a real `claude -p` process, no vendor SDK, no
 * `*_API_KEY`) followed by one `mechanical` step (a real `echo`, no model
 * turn). Deliberately not a `.yaml` file and not under
 * `packages/agents/vada-deliberation/yamls/` — `@atta/engine`'s
 * `listPublicSpecs`/catalog loader only ever globs that one directory, so
 * this fixture is structurally invisible to flow auto-discovery. See
 * `.claude/skills/atta-engine/SKILL.md` for that catalog boundary.
 *
 * `StepsFlow` (and `AgentStep`/`MechanicalStep`/`AgentRole`) are not
 * re-exported through `@atta/engine`'s `index.ts` — only `compileFlow` and
 * `Plan`/`PlanAgentSpawnNode`/`PlanMechanicalNode` are. This object is
 * therefore typed structurally (no imported `StepsFlow` annotation): passing
 * it to `compileFlow` is still checked against that function's own declared
 * parameter type at the call site, which is what actually matters here.
 */

/** The role every agent-spawn step in this fixture declares — bound to a real binary in `scripts/run-agent-spawn-proof.ts`, never here. */
export const PROVER_ROLE = 'prover'

export const AGENT_SPAWN_STEP_ID = 'spawn-real-agent'
export const MECHANICAL_STEP_ID = 'record-mechanical-step'

/**
 * The prompt the real spawned process receives on stdin. Deliberately
 * refuses every tool: the point of this node is proving a real process
 * spawns, authenticates and replies — not that it can act on the repo.
 */
export const AGENT_SPAWN_PROMPT =
  'Do not read, search, write, or execute anything. Output exactly the literal text PROOF-OK and nothing else.'

export const agentSpawnProofFlow = {
  schemaVersion: '2.0',
  id: 'agent-spawn-proof-fixture',
  displayName: 'Agent-spawn end-to-end proof',
  description:
    'Minimal fixture for the engine-agent-spawn tranche: one agent-spawn step, one mechanical step. Proves compileFlow + the executor compose against a real spawned process — not a catalog flow.',
  experimental: true,
  benchmarked: false,
  defaults: {
    // Unused by the agent-lifecycle shape (this shape resolves roles to
    // binaries via the executor's own config, never Plan.agents) — a
    // placeholder satisfying FlowDefaults.model's required string.
    model: 'n/a'
  },
  agents: [{ role: PROVER_ROLE }],
  steps: [
    {
      id: AGENT_SPAWN_STEP_ID,
      type: 'agent',
      role: PROVER_ROLE,
      promptTemplate: AGENT_SPAWN_PROMPT,
      permission: 'plan',
      // Filled in by the runner with a fresh, confined temp directory —
      // this placeholder is never used as-is.
      workingDirectory: '__RUNNER_FILLS_IN_WORKING_DIRECTORY__',
      maxTurns: 3
    },
    {
      id: MECHANICAL_STEP_ID,
      type: 'mechanical',
      action: 'record-completion'
    }
  ]
}
