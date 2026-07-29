#!/usr/bin/env bun
/**
 * Bundles the CLI into a single Node-executable ESM file: dist/index.js.
 *
 * - `--target=node`: the published artifact must run on a machine that has
 *   only Node — npx/pnpm dlx/yarn dlx are package-manager invocations, not
 *   runtime choices.
 * - Externals are DERIVED from the manifest, never hand-written: every
 *   declared dependency whose specifier is not `workspace:*` stays external
 *   (it ships as a real npm dependency); the whole `@atta/*` workspace graph
 *   is inlined. Adding a real dependency later can therefore never be
 *   silently inlined.
 * - Output is a single-level `dist/` — `readVersion()` in src/index.ts
 *   resolves `..` from the emitted file and must land on the package root.
 */
import { chmodSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const pkgRoot = join(import.meta.dir, '..')
const pkg = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf-8')) as {
  dependencies?: Record<string, string>
}

const external = Object.entries(pkg.dependencies ?? {})
  .filter(([, spec]) => !spec.startsWith('workspace:'))
  .map(([name]) => name)

const result = await Bun.build({
  entrypoints: [join(pkgRoot, 'src', 'index.ts')],
  outdir: join(pkgRoot, 'dist'),
  target: 'node',
  format: 'esm',
  external
})

if (!result.success) {
  for (const log of result.logs) console.error(log)
  process.exit(1)
}

// The bin contract: dist/index.js starts with a Node shebang and is
// executable. Bun preserves the entrypoint's shebang, but normalize anyway so
// the artifact never depends on bundler behavior.
const outFile = join(pkgRoot, 'dist', 'index.js')
const bundled = readFileSync(outFile, 'utf-8')
const shebang = '#!/usr/bin/env node'
const body = bundled.startsWith('#!') ? bundled.slice(bundled.indexOf('\n') + 1) : bundled
writeFileSync(outFile, `${shebang}\n${body}`)
chmodSync(outFile, 0o755)

console.log(`built dist/index.js (external: ${external.join(', ') || 'none'})`)
