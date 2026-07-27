import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const CLI_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const INDEX = join(CLI_ROOT, 'src', 'index.ts')
const FORGE_FIXTURES = join(CLI_ROOT, 'tests', 'fixtures', 'forge')

const ISSUE_CONFIG = {
  briefSchema: { issue: { sections: [{ builtin: 'issueRationale' }] } }
}

type CliResult = { status: number; stdout: string; stderr: string }

function runCli(args: string[], cwd: string): CliResult {
  try {
    const stdout = execFileSync('bun', [INDEX, ...args], {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    })
    return { status: 0, stdout, stderr: '' }
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string }
    return { status: err.status ?? 1, stdout: String(err.stdout ?? ''), stderr: String(err.stderr ?? '') }
  }
}

describe('vinaya issue create --validate-only', () => {
  let cwd: string

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), 'vinaya-issue-test-'))
    writeFileSync(join(cwd, 'vinaya.config.json'), JSON.stringify(ISSUE_CONFIG), 'utf8')
  })
  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true })
  })

  it('refuses a task Issue (tranche:* label) lacking the rationale', () => {
    const r = runCli(
      [
        'issue',
        'create',
        '--validate-only',
        '--body-file',
        join(FORGE_FIXTURES, 'issue-no-rationale.md'),
        '--label',
        'vinaya/tranche:demo'
      ],
      cwd
    )
    expect(r.status).toBe(1)
    const lines = r.stderr.trim().split('\n').filter(Boolean)
    expect(lines.length).toBe(8)
    for (const line of lines) {
      const finding = JSON.parse(line)
      expect(finding.check).toBe('brief-schema')
      expect(finding.agent_recovery_prompt).toContain('vinaya issue create')
    }
  })

  it('passes a task Issue carrying the full rationale', () => {
    const r = runCli(
      [
        'issue',
        'create',
        '--validate-only',
        '--body-file',
        join(FORGE_FIXTURES, 'issue-valid.md'),
        '--label',
        'vinaya/tranche:demo'
      ],
      cwd
    )
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('PASS')
  })

  it('passes a non-task Issue through unvalidated (no tranche label)', () => {
    const r = runCli(
      ['issue', 'create', '--validate-only', '--body-file', join(FORGE_FIXTURES, 'issue-no-rationale.md')],
      cwd
    )
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('PASS')
  })

  it('--json emits an enveloped outcome for a validated task Issue', () => {
    const r = runCli(
      [
        'issue',
        'create',
        '--validate-only',
        '--json',
        '--body-file',
        join(FORGE_FIXTURES, 'issue-valid.md'),
        '--label',
        'vinaya/tranche:demo'
      ],
      cwd
    )
    expect(r.status).toBe(0)
    const parsed = JSON.parse(r.stdout)
    expect(parsed.schema).toBe(1)
    expect(parsed.data.validated).toBe(true)
    expect(parsed.data.written).toBe(false)
  })
})
