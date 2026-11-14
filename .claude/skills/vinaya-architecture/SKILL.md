---
name: vinaya-architecture
description: Pointer — Vinaya (its CLI, doctrine, public Portal and local Studio) is developed and deployed from the standalone atta-labs/vinaya repository; this repository only installs @attalabs/vinaya as its governance dependency. Load to find where Vinaya's architecture is documented.
---

# Vinaya — where its architecture lives

Vinaya is developed in the standalone `atta-labs/vinaya` repository: the command line (`@attalabs/vinaya` on npm), its doctrine, the public Portal and the local Studio all live, build and deploy there. This repository carries none of them.

What this repository has of Vinaya:

- **The installed package**, pinned in the root `package.json` and upgraded with the `vinaya-upgrade` skill.
- **The generated governance files** `vinaya upgrade` keeps current: the managed husky hooks, the `vinaya-*.yml` workflows, `.mcp.json`, `AGENTS.md` and the role skills.
- **This repository's own configuration**: `vinaya.config.json`, `.vinaya/doc-owners`, `.vinaya/projects.md` and the custom checks under `scripts/vinaya-checks/`.

For a role's doctrine, run `npx vinaya doctrine --role <role> --print`. For the product's architecture, read the vinaya repository.
