import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Walk up to the nearest package.json instead of a fixed `../..` — this file
// runs from src/commands/ in the workspace but from a single-level dist/ in
// the published bundle, so the depth to the package root is not constant.
function packageRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url))
  while (!existsSync(join(dir, 'package.json'))) {
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return dir
}

const TEMPLATE_PATH = join(packageRoot(), 'templates', 'custom-check.template.ts')
const CHECKS_DIR = join('scripts', 'vinaya-checks')

const VALID_NAME = /^[a-z0-9][a-z0-9-]*$/

/**
 * `vinaya new check <name>` — scaffolds a worked custom check into
 * `./scripts/vinaya-checks/<name>.ts`. The template is self-contained (no
 * dependency on `@attalabs/vinaya`'s own source) and honors the check
 * contract out of the box: it runs, emits one real `CheckError`, and passes
 * through the runner unmodified (`tests/new-check.test.ts`).
 */
export function newCheckCommand(args: string[]): void {
  const name = args[0]
  if (!name || !VALID_NAME.test(name)) {
    console.error('Usage: vinaya new check <name>  (name: lowercase letters, digits, hyphens)')
    process.exit(2)
  }

  const scriptsDir = join(process.cwd(), CHECKS_DIR)
  if (!existsSync(scriptsDir)) mkdirSync(scriptsDir, { recursive: true })

  const targetPath = join(scriptsDir, `${name}.ts`)
  if (existsSync(targetPath)) {
    console.error(`Error: ${targetPath} already exists.`)
    process.exit(1)
  }

  const template = readFileSync(TEMPLATE_PATH, 'utf-8')
  const contents = template.split('{{CHECK_NAME}}').join(name)
  writeFileSync(targetPath, contents, 'utf-8')
  chmodSync(targetPath, 0o755)

  const relPath = join(CHECKS_DIR, `${name}.ts`)
  const registration = JSON.stringify({ checks: { [name]: { run: `./${relPath}`, scope: 'diff' } } }, null, 2)
  process.stdout.write(`Created ${relPath}\n\nRegister it in vinaya.config.json:\n${registration}\n`)
}
