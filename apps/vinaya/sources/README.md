# @atta/vinaya-sources

The I/O boundary for Vinaya's aeg-core source contracts — the only package in
these seams allowed file/forge reads. Implements `StateSource` and
`DoctrineSource`, both defined I/O-free in `@atta/aeg-core`.

## StateSource adapters

- **`createForgeSource`** (`src/forge-adapter.ts`) — primary design. Wires
  `@atta/aeg-forge-state`'s `deriveIterationFromForge` behind the contract.
  Imported as a workspace dependency, not re-homed — see the rationale in
  `src/forge-adapter.ts`'s docstring.
- **`createFileSource`** (`src/file-adapter.ts`) — transitional. Wraps
  `@atta/aeg-core`'s `parseIteration` over a configurable governance root
  (`FileSourceConfig.root`, default `aeg-root`). Deliberate throwaway,
  deleted once every consumer of `StateSource` is forge-backed.

`selectSource` (`src/select-source.ts`) picks between the two from a
zod-validated config object.

## DoctrineSource adapter

- **`createFileDoctrineSource`** (`src/doctrine-file-adapter.ts`) — file-backed
  `DoctrineSource` for `deriveDiagramModel` (`@atta/aeg-core`,
  enforcement-derivation-v1 task 5, #506). Reads `<root>/enforcement.md`,
  `<root>/roles/*.md`, and `<root>/contracts/*.md` over a configurable root
  (`DoctrineFileSourceConfig.root`, default `DEFAULT_GOVERNANCE_ROOT`), never a
  hardcoded literal — same rule as `createFileSource`. This keeps `aeg-core`'s
  derivation pure: doctrine arrives as already-read `DoctrineContent`, so the
  library can be packaged for adopters whose repos have no `aeg-root/`.

## Open question — publish-time packaging (LAUNCH-iteration, not resolved here)

Whether this package ships inside the CLI's published package boundary or
stays dev-only is a launch-time decision, not a build-time one. The CLI's
"surgically small" published footprint argues for keeping
`sources` out of the npm tarball if end users never invoke the forge-backed
path directly (e.g. Studio and internal tooling are the only real
consumers) — but that's a launch-readiness call, made when the CLI's actual
publish surface is finalized, not now. Recorded here so it isn't
rediscovered from scratch; not solved by this task.
