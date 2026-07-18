**For:** Opus 4.8 (coding-agent CLI, interactive session)
**Project:** vinaya
**Tier:** 1

Closes #385

## Summary

Ships the validated forge-write path for the Vinaya CLI.

## Test Plan

- [ ] **[agent]** Run the brief-schema validator against a fixture body.
- [ ] **[principal]** Live-smoke a throwaway PR on the forge.

## Technical surface map

- apps/vinaya/cli/src/commands/pr.ts
- apps/vinaya/cli/src/lib/forge-write.ts

## Documentation-update list

- apps/vinaya/specs/vinaya-spec.md

## Stop conditions

- Any pre-flight failure halts the task.

## Autonomy

Do not stop to ask clarifying questions; choose the most reasonable option and record it.

## Pre-flight

```
git worktree add .worktrees/task/vinaya-cli-v1/5 -b task/vinaya-cli-v1/5 origin/main
```
