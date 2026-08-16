<!-- Managed by Vinaya — created by `vinaya init`. `vinaya upgrade` regenerates it; `vinaya eject` removes it. -->
# Vinaya doctrine — read this first

This repo is governed by Vinaya. The full, canonical doctrine (roles,
contracts, the state machine, the ring gates) ships inside the installed
`@attalabs/vinaya` npm package itself — no in-repo copy to drift. This
pointer names that package, never a filesystem path: where a package sits
is a property of one machine, and this file is committed for every clone.

An agent working in this repo follows the governed flow by reading two things:

1. **This pointer** — the tool-agnostic entry point at the conventional
   reading-order path (repo root). The doctrine's own front door is
   `aeg-root/skills/aeg/SKILL.md` inside that package — read first every
   session regardless of role. Resolve it on this machine with:

       npx --yes @attalabs/vinaya doctrine

   It prints the front door's absolute path on this machine, installing
   the package first if it has to; the `aeg-root/` directory above it is
   the full doctrine.
2. **`vinaya.config.json`** — the ruleset the gates enforce: rings, custom checks,
   and the brief schema a PR/Issue body must satisfy.

Live task status is derived from the forge (Issues, labels, comments) via
`vinaya check` — it is never written into a file here.

`vinaya doctor` reports what is installed in this repo.
