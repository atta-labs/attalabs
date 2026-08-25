<!-- Managed by Vinaya — created by `vinaya init`. `vinaya upgrade` regenerates it; `vinaya eject` removes it. -->
# Vinaya doctrine — read this first

This repo is governed by Vinaya: obligations that would otherwise depend on
an agent following instructions run as functions instead, layered in three
enforcement rings.

- **Ring 0 (git hooks)** — always on, never configurable. Every commit and
  push runs the registered checks locally, before anything reaches the forge.
- **Ring 1 (forge-write interception)** — opt-in. Validates a PR/Issue body
  against the configured brief schema before the write reaches the forge.
- **Ring 2 (async audits)** — opt-in. Forge-scheduled mechanisms (archive,
  dead-branch-push and direct-main-push detection) that run after the fact.

## Where governance lives in this repo

- **`vinaya.config.json`** — the ruleset: which rings are on, the registered
  `checks`, the `roles` overrides/additions, and the brief schema a PR/Issue
  body must satisfy.
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

If your agent tool supports slash-style commands, it may also expose these
as `/vinaya <role>` — check your tool's command list.

Live task status is derived from the forge (Issues, labels, comments) via
`vinaya check` — it is never written into a file here.
