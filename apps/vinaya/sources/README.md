# @atta/vinaya-sources

StateSource adapters for Vinaya — implementations of the `StateSource`
contract defined in `@atta/aeg-core` (`packages/aeg-core/src/state-source.ts`).

## Adapters

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

## Open question — publish-time packaging (LAUNCH-iteration, not resolved here)

Whether this package ships inside the CLI's published package boundary or
stays dev-only is a launch-time decision, not a build-time one. The CLI's
"surgically small" published footprint (D-084/D-104) argues for keeping
`sources` out of the npm tarball if end users never invoke the forge-backed
path directly (e.g. Studio and internal tooling are the only real
consumers) — but that's a launch-readiness call, made when the CLI's actual
publish surface is finalized, not now. Recorded here so it isn't
rediscovered from scratch; not solved by this task.
