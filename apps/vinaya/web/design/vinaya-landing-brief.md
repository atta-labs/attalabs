**Zero-context handoff — build the public Vinaya site (`vinaya.attalabs.dev`).** You are picking this up cold; everything you need is below. This is a NEW build in the `daniboomerang/attalabs` monorepo — `apps/vinaya/web` does not exist yet.

## What this repo/product is (minimum you need)

`attalabs` is a monorepo of AI products (Turborepo + Bun + Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui + Sanity CMS + Clerk auth). Read the root `CLAUDE.md` and `.claude/rules/ui-patterns.md` before writing any component — this repo enforces: `@atta/ui` components only (no raw HTML elements), semantic CSS tokens only (no hardcoded colors, no hex/oklch/hsl, no Tailwind palette classes), `lucide-react` icons only, no inline `style={{}}` except for genuinely runtime-computed values. There's a PreToolUse hook that blocks edits to files matching certain skill globs until you've invoked the relevant `Skill` tool first — if you're an agent with Skill-tool access, invoke `.claude/skills/ui-components/SKILL.md`, `.claude/skills/ui-theme-tokens/SKILL.md`, and `.claude/skills/ui-cms-theme/SKILL.md` before touching any `.tsx` in this app.

**Vinaya** is the product being built: an npm-distributable reference implementation of **AEG (Agentic Execution Governance)** — a governance model for how coding agents interact with a git forge (GitHub). The core idea: agents are made to obey deterministic, forge-native checks rather than trusting them to read and follow documents. AEG itself (the model) and Vinaya (the shippable tool) are being built in this same repo, in parallel, by a separate workstream — you don't need to touch that code, just represent it accurately in the site's content.

## The task

Build a small, standalone Next.js app at `apps/vinaya/web`, two pages only, deployed to `vinaya.attalabs.dev` (wildcard DNS already configured for `*.attalabs.dev` — deployment is the same Vercel pattern every other app in this monorepo uses; check `apps/herald-ai/web` or `apps/vada-ai/web` for the reference `NextWebShell` / Sanity theme wiring pattern).

**This is explicitly decoupled from and running AHEAD of** a separate, already-planned iteration (`vinaya-studio-v1`) that will eventually copy `apps/aeg/web`'s Studio UI into this same app as additional routes. Do NOT build Studio here. Do NOT structure this app assuming a later wholesale copy-in — build it as its own clean, small app; Studio routes get ADDED to it later, in a separate task, by someone else.

**Why this matters / urgency:** the person building this needs a real, live, public link to point to from their CV/portfolio *now*, even though the underlying CLI (`npx vinaya init`) isn't shippable yet. Priority is high. An honest "coming soon" on the actual install command is correct and wanted — do not fake a working install.

## Absolute content constraint — read this twice

**Zero personal content.** No bio, no "about me," no founder story, no origin narrative, no author name, nothing autobiographical anywhere on this site. This was explicitly and firmly corrected once already during planning — the person's background was shared with the planner only so the planner would understand *intent*, never meant for the page itself. Every sentence on both pages must be about the **mechanism** (what AEG/Vinaya does, how it works) — never about a person, a journey, or a company story.

**Tone:** dense, precise, technically clear. No marketing fluff, no narrative voice, no rhetorical questions, no "imagine a world where…" framing. Write like a spec or a systems datasheet, not like landing-page copy.

## Two pages, not one

### 1. `/` — Landing (light, brief)

Short. Not the deep explanation — that's page 2. Use this **locked, already-ratified copy** verbatim (do not rewrite it):

- **Headline:** "Agents obey checkers, not documents."
- **Subhead:** Install Vinaya and every coding agent must satisfy the same deterministic rules before merge.
- **Clarifier:** "We don't block agents — we redirect them into a governed flow, so you review judgment, not compliance."
- **Genre anchor:** "Branch protection for the AI era."
- **Boundary statement:** sits underneath Cursor / Claude Code / Codex / Gemini CLI / GitHub — replaces none of them.
- **Value sentence** (may adjust wording slightly, meaning must not move): "Vinaya lets you trust AI agents to work inside your engineering process without becoming their compliance officer."
- **One CTA:** `npx vinaya init` — mark it clearly as **coming soon** (e.g. a disabled/ghost button state or an explicit "coming soon" label next to it — don't make it look like a working command to copy-paste today).
- A link to the "How it works" page (page 2) and nothing else. No `/docs` link for now — skip building docs entirely; documenting a CLI that doesn't exist yet is premature. (This may be revisited later — don't build it preemptively.)

**Sequencing law that governs all copy on this page:** pain and refusal first, principles second — the first few seconds must feel like relief ("this solves a real, annoying problem"), not doctrine. Don't lead with philosophy.

### 2. `/how-it-works` (or similar — your call on exact slug) — the real explanation

This is the substantial page. Purely mechanical/technical content, structured around:

1. **A central visual**: **GitHub positioned in the middle**, with the **three enforcement rings arranged around it** — this was a specific, repeated instruction. The concept (already mocked up, see below): GitHub/the forge as a hub node at the center; Ring 0 as the innermost ring (closest to the agent, runs pre-forge, on the agent's own machine); Ring 1 as the ring at the forge boundary (CI, "the guarantee," merge-blocking); Ring 2 as the outermost ring (post-merge, continuous, non-blocking audit). Small connection points showing where an agent and a human touch the diagram.
2. **The three rings explained**, each with: where it runs / what it catches / who pays when it fails:
   - **Ring 0 — Prevent** (agent's own machine): catches malformed commits/conventions before they leave the session; nobody pays, the agent self-corrects.
   - **Ring 1 — Detect** (CI, "the guarantee"): catches everything regardless of what wrote it; merge is blocked until green.
   - **Ring 2 — Audit** (post-merge, continuous): catches drift between what shipped and what was decided; never blocks, writes the permanent record.
3. **A commit walkthrough** — the actual sequence a single change goes through: write → Ring 0 (local hook) → push/PR → Ring 1 (CI) → human review (judgment, not compliance) → merge → Ring 2 (audit record).
4. **The roles**, stated plainly, each tagged human or agent: Principal (human — ratifies irreversible decisions), Team Leader (agent — plans, writes briefs), Developer (agent — executes, opens PRs), Reviewer (agent — independent judgment, fresh context), Archivist (agent — closes out, writes the permanent record).
5. **Why GitHub specifically** — the "derived status" idea: no status field anywhere is hand-written by a human or agent; status is read fresh from what actually happened (branch exists → in progress; PR open → in review; CI red → blocked; PR merged → done). Nothing can drift because nothing stores it.

## Design reference — already mocked up, use as the visual direction

Attached in this same folder: **`how-it-works-mockup.html`** — a static, self-contained HTML/CSS mockup of the `/how-it-works` page built to explore this exact content structure and the rings+GitHub diagram concept. Open it directly in a browser to see it.

**Treat it as a design reference, not a literal spec to copy-paste.** It hardcodes colors as raw CSS custom properties (`--bg`, `--ring0`, `--ring1`, `--ring2`, etc.) for standalone-mockup purposes — this repo's actual rule is semantic theme tokens only, and this app's real colors/fonts come from the Sanity CMS theme via `NextWebShell` (see `.claude/skills/ui-cms-theme/SKILL.md`), not hardcoded values. Reproduce the mockup's *design intent* — dark, precise, schematic register; monospace for headlines/labels/identifiers; clean sans for body copy; three distinct semantic colors for the three rings (amber/teal/violet in the mockup) — using this app's actual token/theme system, not its literal CSS.

Design intent notes, in case the mockup's reasoning isn't self-evident:
- Register is "engineering schematic / systems datasheet," not "storybook" or "marketing hero" — deliberately avoided a softer, narrative-driven visual direction that was considered and rejected earlier in planning, precisely because the content itself was locked to be non-narrative.
- The rings diagram is drawn as concentric circles (not a linear pipeline) specifically because GitHub is conceptually the fixed center everything else relates to — Ring 0 (innermost, pre-forge), Ring 1 (middle, at the forge boundary), Ring 2 (outermost, wrapping everything as continuous audit).
- Monospace-for-headlines is a deliberate, slightly unusual choice (most landing pages use display sans or serif) — intentional, fits a CLI/developer-tool audience, keep it if it renders well; it's a judgment call, not a hard requirement, if it fights real typography/legibility constraints in the actual build.

## Explicitly out of scope for this task

- `/docs` (CLI reference) — skip entirely.
- Anything under `apps/aeg/web` — do not touch, do not copy from it.
- Vinaya Studio (the governance dashboard UI) — a separate, later task adds it into this same app; don't build placeholder routes for it.
- Any personal/bio/about content — see constraint above, this is non-negotiable.
- Making `npx vinaya init` actually work — it doesn't exist yet; the button/command block must read honestly as not-yet-available.

## Open questions you may need to resolve yourself

- Exact slug for the how-it-works page (`/how-it-works`, `/aeg`, `/mechanism` — no final decision was made; pick something clear and go).
- Whether the diagram is implemented as inline SVG (as in the mockup) or a canvas/animated version — SVG is simpler and sufficient; don't over-engineer motion unless it's cheap and adds real clarity (e.g. a subtle pulse showing "data flows outward through the rings" is fine, don't build more than that).

## Report back

When done: the two working pages, a live preview/screenshot, confirmation that no `@atta/ui`/token/icon rule was violated (run `bun run check` — typecheck + lint + format — and fix anything it flags), and the deploy status against `vinaya.attalabs.dev`.
