---
sidebar_title: Glossary
description: Plain definitions for the words Vinaya's doctrine and product pages use as though the reader already knows them.
surfaced: true
---
# Glossary

Vinaya uses a handful of words in a specific, non-obvious sense — on the pages that describe how the harness works, and on the pages that describe the product itself. Each entry below stands on its own: read it without reading anything else first.

**Brief** — A complete, self-contained work order for one task, written before anyone starts coding it. Despite the name, it is the opposite of short: it names the exact files to touch, the tests to run, the questions to stop and ask about rather than guess at, and the exact commands to run first. It ends up pasted in full into a pull request's description, since that is the request a reviewer judges the finished work against.

**Dispatch** — Handing a written work order to whoever will execute it — a coding agent or a person — so they start the work. A task is "dispatchable" once its prerequisites are all true: it has a real tracking number, everything it depends on has already landed, and no conflicting work is in flight. "Not dispatchable" means one of those isn't true yet.

**Forge** — The Git hosting platform (GitHub, here) treated as the one source of truth for a task's state. Nothing in this system writes "in progress" or "done" to a file anywhere; a task's status is read directly off the live issues, pull requests, branches and labels, every time it's asked.

**Gate** — An automated check that blocks an action — opening a pull request, merging one, pushing a branch — until a specific condition holds. A gate never relies on a person remembering a rule; it refuses the action itself until the rule is satisfied.

**Impact tier** — A number (0, 1, or 3) assigned to a task that decides how much documentation, testing and record-keeping it owes before it can merge. A higher number means a bigger blast radius and a stricter checklist.

**Provenance** — A short, durable record, left as a comment on a merged pull request, proving the work behind it was actually reviewed and closed out — not just merged. A pull request carrying no such record means that close-out step never happened.

**Ratification** — Sign-off, from the person ultimately accountable for the product, on a decision or a piece of work that would be hard to undo. Higher-impact changes wait for a scheduled sign-off window rather than merging the moment they're technically ready.

**Registry ID / rendering ID** — Two names for the same role that can differ. The registry ID is the config key an adopter uses to claim or add a role — namespaced for an additive one. The rendering ID is the role file's own `role_id`, always slash-free, what every diagram and downstream reader actually sees. An override's rendering ID must equal its registry ID exactly; an additive role's rendering ID must equal the key's segment after the `/`.

**Resolution state** — One of three states — `default`, `overridden`, or `additive` — that every check or role ID resolves to. `default` means shipped-and-unmodified; `overridden` means a config entry currently claims that ID and satisfies its contract; `additive` means a wholly new, namespaced entry the shipped product has no opinion on.

**Seam** — The handoff point between two people or roles, where one produces something — a document, a decision, a record — and the other consumes it. Each seam is written down once, in its own place, so both sides can agree on exactly what crosses it.

**Step 0** — The literal first command someone runs before touching any code on a task: the one that creates that task's own isolated copy of the repository and its own branch. Nothing else happens until this command has run.

**The Dig** — The research pass someone does before writing a task's work order: reading the actual, current code to confirm exact file names, function signatures and file structure, so the document that results describes what is really there instead of what was assumed.

**Tranche** — A named batch of related tasks, planned and tracked together, numbered starting from 1. Each task in a tranche gets its own tracking issue and its own branch; the tranche as a whole is finished once every task in it has merged.

**Worktree** — A separate, isolated copy of a repository's working files, checked out on its own branch, so one task's in-progress edits can never collide with another task's. Every task gets a fresh one, created from the current main branch before any code is written.
