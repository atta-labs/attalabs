---
name: doc-authoring
description: The authoring standard for this repo's agent-facing prose — CLAUDE.md, SKILL.md, and apps/*/specs/**.md — each governed by a different rule because their cost profiles are opposite. Load when writing or editing any of the three classes. Do NOT load for aeg-root/** doctrine (governed by its own shipped gate, out of this skill's scope) or for root-level README.md files (human-facing, different job).
---

# Doc Authoring — The Standard for Agent-Facing Prose

## Context — three classes, one axis, opposite rules

This repo has three classes of prose written for an agent to read, and they earn different rules because of *when* an agent pays for them, not because of taste:

- **`CLAUDE.md` — always-on.** Loaded automatically into every session in scope, whether or not this session's work touches what it describes. Rent is paid on every turn, forever. This class earns brevity as a structural requirement, not a style preference.
- **`SKILL.md` — on-demand.** Loaded only when a session invokes it, deliberately, for work that needs it. Nobody pays for a `SKILL.md` they never touch. **Length is not the defect here.** A skill is a deep reference and is allowed to be long; what it owes is structure.
- **Spec files (`apps/*/specs/**.md`) — read on demand**, by a human or an agent working that surface. Same on-demand cost profile as skills, hence the same structural bar.

The axis is always-on cost vs. on-demand cost. A `CLAUDE.md` that explains *why* a decision was made costs every future session that never needed the explanation. A `SKILL.md` or spec that explains the same thing costs nothing until someone opens it to find out — so it is allowed to say more, provided it says it in a shape a reader can scan rather than a wall a reader must excavate.

One rule is shared by all three regardless of class — see [The reference rule](#the-reference-rule-shared-by-all-three) below.

## `CLAUDE.md` — what belongs, what doesn't

**Belongs:** what an agent must know to *act* correctly in this tree — commands, conventions, invariants, and the gotchas that have cost real time before. If a fact changes what an agent does on its next turn, it belongs here.

**Doesn't belong:** history, rationale for *why* something is the way it is, migration narratives, anything explaining how the code got that way rather than what it currently is. That material belongs in a `SKILL.md` (if it recurs across sessions and is worth a deliberate load) or a spec (if it's a record of a design). A `CLAUDE.md` is a standing prompt, not an archive.

**Brevity discipline:** not a hard word cap — the defect the Planner measured in this repo's worst offenders was structural, not purely numeric. The worst files were single-paragraph walls of text, not merely long ones. A long `CLAUDE.md` broken into short, scannable, purely-factual sections is still doing its job; a short one that's one dense paragraph of prose is not. If a `CLAUDE.md` is growing because it keeps needing to explain itself, that growth is a signal to move the explanation to a `SKILL.md` and leave a pointer, not to keep writing denser prose in place.

## `SKILL.md` — what belongs, what doesn't

Length is explicitly not the defect in this class and must not be treated as one. A skill is loaded deliberately, for work that needs it, and is allowed to carry the full depth that work requires.

**The structural bar:** scannable headings, architecture stated before the checklist, no wall of undifferentiated prose. A reader should be able to tell from the headings alone what the file covers before reading a sentence of body text. State the system's structure and invariants first — the "why this is built this way" that disambiguates the decisions that follow — then the specifics (file shapes, registries, per-concern detail).

**Concrete example of the shape:** `.claude/skills/vinaya-architecture/SKILL.md` and `.claude/skills/atta-engine/SKILL.md` both open with a `## Context` section stating the one rule that disambiguates most questions in that tree, then an `## Architecture` section with the structural map, before descending into per-concern detail. This file follows the same shape — it is a worked example of its own doctrine, not just a description of one.

## Spec files (`apps/*/specs/**.md`) — what belongs, what doesn't

Same structural bar as `SKILL.md`: scannable headings, structure before detail, no undifferentiated prose. Same reference discipline as everything else, below. A spec is read on demand by whoever is working that surface — it earns the same license to be long, and the same obligation to be navigable rather than merely complete.

## The reference rule — shared by all three

A citation whose meaning depends on this repo's tracker — a PR number, an internal tranche slug, a task ordinal — must not be load-bearing prose in a `CLAUDE.md`, a `SKILL.md`, or a spec. Apply this test:

> Remove the citation. If the sentence still states what is true, it was decoration. If not, write the reason it stood for.

`#294` tells a reader nothing they can resolve without this repo's own tracker open in another tab; the reason the PR existed — the constraint it encoded, the bug it fixed, the invariant it introduced — is the durable fact. Write that instead.

This is **convention, enforced by this skill's hook binding** (below), not yet a mechanical sweep against these three classes specifically. `@attalabs/aeg-core`'s shipped `checkReaderResolvableProse` already mechanizes this same test, but its `SWEPT_CLASSES` currently covers only `ships` (`aeg-root/**`) and `reader-facing` (the public site) — `CLAUDE.md`, `SKILL.md`, and spec files are outside that sweep today. Extending the mechanized check to these three classes is a separate, already-planned task; this skill supplies the standard that task would eventually check against, and until it lands, the discipline here is upheld by convention and by whoever reviews a diff touching these files.

## How this gets enforced

This skill is bound to its governed paths via a sibling `paths.txt` (`CLAUDE.md`, `.claude/skills/`, `/specs/`), read by `.claude/hooks/check-skill.sh` — a `PreToolUse` hook that blocks any `Edit`/`Write`/`NotebookEdit` on a matching path until this skill has been invoked via the `Skill` tool in the current session. That's why editing any `CLAUDE.md`, any `.claude/skills/**` file, or any `apps/*/specs/**` file triggers a requirement to read this skill first: the rules above differ by class, and the hook exists to make sure they're read before they're broken.
