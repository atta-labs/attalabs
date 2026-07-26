import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const CLI_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const INDEX = join(CLI_ROOT, 'src', 'index.ts')
const FORGE_FIXTURES = join(CLI_ROOT, 'tests', 'fixtures', 'forge')

const FULL_PR_CONFIG = {
  briefSchema: {
    pr: {
      sections: [
        { builtin: 'tier' },
        { builtin: 'testPlan' },
        { builtin: 'testPlanExclusivity' },
        { builtin: 'principalPlaceholder' },
        { builtin: 'surfaceMap' },
        { builtin: 'docUpdateList' },
        { builtin: 'worktreeStep0' },
        { builtin: 'stopConditions' },
        { builtin: 'autonomyClause' },
        { builtin: 'project' },
        { builtin: 'for' },
        { builtin: 'closesN' },
        { builtin: 'premiseCoverage' }
      ]
    }
  }
}

type CliResult = { status: number; stdout: string; stderr: string }

function runCli(args: string[], opts: { cwd: string; input?: string }): CliResult {
  try {
    const stdout = execFileSync('bun', [INDEX, ...args], {
      cwd: opts.cwd,
      encoding: 'utf8',
      input: opts.input,
      stdio: ['pipe', 'pipe', 'pipe']
    })
    return { status: 0, stdout, stderr: '' }
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string }
    return { status: err.status ?? 1, stdout: String(err.stdout ?? ''), stderr: String(err.stderr ?? '') }
  }
}

describe('vinaya pr create --validate-only', () => {
  let cwd: string

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), 'vinaya-pr-test-'))
  })
  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true })
  })

  function writeConfig(config: unknown): void {
    writeFileSync(join(cwd, 'vinaya.config.json'), JSON.stringify(config), 'utf8')
  }

  it('refuses a malformed body (missing Tier) with a CheckError naming the corrective command', () => {
    writeConfig(FULL_PR_CONFIG)
    const r = runCli(
      [
        'pr',
        'create',
        '--validate-only',
        '--body-file',
        join(FORGE_FIXTURES, 'pr-no-tier.md'),
        '--title',
        '[vinaya-cli-v1] 5 — x'
      ],
      { cwd }
    )
    expect(r.status).toBe(1)
    const lines = r.stderr.trim().split('\n').filter(Boolean)
    expect(lines.length).toBe(1)
    const finding = JSON.parse(lines[0] as string)
    expect(finding.schema).toBe(1)
    expect(finding.check).toBe('brief-schema')
    expect(finding.agent_recovery_prompt).toContain('vinaya pr create')
    expect(finding.agent_recovery_prompt).not.toBe(finding.message)
  })

  it('passes a valid body and writes nothing', () => {
    writeConfig(FULL_PR_CONFIG)
    const r = runCli(
      [
        'pr',
        'create',
        '--validate-only',
        '--body-file',
        join(FORGE_FIXTURES, 'pr-valid.md'),
        '--title',
        '[vinaya-cli-v1] 5 — x'
      ],
      { cwd }
    )
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('PASS')
  })

  it('is config-driven: a custom-section schema refuses a body lacking that section', () => {
    // Fixture config requires a "Rollback Plan" heading; pr-valid.md has none.
    const raw = execFileSync('cat', [join(FORGE_FIXTURES, 'vinaya.config.custom.json')], { encoding: 'utf8' })
    writeFileSync(join(cwd, 'vinaya.config.json'), raw, 'utf8')
    const r = runCli(
      ['pr', 'create', '--validate-only', '--body-file', join(FORGE_FIXTURES, 'pr-valid.md'), '--title', 'Feat: x'],
      { cwd }
    )
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('Rollback Plan')
  })

  it('validates the same streamed bytes (#333) via --body-file /dev/stdin', () => {
    writeConfig(FULL_PR_CONFIG)
    const body = execFileSync('cat', [join(FORGE_FIXTURES, 'pr-valid.md')], { encoding: 'utf8' })
    const r = runCli(['pr', 'create', '--validate-only', '--body-file', '/dev/stdin', '--title', 'Feat: x'], {
      cwd,
      input: body
    })
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('PASS')
  })

  it('--json emits an enveloped outcome', () => {
    writeConfig(FULL_PR_CONFIG)
    const r = runCli(
      [
        'pr',
        'create',
        '--validate-only',
        '--json',
        '--body-file',
        join(FORGE_FIXTURES, 'pr-valid.md'),
        '--title',
        'Feat: x'
      ],
      { cwd }
    )
    expect(r.status).toBe(0)
    const parsed = JSON.parse(r.stdout)
    expect(parsed.schema).toBe(1)
    expect(parsed.data.validated).toBe(true)
    expect(parsed.data.written).toBe(false)
  })

  it('refuses when no body argument is given', () => {
    writeConfig(FULL_PR_CONFIG)
    const r = runCli(['pr', 'create', '--validate-only', '--title', 'Feat: x'], { cwd })
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('body')
  })
})
