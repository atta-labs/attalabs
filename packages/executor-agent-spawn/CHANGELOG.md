# Changelog — `@atta/executor-agent-spawn`

## 0.1.0

### Added

- `startControlledRun` and `resumeControlledRun` take an optional `executor` (`AgentLifecycleNodeExecutor`, the type `buildAgentSpawnStateGraph` already takes). Supplied, the caller's executor does each node's work in place of the built-in one; omitted, the built-in executor runs exactly as before.
- The run-control guarantees do not depend on which executor runs. The halt boundary, the `node:start` / `node:complete` / `node:failed` events through `config.onEvent`, the `resumed` record on a resumed leg's first node, and a cancelled node read as a halt all come from one leg wrapper that wraps the built-in executor and an injected one alike.
- `NodeExecutionContext` has an optional `signal`. On a leg with a `control`, the leg wrapper sets it to `control.signal`, so an injected executor can cancel its own work when the run is halted. An executor reports cancelled work by throwing `ProcessCancelledError` or `RunHaltedError`; anything else it throws is a `failed` run. A context with no signal stays valid, so existing executors are unchanged.

## 0.0.1

- First packed release: the steps-shaped Plan executor, the run identity and checkpoint read, and the typed start / halt / resume control surface.
