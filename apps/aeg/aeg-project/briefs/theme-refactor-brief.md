# Brief: AEG Studio UI Refactor — Navigation, Projects sub-bar & Docs layout

**For:** Sonnet (Claude Code, interactive session)
**Reason:** Layout and routing refactoring across packages/ui, packages/aeg-core, and apps/aeg; requires precision alignment with Claude Design screenshots.
**Owner:** Dani
**Goal:** Refactor the AEG Studio shell layout to replace the global sidebar with TopBar navigation, add a fixed secondary projects sub-bar, and implement a fixed thinner sidebar with independent scrolling for docs.

**Tier:** 3
**Conforms-to:** D-038 (AEG product)

---

## 1. Context

We need to align the layout of **AEG Studio** (`apps/aeg/web/studio`) with the prototype layouts provided by Claude Design in the screenshots:
* **Screenshot 1 (Projects):** [Screenshot 2026-06-18 at 21.51.23.png](file:///Users/daniboomerang/Desktop/Screenshot%202026-06-18%20at%2021.51.23.png)
* **Screenshot 2 (Docs):** [Screenshot 2026-06-18 at 21.51.41.png](file:///Users/daniboomerang/Desktop/Screenshot%202026-06-18%20at%2021.51.41.png)

### Current Gaps:
1. Currently, the studio uses a global left sidebar (`StudioSidebar`) for all main routes, which is wide and takes up significant screen space.
2. Under `/docs`, the sidebar and content are inside a single scrollable container, causing both the sidebar links and the document content to scroll together.
3. The projects view lacks a quick navigation bar for selecting and highlighting individual projects.

### Target Solution:
1. **Global topbar navigation:** Remove the global `StudioSidebar` aside completely. Move all primary links (`Projects`, `Iterations`, `Dependency graph`, `Docs`) directly to the `TopBar` nav links.
2. **Fixed secondary project bar:** In the `/projects` page tree, display a thin fixed horizontal bar at the top with bullet separators (`·`) and capsule/pill highlights for active projects (yellow/amber background for the active one).
3. **Fixed thinner docs sidebar with independent scrolling:** In the `/docs` page tree, render a thinner doc sidebar (`w-52`) on the left which stays fixed, while the document content on the right scrolls independently.

---

## 2. Technical dependencies

* `@atta/ui` (TopBar component supports `links` list and highlights active matching routes)
* `@atta/aeg-core` (exposes `DocSidebar` component for docs navigation)
* App router layout nesting for `/projects` and `/docs` page trees.

---

## 3. Technical surface map

**In-scope for modification:**
* `apps/aeg/web/studio/src/app/layout.tsx`
* `apps/aeg/web/studio/src/app/components/StudioShell.tsx`
* `apps/aeg/web/studio/src/app/projects/layout.tsx` (create)
* `apps/aeg/web/studio/src/app/projects/ProjectsSubBar.tsx` (create)
* `apps/aeg/web/studio/src/app/docs/layout.tsx`
* `packages/aeg-core/src/docs/components/DocSidebar.tsx`

**Out-of-scope (do NOT modify):**
* Any other app router pages not involved in layout nesting.
* Core engine packages (`@atta/engine`, `@atta/adapter-langgraph`, etc.).

---

## 4. Pre-flight checks

1. Switch to worktree `/Users/daniboomerang/Work/Repositories/Me/attaai/.worktrees/task/aeg-governance-ui-v2/theme`.
2. Confirm you are on branch `task/aeg-governance-ui-v2/theme`.
3. Check `git status` is clean.
4. Run `bun install` inside `apps/aeg/web/studio` to verify lockfile.
5. Boot dev server: `bun run dev` and check that the app runs on `http://localhost:3000`.

---

## 5. Numbered parts with numbered tasks

### Part 1 — Topbar Navigation & StudioShell Simplification
* **Task 1.1:** Edit `apps/aeg/web/studio/src/app/layout.tsx` to supply the following links to the `TopBar` component:
  ```typescript
  const links = [
    { label: 'Projects', href: '/projects' },
    { label: 'Iterations', href: '/iterations' },
    { label: 'Dependency graph', href: '/graph' },
    { label: 'Docs', href: '/docs' }
  ]
  ```
* **Task 1.2:** Edit `apps/aeg/web/studio/src/app/components/StudioShell.tsx` to:
  * Remove the `<aside>` and `StudioSidebar` imports and rendering completely.
  * Remove the global `max-w-3xl px-8 py-8` container and its nested classes.
  * Make `StudioShell` a simple height-locked wrapper that fills the viewport height under the TopBar:
    ```tsx
    export function StudioShell({ children }: { children: ReactNode }) {
      return (
        <div className='flex h-[calc(100dvh-3.5rem)] overflow-hidden flex-col bg-background'>
          {children}
        </div>
      )
    }
    ```

### Part 2 — Projects Secondary Fixed Sub-Bar
* **Task 2.1:** Create `apps/aeg/web/studio/src/app/projects/layout.tsx` to handle the project layout. It must fetch the list of projects from the registry and render the projects sub-bar fixed at the top, with the children scrollable below it:
  ```tsx
  import { readRegistry } from '@/lib/aeg-fs'
  import { ProjectsSubBar } from './ProjectsSubBar'

  export default async function ProjectsLayout({ children }: { children: React.ReactNode }) {
    const projects = await readRegistry()
    return (
      <div className='flex flex-col h-full overflow-hidden'>
        <ProjectsSubBar projects={projects} />
        <div className='flex-1 overflow-y-auto px-8 py-8'>
          <div className='mx-auto max-w-4xl'>{children}</div>
        </div>
      </div>
    )
  }
  ```
* **Task 2.2:** Create `apps/aeg/web/studio/src/app/projects/ProjectsSubBar.tsx` as a Client Component:
  * Parse pathname using `usePathname`.
  * Highlight the active project capsule if the URL points to `/projects/[projectName]`.
  * Highlight style: `bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-semibold px-2.5 py-1 rounded-full`.
  * Separators: Render a muted middle dot `·` between all projects.
  * Bullet colors: Render color indicator dots next to each project name (e.g. `aeg` has amber/yellow, `vada` has green, etc.).

### Part 3 — Docs Independent Scroll Layout & Thinner Sidebar
* **Task 3.1:** Edit `apps/aeg/web/studio/src/app/docs/layout.tsx` to make the sidebar fixed and separate the scroll containers:
  ```tsx
  export default async function DocsLayout({ children }: { children: ReactNode }) {
    const { nav } = await loadAegDocs()

    return (
      <div className='flex h-full overflow-hidden'>
        <aside className='h-full shrink-0 border-r border-border bg-sidebar text-sidebar-foreground overflow-y-auto'>
          <DocSidebarHost nav={nav} />
        </aside>
        <main className='flex-1 overflow-y-auto px-12 py-10'>
          <div className='mx-auto max-w-4xl'>{children}</div>
        </main>
      </div>
    )
  }
  ```
* **Task 3.2:** Modify `packages/aeg-core/src/docs/components/DocSidebar.tsx` to style the sidebar thinner and smaller:
  * Reduce width from `w-56` to `w-52` (`w-52` is standard `13rem`).
  * In the document item menu buttons (e.g. inside `FlatDocItem` and `CollapsibleDocItem`), change typography to `text-xs` or `text-[13px]`, reduce padding/height (`min-h-7 py-1`), and make font tracking tighter.
  * Reduce vertical padding of `SidebarGroup` or margins where appropriate to keep it condensed and data-dense.

---

## 6. Documentation-update list

* `apps/aeg/aeg-project/state.md` — Update active status if phase advanced. (`now.md` is retired — D-057.)
* `aeg-project/changelog.md` — Append details of layout refactor.

---

## 7. Verification

* `bun run typecheck` passes in `apps/aeg/web/studio`.
* `bun run format-and-lint` (or Biome run) checks cleanly.
* `bun run build` compiles without errors.
* `git diff main --stat` verifies only the targeted files are changed.

---

## 8. Test Plan

* [ ] **[principal]** Verify TopBar renders centered links for "Projects", "Iterations", "Dependency graph", and "Docs".
* [ ] **[principal]** Verify `/projects` page renders a fixed sub-bar at the top with bullet list of all projects and matching highlights.
* [ ] **[principal]** Verify `/docs` page renders a fixed left sidebar with independent scroll of the document page on the right.
* [ ] **[principal]** Verify docs sidebar is thinner (`w-52`) and uses smaller text styles.

---

## 9. Stop conditions

* If package type-checking or build fails in `@atta/ui` or `@atta/aeg-core` due to dependency resolution.
* If file paths or registry format in `readRegistry()` do not load properly in projects sub-bar.

---

## 10. Constraints

* **Autonomy:** Do not stop to ask clarifying questions. For any ambiguity not covered by a Section 10 stop condition, choose the most reasonable option consistent with this brief, record the choice in the PR body, and continue. Halt only for the explicit Section 10 stop conditions — and when you halt, record the blocker in the PR body or an Issue comment rather than waiting interactively for input.
* Do not edit any code outside the studio app router, topbar component, and core doc components.

---

## 11. Deliverable

* **PR Title:** `feat(aeg): Refactor Studio layout to TopBar navigation, fixed Projects sub-bar, and fixed thin Docs sidebar`
* **PR Body:** Include this brief, check agent test plan verification, and reference `Closes #TBD`.
