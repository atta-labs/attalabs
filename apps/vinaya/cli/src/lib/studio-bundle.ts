/**
 * Shared between `scripts/bundle-studio.ts` (pack time) and
 * `commands/studio.ts` (run time). npm/bun's packer strips ANY directory
 * literally named `node_modules` from a published tarball, unconditionally
 * — confirmed live: `bun pm pack` silently drops the standalone Studio
 * bundle's `node_modules` (holding `next`, `react`, `sharp`, … —
 * `server.js`'s own real runtime requires), and the installed package then
 * fails at `require('next')`. `bundle-studio.ts` packs it under this name
 * instead; `studio.ts` renames it back on first run. The two must agree on
 * the exact name, hence one shared constant rather than two literals.
 */
export const STUDIO_NODE_MODULES_PACKED_DIRNAME = '_node_modules'
