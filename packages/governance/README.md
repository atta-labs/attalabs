# @atta/governance

Repo governance state that must resist silent, unreviewed edits — kept as
plain files (not moved into forge-native objects) but package-wrapped so
workspace-aware deploy-skip tooling attributes changes to this package
instead of triggering unrelated app builds. This is the D-110 "keep as
file, package-wrapped" disposition bucket. Zero code — data files only.

- `decisions.md` — the global cross-project decision log (moved from
  `aeg-project/decisions.md`)
- `projects.md` — the project registry (moved from `aeg-root/projects.md`)
- `doc-owners` — the code → doc coverage manifest for the `verify-docs` C5
  gate (moved from `aeg-root/doc-owners`)
