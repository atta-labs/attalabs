<!-- Managed by Vinaya — created by `vinaya init`. `vinaya upgrade` regenerates it; `vinaya eject` removes it. -->
# Vinaya doctrine — read this first

This repo is governed by Vinaya: obligations that would otherwise depend on
an agent following instructions run as functions instead, layered in three
enforcement rings (the full model is inside the doctrine — see "Where the
full doctrine lives" below).

- **Ring 0 (hooks)** — always on, never configurable. Every commit and push
  runs the registered checks locally, before anything reaches the forge.
- **Ring 1 (branch rules)** — always on. The forge re-runs the identical
  checks as CI on every pull request and blocks merge while any is red —
  the backstop for writers the local hooks can't reach (web UI, other
  tools, humans).
- **Ring 2 (audits)** — always on. Forge-scheduled, after merge,
  continuous: drift (archive state, dead-branch-push, direct-main-push) is
  surfaced as findings regardless of who or what wrote it.

`vinaya.config.json`'s `rings` block does not switch these on or off — every
ring above runs unconditionally, for every adopter, by default.
`ring1_forgeWriteInterception` and `ring2_asyncAudits` are opt-in
**accelerators**, not on/off switches: `false` or absent (the default) is a
no-op — the real work above keeps running exactly as described above;
`true` skips only the non-security-critical part of that ring's work once
you've outgrown it (brief-schema validation for ring 1; dead-branch-push
bookkeeping for ring 2). Neither flag ever disables direct-main-push
detection — that stays unconditional by design.

## Your role

Pick the role you're working as and load its doctrine before doing
anything substantive:

    vinaya doctrine --role <name>

prints the absolute path to that role's doctrine — `architect`,
`developer`, `reviewer`, `planner`, `security`, `archivist`,
`tranche-archivist`, `brief-author`, or `principal`. If your agent tool
supports slash-style commands, the same doctrine is likely exposed as
`/vinaya <role>` — check your tool's command list before falling back to
the raw CLI form.

Regardless of role, load the front door first, every session: run
`vinaya doctrine` with no `--role` (see "Where the full doctrine lives"
below for what that resolves to).

## Where governance lives in this repo

- **`vinaya.config.json`** — the ruleset: the two accelerator flags above, the
  registered `checks`, the `roles` overrides/additions, and the brief
  schema a PR/Issue body must satisfy.
- **`.vinaya/hooks`** and **`.vinaya/doc-owners`** — the installed
  git-hook scripts (ring 0) and the code-to-doc coherence manifest.

## How to see what's running

- `vinaya check --plan` — prints the resolved check registry and the
  resolved `roles` registry (default / overridden / additive), without
  running anything.
- `vinaya doctor` — reports what is installed and diagnoses hook, workflow,
  and config health. Report only; it never mutates.

## How to extend

- `vinaya new check <yourname>/<id>` — scaffolds a custom check into
  `./scripts/vinaya-checks/` and prints the `checks` entry to paste into
  `vinaya.config.json`.
- `vinaya new noop-check <core-check-id>` — the only sanctioned way to
  silence a core check: scaffolds an explicit, contract-satisfying no-op
  into `vinaya/checks/` and prints the `checks` entry that REPLACES the
  core check with it.
- `vinaya new role <yourname>/<id>` — scaffolds an additive role contract
  into `vinaya/roles/` and prints the `roles` entry to paste into
  `vinaya.config.json`. A role's contract can also be overridden by hand from
  `vinaya.config.json`'s `roles` block. What a contract must satisfy is
  documented inside the resolved doctrine below.

## Security

Each check's child process receives a fixed safe baseline (`PATH`, `LANG`,
`HOME`, `HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY`, `TMPDIR`) plus only what
its `env` declaration explicitly forwards — never the full parent
environment. That default is a breaking-change tightening from forwarding
everything; `vinaya doctor` flags a check that reads `process.env` directly
without declaring one. A literal `env` value lives in this committed,
reviewed file — it must never be a secret. The audit trail this buys
(every governed write traceable to a reviewed commit) holds only where
pull request review is actually enforced on this repo; Vinaya does not
enforce that for you.

## Where the full doctrine lives

The full, canonical doctrine (roles, contracts, the state machine, the ring
gates) ships inside the installed `@attalabs/vinaya` npm package itself — no
in-repo copy to drift. This pointer names that package, never a filesystem
path: where a package sits is a property of one machine, and this file is
committed for every clone.

The doctrine's own front door is `aeg-root/skills/aeg/SKILL.md` inside that
package — read first every session regardless of role. Resolve it on this
machine with:

    npx --yes @attalabs/vinaya doctrine

   It prints the front door's absolute path on this machine, installing
   the package first if it has to; the `aeg-root/` directory above it is
   the full doctrine.

Live task status is derived from the forge (Issues, labels, comments) via
`vinaya check` — it is never written into a file here.
