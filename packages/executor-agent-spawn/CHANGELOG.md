# Changelog — `@atta/executor-agent-spawn`

## 0.1.1

### Fixed

- A decision's `maxRevisions` ceiling now ends the run as `exhausted` whichever executor ran the nodes. The leg wrapper (`withAgentLifecycleLeg`) increments `revisionCounts` for every node it runs, built-in or injected, so a caller's executor that returns only `results` is bounded the same way the built-in one is. Before, only the built-in executor counted, and an injected executor's loop never hit its ceiling. A `revisionCounts` value an executor still returns is replaced, never added to.
- A Plan that loops legally no longer fails on LangGraph's default recursion limit of 25. When the caller passes no `recursionLimit`, `startControlledRun` and `resumeControlledRun` derive one from the Plan: its node count times the largest `maxRevisions` plus one, plus the node count, never below 25. A caller-supplied `recursionLimit` still wins.

### Tests

- Every run-guarantee suite (`run-control`, `run-no-replay`, `run-outcome`, `run-conformance`) runs twice, once with the built-in executor and once with an injected executor that returns only `results`.
- A fourteen-step review-loop fixture Flow (`scripts/external-consumer/review-loop.flow.yaml`) runs its green path, both loops, halt and resume, cancellation and exhaustion with an injected executor, in the unit suite and in the packed external-consumer proof.

## 0.1.0

### Added

- `startControlledRun` and `resumeControlledRun` take an optional `executor` (`AgentLifecycleNodeExecutor`, the type `buildAgentSpawnStateGraph` already takes). Supplied, the caller's executor does each node's work in place of the built-in one; omitted, the built-in executor runs exactly as before.
- The run-control guarantees do not depend on which executor runs. The halt boundary, the `node:start` / `node:complete` / `node:failed` events through `config.onEvent`, the `resumed` record on a resumed leg's first node, and a cancelled node read as a halt all come from one leg wrapper that wraps the built-in executor and an injected one alike.
- `NodeExecutionContext` has an optional `signal`. On a leg with a `control`, the leg wrapper sets it to `control.signal`, so an injected executor can cancel its own work when the run is halted. An executor reports cancelled work by throwing `ProcessCancelledError` or `RunHaltedError`; anything else it throws is a `failed` run. A context with no signal stays valid, so existing executors are unchanged.

## 0.0.1

- First packed release: the steps-shaped Plan executor, the run identity and checkpoint read, and the typed start / halt / resume control surface.
