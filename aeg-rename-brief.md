# BRIEF — AEG folder restructure + "product"→"project" vocabulary erasure

**For:** a coding agent (Claude Code / Codex) with shell + filesystem access, running in the local checkout of this monorepo.
**Owner:** Principal (Dani).
**Tier:** 3 (cross-cutting layout + governance-vocabulary change).
**Branch:** work **directly on the existing branch `task/aeg-neutralize/1`** — do NOT create a worktree, do NOT branch from main. This brief is folded into the open PR #86. (Exception to the usual worktree-first rule: this targets an existing in-flight branch by explicit instruction.)
**Commit:** **ONE single commit** with ALL changes. The Principal wants exactly one commit so the whole restructure can be reverted with a single `git revert`. Do NOT split into multiple commits.

---

## 0. Pre-flight (do these first, stop on any failure)

1. `git checkout task/aeg-neutralize/1 && git pull` — confirm you are on the branch and up to date with `origin/task/aeg-neutralize/1`.
2. `git status` — working tree must be clean before you start.
3. `git log --oneline -3` — confirm the latest commit message mentions D-040 / decisions.md tightening (that is the current branch head: `6f915d00`).
4. Confirm you are at the **monorepo root** (the dir containing `apps/`, `packages/`, `project-management/`, `turbo.json` or equivalent).

If any check fails, STOP and report — do not improvise.

---

## 1. What this change is (read fully before touching anything)

Two coupled changes to how Agentic Execution Governance (AEG) is laid out and described. **This is docs/structure/config only — do not touch product/app/library source code, tests, or business logic.**

### Change A — split the root `project-management/` into two AEG folders, and rename per-project ones

There is exactly **one AEG model**, and it lives **only at the monorepo root**. Everything else is per-project living *state*. New layout:

```
<repo root>/
  aeg-root/        ← THE MODEL. Exists ONCE, at root only. Constitution, flow, roles, skills, the project registry.
  aeg-project/     ← the ROOT project's living STATE (monorepo-level tasks).
  apps/<x>/aeg-project/      ← each project's living STATE slice (NO model here)
  packages/<y>/aeg-project/  ← if any package has one
```

Concretely, today's root `project-management/` contains BOTH model docs and state docs mixed together. Split them:

- **MODEL → `aeg-root/`** (move these out of `project-management/` into a new top-level `aeg-root/`):
  - `coordination.md`, `state-machine.md`, `process.md`, `aeg-manual-flow.md`
  - `products.md` → **rename file to `projects.md`** (see Change B), lives in `aeg-root/`
  - `iterations/` (the whole dir: `README.md` + any iteration files)
  - `roles/` (the whole dir)
  - `skills/` (the whole dir: `aeg/`, `aeg-roles/`, `brief-authoring/`)
  - `diagrams/` (if present — it's model material)
- **STATE → `aeg-project/`** (move these out of `project-management/` into a new top-level `aeg-project/`):
  - `state.md`, `now.md`, `decisions.md`, `changelog.md`, `lessons.md`, `ratification-queue.md`, `thinking.md` (whichever exist)
- After moving everything, the old root `project-management/` directory must **no longer exist**.

- **Per-project folders:** every `apps/*/project-management/` and `packages/*/project-management/` (discover them — see §2) → rename to `apps/*/aeg-project/` (state only; these never held the model).

**Rule the layout must enforce:** `aeg-root/` (the model) exists ONLY at the repo root. `aeg-project/` (state) is uniform everywhere — once at root, once per project. An agent opening any `aeg-project/` finds state and no model, which forces it to the root `aeg-root/` for the constitution.

### Change B — erase the word "product" from AEG; the unit is a "project"

AEG governs **development**. The unit of work is a **project** — any developable thing in the monorepo (an app, a package, a library, a tool), whether or not it is a customer-facing product. Whether something is a "product" is irrelevant to AEG, so the word "product" must be **erased from all AEG model + state docs** and replaced with "project".

Specifically, across all AEG docs (the moved `aeg-root/**` and `aeg-project/**`, plus the AEG skills):
- `products.md` → `projects.md` (file rename, already noted in Change A).
- The brief field **`Product:` → `Project:`** (and "the Product field" → "the Project field").
- "product registry" → "project registry"; "product backlog" → "project backlog"; "per-product PM/state" → "per-project state"; "multi-product task" → "multi-project task"; "single-product repo" → "single-project repo"; "the product's spec(s)" the Reviewer checks → "the project's spec(s)"; "cross-product" → "cross-project"; etc.
- The `aeg.sh` subcommand **`add-product` → `add-project`** (and any `--path`/registry prose about "the product" → "the project").
- Any other place where "product" denotes the unit-of-work AEG governs → "project".

**Do NOT blanket-replace the literal string "product" everywhere** — that is too blunt. See §4 for the exact exclusions (brand/commercial uses of "product" in `coordination.md`'s instance section, decision-log history, and real product names like Atta/Vāda/Herald must NOT be reworded). Use judgment per the rules in §4, not a global sed of the word "product".

---

## 2. Discover the real tree (don't assume)

Before moving anything, enumerate exactly what exists:

```bash
# every project-management folder anywhere (root + per-project)
find . -type d -name project-management -not -path '*/node_modules/*'

# every file that references the path "project-management" (these all need re-pointing)
grep -rIl 'project-management' . --exclude-dir=node_modules --exclude-dir=.git

# every file that references "products.md"
grep -rIl 'products\.md' . --exclude-dir=node_modules --exclude-dir=.git

# every AEG doc that uses the word product (to review case-by-case per §4)
grep -rIn -i 'product' aeg-root aeg-project 2>/dev/null
# (run the grep again AFTER the move, since paths change)
```

Use `git mv` for every move (preserves history). Use `find … -name project-management` results as the authoritative list of folders to rename — do not hand-type the app list.

---

## 3. Execution order (one commit at the end)

Do all of this, then make ONE commit.

1. **Create the split at root:**
   - `git mv project-management aeg-root` (moves everything first), then `mkdir aeg-project` and `git mv` the **state** files out of `aeg-root/` into `aeg-project/` (state list in Change A). Net result: `aeg-root/` holds model only; `aeg-project/` holds root state; no `project-management/` remains.
   - `git mv aeg-root/products.md aeg-root/projects.md`.
2. **Rename per-project folders:** for each `apps/*/project-management` (and `packages/*` if any) from the `find` in §2: `git mv apps/<x>/project-management apps/<x>/aeg-project`.
3. **Re-point every path reference** found by the `grep -rIl 'project-management'` in §2:
   - `project-management/<model-file>` → `aeg-root/<model-file>` (for the model docs/dirs: coordination, state-machine, process, aeg-manual-flow, iterations/, roles/, skills/, diagrams/, projects.md)
   - `project-management/<state-file>` → `aeg-project/<state-file>` (state.md, now.md, decisions.md, changelog.md, lessons.md, ratification-queue.md, thinking.md)
   - `apps/*/project-management/` → `apps/*/aeg-project/`
   - This includes references in: all `aeg-root/**` and `aeg-project/**` docs, the AEG skills (now at `aeg-root/skills/`), root config (`docs-index.md`, any `package.json`/`turbo.json`/scripts that name the path), `.github/workflows/*` (the verify-docs workflow), CLAUDE.md / AGENTS.md / README.md if they reference it, and `.claude/` configs that reference the path.
4. **Apply the product→project vocabulary** per Change B and the §4 rules across `aeg-root/**`, `aeg-project/**`, and the skills. Rename `add-product`→`add-project` in `aeg-manual-flow.md` and anywhere the scaffolder is described.
5. **Add the root-orientation rule** (new prose, see §5) to `aeg-root/coordination.md` and `aeg-root/state-machine.md`.
6. **Append decision D-041** to `aeg-project/decisions.md` (see §6).
7. **Regenerate the docs index if a generator exists:** if `package.json` has a `docs:index` script, run it (`bun docs:index` or the documented command) so `docs-index.md` reflects the new paths. If it errors or doesn't exist, hand-edit `docs-index.md` path references instead and note it in the report.
8. **Verify** (see §7), then **one commit** (see §8).

---

## 4. The product→project rules (exact inclusions and exclusions)

**REPLACE "product"→"project" when it denotes the AEG unit-of-work / routing / registry.** Examples that MUST change:
- `Product:` field → `Project:`; "the Product field on a task" → "the Project field on a task"
- "the product registry", "products.md", "register a product", "product backlog", "per-product PM", "multi-product task", "single-product repo", "cross-product", "every listed product's state.md"
- "AEG does not define what a product really is; the developer does" → "...what a project really is..."
- `add-product` → `add-project`

**DO NOT change these (leave "product" / the real names intact):**
- **`aeg-root/coordination.md` instance section** — the brand/architecture content (AttaLabs, Atta, Vāda, Vitakka, Sati, Herald, Cetana, the "Products" table describing the real commercial products of this repo). These are genuine commercial products and this is repo-instance content, not the AEG model. You MAY relabel the table header from "Products" to "Projects" ONLY if it reads naturally; if unsure, leave it and note it in the report. Do not reword the brand prose.
- **Decision-log history** (`aeg-project/decisions.md`) — existing entries D-001…D-040 are append-only and MUST NOT be edited for vocabulary (they are historical record). Only ADD D-041. (One allowed exception: none — leave all prior entries byte-for-byte except where a path reference to `project-management/` appears; even then, prefer leaving historical entries unchanged and let D-041 note the rename. **Do not rewrite history.** If a prior entry references `project-management/`, leave it — it was true when written.)
- Real product names anywhere: Atta, Vāda, Vitakka, Sati, Herald, Cetana, AttaLabs — never reword.
- The word "product" inside `apps/*/specs/**` business/spec content — **out of scope; do not touch app specs at all.**

**Scope guard:** only touch `aeg-root/**`, `aeg-project/**`, `apps/*/aeg-project/**` (the renamed state folders), and the path-reference sites found by grep (config/workflow/index/root-md). **Do NOT touch** any `apps/*/specs/**`, any source code, any tests, any `packages/*/src`, the Herald/Vāda/etc app code. If a path reference lives inside app source (unlikely), re-point only that string, change nothing else in the file.

---

## 5. The root-orientation rule (new prose to add)

Add a short, clearly-headed subsection to BOTH `aeg-root/coordination.md` (near the session-start / reading-order area) and `aeg-root/state-machine.md` (near Section 1). Wording (adapt headers to each doc's style, keep the substance exact):

> **One AEG model, at the root. Always orient from there.**
> There is exactly one AEG model in this monorepo, at the repo-root `aeg-root/` (constitution, flow, roles, skills, the project registry `projects.md`). It exists nowhere else. **Any agent, executing any task for any project — an app, a package, a library, the monorepo itself — orients from `aeg-root/` first:** it reads the constitution, the role doc, the active iteration, and the decision log there. It never expects a per-project copy of the model.
> Living **state** is held in `aeg-project/` folders: one at the repo root (for monorepo-level tasks) and one per project (`apps/<x>/aeg-project/`, `packages/<y>/aeg-project/`). A task updates the root `aeg-project/decisions.md` + `changelog.md` (governance is global) **plus** the `aeg-project/` slice of each project it touches (one for a single-project task, several for a cross-project task — resolve which via `aeg-root/projects.md`). An `aeg-project/` folder holds state only — never the model — which is what forces every agent back to `aeg-root/` for the rules.

Also update the reading-order / session-start lists in `coordination.md` so the paths point at `aeg-root/...` (model) and `aeg-project/...` (state) correctly.

---

## 6. Decision D-041 (append to `aeg-project/decisions.md`)

Append this new entry at the end (after D-040), append-only, do not edit prior entries:

```markdown
## D-041 — AEG layout: `aeg-root/` (model) + `aeg-project/` (state); "product"→"project"; orient from root

**Date:** 2026-06-10
**Status:** ACTIVE
**Type:** 1
**Lock:** NO
**Supersedes:** (naming portions of D-024, D-037, D-038 — the `project-management/` folder name and the "product" unit-vocabulary; the substantive decisions in those entries stand)
**Authored by:** TL (AEG self-containment + naming pass, June 10, 2026)
**Ratified by:** Principal (in-session)

**Context:** `project-management/` is a generic name an agent pattern-matches to "miscellaneous notes," obscuring that the folder is load-bearing machinery; and it mixed the AEG *model* (which exists once) with *living state* (which is per-unit). Separately, "product" implied every governed unit is customer-facing, but AEG governs *development* — the unit is a developable thing (app, package, library), most of which are not products.

**Decision:**
1. Root `project-management/` splits into two top-level folders: **`aeg-root/`** = the model (constitution, flow, roles, skills, the registry `projects.md`), existing **once, at the repo root only**; and **`aeg-project/`** = the root unit's living state (`state.md`, `now.md`, `decisions.md`, `changelog.md`, `lessons.md`, `ratification-queue.md`).
2. Every per-unit `apps/*/project-management/` (and any `packages/*/`) → **`apps/*/aeg-project/`** — state only, never the model.
3. **"Product" is erased from AEG; the unit is a "project."** `products.md`→`projects.md`; the `Product:` brief field→`Project:`; `aeg.sh add-product`→`add-project`; all "per-product/multi-product/cross-product/product registry/product backlog" → project equivalents. Real commercial product names (Atta, Vāda, Herald, …) and the brand/instance content in `coordination.md` are unaffected — those are genuine products and repo-instance content, not the AEG model.
4. **Orientation rule:** any agent, any task, any project orients from the root `aeg-root/` (the only model); it updates the root `aeg-project/` (global governance: decisions, changelog) plus each touched project's `aeg-project/` slice. An `aeg-project/` folder holds state only, which forces every agent to `aeg-root/` for the model.

**Alternatives rejected:**
- Keep `project-management/`: rejected — generic, and it conflates model with state.
- Name the model folder `aeg/` (bare): rejected — opaque; `aeg-root/` says "the root of the AEG system," and the `aeg-` prefix ties it to `aeg-project/`.
- Keep "product" as the unit: rejected — AEG governs development, not commerce; most governed units are not products.
- Move the model into each unit: rejected — the model exists once; per-unit folders hold state only, which is what makes "orient from root" physically true.

**Consequences:**
- Root `project-management/` no longer exists; `aeg-root/` + `aeg-project/` replace it; per-unit folders renamed to `aeg-project/`.
- `aeg.sh`: `init` scaffolds root `aeg-root/` + `aeg-project/`; `add-project` scaffolds `apps/<x>/aeg-project/`.
- Orientation rule added to `coordination.md` + `state-machine.md`.
- `docs-index.md` regenerated; all path references re-pointed.
- Part of PR #86, Tier 3, docs/structure only. One commit (revertible).
- Reversible (Type 1 for blast radius, not irreversibility).
```

---

## 7. Verification before committing (paste output in the report)

- `find . -type d -name project-management -not -path '*/node_modules/*'` → **must return nothing** (no `project-management/` anywhere).
- `test -d aeg-root && test -d aeg-project && echo OK` → OK; `aeg-root/skills/aeg/SKILL.md` and `aeg-root/projects.md` exist.
- `grep -rIn 'project-management' . --exclude-dir=node_modules --exclude-dir=.git` → review every remaining hit. Acceptable ONLY if inside a historical decision-log entry intentionally left unchanged; otherwise re-point it. Report any remaining hits and why.
- `grep -rIn 'products\.md\|add-product\|Product:' aeg-root aeg-project` → should be empty (all → projects.md / add-project / Project:), except historical decision entries.
- If a typecheck/lint/build touches these paths (e.g. a script imports `project-management/...`), run the repo's typecheck and the `docs:index` script; paste results. (Docs-only change should not break a build, but verify the index generator and any path-consuming script.)
- `git status` and `git diff --stat` — review that ONLY expected files changed (AEG folders, path refs, config/workflow/index, the new D-041). No app source, no specs, no tests.

If any verification reveals app-source or spec changes you didn't intend, STOP and report — do not commit.

---

## 8. Commit (exactly one)

Stage everything and make a SINGLE commit:

```bash
git add -A
git commit -m "Restructure AEG: project-management/ → aeg-root/ (model) + aeg-project/ (state); erase product→project; orient-from-root rule + D-041"
git push origin task/aeg-neutralize/1
```

Do NOT open or merge anything — the change rides the existing PR #86. Do NOT create additional commits. After pushing, report:
- the single commit SHA,
- the `find`/`grep` verification outputs,
- `git diff --stat` against the pre-change head (`6f915d00`),
- anything you left unchanged on purpose (e.g. historical decision entries, the coordination instance table) and why,
- any path-consuming script or workflow you re-pointed.

---

## Stop conditions
- Pre-flight fails (wrong branch, dirty tree). 
- The `find`/`grep` discovery reveals a structure that doesn't match this brief (e.g. a `packages/*/project-management` you should handle) — handle it the same way (state-only → `aeg-project/`) but note it; if it's ambiguous, STOP and ask.
- You'd need to touch app source, tests, or `apps/*/specs/**` to complete a re-point — STOP and report; do not edit those.
- Any destructive action beyond `git mv` / file edits (no force-push, no history rewrite, no deleting non-AEG files).
- The docs:index generator errors — hand-edit `docs-index.md` instead and note it; don't fight the tool.

## Out of scope (do not do)
- No app/library/package source, tests, or business logic.
- No `apps/*/specs/**` edits.
- No rewriting of historical decision-log entries (append D-041 only).
- No new worktree, no new branch, no second commit, no merge.
- No building `aeg.sh` itself or the generate-skills step (only rename its described subcommand in the docs).
