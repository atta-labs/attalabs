# 2026-06-20 — Refactor AEG Studio navigation, Projects sub-bar, and Docs layout

**Tier:** 3

**Change:**
- Removed global left sidebar (`StudioSidebar`) from the main page layouts.
- Wired primary navigation links (`Projects`, `Iterations`, `Dependency graph`, `Docs`) into the `TopBar`.
- Created fixed `ProjectsSubBar` display at the top of the `/projects` page tree to list and highlight registered projects with active status colors.
- Reworked `DocsLayout` to separate scroll containers, making the left docs sidebar fixed while the document content scrolls independently.
- Thinned the doc sidebar from `w-56` to `w-52` and updated menu buttons to use condensed spacing and `text-xs`/`text-[13px]` font size.

**Why:** Align the AEG Studio layouts with prototype mockups provided in screenshots, moving main navigation to the TopBar and separating scrollable layout containers for independent doc page scrolling and fixed project options.

**Verification:**
- `bun run typecheck` passes in `apps/aeg/web/studio`.
- `bun run format-and-lint` passes in the monorepo.
- `bun run build` compiles successfully.
