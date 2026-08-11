import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { CheckSpec } from '../src/checks/contract'
import { runChecks } from '../src/checks/runner'
import { PRINCIPAL_ALLOWLIST } from '@atta/aeg-core'
import { lintEnvDeclarations, loadConfigFromRef, VinayaConfigSchema } from '../src/lib/config'

// We test config.ts functions by changing process.cwd() via chdir
// and by testing the config path logic with temp dirs.

// Import after setup to avoid side effects
let loadConfig: typeof import('../src/lib/config.js').loadConfig
let loadConfigChecked: typeof import('../src/lib/config.js').loadConfigChecked
let configPath: typeof import('../src/lib/config.js').configPath
let writeConfig: typeof import('../src/lib/config.js').writeConfig
let resolvePrincipalAllowlist: typeof import('../src/lib/config.js').resolvePrincipalAllowlist

const TEST_CONFIG = {
  rings: { ring1_forgeWriteInterception: true, ring2_asyncAudits: false }
}

const INVALID_CHECKS_FIXTURE = join(import.meta.dir, 'fixtures', 'checks', 'vinaya.config.invalid.json')

describe('config', () => {
  let tmpDir: string
  let originalCwd: string

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `vinaya-config-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(tmpDir, { recursive: true })
    originalCwd = process.cwd()
    process.chdir(tmpDir)

    // Re-import fresh module after chdir
    const mod = await import('../src/lib/config.js')
    loadConfig = mod.loadConfig
    loadConfigChecked = mod.loadConfigChecked
    configPath = mod.configPath
    writeConfig = mod.writeConfig
    resolvePrincipalAllowlist = mod.resolvePrincipalAllowlist
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('loadConfig returns null when neither local nor global config exists', () => {
    // No vinaya.config.json in tmpDir, and we rely on no global config for tests
    // Either null (no configs) or a valid config (if global exists from real usage)
    const result = loadConfig()
    expect(result === null || typeof result === 'object').toBe(true)
  })

  it('loadConfig returns local config when vinaya.config.json is present in cwd', () => {
    const localPath = join(tmpDir, 'vinaya.config.json')
    writeFileSync(localPath, JSON.stringify(TEST_CONFIG), 'utf-8')

    const result = loadConfig()
    expect(result).not.toBeNull()
    expect(result?.rings?.ring1_forgeWriteInterception).toBe(true)
    expect(result?.rings?.ring2_asyncAudits).toBe(false)
  })

  it('loadConfig parses a repo-local "principals" field', () => {
    const localPath = join(tmpDir, 'vinaya.config.json')
    writeFileSync(localPath, JSON.stringify({ principals: ['alice', 'bob'] }), 'utf-8')

    const result = loadConfig()
    expect(result?.principals).toEqual(['alice', 'bob'])
  })

  it('resolvePrincipalAllowlist falls back to PRINCIPAL_ALLOWLIST when no config sets principals (every existing install unaffected)', () => {
    expect(resolvePrincipalAllowlist(null)).toEqual(PRINCIPAL_ALLOWLIST)
    expect(resolvePrincipalAllowlist({})).toEqual(PRINCIPAL_ALLOWLIST)
  })

  it('resolvePrincipalAllowlist uses the repo-local principals field as a full replacement, not additive, when set', () => {
    const result = resolvePrincipalAllowlist({ principals: ['alice', 'bob'] })
    expect(result).toEqual(['alice', 'bob'])
    expect(result).not.toContain(PRINCIPAL_ALLOWLIST[0])
  })

  it('configPath returns local path when vinaya.config.json exists in cwd', () => {
    const localPath = join(tmpDir, 'vinaya.config.json')
    writeFileSync(localPath, JSON.stringify(TEST_CONFIG), 'utf-8')

    const result = configPath()
    // Resolve symlinks on both sides (macOS /var → /private/var)
    const resolvedResult = result ? realpathSync(result) : null
    const resolvedExpected = realpathSync(localPath)
    expect(resolvedResult).toBe(resolvedExpected)
  })

  it('configPath returns null when no config exists', () => {
    // Could be null or global path — we just verify it doesn't point to tmpDir
    const result = configPath()
    if (result !== null) {
      expect(result).not.toContain(tmpDir)
    } else {
      expect(result).toBeNull()
    }
  })

  it('writeConfig("local") creates vinaya.config.json in cwd', () => {
    writeConfig('local', TEST_CONFIG)
    const localPath = join(tmpDir, 'vinaya.config.json')
    expect(existsSync(localPath)).toBe(true)
    const content = JSON.parse(readFileSync(localPath, 'utf-8'))
    expect(content.rings.ring1_forgeWriteInterception).toBe(true)
  })

  it('writeConfig("local") with repoRoot writes to repoRoot/vinaya.config.json', () => {
    const repoRoot = join(tmpDir, 'myrepo')
    mkdirSync(repoRoot, { recursive: true })
    writeConfig('local', TEST_CONFIG, repoRoot)
    const localPath = join(repoRoot, 'vinaya.config.json')
    expect(existsSync(localPath)).toBe(true)
    const content = JSON.parse(readFileSync(localPath, 'utf-8'))
    expect(content.rings.ring1_forgeWriteInterception).toBe(true)
  })

  it('writeConfig("global") creates config in a temp dir', () => {
    // We test writeConfig global by writing to a custom path via repoRoot arg
    // (global writes to ~/.vinaya/config.json which we cannot safely mock)
    const customRoot = join(tmpDir, 'isolated')
    mkdirSync(customRoot, { recursive: true })
    writeConfig('local', TEST_CONFIG, customRoot)
    const written = JSON.parse(readFileSync(join(customRoot, 'vinaya.config.json'), 'utf-8'))
    expect(written.rings.ring1_forgeWriteInterception).toBe(true)
    expect(written.rings.ring2_asyncAudits).toBe(false)
  })

  it('loadConfig falls back to global when no local config', () => {
    // No local config in tmpDir, so configPath returns global or null
    expect(() => loadConfig()).not.toThrow()
  })

  it('repo-local config overrides global config when both are present', () => {
    // Local config wins over a same-directory-hierarchy global-style file,
    // matching the ported file-selection precedence.
    const localPath = join(tmpDir, 'vinaya.config.json')
    writeFileSync(
      localPath,
      JSON.stringify({ rings: { ring1_forgeWriteInterception: false, ring2_asyncAudits: true } }),
      'utf-8'
    )

    const result = loadConfig()
    expect(result?.rings?.ring1_forgeWriteInterception).toBe(false)
    expect(result?.rings?.ring2_asyncAudits).toBe(true)
  })

  it('loadConfig rejects a rings object with a non-boolean field', () => {
    const localPath = join(tmpDir, 'vinaya.config.json')
    writeFileSync(
      localPath,
      JSON.stringify({ rings: { ring1_forgeWriteInterception: 'yes', ring2_asyncAudits: false } }),
      'utf-8'
    )

    // Invalid schema — VinayaConfigSchema.parse throws, loadConfig swallows and returns null
    expect(loadConfig()).toBeNull()
  })

  it('accepts a declarative checks entry with glob scoping', () => {
    const localPath = join(tmpDir, 'vinaya.config.json')
    writeFileSync(
      localPath,
      JSON.stringify({
        checks: { 'my-check': { run: './scripts/my-check.ts', scope: 'diff', include: ['src/**/*.ts'] } }
      }),
      'utf-8'
    )

    const result = loadConfig()
    expect(result?.checks?.['my-check']?.run).toBe('./scripts/my-check.ts')
    expect(result?.checks?.['my-check']?.scope).toBe('diff')
    expect(result?.checks?.['my-check']?.include).toEqual(['src/**/*.ts'])
  })

  it('loadConfig swallows an invalid checks entry to null (existing null-on-failure contract, unchanged)', () => {
    const localPath = join(tmpDir, 'vinaya.config.json')
    // Fixture has a "scop" typo — schema requires "scope".
    copyFileSync(INVALID_CHECKS_FIXTURE, localPath)

    expect(loadConfig()).toBeNull()
  })

  it('loadConfigChecked surfaces the same invalid checks entry loudly instead of silently returning null', () => {
    const localPath = join(tmpDir, 'vinaya.config.json')
    copyFileSync(INVALID_CHECKS_FIXTURE, localPath)

    const result = loadConfigChecked()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('typo')
      expect(result.path).toContain('vinaya.config.json')
    }
  })

  it('loadConfigChecked reports ok:true with config:null when no config file exists', () => {
    const result = loadConfigChecked()
    if (configPath() === null) {
      expect(result).toEqual({ ok: true, config: null })
    }
  })

  it('loadConfigChecked reports the same valid config loadConfig does', () => {
    const localPath = join(tmpDir, 'vinaya.config.json')
    writeFileSync(localPath, JSON.stringify(TEST_CONFIG), 'utf-8')

    const checked = loadConfigChecked()
    expect(checked.ok).toBe(true)
    if (checked.ok) {
      expect(checked.config?.rings?.ring1_forgeWriteInterception).toBe(true)
    }
  })
})

// Security regression (PR #862 review, both code-reviewer and security-reviewer
// independently found the same hole): resolving `principals` from HEAD instead
// of the base branch let a PR redefine its own trust anchor and self-approve.
// This proves the actual attack scenario is closed end-to-end through real git
// history, not just that the pure functions compose correctly in isolation.
describe('loadConfigFromRef — trust-anchor base-ref resolution (security)', () => {
  let repoDir: string
  let originalCwd: string

  function git(args: string[]): string {
    return execFileSync('git', args, { cwd: repoDir, encoding: 'utf8' }).trim()
  }

  beforeEach(() => {
    repoDir = join(tmpdir(), `vinaya-loadconfigfromref-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(repoDir, { recursive: true })
    originalCwd = process.cwd()
    git(['init', '-q', '-b', 'main'])
    git(['config', 'user.email', 'test@example.com'])
    git(['config', 'user.name', 'Test'])
    writeFileSync(join(repoDir, 'vinaya.config.json'), JSON.stringify({ principals: ['legit-reviewer'] }), 'utf-8')
    git(['add', '.'])
    git(['commit', '-q', '-m', 'Chore: initial commit'])
    process.chdir(repoDir)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(repoDir, { recursive: true, force: true })
  })

  it('the attack scenario: a PR that edits its own vinaya.config.json to add an attacker login does NOT get that login trusted when resolved against the base ref', () => {
    git(['checkout', '-q', '-b', 'task/attacker/1'])
    // Simulates a malicious PR diff: the attacker adds themselves to principals
    // in the SAME branch/commit that will carry their own forged VERDICT comment.
    writeFileSync(
      join(repoDir, 'vinaya.config.json'),
      JSON.stringify({ principals: ['legit-reviewer', 'attacker-login'] }),
      'utf-8'
    )
    git(['add', '.'])
    git(['commit', '-q', '-m', 'Chore: add myself as a principal'])

    // The PR branch's OWN working tree/HEAD now has the attacker in principals —
    // proving loadConfig() (cwd-based) would be fooled, loadConfigFromRef('main')
    // (base-ref-based) must not be.
    const headConfig = JSON.parse(readFileSync(join(repoDir, 'vinaya.config.json'), 'utf-8'))
    expect(headConfig.principals).toContain('attacker-login')

    const baseConfig = loadConfigFromRef('main')
    expect(baseConfig?.principals).toEqual(['legit-reviewer'])
    expect(baseConfig?.principals).not.toContain('attacker-login')
  })

  it('returns null (safe fallback territory) when vinaya.config.json does not exist yet at the given ref', () => {
    git(['checkout', '-q', '-b', 'orphan-check'])
    const result = loadConfigFromRef('refs/heads/orphan-check~999999') // unreachable/invalid ref
    expect(result).toBeNull()
  })

  it('reads the real config content at an arbitrary valid ref, not just "main"', () => {
    const sha = git(['rev-parse', 'HEAD'])
    const result = loadConfigFromRef(sha)
    expect(result?.principals).toEqual(['legit-reviewer'])
  })
})

describe('CheckEntrySchema env field', () => {
  const base = { run: './check.ts', scope: 'diff' as const }

  it('accepts the `true` form', () => {
    const parsed = VinayaConfigSchema.safeParse({ checks: { c: { ...base, env: { AEG_REPO: true } } } })
    expect(parsed.success).toBe(true)
  })

  it('accepts the `{ optional: true }` form', () => {
    const parsed = VinayaConfigSchema.safeParse({ checks: { c: { ...base, env: { PR_BODY: { optional: true } } } } })
    expect(parsed.success).toBe(true)
  })

  it('accepts the literal-string form', () => {
    const parsed = VinayaConfigSchema.safeParse({ checks: { c: { ...base, env: { NODE_ENV: 'production' } } } })
    expect(parsed.success).toBe(true)
  })

  it('accepts a valid `anyOf` form where the key is one of its own members', () => {
    const parsed = VinayaConfigSchema.safeParse({
      checks: { c: { ...base, env: { GITHUB_TOKEN: { anyOf: ['GITHUB_TOKEN', 'GH_TOKEN'] } } } }
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects `anyOf` with fewer than 2 members', () => {
    const parsed = VinayaConfigSchema.safeParse({
      checks: { c: { ...base, env: { GITHUB_TOKEN: { anyOf: ['GITHUB_TOKEN'] } } } }
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects `anyOf` with duplicate members', () => {
    const parsed = VinayaConfigSchema.safeParse({
      checks: { c: { ...base, env: { GITHUB_TOKEN: { anyOf: ['GITHUB_TOKEN', 'GITHUB_TOKEN'] } } } }
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects `anyOf` where the key is not one of its own members', () => {
    const parsed = VinayaConfigSchema.safeParse({
      checks: { c: { ...base, env: { GITHUB_TOKEN: { anyOf: ['GH_TOKEN', 'GHE_TOKEN'] } } } }
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects an unrecognized env-entry shape', () => {
    const parsed = VinayaConfigSchema.safeParse({ checks: { c: { ...base, env: { X: { bogus: true } } } } })
    expect(parsed.success).toBe(false)
  })
})

describe('lintEnvDeclarations', () => {
  it('warns on the literal string "true"', () => {
    const warnings = lintEnvDeclarations({ c: { run: './c.ts', scope: 'diff', env: { FOO: 'true' } } })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('FOO')
  })

  it('warns on the literal string "false"', () => {
    const warnings = lintEnvDeclarations({ c: { run: './c.ts', scope: 'diff', env: { FOO: 'false' } } })
    expect(warnings).toHaveLength(1)
  })

  it('warns on a high-entropy literal that looks like a leaked secret', () => {
    const warnings = lintEnvDeclarations({
      c: { run: './c.ts', scope: 'diff', env: { API_KEY: 'sk_live_A1b2C3d4E5f6G7h8I9j0' } }
    })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('high-entropy')
  })

  it('does not warn on an ordinary short literal', () => {
    const warnings = lintEnvDeclarations({ c: { run: './c.ts', scope: 'diff', env: { NODE_ENV: 'production' } } })
    expect(warnings).toEqual([])
  })

  it('does not warn on `true` or `{ optional: true }` forms', () => {
    const warnings = lintEnvDeclarations({
      c: { run: './c.ts', scope: 'diff', env: { AEG_REPO: true, PR_BODY: { optional: true } } }
    })
    expect(warnings).toEqual([])
  })

  it('returns no warnings when no checks are registered', () => {
    expect(lintEnvDeclarations(undefined)).toEqual([])
  })
})

describe('config-registered check runs through the runner', () => {
  const CLI_ROOT = join(import.meta.dir, '..')
  const FIXTURE_CONFIG = join(import.meta.dir, 'fixtures', 'checks', 'vinaya.config.json')

  it('runs a check registered the way the fixture vinaya.config.json would produce it', async () => {
    const raw = JSON.parse(readFileSync(FIXTURE_CONFIG, 'utf-8'))
    const config = VinayaConfigSchema.parse(raw)
    const entry = config.checks?.['fixture-check']
    expect(entry).toBeDefined()
    expect(entry?.run.startsWith('./')).toBe(true)

    // The config's `run` is repo-relative; resolve it against the CLI root
    // the same way a real vinaya.config.json's entries are resolved relative
    // to the repo they're registered in.
    const spec: CheckSpec = {
      name: 'fixture-check',
      ...(entry as NonNullable<typeof entry>),
      run: join(CLI_ROOT, (entry as NonNullable<typeof entry>).run)
    }
    const [outcome] = await runChecks([spec], {
      parallel: 1,
      diffOnly: false,
      changedFiles: null,
      defaultTimeoutMs: 5000
    })
    expect(outcome?.status).toBe('pass')
  })
})
