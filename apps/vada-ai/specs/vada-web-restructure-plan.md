# Vāda Web Restructure — Plan

**Author:** Claude (Atta ecosystem — Critic role)
**Date:** April 30, 2026
**Status:** Draft. Captured during planning conversation; will be refined as work proceeds.
**Audience:** Implementers (Sonnet briefs draw from this), reviewers, and Dani (Principal).
**Companion docs:** `apps/vada-ai/specs/vada-teams-catalog/00-overview.md` (catalog framing), `apps/vada-ai/specs/vada-reviewers-spec.md` (next product), `apps/vada-ai/specs/vada-state.md` (current implementation state).

---

## Why this document exists

The Vāda web app was built when "Brokered mode" and "Autonomous mode" were live architectural concepts. With those concepts retired (April 30, 2026), the web's structure no longer matches the framing. Two separate route trees (`/autonomous/*` and `/brokered/*`) imply a duality the product no longer has.

The new framing is **Vāda Teams: a catalog of YAML team specs compiled by the Atta engine.** One product surface. Multiple teams, browsable and selectable. No modes.

This document captures what changes, what stays, what defers. It is the input to the structural restructure brief and the content-work briefs that follow it.

This is not a tactical implementation plan. It is the architectural shape. Tactical sequencing is in `atta-plan.md`.

---

## Scope

This plan covers:

- **Vāda web app** (`apps/vada-ai/web`, deployed at `vada.attalabs.dev`)
- **Atta hub** (`apps/atta-ai/web`, deployed at `attalabs.dev`)

It does NOT cover:

- The Vāda MCP server itself (`apps/vada-ai/mcp-server`) — that's product code, not web
- Herald, Vitakka, Sati, or Cetana web surfaces (separate work, no overlap)
- The React Flow YAML visualizer module (built in parallel by another agent; this plan consumes it when ready)

---

## Atta hub — top-level structure

Three sections. MCP page lives in Vāda, not here (each app surfaces its own MCP).

### 1. Vāda Teams (link out)

Brief explanation of what Vāda Teams is, who it's for, and what it does. Points to `vada.attalabs.dev`.

Content shape: short marketing-style page (~1 paragraph hero + 3-4 cards explaining catalog, BYOK, vendor diversity). External CTA: "Try Vāda Teams →" linking to vada.attalabs.dev.

### 2. Atta Engine

Explains the engine that compiles YAMLs into runnable Plans. Anchored by the React Flow YAML visualizer module (built in parallel).

Content shape:
- What the engine does (~2 paragraphs)
- Live-compiled flow diagrams for each YAML in the catalog (consumes the visualizer module)
- Architecture overview (Solo / Rounds / Custom / Brokered workflow types)
- Optional: link to engine future capabilities doc

When the visualizer module is ready, click a YAML → see its compiled DAG → understand the engine. That's a much better engine explanation than prose alone.

### 3. Ecosystem diagram

Visual showing all Atta products and their state. Today:

- **Vāda** — live (link to vada.attalabs.dev)
- **Vitakka** — concept (paused)
- **Sati** — concept (memory layer)
- **Cetana** — future (deliberation-guided execution)
- **Atta Labs** — concept (developer/researcher tooling)
- **Herald** — pluggable MCP tool (not a core product)

Diagram shows what's built, what's in progress, what's future. Honest about state.

---

## Vāda web — top-level structure

Seven pages. (`/autonomous/*` and `/brokered/*` route trees both go away.)

### 1. Home (`/`)

The current `(main)/autonomous/page.tsx` — the animated canvas hero with "Vāda" wordmark, "Deliberation Engine" subtitle, "The room outperforms the individual" tagline, particle animation — is **promoted to root**.

The current chooser at `(main)/page.tsx` is deleted. Users no longer pick autonomous-vs-brokered before doing anything; they just enter the app.

**Two changes to the existing autonomous home content:**

- **Subtitle:** "Deliberation Engine" → "Deliberation Teams"
- **Tagline:** "The room outperforms the individual" — keep for now, iterate later

Everything else (canvas animation, "Vāda" wordmark, "AN ATTĀ PRODUCT" footer, the particle / room visual) survives unchanged. The room visual fits *better* with the catalog framing — it always was the deliberation team.

**Hero CTAs:**

- "Deliberate" → routes to `/deliberate`
- "Learn More" → routes to... TBD. Candidates: `/trust`, `/teams`, an about page. Decide during structural implementation.

### 2. Deliberate (`/deliberate`)

The catalog picker + brief flow. User sees all published YAMLs, picks one, writes a brief, dispatches.

Migrates from `(main)/autonomous/deliberate/`. The existing flow is the right shape; needs to be made catalog-driven (show all 7 YAMLs, soon 9 with Vāda Reviewers) instead of autonomous-mode-specific.

**This page is the primary user surface for the web product.** MCP path (Caller Claude in Cursor / Claude Desktop / etc.) is the other primary surface.

### 3. Deliberation (`/deliberation`)

The in-flight session viewer. Shows the deliberation as it runs (SSE streaming, transcript unfolds).

Migrates from `(main)/autonomous/deliberation/`. **Critical product surface, stays.** Path renames but functionality preserved.

### 4. Sessions (`/sessions`)

Unified history of all deliberations. Replaces `(main)/autonomous/sessions/` AND `(main)/brokered/consultations/` — both merge into one timeline.

Filterable by team (which YAML was used), date, status. Per-session detail view shows: brief, team used, individual reviewer responses, synthesis (if present), cost, latency, share button.

**Migration consideration:** the two existing source pages may have different schemas / different DB queries. Audit both before migration; consolidate carefully.

### 5. Teams (`/teams`)

Catalog browsing page. Shows all published YAMLs with descriptions, vendors used, agents involved, when to use each, cost per run, expected latency. Click a team → detail page with React Flow visualization of the compiled DAG.

**Built by separate agent in parallel work.** Out of scope for this restructure — the structural brief just creates the empty `/teams` route and lets the other agent populate it. Zero conflict.

### 6. Trust Vāda (`/trust`)

Privacy + BYOK + empirical evidence. Migrates from `(main)/autonomous/trust/`. Content at `content/trust/index.md` — exists, needs rewriting.

**Pattern:** existing static single-document MDX (per Haiku's diagnostic). No infrastructure changes; content rewrite only.

**Content rewrite covers:**

- BYOK architecture (with honest disclosure of current gaps from `vada-byok-gap-report.md`)
- What Vāda stores (brief contents, reviewer responses, session metadata, user_id, timestamps)
- What Vāda does NOT store (API keys after request, conversation context outside the brief)
- Where data lives (Neon Postgres), retention policy, deletion policy
- Cross-user isolation (sessions scoped to clerk_id)
- Auditability (link to session detail pages, exportable transcripts)
- Empirical evidence the deliberation works (link to V2 step analyses or summarize)

**Content drafted by Claude + Dani, iteratively.** This is the highest-stakes content piece. Privacy claims must match reality.

### 7. MCP (`/mcp`)

Documentation of the MCP server: tool specs, install instructions per client (Claude Desktop / Cursor / Claude Code), example invocations.

Migrates from `(main)/brokered/mcp/`. Existing content path TBD — Haiku found `apps/vada-ai/web/content/` only has `science/` and `trust/` so MCP page will need new content directory. **Pattern:** static single-document MDX, possibly grows to indexed multi-document if we add per-client install guides as separate sections.

**Content drawn from:**

- `apps/vada-ai/specs/vada-teams-catalog/02-mcp-tool-interface.md` (tool description, input schema, return schema, examples — already updated in docs cleanup)
- New install instruction sections per client

**Content drafted by Claude + Dani.**

### 8. Settings (`/settings`)

Unchanged. Already at `(main)/settings/`. Three tabs (Account / Teams / Agent Style) per `atta-current-state.md`.

---

## What's hidden / removed

- **Science page** (`(main)/autonomous/science/*`) — content was about deliberation methodology (sparring, war room, etc.); now superseded by Teams page detail and Trust page empirical evidence. Hide content, keep MDX infrastructure (used by other pages).
- **Chooser homepage** (`(main)/page.tsx` current) — replaced by promoted autonomous home
- **`/autonomous/*` route tree** — children migrate up; directory removed
- **`/brokered/*` route tree** — children migrate up or merge; directory removed
- **`/brokered/bench` and `/autonomous/bench`** — consolidate into single `/bench` (catalog-team-aware)
- **`/brokered/consultations`** — merges into `/sessions`

---

## What stays the same

- **Auth flow** (`/sign-in`, `/sign-up`) — unchanged
- **API routes** (`/api/*`) — backend stays as-is for this restructure; future cleanup separate
- **Settings page** — unchanged
- **MDX rendering infrastructure** — `next-mdx-remote/rsc`, `MDXComponents.tsx`, `mdx-preprocess.ts` all reused as-is
- **Branding** (logos, favicons via `@atta/cms` Sanity) — unchanged
- **Auth integration** (Clerk via `@atta/auth`) — unchanged
- **Theme system** (`@atta/ui` tokens) — unchanged

---

## Component scoping rules

Per Dani's working pattern:

- **Page-local components:** `components/` folder inside each page directory. Default location.
- **Shared components:** `apps/vada-ai/web/src/components/` only when used by multiple pages.

The structural restructure must respect this. Components currently scoped to `autonomous/components/` or `brokered/components/` need triage:

- Used only on the page that's migrating → move with the page, keep page-local
- Used by multiple pages → hoist to `web/src/components/`
- Mode-aware logic (assumed autonomous-vs-brokered context) → flag for refactor; remove the assumption

This triage is a discovery phase before structural moves. The structural brief includes it.

---

## Discovery phase (before structural moves)

The structural restructure brief must include an explicit discovery phase before any file moves. The discovery audits:

**1. Mode-aware logic in components.** What components assume autonomous-vs-brokered context? Examples to look for:
- Deliberate button — does it know which mode it's calling?
- Sessions page — does it filter by mode?
- Bench dashboard — autonomous-specific or brokered-specific data?
- Any component reading session state — does it have a `mode: 'autonomous' | 'brokered'` field?

**2. Component reuse across `autonomous/components/` and `brokered/components/`.** Are there duplicates? Near-duplicates? Which can hoist to `web/src/components/`?

**3. Route handlers in `app/api/*`.** Any that are mode-specific? Need to preserve URLs that the MCP server or external clients depend on.

**4. Database queries.** Sessions page queries `mcp_sessions`; consultations page queries the same table or different? If different, plan the merge carefully.

Sonnet's discovery report → Dani reviews → structural brief refines based on findings → execution.

---

## Sequencing

Web restructure runs **concurrent with Reviewers v1 implementation**. They touch different files, different agents, different concerns.

**Concurrency plan:**

- **Sonnet structural brief** — page renames, route changes, mode-aware logic audit, hide science, consolidate bench, merge consultations into sessions. ~2-3 days agent work. Mostly mechanical or semi-mechanical. Can run while Dani is doing Reviewers v1 prompt iteration.
- **Content-heavy work (Trust + MCP page content + hero copy)** — drafted by Claude + Dani, iteratively. After Reviewers v1 ships. Attention-heavy on Dani's side; serialize with v1 work.
- **Teams page** — built by separate agent in parallel. Structural brief just creates the empty `/teams` route shell.
- **React Flow visualizer integration** — when the module is ready (separate parallel work).

**What ships when:**

1. **Now (parallel with Reviewers v1):** Sonnet executes structural brief. Output: route changes, mode-aware cleanup, page migrations, empty Teams shell.
2. **After Reviewers v1 ships:** Trust + MCP page content drafted, reviewed, landed. Hero copy iterated if desired.
3. **When React Flow visualizer is ready:** Teams page populated. Engine page on atta hub gains live diagrams.
4. **Atta hub structural work:** Drafted as a separate brief later. Three sections (Vāda Teams blurb, Atta Engine, Ecosystem). Less urgent than Vāda web restructure.

---

## Open questions

These need decisions but are not blocking:

**1. "Learn More" CTA destination.** Currently `/trust`, `/teams`, or new about page. Decide during structural implementation. My current lean: `/trust` — for first-time users, the trust question is the first one they ask (where does my data go).

**2. Hero tagline iteration.** "The room outperforms the individual" stays for now. Future iteration toward something hitting "deep thinking" / "better decisions" angle. Not urgent.

**3. Pricing / cost transparency page.** With BYOK, users pay vendors directly. Vāda-side cost model: TBD. Page exists when there's something to say. Defer.

**4. First-time user experience.** Pre-loaded example deliberations as demos vs empty start? Affects Deliberate page UX. Decide post-structural-restructure.

**5. Hidden Science page — delete content or keep MDX hidden?** Keep content in `content/science/*` but hide the route, OR delete the content directory entirely. My lean: hide route, keep content (cheap, recoverable, the empirical V2 results may be referenced from Trust page).

**6. Atta hub content sourcing.** Atta hub needs an MDX strategy if its pages have content depth. Same pattern as Vāda? Confirm during atta hub brief drafting.

---

## Out of scope for this plan

- **API route changes** — backend route changes happen separately if needed
- **DB schema changes** — sessions page consolidation may require small schema tweaks; handled in implementation, not planning
- **MCP server changes** — separate workstream
- **Backend deliberation engine changes** — Track B Item 3 work, not web
- **Marketing copy refinement** — separate iterative work
- **SEO / meta tags / sharing previews** — fold into structural brief or separate later
- **Mobile responsiveness audit** — separate work, not blocking

---

## Risks

**1. Mode-aware logic deeper than expected.** If components have pervasive mode awareness (state machines, conditional rendering, mode-specific API calls), the refactor extends beyond file moves. Discovery phase catches this; if it surfaces, scope re-evaluation.

**2. Sessions page consolidation may require schema work.** The two source pages (`autonomous/sessions` and `brokered/consultations`) may query different tables or use different shapes. Audit during discovery; if schema changes needed, that's an additional brief.

**3. Component hoisting introduces regressions.** Moving components from page-local to shared location can change import paths and break things subtly. Sonnet must run full typecheck + visual smoke test after each major move.

**4. Hero animation is custom and complex.** The autonomous home page hero uses a canvas particle animation with state (`animationComplete`, `ringVisible`). Promoting it to root must preserve the animation — pure file move, no rewriting of animation logic.

**5. Content page content (Trust + MCP) requires careful drafting.** Privacy claims must match BYOK reality. MCP install instructions must work for current versions of Claude Desktop / Cursor / Claude Code. Content drafted with Dani's review-gate before landing.

---

## Decision log (for traceability)

| Decision | Made | Date |
|---|---|---|
| Promote `(main)/autonomous/page.tsx` to `(main)/page.tsx` | Confirmed | April 30, 2026 |
| Hide `/autonomous/science` (route hidden, content TBD) | Confirmed | April 30, 2026 |
| Merge `/brokered/consultations` into `/sessions` | Confirmed | April 30, 2026 |
| Consolidate `/brokered/bench` + `/autonomous/bench` into `/bench` | Confirmed | April 30, 2026 |
| Teams page built by separate agent (this plan creates empty shell only) | Confirmed | April 30, 2026 |
| Subtitle change: "Deliberation Engine" → "Deliberation Teams" | Confirmed | April 30, 2026 |
| Tagline: keep "The room outperforms the individual" for now | Confirmed | April 30, 2026 |
| MDX strategy for Trust + MCP: reuse existing filesystem-based MDX with `next-mdx-remote/rsc` | Confirmed (per Haiku diagnostic) | April 30, 2026 |
| Content scoping: page-local components default; hoist to `web/src/components/` only when shared | Confirmed | April 30, 2026 |
| Concurrent execution with Reviewers v1 (structural work; content work serialized) | Confirmed | April 30, 2026 |
| MCP page in Vāda web (not atta hub) — each app surfaces its own MCP | Confirmed | April 30, 2026 |

---

## Next steps

When ready to execute:

1. **Structural brief drafted** — Sonnet executes structural restructure with discovery phase. Output: PR with route changes, mode-aware cleanup, empty Teams shell.
2. **After v1 ships, content drafts** — Trust page content rewrite, MCP page content authored. Iterative drafting Claude + Dani.
3. **Atta hub brief drafted** — separate, less urgent. Vāda Teams blurb, Atta Engine page, Ecosystem diagram.
4. **React Flow integration when module is ready** — Teams page populated, atta hub Engine page gains live diagrams.

These don't all happen simultaneously. Sequenced based on bandwidth and Reviewers v1 progress.

---

## Status

This document is a **plan**, not a spec for any specific PR. It captures decisions and architectural shape. Update as decisions evolve. The structural brief, content drafts, and atta hub brief draw from this; they do not replace it.
