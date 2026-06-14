# AEG Studio

Local, no-auth tool that reads this repo's AEG artifacts off disk + GitHub and renders its governance (projects → iterations → kanban → task detail → dependency graph → docs).

One of two AEG products (the other is **AEG Portal**, future, public). Both share `@atta/aeg-core`. See `apps/aeg/specs/` for the product specs.

## Dev

```bash
bun run dev --filter=@atta/aeg-studio
# or
cd apps/aeg/web/studio && bun run dev
```

Runs at `http://localhost:3005`.

## Status

Wave-1 shell only — top bar + sidebar render with stub data. Real artifact reads + pages arrive in subsequent tasks.
