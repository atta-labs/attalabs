# June 17, 2026 — Main consistency sync

**Tier:** 0 | **Type:** 1 (changes what the AEG Studio shows + the model's iteration lifecycle state)

## Summary

Both AEG iterations (herald-onto-engine and aeg-ui-v1) are complete per the forge — all PRs merged. Archived completed iteration and synced all AEG state docs to reflect current reality so downstream agents and the AEG Studio show accurate iteration status.

## Changes

- Herald-onto-engine iteration: added `Lifecycle: complete` marker, moved file to `iterations/completed/`
- AEG-UI-v1 iteration: removed `Lifecycle: active`, added status note (9 of 10 tasks merged), stripped Status: MERGED annotations, fixed repo reference, repaired skill references
- Updated `aeg-project/now.md` to reflect in-flight work (PR #132 Herald audit fix), next 3 things, and current iteration status
- Updated `aeg-project/state.md` with: current date, active iterations summary, Herald Phase 3 integration note, recently shipped section
- Marked PR #49 (D-033 docs cleanup) as RESOLVED in ratification-queue.md
- Made brief-authoring skill permission-prompt guidance tool-agnostic

## Studio verification

After merge: boot AEG Studio locally (`bun run dev --filter=@atta/aeg-studio`) and confirm:
- herald-onto-engine no longer shows as "active" in the sidebar
- aeg-ui-v1 still shows (incomplete, task 9-view unbuilt)
