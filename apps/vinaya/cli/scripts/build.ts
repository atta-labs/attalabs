#!/usr/bin/env bun
/**
 * Bundles the CLI into a single Node-executable ESM file: dist/index.js —
 * AND each `src/checks/bin/*.ts` core check into its own standalone,
 * self-contained `dist/checks/bin/*.js`.
 *
 * The second half exists because `package.json`'s `files` allowlist ships
 * only `dist`, `templates`, `README.md` — `src/` never reaches the
 * published tarball. `registry.ts`'s `CheckSpec.run` entries used to point
 * straight at `src/checks/bin/*.ts`, which worked in every local/monorepo
 * context (the source is right there) and was 100% broken in the real
 * published package (`vinaya check --all` errored "not found on PATH" for
 * all 15 registered checks — found live against `@attalabs/vinaya@0.1.1`).
 * Each check now gets the exact same bundling treatment as the main CLI
 * entrypoint, so what ships is what actually runs.
 *
 * - `--target=node`: the published artifact must run on a machine that has
 *   only Node — npx/pnpm dlx/yarn dlx are package-manager invocations, not
 *   runtime choices.
 * - Externals are DERIVED from the manifest, never hand-written: every
 *   declared dependency whose specifier is not `workspace:*` stays external
 *   (it ships as a real npm dependency); the whole `@atta/*` workspace graph
 *   is inlined. Adding a real dependency later can therefore never be
 *   silently inlined. Same external list for both builds — the checks import
 *   `@atta/aeg-core`, no dependency the main entrypoint doesn't already have.
 * - Output is a single-level `dist/` for the main entrypoint —
 *   `readVersion()` in src/index.ts resolves `..` from the emitted file and
 *   must land on the package root. Check bins nest one level deeper
 *   (`dist/checks/bin/`), mirroring their source layout exactly, so
 *   `registry.ts`'s `packageRoot()`-relative resolution needs no special
 *   casing between the two.
 */
import { chmodSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const pkgRoot = join(import.meta.dir, '..')
const pkg = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf-8')) as {
  dependencies?: Record<string, string>
}

const external = Object.entries(pkg.dependencies ?? {})
  .filter(([, spec]) => !spec.startsWith('workspace:'))
  .map(([name]) => name)

/** The bin contract every emitted entrypoint carries: a Node shebang, executable. Bun preserves the source file's own shebang, but normalize anyway so the artifact never depends on bundler behavior. */
function normalizeExecutable(outFile: string): void {
  const bundled = readFileSync(outFile, 'utf-8')
  const shebang = '#!/usr/bin/env node'
  const body = bundled.startsWith('#!') ? bundled.slice(bundled.indexOf('\n') + 1) : bundled
  writeFileSync(outFile, `${shebang}\n${body}`)
  chmodSync(outFile, 0o755)
}

async function build(entrypoints: string[], outdir: string): Promise<void> {
  // `naming: '[name].[ext]'` — flat by basename only. Bun's default naming
  // template includes `[dir]`, computed relative to the entrypoints' common
  // ancestor rather than each file's own directory; for a multi-entrypoint
  // build that ancestor sits ABOVE `checkBinDir`, so the default silently
  // nests output as `outdir/src/checks/bin/*.js` instead of `outdir/*.js`.
  const result = await Bun.build({
    entrypoints,
    outdir,
    target: 'node',
    format: 'esm',
    external,
    naming: '[name].[ext]'
  })
  if (!result.success) {
    for (const log of result.logs) console.error(log)
    process.exit(1)
  }
}

await build([join(pkgRoot, 'src', 'index.ts')], join(pkgRoot, 'dist'))
normalizeExecutable(join(pkgRoot, 'dist', 'index.js'))

const checkBinDir = join(pkgRoot, 'src', 'checks', 'bin')
const checkEntrypoints = readdirSync(checkBinDir)
  .filter((f) => f.endsWith('.ts'))
  .map((f) => join(checkBinDir, f))
const checkOutdir = join(pkgRoot, 'dist', 'checks', 'bin')
await build(checkEntrypoints, checkOutdir)
for (const f of readdirSync(checkBinDir).filter((f) => f.endsWith('.ts'))) {
  normalizeExecutable(join(checkOutdir, f.replace(/\.ts$/, '.js')))
}

console.log(
  `built dist/index.js + ${checkEntrypoints.length} check bin(s) in dist/checks/bin/ (external: ${external.join(', ') || 'none'})`
)
