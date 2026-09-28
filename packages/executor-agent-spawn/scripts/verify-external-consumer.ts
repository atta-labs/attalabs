/**
 * @file verify-external-consumer.ts
 * @description Proves that `@atta/agents`, `@atta/engine` and
 * `@atta/executor-agent-spawn` are a real cross-repository artifact contract
 * and not three workspace links — by building them, packing them, and
 * installing the tarballs into a throwaway project outside this checkout that
 * then compiles a steps-shaped Flow and drives the whole run lifecycle.
 *
 * Why the three, and not just the executor: `@atta/engine`'s public
 * declarations re-export `Agent` from `@atta/agents`, so an artifact set
 * missing it has declarations naming a package the consumer cannot install.
 *
 * What each stage answers:
 *
 *   build    — every package emits `dist/` (bundled ESM + declarations); no
 *              TypeScript source is part of the distribution contract.
 *   pack     — `bun pm pack` resolves each `workspace:*` range to the real
 *              version it stood for, which is what makes the packed manifest
 *              installable at all. This stage then re-reads every packed
 *              manifest and refuses one that still names a workspace range,
 *              points an entry at source, or names a file the tarball lacks.
 *   install  — a fresh project in the OS temp directory, verified to sit
 *              outside this repository, installs only the three tarballs and
 *              their registry dependencies. No workspace resolution exists
 *              there to fall back on.
 *   typecheck— the consumer compiles against the installed `.d.ts` files under
 *              `strict` + `noUncheckedIndexedAccess`, so the declaration
 *              surface is proven, not just the runtime one.
 *   run      — `external-consumer/consumer.ts` executes the lifecycle:
 *              compile, an injected node executor, durable start, live events,
 *              halt, inspection, typed resume with no replay, cancellation of
 *              a live child, refusal of an undeclared capability, redaction,
 *              and the absence of the rounds-shaped adapter.
 *
 * The consumer's own `overrides` block pins the two transitive `@atta/*`
 * ranges to the same tarballs. That is the stand-in for a registry, which this
 * task deliberately does not use: without it a package manager would look up
 * `@atta/engine@0.0.1` publicly and 404. It pins nothing else, so every other
 * dependency resolves exactly as it would for any consumer.
 *
 * Usage: bun run packages/executor-agent-spawn/scripts/verify-external-consumer.ts [--keep]
 */

import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..', '..', '..')
const fixtureDir = join(here, 'external-consumer')
const keepWorkdir = process.argv.includes('--keep')

/** Dependency order: the engine's declarations need the agents package built first. */
const PACKAGES = [
  { name: '@atta/agents', dir: join(repoRoot, 'packages', 'atta-agents') },
  { name: '@atta/engine', dir: join(repoRoot, 'packages', 'engine') },
  { name: '@atta/executor-agent-spawn', dir: join(repoRoot, 'packages', 'executor-agent-spawn') }
] as const

/** The two `@atta/*` ranges a packed manifest names transitively. */
const TRANSITIVE_ATTA_DEPENDENCIES = ['@atta/agents', '@atta/engine'] as const

function heading(text: string): void {
  process.stdout.write(`\n=== ${text} ===\n`)
}

function note(text: string): void {
  process.stdout.write(`${text}\n`)
}

function fail(reason: string): never {
  process.stderr.write(`\nverify-external-consumer: ${reason}\n`)
  process.exit(1)
}

function run(command: string, args: string[], cwd: string): string {
  try {
    return execFileSync(command, args, { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'inherit'] })
  } catch (error) {
    // `tsc` and the consumer both report on stdout, which is captured above so
    // a passing stage stays quiet. A failing one has to print it or the run
    // reports "command failed" with the diagnosis thrown away.
    const captured = (error as { stdout?: string | Buffer }).stdout
    if (captured) process.stderr.write(captured.toString())
    throw error
  }
}

/** Reads one file out of a tarball without unpacking it. */
function readFromTarball(tarball: string, entry: string): string {
  return execFileSync('tar', ['-xzOf', tarball, entry], { encoding: 'utf-8' })
}

function listTarball(tarball: string): string[] {
  return execFileSync('tar', ['-tzf', tarball], { encoding: 'utf-8' })
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

/** Every filesystem path an `exports` entry points at, whatever nesting it uses. */
function exportTargets(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (value && typeof value === 'object') return Object.values(value).flatMap(exportTargets)
  return []
}

interface PackedManifest {
  name?: string
  version?: string
  private?: boolean
  main?: string
  types?: string
  files?: string[]
  exports?: unknown
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
}

/**
 * The packed-manifest gate. Each refusal below is a way the artifact would
 * install and then fail for a consumer, so none of them is a style check.
 */
function assertPackedManifest(tarball: string): PackedManifest {
  const manifest = JSON.parse(readFromTarball(tarball, 'package/package.json')) as PackedManifest
  const contents = new Set(listTarball(tarball).map((path) => path.replace(/^package\//, '')))
  const label = manifest.name ?? tarball

  const dependencyBlocks = [manifest.dependencies, manifest.peerDependencies, manifest.optionalDependencies]
  for (const block of dependencyBlocks) {
    for (const [dependency, range] of Object.entries(block ?? {})) {
      if (range.startsWith('workspace:')) {
        fail(
          `${label} packs '${dependency}': '${range}' — a workspace range cannot be installed outside this checkout.`
        )
      }
      if (range.startsWith('file:') || range.startsWith('link:')) {
        fail(
          `${label} packs '${dependency}': '${range}' — a path range resolves against this machine, not the consumer's.`
        )
      }
    }
  }

  const entries = [manifest.main, manifest.types, ...exportTargets(manifest.exports)].filter(
    (entry): entry is string => typeof entry === 'string'
  )
  if (entries.length === 0) fail(`${label} packs no public entry point at all.`)

  for (const entry of entries) {
    const normalized = entry.replace(/^\.\//, '')
    if (normalized.startsWith('src/'))
      fail(`${label} points a public entry at '${entry}' — source is not the distribution contract.`)
    if (normalized.endsWith('.ts') && !normalized.endsWith('.d.ts')) {
      fail(`${label} points a public entry at TypeScript source ('${entry}').`)
    }
    if (!contents.has(normalized))
      fail(`${label} points a public entry at '${entry}', which the tarball does not contain.`)
  }

  for (const path of contents) {
    if (path.endsWith('.ts') && !path.endsWith('.d.ts')) fail(`${label} ships TypeScript source ('${path}').`)
  }

  if (manifest.private !== true) {
    fail(`${label} is not marked private — this contract is proven by packing, never by publishing.`)
  }

  note(`  ${label}@${manifest.version} — entries ${entries.join(', ')}; no workspace range; no source`)
  return manifest
}

// ── 1. Build ────────────────────────────────────────────────────────────────

heading('Building the packable packages')
for (const pkg of PACKAGES) {
  run('bun', ['run', 'build'], pkg.dir)
  note(`  built ${pkg.name}`)
}

// ── 2. An isolated workdir, proven to be outside this checkout ───────────────

const workdir = mkdtempSync(join(tmpdir(), 'atta-external-consumer-'))
const relativeToRepo = relative(repoRoot, workdir)
if (!relativeToRepo.startsWith('..')) {
  fail(`the consumer workdir '${workdir}' sits inside this repository — an in-workspace run proves nothing.`)
}

const artifactsDir = join(workdir, 'artifacts')
const consumerDir = join(workdir, 'consumer')
const workingDirectoryRoot = join(workdir, 'work')
mkdirSync(artifactsDir)
mkdirSync(consumerDir)
mkdirSync(workingDirectoryRoot)

let exitCode = 0
try {
  // ── 3. Pack, and validate every packed manifest ───────────────────────────

  heading(`Packing into ${artifactsDir}`)
  const tarballs = new Map<string, string>()
  for (const pkg of PACKAGES) {
    run('bun', ['pm', 'pack', '--destination', artifactsDir], pkg.dir)
  }
  for (const file of readdirSync(artifactsDir).sort()) {
    const tarball = join(artifactsDir, file)
    const manifest = assertPackedManifest(tarball)
    if (manifest.name) tarballs.set(manifest.name, tarball)
  }
  for (const pkg of PACKAGES) {
    if (!tarballs.has(pkg.name)) fail(`no tarball was produced for ${pkg.name}.`)
  }

  // ── 4. Scaffold the consumer project ──────────────────────────────────────

  heading(`Installing the artifacts into ${consumerDir}`)
  const tarballOf = (name: string): string => {
    const tarball = tarballs.get(name)
    if (!tarball) fail(`no tarball for ${name}.`)
    return `file:${tarball}`
  }

  writeFileSync(
    join(consumerDir, 'package.json'),
    `${JSON.stringify(
      {
        name: 'atta-external-consumer-proof',
        version: '0.0.0',
        private: true,
        type: 'module',
        dependencies: {
          '@atta/agents': tarballOf('@atta/agents'),
          '@atta/engine': tarballOf('@atta/engine'),
          '@atta/executor-agent-spawn': tarballOf('@atta/executor-agent-spawn'),
          '@langchain/langgraph': '^0.2.0'
        },
        devDependencies: { '@types/node': '^20.0.0', typescript: '^5.7.0' },
        overrides: Object.fromEntries(TRANSITIVE_ATTA_DEPENDENCIES.map((name) => [name, tarballOf(name)]))
      },
      null,
      2
    )}\n`
  )

  writeFileSync(
    join(consumerDir, 'tsconfig.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          lib: ['ES2022'],
          module: 'ESNext',
          moduleResolution: 'bundler',
          moduleDetection: 'force',
          types: ['node'],
          strict: true,
          noUncheckedIndexedAccess: true,
          noEmit: true,
          skipLibCheck: false,
          isolatedModules: true
        },
        include: ['consumer.ts']
      },
      null,
      2
    )}\n`
  )

  copyFileSync(join(fixtureDir, 'consumer.ts'), join(consumerDir, 'consumer.ts'))
  copyFileSync(join(fixtureDir, 'lifecycle.flow.yaml'), join(consumerDir, 'lifecycle.flow.yaml'))

  run('bun', ['install'], consumerDir)
  note('  installed')

  // ── 5. Compile the consumer against the installed declarations ────────────

  heading('Type-checking the consumer against the installed declarations')
  const tsc = join(consumerDir, 'node_modules', '.bin', 'tsc')
  if (!existsSync(tsc)) fail('the consumer project has no local tsc — the install did not complete.')
  run(tsc, ['--noEmit'], consumerDir)
  note('  consumer compiles against dist/*.d.ts only')

  // ── 6. Run the lifecycle ──────────────────────────────────────────────────

  heading('Running the external consumer')
  process.stdout.write(run('bun', ['run', 'consumer.ts', workingDirectoryRoot], consumerDir))

  heading('External consumer verified')
  note('Packed artifacts install and drive the full injected-executor lifecycle outside this workspace.')
} catch (error) {
  exitCode = 1
  process.stderr.write(`\nverify-external-consumer failed: ${error instanceof Error ? error.message : String(error)}\n`)
} finally {
  if (keepWorkdir) {
    note(`\nworkdir kept at ${workdir}`)
  } else {
    rmSync(workdir, { recursive: true, force: true })
  }
}

process.exit(exitCode)
